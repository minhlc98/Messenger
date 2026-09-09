package services

import (
	"chat-app/internal/config"
	"context"
	"fmt"
	"io"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type StorageService interface {
	Upload(ctx context.Context, filename string, contentType string, file io.Reader) (string, error)
}

type storageService struct {
	bucket string
	client *s3.Client
	cfg    *config.Config
}

func NewStorageService(cfg *config.Config) StorageService {
	ctx := context.Background()
	awsCfg, err := awsConfig.LoadDefaultConfig(ctx,
		awsConfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.R2AccessKey, cfg.R2SecretKey, "")),
		awsConfig.WithRegion("auto"),
	)
	if err != nil {
		log.Panicf("Failed to load R2 configuration: %v", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.R2AccountID))
	})

	return &storageService{
		bucket: cfg.R2Bucket,
		client: client,
		cfg:    cfg,
	}
}

func (s *storageService) Upload(ctx context.Context, filename string, contentType string, file io.Reader) (string, error) {
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(filename),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		log.Println("Fail to upload file to R2: ", err)
		return "", err
	}
	return fmt.Sprintf("%s/%s", s.cfg.R2PublicURL, filename), nil
}
