package models

import (
	"time"

	"github.com/google/uuid"
)

type OTP struct {
	ID        uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Email     string    `gorm:"column:email;index" json:"email"`
	Code      string    `gorm:"column:code" json:"code"`
	Action    string    `gorm:"column:action;index" json:"action"`
	ExpiresAt time.Time `gorm:"column:expires_at" json:"expires_at"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

func (OTP) TableName() string {
	return "otps"
}
