package models

import (
	"time"

	"github.com/google/uuid"
)

type Conversation struct {
	ID        uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	IsGroup   bool      `gorm:"column:is_group" json:"is_group"`
	Name      string    `gorm:"column:name" json:"name"`
	AvatarURL string    `gorm:"column:avatar_url" json:"avatar_url"`
	CreatedBy string    `gorm:"column:created_by" json:"created_by"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	Members   []User    `gorm:"-" json:"members,omitempty"`
}

func (Conversation) TableName() string {
	return "conversations"
}
