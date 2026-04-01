#!/bin/sh
set -e

PORT="${PORT:-8000}"

# Update nginx to listen on Render's $PORT
sed -i "s/listen 8000/listen ${PORT}/" /etc/nginx/http.d/default.conf

# Run migrations
echo "Running migrations..."
php /app/artisan migrate --force 2>&1 || true

# Auto-seed on first deploy (checks if users table is empty)
NEEDS_SEED=$(php /app/artisan tinker --execute="echo App\Models\User::count();" 2>/dev/null || echo "0")
if [ "$NEEDS_SEED" = "0" ] || [ "${SEED_ON_DEPLOY:-false}" = "true" ]; then
    echo "Seeding database..."
    php /app/artisan db:seed --force 2>&1 || true
fi

# Cache config
php /app/artisan config:cache 2>/dev/null || true
php /app/artisan route:cache 2>/dev/null || true
php /app/artisan view:cache 2>/dev/null || true
php /app/artisan event:cache 2>/dev/null || true
php /app/artisan storage:link 2>/dev/null || true

echo "Starting server on port ${PORT}..."

# Start supervisord (nginx + php-fpm + queue worker)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
