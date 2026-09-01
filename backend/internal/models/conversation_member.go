package models

import (
	"time"

	"github.com/google/uuid"
)

type ConversationMember struct {
	ConversationID uuid.UUID `gorm:"column:conversation_id;primaryKey" json:"conversation_id"`
	UserID         string    `gorm:"column:user_id;primaryKey" json:"user_id"`
	Role           string    `gorm:"column:role" json:"role"` // admin, member
	JoinedAt       time.Time `gorm:"column:joined_at" json:"joined_at"`
}

func (ConversationMember) TableName() string {
	return "conversation_members"
}
