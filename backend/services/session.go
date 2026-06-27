package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

const guestTTL = 24 * time.Hour

func CreateGuestSession() (string, error) {
	token := uuid.New().String()
	key := fmt.Sprintf("guest:%s", token)
	if err := RDB.Set(context.Background(), key, "1", guestTTL).Err(); err != nil {
		return "", err
	}
	return token, nil
}

func ValidateGuestSession(token string) bool {
	key := fmt.Sprintf("guest:%s", token)
	val, err := RDB.Get(context.Background(), key).Result()
	return err == nil && val == "1"
}

func StoreJWTSession(userID, token string) error {
	key := fmt.Sprintf("jwt:%s", userID)
	return RDB.Set(context.Background(), key, token, 24*time.Hour).Err()
}

func RevokeJWTSession(userID string) error {
	key := fmt.Sprintf("jwt:%s", userID)
	return RDB.Del(context.Background(), key).Err()
}
