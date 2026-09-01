# Chat App

Ứng dụng chat thời gian thực với Go Backend + Next.js Frontend.

## Tính năng
- ✅ Đăng ký / Đăng nhập bằng email & password (JWT)
- ✅ Tìm kiếm bạn bè, gửi lời mời kết bạn
- ✅ Cập nhật avatar và tên
- ✅ Chat 1-1 và chat nhóm
- ✅ Trạng thái Online/Offline (Redis)
- ✅ Real-time qua WebSocket
- ✅ Gửi hình ảnh, file (mở rộng sau)
- 🔜 Video call, ghi âm (sẽ thêm sau)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Go 1.25, Gin, gorilla/websocket |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (access + refresh token) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| State | Zustand |
| Containerization | Docker Compose |

## Cài đặt nhanh

### Chạy bằng Docker Compose (Khuyến nghị)
```bash
# Khởi động toàn bộ stack
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng
docker-compose down
```

Truy cập:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api

---

### Chạy local (Development)

**Yêu cầu:** Go 1.25+, Node.js 18+, PostgreSQL, Redis

#### 1. Khởi động PostgreSQL và Redis
```bash
# Chỉ chạy DB bằng Docker
docker-compose up -d postgres redis
```

#### 2. Backend
```bash
cd backend

# Copy env
cp .env.example .env

# Tải dependencies
go mod download

# Chạy server
go run cmd/server/main.go
```
Backend sẽ tự động tạo tables trong DB khi khởi động.

#### 3. Frontend
```bash
cd frontend

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

---

## Cấu trúc project

```
Chat/
├── backend/
│   ├── cmd/server/main.go          # Entry point
│   ├── internal/
│   │   ├── config/                 # Config từ env
│   │   ├── database/               # PostgreSQL + Redis connections
│   │   ├── handlers/               # HTTP handlers
│   │   ├── middleware/             # JWT auth middleware
│   │   ├── models/                 # Data models
│   │   ├── router/                 # Route definitions
│   │   └── websocket/              # WebSocket hub
│   ├── migrations/                 # SQL migrations
│   ├── uploads/                    # User uploaded files
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   ├── components/             # React components
│   │   ├── hooks/                  # Custom hooks
│   │   ├── lib/                    # Utilities & API client
│   │   ├── store/                  # Zustand stores
│   │   └── types/                  # TypeScript types
│   └── Dockerfile
└── docker-compose.yml
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Đăng xuất |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Lấy thông tin bản thân |
| PUT | `/api/users/me` | Cập nhật tên |
| PUT | `/api/users/me/avatar` | Upload avatar |
| GET | `/api/users/search?email=` | Tìm user |

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends` | Danh sách bạn bè |
| POST | `/api/friends/request` | Gửi lời mời |
| GET | `/api/friends/requests` | Lời mời đang chờ |
| PUT | `/api/friends/requests/:id/accept` | Chấp nhận |
| PUT | `/api/friends/requests/:id/reject` | Từ chối |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | Danh sách cuộc trò chuyện |
| POST | `/api/conversations` | Tạo cuộc trò chuyện |
| GET | `/api/conversations/:id/messages` | Lấy tin nhắn |
| POST | `/api/conversations/:id/members` | Thêm thành viên |

### WebSocket
```
WS /ws?token=<jwt_access_token>
```

**Message format gửi đi:**
```json
{"type": "message", "conversation_id": "...", "content": "Hello!", "message_type": "text"}
{"type": "typing", "conversation_id": "..."}
{"type": "read", "conversation_id": "...", "message_id": "..."}
```

**Message format nhận về:**
```json
{"type": "message", "message": {...}}
{"type": "typing", "conversation_id": "...", "user_id": "..."}
{"type": "online", "user_id": "..."}
{"type": "offline", "user_id": "..."}
```
