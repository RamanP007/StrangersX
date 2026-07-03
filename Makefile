.PHONY: up down logs build dev-build restart shell-be shell-fe shell-mongo shell-redis prod dev setup

PROD_COMPOSE = docker compose -f docker-compose.yml
DEV_COMPOSE  = docker compose -f docker-compose.yml -f docker-compose.override.yml

# ── Build ──────────────────────────────────────────────────────────────────────
build:
	$(PROD_COMPOSE) build

dev-build:
	$(DEV_COMPOSE) build

# ── Run ───────────────────────────────────────────────────────────────────────
prod:
	$(PROD_COMPOSE) up -d

dev:
	$(DEV_COMPOSE) up -d

# `make up` = local dev (hot-reload). Use `make prod` for production images.
up: dev

# ── Common ────────────────────────────────────────────────────────────────────
down:
	$(PROD_COMPOSE) down

logs:
	$(PROD_COMPOSE) logs -f

restart:
	$(PROD_COMPOSE) restart

# ── Shell access ──────────────────────────────────────────────────────────────
shell-be:
	$(PROD_COMPOSE) exec backend sh

shell-fe:
	$(PROD_COMPOSE) exec frontend sh

shell-mongo:
	$(PROD_COMPOSE) exec mongo mongosh omegle

shell-redis:
	$(PROD_COMPOSE) exec redis redis-cli

# ── Setup (one-time) ──────────────────────────────────────────────────────────
setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env — fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, NEXTAUTH_SECRET"; \
	fi
	$(PROD_COMPOSE) build
	$(PROD_COMPOSE) up -d
	@echo ""
	@echo "App:  http://localhost:3000"
	@echo "API:  http://localhost:8080"
