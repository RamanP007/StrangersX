package services

import (
	"context"
	"fmt"
	"log"
	"time"
)

const (
	roomTTL = time.Hour
)

// ResetMatchmaking clears stale queue and room state left in Redis from a
// previous run (those sockets are gone after a restart), so new users aren't
// blocked by dead entries.
func ResetMatchmaking() {
	ctx := context.Background()
	patterns := []string{"queue:random:*", "queue:interests:*", "room:*", "socket:room:*"}
	for _, p := range patterns {
		var cursor uint64
		for {
			keys, cur, err := RDB.Scan(ctx, cursor, p, 200).Result()
			if err != nil {
				break
			}
			if len(keys) > 0 {
				RDB.Del(ctx, keys...)
			}
			cursor = cur
			if cursor == 0 {
				break
			}
		}
	}
}

func randomQueueKey(chatType string) string {
	return "queue:random:" + chatType
}

func interestQueueKey(chatType, tag string) string {
	return "queue:interests:" + chatType + ":" + tag
}

// isLive reports whether a socket is still connected to this node.
func isLive(socketID string) bool {
	GlobalHub.mu.RLock()
	_, ok := GlobalHub.clients[socketID]
	liveCount := len(GlobalHub.clients)
	GlobalHub.mu.RUnlock()
	log.Printf("[matchmaking] isLive check socket=%s live=%t totalLiveUsers=%d", socketID, ok, liveCount)
	return ok
}

// TryMatch attempts to match a socket with a waiting, still-connected user of
// the same chatType. Stale (disconnected) queue entries are discarded.
func TryMatch(ctx context.Context, socketID string, interests []string, mode, chatType string) (string, bool) {
	log.Printf("[matchmaking] TryMatch start socket=%s mode=%s chatType=%s interests=%v", socketID, mode, chatType, interests)
	if mode == "interests" && len(interests) > 0 {
		for _, tag := range interests {
			key := interestQueueKey(chatType, tag)
			log.Printf("[matchmaking] scanning interest queue key=%s for socket=%s", key, socketID)
			if id, ok := popLiveCandidate(ctx, key, socketID); ok {
				log.Printf("[matchmaking] MATCH FOUND (interests) socket=%s <-> partner=%s tag=%s chatType=%s", socketID, id, tag, chatType)
				return id, true
			}
		}
	}

	randKey := randomQueueKey(chatType)
	log.Printf("[matchmaking] scanning random queue key=%s for socket=%s", randKey, socketID)
	if id, ok := popLiveCandidate(ctx, randKey, socketID); ok {
		log.Printf("[matchmaking] MATCH FOUND (random) socket=%s <-> partner=%s chatType=%s", socketID, id, chatType)
		return id, true
	}
	log.Printf("[matchmaking] NO MATCH for socket=%s chatType=%s (queued to wait)", socketID, chatType)
	return "", false
}

// popLiveCandidate pops entries until it finds a live one that isn't self and
// isn't already matched into a room (interest-mode users sit in several queues
// at once; entries left in other queues after a match must be discarded).
func popLiveCandidate(ctx context.Context, key, socketID string) (string, bool) {
	for i := 0; i < 50; i++ {
		val, err := RDB.LPop(ctx, key).Result()
		if err != nil {
			log.Printf("[matchmaking] queue key=%s empty (no more candidates) for socket=%s", key, socketID)
			return "", false // queue empty
		}
		log.Printf("[matchmaking] popped candidate=%s from key=%s (for socket=%s)", val, key, socketID)
		if val == socketID || !isLive(val) {
			log.Printf("[matchmaking] discarding candidate=%s (self or stale) key=%s", val, key)
			continue // skip self / stale entries
		}
		if _, inRoom := GetSocketRoom(ctx, val); inRoom {
			log.Printf("[matchmaking] discarding candidate=%s (already in a room) key=%s", val, key)
			continue // already matched via another queue entry
		}
		log.Printf("[matchmaking] accepted candidate=%s for socket=%s key=%s", val, socketID, key)
		return val, true
	}
	return "", false
}

// JoinQueue adds a socket to the waiting queue(s) for its chatType.
func JoinQueue(ctx context.Context, socketID string, interests []string, mode, chatType string) {
	log.Printf("[matchmaking] JoinQueue socket=%s mode=%s chatType=%s interests=%v", socketID, mode, chatType, interests)
	if err := RDB.RPush(ctx, randomQueueKey(chatType), socketID).Err(); err != nil {
		log.Printf("queue push error: %v", err)
	}
	if mode == "interests" {
		for _, tag := range interests {
			log.Printf("[matchmaking] enqueue socket=%s into interest queue tag=%s chatType=%s", socketID, tag, chatType)
			RDB.RPush(ctx, interestQueueKey(chatType, tag), socketID)
		}
	}
	if n, err := RDB.LLen(ctx, randomQueueKey(chatType)).Result(); err == nil {
		log.Printf("[matchmaking] random queue chatType=%s now has %d waiting users", chatType, n)
	}
}

// LeaveQueue removes a socket from the random queues (both chat types).
// Interest queues self-clean via the liveness check in popLiveCandidate.
func LeaveQueue(ctx context.Context, socketID string) {
	RDB.LRem(ctx, randomQueueKey("text"), 0, socketID)
	RDB.LRem(ctx, randomQueueKey("video"), 0, socketID)
}

// CreateRoom stores a room mapping in Redis.
func CreateRoom(ctx context.Context, roomID, socket1, socket2, chatType string) {
	key := fmt.Sprintf("room:%s", roomID)
	RDB.HSet(ctx, key, "s1", socket1, "s2", socket2, "chatType", chatType)
	RDB.Expire(ctx, key, roomTTL)
}

// SetRoomChatType updates the chat type of an existing room (e.g. a mid-chat
// text→video switch). Returns false if the write failed.
func SetRoomChatType(ctx context.Context, roomID, chatType string) bool {
	key := fmt.Sprintf("room:%s", roomID)
	return RDB.HSet(ctx, key, "chatType", chatType).Err() == nil
}

// GetRoomPartner returns the other socket in the room.
func GetRoomPartner(ctx context.Context, roomID, mySocketID string) (string, bool) {
	key := fmt.Sprintf("room:%s", roomID)
	vals, err := RDB.HGetAll(ctx, key).Result()
	if err != nil || len(vals) == 0 {
		return "", false
	}
	if vals["s1"] == mySocketID {
		return vals["s2"], true
	}
	if vals["s2"] == mySocketID {
		return vals["s1"], true
	}
	return "", false
}

// DeleteRoom removes a room from Redis.
func DeleteRoom(ctx context.Context, roomID string) {
	RDB.Del(ctx, fmt.Sprintf("room:%s", roomID))
}

// SetSocketRoom stores which room a socket belongs to.
func SetSocketRoom(ctx context.Context, socketID, roomID string) {
	RDB.Set(ctx, "socket:room:"+socketID, roomID, roomTTL)
}

func GetSocketRoom(ctx context.Context, socketID string) (string, bool) {
	val, err := RDB.Get(ctx, "socket:room:"+socketID).Result()
	if err != nil {
		return "", false
	}
	return val, true
}

func ClearSocketRoom(ctx context.Context, socketID string) {
	RDB.Del(ctx, "socket:room:"+socketID)
}
