# WhyteBox v2.0 - Complete Setup Guide

**Last Updated:** 2026-02-25  
**For:** macOS (your system)

---

## Prerequisites Installation

### 1. Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Node.js and npm

```bash
# Install Node.js 18 LTS (recommended)
brew install node@18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

**Alternative: Using nvm (Node Version Manager)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then:
nvm install 18
nvm use 18
nvm alias default 18
```

### 3. Verify Python Installation

You already have Python 3.13.9 installed ✅

```bash
python3 --version  # Should show Python 3.13.9
pip3 --version     # Should show pip 25.3
```

### 4. Install Docker (Optional, for containerized development)

```bash
# Download Docker Desktop for Mac
# Visit: https://www.docker.com/products/docker-desktop

# Or install via Homebrew
brew install --cask docker

# Start Docker Desktop application
# Verify installation
docker --version
docker-compose --version
```

---

## Project Setup

### Step 1: Navigate to Project Directory

```bash
cd /Users/rahukkrishnakr/Documents/github/WhyteBox/whytebox-v2
```

### Step 2: Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Create .env file
cp .env.example .env

# Edit .env file with your settings
nano .env  # or use your preferred editor

# Initialize database (if using PostgreSQL)
# Make sure PostgreSQL is running first
alembic upgrade head

# Run backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend should now be running at:** http://localhost:8000  
**API docs available at:** http://localhost:8000/docs

### Step 3: Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend
cd /Users/rahukkrishnakr/Documents/github/WhyteBox/whytebox-v2/frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Edit .env.local if needed
nano .env.local

# Run development server
npm run dev
```

**Frontend should now be running at:** http://localhost:3000

### Step 4: Install Pre-commit Hooks

```bash
# From project root
cd /Users/rahukkrishnakr/Documents/github/WhyteBox/whytebox-v2

# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Test hooks (optional)
pre-commit run --all-files
```

---

## Quick Start Script

We've created an automated setup script for you:

```bash
# From project root
cd /Users/rahukkrishnakr/Documents/github/WhyteBox/whytebox-v2

# Make script executable
chmod +x scripts/setup.sh

# Run setup
./scripts/setup.sh
```

This script will:
1. Check for required dependencies
2. Set up Python virtual environment
3. Install backend dependencies
4. Install frontend dependencies (if Node.js is available)
5. Create environment files
6. Initialize database
7. Install pre-commit hooks

---

## Verification Steps

### 1. Verify Backend

```bash
# Check if backend is running
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy"}

# Check API docs
open http://localhost:8000/docs
```

### 2. Verify Frontend

```bash
# Check if frontend is running
curl http://localhost:3000

# Open in browser
open http://localhost:3000
```

### 3. Run Tests

```bash
# Backend tests
cd backend
source venv/bin/activate
pytest

# Frontend tests (after Node.js is installed)
cd frontend
npm run test

# E2E tests
npm run test:e2e
```

---

## Common Issues and Solutions

### Issue 1: Port Already in Use

**Backend (8000):**
```bash
# Find process using port 8000
lsof -ti:8000

# Kill the process
kill -9 $(lsof -ti:8000)
```

**Frontend (3000):**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

### Issue 2: Python Virtual Environment Issues

```bash
# Deactivate current environment
deactivate

# Remove old environment
rm -rf backend/venv

# Create new environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Issue 3: Node Modules Issues

```bash
# Remove node_modules and package-lock
cd frontend
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

### Issue 4: Database Connection Issues

**Using SQLite (default for local dev):**
```bash
# No setup needed, database file will be created automatically
# Location: backend/whytebox.db
```

**Using PostgreSQL:**
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb whytebox

# Update .env file
DATABASE_URL=postgresql+asyncpg://your_user:your_password@localhost:5432/whytebox
```

### Issue 5: Permission Denied on Scripts

```bash
# Make scripts executable
chmod +x scripts/*.sh
```

---

## Development Workflow

### Starting Development

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Available for commands
```

### Running Tests

```bash
# All tests
./scripts/run-tests.sh all

# Backend only
./scripts/run-tests.sh backend

# Frontend only
./scripts/run-tests.sh frontend

# E2E only
./scripts/run-tests.sh e2e
```

### Code Quality Checks

```bash
# Linting
./scripts/run-tests.sh lint

# Type checking
./scripts/run-tests.sh type

# Pre-commit hooks
pre-commit run --all-files
```

---

## Environment Variables

### Backend (.env)

```bash
# Application
APP_NAME=WhyteBox
APP_VERSION=2.0.0
DEBUG=true
ENVIRONMENT=development

# Database (SQLite for local dev)
DATABASE_URL=sqlite+aiosqlite:///./whytebox.db

# Or PostgreSQL for production-like setup
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/whytebox

# Redis (optional for local dev)
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-change-this-in-production
JWT_SECRET_KEY=your-jwt-secret-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=["http://localhost:3000"]

# File Upload
MAX_UPLOAD_SIZE=524288000
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=INFO
```

### Frontend (.env.local)

```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_APP_NAME=WhyteBox
VITE_APP_VERSION=2.0.0
```

---

## Next Steps After Setup

1. ✅ Verify all services are running
2. ✅ Run test suite to ensure everything works
3. ✅ Explore API documentation at http://localhost:8000/docs
4. ✅ Open frontend at http://localhost:3000
5. ✅ Review architecture documentation in `docs/ARCHITECTURE.md`
6. ✅ Check user guide in `docs/USER_GUIDE.md`

---

## Getting Help

- **Documentation:** Check `docs/` directory
- **Issues:** Create an issue on GitHub
- **API Reference:** http://localhost:8000/docs
- **Architecture:** `docs/ARCHITECTURE.md`

---

## System Requirements Met

- ✅ Python 3.13.9 installed
- ⚠️ Node.js 18+ **needs installation**
- ⚠️ Docker **optional, not required for local dev**

---

**Ready to proceed with installation?** Follow the steps above or run `./scripts/setup.sh`