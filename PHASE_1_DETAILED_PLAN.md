# Phase 1: Project Setup & Architecture - Detailed Breakdown

**Duration:** Week 1-2 (10 working days)  
**Goal:** Establish modern project foundation with proper tooling, structure, and development environment

---

## 📅 Day-by-Day Breakdown

### **Day 1-2: Project Initialization & Structure**

#### Task 1.1: Create New Project Structure (4 hours)
```bash
# Create new directory structure
mkdir -p whytebox-v2/{frontend,backend,shared,infrastructure,docs,scripts}
cd whytebox-v2

# Initialize Git
git init
git remote add origin <your-repo-url>

# Create .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
*.egg-info/
dist/
build/

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
dist/
.cache/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Database
*.db
*.sqlite

# Docker
.docker/
EOF
```

**Deliverables:**
- ✅ Clean directory structure
- ✅ Git repository initialized
- ✅ .gitignore configured

---

#### Task 1.2: Backend Project Setup (4 hours)

**Create Backend Structure:**
```bash
cd backend

# Create directory structure
mkdir -p app/{api/v1,core,models,schemas,services,ml/{extractors,converters,explainability},utils}
mkdir -p tests/{unit,integration,e2e}
mkdir -p alembic/versions

# Create __init__.py files
touch app/__init__.py
touch app/api/__init__.py
touch app/api/v1/__init__.py
touch app/core/__init__.py
touch app/models/__init__.py
touch app/schemas/__init__.py
touch app/services/__init__.py
touch app/ml/__init__.py
touch app/ml/extractors/__init__.py
touch app/ml/converters/__init__.py
touch app/ml/explainability/__init__.py
touch app/utils/__init__.py
touch tests/__init__.py
```

**Create requirements.txt:**
```txt
# Web Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6
pydantic==2.5.3
pydantic-settings==2.1.0

# Database
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
asyncpg==0.29.0

# Cache & Queue
redis==5.0.1
celery==5.3.6

# ML Frameworks
torch==2.1.2
torchvision==0.16.2
tensorflow==2.15.0
timm==0.9.12
transformers==4.36.2

# Image Processing
opencv-python==4.9.0.80
pillow==10.2.0
numpy==1.26.3

# Utilities
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
aiofiles==23.2.1

# Monitoring & Logging
prometheus-client==0.19.0
python-json-logger==2.0.7

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
httpx==0.26.0
faker==22.0.0

# Development
black==23.12.1
flake8==7.0.0
mypy==1.8.0
pre-commit==3.6.0
```

**Create pyproject.toml:**
```toml
[tool.black]
line-length = 100
target-version = ['py311']
include = '\.pyi?$'

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --cov=app --cov-report=html --cov-report=term"
```

**Deliverables:**
- ✅ Backend directory structure
- ✅ requirements.txt with all dependencies
- ✅ pyproject.toml for tooling configuration

---

#### Task 1.3: Frontend Project Setup (4 hours)

**Initialize React + TypeScript + Vite:**
```bash
cd ../frontend

# Create Vite project
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install additional packages
npm install -D tailwindcss postcss autoprefixer
npm install @babylonjs/core @babylonjs/loaders
npm install zustand axios
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select
npm install lucide-react
npm install -D @types/node

# Initialize Tailwind
npx tailwindcss init -p
```

**Configure Tailwind (tailwind.config.js):**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#667eea',
          dark: '#5568d3',
        },
        secondary: {
          DEFAULT: '#764ba2',
          dark: '#5f3c82',
        },
      },
    },
  },
  plugins: [],
}
```

**Create Frontend Structure:**
```bash
mkdir -p src/{components/{ui,layout,3d},features/{dashboard,visualization,inference,explainability,learning},hooks,services,store,types,utils}

# Create index files
touch src/components/index.ts
touch src/features/index.ts
touch src/hooks/index.ts
touch src/services/index.ts
touch src/store/index.ts
touch src/types/index.ts
touch src/utils/index.ts
```

**Update package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Deliverables:**
- ✅ React + TypeScript + Vite setup
- ✅ Tailwind CSS configured
- ✅ Frontend directory structure
- ✅ Essential packages installed

---

### **Day 3: Configuration & Environment Setup**

#### Task 1.4: Environment Configuration (3 hours)

**Backend .env.example:**
```bash
# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql+asyncpg://whytebox:password@localhost:5432/whytebox
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_CACHE_TTL=3600

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# File Upload
MAX_UPLOAD_SIZE=524288000
UPLOAD_DIR=./uploads
MODEL_CACHE_SIZE=5

# ML Settings
PYTORCH_DEVICE=cuda
TENSORFLOW_DEVICE=/GPU:0
MODEL_CACHE_TTL=7200

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

**Frontend .env.example:**
```bash
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_ENABLE_ANALYTICS=false
VITE_SENTRY_DSN=
```

**Deliverables:**
- ✅ Environment templates created
- ✅ Configuration documented

---

#### Task 1.5: Docker Development Environment (5 hours)

**Create docker-compose.yml:**
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: whytebox-postgres
    environment:
      POSTGRES_USER: whytebox
      POSTGRES_PASSWORD: password
      POSTGRES_DB: whytebox
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U whytebox"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: whytebox-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.backend.dev
    container_name: whytebox-backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - backend_cache:/root/.cache
    environment:
      - DATABASE_URL=postgresql+asyncpg://whytebox:password@postgres:5432/whytebox
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  # Frontend
  frontend:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.frontend.dev
    container_name: whytebox-frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8000/api/v1
      - VITE_WS_URL=ws://localhost:8000/ws
    command: npm run dev -- --host 0.0.0.0 --port 3000

volumes:
  postgres_data:
  redis_data:
  backend_cache:
```

**Create Dockerfile.backend.dev:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/ .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**Create Dockerfile.frontend.dev:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy application
COPY frontend/ .

# Expose port
EXPOSE 3000

# Run development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
```

**Deliverables:**
- ✅ Docker Compose configuration
- ✅ Development Dockerfiles
- ✅ Local development environment ready

---

### **Day 4: Core Backend Setup**

#### Task 1.6: FastAPI Application Bootstrap (4 hours)

**Create app/main.py:**
```python
"""
WhyteBox API - Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1 import api_router
from app.core.database import init_db

# Setup logging
logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting WhyteBox API...")
    await init_db()
    logger.info("✅ Database initialized")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down WhyteBox API...")


# Create FastAPI application
app = FastAPI(
    title="WhyteBox API",
    description="Neural Network Visualization & Explainability Platform",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "WhyteBox API",
        "version": "2.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
```

**Create app/core/config.py:**
```python
"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str
    REDIS_CACHE_TTL: int = 3600
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 524288000  # 500MB
    UPLOAD_DIR: str = "./uploads"
    MODEL_CACHE_SIZE: int = 5
    
    # ML Settings
    PYTORCH_DEVICE: str = "cuda"
    TENSORFLOW_DEVICE: str = "/GPU:0"
    MODEL_CACHE_TTL: int = 7200
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

**Create app/core/logging.py:**
```python
"""
Logging Configuration
"""
import logging
import sys
from pythonjsonlogger import jsonlogger

from app.core.config import settings


def setup_logging():
    """Setup application logging"""
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    
    if settings.LOG_FORMAT == "json":
        formatter = jsonlogger.JsonFormatter(
            '%(asctime)s %(name)s %(levelname)s %(message)s'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger
```

**Deliverables:**
- ✅ FastAPI application structure
- ✅ Configuration management
- ✅ Logging setup
- ✅ Middleware configured

---

#### Task 1.7: Database Setup (4 hours)

**Create app/core/database.py:**
```python
"""
Database Configuration
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.DEBUG
)

# Create session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()


async def init_db():
    """Initialize database"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

**Create app/models/user.py:**
```python
"""
User Model
"""
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Create alembic.ini:**
```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = postgresql+asyncpg://whytebox:password@localhost:5432/whytebox

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

**Deliverables:**
- ✅ Database connection setup
- ✅ Base models created
- ✅ Alembic migrations configured

---

### **Day 5: Core Frontend Setup**

#### Task 1.8: React Application Bootstrap (4 hours)

**Create src/App.tsx:**
```typescript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './features/dashboard/Dashboard';
import { Visualization } from './features/visualization/Visualization';
import { Learning } from './features/learning/Learning';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/visualize" element={<Visualization />} />
          <Route path="/learn" element={<Learning />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
```

**Create src/components/layout/Layout.tsx:**
```typescript
import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
```

**Create src/services/api.ts:**
```typescript
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Models
  async listModels() {
    return this.client.get('/models');
  }

  async loadModel(modelPath: string) {
    return this.client.post('/models/load', { modelPath });
  }

  // Inference
  async runInference(image: File, layers: string[]) {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('layers', JSON.stringify(layers));
    return this.client.post('/inference', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
}

export const api = new ApiService();
```

**Deliverables:**
- ✅ React routing setup
- ✅ Layout components
- ✅ API service layer
- ✅ Basic pages created

---

### **Day 6-7: Development Tooling**

#### Task 1.9: Code Quality Tools (6 hours)

**Create .pre-commit-config.yaml:**
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-json
      - id: check-merge-conflict

  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
        language_version: python3.11

  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        args: ['--max-line-length=100']

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.56.0
    hooks:
      - id: eslint
        files: \.(js|ts|jsx|tsx)$
        types: [file]
```

**Create .eslintrc.json:**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

**Create .prettierrc:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

**Deliverables:**
- ✅ Pre-commit hooks configured
- ✅ Linting setup (Python & TypeScript)
- ✅ Code formatting configured

---

#### Task 1.10: CI/CD Pipeline (6 hours)

**Create .github/workflows/ci.yml:**
```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: whytebox
          POSTGRES_PASSWORD: password
          POSTGRES_DB: whytebox_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run linting
        run: |
          cd backend
          black --check .
          flake8 .
          mypy .
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql+asyncpg://whytebox:password@localhost:5432/whytebox_test
          REDIS_URL: redis://localhost:6379/0
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Run linting
        run: |
          cd frontend
          npm run lint
      
      - name: Run tests
        run: |
          cd frontend
          npm run test:coverage
      
      - name: Build
        run: |
          cd frontend
          npm run build
```

**Deliverables:**
- ✅ GitHub Actions CI pipeline
- ✅ Automated testing
- ✅ Code coverage reporting

---

### **Day 8-9: Documentation**

#### Task 1.11: Project Documentation (8 hours)

**Create docs/ARCHITECTURE.md:**
```markdown
# WhyteBox Architecture

## Overview
WhyteBox is a modern web-based platform for neural network visualization and explainability.

## System Architecture

### Frontend (React + TypeScript)
- **Framework:** React 18 with TypeScript
- **3D Engine:** BabylonJS 6.x
- **State Management:** Zustand
- **UI Library:** Tailwind CSS + shadcn/ui
- **Build Tool:** Vite

### Backend (FastAPI + Python)
- **Framework:** FastAPI
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **ML Frameworks:** PyTorch 2.0+, TensorFlow 2.15+
- **Task Queue:** Celery

### Infrastructure
- **Containerization:** Docker
- **Orchestration:** Kubernetes
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana

## Data Flow

1. User uploads model → Backend validates → Stores in database
2. User requests visualization → Backend extracts layers → Returns JSON
3. Frontend renders 3D visualization using BabylonJS
4. User runs inference → Backend processes → Returns activations
5. Frontend updates visualization with heatmaps

## Security

- JWT-based authentication
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention (SQLAlchemy ORM)
```

**Create docs/API.md:**
```markdown
# API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
All endpoints (except public ones) require JWT token:
```
Authorization: Bearer <token>
```

## Endpoints

### Models

#### List Models
```http
GET /models
```

#### Load Model
```http
POST /models/load
Content-Type: application/json

{
  "modelPath": "vgg16"
}
```

#### Upload Model
```http
POST /models/upload
Content-Type: multipart/form-data

file: <model-file>
```

### Inference

#### Run Inference
```http
POST /inference
Content-Type: multipart/form-data

image: <image-file>
layers: ["conv1", "conv2"]
```

### Explainability

#### Generate Grad-CAM
```http
POST /explainability/gradcam
Content-Type: multipart/form-data

image: <image-file>
model_path: "vgg16"
```
```

**Create docs/DEVELOPMENT.md:**
```markdown
# Development Guide

## Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Git

## Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/whytebox-v2.git
cd whytebox-v2
```

### 2. Environment Variables
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Start Development Environment
```bash
docker-compose up -d
```

### 4. Run Migrations
```bash
docker-compose exec backend alembic upgrade head
```

### 5. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Development Workflow

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Code Quality
```bash
# Install pre-commit hooks
pre-commit install

# Run manually
pre-commit run --all-files
```
```

**Deliverables:**
- ✅ Architecture documentation
- ✅ API documentation
- ✅ Development guide
- ✅ Setup instructions

---

### **Day 10: Testing & Validation**

#### Task 1.12: Smoke Tests (4 hours)

**Create backend/tests/test_health.py:**
```python
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
    
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
    
    assert response.status_code == 200
    assert "name" in response.json()
    assert response.json()["name"] == "WhyteBox API"
```

**Create frontend/src/__tests__/App.test.tsx:**
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/WhyteBox/i)).toBeInTheDocument();
  });
});
```

**Create scripts/validate-setup.sh:**
```bash
#!/bin/bash

echo "🔍 Validating WhyteBox Setup..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found"
    exit 1
fi
echo "✅ Docker installed"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found"
    exit 1
fi
echo "✅ Docker Compose installed"

# Check services
echo "🔍 Checking services..."
docker-compose ps

# Test backend
echo "🔍 Testing backend..."
curl -f http://localhost:8000/health || exit 1
echo "✅ Backend healthy"

# Test frontend
echo "🔍 Testing frontend..."
curl -f http://localhost:3000 || exit 1
echo "✅ Frontend accessible"

# Test database
echo "🔍 Testing database..."
docker-compose exec -T postgres pg_isready -U whytebox || exit 1
echo "✅ Database connected"

# Test Redis
echo "🔍 Testing Redis..."
docker-compose exec -T redis redis-cli ping || exit 1
echo "✅ Redis connected"

echo "🎉 All systems operational!"
```

**Deliverables:**
- ✅ Basic smoke tests
- ✅ Validation script
- ✅ Setup verified

---

## 📊 Phase 1 Completion Checklist

### Infrastructure ✅
- [x] Project structure created
- [x] Git repository initialized
- [x] Docker development environment
- [x] Environment configuration

### Backend ✅
- [x] FastAPI application setup
- [x] Database configuration
- [x] Redis caching setup
- [x] Basic API endpoints
- [x] Logging configured

### Frontend ✅
- [x] React + TypeScript setup
- [x] Tailwind CSS configured
- [x] Routing setup
- [x] API service layer
- [x] Basic components

### Development Tools ✅
- [x] Pre-commit hooks
- [x] Linting (Python & TypeScript)
- [x] Code formatting
- [x] CI/CD pipeline

### Documentation ✅
- [x] Architecture docs
- [x] API documentation
- [x] Development guide
- [x] Setup instructions

### Testing ✅
- [x] Backend smoke tests
- [x] Frontend smoke tests
- [x] Validation scripts

---

## 🎯 Success Criteria

Phase 1 is complete when:
1. ✅ Development environment runs with `docker-compose up`
2. ✅ Backend API accessible at http://localhost:8000
3. ✅ Frontend accessible at http://localhost:3000
4. ✅ All smoke tests pass
5. ✅ CI/CD pipeline runs successfully
6. ✅ Documentation is complete and accurate

---

## 📝 Next Steps

After Phase 1 completion, proceed to:
- **Phase 2:** Backend Modernization (migrate existing ML code)
- **Phase 3:** Frontend Rebuild (implement 3D visualization)
- **Phase 4:** Educational Features
- **Phase 5:** Testing & Quality
- **Phase 6:** Production Deployment

---

**Estimated Total Time:** 10 working days (2 weeks)  
**Team Size:** 1-2 developers  
**Complexity:** Medium