.PHONY: help dev-up dev-down dev-logs dev-build prod-up prod-down prod-logs clean backup restore

# Default target
help:
	@echo "Study Institute - Docker Commands"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev-up       - Start development environment"
	@echo "  make dev-down     - Stop development environment"
	@echo "  make dev-logs     - View development logs"
	@echo "  make dev-build    - Rebuild development containers"
	@echo "  make dev-restart  - Restart development environment"
	@echo ""
	@echo "Production Commands:"
	@echo "  make prod-up      - Start production environment"
	@echo "  make prod-down    - Stop production environment"
	@echo "  make prod-logs    - View production logs"
	@echo "  make prod-build   - Rebuild production containers"
	@echo ""
	@echo "Database Commands:"
	@echo "  make migrate      - Run database migrations"
	@echo "  make seed         - Seed database with initial data"
	@echo "  make backup       - Backup database"
	@echo "  make restore      - Restore database from backup"
	@echo ""
	@echo "Maintenance Commands:"
	@echo "  make clean        - Remove all containers, volumes, and images"
	@echo "  make prune        - Clean up unused Docker resources"
	@echo "  make health       - Check health of all services"
	@echo ""

# Development Commands
dev-up:
	@echo "Starting development environment..."
	docker-compose up -d
	@echo "Services started! Frontend: http://localhost:3000, Backend: http://localhost:3001"

dev-down:
	@echo "Stopping development environment..."
	docker-compose down

dev-logs:
	docker-compose logs -f

dev-build:
	@echo "Rebuilding development containers..."
	docker-compose up -d --build

dev-restart:
	@echo "Restarting development environment..."
	docker-compose restart

# Production Commands
prod-up:
	@echo "Starting production environment..."
	@if [ ! -f .env.production ]; then \
		echo "Error: .env.production file not found!"; \
		echo "Please copy .env.production.example to .env.production and configure it."; \
		exit 1; \
	fi
	docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
	@echo "Production services started!"

prod-down:
	@echo "Stopping production environment..."
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

prod-build:
	@echo "Rebuilding production containers..."
	docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Database Commands
migrate:
	@echo "Running database migrations..."
	docker-compose exec backend npx prisma migrate deploy

migrate-dev:
	@echo "Running development database migrations..."
	docker-compose exec backend npx prisma migrate dev

seed:
	@echo "Seeding database..."
	docker-compose exec backend npx prisma db seed

studio:
	@echo "Opening Prisma Studio..."
	docker-compose exec backend npx prisma studio

backup:
	@echo "Creating database backup..."
	@mkdir -p backups
	docker-compose exec postgres pg_dump -U postgres study_institute > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created in backups/ directory"

restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Error: Please specify backup file. Usage: make restore FILE=backups/backup_XXXXXX.sql"; \
		exit 1; \
	fi
	@echo "Restoring database from $(FILE)..."
	cat $(FILE) | docker-compose exec -T postgres psql -U postgres study_institute

# Maintenance Commands
clean:
	@echo "WARNING: This will remove all containers, volumes, and images!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v --rmi all; \
		docker-compose -f docker-compose.prod.yml down -v --rmi all; \
		echo "Cleanup complete!"; \
	fi

prune:
	@echo "Cleaning up unused Docker resources..."
	docker system prune -a --volumes

health:
	@echo "Checking service health..."
	@docker-compose ps
	@echo ""
	@echo "Backend health:"
	@curl -s http://localhost:3001/health || echo "Backend not responding"
	@echo ""
	@echo "Frontend health:"
	@curl -s http://localhost:3000 > /dev/null && echo "Frontend is healthy" || echo "Frontend not responding"

# Shell access
shell-backend:
	docker-compose exec backend sh

shell-frontend:
	docker-compose exec frontend sh

shell-db:
	docker-compose exec postgres psql -U postgres study_institute

# Nginx commands
nginx-up:
	@echo "Starting production with Nginx..."
	docker-compose -f docker-compose.prod.yml --env-file .env.production --profile with-nginx up -d

nginx-reload:
	docker-compose exec nginx nginx -s reload

nginx-test:
	docker-compose exec nginx nginx -t

