package models

import (
	"time"

	"github.com/google/uuid"
)

type Friendship struct {
	ID          uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	RequesterID string    `gorm:"column:requester_id" json:"requester_id"`
	AddresseeID string    `gorm:"column:addressee_id" json:"addressee_id"`
	Status      string    `gorm:"column:status" json:"status"` // pending, accepted, rejected
	CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
	Requester   *User     `gorm:"foreignKey:RequesterID" json:"requester,omitempty"`
	Addressee   *User     `gorm:"foreignKey:AddresseeID" json:"addressee,omitempty"`
}

func (Friendship) TableName() string {
	return "friendships"
}
