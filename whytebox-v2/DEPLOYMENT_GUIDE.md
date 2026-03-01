# WhyteBox v2 — Free Deployment Guide

Deploy WhyteBox for free as an educational platform using:
- **Frontend**: [Vercel](https://vercel.com) — free forever, global CDN
- **Backend**: [Render.com](https://render.com) — free web service
- **Database**: Render PostgreSQL — free (90-day limit, then $7/mo)

> **Total cost: $0/month** for the first 90 days.  
> After 90 days: upgrade Render PostgreSQL to Starter ($7/mo) or export data.

---

## Architecture

```
Browser
  │
  ├── Static assets (JS/CSS) ──▶ Vercel CDN (free, global)
  │
  └── API calls ──▶ Render.com
                      ├── FastAPI backend (free web service)
                      └── PostgreSQL (free, 90 days)
```

**Note on free tier limitations:**
- Render free web services **spin down after 15 minutes of inactivity**
- First request after spin-down takes ~30 seconds (cold start)
- This is acceptable for an educational demo — users see a loading state
- To avoid cold starts: upgrade to Render Starter ($7/mo) or use a cron job to ping `/health` every 10 minutes

---

## Prerequisites

- GitHub account (repo must be public or Vercel/Render connected to private repo)
- Node.js 18+ (for local testing)
- Python 3.11+ (for local testing)

---

## Step 1: Push to GitHub

If not already done:

```bash
cd whytebox-v2
git init
git add .
git commit -m "Initial commit: WhyteBox v2"
git remote add origin https://github.com/YOUR_USERNAME/whytebox.git
git push -u origin main
```

---

## Step 2: Deploy Backend to Render.com

### 2a. Create Render account

Go to [https://render.com](https://render.com) and sign up with GitHub.

### 2b. Deploy via Blueprint (recommended — one click)

1. Go to [https://dashboard.render.com/](https://dashboard.render.com/)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and show you the services to create:
   - `whytebox-backend` (web service)
   - `whytebox-db` (PostgreSQL)
5. Click **"Apply"**

### 2c. Set required environment variables

After the blueprint is applied, go to the `whytebox-backend` service → **Environment**:

| Variable | Value | Notes |
|----------|-------|-------|
| `SECRET_KEY` | `<generate below>` | **Required** — never use default |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Set after Vercel deploy |

Generate a secure `SECRET_KEY`:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2d. Note your backend URL

After deployment, Render gives you a URL like:
```
https://whytebox-backend.onrender.com
```

Save this — you'll need it for the frontend.

---

## Step 3: Deploy Frontend to Vercel

### 3a. Create Vercel account

Go to [https://vercel.com](https://vercel.com) and sign up with GitHub.

### 3b. Import project

1. Click **"Add New"** → **"Project"**
2. Import your GitHub repository
3. Set **Root Directory** to `whytebox-v2/frontend`
4. Vercel auto-detects Vite — confirm the settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

### 3c. Set environment variables

In the Vercel project settings → **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://whytebox-backend.onrender.com/api/v1` |

### 3d. Deploy

Click **"Deploy"**. Vercel builds and deploys in ~2 minutes.

Your frontend URL will be something like:
```
https://whytebox.vercel.app
```

---

## Step 4: Update CORS on Backend

Go back to Render → `whytebox-backend` → **Environment** and update:

| Variable | Value |
|----------|-------|
| `ALLOWED_ORIGINS` | `https://whytebox.vercel.app` |

Render will automatically redeploy.

---

## Step 5: Verify Deployment

### Check backend health
```bash
curl https://whytebox-backend.onrender.com/health
# Expected: {"status":"healthy","version":"2.0.0","environment":"production"}
```

### Check API docs
Open: `https://whytebox-backend.onrender.com/docs`

### Check frontend
Open: `https://whytebox.vercel.app`

---

## Local Development

### Option A: Without Docker (fastest)

**Backend:**
```bash
cd whytebox-v2/backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd whytebox-v2/frontend
npm ci
cp .env.example .env.local
# Edit .env.local: VITE_API_URL=http://localhost:8000/api/v1
npm run dev
```

Open: http://localhost:5173

### Option B: With Docker Compose

```bash
cd whytebox-v2
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## Production Docker Deployment (self-hosted)

If you have a VPS (DigitalOcean, Hetzner, etc.):

```bash
cd whytebox-v2
cp .env.prod.example .env.prod
# Edit .env.prod with your values
./scripts/deploy.sh
```

Access at: http://YOUR_SERVER_IP

---

## Environment Variables Reference

### Backend (Render.com)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Auto | — | Set by Render from PostgreSQL service |
| `SECRET_KEY` | **Yes** | — | JWT signing key (32+ random bytes) |
| `ALLOWED_ORIGINS` | **Yes** | — | Comma-separated frontend URLs |
| `ENVIRONMENT` | No | `production` | App environment |
| `DEBUG` | No | `false` | Enable debug mode |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `PYTORCH_DEVICE` | No | `cpu` | ML device (cpu/cuda) |
| `MODEL_CACHE_SIZE` | No | `3` | Max models in memory |
| `REDIS_URL` | No | `""` | Redis URL (optional) |
| `UPLOAD_DIR` | No | `/tmp/uploads` | Upload directory |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes** | Full backend API URL including `/api/v1` |

---

## Troubleshooting

### Backend cold start (30s delay)
**Cause**: Render free tier spins down after 15min inactivity.  
**Fix**: Add a cron job to ping the health endpoint every 10 minutes:
```bash
# Using cron-job.org (free) — ping every 10 minutes:
# URL: https://whytebox-backend.onrender.com/health
```

### CORS errors in browser
**Cause**: `ALLOWED_ORIGINS` doesn't include your Vercel URL.  
**Fix**: Update `ALLOWED_ORIGINS` in Render environment variables.

### "Module not found" on Render build
**Cause**: `rootDir` in `render.yaml` must match your repo structure.  
**Fix**: Verify `rootDir: whytebox-v2/backend` matches your actual path.

### Frontend shows "Network Error"
**Cause**: `VITE_API_URL` is wrong or backend is sleeping.  
**Fix**: Check the URL in Vercel env vars. Wait 30s for backend cold start.

### Database connection error on first deploy
**Cause**: PostgreSQL takes ~1 minute to provision.  
**Fix**: Wait for the database to show "Available" in Render dashboard, then redeploy the backend.

### PyTorch import error on Render
**Cause**: Render free tier has 512MB RAM; PyTorch needs ~400MB to import.  
**Fix**: The app uses lazy imports — PyTorch only loads when a model is actually used. If you hit OOM, upgrade to Render Starter ($7/mo, 1GB RAM).

---

## Upgrading from Free Tier

When you're ready to scale:

| Service | Free | Paid |
|---------|------|------|
| Render Web Service | 512MB RAM, spins down | $7/mo — 512MB, always on |
| Render PostgreSQL | 90 days, 256MB | $7/mo — 1GB, persistent |
| Vercel | Free forever for static | Free forever |

Total for always-on: **$14/month**.

---

## Custom Domain

### Vercel (frontend)
1. Go to Vercel project → **Domains**
2. Add your domain (e.g., `whytebox.yourdomain.com`)
3. Add the CNAME record to your DNS

### Render (backend API)
1. Go to Render service → **Settings** → **Custom Domains**
2. Add `api.whytebox.yourdomain.com`
3. Update `ALLOWED_ORIGINS` and `VITE_API_URL` accordingly

---

## Security Checklist

- [ ] `SECRET_KEY` is a random 64-character hex string (not the default)
- [ ] `ALLOWED_ORIGINS` only contains your actual frontend URL
- [ ] `DEBUG=false` in production
- [ ] `.env.prod` is in `.gitignore` (never committed)
- [ ] PostgreSQL password is strong and unique
- [ ] API docs (`/docs`) are acceptable to be public (educational platform)

---

*WhyteBox v2 — Neural Network Visualization & Explainability Platform*