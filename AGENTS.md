# AGENTS.md — AI Agent Guidelines for Chat App

This document provides guidelines for AI coding agents (e.g., Antigravity, Copilot, Cursor) working on this repository.

---

## Project Overview

A full-stack real-time chat application:
- **Backend**: Go 1.25, Gin, GORM, gorilla/websocket
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Zustand
- **Infrastructure**: PostgreSQL 16, Redis 7, Docker Compose

---

## Repository Layout

```
Chat/
├── backend/                    # Go backend service
│   ├── cmd/server/main.go      # Entry point
│   └── internal/
│       ├── config/             # Env-based configuration
│       ├── constants/          # Shared constants
│       ├── database/           # DB and Redis connection setup
│       ├── dto/                # Request & response structs
│       ├── handlers/           # Gin HTTP handlers
│       ├── middleware/         # Auth (JWT) and rate-limit middleware
│       ├── models/             # GORM models
│       ├── paginations/        # Pagination structs and logic
│       ├── repositories/       # Data access layer (interfaces + impls)
│       ├── router/             # Route wiring
│       ├── services/           # Business logic (interfaces + impls)
│       ├── templates/          # HTML email templates
│       └── websocket/          # WS hub, client pool, event dispatch
└── frontend/                   # Next.js frontend
    └── src/
        ├── app/                # App Router pages and layouts
        ├── components/         # Shared UI components
        ├── hooks/              # Custom React hooks
        ├── lib/                # Axios client, helpers
        ├── store/              # Zustand stores
        └── types/              # TypeScript types
```

---

## Architecture & Patterns

### Backend (Go)

The backend follows a **layered architecture**:

```
Handler → Service → Repository → Database
```

- **Handlers** (`internal/handlers/`): Thin HTTP layer. Parse requests via DTOs, delegate to services, return JSON.
- **Services** (`internal/services/`): Business logic, always defined as Go interfaces. New implementations must satisfy the interface.
- **Repositories** (`internal/repositories/`): DB queries via GORM. Also defined as interfaces for testability.
- **Models** (`internal/models/`): GORM structs with UUIDs as primary keys.
- **DTOs** (`internal/dto/`): Separate structs for requests and responses — never expose models directly.

### Frontend (Next.js)

- Uses the **App Router** (`src/app/`).
- Global state lives in **Zustand stores** (`src/store/`).
- API calls go through the centralised Axios client in `src/lib/`.
- Forms use **React Hook Form** + **Zod** validation.

---

## Coding Conventions

### Go

- All service and repository types **must be interfaces** — place the interface in the same file as its implementation.
- Use `context.Context` as the first parameter for all service and repository methods.
- Prefer **named return errors** only when they improve readability; otherwise return `error` directly.
- Follow standard Go project layout; do not add top-level packages without discussion.
- GORM auto-migration runs at startup — keep model struct tags correct.
- Validate request bodies using `c.ShouldBindJSON` and the `validate` struct tags.

### TypeScript / Next.js

- All components must be typed; avoid `any`.
- Use Tailwind utility classes for styling.
- Fetch data inside Server Components where possible; use client hooks only when interactivity is required.
- New Zustand stores should follow the existing pattern: define a typed interface then `create<State>(...)`.

---

## Environment & Configuration

| Variable | Purpose |
|----------|---------|
| `PORT` | Backend HTTP port |
| `DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME` | PostgreSQL connection |
| `REDIS_HOST / REDIS_PORT` | Redis connection |
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `UPLOAD_DIR` | Directory for uploaded files |
| `RATE_LIMIT_BY_IP` | Max requests per minute per IP (auth routes) |
| `RATE_LIMIT_BY_TOKEN` | Max requests per minute per JWT token |

Copy `backend/.env.example` → `backend/.env` before running locally.

---

## Running the Project

```bash
# Full stack (Docker)
docker-compose up -d

# Backend only (local)
cd backend && go run cmd/server/main.go

# Frontend only (local)
cd frontend && npm run dev
```

---

## Key API Surface

| Category | Prefix | Auth Required |
|----------|--------|---------------|
| Auth | `/api/auth/` | ❌ (public) |
| Users | `/api/users/` | ✅ JWT Bearer |
| Friends | `/api/friends/` | ✅ JWT Bearer |
| Conversations | `/api/conversations/` | ✅ JWT Bearer |
| WebSocket | `/ws?token=` | ✅ Token param |
| Static files | `/uploads/` | ❌ |

---

## WebSocket Protocol

Events sent by the client and received from the server use a JSON envelope:

```json
{ "type": "<event>", ...payload }
```

Supported event types: `message`, `typing`, `read`, `online`, `offline`.

---

## Testing Guidelines

- Unit tests live next to the file they test (`*_test.go`).
- Use interface mocking (hand-rolled or with `mockery`) for service/repository dependencies.
- Integration tests that need a real DB should use a dedicated test schema, not the development DB.
- Frontend: use Jest + React Testing Library for component tests.

---

## What to Avoid

- **Do not** expose GORM model structs directly in API responses — use DTOs.
- **Do not** commit secrets or real `.env` files.
- **Do not** skip rate-limit middleware on auth endpoints.
- **Do not** store uploaded file paths with the server-absolute path — use relative paths served under `/uploads/`.
- **Do not** add business logic inside HTTP handlers.
