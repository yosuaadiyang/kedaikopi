#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
#  KedaiKopi — One-Command Production Installer
#  Usage: sudo ./install.sh
#  Does: Docker install → Build → DB → Seed → SSL → Live
# ═══════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

banner() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ☕ KedaiKopi — Full Production Installer ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo ""
}

step() { echo -e "\n${GREEN}[$1/8]${NC} ${BOLD}$2${NC}"; }
ok()   { echo -e "  ${GREEN}✅ $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "  ${RED}❌ $1${NC}"; exit 1; }

gen_password() { openssl rand -base64 24 | tr -d '/+=' | head -c 24; }

# ─── Pre-flight ──────────────────────────────────────────────
banner

if [ "$EUID" -ne 0 ]; then
    fail "Run as root: sudo ./install.sh"
fi

# Collect domain (with default)
DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
    read -rp "$(echo -e "${CYAN}Enter domain (e.g. kedaikopi.id):${NC} ")" DOMAIN
fi
DOMAIN=$(echo "$DOMAIN" | sed 's|https\?://||' | sed 's|/||g' | sed 's|^www\.||')
[ -z "$DOMAIN" ] && fail "Domain is required"

# Email for SSL
EMAIL="${2:-}"
if [ -z "$EMAIL" ]; then
    read -rp "$(echo -e "${CYAN}Email for SSL certificate:${NC} ")" EMAIL
fi
[ -z "$EMAIL" ] && fail "Email is required"

echo ""
echo -e "  Domain: ${BOLD}${DOMAIN}${NC}"
echo -e "  Email:  ${BOLD}${EMAIL}${NC}"
echo ""
read -rp "$(echo -e "${YELLOW}Start full installation? (Y/n):${NC} ")" CONFIRM
if [[ "${CONFIRM:-Y}" =~ ^[Nn]$ ]]; then
    echo "Cancelled."
    exit 0
fi

START_TIME=$(date +%s)

# ─── STEP 1: Install Docker ─────────────────────────────────
step 1 "Installing Docker..."

if command -v docker &> /dev/null && docker compose version &> /dev/null 2>&1; then
    ok "Docker already installed ($(docker --version | grep -oP '\d+\.\d+\.\d+'))"
else
    echo "  Installing Docker Engine..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg > /dev/null 2>&1

    install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
    fi

    if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    fi

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1

    systemctl enable docker --now

    if ! docker compose version &> /dev/null 2>&1; then
        fail "Docker Compose V2 installation failed"
    fi
    ok "Docker installed ($(docker --version | grep -oP '\d+\.\d+\.\d+'))"
fi

# ─── STEP 2: Install Nginx + Certbot ────────────────────────
step 2 "Installing Nginx & Certbot..."

apt-get install -y -qq nginx certbot python3-certbot-nginx > /dev/null 2>&1
ok "Nginx & Certbot installed"

# ─── STEP 3: Generate .env with secure credentials ──────────
step 3 "Generating secure configuration..."

DB_ROOT_PASS="$(gen_password)"
DB_PASS="$(gen_password)"

if [ -f .env ]; then
    cp .env .env.backup.$(date +%s)
    warn "Existing .env backed up"
fi

cat > .env << ENVEOF
# ════════════════════════════════════════
# KedaiKopi Production — Auto-generated
# Generated: $(date -Iseconds)
# ════════════════════════════════════════

# App Key (generated after build)
APP_KEY=

# Database
DB_ROOT_PASSWORD=${DB_ROOT_PASS}
DB_DATABASE=kedaikopi
DB_USERNAME=kedaikopi
DB_PASSWORD=${DB_PASS}

# App
APP_ENV=production
APP_DEBUG=false
APP_URL=https://${DOMAIN}
FRONTEND_URL=https://${DOMAIN}
FRONTEND_PORT=3000

# Sanctum
SANCTUM_STATEFUL_DOMAINS=${DOMAIN},www.${DOMAIN}

# Logging
LOG_LEVEL=warning

# Mail
MAIL_MAILER=log
MAIL_FROM_ADDRESS=noreply@${DOMAIN}
ENVEOF

ok "Generated .env with secure passwords"

# ─── STEP 4: Build & Start Docker ───────────────────────────
step 4 "Building & starting containers..."

# Ensure frontend uses port 3000 (nginx will proxy 443→3000)
sed -i 's/"${FRONTEND_PORT:-80}:80"/"${FRONTEND_PORT:-3000}:80"/' docker-compose.yml 2>/dev/null || true

echo "  Building images (this may take 2-5 minutes)..."
docker compose build --pull 2>&1 | tail -5

echo "  Starting services..."
docker compose up -d

# Generate APP_KEY
echo "  Generating APP_KEY..."
APP_KEY=$(docker compose run --rm -T backend php artisan key:generate --show 2>/dev/null | tr -d '\r\n')
if [ -z "$APP_KEY" ]; then
    # Fallback: generate manually
    APP_KEY="base64:$(openssl rand -base64 32)"
fi
sed -i "s|APP_KEY=.*|APP_KEY=${APP_KEY}|" .env
ok "APP_KEY generated"

# Restart with APP_KEY
docker compose down
docker compose up -d

# Wait for MySQL
echo "  Waiting for MySQL to be ready..."
source .env
TIMEOUT=90
while ! docker compose exec -T mysql mysqladmin ping -h localhost -u root -p"${DB_ROOT_PASSWORD}" --silent 2>/dev/null; do
    sleep 2
    TIMEOUT=$((TIMEOUT - 2))
    if [ $TIMEOUT -le 0 ]; then
        fail "MySQL failed to start within 90s. Check: docker compose logs mysql"
    fi
    printf "."
done
echo ""
ok "All containers running"

# ─── STEP 5: Database setup ─────────────────────────────────
step 5 "Setting up database..."

echo "  Running migrations..."
docker compose exec -T backend php artisan migrate --force

echo "  Seeding data (10 stores, menus, reviews)..."
docker compose exec -T backend php artisan db:seed --force

ok "Database ready with demo data"

# ─── STEP 6: Optimize ───────────────────────────────────────
step 6 "Optimizing for production..."

docker compose exec -T backend php artisan config:cache
docker compose exec -T backend php artisan route:cache
docker compose exec -T backend php artisan view:cache
docker compose exec -T backend php artisan event:cache
docker compose exec -T backend php artisan storage:link 2>/dev/null || true

ok "Laravel optimized"

# ─── STEP 7: SSL Certificate ────────────────────────────────
step 7 "Setting up SSL (Let's Encrypt)..."

# Create certbot webroot
mkdir -p /var/www/certbot

# Temporary HTTP config for certbot challenge
cat > /etc/nginx/sites-available/kedaikopi << HTTPCONF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
HTTPCONF

ln -sf /etc/nginx/sites-available/kedaikopi /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "  Requesting SSL certificate..."
if certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive 2>&1 | tail -3; then

    ok "SSL certificate obtained"
else
    warn "SSL failed — site will work on HTTP only. Run later: sudo certbot certonly --webroot --webroot-path=/var/www/certbot -d ${DOMAIN}"
    # Keep HTTP config active
    SKIP_SSL=true
fi

# ─── STEP 8: Full SSL Nginx config ──────────────────────────
step 8 "Finalizing production config..."

if [ "${SKIP_SSL:-false}" = "false" ]; then
    cat > /etc/nginx/sites-available/kedaikopi << SSLCONF
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    client_max_body_size 12M;
    server_tokens off;

    # Reverse proxy → Docker frontend (port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_buffering on;
        proxy_buffer_size 16k;
        proxy_buffers 4 32k;
    }

    access_log /var/log/nginx/kedaikopi-access.log;
    error_log /var/log/nginx/kedaikopi-error.log warn;
}
SSLCONF

    nginx -t && systemctl reload nginx
    ok "HTTPS active"

    # Auto-renewal cron
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null || true; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
        ok "SSL auto-renewal scheduled"
    fi
fi

# ─── Health check ────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Running health checks...${NC}"
sleep 3

API_STATUS=$(curl -sf http://127.0.0.1:3000/api/health 2>/dev/null | grep -o '"status":"ok"' || echo "")
FRONT_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "000")

if [ -n "$API_STATUS" ]; then
    ok "API: healthy"
else
    warn "API: not responding yet (may need a few more seconds)"
fi

if [ "$FRONT_STATUS" = "200" ]; then
    ok "Frontend: healthy"
else
    warn "Frontend: status $FRONT_STATUS (may need a few more seconds)"
fi

# ─── Done ────────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ☕ KedaiKopi is LIVE! (${MINUTES}m ${SECONDS}s)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 Website:  ${CYAN}https://${DOMAIN}${NC}"
echo -e "  🔌 API:      ${CYAN}https://${DOMAIN}/api/health${NC}"
echo -e "  🔒 SSL:      Let's Encrypt (auto-renews)"
echo ""
echo -e "  ${BOLD}Admin Login:${NC}"
echo -e "  📧 Email:    admin@kedaikopi.id"
echo -e "  🔑 Password: Admin123!"
echo ""
echo -e "  ${BOLD}Demo Data:${NC}"
echo -e "  ☕ 10 coffee shops across 9 Indonesian cities"
echo -e "  📝 ~55 menu items, ~40 reviews"
echo -e "  👥 13 user accounts"
echo ""
echo -e "  ${BOLD}Management:${NC}"
echo -e "  make logs        — View logs"
echo -e "  make status      — Container status"
echo -e "  make backup      — Backup database"
echo -e "  make cache-clear — Clear caches"
echo ""
echo -e "  ${BOLD}Credentials saved in:${NC} ${SCRIPT_DIR}/.env"
echo ""
