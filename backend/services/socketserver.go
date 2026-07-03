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

// register stores c as the live connection for its id and returns the previous
// connection (if any) so the caller can close it — a reconnecting client reuses
// its connection id, superseding the zombie socket left over from the blip.
func (h *Hub) register(c *Client) *Client {
	h.mu.Lock()
	old := h.clients[c.id]
	h.clients[c.id] = c
	h.mu.Unlock()
	return old
}

// unregisterIfCurrent removes c only if it is still the registered connection
// for its id. Returns false when c was superseded by a reconnect, in which case
// the caller must NOT tear down rooms/queues — the new connection owns them.
func (h *Hub) unregisterIfCurrent(c *Client) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	if cur, ok := h.clients[c.id]; ok && cur == c {
		delete(h.clients, c.id)
		return true
	}
	return false
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

	// Stable client-supplied connection id: survives reconnects so an
	// in-progress chat can be resumed after a network blip.
	cid := r.URL.Query().Get("cid")
	if cid == "" || len(cid) > 64 {
		cid = uuid.New().String()
	} else {
		// Bind the id to the presenting token so another client can't hijack
		// an in-progress chat by guessing the id. On a mismatch (different
		// token reusing an id, e.g. after a guest→signed-in switch) don't kill
		// the connection — just assign a fresh identity.
		ownerKey := "conn:owner:" + cid
		owner := SessionID(r.URL.Query().Get("token"))
		if existing, err := RDB.Get(context.Background(), ownerKey).Result(); err == nil && existing != owner {
			log.Printf("cid %s presented with a different token — assigning fresh id", cid)
			cid = uuid.New().String()
		} else {
			RDB.Set(context.Background(), ownerKey, owner, 24*time.Hour)
		}
	}

	client := &Client{
		id:   cid,
		hub:  GlobalHub,
		conn: conn,
		send: make(chan OutMsg, 64),
	}
	if old := GlobalHub.register(client); old != nil {
		old.conn.Close() // supersede the zombie connection from before the blip
	}

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
		// Only a genuine disconnect (not a superseded pre-reconnect zombie)
		// may start room-teardown; the reconnecting client keeps its state.
		if c.hub.unregisterIfCurrent(c) {
			c.handleDisconnect(ctx)
		}
		close(c.send)
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

	case "resume":
		// Client reconnected mid-chat: if its room survived the grace window,
		// pick the conversation back up; otherwise tell it to move on.
		if roomID, ok := GetSocketRoom(ctx, c.id); ok {
			c.hub.Send(c.id, OutMsg{Type: "resumed", RoomID: roomID})
			if partnerID, found := GetRoomPartner(ctx, roomID, c.id); found {
				c.hub.Send(partnerID, OutMsg{Type: "partner_back"})
			}
		} else {
			c.hub.Send(c.id, OutMsg{Type: "resume_failed"})
		}

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

// resumeGrace is how long a mid-chat room survives a dropped connection before
// being torn down — a reconnecting client resumes seamlessly within this window.
const resumeGrace = 10 * time.Second

func (c *Client) handleDisconnect(ctx context.Context) {
	LeaveQueue(ctx, c.id)

	roomID, ok := GetSocketRoom(ctx, c.id)
	if !ok {
		log.Printf("ws disconnected: %s", c.id)
		return
	}

	// Mid-chat: give the client a grace window to reconnect (network blip)
	// instead of ending the conversation immediately.
	if partnerID, found := GetRoomPartner(ctx, roomID, c.id); found {
		c.hub.Send(partnerID, OutMsg{Type: "partner_reconnecting"})
	}
	log.Printf("ws dropped mid-chat: %s (grace %s)", c.id, resumeGrace)

	id, hub := c.id, c.hub
	time.AfterFunc(resumeGrace, func() {
		bg := context.Background()
		if isLive(id) {
			return // they came back — room resumes
		}
		rid, ok := GetSocketRoom(bg, id)
		if !ok || rid != roomID {
			return // room already gone (partner skipped) or re-matched
		}
		if partnerID, found := GetRoomPartner(bg, rid, id); found {
			hub.Send(partnerID, OutMsg{Type: "partner_left"})
			ClearSocketRoom(bg, partnerID)
		}
		DeleteRoom(bg, rid)
		ClearSocketRoom(bg, id)
	})
}
