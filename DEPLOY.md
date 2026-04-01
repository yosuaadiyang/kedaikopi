# KedaiKopi — Deploy to Vercel + Render

## Architecture
```
[Vercel] ← React SPA (static)
    ↓ API calls
[Render] ← Laravel API (Docker)
    ↓
[Render] ← PostgreSQL (free)
```

---

## Step 1: Push to GitHub

```bash
# Create repo
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/kedaikopi.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Render

### 2a. Create PostgreSQL Database
1. Go to https://dashboard.render.com
2. Click **New → PostgreSQL**
3. Name: `kedaikopi-db`
4. Plan: **Free**
5. Click **Create Database**
6. Copy the **Internal Database URL** (starts with `postgres://...`)

### 2b. Deploy Laravel API
1. Click **New → Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `kedaikopi-api`
   - **Region**: Singapore (closest to Indonesia)
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Docker Context**: `./backend`
   - **Plan**: Free
4. **Environment Variables** — add all of these:

| Key | Value |
|-----|-------|
| `APP_NAME` | `KedaiKopi` |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | *(generate: see below)* |
| `APP_URL` | `https://kedaikopi-api.onrender.com` |
| `APP_TIMEZONE` | `Asia/Jakarta` |
| `DB_CONNECTION` | `pgsql` |
| `DATABASE_URL` | *(paste Internal Database URL from step 2a)* |
| `FRONTEND_URL` | `https://kedaikopi.vercel.app` |
| `SANCTUM_STATEFUL_DOMAINS` | `kedaikopi.vercel.app` |
| `CORS_PATTERN` | `https://kedaikopi.*\.vercel\.app` |
| `CACHE_STORE` | `database` |
| `QUEUE_CONNECTION` | `database` |
| `SESSION_DRIVER` | `database` |
| `LOG_CHANNEL` | `stderr` |
| `LOG_LEVEL` | `warning` |
| `MAIL_MAILER` | `log` |
| `MAIL_FROM_ADDRESS` | `noreply@kedaikopi.id` |

5. Click **Create Web Service**

### 2c. Generate APP_KEY
After the first deploy finishes, go to Render Shell:
```bash
php artisan key:generate --show
```
Copy the output (starts with `base64:...`) and paste it as the `APP_KEY` env var.
Click **Save** → Render will redeploy automatically.

> **Note**: The first deploy auto-runs migrations + seeds 10 demo stores.

---

## Step 3: Deploy Frontend on Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://kedaikopi-api.onrender.com/api` |

5. Click **Deploy**

---

## Step 4: Verify

1. Open your Vercel URL: `https://kedaikopi.vercel.app`
2. First load may take 30-50s (Render free tier cold start)
3. Login with: `admin@kedaikopi.id` / `Admin123!`
4. Check admin panel: `/admin`

---

## Custom Domain (Optional)

### Vercel (frontend)
1. Vercel Dashboard → Project → Settings → Domains
2. Add `kedaikopi.id`
3. Update DNS: CNAME → `cname.vercel-dns.com`

### Render (backend)
1. Render Dashboard → Service → Settings → Custom Domains
2. Add `api.kedaikopi.id`
3. Update DNS: CNAME → `kedaikopi-api.onrender.com`

### Update env vars after custom domain:
**Render:**
- `APP_URL` = `https://api.kedaikopi.id`
- `FRONTEND_URL` = `https://kedaikopi.id`
- `SANCTUM_STATEFUL_DOMAINS` = `kedaikopi.id,www.kedaikopi.id`

**Vercel:**
- `VITE_API_URL` = `https://api.kedaikopi.id/api`

---

## Notes

- **Render free tier** sleeps after 15 min idle. First request takes 30-50s to wake up. The frontend has retry logic built-in.
- **Database**: Render free PostgreSQL has 256MB limit and expires after 90 days. Upgrade to paid ($7/mo) for persistent data.
- **File uploads**: Stored in container filesystem (lost on redeploy). For production, use S3/Cloudflare R2.
- **Seeding**: Auto-seeds on first deploy. To re-seed: Render Shell → `php artisan db:seed --force`
