package services

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// matchConfirmTimeout is how long a proposed match waits for both sockets to
// pong before it is abandoned.
const matchConfirmTimeout = 5 * time.Second

type pendingMatch struct {
	id       string
	s1, s2   string
	chatType string
	ponged   map[string]bool
	done     bool
	timer    *time.Timer
}

type matchRegistry struct {
	mu      sync.Mutex
	byID    map[string]*pendingMatch
	pending map[string]string // socketID -> matchID (guard against double-matching)
}

var matchReg = &matchRegistry{
	byID:    make(map[string]*pendingMatch),
	pending: make(map[string]string),
}

// isPending reports whether a socket is currently mid match-confirmation, so the
// matchmaker won't hand it out as a candidate to someone else.
func isPending(socketID string) bool {
	matchReg.mu.Lock()
	defer matchReg.mu.Unlock()
	_, ok := matchReg.pending[socketID]
	return ok
}

// beginPendingMatch starts the confirmation handshake: it pings both sockets and
// waits for both to pong (handleMatchPong → finalizeMatch) before any room is
// created. If either side fails to pong within the timeout the match is
// cancelled and both clients recover via their normal search-retry loop.
func beginPendingMatch(s1, s2, chatType string) {
	id := uuid.New().String()
	pm := &pendingMatch{
		id:       id,
		s1:       s1,
		s2:       s2,
		chatType: chatType,
		ponged:   make(map[string]bool),
	}
	matchReg.mu.Lock()
	matchReg.byID[id] = pm
	matchReg.pending[s1] = id
	matchReg.pending[s2] = id
	matchReg.mu.Unlock()

	pm.timer = time.AfterFunc(matchConfirmTimeout, func() { cancelPendingMatch(id, "timeout") })

	log.Printf("[matchconfirm] ping match=%s s1=%s s2=%s chatType=%s", id, s1, s2, chatType)
	GlobalHub.Send(s1, OutMsg{Type: "match_ping", MatchID: id})
	GlobalHub.Send(s2, OutMsg{Type: "match_ping", MatchID: id})
}

// handleMatchPong records a pong; once both sides have ponged, the room is
// created and both are notified.
func handleMatchPong(socketID, matchID string) {
	matchReg.mu.Lock()
	pm, ok := matchReg.byID[matchID]
	if !ok || pm.done || (socketID != pm.s1 && socketID != pm.s2) {
		matchReg.mu.Unlock()
		return
	}
	pm.ponged[socketID] = true
	both := pm.ponged[pm.s1] && pm.ponged[pm.s2]
	if both {
		pm.done = true
		if pm.timer != nil {
			pm.timer.Stop()
		}
		delete(matchReg.byID, matchID)
		delete(matchReg.pending, pm.s1)
		delete(matchReg.pending, pm.s2)
	}
	matchReg.mu.Unlock()

	if both {
		log.Printf("[matchconfirm] confirmed match=%s s1=%s s2=%s", matchID, pm.s1, pm.s2)
		finalizeMatch(context.Background(), pm.s1, pm.s2, pm.chatType)
	}
}

// cancelPendingMatch aborts a handshake that didn't complete. Both sockets are
// nudged to re-queue; they also self-heal via their periodic search retry.
func cancelPendingMatch(matchID, reason string) {
	matchReg.mu.Lock()
	pm, ok := matchReg.byID[matchID]
	if !ok || pm.done {
		matchReg.mu.Unlock()
		return
	}
	pm.done = true
	if pm.timer != nil {
		pm.timer.Stop()
	}
	delete(matchReg.byID, matchID)
	delete(matchReg.pending, pm.s1)
	delete(matchReg.pending, pm.s2)
	matchReg.mu.Unlock()

	log.Printf("[matchconfirm] cancelled match=%s reason=%s", matchID, reason)
	GlobalHub.Send(pm.s1, OutMsg{Type: "match_cancelled"})
	GlobalHub.Send(pm.s2, OutMsg{Type: "match_cancelled"})
}

// clearPendingForSocket cancels any in-flight handshake a socket is part of
// (called when it disconnects, skips, leaves, or re-joins the queue).
func clearPendingForSocket(socketID string) {
	matchReg.mu.Lock()
	id, ok := matchReg.pending[socketID]
	matchReg.mu.Unlock()
	if ok {
		cancelPendingMatch(id, "socket-left")
	}
}
