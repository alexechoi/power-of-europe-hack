# Makefile for Power of Europe Hack Docker Setup

.PHONY: help build up down logs shell clean

# Default target
help: ## Show this help message
	@echo "Power of Europe Hack - Docker Commands"
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development commands
up: ## Start all services in development mode
	docker-compose up -d

down: ## Stop all services
	docker-compose down

build: ## Build all Docker images
	docker-compose build

rebuild: ## Rebuild all images and start services
	docker-compose up --build -d

restart: ## Restart all services
	docker-compose restart

# Logs
logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

logs-db: ## View database logs
	docker-compose logs -f postgres

# Status and health
status: ## Show status of all services
	docker-compose ps

health: ## Check health of all services
	@echo "Checking service health..."
	@docker-compose exec backend curl -f http://localhost:8000/health || echo "Backend unhealthy"
	@curl -f http://localhost:3000 || echo "Frontend unreachable"
	@docker-compose exec postgres pg_isready -U postgres || echo "Database unhealthy"

# Development helpers
shell-backend: ## Open shell in backend container
	docker-compose exec backend bash

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

shell-db: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d power_of_europe

# Database operations
db-backup: ## Backup database to backup.sql
	docker-compose exec postgres pg_dump -U postgres power_of_europe > backup.sql
	@echo "Database backed up to backup.sql"

db-restore: ## Restore database from backup.sql
	@test -f backup.sql || (echo "backup.sql not found" && exit 1)
	docker-compose exec -T postgres psql -U postgres power_of_europe < backup.sql
	@echo "Database restored from backup.sql"

# Clean up
clean: ## Remove all containers, volumes, and images
	docker-compose down -v
	docker system prune -a -f

clean-volumes: ## Remove all volumes (⚠️  This will delete database data)
	docker-compose down -v

# Production commands
prod-up: ## Start all services in production mode
	docker-compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production services
	docker-compose -f docker-compose.prod.yml down

prod-build: ## Build production images
	docker-compose -f docker-compose.prod.yml build

prod-logs: ## View production logs
	docker-compose -f docker-compose.prod.yml logs -f

# Setup commands
setup: ## Initial setup - create .env from example
	@if [ ! -f .env ]; then \
		echo "Creating .env file from .env.example..."; \
		echo "# Copy this content to .env and add your actual API keys" > .env; \
		echo "" >> .env; \
		echo "# API Keys (Required for AI functionality)" >> .env; \
		echo "MISTRAL_API_KEY=your_mistral_api_key_here" >> .env; \
		echo "OPENAI_API_KEY=your_openai_api_key_here" >> .env; \
		echo "" >> .env; \
		echo "# Database Configuration" >> .env; \
		echo "POSTGRES_PASSWORD=postgres_password" >> .env; \
		echo "" >> .env; \
		echo "# Nhost Configuration" >> .env; \
		echo "NEXT_PUBLIC_NHOST_SUBDOMAIN=local" >> .env; \
		echo "NEXT_PUBLIC_NHOST_REGION=local" >> .env; \
		echo "NHOST_ADMIN_SECRET=nhost-admin-secret" >> .env; \
		echo "NHOST_WEBHOOK_SECRET=nhost-webhook-secret" >> .env; \
		echo "NHOST_JWT_SECRET=0f987876650b4a085e64594fae9219e7781b17506bec02489ad061fba8cb22db" >> .env; \
		echo "" >> .env; \
		echo "# Frontend Configuration" >> .env; \
		echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" >> .env; \
		echo ".env file created! Please edit it and add your API keys."; \
	else \
		echo ".env file already exists"; \
	fi

dev: setup up ## Complete development setup (create .env and start services)

# Utility commands
update: ## Pull latest images and restart services
	docker-compose pull
	docker-compose up -d

install-deps: ## Install dependencies in containers
	docker-compose exec backend pip install -r requirements.txt
	docker-compose exec frontend npm install 