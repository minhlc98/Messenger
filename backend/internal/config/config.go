package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	DBMaxOpenConns int
	DBMaxIdleConns int
	DBMaxLifetime  int
	DBMaxIdleTime  int
	RedisHost      string
	RedisPort      string
	JWTSecret      string
	JWTRefreshSec  string
	UploadDir      string
}

func Load() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	return &Config{
		Port:           getEnv("PORT", "8080"),
		DBHost:         getEnv("DB_HOST", "localhost"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBUser:         getEnv("DB_USER", "admin"),
		DBPassword:     getEnv("DB_PASSWORD", "admin"),
		DBName:         getEnv("DB_NAME", "chatapp"),
		DBMaxOpenConns: getEnvInt("DB_MAX_CONNECTIONS", 10),
		DBMaxIdleConns: getEnvInt("DB_MAX_IDLE_CONNECTIONS", 10),
		DBMaxLifetime:  getEnvInt("DB_MAX_LIFETIME", 10),
		DBMaxIdleTime:  getEnvInt("DB_MAX_IDLE_TIME", 10),
		RedisHost:      getEnv("REDIS_HOST", "localhost"),
		RedisPort:      getEnv("REDIS_PORT", "6379"),
		JWTSecret:      getEnv("JWT_SECRET", "secret"),
		JWTRefreshSec:  getEnv("JWT_REFRESH_SECRET", "refresh_secret"),
		UploadDir:      getEnv("UPLOAD_DIR", "./uploads"),
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	val := getEnv(key, "")
	if val == "" {
		return defaultVal
	}
	result, err := strconv.Atoi(val)
	if err != nil {
		log.Printf("Error converting %s to integer: %v", key, err)
		return defaultVal
	}
	return result
}
