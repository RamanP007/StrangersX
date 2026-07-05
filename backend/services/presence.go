package services

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

const onlineKey = "online:count"

// PresenceHub tracks lightweight "online" websocket connections (one per open
// browser tab) and broadcasts the live count. Only *active* tabs are counted:
// a tab idle past the client-side inactivity threshold sends {"type":"idle"}
// and stops counting until it sends {"type":"active"} again. The authoritative
// count lives in Redis (online:count).
type PresenceHub struct {
	mu    sync.Mutex
	conns map[*websocket.Conn]bool // value = currently active (counted)
}

var Presence = &PresenceHub{conns: make(map[*websocket.Conn]bool)}

type onlineMsg struct {
	Type  string `json:"type"`
	Count int64  `json:"count"`
}

// ResetOnlineCount zeroes the counter on server startup (no tabs connected yet).
func ResetOnlineCount() {
	RDB.Set(context.Background(), onlineKey, 0, 0)
}

// GetOnlineCount returns the current live count from Redis.
func GetOnlineCount() int64 {
	n, err := RDB.Get(context.Background(), onlineKey).Int64()
	if err != nil {
		return 0
	}
	return n
}

func incrOnline() int64 {
	n, _ := RDB.Incr(context.Background(), onlineKey).Result()
	return n
}

func decrOnline() int64 {
	m, _ := RDB.Decr(context.Background(), onlineKey).Result()
	if m < 0 {
		RDB.Set(context.Background(), onlineKey, 0, 0)
		m = 0
	}
	return m
}

// add registers a new connection as active.
func (h *PresenceHub) add(conn *websocket.Conn) {
	h.mu.Lock()
	h.conns[conn] = true
	h.mu.Unlock()
}

// setActive flips a connection's active state, returning true only when the
// state actually changed so the caller adjusts the count exactly once.
func (h *PresenceHub) setActive(conn *websocket.Conn, active bool) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	cur, ok := h.conns[conn]
	if !ok || cur == active {
		return false
	}
	h.conns[conn] = active
	return true
}

// remove drops a connection. Returns true if it was still counted as active, so
// the caller decrements exactly once.
func (h *PresenceHub) remove(conn *websocket.Conn) (present, wasActive bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	active, ok := h.conns[conn]
	if !ok {
		return false, false
	}
	delete(h.conns, conn)
	return true, active
}

func (h *PresenceHub) broadcast(count int64) {
	data, _ := json.Marshal(onlineMsg{Type: "online_count", Count: count})
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.conns {
		if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
			c.Close()
			delete(h.conns, c)
		}
	}
}

type presenceInMsg struct {
	Type string `json:"type"` // idle | active
}

// ServePresence upgrades a connection, counts it, and streams the live total.
// The client sends {"type":"idle"} / {"type":"active"} as the tab's activity
// changes so idle tabs don't inflate the count.
func ServePresence(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	Presence.add(conn)
	Presence.broadcast(incrOnline())

	go func() {
		defer func() {
			if present, wasActive := Presence.remove(conn); present && wasActive {
				Presence.broadcast(decrOnline())
			}
			conn.Close()
		}()
		for {
			_, raw, err := conn.ReadMessage()
			if err != nil {
				return
			}
			var m presenceInMsg
			if json.Unmarshal(raw, &m) != nil {
				continue
			}
			switch m.Type {
			case "idle":
				if Presence.setActive(conn, false) {
					Presence.broadcast(decrOnline())
				}
			case "active":
				if Presence.setActive(conn, true) {
					Presence.broadcast(incrOnline())
				}
			}
		}
	}()
}
