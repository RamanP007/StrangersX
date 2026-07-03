package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID                primitive.ObjectID `bson:"_id,omitempty"      json:"id"`
	GoogleID          string             `bson:"googleId"           json:"googleId"`
	Email             string             `bson:"email"              json:"email"`
	Name              string             `bson:"name"               json:"name"`
	Avatar            string             `bson:"avatar"             json:"avatar"`
	Username          string             `bson:"username"           json:"username"`
	UsernameConfirmed bool               `bson:"usernameConfirmed"  json:"usernameConfirmed"`
	ShowUsername      bool               `bson:"showUsername"       json:"showUsername"`
	TermsAccepted     bool               `bson:"termsAccepted"      json:"termsAccepted"`
	TermsAcceptedAt   *time.Time         `bson:"termsAcceptedAt"    json:"termsAcceptedAt"`
	// Explicit, in-app Terms & Conditions acceptance (gated by a popup after signup).
	TermsAndConditionAccepted   bool       `bson:"termsAndConditionAccepted"   json:"termsAndConditionAccepted"`
	TermsAndConditionAcceptedAt *time.Time `bson:"termsAndConditionAcceptedAt" json:"termsAndConditionAcceptedAt"`
	CreatedAt         time.Time          `bson:"createdAt"          json:"createdAt"`
	ReportCount       int                `bson:"reportCount"        json:"reportCount"`
	Banned            bool               `bson:"banned"             json:"banned"`
	BannedAt          *time.Time         `bson:"bannedAt"           json:"bannedAt"`
}
