package services

import (
	"chat-app/internal/config"
	"chat-app/internal/dto"
	"chat-app/internal/models"
	"chat-app/internal/repositories"
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService interface {
	Register(ctx context.Context, req dto.RegisterRequest) (*dto.RegisterResponse, error)
	Login(ctx context.Context, req dto.LoginRequest) (*dto.RegisterResponse, error)
	Refresh(ctx context.Context, refreshToken string) (*dto.RefreshResponse, error)
	generateTokens(userID string) (string, string, error)
}

type authService struct {
	cfg            *config.Config
	userRepository repositories.UserRepository
}

func NewAuthService(cfg *config.Config, userRepository repositories.UserRepository) AuthService {
	return &authService{
		cfg:            cfg,
		userRepository: userRepository,
	}
}

func (auth *authService) Register(ctx context.Context, req dto.RegisterRequest) (*dto.RegisterResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		Name:         req.Name,
	}

	if err := auth.userRepository.Create(ctx, user); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil, errors.New("Email đã được sử dụng")
		}
		return nil, err
	}

	userID := user.ID.String()
	accessToken, refreshToken, err := auth.generateTokens(userID)
	if err != nil {
		return nil, err
	}

	return &dto.RegisterResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: struct {
			ID    string `json:"id"`
			Email string `json:"email"`
			Name  string `json:"name"`
		}{
			ID:    userID,
			Email: user.Email,
			Name:  user.Name,
		},
	}, nil
}

func (auth *authService) Login(ctx context.Context, req dto.LoginRequest) (*dto.RegisterResponse, error) {
	user, err := auth.userRepository.GetByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("Email hoặc mật khẩu không đúng")
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("Email hoặc mật khẩu không đúng")
	}

	userID := user.ID.String()
	accessToken, refreshToken, err := auth.generateTokens(userID)
	if err != nil {
		return nil, err
	}

	return &dto.RegisterResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: struct {
			ID    string `json:"id"`
			Email string `json:"email"`
			Name  string `json:"name"`
		}{
			ID:    userID,
			Email: user.Email,
			Name:  user.Name,
		},
	}, nil
}

func (auth *authService) Refresh(ctx context.Context, refreshToken string) (*dto.RefreshResponse, error) {
	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(auth.cfg.JWTRefreshSec), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("Invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("Invalid token claims")
	}

	userID := claims["user_id"].(string)
	// Lấy cả access_token và refresh_token mới (Gia hạn thêm 7 ngày từ thời điểm hiện tại)
	accessToken, newRefreshToken, err := auth.generateTokens(userID)
	if err != nil {
		return nil, errors.New("Failed to generate access token")
	}

	return &dto.RefreshResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
	}, nil
}

func (auth *authService) generateTokens(userID string) (string, string, error) {
	atClaims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	}
	at := jwt.NewWithClaims(jwt.SigningMethodHS256, atClaims)
	accessToken, err := at.SignedString([]byte(auth.cfg.JWTSecret))
	if err != nil {
		return "", "", err
	}

	rtClaims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	rt := jwt.NewWithClaims(jwt.SigningMethodHS256, rtClaims)
	refreshToken, err := rt.SignedString([]byte(auth.cfg.JWTRefreshSec))
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}
