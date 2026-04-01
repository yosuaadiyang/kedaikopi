#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 KedaiKopi Deployment Script${NC}"
echo "==============================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Install Docker first.${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose V2 not found.${NC}"
    exit 1
fi

# Setup .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}📝 Created .env from .env.example${NC}"
    echo ""
    echo -e "${RED}⚠️  REQUIRED: Edit .env before continuing:${NC}"
    echo "  1. Set APP_KEY (generate with: docker compose run --rm backend php artisan key:generate --show)"
    echo "  2. Set DB_ROOT_PASSWORD and DB_PASSWORD (strong, unique passwords)"
    echo "  3. Set APP_URL and FRONTEND_URL to your domain"
    echo "  4. Configure SANCTUM_STATEFUL_DOMAINS"
    echo ""
    echo "Then re-run: ./deploy.sh"
    exit 0
fi

# Validate required env vars
source .env
for var in APP_KEY DB_ROOT_PASSWORD DB_PASSWORD; do
    if [ -z "${!var:-}" ] || [ "${!var}" = "CHANGE_ME_ROOT_PASSWORD_2024" ] || [ "${!var}" = "CHANGE_ME_DB_PASSWORD_2024" ]; then
        echo -e "${RED}❌ $var is not set or is using default value. Edit .env first.${NC}"
        exit 1
    fi
done

# Build
echo -e "${GREEN}🔨 Building containers...${NC}"
docker compose build --pull

echo -e "${GREEN}🚀 Starting services...${NC}"
docker compose up -d

echo -e "${YELLOW}⏳ Waiting for MySQL...${NC}"
timeout=60
while ! docker compose exec -T mysql mysqladmin ping -h localhost -u root -p"${DB_ROOT_PASSWORD}" --silent 2>/dev/null; do
    sleep 2
    timeout=$((timeout - 2))
    if [ $timeout -le 0 ]; then
        echo -e "${RED}❌ MySQL failed to start.${NC}"
        docker compose logs mysql
        exit 1
    fi
done
echo -e "${GREEN}✅ MySQL ready${NC}"

echo -e "${GREEN}📦 Running migrations...${NC}"
docker compose exec -T backend php artisan migrate --force

echo -e "${GREEN}⚡ Optimizing...${NC}"
docker compose exec -T backend php artisan config:cache
docker compose exec -T backend php artisan route:cache
docker compose exec -T backend php artisan view:cache
docker compose exec -T backend php artisan event:cache

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "🌐 Frontend: ${APP_URL:-http://localhost}"
echo -e "🔌 API:      ${APP_URL:-http://localhost}:8000/api"
echo -e "📊 Health:   ${APP_URL:-http://localhost}:8000/api/health"
echo ""
echo -e "${YELLOW}Note: Database auto-migrates & seeds on first start.${NC}"
echo "Default admin: admin@kedaikopi.id / Admin123!"
echo ""
echo -e "${YELLOW}Manual seed (re-seed):${NC}"
echo "  docker compose exec backend php artisan db:seed --force"
echo ""
echo -e "${YELLOW}Setup SSL (required for production):${NC}"
echo "  sudo ./setup-ssl.sh kedaikopi.id"
echo ""
echo -e "${YELLOW}Or run one-command full install:${NC}"
echo "  sudo ./install.sh kedaikopi.id"
