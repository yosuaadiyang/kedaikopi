.PHONY: help up down build fresh seed logs shell setup key

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

key: ## Generate APP_KEY
	docker compose run --rm backend php artisan key:generate --show

up: ## Start all services
	docker compose up -d

up-dev: ## Start with dev profile (includes phpMyAdmin)
	docker compose --profile dev up -d

down: ## Stop all services
	docker compose down

build: ## Rebuild containers
	docker compose build --no-cache

fresh: ## Fresh migrate + seed (WARNING: drops all data)
	docker compose exec backend php artisan migrate:fresh --seed --force

seed: ## Run seeders
	docker compose exec backend php artisan db:seed --force

migrate: ## Run pending migrations
	docker compose exec backend php artisan migrate --force

logs: ## View all logs
	docker compose logs -f

logs-backend: ## View backend logs
	docker compose logs -f backend

logs-mysql: ## View MySQL logs
	docker compose logs -f mysql

shell: ## Shell into backend
	docker compose exec backend sh

mysql: ## MySQL CLI
	@. ./.env && docker compose exec mysql mysql -u root -p"$$DB_ROOT_PASSWORD" "$$DB_DATABASE"

optimize: ## Optimize for production
	docker compose exec backend php artisan config:cache
	docker compose exec backend php artisan route:cache
	docker compose exec backend php artisan view:cache
	docker compose exec backend php artisan event:cache

cache-clear: ## Clear all caches
	docker compose exec backend php artisan cache:clear
	docker compose exec backend php artisan config:clear
	docker compose exec backend php artisan route:clear
	docker compose exec backend php artisan view:clear

status: ## Show service status
	docker compose ps

health: ## Check health endpoints
	@echo "Backend:" && curl -sf http://localhost:8000/api/health | python3 -m json.tool 2>/dev/null || echo "UNHEALTHY"
	@echo "\nFrontend:" && curl -sf -o /dev/null -w "%{http_code}" http://localhost/ && echo " OK" || echo "UNHEALTHY"

backup: ## Backup MySQL database
	@if [ -f .env ]; then \
		. ./.env && docker compose exec -T mysql mysqldump -u root -p"$$DB_ROOT_PASSWORD" "$$DB_DATABASE" | gzip > backup-$$(date +%Y%m%d-%H%M%S).sql.gz; \
		echo "Backup saved"; \
	else \
		echo "Error: .env file not found"; exit 1; \
	fi

setup: build up ## Full setup: build, start, wait, migrate, seed
	@echo "⏳ Waiting for services..."
	@sleep 15
	docker compose exec -T backend php artisan migrate --seed --force
	@echo ""
	@echo "✅ KedaiKopi ready!"
	@echo "Frontend: http://localhost"
	@echo "Backend:  http://localhost:8000"
	@echo "Admin:    admin@kedaikopi.id / Admin123!"
