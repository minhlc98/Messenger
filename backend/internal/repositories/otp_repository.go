package repositories

import (
	"context"

	"chat-app/internal/models"

	"gorm.io/gorm"
)

type OTPRepository interface {
	Create(ctx context.Context, otp *models.OTP) error
	GetValidOTP(ctx context.Context, email, code, action string) (*models.OTP, error)
	GetLatestOTP(ctx context.Context, email, action string) (*models.OTP, error)
	Delete(ctx context.Context, id string) error
}

type otpRepository struct {
	db *gorm.DB
}

func NewOTPRepository(db *gorm.DB) OTPRepository {
	return &otpRepository{db: db}
}

func (r *otpRepository) Create(ctx context.Context, otp *models.OTP) error {
	return r.db.WithContext(ctx).Create(otp).Error
}

func (r *otpRepository) GetValidOTP(ctx context.Context, email, code, action string) (*models.OTP, error) {
	var otp models.OTP
	err := r.db.WithContext(ctx).Where("email = ? AND code = ? AND action = ? AND expires_at > NOW()", email, code, action).First(&otp).Error
	return &otp, err
}

func (r *otpRepository) GetLatestOTP(ctx context.Context, email, action string) (*models.OTP, error) {
	var otp models.OTP
	err := r.db.WithContext(ctx).Where("email = ? AND action = ?", email, action).Order("created_at desc").First(&otp).Error
	return &otp, err
}

func (r *otpRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.OTP{}).Error
}
