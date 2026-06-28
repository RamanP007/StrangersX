package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"sync"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"omegle-backend/config"
)

// AccountHub tracks the per-user "account" websocket connections used to enforce
// a single active session and to push a real-time force-logout when the account
// signs in elsewhere.
type AccountHub struct {
	mu    sync.Mutex
	conns map[string]map[*accountConn]bool // userId -> set
}

type accountConn struct {
	userID string
	sid    string
	conn   *websocket.Conn
}

var AccountRegistry = &AccountHub{conns: make(map[string]map[*accountConn]bool)}

// SessionID returns a stable session id for a Google ID token. The same browser
// (same Google login) yields the same id across tabs, so multiple tabs share one
// session; a different device/login yields a different id.
func SessionID(idToken string) string {
	sum := sha256.Sum256([]byte(idToken))
	return hex.EncodeToString(sum[:16])
}

func sessionKey(userID string) string { return "session:" + userID }

// SetActiveSession stores the active session id for a user (24h TTL).
func SetActiveSession(userID, sid string) {
	RDB.Set(context.Background(), sessionKey(userID), sid, 0)
}

func getActiveSession(userID string) string {
	v, err := RDB.Get(context.Background(), sessionKey(userID)).Result()
	if err != nil {
		return ""
	}
	return v
}

func (h *AccountHub) add(c *accountConn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.conns[c.userID] == nil {
		h.conns[c.userID] = make(map[*accountConn]bool)
	}
	h.conns[c.userID][c] = true
}

func (h *AccountHub) remove(c *accountConn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set, ok := h.conns[c.userID]; ok {
		delete(set, c)
		if len(set) == 0 {
			delete(h.conns, c.userID)
		}
	}
}

func forceLogout(conn *websocket.Conn) {
	_ = conn.WriteJSON(map[string]string{"type": "force_logout"})
	conn.Close()
}

// ForceLogoutOthers logs out every connected session of userID whose sid differs
// from keepSid (the session that just logged in).
func (h *AccountHub) ForceLogoutOthers(userID, keepSid string) {
	h.mu.Lock()
	var victims []*accountConn
	for c := range h.conns[userID] {
		if c.sid != keepSid {
			victims = append(victims, c)
		}
	}
	for _, c := range victims {
		delete(h.conns[userID], c)
	}
	if set, ok := h.conns[userID]; ok && len(set) == 0 {
		delete(h.conns, userID)
	}
	h.mu.Unlock()

	for _, c := range victims {
		forceLogout(c.conn)
	}
}

func parseAccountToken(tokenStr string) (userID, sid string, ok bool) {
	type claims struct {
		UserID string `json:"userId"`
		SID    string `json:"sid"`
		jwt.RegisteredClaims
	}
	c := &claims{}
	token, err := jwt.ParseWithClaims(tokenStr, c, func(t *jwt.Token) (interface{}, error) {
		return []byte(config.App.JWTSecret), nil
	})
	if err != nil || !token.Valid || c.UserID == "" {
		return "", "", false
	}
	return c.UserID, c.SID, true
}

// ServeAccount upgrades the account websocket. If the token's session id is no
// longer the active one, it immediately force-logs-out (stale session). Otherwise
// it registers the connection to receive future force-logout pushes.
func ServeAccount(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	userID, sid, ok := parseAccountToken(r.URL.Query().Get("token"))
	if !ok {
		conn.Close()
		return
	}

	active := getActiveSession(userID)
	if active == "" {
		// No active session recorded — claim it.
		SetActiveSession(userID, sid)
	} else if active != sid {
		forceLogout(conn)
		return
	}

	c := &accountConn{userID: userID, sid: sid, conn: conn}
	AccountRegistry.add(c)

	go func() {
		defer func() {
			AccountRegistry.remove(c)
			conn.Close()
		}()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()
}
