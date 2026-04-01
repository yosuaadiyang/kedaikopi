# ☕ KedaiKopi — Coffee Shop Directory

Indonesia's coffee shop directory platform built with **Laravel 11 + Sanctum + React + MySQL**.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 11, PHP 8.2, Sanctum |
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Database | MySQL 8.0 |
| Deployment | Docker Compose, Nginx, PHP-FPM |

## Features

- 🔐 Token-based auth (Sanctum) with rate limiting
- 👤 Role-based access: user, store_owner, admin, super_admin
- 🏪 Store CRUD with approval workflow
- 📍 Geospatial search (haversine)
- 🔍 Full-text search
- ⭐ Review system with auto-rating
- ❤️ Favorites/bookmarks
- 📦 CSV/JSON bulk import with auto field mapping
- 🛡️ Security headers, input sanitization, CSRF protection
- 📱 Responsive mobile-first UI
- 🐳 Docker production deployment

## Quick Start

### Docker (recommended)

```bash
git clone <repo-url> kedaikopi && cd kedaikopi
cp .env.example .env

# Generate APP_KEY
docker compose run --rm backend php artisan key:generate --show
# Copy the output to APP_KEY in .env

# Edit .env: set DB passwords, domain, etc.
nano .env

# Deploy
./deploy.sh

# First time: seed database
docker compose exec backend php artisan db:seed
```

### SSL Setup (required for production)

```bash
# After deploy.sh succeeds, run:
sudo ./setup-ssl.sh kedaikopi.id

# This will:
# 1. Install Nginx + Certbot on host
# 2. Obtain Let's Encrypt SSL certificate
# 3. Configure HTTPS reverse proxy
# 4. Auto-switch Docker to port 3000 (nginx proxies 443 → 3000)
# 5. Update .env with HTTPS URLs
# 6. Setup auto-renewal cron
```

### Manual Setup

```bash
# Backend
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Default Accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@kedaikopi.id | Admin123! |
| User | user@kedaikopi.id | User1234! |

## Makefile Commands

```bash
make setup       # Full setup (build + start + migrate + seed)
make up          # Start services
make down        # Stop services
make fresh       # Fresh migrate + seed
make logs        # View logs
make shell       # Backend shell
make backup      # MySQL backup
make health      # Health check
make optimize    # Production optimization
```

## API Endpoints

### Public
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| POST | /api/auth/forgot-password | Forgot password |
| POST | /api/auth/reset-password | Reset password |
| GET | /api/stores | List stores (with filters) |
| GET | /api/stores/:slug | Store detail |
| GET | /api/stores/:id/reviews | Store reviews |
| GET | /api/stores/:id/menus | Store menus |
| GET | /api/provinces | Provinces |
| GET | /api/provinces/:id/cities | Cities |
| GET | /api/amenities | Amenities |
| GET | /api/specialties | Specialties |
| GET | /api/health | Health check |

### Authenticated (Bearer Token)
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| PUT | /api/auth/profile | Update profile |
| PUT | /api/auth/password | Change password |
| POST | /api/stores | Create store |
| POST | /api/stores/:id | Update store |
| DELETE | /api/stores/:id | Delete store |
| POST | /api/stores/:id/favorite | Toggle favorite |
| GET | /api/my/favorites | My favorites |
| GET | /api/my/stores | My stores |
| POST | /api/stores/:id/reviews | Add review |
| PUT | /api/reviews/:id | Update review |
| DELETE | /api/reviews/:id | Delete review |

### Admin (admin/super_admin)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/admin/dashboard | Dashboard stats |
| GET | /api/admin/stores | All stores |
| PUT | /api/admin/stores/:id/status | Approve/reject |
| POST | /api/admin/stores/:id/featured | Toggle featured |
| POST | /api/admin/stores/import | Import CSV/JSON |
| DELETE | /api/admin/stores/imported | Clear imports |
| GET | /api/admin/stores/export | Export JSON |
| GET | /api/admin/users | All users |
| PUT | /api/admin/users/:id | Update user |
| GET | /api/admin/claims | Store claims |
| PUT | /api/admin/claims/:id | Update claim |

## Security

- Rate limiting on auth (10/min) and API (60-120/min)
- Input sanitization (strip_tags) on all user inputs
- Pagination cap (max 50 per page)
- Security headers (X-Frame-Options, CSP, HSTS-ready)
- Token expiration (30 days)
- Session pruning (max 5 active tokens)
- SQL injection protection via Eloquent ORM
- CORS whitelist
- Admin action logging

## License

MIT
