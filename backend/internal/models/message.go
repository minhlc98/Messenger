package models

import (
	"time"

	"github.com/google/uuid"
)

type Message struct {
	ID             uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	ConversationID string    `gorm:"column:conversation_id" json:"conversation_id"`
	SenderID       string    `gorm:"column:sender_id" json:"sender_id"`
	Type           string    `gorm:"column:type" json:"type"` // text, image, audio, file
	Content        string    `gorm:"column:content" json:"content"`
	FileURL        string    `gorm:"column:file_url" json:"file_url"`
	CreatedAt      time.Time `gorm:"column:created_at" json:"created_at"`
	Sender         *User     `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
}

func (Message) TableName() string {
	return "messages"
}
