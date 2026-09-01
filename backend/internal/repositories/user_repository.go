package repositories

import (
	"context"
	"strings"

	"chat-app/internal/models"
	"chat-app/internal/paginations"

	"gorm.io/gorm"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id string) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, condition *paginations.UserPagination) (int64, []models.User, error)
	SearchUsers(ctx context.Context, email string) ([]models.User, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Update(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.User{}, "id = ?", id).Error
}

func (r *userRepository) List(ctx context.Context, condition *paginations.UserPagination) (int64, []models.User, error) {
	var users []models.User
	query := r.db.WithContext(ctx)
	if email := strings.TrimSpace(condition.Email); email != "" {
		query = query.Where("email = ?", email)
	}

	if condition.IsOnline != nil {
		query = query.Where("is_online = ?", *condition.IsOnline)
	}

	if condition.CreateAtGte != nil {
		query = query.Where("created_at >= ?", *condition.CreateAtGte)
	}

	if condition.CreateAtLte != nil {
		query = query.Where("created_at <= ?", *condition.CreateAtLte)
	}

	total := int64(0)
	if err := query.Model(&models.User{}).Count(&total).Error; err != nil {
		return 0, nil, err
	}

	if condition.Order != "" {
		direction := "asc"
		sortField := condition.Order
		elements := strings.Split(condition.Order, "_")
		if len(direction) > 1 {
			lastElement := elements[len(elements)-1]
			if lastElement == "asc" || lastElement == "desc" {
				direction = lastElement
				sortField = strings.Join(elements[:len(elements)-1], "_")
			}
		}

		query = query.Order(sortField + " " + direction)
	}

	if err := query.Offset(condition.Offset).Limit(condition.Limit).Find(&users).Error; err != nil {
		return 0, nil, err
	}

	return total, users, nil
}

func (r *userRepository) SearchUsers(ctx context.Context, email string) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).Where("email ILIKE ?", "%"+email+"%").Find(&users).Error
	return users, err
}
