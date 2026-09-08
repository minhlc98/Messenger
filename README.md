# 💬 Chat App

A real-time chat application built with **Go** backend and **Next.js** frontend, featuring WebSocket-powered messaging, friend management, group conversations, and OTP-based email verification.

---

## ✨ Features

| Status | Feature |
|--------|---------|
| ✅ | Register / Login with email & password (JWT) |
| ✅ | OTP email verification on registration |
| ✅ | Search users, send & manage friend requests |
| ✅ | Update display name and avatar |
| ✅ | 1-on-1 and group conversations |
| ✅ | Online / Offline presence tracking (Redis) |
| ✅ | Real-time messaging via WebSocket |
| ✅ | File & image uploads in chat |
| ✅ | Rate limiting by IP and JWT token |
| 🔜 | Video calls & voice recording |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Go 1.25, Gin, gorilla/websocket, GORM |
| **Database** | PostgreSQL 16 |
| **Cache / Presence** | Redis 7 |
| **Auth** | JWT (access + refresh token), OTP via AWS SES |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **State Management** | Zustand |
| **Form Handling** | React Hook Form + Zod |
| **Containerization** | Docker Compose |

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start the full stack
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Access the app:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api

---

### Option 2: Local Development

**Prerequisites:** Go 1.25+, Node.js 18+, PostgreSQL 16, Redis 7

#### 1. Start PostgreSQL and Redis

```bash
# Run only the databases via Docker
docker-compose up -d postgres redis
```

#### 2. Backend

```bash
cd backend

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your DB credentials, JWT secrets, etc.

# Download dependencies
go mod download

# Start the backend server (auto-runs DB migrations)
go run cmd/server/main.go
```

#### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

---

## ⚙️ Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

```env
TZ=Asia/Ho_Chi_Minh
PORT=4000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=chatapp
DB_SSL_MODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# File Uploads
UPLOAD_DIR=./uploads

# Rate Limiting (requests per minute)
RATE_LIMIT_BY_IP=5
RATE_LIMIT_BY_TOKEN=5
```

---

## 📁 Project Structure

```
Chat/
├── backend/
│   ├── cmd/server/main.go          # Entry point
│   ├── internal/
│   │   ├── config/                 # Environment config loader
│   │   ├── constants/              # Shared constants
│   │   ├── database/               # PostgreSQL & Redis connections
│   │   ├── dto/                    # Request/Response data transfer objects
│   │   ├── handlers/               # HTTP request handlers (Gin)
│   │   ├── middleware/             # JWT auth & rate-limit middleware
│   │   ├── models/                 # GORM data models
│   │   ├── paginations/            # Pagination helpers
│   │   ├── repositories/           # Database access layer
│   │   ├── router/                 # Route definitions
│   │   ├── services/               # Business logic layer
│   │   ├── templates/              # Email HTML templates
│   │   └── websocket/              # WebSocket hub & client management
│   ├── migrations/                 # SQL migration files
│   ├── scripts/                    # Utility scripts
│   ├── uploads/                    # User-uploaded files (runtime)
│   ├── .env.example                # Environment variable template
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router (pages & layouts)
│   │   ├── components/             # Reusable React components
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── lib/                    # Utilities & Axios API client
│   │   ├── store/                  # Zustand global state stores
│   │   └── types/                  # TypeScript type definitions
│   └── Dockerfile
├── docker-compose.yml              # Production compose config
├── docker-compose.dev.yml          # Development compose config
└── README.md
```

---

## 📡 API Reference

All protected endpoints require the `Authorization: Bearer <access_token>` header.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register a new account |
| POST | `/api/auth/login` | ❌ | Login and receive tokens |
| POST | `/api/auth/refresh` | ❌ | Refresh the access token |
| POST | `/api/auth/verify-otp` | ❌ | Verify OTP after registration |
| POST | `/api/auth/resend-registration-otp` | ❌ | Resend registration OTP |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/me` | ✅ | Get current user profile |
| PUT | `/api/users/me` | ✅ | Update display name |
| PUT | `/api/users/me/avatar` | ✅ | Upload profile avatar |
| GET | `/api/users/search?email=` | ✅ | Search users by email |
| GET | `/api/users/:id` | ✅ | Get user profile by ID |

### Friends

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/friends` | ✅ | List all friends |
| POST | `/api/friends/request` | ✅ | Send a friend request |
| GET | `/api/friends/requests` | ✅ | List pending friend requests |
| PUT | `/api/friends/requests/:id/accept` | ✅ | Accept a friend request |
| PUT | `/api/friends/requests/:id/reject` | ✅ | Reject a friend request |

### Conversations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/conversations` | ✅ | List all conversations |
| POST | `/api/conversations` | ✅ | Create a new conversation |
| GET | `/api/conversations/:id` | ✅ | Get conversation details |
| GET | `/api/conversations/:id/messages` | ✅ | Get paginated messages |
| POST | `/api/conversations/:id/members` | ✅ | Add members to a group |
| POST | `/api/conversations/:id/upload` | ✅ | Upload a file to a conversation |

---

## 🔌 WebSocket

Connect using the JWT access token as a query parameter:

```
WS /ws?token=<jwt_access_token>
```

### Sending Events (Client → Server)

```json
// Send a chat message
{ "type": "message", "conversation_id": "uuid", "content": "Hello!", "message_type": "text" }

// Indicate typing
{ "type": "typing", "conversation_id": "uuid" }

// Mark message as read
{ "type": "read", "conversation_id": "uuid", "message_id": "uuid" }
```

### Receiving Events (Server → Client)

```json
// New message received
{ "type": "message", "message": { ...messageObject } }

// Another user is typing
{ "type": "typing", "conversation_id": "uuid", "user_id": "uuid" }

// User came online
{ "type": "online", "user_id": "uuid" }

// User went offline
{ "type": "offline", "user_id": "uuid" }
```

---

## 🗄️ Data Models

| Model | Description |
|-------|-------------|
| `User` | Account info: email, hashed password, display name, avatar |
| `Friendship` | Friend relationships and request statuses |
| `Conversation` | 1-on-1 or group chat container |
| `ConversationMember` | Membership / participant records |
| `Message` | Individual chat messages with type (text / file / image) |
| `OTP` | One-time passwords for email verification |

---

## 📜 License

This project is open source. Feel free to use and modify it.
