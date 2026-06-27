package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	MongoURI       string
	RedisAddr      string
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
		RedisAddr:      getEnv("REDIS_ADDR", "localhost:6379"),
		JWTSecret:      mustGetEnv("JWT_SECRET"),
		GoogleClientID: mustGetEnv("GOOGLE_CLIENT_ID"),
	}
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
