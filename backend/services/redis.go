package services

import (
	"context"
	"log"
	"strings"

	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client

// ConnectRedis accepts either a full URI (redis:// or rediss://) or a bare
// host:port address.
func ConnectRedis(uri string) {
	var opts *redis.Options
	if strings.HasPrefix(uri, "redis://") || strings.HasPrefix(uri, "rediss://") {
		parsed, err := redis.ParseURL(uri)
		if err != nil {
			log.Fatalf("invalid REDIS_URI: %v", err)
		}
		opts = parsed
	} else {
		opts = &redis.Options{Addr: uri}
	}

	RDB = redis.NewClient(opts)
	if err := RDB.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("redis ping: %v", err)
	}
	log.Println("Redis DB connected successfully")
}
