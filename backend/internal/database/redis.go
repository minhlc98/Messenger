package database

import (
	"chat-app/internal/config"
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

func ConnectRedis(cfg *config.Config) *redis.Client {
	redisURL := fmt.Sprintf("redis://%s:%s@%s:%s", cfg.RedisUser, cfg.RedisPassword, cfg.RedisHost, cfg.RedisPort)
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("Failed to parse Redis URL: %v", err)
	}

	rdb := redis.NewClient(opt)

	_, err = rdb.Ping(context.Background()).Result()
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	log.Println("Connected to Redis")
	return rdb
}
