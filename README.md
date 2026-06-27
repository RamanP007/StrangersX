# StrangerX — Anonymous 18+ Chat Platform

Full-stack Omegle-like web app. Next.js frontend, Go backend, MongoDB, Redis, Socket.IO.

## Quick Start (Docker)

```bash
# 1. Clone and enter
git clone <repo> && cd omegle

# 2. Configure secrets
cp .env.example .env
# Edit .env — fill GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, NEXTAUTH_SECRET

# 3. Build & run everything
make setup        # copies .env.example → .env (if missing), builds, starts

# Or step by step:
make build
make up
make logs
```

**App:** http://localhost:3000  
**API:** http://localhost:8080/health

## Development (hot reload)

The default `docker-compose.override.yml` enables hot reload for both services:

```bash
make dev          # starts with hot reload (docker-compose.override.yml applied automatically)
```

## Useful commands

```bash
make shell-be     # shell into Go backend
make shell-fe     # shell into Next.js frontend
make shell-mongo  # mongosh into omegle db
make shell-redis  # redis-cli
make down         # stop all services
make restart      # restart all services
```

## Architecture

| Service  | Stack | Port |
|----------|-------|------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | 3000 |
| Backend  | Go + Gin + Socket.IO | 8080 |
| Database | MongoDB 7 | 27017 (internal) |
| Cache    | Redis 7 | 6379 (internal) |

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Web application)
3. Add `http://localhost:3000` to Authorised JavaScript origins
4. Add `http://localhost:3000/api/auth/callback/google` to Authorised redirect URIs
5. Copy Client ID and Secret into `.env`
