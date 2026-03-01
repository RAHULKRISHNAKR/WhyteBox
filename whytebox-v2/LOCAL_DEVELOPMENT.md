# Local Development Setup (Without Docker)

This guide helps you set up WhyteBox v2.0 for local development without Docker.

## Prerequisites

- Python 3.11+ (3.13 detected on your system ✅)
- pip (Python package manager)
- Optional: PostgreSQL and Redis (for full functionality)

## Quick Start (Simplified Mode)

For rapid development without database dependencies:

### 1. Create Virtual Environment

```bash
cd whytebox-v2/backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
# Install core dependencies first
pip install fastapi uvicorn pydantic pydantic-settings python-dotenv

# Install ML frameworks (optional, large downloads)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install tensorflow

# Install remaining dependencies
pip install -r requirements.txt
```

### 3. Create Local Environment File

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
# Simplified for local development
HOST=127.0.0.1
PORT=8000
DEBUG=true
ENVIRONMENT=development

# Use SQLite for local development (no PostgreSQL needed)
DATABASE_URL=sqlite+aiosqlite:///./whytebox_local.db

# Use in-memory cache (no Redis needed)
REDIS_URL=redis://localhost:6379/0

# Security (generate a random key)
SECRET_KEY=local-dev-secret-key-change-this-in-production-min-32-chars

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000

# File Upload
MAX_UPLOAD_SIZE=524288000
UPLOAD_DIR=./uploads
MODEL_CACHE_SIZE=5

# ML Settings (CPU for local dev)
PYTORCH_DEVICE=cpu
TENSORFLOW_DEVICE=/CPU:0
MODEL_CACHE_TTL=7200

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=text

# Disable metrics for local dev
ENABLE_METRICS=false
```

### 4. Update Config for SQLite Support

The config needs to support SQLite for local development. Let me create an updated version.

### 5. Run the Application

```bash
# Make sure you're in the backend directory with venv activated
cd whytebox-v2/backend
source venv/bin/activate

# Run with environment file
ENV_FILE=.env.local uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 6. Test the API

```bash
# In another terminal
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","version":"2.0.0","environment":"development"}
```

## Development Workflow

### Start Development Server
```bash
cd whytebox-v2/backend
source venv/bin/activate
ENV_FILE=.env.local uvicorn app.main:app --reload
```

### Access API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Run Tests
```bash
pytest
```

### Format Code
```bash
black .
```

### Type Check
```bash
mypy .
```

## Simplified Architecture (Local Dev)

```
┌─────────────────────────────────────┐
│   Browser (http://localhost:8000)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   FastAPI Backend (Port 8000)       │
│   • In-memory caching                │
│   • SQLite database                  │
│   • File-based model storage         │
└─────────────────────────────────────┘
```

## Adding Full Database Support (Optional)

If you want to use PostgreSQL and Redis locally:

### Install PostgreSQL (macOS)
```bash
brew install postgresql@15
brew services start postgresql@15
createdb whytebox
```

### Install Redis (macOS)
```bash
brew install redis
brew services start redis
```

### Update .env.local
```bash
DATABASE_URL=postgresql+asyncpg://localhost:5432/whytebox
REDIS_URL=redis://localhost:6379/0
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>
```

### Import Errors
```bash
# Make sure you're in the backend directory
cd whytebox-v2/backend

# Reinstall dependencies
pip install -r requirements.txt
```

### Database Errors
```bash
# For SQLite, just delete the database file
rm whytebox_local.db

# Restart the application to recreate
```

## Next Steps

Once the backend is running:
1. Test API endpoints at http://localhost:8000/docs
2. Implement frontend (Day 5)
3. Add more API endpoints as needed

## Tips

- Use `--reload` flag for hot reloading during development
- Check logs in the terminal for debugging
- Use the interactive API docs at `/docs` for testing
- Keep the virtual environment activated while developing

---

**Status:** Ready for local development  
**Database:** SQLite (simplified) or PostgreSQL (full)  
**Cache:** In-memory or Redis  
**Mode:** Development with hot reload