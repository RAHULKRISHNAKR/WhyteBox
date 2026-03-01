.PHONY: help install install-dev setup clean test lint format docker-up docker-down

# Default target
help:
	@echo "WhyteBox v2.0 - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install        Install production dependencies"
	@echo "  make install-dev    Install development dependencies"
	@echo "  make setup          Complete project setup"
	@echo ""
	@echo "Development:"
	@echo "  make dev-backend    Start backend development server"
	@echo "  make dev-frontend   Start frontend development server"
	@echo "  make dev            Start both backend and frontend"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint           Run all linters"
	@echo "  make lint-backend   Run backend linters"
	@echo "  make lint-frontend  Run frontend linters"
	@echo "  make format         Format all code"
	@echo "  make format-backend Format backend code"
	@echo "  make format-frontend Format frontend code"
	@echo "  make type-check     Run type checking"
	@echo ""
	@echo "Testing:"
	@echo "  make test           Run all tests"
	@echo "  make test-backend   Run backend tests"
	@echo "  make test-frontend  Run frontend tests"
	@echo "  make test-cov       Run tests with coverage"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up      Start Docker services"
	@echo "  make docker-down    Stop Docker services"
	@echo "  make docker-build   Build Docker images"
	@echo "  make docker-logs    View Docker logs"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean          Clean build artifacts"
	@echo "  make clean-all      Clean everything including dependencies"

# Installation
install:
	@echo "Installing production dependencies..."
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

install-dev:
	@echo "Installing development dependencies..."
	cd backend && pip install -r requirements.txt -r requirements-dev.txt
	cd frontend && npm install
	pre-commit install

setup: install-dev
	@echo "Setting up project..."
	cp backend/.env.example backend/.env || true
	cp frontend/.env.example frontend/.env || true
	@echo "Setup complete! Run 'make dev' to start development servers."

# Development
dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@make -j2 dev-backend dev-frontend

# Code Quality
lint: lint-backend lint-frontend

lint-backend:
	@echo "Running backend linters..."
	cd backend && black --check .
	cd backend && isort --check-only .
	cd backend && flake8 .
	cd backend && mypy app/

lint-frontend:
	@echo "Running frontend linters..."
	cd frontend && npm run lint

format: format-backend format-frontend

format-backend:
	@echo "Formatting backend code..."
	cd backend && black .
	cd backend && isort .

format-frontend:
	@echo "Formatting frontend code..."
	cd frontend && npm run format || npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,md}"

type-check:
	@echo "Running type checks..."
	cd backend && mypy app/
	cd frontend && npm run type-check

# Testing
test: test-backend test-frontend

test-backend:
	@echo "Running backend tests..."
	cd backend && pytest

test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm run test

test-cov:
	@echo "Running tests with coverage..."
	cd backend && pytest --cov=app --cov-report=html --cov-report=term-missing
	cd frontend && npm run test -- --coverage

# Docker
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build

docker-logs:
	docker-compose logs -f

docker-restart: docker-down docker-up

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	find . -type f -name ".coverage" -delete 2>/dev/null || true
	rm -rf backend/htmlcov 2>/dev/null || true
	rm -rf frontend/dist 2>/dev/null || true
	rm -rf frontend/build 2>/dev/null || true
	rm -rf frontend/coverage 2>/dev/null || true
	rm -rf frontend/.vite 2>/dev/null || true

clean-all: clean
	@echo "Cleaning all dependencies..."
	rm -rf backend/venv 2>/dev/null || true
	rm -rf backend/.venv 2>/dev/null || true
	rm -rf frontend/node_modules 2>/dev/null || true
	rm -rf frontend/package-lock.json 2>/dev/null || true

# Database
db-migrate:
	@echo "Running database migrations..."
	cd backend && alembic upgrade head

db-rollback:
	@echo "Rolling back database migration..."
	cd backend && alembic downgrade -1

db-reset:
	@echo "Resetting database..."
	cd backend && alembic downgrade base
	cd backend && alembic upgrade head

# Pre-commit
pre-commit-install:
	pre-commit install

pre-commit-run:
	pre-commit run --all-files

pre-commit-update:
	pre-commit autoupdate