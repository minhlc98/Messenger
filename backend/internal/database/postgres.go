package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"chat-app/internal/config"
	"chat-app/internal/models"

	_ "github.com/jackc/pgx/v5/stdlib"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

func ConnectPostgres(config *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		config.DBHost,
		config.DBUser,
		config.DBPassword,
		config.DBName,
		config.DBPort,
	)
	gdb, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:         gormLogger.Default.LogMode(gormLogger.Silent),
		TranslateError: true,
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := gdb.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxOpenConns(config.DBMaxOpenConns)
	sqlDB.SetMaxIdleConns(config.DBMaxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Duration(config.DBMaxLifetime) * time.Second)
	sqlDB.SetConnMaxIdleTime(time.Duration(config.DBMaxIdleTime) * time.Second)

	return gdb, nil
}

func findMigrationsDir() string {
	candidateDirs := []string{
		"migrations",
		"backend/migrations",
		"../migrations",
		"../../migrations",
	}

	for _, dir := range candidateDirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir
		}
	}

	return ""
}

func RunMigrations(db *gorm.DB) error {
	migrationsDir := findMigrationsDir()
	if migrationsDir != "" {
		files, err := os.ReadDir(migrationsDir)
		if err != nil {
			return fmt.Errorf("failed to read migrations directory (%s): %w", migrationsDir, err)
		}

		var sqlFiles []string
		for _, file := range files {
			if !file.IsDir() && strings.HasSuffix(file.Name(), ".sql") {
				sqlFiles = append(sqlFiles, file.Name())
			}
		}

		if len(sqlFiles) > 0 {
			sort.Strings(sqlFiles)
			for _, file := range sqlFiles {
				filePath := filepath.Join(migrationsDir, file)
				content, err := os.ReadFile(filePath)
				if err != nil {
					return fmt.Errorf("failed to read migration file %s: %w", file, err)
				}

				log.Printf("Executing migration: %s", file)
				if err := db.Exec(string(content)).Error; err != nil {
					return fmt.Errorf("failed to execute migration %s: %w", file, err)
				}
			}
			log.Println("Database migrations executed successfully from SQL files")
			return nil
		}
	}

	// Fallback to GORM AutoMigrate if no SQL files found
	log.Println("No migration files found, running GORM AutoMigrate...")
	if err := db.Exec(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`).Error; err != nil {
		log.Printf("Note: failed to create uuid-ossp extension (may already exist or insufficient permissions): %v", err)
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Friendship{},
		&models.Conversation{},
		&models.ConversationMember{},
		&models.Message{},
	); err != nil {
		return fmt.Errorf("failed to auto-migrate models: %w", err)
	}

	log.Println("GORM AutoMigrate completed successfully")
	return nil
}
