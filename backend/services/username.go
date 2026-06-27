package services

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"regexp"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var adjectives = []string{
	"Crimson", "Velvet", "Midnight", "Scarlet", "Shadow", "Mystic", "Silent",
	"Wild", "Neon", "Golden", "Frost", "Ember", "Lunar", "Solar", "Raven",
	"Silver", "Cosmic", "Electric", "Royal", "Savage", "Phantom", "Rebel",
	"Dusk", "Onyx", "Ruby", "Sable", "Vivid", "Blaze", "Storm", "Echo",
}

var nouns = []string{
	"Fox", "Wolf", "Tiger", "Raven", "Viper", "Panther", "Falcon", "Cobra",
	"Lynx", "Jaguar", "Phoenix", "Dragon", "Hawk", "Lion", "Shark", "Orchid",
	"Rose", "Flame", "Ghost", "Knight", "Siren", "Nova", "Comet", "Storm",
	"Blade", "Pulse", "Diamond", "Sphinx", "Specter", "Vortex",
}

var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]{3,20}$`)

// GenerateUniqueUsername produces a random username not already taken in MongoDB.
func GenerateUniqueUsername(ctx context.Context) (string, error) {
	users := DB.Collection("users")
	for attempt := 0; attempt < 25; attempt++ {
		candidate := fmt.Sprintf("%s%s%d",
			adjectives[rand.Intn(len(adjectives))],
			nouns[rand.Intn(len(nouns))],
			rand.Intn(1000),
		)
		taken, err := usernameTaken(ctx, users, candidate)
		if err != nil {
			return "", err
		}
		if !taken {
			return candidate, nil
		}
	}
	return "", errors.New("could not generate a unique username")
}

func usernameTaken(ctx context.Context, users *mongo.Collection, username string) (bool, error) {
	err := users.FindOne(ctx, bson.M{
		"username": bson.M{"$regex": "^" + regexp.QuoteMeta(username) + "$", "$options": "i"},
	}).Err()
	if err == nil {
		return true, nil
	}
	if errors.Is(err, mongo.ErrNoDocuments) {
		return false, nil
	}
	return false, err
}

// ValidateUsername checks format rules. Returns a cleaned username or an error.
func ValidateUsername(username string) (string, error) {
	clean := strings.TrimSpace(username)
	if !usernamePattern.MatchString(clean) {
		return "", errors.New("username must be 3-20 characters: letters, numbers, underscore only")
	}
	return clean, nil
}

// IsUsernameAvailable returns true if no user other than excludeID holds it.
func IsUsernameAvailable(ctx context.Context, username string, excludeID primitive.ObjectID) (bool, error) {
	users := DB.Collection("users")
	filter := bson.M{
		"username": bson.M{"$regex": "^" + regexp.QuoteMeta(username) + "$", "$options": "i"},
		"_id":      bson.M{"$ne": excludeID},
	}
	err := users.FindOne(ctx, filter).Err()
	if err == nil {
		return false, nil
	}
	if errors.Is(err, mongo.ErrNoDocuments) {
		return true, nil
	}
	return false, err
}
