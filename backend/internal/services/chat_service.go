package services

import (
	"context"

	"github.com/google/uuid"

	"chat-app/internal/models"
	"chat-app/internal/repositories"
)

type ChatService interface {
	GetConversations(ctx context.Context, userID string) ([]models.Conversation, error)
	GetConversation(ctx context.Context, convID uuid.UUID) (*models.Conversation, error)
	CheckMembership(ctx context.Context, convID uuid.UUID, userID string) (bool, error)
	CreateConversation(ctx context.Context, isGroup bool, name, creatorID string, memberIDs []string) (*models.Conversation, error)
	GetMessages(ctx context.Context, convID uuid.UUID, before string, limit int) ([]models.Message, error)
	CheckAdminRole(ctx context.Context, convID uuid.UUID, userID string) (bool, error)
	AddMembers(ctx context.Context, convID uuid.UUID, memberIDs []string) error
	CreateMessage(ctx context.Context, msg *models.Message) error
	GetMessage(ctx context.Context, msgID uuid.UUID) (*models.Message, error)
}

type chatService struct {
	chatRepo repositories.ChatRepository
}

func NewChatService(repo repositories.ChatRepository) ChatService {
	return &chatService{chatRepo: repo}
}

func (s *chatService) GetConversations(ctx context.Context, userID string) ([]models.Conversation, error) {
	return s.chatRepo.GetConversations(ctx, userID)
}

func (s *chatService) GetConversation(ctx context.Context, convID uuid.UUID) (*models.Conversation, error) {
	return s.chatRepo.GetConversation(ctx, convID)
}

func (s *chatService) CheckMembership(ctx context.Context, convID uuid.UUID, userID string) (bool, error) {
	return s.chatRepo.CheckMembership(ctx, convID, userID)
}

func (s *chatService) CreateConversation(ctx context.Context, isGroup bool, name, creatorID string, memberIDs []string) (*models.Conversation, error) {
	return s.chatRepo.CreateConversation(ctx, isGroup, name, creatorID, memberIDs)
}

func (s *chatService) GetMessages(ctx context.Context, convID uuid.UUID, before string, limit int) ([]models.Message, error) {
	return s.chatRepo.GetMessages(ctx, convID, before, limit)
}

func (s *chatService) CheckAdminRole(ctx context.Context, convID uuid.UUID, userID string) (bool, error) {
	return s.chatRepo.CheckAdminRole(ctx, convID, userID)
}

func (s *chatService) AddMembers(ctx context.Context, convID uuid.UUID, memberIDs []string) error {
	return s.chatRepo.AddMembers(ctx, convID, memberIDs)
}

func (s *chatService) CreateMessage(ctx context.Context, msg *models.Message) error {
	return s.chatRepo.CreateMessage(ctx, msg)
}

func (s *chatService) GetMessage(ctx context.Context, msgID uuid.UUID) (*models.Message, error) {
	return s.chatRepo.GetMessage(ctx, msgID)
}
