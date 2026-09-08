# CLAUDE.md — Claude AI Guidelines for Chat App

This file gives Claude (and similar LLM assistants) the context needed to work effectively in this repository.

---

## What This Project Is

A real-time full-stack chat application with:

| Layer | Stack |
|-------|-------|
| Backend | Go 1.25 · Gin · GORM · gorilla/websocket |
| Database | PostgreSQL 16 |
| Cache / Presence | Redis 7 |
| Auth | JWT (access + refresh) · OTP via AWS SES |
| Frontend | Next.js 14 · TypeScript · Tailwind CSS · Zustand |
| Infra | Docker Compose |

---

## Directory Map

```
Chat/
├── backend/
│   ├── cmd/server/main.go        # main() — wires DB, Redis, router, WebSocket hub
│   └── internal/
│       ├── config/               # Loads .env into a typed Config struct
│       ├── constants/            # App-wide constants
│       ├── database/             # postgres.go, redis.go — connection helpers
│       ├── dto/                  # Input/output structs (never expose models directly)
│       ├── handlers/             # auth.go, user.go, friend.go, chat.go, ws.go
│       ├── middleware/           # auth_middleware.go, rate_limit_middleware.go
│       ├── models/               # user.go, friendship.go, conversation.go, message.go, otp.go
│       ├── paginations/          # Pagination request/response structs
│       ├── repositories/         # Interfaces + GORM implementations
│       ├── router/               # router.go — all route + middleware wiring
│       ├── services/             # Interfaces + business logic implementations
│       ├── templates/            # HTML email templates (OTP)
│       └── websocket/            # hub.go, client.go — broadcast and presence
└── frontend/
    └── src/
        ├── app/                  # Next.js App Router pages and layouts
        ├── components/           # Reusable UI components
        ├── hooks/                # Custom React hooks (useWebSocket, etc.)
        ├── lib/                  # api.ts (Axios client), helpers
        ├── store/                # Zustand stores (auth, chat, friends)
        └── types/                # Shared TypeScript interfaces
```

---

## Architectural Rules (Important for Claude)

### Backend

1. **Layered architecture**: `Handler → Service → Repository → DB`. Business logic belongs only in services.
2. **Interfaces first**: Every service and repository is defined as a Go interface. When adding a new service, define the interface before the struct.
3. **DTOs are mandatory**: HTTP handlers must use `dto.*` structs for request binding and response serialisation — never return raw GORM models.
4. **Context everywhere**: All service and repository method signatures start with `ctx context.Context`.
5. **UUID primary keys**: All models use `github.com/google/uuid` for IDs.
6. **Auto-migration**: GORM auto-migrates on startup. Keep struct tags (`gorm:"..."`) accurate.
7. **Rate limiting**: Auth routes are rate-limited by IP; protected routes are rate-limited by JWT token. Do not bypass this in new routes.

### Frontend

1. **App Router only** — no `pages/` directory.
2. **Zustand for global state** — local component state for UI-only state.
3. **Centralised API client** — all HTTP calls go through `src/lib/api.ts` (Axios instance).
4. **Zod + React Hook Form** — validate all forms; do not use uncontrolled inputs without validation.
5. **TypeScript strict** — no `any`; define types in `src/types/`.

---

## Environment Variables Reference

```env
# Backend (.env)
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USER=<pg_user>
DB_PASSWORD=<pg_password>
DB_NAME=chatapp
DB_SSL_MODE=disable
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
UPLOAD_DIR=./uploads
RATE_LIMIT_BY_IP=5
RATE_LIMIT_BY_TOKEN=5

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

---

## Common Tasks & How to Do Them

### Add a new API endpoint

1. Add a DTO struct in `internal/dto/`.
2. Add the method to the **service interface** in `internal/services/`.
3. Implement the method on the concrete struct.
4. Add the handler method in `internal/handlers/`.
5. Wire the route in `internal/router/router.go`.

### Add a new WebSocket event type

1. Define the event type constant in `internal/constants/`.
2. Handle it in the WebSocket hub (`internal/websocket/hub.go`).
3. Broadcast or route it to the appropriate clients.

### Add a new frontend page

1. Create a folder under `src/app/<route>/`.
2. Add `page.tsx` (Server Component by default).
3. Use `src/lib/api.ts` for data fetching.
4. If the page needs real-time updates, add a client component that uses the WebSocket hook.

---

## API Quick Reference

### Auth (public)
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/verify-otp
POST /api/auth/resend-registration-otp
```

### Protected (requires `Authorization: Bearer <token>`)
```
GET/PUT  /api/users/me
PUT      /api/users/me/avatar
GET      /api/users/search?email=
GET      /api/users/:id

GET      /api/friends
POST     /api/friends/request
GET      /api/friends/requests
PUT      /api/friends/requests/:id/accept
PUT      /api/friends/requests/:id/reject

GET      /api/conversations
POST     /api/conversations
GET      /api/conversations/:id
GET      /api/conversations/:id/messages
POST     /api/conversations/:id/members
POST     /api/conversations/:id/upload
```

### WebSocket
```
WS /ws?token=<jwt_access_token>
```

---

## WebSocket Message Schema

```typescript
// Client → Server
type SendEvent =
  | { type: "message"; conversation_id: string; content: string; message_type: "text" | "image" | "file" }
  | { type: "typing";  conversation_id: string }
  | { type: "read";   conversation_id: string; message_id: string }

// Server → Client
type ReceiveEvent =
  | { type: "message"; message: Message }
  | { type: "typing";  conversation_id: string; user_id: string }
  | { type: "online";  user_id: string }
  | { type: "offline"; user_id: string }
```

---

## Running Locally

```bash
# Start PostgreSQL + Redis via Docker
docker-compose up -d postgres redis

# Backend
cd backend
cp .env.example .env   # then fill in secrets
go run cmd/server/main.go

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Or run everything at once:

```bash
docker-compose up -d
```

---

## Things Claude Should Never Do

- Expose GORM model structs directly in HTTP responses.
- Add logic directly in handler functions — delegate to services.
- Skip `context.Context` in service/repository signatures.
- Commit or suggest committing actual secrets.
- Use `any` types in TypeScript files.
- Create new routes without wiring through `internal/router/router.go`.
- Call the database directly from a handler — always go through the repository layer.
