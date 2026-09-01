package services

import (
	"context"

	"chat-app/internal/models"
	"chat-app/internal/repositories"
)

type FriendService interface {
	SendFriendRequest(ctx context.Context, requesterID, addresseeID string) error
	GetPendingRequests(ctx context.Context, addresseeID string) ([]models.Friendship, error)
	AcceptFriendRequest(ctx context.Context, addresseeID, requestID string) (bool, error)
	RejectFriendRequest(ctx context.Context, addresseeID, requestID string) (bool, error)
	GetFriends(ctx context.Context, userID string) ([]models.User, error)
}

type friendService struct {
	friendRepo repositories.FriendRepository
}

func NewFriendService(repo repositories.FriendRepository) FriendService {
	return &friendService{friendRepo: repo}
}

func (s *friendService) SendFriendRequest(ctx context.Context, requesterID, addresseeID string) error {
	return s.friendRepo.SendFriendRequest(ctx, requesterID, addresseeID)
}

func (s *friendService) GetPendingRequests(ctx context.Context, addresseeID string) ([]models.Friendship, error) {
	return s.friendRepo.GetPendingRequests(ctx, addresseeID)
}

func (s *friendService) AcceptFriendRequest(ctx context.Context, addresseeID, requestID string) (bool, error) {
	return s.friendRepo.AcceptFriendRequest(ctx, addresseeID, requestID)
}

func (s *friendService) RejectFriendRequest(ctx context.Context, addresseeID, requestID string) (bool, error) {
	return s.friendRepo.RejectFriendRequest(ctx, addresseeID, requestID)
}

func (s *friendService) GetFriends(ctx context.Context, userID string) ([]models.User, error) {
	return s.friendRepo.GetFriends(ctx, userID)
}
