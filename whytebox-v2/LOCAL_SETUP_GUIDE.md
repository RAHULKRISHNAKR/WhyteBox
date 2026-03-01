# WhyteBox v2.0 - Local Development Setup Guide

**Complete step-by-step guide to run WhyteBox locally**

## Prerequisites

### Required Software

1. **Node.js & npm**
   ```bash
   # Check versions
   node --version  # Should be >= 18.0.0
   npm --version   # Should be >= 9.0.0
   ```
   
   If not installed: Download from [nodejs.org](https://nodejs.org/)

2. **Python**
   ```bash
   # Check version
   python3 --version  # Should be >= 3.9
   pip3 --version
   ```
   
   If not installed: Download from [python.org](https://www.python.org/)

3. **Git**
   ```bash
   git --version
   ```

### Optional (Recommended)

- **Docker Desktop** - For containerized development
- **PostgreSQL** - If not using Docker
- **Redis** - If not using Docker

## Quick Start (Recommended)

### Option 1: Using Docker (Easiest)

```bash
# 1. Navigate to project root
cd whytebox-v2

# 2. Start all services with Docker Compose
docker-compose up -d

# 3. Check services are running
docker-compose ps

# 4. Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

**That's it!** Skip to [Verify Installation](#verify-installation)

### Option 2: Manual Setup (More Control)

Follow the detailed steps below for manual setup.

## Detailed Manual Setup

### Step 1: Clone and Navigate

```bash
# Clone repository (if not already done)
git clone https://github.com/your-org/whytebox.git
cd whytebox/whytebox-v2
```

### Step 2: Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env file with your settings
# Required variables:
# - DATABASE_URL=postgresql://user:password@localhost:5432/whytebox
# - REDIS_URL=redis://localhost:6379/0
# - SECRET_KEY=your-secret-key-here
# - ENVIRONMENT=development

# Run database migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend should now be running on http://localhost:8000**

### Step 3: Frontend Setup

Open a **new terminal** window:

```bash
# Navigate to frontend
cd whytebox-v2/frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ALLOWED_ORIGINS=http://localhost:8000
EOF

# Start development server
npm run dev
```

**Frontend should now be running on http://localhost:5173**

### Step 4: Database Setup (If not using Docker)

#### PostgreSQL

```bash
# Install PostgreSQL (macOS with Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb whytebox

# Create user (optional)
psql postgres
CREATE USER whytebox_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE whytebox TO whytebox_user;
\q
```

#### Redis

```bash
# Install Redis (macOS with Homebrew)
brew install redis
brew services start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

## Verify Installation

### 1. Check Backend

```bash
# Test API health
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","version":"2.0.0"}

# Open API documentation
open http://localhost:8000/docs
```

### 2. Check Frontend

```bash
# Open in browser
open http://localhost:5173

# You should see the WhyteBox homepage
```

### 3. Run Tests

#### Backend Tests

```bash
cd backend
pytest
```

#### Frontend Tests

```bash
cd frontend

# Unit tests
npm test

# E2E tests (requires app running)
npm run e2e
```

## Common Issues & Solutions

### Issue 1: Port Already in Use

**Error:** `Address already in use: 8000` or `5173`

**Solution:**
```bash
# Find process using port
# macOS/Linux:
lsof -i :8000
lsof -i :5173

# Kill process
kill -9 <PID>

# Or use different ports
# Backend:
uvicorn app.main:app --reload --port 8001

# Frontend (in package.json):
vite --port 5174
```

### Issue 2: Database Connection Failed

**Error:** `could not connect to server`

**Solution:**
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start if not running
brew services start postgresql@15

# Verify connection
psql -U postgres -c "SELECT version();"

# Check .env DATABASE_URL is correct
```

### Issue 3: Module Not Found

**Error:** `ModuleNotFoundError` or `Cannot find module`

**Solution:**
```bash
# Backend:
cd backend
pip install -r requirements.txt

# Frontend:
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: Permission Denied

**Error:** `EACCES: permission denied`

**Solution:**
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# Or use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### Issue 5: TypeScript Errors

**Error:** TypeScript compilation errors

**Solution:**
```bash
cd frontend

# Clear TypeScript cache
rm -rf node_modules/.vite

# Reinstall dependencies
npm install

# Run type check
npm run type-check
```

### Issue 6: Git Hooks Not Working

**Error:** Pre-commit hooks not running

**Solution:**
```bash
cd frontend

# Reinstall Husky
npm install husky --save-dev
npx husky install

# Make hooks executable
chmod +x .husky/pre-commit
```

## Development Workflow

### 1. Start Development

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Watch tests (optional)
cd frontend
npm test -- --watch
```

### 2. Make Changes

- Edit files in `src/` directory
- Changes auto-reload in browser
- Pre-commit hooks run on `git commit`

### 3. Run Quality Checks

```bash
cd frontend

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Run all checks
npm run quality:check
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
# Pre-commit hooks run automatically
```

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whytebox
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=development
DEBUG=true

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=INFO
```

### Frontend (.env.local)

```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ALLOWED_ORIGINS=http://localhost:8000

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

## Useful Commands

### Backend

```bash
# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback migration
alembic downgrade -1

# Run tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Format code
black app/
isort app/

# Lint code
flake8 app/
mypy app/
```

### Frontend

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Lint code
npm run lint:fix         # Fix linting issues
npm run format           # Format code
npm run type-check       # Check types
npm run quality:check    # Run all checks

# Testing
npm test                 # Run unit tests
npm run test:ui          # Test UI
npm run test:coverage    # With coverage
npm run e2e              # E2E tests
npm run e2e:ui           # E2E UI mode

# Accessibility & Security
npm run a11y:audit       # Accessibility audit
npm run security:audit   # Security audit
npm run security:fix     # Fix vulnerabilities
```

## Project Structure

```
whytebox-v2/
├── backend/
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Core functionality
│   │   ├── models/      # Database models
│   │   └── services/    # Business logic
│   ├── tests/           # Backend tests
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── utils/       # Utilities
│   │   └── types/       # TypeScript types
│   ├── tests/           # Frontend tests
│   ├── e2e/             # E2E tests
│   └── package.json
│
└── docker-compose.yml   # Docker configuration
```

## Next Steps

1. ✅ Verify all services are running
2. ✅ Run tests to ensure everything works
3. ✅ Explore the application at http://localhost:5173
4. ✅ Check API docs at http://localhost:8000/docs
5. ✅ Read the [Developer Guide](frontend/docs/DEVELOPER_GUIDE.md)
6. ✅ Start developing!

## Getting Help

- **Documentation:** Check `docs/` directory
- **API Docs:** http://localhost:8000/docs
- **Issues:** Create GitHub issue
- **Developer Guide:** `frontend/docs/DEVELOPER_GUIDE.md`

## Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Main application |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Swagger UI |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache/Queue |

---

**Ready to develop!** 🚀

For production deployment, see Phase 6 documentation.