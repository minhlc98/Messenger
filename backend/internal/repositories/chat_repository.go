package repositories

import (
	"context"

	"github.com/google/uuid"

	"chat-app/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ChatRepository interface {
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

type chatRepository struct {
	db *gorm.DB
}

func NewChatRepository(db *gorm.DB) ChatRepository {
	return &chatRepository{db: db}
}

func (r *chatRepository) GetConversations(ctx context.Context, userID string) ([]models.Conversation, error) {
	var conversations []models.Conversation
	err := r.db.WithContext(ctx).
		Joins("JOIN conversation_members cm ON conversations.id = cm.conversation_id").
		Where("cm.user_id = ?", userID).
		Order("conversations.created_at DESC").
		Find(&conversations).Error
	if err != nil {
		return nil, err
	}

	if len(conversations) == 0 {
		return conversations, nil
	}

	convIDs := make([]uuid.UUID, len(conversations))
	for i, c := range conversations {
		convIDs[i] = c.ID
	}

	type memberWithConvID struct {
		models.User
		ConversationID uuid.UUID `gorm:"column:conversation_id"`
	}

	var members []memberWithConvID
	err = r.db.WithContext(ctx).
		Table("users").
		Select("users.*, cm.conversation_id").
		Joins("JOIN conversation_members cm ON users.id = cm.user_id").
		Where("cm.conversation_id IN ?", convIDs).
		Find(&members).Error
	if err != nil {
		return nil, err
	}

	membersMap := make(map[uuid.UUID][]models.User)
	for _, m := range members {
		membersMap[m.ConversationID] = append(membersMap[m.ConversationID], m.User)
	}

	for i := range conversations {
		if m, ok := membersMap[conversations[i].ID]; ok {
			conversations[i].Members = m
		} else {
			conversations[i].Members = []models.User{}
		}
	}

	return conversations, nil
}

func (r *chatRepository) GetConversation(ctx context.Context, convID uuid.UUID) (*models.Conversation, error) {
	var conv models.Conversation
	err := r.db.WithContext(ctx).Where("id = ?", convID).First(&conv).Error
	if err != nil {
		return nil, err
	}

	var members []models.User
	r.db.WithContext(ctx).
		Joins("JOIN conversation_members cm ON users.id = cm.user_id").
		Where("cm.conversation_id = ?", convID).
		Find(&members)
	conv.Members = members
	return &conv, nil
}

func (r *chatRepository) CheckMembership(ctx context.Context, convID uuid.UUID, userID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", convID, userID).
		Count(&count).Error
	return count > 0, err
}

func (r *chatRepository) CreateConversation(ctx context.Context, isGroup bool, name, creatorID string, memberIDs []string) (*models.Conversation, error) {
	if !isGroup && len(memberIDs) == 1 {
		var existingConv models.Conversation
		err := r.db.WithContext(ctx).
			Table("conversations").
			Joins("JOIN conversation_members cm1 ON cm1.conversation_id = conversations.id AND cm1.user_id = ?", creatorID).
			Joins("JOIN conversation_members cm2 ON cm2.conversation_id = conversations.id AND cm2.user_id = ?", memberIDs[0]).
			Where("conversations.is_group = false").
			First(&existingConv).Error
		if err == nil {
			return r.GetConversation(ctx, existingConv.ID)
		}
	}

	var conv *models.Conversation
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		conv = &models.Conversation{
			IsGroup:   isGroup,
			Name:      name,
			CreatedBy: creatorID,
		}
		if err := tx.Create(conv).Error; err != nil {
			return err
		}

		members := make([]models.ConversationMember, 0, len(memberIDs)+1)
		members = append(members, models.ConversationMember{
			ConversationID: conv.ID,
			UserID:         creatorID,
			Role:           "admin",
		})

		for _, mID := range memberIDs {
			members = append(members, models.ConversationMember{
				ConversationID: conv.ID,
				UserID:         mID,
				Role:           "member",
			})
		}

		if err := tx.CreateInBatches(&members, 10).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return r.GetConversation(ctx, conv.ID)
}

func (r *chatRepository) GetMessages(ctx context.Context, convID uuid.UUID, before string, limit int) ([]models.Message, error) {
	var messages []models.Message
	q := r.db.WithContext(ctx).Preload("Sender").Where("conversation_id = ?", convID)

	if before != "" {
		var beforeMsg models.Message
		r.db.WithContext(ctx).Select("created_at").Where("id = ?", before).First(&beforeMsg)
		q = q.Where("created_at < ?", beforeMsg.CreatedAt).Order("created_at DESC")
	} else {
		q = q.Order("created_at ASC")
	}

	err := q.Limit(limit).Find(&messages).Error
	return messages, err
}

func (r *chatRepository) CheckAdminRole(ctx context.Context, convID uuid.UUID, userID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.ConversationMember{}).
		Where("conversation_id = ? AND user_id = ? AND role = ?", convID, userID, "admin").
		Count(&count).Error
	return count > 0, err
}

func (r *chatRepository) AddMembers(ctx context.Context, convID uuid.UUID, memberIDs []string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, mID := range memberIDs {
			member := models.ConversationMember{
				ConversationID: convID,
				UserID:         mID,
				Role:           "member",
			}
			tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&member)
		}
		return nil
	})
}

func (r *chatRepository) CreateMessage(ctx context.Context, msg *models.Message) error {
	return r.db.WithContext(ctx).Create(msg).Error
}

func (r *chatRepository) GetMessage(ctx context.Context, msgID uuid.UUID) (*models.Message, error) {
	var msg models.Message
	err := r.db.WithContext(ctx).Preload("Sender").Where("id = ?", msgID).First(&msg).Error
	return &msg, err
}
