package repositories

import (
	"context"

	"chat-app/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type FriendRepository interface {
	SendFriendRequest(ctx context.Context, requesterID, addresseeID string) error
	GetPendingRequests(ctx context.Context, addresseeID string) ([]models.Friendship, error)
	AcceptFriendRequest(ctx context.Context, addresseeID, requestID string) (bool, error)
	RejectFriendRequest(ctx context.Context, addresseeID, requestID string) (bool, error)
	GetFriends(ctx context.Context, userID string) ([]models.User, error)
}

type friendRepository struct {
	db *gorm.DB
}

func NewFriendRepository(db *gorm.DB) FriendRepository {
	return &friendRepository{db: db}
}

func (r *friendRepository) SendFriendRequest(ctx context.Context, requesterID, addresseeID string) error {
	friendship := models.Friendship{
		RequesterID: requesterID,
		AddresseeID: addresseeID,
		Status:      "pending",
	}
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(&friendship).Error
}

func (r *friendRepository) GetPendingRequests(ctx context.Context, addresseeID string) ([]models.Friendship, error) {
	var requests []models.Friendship
	err := r.db.WithContext(ctx).
		Preload("Requester").
		Where("addressee_id = ? AND status = ?", addresseeID, "pending").
		Order("created_at DESC").
		Find(&requests).Error
	return requests, err
}

func (r *friendRepository) AcceptFriendRequest(ctx context.Context, addresseeID, requestID string) (bool, error) {
	res := r.db.WithContext(ctx).Model(&models.Friendship{}).
		Where("id = ? AND addressee_id = ? AND status = ?", requestID, addresseeID, "pending").
		Update("status", "accepted")
	return res.RowsAffected > 0, res.Error
}

func (r *friendRepository) RejectFriendRequest(ctx context.Context, addresseeID, requestID string) (bool, error) {
	res := r.db.WithContext(ctx).Model(&models.Friendship{}).
		Where("id = ? AND addressee_id = ? AND status = ?", requestID, addresseeID, "pending").
		Update("status", "rejected")
	return res.RowsAffected > 0, res.Error
}

func (r *friendRepository) GetFriends(ctx context.Context, userID string) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).
		Joins("JOIN friendships f ON (f.requester_id = users.id OR f.addressee_id = users.id)").
		Where("(f.requester_id = ? OR f.addressee_id = ?) AND users.id != ? AND f.status = ?", userID, userID, userID, "accepted").
		Find(&users).Error
	return users, err
}
