/**
 * Sample Documentation Article: Getting Started Guide
 * 
 * Demonstrates the documentation system with:
 * - Markdown content with code examples
 * - Interactive demos
 * - Multiple sections
 * - Code syntax highlighting
 */

import { DocArticle } from '../../types/documentation';

export const gettingStartedGuide: DocArticle = {
  id: 'getting-started-guide',
  title: 'Getting Started with WhyteBox',
  slug: 'getting-started-guide',
  category: 'getting-started',
  difficulty: 'beginner',
  description: 'Learn the basics of WhyteBox AI Explainability Platform and start analyzing your models in minutes.',
  content: `
# Getting Started with WhyteBox

Welcome to WhyteBox! This guide will help you get started with our AI explainability platform.

## What is WhyteBox?

WhyteBox is a comprehensive platform for understanding and explaining AI model decisions. It provides:

- **Multiple Explainability Methods**: Grad-CAM, Saliency Maps, Integrated Gradients, and more
- **Interactive Visualizations**: 3D model architecture exploration with BabylonJS
- **Educational Resources**: Tutorials, quizzes, and learning paths
- **Production-Ready Tools**: REST API, WebSocket support, and batch processing

## Prerequisites

Before you begin, ensure you have:

- Python 3.9 or higher
- Node.js 18 or higher
- Docker and Docker Compose (for local development)
- Basic understanding of neural networks

## Installation

### Using Docker (Recommended)

\`\`\`bash
# Clone the repository
git clone https://github.com/your-org/whytebox.git
cd whytebox

# Start the development environment
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
\`\`\`

### Manual Installation

#### Backend Setup

\`\`\`bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --port 8000
\`\`\`

#### Frontend Setup

\`\`\`bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
\`\`\`

## Quick Start

### 1. Upload Your Model

\`\`\`python
import requests

# Upload a PyTorch model
with open('model.pth', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/v1/models/upload',
        files={'file': f},
        data={
            'name': 'My Model',
            'framework': 'pytorch',
            'task': 'classification'
        }
    )

model_id = response.json()['id']
print(f"Model uploaded with ID: {model_id}")
\`\`\`

### 2. Run Inference

\`\`\`python
# Run inference on an image
with open('image.jpg', 'rb') as f:
    response = requests.post(
        f'http://localhost:8000/api/v1/inference/{model_id}',
        files={'image': f}
    )

predictions = response.json()['predictions']
print(f"Top prediction: {predictions[0]}")
\`\`\`

### 3. Generate Explanations

\`\`\`python
# Generate Grad-CAM visualization
response = requests.post(
    f'http://localhost:8000/api/v1/explainability/gradcam',
    json={
        'model_id': model_id,
        'image_path': 'image.jpg',
        'target_layer': 'layer4',
        'target_class': 0
    }
)

heatmap_url = response.json()['heatmap_url']
print(f"Heatmap available at: {heatmap_url}")
\`\`\`

## Core Concepts

### Explainability Methods

WhyteBox supports multiple explainability techniques:

#### Grad-CAM (Gradient-weighted Class Activation Mapping)

Grad-CAM produces visual explanations by highlighting regions that are important for predictions.

**When to use:**
- Understanding which parts of an image influenced the prediction
- Debugging model behavior
- Building trust in model decisions

**Example:**

\`\`\`python
from whytebox import GradCAM

# Initialize Grad-CAM
gradcam = GradCAM(model, target_layer='layer4')

# Generate heatmap
heatmap = gradcam.generate(image, target_class=0)

# Visualize
gradcam.visualize(image, heatmap, save_path='output.jpg')
\`\`\`

#### Saliency Maps

Saliency maps show pixel-level importance by computing gradients.

**When to use:**
- Fine-grained analysis of input features
- Understanding pixel-level contributions
- Comparing different inputs

#### Integrated Gradients

Integrated Gradients provides attribution scores by integrating gradients along a path.

**When to use:**
- More robust explanations than simple gradients
- Satisfying sensitivity and implementation invariance
- Research and production applications

## Architecture Overview

WhyteBox follows a modern microservices architecture:

\`\`\`
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Database   │
│  (React)    │     │  (FastAPI)  │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │   (Cache)   │
                    └─────────────┘
\`\`\`

### Key Components

1. **Frontend**: React 18 + TypeScript + Material-UI
2. **Backend**: FastAPI + SQLAlchemy + Celery
3. **Database**: PostgreSQL 15
4. **Cache**: Redis 7
5. **Visualization**: BabylonJS 6

## Next Steps

Now that you have WhyteBox running, explore these resources:

- [Understanding Grad-CAM](/docs/understanding-gradcam) - Deep dive into Grad-CAM
- [Model Architecture Visualization](/docs/model-architecture) - Explore 3D visualizations
- [API Reference](/docs/api-reference) - Complete API documentation
- [Tutorials](/tutorials) - Step-by-step tutorials
- [Examples](/examples) - Real-world examples

## Common Issues

### Port Already in Use

If you see "port already in use" errors:

\`\`\`bash
# Find and kill the process using the port
lsof -ti:8000 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
\`\`\`

### Docker Issues

If Docker containers fail to start:

\`\`\`bash
# Clean up and restart
docker-compose down -v
docker-compose up -d --build
\`\`\`

### Import Errors

If you encounter import errors:

\`\`\`bash
# Ensure you're in the virtual environment
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
\`\`\`

## Getting Help

Need assistance? Here are your options:

- **Documentation**: Browse our comprehensive docs
- **Tutorials**: Follow step-by-step guides
- **Community**: Join our discussion forum
- **Issues**: Report bugs on GitHub
- **Support**: Contact support@whytebox.ai

## What's Next?

Continue your learning journey:

1. Complete the [Grad-CAM Tutorial](/tutorials/gradcam-basics)
2. Take the [Neural Networks Quiz](/quizzes/neural-networks-intro)
3. Enroll in the [AI Explainability Learning Path](/learning-paths/ai-explainability)
4. Explore [Example Projects](/examples)

Happy exploring! 🚀
`,
  tags: ['beginner', 'setup', 'installation', 'quickstart'],
  author: {
    id: 'system',
    name: 'WhyteBox Team',
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  version: '1.0.0',
  readTime: 15,
  views: 1250,
  rating: {
    average: 4.8,
    count: 45,
  },
  relatedArticles: [
    'understanding-gradcam',
    'model-architecture',
    'api-reference',
  ],
  prerequisites: [],
  demo: {
    id: 'getting-started-demo',
    type: 'interactive',
    title: 'Interactive Model Upload Demo',
    description: 'Try uploading a model and running inference in this interactive demo',
    config: {
      component: 'ModelUploadDemo',
      props: {
        allowedFormats: ['pth', 'h5', 'onnx'],
        maxSize: 100 * 1024 * 1024, // 100MB
      },
    },
  },
  codeExamples: [
    {
      id: 'upload-model',
      title: 'Upload a Model',
      description: 'Upload a PyTorch model to WhyteBox',
      language: 'python',
      code: `import requests

with open('model.pth', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/v1/models/upload',
        files={'file': f},
        data={
            'name': 'My Model',
            'framework': 'pytorch',
            'task': 'classification'
        }
    )

model_id = response.json()['id']
print(f"Model uploaded: {model_id}")`,
      runnable: false,
      editable: true,
    },
    {
      id: 'run-inference',
      title: 'Run Inference',
      description: 'Run inference on an image',
      language: 'python',
      code: `import requests

with open('image.jpg', 'rb') as f:
    response = requests.post(
        f'http://localhost:8000/api/v1/inference/{model_id}',
        files={'image': f}
    )

predictions = response.json()['predictions']
for pred in predictions[:5]:
    print(f"{pred['class']}: {pred['confidence']:.2%}")`,
      runnable: false,
      editable: true,
    },
    {
      id: 'generate-gradcam',
      title: 'Generate Grad-CAM',
      description: 'Generate Grad-CAM visualization',
      language: 'python',
      code: `import requests

response = requests.post(
    'http://localhost:8000/api/v1/explainability/gradcam',
    json={
        'model_id': model_id,
        'image_path': 'image.jpg',
        'target_layer': 'layer4',
        'target_class': 0
    }
)

result = response.json()
print(f"Heatmap: {result['heatmap_url']}")
print(f"Overlay: {result['overlay_url']}")`,
      runnable: false,
      editable: true,
    },
  ],
};

// Made with Bob
