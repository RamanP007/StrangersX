package services

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client

func ConnectRedis(addr string) {
	RDB = redis.NewClient(&redis.Options{Addr: addr})
	if err := RDB.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("redis ping: %v", err)
	}
	log.Println("Redis connected")
}
