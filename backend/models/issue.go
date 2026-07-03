package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Issue struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    string             `bson:"userId"        json:"userId"` // "" for guests
	Message   string             `bson:"message"       json:"message"`
	IP        string             `bson:"ip"            json:"ip"`
	CreatedAt time.Time          `bson:"createdAt"     json:"createdAt"`
}
