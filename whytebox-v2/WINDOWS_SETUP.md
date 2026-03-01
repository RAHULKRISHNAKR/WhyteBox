# WhyteBox v2 — Windows Setup Guide

> **Platform**: Windows 10 / Windows 11 (64-bit)  
> **Estimated setup time**: 20–40 minutes (first run downloads ~3 GB of ML models)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start — Docker (Recommended)](#2-quick-start--docker-recommended)
3. [Manual Setup — Without Docker](#3-manual-setup--without-docker)
4. [Environment Configuration](#4-environment-configuration)
5. [Running the Application](#5-running-the-application)
6. [Verifying the Installation](#6-verifying-the-installation)
7. [Troubleshooting](#7-troubleshooting)
8. [GPU Acceleration (Optional)](#8-gpu-acceleration-optional)

---

## 1. Prerequisites

### Required Software

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10 or 3.11 | https://www.python.org/downloads/ |
| Node.js | 18 LTS or 20 LTS | https://nodejs.org/ |
| Git | Latest | https://git-scm.com/download/win |

> ⚠️ **Python install tip**: During Python installation, check **"Add Python to PATH"** and **"Add Python to environment variables"**.

### Optional (for Docker path)

| Tool | Version | Download |
|------|---------|----------|
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop/ |

> Docker Desktop requires WSL 2 on Windows. Enable it via:  
> `wsl --install` in PowerShell (Admin), then restart.

---

## 2. Quick Start — Docker (Recommended)

Docker handles all dependencies (PostgreSQL, Redis, Python, Node.js) automatically.

### Step 1 — Clone the repository

```cmd
git clone https://github.com/your-org/WhyteBox.git
cd WhyteBox\whytebox-v2
```

### Step 2 — Create environment file

```cmd
copy .env.example .env
```

If `.env.example` does not exist, create `.env` manually:

```cmd
echo DATABASE_URL=postgresql+asyncpg://whytebox:password@postgres:5432/whytebox > .env
echo REDIS_URL=redis://redis:6379/0 >> .env
echo DEBUG=true >> .env
echo ENVIRONMENT=development >> .env
echo SECRET_KEY=change-me-in-production-use-32-chars-min >> .env
echo VITE_API_URL=http://localhost:8000/api/v1 >> .env
echo VITE_WS_URL=ws://localhost:8000/ws >> .env
```

### Step 3 — Start all services

```cmd
docker compose up --build
```

> First build takes 10–20 minutes (downloads Python packages + Node modules).  
> Subsequent starts take ~30 seconds.

### Step 4 — Open the app

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |

### Stop the application

```cmd
docker compose down
```

To also remove stored data (database, cache):

```cmd
docker compose down -v
```

---

## 3. Manual Setup — Without Docker

Use this path if you don't have Docker or prefer running services natively.

### 3.1 — Clone the repository

Open **Command Prompt** or **PowerShell**:

```cmd
git clone https://github.com/your-org/WhyteBox.git
cd WhyteBox\whytebox-v2
```

### 3.2 — Backend Setup

#### Create a Python virtual environment

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
```

> Your prompt should now show `(venv)` at the start.

#### Install Python dependencies

**Minimal install** (PyTorch CPU only — no TensorFlow, no PostgreSQL):

```cmd
pip install fastapi==0.109.0 uvicorn[standard]==0.27.0 python-multipart==0.0.6 ^
    pydantic==2.5.3 pydantic-settings==2.1.0 ^
    aiosqlite==0.19.0 sqlalchemy==2.0.25 alembic==1.13.1 ^
    torch==2.1.2 torchvision==0.16.2 --index-url https://download.pytorch.org/whl/cpu ^
    pillow==10.2.0 numpy==1.26.3 ^
    python-dotenv==1.0.0 aiofiles==23.2.1 ^
    prometheus-client==0.19.0 python-json-logger==2.0.7 psutil==5.9.7
```

> **Full install** (all features including TensorFlow):
> ```cmd
> pip install -r requirements.txt
> ```
> Note: Full install requires ~8 GB disk space and takes 15–30 minutes.

#### Create backend environment file

```cmd
cd backend
copy .env.example .env
```

If `.env.example` does not exist, create `backend\.env`:

```
DATABASE_URL=sqlite+aiosqlite:///./whytebox.db
REDIS_URL=redis://localhost:6379/0
DEBUG=true
ENVIRONMENT=development
SECRET_KEY=dev-secret-key-change-in-production
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

> **SQLite** is used here instead of PostgreSQL — no database server needed for development.

#### Start the backend

```cmd
cd backend
venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at http://localhost:8000

### 3.3 — Frontend Setup

Open a **new** Command Prompt or PowerShell window:

```cmd
cd WhyteBox\whytebox-v2\frontend
npm install
```

#### Create frontend environment file

Create `frontend\.env.local`:

```
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
```

#### Start the frontend

```cmd
npm run dev
```

The frontend will be available at http://localhost:5173

---

## 4. Environment Configuration

### Backend environment variables (`backend\.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./whytebox.db` | Database connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection (optional — caching) |
| `DEBUG` | `true` | Enable debug mode and auto-reload |
| `ENVIRONMENT` | `development` | `development` / `production` |
| `SECRET_KEY` | *(required)* | JWT signing key — change in production |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed frontend origins |

### Frontend environment variables (`frontend\.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL |
| `VITE_WS_URL` | `ws://localhost:8000/ws` | WebSocket URL for live inference |

---

## 5. Running the Application

### Option A — Two terminals (manual)

**Terminal 1 — Backend:**
```cmd
cd WhyteBox\whytebox-v2\backend
venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```cmd
cd WhyteBox\whytebox-v2\frontend
npm run dev
```

### Option B — Windows batch script

Create `whytebox-v2\start.bat` (already included in the repo):

```bat
@echo off
echo Starting WhyteBox v2...

:: Start backend in a new window
start "WhyteBox Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak > nul

:: Start frontend in a new window
start "WhyteBox Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo WhyteBox is starting...
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
pause
```

Run it:
```cmd
cd WhyteBox\whytebox-v2
start.bat
```

---

## 6. Verifying the Installation

### Check backend health

Open http://localhost:8000/health in your browser. You should see:

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "environment": "development"
}
```

### Check API documentation

Open http://localhost:8000/docs — the Swagger UI should load with all endpoints listed.

### Check frontend

Open http://localhost:5173 — the WhyteBox dashboard should load.

### Test model loading

1. Go to **Visualization** page
2. Select **ResNet-50** from the model dropdown
3. The 3D architecture should render in the browser
4. First load downloads the model weights (~100 MB) — this takes 1–2 minutes

### Test feature map extraction

1. Select a model (e.g. ResNet-50)
2. Scroll to the **Feature Maps** section
3. Upload any image (JPG/PNG)
4. Click **Extract Feature Maps**
5. After extraction, click a conv layer in the 3D viewer and press the expand icon (🟢) to see real activation heatmaps

---

## 7. Troubleshooting

### `python` not found

```
'python' is not recognized as an internal or external command
```

**Fix**: Reinstall Python and check "Add Python to PATH". Then restart your terminal.  
Alternatively use `py` instead of `python`:
```cmd
py -m venv venv
```

### `npm` not found

```
'npm' is not recognized as an internal or external command
```

**Fix**: Reinstall Node.js from https://nodejs.org/ and restart your terminal.

### Port 8000 already in use

```
ERROR: [Errno 10048] error while attempting to bind on address ('0.0.0.0', 8000)
```

**Fix**: Find and kill the process using port 8000:
```cmd
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F
```

Or change the backend port:
```cmd
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
And update `frontend\.env.local`:
```
VITE_API_URL=http://localhost:8001/api/v1
```

### Port 5173 already in use

Vite will automatically try the next available port (5174, 5175, etc.) and print the actual URL.

### `torch` installation fails

PyTorch has large wheels. If pip times out:
```cmd
pip install torch==2.1.2 torchvision==0.16.2 --index-url https://download.pytorch.org/whl/cpu --timeout 300
```

### Database errors on startup

If using SQLite and you see database errors, delete the database file and restart:
```cmd
del backend\whytebox.db
```

### Redis connection errors

Redis is optional for development. If you see Redis connection warnings, they are non-fatal — the app will run without caching. To suppress them, set `REDIS_URL=` (empty) in `backend\.env`.

### CORS errors in browser console

```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Fix**: Add your frontend URL to `CORS_ORIGINS` in `backend\.env`:
```
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

### Windows Defender / Antivirus blocking

Windows Defender may flag PyTorch or model weight files. Add the project directory to Windows Defender exclusions:
1. Open **Windows Security** → **Virus & threat protection**
2. **Manage settings** → **Exclusions** → **Add an exclusion** → **Folder**
3. Select the `WhyteBox` directory

### `psycopg2` install fails (PostgreSQL driver)

If you're using SQLite (recommended for development), you don't need `psycopg2`. Skip it:
```cmd
pip install -r requirements.txt --ignore-requires-python
```
Or use the minimal install command from section 3.2.

---

## 8. GPU Acceleration (Optional)

If you have an NVIDIA GPU, install the CUDA version of PyTorch for faster inference:

### Check your CUDA version

```cmd
nvidia-smi
```

Look for "CUDA Version" in the output.

### Install PyTorch with CUDA

**CUDA 11.8:**
```cmd
pip install torch==2.1.2 torchvision==0.16.2 --index-url https://download.pytorch.org/whl/cu118
```

**CUDA 12.1:**
```cmd
pip install torch==2.1.2 torchvision==0.16.2 --index-url https://download.pytorch.org/whl/cu121
```

### Verify GPU is detected

```cmd
python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `venv\Scripts\activate` | Activate Python virtual environment |
| `uvicorn app.main:app --reload` | Start backend with auto-reload |
| `npm run dev` | Start frontend dev server |
| `npm run build` | Build frontend for production |
| `docker compose up --build` | Start all services with Docker |
| `docker compose down` | Stop all Docker services |
| `docker compose down -v` | Stop and remove all data |

---

## Directory Structure

```
whytebox-v2\
├── backend\              ← FastAPI Python backend
│   ├── app\
│   │   ├── api\          ← REST API endpoints
│   │   ├── core\         ← Config, database, cache
│   │   └── services\     ← Model loading, inference
│   ├── requirements.txt  ← Python dependencies
│   └── .env              ← Backend environment (create this)
├── frontend\             ← React + TypeScript frontend
│   ├── src\
│   │   ├── babylon\      ← 3D visualization (BabylonJS)
│   │   ├── components\   ← React components
│   │   ├── pages\        ← Page components
│   │   └── services\     ← API client
│   ├── package.json      ← Node.js dependencies
│   └── .env.local        ← Frontend environment (create this)
├── docker-compose.yml    ← Docker services definition
└── WINDOWS_SETUP.md      ← This file
```

---

*Made with Bob — WhyteBox v2.0*