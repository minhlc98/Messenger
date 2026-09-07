package services

import (
	"chat-app/internal/config"
	"chat-app/internal/constants"
	"chat-app/internal/dto"
	"chat-app/internal/models"
	"chat-app/internal/repositories"
	"context"
	"errors"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService interface {
	Register(ctx context.Context, req dto.RegisterRequest) (*dto.RegisterResponse, error)
	Login(ctx context.Context, req dto.LoginRequest) (*dto.RegisterResponse, error)
	Refresh(ctx context.Context, refreshToken string) (*dto.RefreshResponse, error)
	VerifyOTP(ctx context.Context, req dto.VerifyOTPRequest) (*dto.RegisterResponse, error)
	ResendRegistrationOTP(ctx context.Context, req dto.ResendRegistrationOTPRequest) error
	generateTokens(userID string) (string, string, error)
}

type authService struct {
	cfg            *config.Config
	userRepository repositories.UserRepository
	otpRepository  repositories.OTPRepository
	otpService     OTPService
}

func NewAuthService(cfg *config.Config, userRepository repositories.UserRepository, otpRepository repositories.OTPRepository, otpService OTPService) AuthService {
	return &authService{
		cfg:            cfg,
		userRepository: userRepository,
		otpRepository:  otpRepository,
		otpService:     otpService,
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
		IsVerified:   false,
	}

	if err := auth.userRepository.Create(ctx, user); err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil, errors.New("Email đã được sử dụng")
		}
		return nil, err
	}

	go auth.otpService.SendRegistrationOTP(context.Background(), user.Email)

	return &dto.RegisterResponse{
		RequireOTP: true,
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

	if !user.IsVerified {
		// Check if there is already a recent OTP
		latestOtp, err := auth.otpRepository.GetLatestOTP(ctx, user.Email, "REGISTER")
		if err == nil && time.Since(latestOtp.CreatedAt) < 2*time.Minute {
			return &dto.RegisterResponse{RequireOTP: true}, nil
		}

		go auth.otpService.SendRegistrationOTP(context.Background(), user.Email)

		return &dto.RegisterResponse{RequireOTP: true}, nil
	}

	userID := user.ID.String()
	accessToken, refreshToken, err := auth.generateTokens(userID)
	if err != nil {
		return nil, err
	}

	return &dto.RegisterResponse{
		RequireOTP:   false,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: &struct {
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

func (auth *authService) VerifyOTP(ctx context.Context, req dto.VerifyOTPRequest) (*dto.RegisterResponse, error) {
	otp, err := auth.otpRepository.GetValidOTP(ctx, req.Email, req.Code, req.Action)
	if err != nil {
		return nil, errors.New("Mã OTP không hợp lệ hoặc đã hết hạn")
	}

	user, err := auth.userRepository.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("Không tìm thấy người dùng")
	}

	user.IsVerified = true
	if err := auth.userRepository.Update(ctx, user); err != nil {
		return nil, err
	}

	// Xoá OTP sau khi verify thành công
	_ = auth.otpRepository.Delete(ctx, otp.ID.String())

	userID := user.ID.String()
	accessToken, refreshToken, err := auth.generateTokens(userID)
	if err != nil {
		return nil, err
	}

	return &dto.RegisterResponse{
		RequireOTP:   false,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: &struct {
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

func (auth *authService) ResendRegistrationOTP(ctx context.Context, req dto.ResendRegistrationOTPRequest) error {
	_, err := auth.userRepository.GetByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("Email không tồn tại")
		}
		return err
	}

	latestOtp, err := auth.otpRepository.GetLatestOTP(ctx, req.Email, constants.OTP_REGISTRATION)
	if err == nil && time.Since(latestOtp.CreatedAt) < 2*time.Minute {
		return errors.New("Vui lòng đợi 2 phút trước khi yêu cầu mã mới")
	}

	if err := auth.otpService.SendRegistrationOTP(ctx, req.Email); err != nil {
		log.Println("Failed to send OTP:", err)
		return errors.New("Gửi OTP thất bại")
	}

	return nil
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
