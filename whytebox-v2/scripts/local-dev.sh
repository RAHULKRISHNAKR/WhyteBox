#!/bin/bash

# WhyteBox v2.0 - Local Development Quick Start
# This script sets up local development without Docker

set -e

echo "🚀 WhyteBox v2.0 - Local Development Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Python version
echo -e "${YELLOW}📍 Checking Python version...${NC}"
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✅ Python $PYTHON_VERSION found${NC}"

# Navigate to backend directory
cd "$(dirname "$0")/../backend"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${GREEN}✅ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}🔧 Activating virtual environment...${NC}"
source venv/bin/activate

# Install minimal dependencies
echo -e "${YELLOW}📥 Installing dependencies...${NC}"
pip install --quiet --upgrade pip
pip install --quiet -r requirements-local.txt
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    cat > .env << 'EOF'
# Local Development Configuration
HOST=127.0.0.1
PORT=8000
DEBUG=true
ENVIRONMENT=development

# SQLite Database (no PostgreSQL needed)
DATABASE_URL=sqlite+aiosqlite:///./whytebox_local.db

# Redis (optional - will use in-memory if not available)
REDIS_URL=redis://localhost:6379/0

# Security
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
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p uploads models output
echo -e "${GREEN}✅ Directories created${NC}"

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "To start the development server:"
echo -e "${YELLOW}  cd backend${NC}"
echo -e "${YELLOW}  source venv/bin/activate${NC}"
echo -e "${YELLOW}  uvicorn app.main:app --reload${NC}"
echo ""
echo "Then visit:"
echo "  • API: http://localhost:8000"
echo "  • Docs: http://localhost:8000/docs"
echo "  • Health: http://localhost:8000/health"
echo ""

# Made with Bob
