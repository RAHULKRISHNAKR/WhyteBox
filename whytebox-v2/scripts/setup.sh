#!/bin/bash

# WhyteBox v2.0 Setup Script
# This script sets up the development environment

set -e

echo "🚀 WhyteBox v2.0 Setup"
echo "====================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi
echo -e "${GREEN}✅ Docker found${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose found${NC}"

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}📝 Creating backend/.env from template...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✅ Created backend/.env${NC}"
    echo -e "${YELLOW}⚠️  Please edit backend/.env and update SECRET_KEY and other settings${NC}"
else
    echo -e "${GREEN}✅ backend/.env already exists${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p backend/uploads
mkdir -p backend/models
mkdir -p backend/output
echo -e "${GREEN}✅ Directories created${NC}"

# Pull Docker images
echo -e "${YELLOW}🐳 Pulling Docker images...${NC}"
docker-compose pull

# Build Docker images
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
docker-compose build

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if PostgreSQL is ready
until docker-compose exec -T postgres pg_isready -U whytebox > /dev/null 2>&1; do
    echo -e "${YELLOW}⏳ Waiting for PostgreSQL...${NC}"
    sleep 2
done
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Check if Redis is ready
echo -e "${YELLOW}⏳ Checking Redis...${NC}"
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo -e "${YELLOW}⏳ Waiting for Redis...${NC}"
    sleep 2
done
echo -e "${GREEN}✅ Redis is ready${NC}"

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and update SECRET_KEY"
echo "2. Start all services: docker-compose up -d"
echo "3. View logs: docker-compose logs -f"
echo "4. Access API: http://localhost:8000"
echo "5. Access API docs: http://localhost:8000/docs"
echo ""
echo "To stop services: docker-compose down"
echo "To rebuild: docker-compose build"
echo ""

# Made with Bob
