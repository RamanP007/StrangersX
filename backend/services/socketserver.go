package services

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"omegle-backend/config"
)

// ─── Message protocol ────────────────────────────────────────────────────────

type InMsg struct {
	Type      string          `json:"type"` // join_queue | message | skip | typing | stop_typing | ping | webrtc_*
	Text      string          `json:"text"`
	Interests []string        `json:"interests"`
	Mode      string          `json:"mode"`      // random | interests
	ChatType  string          `json:"chatType"`  // text | video
	ReplyText string          `json:"replyText"` // quoted message (reply)
	ReplyMine bool            `json:"replyMine"` // was the quoted message sent by the sender?
	Data      json.RawMessage `json:"data"`      // opaque WebRTC payload (SDP / ICE)
}

type OutMsg struct {
	Type      string          `json:"type"`
	Text      string          `json:"text,omitempty"`
	From      string          `json:"from,omitempty"`
	RoomID    string          `json:"roomId,omitempty"`
	Status    string          `json:"status,omitempty"`
	ChatType  string          `json:"chatType,omitempty"`
	Initiator bool            `json:"initiator,omitempty"`
	ReplyText string          `json:"replyText,omitempty"`
	ReplyMine bool            `json:"replyMine,omitempty"`
	Data      json.RawMessage `json:"data,omitempty"`
}

// ─── Hub ─────────────────────────────────────────────────────────────────────

type Client struct {
	id   string
	hub  *Hub
	conn *websocket.Conn
	send chan OutMsg
}

type Hub struct {
	mu      sync.RWMutex
	clients map[string]*Client
}

var GlobalHub = &Hub{clients: make(map[string]*Client)}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	h.clients[c.id] = c
	h.mu.Unlock()
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	delete(h.clients, c.id)
	h.mu.Unlock()
	close(c.send)
}

func (h *Hub) Send(clientID string, msg OutMsg) {
	h.mu.RLock()
	c, ok := h.clients[clientID]
	h.mu.RUnlock()
	if ok {
		select {
		case c.send <- msg:
		default:
			log.Printf("send buffer full for client %s", clientID)
		}
	}
}

// ─── Upgrader ────────────────────────────────────────────────────────────────

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     originAllowed,
}

// originAllowed permits non-browser clients (empty Origin) and any origin in the
// configured allow-list (CORS_ORIGINS / FRONTEND_URL). "*" allows everything.
func originAllowed(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	for _, o := range config.App.AllowedOrigins {
		if o == "*" || o == origin {
			return true
		}
	}
	return false
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

func ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade: %v", err)
		return
	}

	client := &Client{
		id:   uuid.New().String(),
		hub:  GlobalHub,
		conn: conn,
		send: make(chan OutMsg, 64),
	}
	GlobalHub.register(client)

	go client.writePump()
	go client.readPump()
}

// ─── Read / Write pumps ───────────────────────────────────────────────────────

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, nil)
				return
			}
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteJSON(msg); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) readPump() {
	ctx := context.Background()
	defer func() {
		c.handleDisconnect(ctx)
		c.hub.unregister(c)
		c.conn.Close()
	}()

	// WebRTC SDP offers/answers (audio+video) routinely exceed a few KB, so the
	// limit must be well above the small text-message size or those messages get
	// dropped and the connection is torn down.
	c.conn.SetReadLimit(1 << 18) // 256 KB
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		var msg InMsg
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}
		c.handle(ctx, msg)
	}
}

// ─── Event handlers ───────────────────────────────────────────────────────────

func (c *Client) handle(ctx context.Context, msg InMsg) {
	switch msg.Type {
	case "join_queue":
		c.leaveCurrentRoom(ctx)
		LeaveQueue(ctx, c.id)

		mode := msg.Mode
		if mode == "" {
			mode = "random"
		}
		chatType := msg.ChatType
		if chatType != "video" {
			chatType = "text"
		}

		partnerID, matched := TryMatch(ctx, c.id, msg.Interests, mode, chatType)
		if matched {
			LeaveQueue(ctx, partnerID)
			roomID := uuid.New().String()
			CreateRoom(ctx, roomID, c.id, partnerID)
			SetSocketRoom(ctx, c.id, roomID)
			SetSocketRoom(ctx, partnerID, roomID)
			// The matcher (c) becomes the WebRTC initiator; the partner answers.
			c.hub.Send(c.id, OutMsg{Type: "matched", RoomID: roomID, ChatType: chatType, Initiator: true})
			c.hub.Send(partnerID, OutMsg{Type: "matched", RoomID: roomID, ChatType: chatType, Initiator: false})
		} else {
			JoinQueue(ctx, c.id, msg.Interests, mode, chatType)
			c.hub.Send(c.id, OutMsg{Type: "queued", Status: "searching"})
		}

	case "message":
		c.relayToPartner(ctx, OutMsg{
			Type:      "message",
			Text:      msg.Text,
			From:      "stranger",
			ReplyText: msg.ReplyText,
			ReplyMine: msg.ReplyMine,
		})

	case "typing":
		c.relayToPartner(ctx, OutMsg{Type: "typing"})

	case "stop_typing":
		c.relayToPartner(ctx, OutMsg{Type: "stop_typing"})

	case "webrtc_offer", "webrtc_answer", "webrtc_ice":
		// Forward the opaque SDP/ICE payload to the room partner.
		c.relayToPartner(ctx, OutMsg{Type: msg.Type, Data: msg.Data})

	case "skip":
		c.leaveCurrentRoom(ctx)
		LeaveQueue(ctx, c.id)
		c.hub.Send(c.id, OutMsg{Type: "skipped"})

	case "ping":
		c.hub.Send(c.id, OutMsg{Type: "pong"})
	}
}

// relayToPartner sends a message to the other socket in the current room.
func (c *Client) relayToPartner(ctx context.Context, out OutMsg) {
	roomID, ok := GetSocketRoom(ctx, c.id)
	if !ok {
		return
	}
	partnerID, found := GetRoomPartner(ctx, roomID, c.id)
	if !found {
		return
	}
	c.hub.Send(partnerID, out)
}

func (c *Client) leaveCurrentRoom(ctx context.Context) {
	roomID, ok := GetSocketRoom(ctx, c.id)
	if !ok {
		return
	}
	partnerID, found := GetRoomPartner(ctx, roomID, c.id)
	if found {
		c.hub.Send(partnerID, OutMsg{Type: "partner_left"})
		ClearSocketRoom(ctx, partnerID)
	}
	DeleteRoom(ctx, roomID)
	ClearSocketRoom(ctx, c.id)
}

func (c *Client) handleDisconnect(ctx context.Context) {
	c.leaveCurrentRoom(ctx)
	LeaveQueue(ctx, c.id)
	log.Printf("ws disconnected: %s", c.id)
}
