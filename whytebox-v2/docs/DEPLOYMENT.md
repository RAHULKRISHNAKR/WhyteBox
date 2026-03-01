# WhyteBox v2.0 Deployment Guide

**Version:** 2.0.0  
**Last Updated:** 2026-02-25

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Cloud Platforms](#cloud-platforms)
7. [Configuration](#configuration)
8. [Monitoring](#monitoring)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deploying WhyteBox v2.0 in various environments, from local development to production cloud deployments.

### Deployment Options

| Environment | Use Case | Complexity | Cost |
|-------------|----------|------------|------|
| Local Dev | Development & testing | Low | Free |
| Docker | Containerized deployment | Medium | Low |
| AWS | Production cloud | High | Variable |
| Azure | Enterprise cloud | High | Variable |
| GCP | Google cloud | High | Variable |
| Kubernetes | Large-scale orchestration | Very High | Variable |

---

## Prerequisites

### System Requirements

#### Minimum (Development)
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 10 GB
- **OS**: Linux, macOS, Windows 10+

#### Recommended (Production)
- **CPU**: 4+ cores
- **RAM**: 16 GB
- **Storage**: 50 GB SSD
- **OS**: Ubuntu 22.04 LTS or similar

### Software Requirements

- **Python**: 3.11+
- **Node.js**: 18+
- **PostgreSQL**: 15+ (production)
- **Redis**: 7+ (production)
- **Docker**: 24+ (optional)
- **Docker Compose**: 2.20+ (optional)

---

## Local Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/whytebox-v2.git
cd whytebox-v2

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start development servers
make dev
```

### Manual Setup

#### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
alembic upgrade head

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

### Environment Variables

#### Backend (.env)
```bash
# Application
APP_NAME=WhyteBox
APP_VERSION=2.0.0
DEBUG=true
ENVIRONMENT=development

# Database
DATABASE_URL=sqlite:///./whytebox.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/whytebox

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=["http://localhost:3000"]

# File Upload
MAX_UPLOAD_SIZE=524288000  # 500MB
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=INFO
```

#### Frontend (.env.local)
```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_APP_NAME=WhyteBox
VITE_APP_VERSION=2.0.0
```

---

## Docker Deployment

### Using Docker Compose

#### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

#### Production

```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Update services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Docker Compose Configuration

#### docker-compose.yml (Development)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: whytebox
      POSTGRES_PASSWORD: whytebox_dev
      POSTGRES_DB: whytebox
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.backend.dev
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://whytebox:whytebox_dev@postgres:5432/whytebox
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
      - ./uploads:/app/uploads
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.frontend.dev
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

#### docker-compose.prod.yml (Production)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.backend.prod
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      SECRET_KEY: ${SECRET_KEY}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 2G

  frontend:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.frontend.prod
    environment:
      VITE_API_URL: ${API_URL}
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./infrastructure/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  postgres_data:
  redis_data:
```

### Production Dockerfiles

#### Dockerfile.backend.prod
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/app ./app

# Create non-root user
RUN useradd -m -u 1000 whytebox && \
    chown -R whytebox:whytebox /app
USER whytebox

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

#### Dockerfile.frontend.prod
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY frontend/ .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY infrastructure/nginx/frontend.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

---

## Production Deployment

### AWS Deployment

#### Using EC2

1. **Launch EC2 Instance**
```bash
# Instance type: t3.medium or larger
# AMI: Ubuntu 22.04 LTS
# Security groups: Allow 80, 443, 22
```

2. **Connect and Setup**
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone https://github.com/your-org/whytebox-v2.git
cd whytebox-v2

# Setup environment
cp .env.example .env
# Edit .env with production values

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

#### Using ECS (Elastic Container Service)

1. **Create ECR Repositories**
```bash
aws ecr create-repository --repository-name whytebox-backend
aws ecr create-repository --repository-name whytebox-frontend
```

2. **Build and Push Images**
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build images
docker build -f infrastructure/docker/Dockerfile.backend.prod -t whytebox-backend .
docker build -f infrastructure/docker/Dockerfile.frontend.prod -t whytebox-frontend .

# Tag images
docker tag whytebox-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/whytebox-backend:latest
docker tag whytebox-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/whytebox-frontend:latest

# Push images
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/whytebox-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/whytebox-frontend:latest
```

3. **Create ECS Task Definition**
```json
{
  "family": "whytebox",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/whytebox-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql+asyncpg://..."
        }
      ]
    }
  ]
}
```

#### Using RDS for Database

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
    --db-instance-identifier whytebox-db \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --engine-version 15.3 \
    --master-username admin \
    --master-user-password <password> \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxxxx

# Get endpoint
aws rds describe-db-instances \
    --db-instance-identifier whytebox-db \
    --query 'DBInstances[0].Endpoint.Address'
```

### Azure Deployment

#### Using Azure Container Instances

```bash
# Login
az login

# Create resource group
az group create --name whytebox-rg --location eastus

# Create container registry
az acr create --resource-group whytebox-rg --name whyteboxacr --sku Basic

# Build and push images
az acr build --registry whyteboxacr --image whytebox-backend:latest -f infrastructure/docker/Dockerfile.backend.prod .
az acr build --registry whyteboxacr --image whytebox-frontend:latest -f infrastructure/docker/Dockerfile.frontend.prod .

# Create container instance
az container create \
    --resource-group whytebox-rg \
    --name whytebox-backend \
    --image whyteboxacr.azurecr.io/whytebox-backend:latest \
    --cpu 2 \
    --memory 4 \
    --registry-login-server whyteboxacr.azurecr.io \
    --registry-username <username> \
    --registry-password <password> \
    --dns-name-label whytebox-api \
    --ports 8000
```

### GCP Deployment

#### Using Cloud Run

```bash
# Login
gcloud auth login

# Set project
gcloud config set project whytebox-project

# Build and push images
gcloud builds submit --tag gcr.io/whytebox-project/backend -f infrastructure/docker/Dockerfile.backend.prod .
gcloud builds submit --tag gcr.io/whytebox-project/frontend -f infrastructure/docker/Dockerfile.frontend.prod .

# Deploy to Cloud Run
gcloud run deploy whytebox-backend \
    --image gcr.io/whytebox-project/backend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars DATABASE_URL=<url>

gcloud run deploy whytebox-frontend \
    --image gcr.io/whytebox-project/frontend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated
```

---

## Configuration

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/whytebox
upstream backend {
    least_conn;
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

server {
    listen 80;
    server_name whytebox.com www.whytebox.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name whytebox.com www.whytebox.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files
    location /static/ {
        alias /app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### SSL/TLS Setup

#### Using Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d whytebox.com -d www.whytebox.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Monitoring

### Application Monitoring

#### Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```

### Log Aggregation

#### ELK Stack

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.10.0
    volumes:
      - ./infrastructure/logstash/logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:8.10.0
    ports:
      - "5601:5601"
```

---

## Backup & Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="whytebox_backup_$DATE.sql"

# Backup
pg_dump -h localhost -U whytebox whytebox > "$BACKUP_DIR/$FILENAME"

# Compress
gzip "$BACKUP_DIR/$FILENAME"

# Upload to S3
aws s3 cp "$BACKUP_DIR/$FILENAME.gz" s3://whytebox-backups/

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### Restore Database

```bash
# Download from S3
aws s3 cp s3://whytebox-backups/whytebox_backup_20260225.sql.gz .

# Decompress
gunzip whytebox_backup_20260225.sql.gz

# Restore
psql -h localhost -U whytebox whytebox < whytebox_backup_20260225.sql
```

---

## Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker-compose logs backend

# Check container status
docker ps -a

# Restart container
docker-compose restart backend
```

#### Database Connection Issues
```bash
# Test connection
docker-compose exec backend python -c "from app.core.database import engine; print(engine)"

# Check PostgreSQL logs
docker-compose logs postgres
```

#### High Memory Usage
```bash
# Check resource usage
docker stats

# Limit container resources
docker-compose up -d --scale backend=2 --memory=2g
```

---

**Version:** 2.0.0  
**Last Updated:** 2026-02-25  
**Support:** devops@whytebox.com