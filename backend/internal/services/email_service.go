package services

import (
	"context"
	"fmt"
	"log"
	"os"

	"chat-app/internal/config"
	"chat-app/internal/dto"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
	"github.com/resend/resend-go/v4"
)

type EmailService interface {
	Send(ctx context.Context, emailPayload dto.EmailPayload) error
}

type emailService struct {
	client        *resend.Client
	defaultSender string
	cfg           *config.Config
}

func NewEmailService(cfg *config.Config) EmailService {
	client := resend.NewClient(cfg.ResendAPIKey)

	defaultSender := os.Getenv("SENDER_EMAIL")
	if defaultSender == "" {
		log.Println("WARNING: SENDER_EMAIL is empty. Email sending may fail.")
	}

	return &emailService{
		client:        client,
		cfg:           cfg,
		defaultSender: defaultSender,
	}
}

func (s *emailService) Send(ctx context.Context, emailPayload dto.EmailPayload) error {
	sender := s.defaultSender
	if emailPayload.FromEmailAddress != nil {
		sender = *emailPayload.FromEmailAddress
	}

	params := &resend.SendEmailRequest{
		From:    sender,
		To:      emailPayload.ToEmail,
		Subject: emailPayload.Subject,
		Html:    emailPayload.Content,
	}

	_, err := s.client.Emails.SendWithContext(ctx, params)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

type emailSESService struct {
	client        *ses.Client
	defaultSender string
	cfg           *config.Config
}

func NewEmailSESService(cfg *config.Config) EmailService {
	awsCfg, err := awsconfig.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Printf("unable to load AWS SDK config, %v", err)
	}

	client := ses.NewFromConfig(awsCfg)

	defaultSender := os.Getenv("SENDER_EMAIL")
	if defaultSender == "" {
		log.Println("WARNING: SENDER_EMAIL is empty. Email sending may fail.")
	}

	return &emailSESService{
		client:        client,
		cfg:           cfg,
		defaultSender: defaultSender,
	}
}

func (s *emailSESService) Send(ctx context.Context, emailPayload dto.EmailPayload) error {
	sender := s.defaultSender
	if emailPayload.FromEmailAddress != nil {
		sender = *emailPayload.FromEmailAddress
	}

	input := &ses.SendEmailInput{
		Destination: &types.Destination{
			ToAddresses:  emailPayload.ToEmail,
			CcAddresses:  emailPayload.CcEmail,
			BccAddresses: emailPayload.BccEmail,
		},
		Message: &types.Message{
			Body: &types.Body{
				Html: &types.Content{
					Charset: aws.String("UTF-8"),
					Data:    aws.String(emailPayload.Content),
				},
			},
			Subject: &types.Content{
				Charset: aws.String("UTF-8"),
				Data:    aws.String(emailPayload.Subject),
			},
		},
		Source: aws.String(sender),
	}

	_, err := s.client.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}
