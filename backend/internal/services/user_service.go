package services

import (
	"context"

	"chat-app/internal/models"
	"chat-app/internal/paginations"
	"chat-app/internal/repositories"
)

type UserService interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByID(ctx context.Context, id string) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
	DeleteUser(ctx context.Context, id string) error
	ListUsers(ctx context.Context, condition *paginations.UserPagination) (int64, []models.User, error)
	SearchUsers(ctx context.Context, email string) ([]models.User, error)
}

type userService struct {
	userRepo repositories.UserRepository
}

func NewUserService(userRepo repositories.UserRepository) UserService {
	return &userService{userRepo: userRepo}
}

func (s *userService) CreateUser(ctx context.Context, user *models.User) error {
	return s.userRepo.Create(ctx, user)
}

func (s *userService) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	return s.userRepo.GetByID(ctx, id)
}

func (s *userService) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return s.userRepo.GetByEmail(ctx, email)
}

func (s *userService) UpdateUser(ctx context.Context, user *models.User) error {
	return s.userRepo.Update(ctx, user)
}

func (s *userService) DeleteUser(ctx context.Context, id string) error {
	return s.userRepo.Delete(ctx, id)
}

func (s *userService) ListUsers(ctx context.Context, condition *paginations.UserPagination) (int64, []models.User, error) {
	return s.userRepo.List(ctx, condition)
}

func (s *userService) SearchUsers(ctx context.Context, email string) ([]models.User, error) {
	return s.userRepo.SearchUsers(ctx, email)
}
