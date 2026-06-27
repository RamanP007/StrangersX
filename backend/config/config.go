package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	MongoURI       string
	RedisURI       string
	JWTSecret      string
	GoogleClientID string
}

var App Config

func Load() {
	// Load .env only in non-Docker environments (Docker sets vars directly)
	_ = godotenv.Load()

	App = Config{
		Port:           getEnv("PORT", "8080"),
		MongoURI:       getEnv("MONGO_URI", "mongodb://localhost:27017/omegle"),
		RedisURI:       resolveRedisURI(),
		JWTSecret:      mustGetEnv("JWT_SECRET"),
		GoogleClientID: mustGetEnv("GOOGLE_CLIENT_ID"),
	}
}

// resolveRedisURI prefers REDIS_URI (a full redis:// or rediss:// connection
// string, as provided by hosted Redis). Falls back to a legacy REDIS_ADDR
// (host:port), then to a sensible local default.
func resolveRedisURI() string {
	if v := os.Getenv("REDIS_URI"); v != "" {
		return v
	}
	if v := os.Getenv("REDIS_ADDR"); v != "" {
		return v
	}
	return "redis://localhost:6379"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}
