# WhyteBox v2.0 Architecture Documentation

**Version:** 2.0.0  
**Last Updated:** 2026-02-25  
**Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Data Flow](#data-flow)
6. [Technology Stack](#technology-stack)
7. [Design Patterns](#design-patterns)
8. [Security Architecture](#security-architecture)
9. [Scalability](#scalability)
10. [Deployment Architecture](#deployment-architecture)

---

## Overview

WhyteBox v2.0 is a modern, production-ready educational platform for visualizing and understanding neural network architectures through interactive 3D visualization and explainability tools.

### Key Objectives

- **Educational Focus:** Make deep learning accessible through visualization
- **Interactive Experience:** Real-time 3D neural network exploration
- **Explainability:** Understand model decisions with multiple XAI methods
- **Production Ready:** Scalable, secure, and maintainable architecture
- **Developer Friendly:** Clean code, comprehensive documentation, automated testing

### Core Features

1. **3D Visualization:** Interactive BabylonJS-powered neural network rendering
2. **Model Management:** Upload, browse, and manage ML models
3. **Inference Engine:** Real-time model inference with multiple frameworks
4. **Explainability Tools:** Grad-CAM, Saliency Maps, Integrated Gradients
5. **Educational Content:** Tutorials, guides, and interactive lessons

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Browser    │  │    Mobile    │  │   Desktop    │     │
│  │  (React/TS)  │  │   (Future)   │  │   (Future)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/WSS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              FastAPI Application                      │  │
│  │  - REST API Endpoints                                 │  │
│  │  - WebSocket Support                                  │  │
│  │  - Authentication & Authorization                     │  │
│  │  - Rate Limiting                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Business Logic Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Model     │  │  Inference   │  │Explainability│     │
│  │  Management  │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Visualization│  │   Tutorial   │  │   Dataset    │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │    Redis     │  │  File Store  │     │
│  │  (Metadata)  │  │   (Cache)    │  │   (Models)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction

```
User Request Flow:
1. User → Frontend (React)
2. Frontend → API Gateway (FastAPI)
3. API Gateway → Business Logic (Services)
4. Business Logic → Data Layer (DB/Cache/Storage)
5. Data Layer → Business Logic (Response)
6. Business Logic → API Gateway (Processed Data)
7. API Gateway → Frontend (JSON Response)
8. Frontend → User (Rendered UI)
```

---

## Backend Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Endpoints (FastAPI Routes)                      │  │
│  │  - Request Validation (Pydantic)                     │  │
│  │  - Response Serialization                            │  │
│  │  - Error Handling                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Services (Domain Logic)                             │  │
│  │  - Model Management Service                          │  │
│  │  - Inference Service                                 │  │
│  │  - Explainability Service                            │  │
│  │  - Visualization Service                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Repositories (Data Operations)                      │  │
│  │  - Database Operations (SQLAlchemy)                  │  │
│  │  - Cache Operations (Redis)                          │  │
│  │  - File Operations (S3/Local)                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         Data Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │    Redis     │  │  File Store  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
backend/
├── app/
│   ├── api/                    # API layer
│   │   └── v1/
│   │       ├── endpoints/      # Route handlers
│   │       └── dependencies/   # Dependency injection
│   ├── core/                   # Core functionality
│   │   ├── config.py          # Configuration
│   │   ├── database.py        # Database setup
│   │   ├── security.py        # Security utilities
│   │   └── logging_config.py  # Logging setup
│   ├── models/                 # Database models
│   │   ├── user.py
│   │   ├── model.py
│   │   └── dataset.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── user.py
│   │   ├── model.py
│   │   └── inference.py
│   ├── services/               # Business logic
│   │   ├── model_service.py
│   │   ├── inference_service.py
│   │   └── explainability_service.py
│   ├── repositories/           # Data access
│   │   ├── model_repository.py
│   │   └── user_repository.py
│   └── utils/                  # Utilities
│       ├── ml_utils.py
│       └── file_utils.py
├── tests/                      # Tests
│   ├── unit/
│   ├── integration/
│   └── conftest.py
└── main.py                     # Application entry
```

### Key Components

#### 1. API Layer (`app/api/`)
- **Purpose:** Handle HTTP requests and responses
- **Responsibilities:**
  - Request validation
  - Response serialization
  - Error handling
  - Authentication/Authorization
- **Technologies:** FastAPI, Pydantic

#### 2. Business Logic Layer (`app/services/`)
- **Purpose:** Implement domain logic
- **Responsibilities:**
  - Model management
  - Inference execution
  - Explainability computation
  - Data transformation
- **Technologies:** PyTorch, TensorFlow, NumPy

#### 3. Data Access Layer (`app/repositories/`)
- **Purpose:** Abstract data operations
- **Responsibilities:**
  - Database CRUD operations
  - Cache management
  - File storage operations
- **Technologies:** SQLAlchemy, Redis, S3

#### 4. Core Layer (`app/core/`)
- **Purpose:** Shared functionality
- **Responsibilities:**
  - Configuration management
  - Database connection
  - Security utilities
  - Logging setup
- **Technologies:** Pydantic Settings, Python logging

---

## Frontend Architecture

### Component-Based Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  App.tsx (Root Component)                            │  │
│  │  - Routing (React Router)                            │  │
│  │  - Global State (Zustand)                            │  │
│  │  - Theme Management                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Page Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   HomePage   │  │  ModelsPage  │  │VisualizePage │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │TutorialsPage │  │  AboutPage   │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Component Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Layout     │  │  ModelCard   │  │ 3DVisualize  │     │
│  │  Components  │  │  Components  │  │  Components  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  API Client  │  │    Zustand   │  │   BabylonJS  │     │
│  │   (Axios)    │  │    Store     │  │SceneManager  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
frontend/
├── src/
│   ├── components/             # Reusable components
│   │   ├── layout/            # Layout components
│   │   ├── models/            # Model-related components
│   │   ├── visualization/     # Visualization components
│   │   └── common/            # Shared components
│   ├── pages/                 # Page components
│   │   ├── HomePage.tsx
│   │   ├── ModelsPage.tsx
│   │   └── VisualizationPage.tsx
│   ├── services/              # API services
│   │   └── api.ts            # API client
│   ├── store/                 # State management
│   │   └── useStore.ts       # Zustand store
│   ├── babylon/               # 3D visualization
│   │   └── SceneManager.ts   # BabylonJS manager
│   ├── hooks/                 # Custom hooks
│   ├── utils/                 # Utility functions
│   ├── types/                 # TypeScript types
│   ├── App.tsx               # Root component
│   └── main.tsx              # Entry point
└── public/                    # Static assets
```

### State Management

```typescript
// Zustand Store Structure
{
  // User state
  user: User | null,
  
  // Models state
  models: Model[],
  selectedModel: Model | null,
  loadingModels: boolean,
  
  // Visualization state
  visualizationConfig: VisualizationConfig,
  visualizationState: VisualizationState,
  
  // UI state
  sidebarOpen: boolean,
  theme: 'light' | 'dark' | 'auto',
  notifications: Notification[],
  
  // Loading & Error
  isLoading: boolean,
  error: string | null
}
```

---

## Data Flow

### Model Upload Flow

```
1. User selects model file
   ↓
2. Frontend validates file
   ↓
3. POST /api/v1/models/upload
   ↓
4. Backend validates model format
   ↓
5. Extract model metadata
   ↓
6. Store model file (S3/Local)
   ↓
7. Save metadata to PostgreSQL
   ↓
8. Return model info to frontend
   ↓
9. Update UI with new model
```

### Inference Flow

```
1. User provides input data
   ↓
2. Frontend sends inference request
   ↓
3. POST /api/v1/inference
   ↓
4. Load model from cache/storage
   ↓
5. Preprocess input data
   ↓
6. Run model inference
   ↓
7. Postprocess output
   ↓
8. Return predictions
   ↓
9. Display results in UI
```

### Visualization Flow

```
1. User selects model
   ↓
2. Fetch model architecture
   ↓
3. GET /api/v1/models/{id}
   ↓
4. Parse layer information
   ↓
5. Initialize BabylonJS scene
   ↓
6. Create 3D meshes for layers
   ↓
7. Render connections
   ↓
8. Enable user interaction
   ↓
9. Update on user input
```

---

## Technology Stack

### Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | FastAPI | High-performance async API |
| Database | PostgreSQL 15 | Relational data storage |
| Cache | Redis 7 | Session & data caching |
| ORM | SQLAlchemy 2.0 | Database abstraction |
| Validation | Pydantic | Data validation |
| ML Framework | PyTorch | Neural network inference |
| ML Framework | TensorFlow | Neural network inference |
| Task Queue | Celery | Async task processing |
| Storage | S3/MinIO | Model file storage |

### Frontend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 18 | UI library |
| Language | TypeScript 5.3 | Type safety |
| Build Tool | Vite 5 | Fast bundling |
| 3D Engine | BabylonJS 6 | 3D visualization |
| State | Zustand 4 | State management |
| Routing | React Router 6 | Client-side routing |
| Styling | Tailwind CSS 3 | Utility-first CSS |
| HTTP Client | Axios | API communication |

### DevOps

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Containerization | Docker | Application packaging |
| Orchestration | Docker Compose | Local development |
| CI/CD | GitHub Actions | Automation |
| Code Quality | SonarCloud | Code analysis |
| Security | Trivy, Bandit | Vulnerability scanning |
| Monitoring | Prometheus | Metrics collection |
| Logging | ELK Stack | Log aggregation |

---

## Design Patterns

### Backend Patterns

#### 1. Repository Pattern
```python
class ModelRepository:
    """Abstracts data access for models"""
    
    async def get_by_id(self, model_id: str) -> Model:
        """Fetch model by ID"""
        
    async def create(self, model: ModelCreate) -> Model:
        """Create new model"""
        
    async def update(self, model_id: str, data: ModelUpdate) -> Model:
        """Update existing model"""
```

#### 2. Service Pattern
```python
class InferenceService:
    """Business logic for model inference"""
    
    def __init__(self, model_repo: ModelRepository):
        self.model_repo = model_repo
        
    async def run_inference(self, request: InferenceRequest) -> InferenceResult:
        """Execute model inference"""
```

#### 3. Dependency Injection
```python
async def get_model_service(
    db: Session = Depends(get_db)
) -> ModelService:
    """Inject dependencies"""
    repo = ModelRepository(db)
    return ModelService(repo)
```

### Frontend Patterns

#### 1. Container/Presenter Pattern
```typescript
// Container (logic)
const ModelsPageContainer = () => {
  const { models, fetchModels } = useModels();
  
  useEffect(() => {
    fetchModels();
  }, []);
  
  return <ModelsPagePresenter models={models} />;
};

// Presenter (UI)
const ModelsPagePresenter = ({ models }) => {
  return <div>{models.map(model => <ModelCard model={model} />)}</div>;
};
```

#### 2. Custom Hooks Pattern
```typescript
const useModels = () => {
  const { models, setModels } = useStore();
  
  const fetchModels = async () => {
    const data = await api.getModels();
    setModels(data);
  };
  
  return { models, fetchModels };
};
```

#### 3. Render Props Pattern
```typescript
<DataFetcher
  url="/api/models"
  render={(data, loading, error) => (
    loading ? <Spinner /> : <ModelList models={data} />
  )}
/>
```

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
│                                                              │
│  1. User Login                                              │
│     ↓                                                        │
│  2. Validate Credentials                                    │
│     ↓                                                        │
│  3. Generate JWT Token                                      │
│     ↓                                                        │
│  4. Return Token to Client                                  │
│     ↓                                                        │
│  5. Client Stores Token (localStorage)                      │
│     ↓                                                        │
│  6. Include Token in Requests (Authorization header)        │
│     ↓                                                        │
│  7. Validate Token on Each Request                          │
│     ↓                                                        │
│  8. Check User Permissions                                  │
│     ↓                                                        │
│  9. Allow/Deny Access                                       │
└─────────────────────────────────────────────────────────────┘
```

### Security Measures

1. **Input Validation:** Pydantic schemas validate all inputs
2. **SQL Injection Prevention:** SQLAlchemy ORM with parameterized queries
3. **XSS Protection:** React auto-escapes content
4. **CSRF Protection:** SameSite cookies, CSRF tokens
5. **Rate Limiting:** Redis-based rate limiting
6. **HTTPS Only:** TLS 1.3 encryption
7. **Security Headers:** HSTS, CSP, X-Frame-Options
8. **Dependency Scanning:** Automated vulnerability checks

---

## Scalability

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                           │
│                     (NGINX/HAProxy)                          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Backend    │    │   Backend    │    │   Backend    │
│  Instance 1  │    │  Instance 2  │    │  Instance 3  │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   Shared Resources    │
                │  - PostgreSQL         │
                │  - Redis              │
                │  - S3 Storage         │
                └───────────────────────┘
```

### Caching Strategy

1. **Application Cache:** Redis for session data
2. **Database Cache:** PostgreSQL query cache
3. **CDN Cache:** Static assets (CloudFront/CloudFlare)
4. **Browser Cache:** Client-side caching
5. **Model Cache:** In-memory model caching

### Performance Optimization

- **Async Operations:** FastAPI async endpoints
- **Connection Pooling:** Database connection pools
- **Lazy Loading:** Load data on demand
- **Code Splitting:** Frontend bundle optimization
- **Image Optimization:** WebP format, lazy loading
- **Database Indexing:** Optimized queries

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      CDN (CloudFront)                        │
│                    - Static Assets                           │
│                    - Edge Caching                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Load Balancer (ALB)                        │
│                    - SSL Termination                         │
│                    - Health Checks                           │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   ECS Task   │    │   ECS Task   │    │   ECS Task   │
│   Backend    │    │   Backend    │    │   Backend    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     RDS      │  │  ElastiCache │  │      S3      │     │
│  │ (PostgreSQL) │  │   (Redis)    │  │   (Models)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Strategy

1. **Blue-Green Deployment:** Zero-downtime deployments
2. **Rolling Updates:** Gradual instance updates
3. **Canary Releases:** Test with small user percentage
4. **Rollback Capability:** Quick rollback on issues
5. **Health Checks:** Automated health monitoring

---

## Conclusion

WhyteBox v2.0 is built on a modern, scalable, and maintainable architecture that prioritizes:

- **Performance:** Async operations, caching, optimization
- **Security:** Multiple layers of protection
- **Scalability:** Horizontal scaling, load balancing
- **Maintainability:** Clean code, documentation, testing
- **Developer Experience:** Modern tools, automation, CI/CD

This architecture provides a solid foundation for building an educational platform that can scale to serve thousands of users while maintaining high performance and reliability.

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-25  
**Maintained By:** WhyteBox Development Team