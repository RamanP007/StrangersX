package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port             string
	MongoURI         string
	RedisURI         string
	JWTSecret        string
	GoogleClientID   string
	AllowedOrigins   []string
	AdminUsername    string
	AdminPassword    string
	MeteredDomain    string
	MeteredSecretKey string
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
		AllowedOrigins: resolveAllowedOrigins(),
		AdminUsername:  getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword:  getEnv("ADMIN_PASSWORD", "admin"),
		// Metered TURN: the backend fetches short-lived ICE credentials with the
		// secret key and serves them at /api/turn, keeping the secret off the client.
		MeteredDomain:    strings.TrimSpace(os.Getenv("METERED_DOMAIN")),
		MeteredSecretKey: strings.TrimSpace(os.Getenv("METERED_SECRET_KEY")),
	}
}

// resolveAllowedOrigins reads CORS_ORIGINS (comma-separated) or FRONTEND_URL,
// falling back to local dev origins. These gate both CORS and WebSocket origins.
func resolveAllowedOrigins() []string {
	if v := os.Getenv("CORS_ORIGINS"); v != "" {
		var out []string
		for _, p := range strings.Split(v, ",") {
			if p = strings.TrimSpace(strings.TrimRight(p, "/")); p != "" {
				out = append(out, p)
			}
		}
		if len(out) > 0 {
			return out
		}
	}
	if v := strings.TrimSpace(os.Getenv("FRONTEND_URL")); v != "" {
		return []string{strings.TrimRight(v, "/")}
	}
	return []string{
		"http://localhost:3000", "http://frontend:3000",
		"http://localhost:3001", "http://admin:3001",
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
