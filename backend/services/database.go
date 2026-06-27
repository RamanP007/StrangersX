package services

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Database

func ConnectMongo(uri string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("mongo ping: %v", err)
	}

	DB = client.Database("omegle")
	ensureIndexes(ctx)
	log.Println("Database connection successful (MongoDB)")
}

func ensureIndexes(ctx context.Context) {
	users := DB.Collection("users")
	_, err := users.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "googleId", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			// Case-insensitive unique username (sparse: guests/legacy docs may lack it)
			Keys: bson.D{{Key: "username", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetSparse(true).
				SetCollation(&options.Collation{Locale: "en", Strength: 2}),
		},
	})
	if err != nil {
		log.Printf("index creation warn: %v", err)
	}
}
