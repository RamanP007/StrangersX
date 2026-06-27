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
// browser tab) and broadcasts the live count. The authoritative count lives in
// Redis (online:count) so it survives across the app and can be read via API.
type PresenceHub struct {
	mu    sync.Mutex
	conns map[*websocket.Conn]bool
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

func (h *PresenceHub) add(conn *websocket.Conn) {
	h.mu.Lock()
	h.conns[conn] = true
	h.mu.Unlock()
}

// remove returns true if the connection was present (so we only decrement once).
func (h *PresenceHub) remove(conn *websocket.Conn) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.conns[conn]; ok {
		delete(h.conns, conn)
		return true
	}
	return false
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

// ServePresence upgrades a connection, counts it, and streams the live total.
func ServePresence(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	Presence.add(conn)
	n, _ := RDB.Incr(context.Background(), onlineKey).Result()
	Presence.broadcast(n)

	go func() {
		defer func() {
			if Presence.remove(conn) {
				m, _ := RDB.Decr(context.Background(), onlineKey).Result()
				if m < 0 {
					RDB.Set(context.Background(), onlineKey, 0, 0)
					m = 0
				}
				Presence.broadcast(m)
			}
			conn.Close()
		}()
		// Read loop: we don't expect messages — it just detects disconnect.
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()
}
