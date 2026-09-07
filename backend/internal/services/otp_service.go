package services

import (
	"chat-app/internal/constants"
	"chat-app/internal/dto"
	"chat-app/internal/models"
	"chat-app/internal/repositories"
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

type OTPService interface {
	SendRegistrationOTP(ctx context.Context, email string) error
}

type otpService struct {
	emailService EmailService
	otpRepo      repositories.OTPRepository
}

func GenOTP() (string, error) {
	max := big.NewInt(1000000) // from 0 to 999,999
	num, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	// format to 6 digits with leading zeros if needed
	return fmt.Sprintf("%06d", num), nil
}

func NewOTPService(emailService EmailService, otpRepo repositories.OTPRepository) OTPService {
	return &otpService{emailService: emailService, otpRepo: otpRepo}
}

func (s *otpService) SendRegistrationOTP(ctx context.Context, email string) error {
	// Generate and send OTP
	code, _ := GenOTP()
	otp := &models.OTP{
		Email:     email,
		Code:      code,
		Action:    constants.OTP_REGISTRATION,
		ExpiresAt: time.Now().Add(2 * time.Minute),
	}

	if err := s.otpRepo.Create(ctx, otp); err != nil {
		log.Println("Failed to create OTP:", err)
		return fmt.Errorf("failed to create OTP: %w", err)
	}
	subject := "Mã xác thực tài khoản Messenger của bạn"

	// Dùng runtime.Caller để lấy path của file otp_service.go hiện tại
	_, b, _, _ := runtime.Caller(0)
	basepath := filepath.Dir(b)
	// Đi ngược ra ngoài 1 folder (từ services ra internal) rồi vào folder templates
	templatePath := filepath.Join(basepath, "..", "templates", "email_registration.html")

	htmlByte, err := os.ReadFile(templatePath)
	if err != nil {
		return fmt.Errorf("failed to read email template: %w", err)
	}
	htmlBody := fmt.Sprintf(string(htmlByte), code)

	payload := dto.EmailPayload{
		ToEmail: []string{email},
		Subject: subject,
		Content: htmlBody,
	}

	err = s.emailService.Send(ctx, payload)
	if err != nil {
		log.Println("Failed to send email:", err)
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}
