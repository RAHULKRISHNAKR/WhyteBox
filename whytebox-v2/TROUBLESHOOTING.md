# WhyteBox v2.0 - Troubleshooting Guide

## Issue: Frontend Getting 404 on `/models` Endpoint

### Symptoms
```
GET http://localhost:8000/models?limit=100 404 (Not Found)
[API Error] 404 Not Found
```

### Root Cause
The frontend is calling `/models` but the backend expects `/api/v1/models`.

### Solution Options

#### Option 1: Fix Frontend API Client (Recommended)

The frontend API client needs to include the `/api/v1` prefix. Check if your API client configuration has the correct base URL.

**File to check:** `whytebox-v2/frontend/src/services/api/client.ts`

Should have:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_VERSION = '/api/v1';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  // ...
});
```

#### Option 2: Verify Backend is Running

```bash
# Check if backend is running
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","version":"2.0.0","environment":"development"}

# Check if models endpoint works
curl http://localhost:8000/api/v1/models

# Expected response:
# {"models":[...],"count":3,"message":"Available pretrained models"}
```

#### Option 3: Check Backend Logs

```bash
# If running manually
cd whytebox-v2/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Watch for startup messages:
# ✅ Database initialized successfully
# ✅ Redis cache connected successfully
# ✅ WhyteBox API is ready!
```

## Common Issues & Solutions

### 1. Backend Not Starting

**Error:** `ModuleNotFoundError: No module named 'app'`

**Solution:**
```bash
cd whytebox-v2/backend
pip install -r requirements.txt
```

### 2. Database Connection Error

**Error:** `could not connect to server: Connection refused`

**Solution:**
```bash
# Start PostgreSQL
brew services start postgresql@15

# Or use Docker
docker-compose up -d postgres
```

### 3. Redis Connection Error

**Error:** `Error connecting to Redis`

**Solution:**
```bash
# Start Redis
brew services start redis

# Or use Docker
docker-compose up -d redis

# Or disable Redis in .env
REDIS_ENABLED=false
```

### 4. CORS Error

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**

Check `whytebox-v2/backend/.env`:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 5. Port Already in Use

**Error:** `Address already in use`

**Solution:**
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
uvicorn app.main:app --reload --port 8001
```

## Quick Diagnostic Script

Run this to check your setup:

```bash
#!/bin/bash
echo "🔍 WhyteBox Diagnostic Check"
echo "=============================="

# Check Node.js
echo -n "Node.js: "
node --version 2>/dev/null || echo "❌ Not installed"

# Check Python
echo -n "Python: "
python3 --version 2>/dev/null || echo "❌ Not installed"

# Check PostgreSQL
echo -n "PostgreSQL: "
psql --version 2>/dev/null || echo "❌ Not installed"

# Check Redis
echo -n "Redis: "
redis-cli --version 2>/dev/null || echo "❌ Not installed"

# Check if backend is running
echo -n "Backend API: "
curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running"

# Check if frontend is running
echo -n "Frontend: "
curl -s http://localhost:5173 > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running"

# Check API endpoint
echo -n "Models API: "
curl -s http://localhost:8000/api/v1/models > /dev/null 2>&1 && echo "✅ Working" || echo "❌ Not working"

echo ""
echo "=============================="
```

Save as `diagnostic.sh`, make executable with `chmod +x diagnostic.sh`, and run with `./diagnostic.sh`.

## Step-by-Step Restart

If nothing works, try a complete restart:

```bash
# 1. Stop everything
pkill -f uvicorn
pkill -f vite

# 2. Clean up
cd whytebox-v2/backend
rm -rf __pycache__ app/__pycache__

cd ../frontend
rm -rf node_modules/.vite

# 3. Start backend
cd ../backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 4. Start frontend (new terminal)
cd ../frontend
npm run dev
```

## Verify Everything Works

```bash
# 1. Check backend health
curl http://localhost:8000/health

# 2. Check API root
curl http://localhost:8000/api/v1/

# 3. Check models endpoint
curl http://localhost:8000/api/v1/models

# 4. Open frontend
open http://localhost:5173

# 5. Check browser console
# Should see no errors
```

## Still Having Issues?

1. **Check the logs:**
   - Backend: Terminal where uvicorn is running
   - Frontend: Browser console (F12)

2. **Verify environment variables:**
   - Backend: `whytebox-v2/backend/.env`
   - Frontend: `whytebox-v2/frontend/.env.local`

3. **Check file permissions:**
   ```bash
   ls -la whytebox-v2/backend/.env
   ls -la whytebox-v2/frontend/.env.local
   ```

4. **Try Docker instead:**
   ```bash
   cd whytebox-v2
   docker-compose up -d
   ```

5. **Check the documentation:**
   - `LOCAL_SETUP_GUIDE.md`
   - `frontend/docs/DEVELOPER_GUIDE.md`

## Getting Help

If you're still stuck:

1. Check existing issues on GitHub
2. Create a new issue with:
   - Error messages
   - Steps to reproduce
   - Output of diagnostic script
   - OS and versions

---

**Last Updated:** 2026-02-26  
**Version:** 2.0.0