#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}🔒 KedaiKopi SSL Setup${NC}"
echo "======================"
echo ""

# ─── Check root ───
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Run as root: sudo ./setup-ssl.sh${NC}"
    exit 1
fi

# ─── Get domain ───
if [ -z "${1:-}" ]; then
    read -rp "Enter your domain (e.g. kedaikopi.id): " DOMAIN
else
    DOMAIN="$1"
fi

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Domain is required${NC}"
    exit 1
fi

# Strip protocol if user included it
DOMAIN=$(echo "$DOMAIN" | sed 's|https\?://||' | sed 's|/||g' | sed 's|www\.||')

read -rp "Enter your email for Let's Encrypt notifications: " EMAIL
if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Email is required${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}Domain: ${DOMAIN}${NC}"
echo -e "${CYAN}Email:  ${EMAIL}${NC}"
echo ""
read -rp "Continue? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# ─── Step 1: Install Nginx + Certbot ───
echo ""
echo -e "${GREEN}📦 Step 1: Installing Nginx and Certbot...${NC}"

apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx > /dev/null 2>&1
echo -e "${GREEN}✅ Nginx and Certbot installed${NC}"

# ─── Step 2: Stop host nginx temporarily if Docker port 80 conflicts ───
# Check if Docker frontend is using port 80
if docker ps --format '{{.Ports}}' 2>/dev/null | grep -q '0.0.0.0:80->80'; then
    echo -e "${YELLOW}⚠️  Docker frontend is using port 80. Switching to port 3000...${NC}"

    # Update docker-compose to use port 3000 instead of 80
    COMPOSE_FILE="$(dirname "$0")/docker-compose.yml"
    if [ -f "$COMPOSE_FILE" ]; then
        sed -i 's/"${FRONTEND_PORT:-80}:80"/"${FRONTEND_PORT:-3000}:80"/' "$COMPOSE_FILE"
        echo -e "${GREEN}   Updated docker-compose.yml: frontend now on port 3000${NC}"
    fi

    # Also update .env if exists
    ENV_FILE="$(dirname "$0")/.env"
    if [ -f "$ENV_FILE" ]; then
        if grep -q "FRONTEND_PORT=" "$ENV_FILE"; then
            sed -i 's/FRONTEND_PORT=.*/FRONTEND_PORT=3000/' "$ENV_FILE"
        else
            echo "FRONTEND_PORT=3000" >> "$ENV_FILE"
        fi
    fi

    # Restart Docker with new port
    cd "$(dirname "$0")"
    docker compose down 2>/dev/null || true
    docker compose up -d 2>/dev/null || true
    cd - > /dev/null

    BACKEND_PORT=3000
    echo -e "${GREEN}   Docker restarted on port ${BACKEND_PORT}${NC}"
else
    BACKEND_PORT=80
fi

# ─── Step 3: Create nginx config ───
echo ""
echo -e "${GREEN}📝 Step 2: Creating Nginx configuration...${NC}"

# Create certbot webroot
mkdir -p /var/www/certbot

# Create temporary config (HTTP only, for certbot challenge)
cat > /etc/nginx/sites-available/kedaikopi << TMPCONF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
TMPCONF

# Enable site
ln -sf /etc/nginx/sites-available/kedaikopi /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
echo -e "${GREEN}✅ Nginx configured (HTTP)${NC}"

# ─── Step 4: Get SSL certificate ───
echo ""
echo -e "${GREEN}🔐 Step 3: Obtaining SSL certificate...${NC}"

certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive

echo -e "${GREEN}✅ SSL certificate obtained${NC}"

# ─── Step 5: Create full SSL config ───
echo ""
echo -e "${GREEN}📝 Step 4: Creating full SSL configuration...${NC}"

cat > /etc/nginx/sites-available/kedaikopi << SSLCONF
# Redirect HTTP → HTTPS
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

    # SSL
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

    # Security
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    client_max_body_size 12M;
    server_tokens off;

    # Proxy to Docker
    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
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

nginx -t
systemctl reload nginx
echo -e "${GREEN}✅ SSL configuration active${NC}"

# ─── Step 6: Setup auto-renewal ───
echo ""
echo -e "${GREEN}🔄 Step 5: Setting up auto-renewal...${NC}"

# Certbot auto-renewal cron (usually already set by package, but ensure it)
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null || true; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    echo -e "${GREEN}✅ Auto-renewal cron job added${NC}"
else
    echo -e "${GREEN}✅ Auto-renewal already configured${NC}"
fi

# ─── Step 7: Update KedaiKopi .env ───
echo ""
echo -e "${GREEN}📝 Step 6: Updating KedaiKopi configuration...${NC}"

ENV_FILE="$(dirname "$0")/.env"
if [ -f "$ENV_FILE" ]; then
    # Update URLs to HTTPS
    sed -i "s|APP_URL=.*|APP_URL=https://${DOMAIN}|" "$ENV_FILE"
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" "$ENV_FILE"
    sed -i "s|SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=${DOMAIN},www.${DOMAIN}|" "$ENV_FILE"

    echo -e "${GREEN}✅ .env updated with HTTPS URLs${NC}"

    # Rebuild and restart Docker
    echo -e "${YELLOW}⏳ Restarting Docker with updated config...${NC}"
    cd "$(dirname "$0")"
    docker compose down
    docker compose up -d

    # Wait for backend
    sleep 10
    docker compose exec -T backend php artisan config:cache 2>/dev/null || true
    docker compose exec -T backend php artisan route:cache 2>/dev/null || true
    cd - > /dev/null
    echo -e "${GREEN}✅ Docker restarted${NC}"
else
    echo -e "${YELLOW}⚠️  .env not found. Manually update:${NC}"
    echo "   APP_URL=https://${DOMAIN}"
    echo "   FRONTEND_URL=https://${DOMAIN}"
    echo "   SANCTUM_STATEFUL_DOMAINS=${DOMAIN},www.${DOMAIN}"
fi

# ─── Done ───
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SSL Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "🌐 Site:     ${CYAN}https://${DOMAIN}${NC}"
echo -e "🔌 API:      ${CYAN}https://${DOMAIN}/api/health${NC}"
echo -e "🔒 SSL:      Auto-renews via certbot"
echo -e "📋 Logs:     /var/log/nginx/kedaikopi-*.log"
echo ""
echo -e "${YELLOW}Test your SSL:${NC}"
echo "  curl -I https://${DOMAIN}"
echo "  https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}"
echo ""
