package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Email        string    `gorm:"column:email" json:"email"`
	PasswordHash string    `gorm:"column:password_hash" json:"-"`
	Name         string    `gorm:"column:name" json:"name"`
	AvatarURL    string    `gorm:"column:avatar_url" json:"avatar_url"`
	IsOnline     bool      `gorm:"column:is_online" json:"is_online"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`
}

func (User) TableName() string {
	return "users"
}
