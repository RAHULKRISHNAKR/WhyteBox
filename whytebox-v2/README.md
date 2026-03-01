# WhyteBox v2.0 - Neural Network Visualization Platform

> **🚀 Modern rebuild of WhyteBox as a production-ready educational platform**

## 📋 Project Status

**Phase 1: Project Setup & Architecture** - ✅ In Progress

- [x] Project structure created
- [x] Backend foundation (FastAPI)
- [x] Docker development environment
- [x] Configuration management
- [ ] Frontend setup (React + TypeScript)
- [ ] Development tooling
- [ ] Documentation
- [ ] Testing infrastructure

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- BabylonJS 6.x (3D visualization)
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- Vite (build tool)

**Backend:**
- FastAPI (Python 3.11+)
- PostgreSQL 15 (database)
- Redis 7 (caching)
- SQLAlchemy 2.0 (ORM)
- PyTorch 2.0+ / TensorFlow 2.15+

**Infrastructure:**
- Docker + Docker Compose
- Kubernetes (production)
- GitHub Actions (CI/CD)

## 📁 Project Structure

```
whytebox-v2/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/v1/         # API endpoints
│   │   ├── core/           # Core configuration
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── ml/             # ML-specific code
│   │   └── utils/          # Utilities
│   ├── tests/              # Backend tests
│   ├── requirements.txt    # Python dependencies
│   └── pyproject.toml      # Tool configuration
│
├── frontend/               # React frontend (to be created)
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── features/      # Feature modules
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   └── store/         # State management
│   └── package.json
│
├── infrastructure/         # Infrastructure as Code
│   └── docker/
│       ├── Dockerfile.backend.dev
│       └── Dockerfile.frontend.dev
│
├── docs/                   # Documentation (to be created)
├── shared/                 # Shared code/types
└── docker-compose.yml      # Development environment
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for local development)
- Node.js 18+ (for local development)

### Setup

1. **Clone the repository**
   ```bash
   cd whytebox-v2
   ```

2. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your settings
   ```

3. **Start development environment**
   ```bash
   docker-compose up -d
   ```

4. **Access services**
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Frontend: http://localhost:3000 (when ready)
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

### Development

**Backend (local):**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend (local - when ready):**
```bash
cd frontend
npm install
npm run dev
```

## 📚 Documentation

- [Phase 1 Detailed Plan](../PHASE_1_DETAILED_PLAN.md) - Complete implementation guide
- [Architecture Documentation](docs/ARCHITECTURE.md) - System design (to be created)
- [API Documentation](http://localhost:8000/docs) - Interactive API docs
- [Development Guide](docs/DEVELOPMENT.md) - Developer setup (to be created)

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests (when ready)
cd frontend
npm test
```

## 📊 Implementation Timeline

- **Week 1-2:** Project Setup & Architecture ⏳
- **Week 3-4:** Backend Modernization
- **Week 5-6:** Frontend Rebuild
- **Week 7-8:** Educational Features
- **Week 9-10:** Testing & Quality
- **Week 11-12:** Production Deployment

## 🎯 Key Features (Planned)

### Core Features
- ✅ Modern FastAPI backend
- ✅ PostgreSQL database
- ✅ Redis caching
- ⏳ React + TypeScript frontend
- ⏳ 3D neural network visualization
- ⏳ Live inference with activation heatmaps
- ⏳ Multiple explainability methods (Grad-CAM, Saliency, Integrated Gradients)

### Educational Features
- ⏳ Interactive tutorials
- ⏳ Learning modules
- ⏳ Pre-loaded examples
- ⏳ Guided tours

### Production Features
- ⏳ User authentication
- ⏳ Session management
- ⏳ Model versioning
- ⏳ Real-time updates (WebSocket)
- ⏳ Comprehensive testing
- ⏳ CI/CD pipeline
- ⏳ Kubernetes deployment

## 🤝 Contributing

This is a rebuild project. See [PHASE_1_DETAILED_PLAN.md](../PHASE_1_DETAILED_PLAN.md) for implementation details.

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Original WhyteBox project
- BabylonJS community
- FastAPI framework
- PyTorch & TensorFlow teams

---

**Status:** Phase 1 in progress - Backend foundation complete, Frontend setup next  
**Last Updated:** 2026-02-25