package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Report struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ReporterID        string             `bson:"reporterId"    json:"reporterId"`
	ReportedSocketID  string             `bson:"reportedSocketId" json:"reportedSocketId"`
	Reason            string             `bson:"reason"        json:"reason"`
	Note              string             `bson:"note"          json:"note"`
	RoomID            string             `bson:"roomId"        json:"roomId"`
	CreatedAt         time.Time          `bson:"createdAt"     json:"createdAt"`
}
