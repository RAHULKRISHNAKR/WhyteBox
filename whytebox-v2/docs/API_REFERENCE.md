# WhyteBox v2.0 API Reference

**Version:** 2.0.0  
**Base URL:** `http://localhost:8000` (Development)  
**API Version:** v1  
**Last Updated:** 2026-02-25

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Models API](#models-api)
4. [Inference API](#inference-api)
5. [Explainability API](#explainability-api)
6. [Visualization API](#visualization-api)
7. [Tutorials API](#tutorials-api)
8. [Datasets API](#datasets-api)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

---

## Overview

The WhyteBox API is a RESTful API that provides access to neural network visualization, inference, and explainability features.

### Base URL

```
Development: http://localhost:8000
Production:  https://api.whytebox.com
```

### API Versioning

All API endpoints are versioned and prefixed with `/api/v1/`.

### Content Type

All requests and responses use JSON format:
```
Content-Type: application/json
```

### Interactive Documentation

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## Authentication

### JWT Token Authentication

Most endpoints require authentication using JWT tokens.

#### Login

```http
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### Using the Token

Include the token in the Authorization header:
```http
Authorization: Bearer <access_token>
```

---

## Models API

### List Models

Retrieve a paginated list of available models.

```http
GET /api/v1/models/
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| page_size | integer | 10 | Items per page |
| framework | string | - | Filter by framework (pytorch, tensorflow, keras) |
| type | string | - | Filter by type (cnn, rnn, transformer) |

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/models/?page=1&page_size=10" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "items": [
    {
      "id": "vgg16",
      "name": "VGG16",
      "type": "cnn",
      "framework": "pytorch",
      "description": "16-layer convolutional neural network",
      "architecture": {
        "layers": 16,
        "parameters": 138357544,
        "input_shape": [224, 224, 3],
        "output_shape": [1000]
      },
      "metadata": {
        "accuracy": 0.713,
        "dataset": "ImageNet",
        "author": "VGG Team"
      },
      "created_at": "2026-02-25T10:00:00Z",
      "updated_at": "2026-02-25T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 10,
  "total_pages": 5
}
```

### Get Model

Retrieve detailed information about a specific model.

```http
GET /api/v1/models/{model_id}
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| model_id | string | Yes | Unique model identifier |

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/models/vgg16" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "id": "vgg16",
  "name": "VGG16",
  "type": "cnn",
  "framework": "pytorch",
  "description": "16-layer convolutional neural network for image classification",
  "architecture": {
    "layers": [
      {
        "id": "conv1_1",
        "name": "Conv2D",
        "type": "conv2d",
        "input_shape": [224, 224, 3],
        "output_shape": [224, 224, 64],
        "params": 1792,
        "config": {
          "filters": 64,
          "kernel_size": [3, 3],
          "activation": "relu"
        }
      }
    ],
    "total_params": 138357544,
    "trainable_params": 138357544
  },
  "metadata": {
    "accuracy": 0.713,
    "top5_accuracy": 0.901,
    "dataset": "ImageNet",
    "training_time": 72,
    "author": "VGG Team",
    "paper": "https://arxiv.org/abs/1409.1556"
  },
  "created_at": "2026-02-25T10:00:00Z",
  "updated_at": "2026-02-25T10:00:00Z"
}
```

### Load Model

Load a model into memory for inference.

```http
POST /api/v1/models/load
```

**Request Body:**
```json
{
  "model_id": "vgg16",
  "device": "cpu"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| model_id | string | Yes | Model identifier |
| device | string | No | Device to load model on (cpu, cuda) |

**Response:**
```json
{
  "status": "success",
  "message": "Model loaded successfully",
  "model_id": "vgg16",
  "device": "cpu",
  "memory_usage": "528 MB"
}
```

### Upload Model

Upload a custom neural network model.

```http
POST /api/v1/models/upload
```

**Request:** Multipart form data

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | Model file (.pt, .pth, .h5, .pb) |
| name | string | Yes | Model name |
| type | string | Yes | Model type (cnn, rnn, transformer) |
| framework | string | Yes | Framework (pytorch, tensorflow, keras) |
| description | string | No | Model description |
| metadata | json | No | Additional metadata |

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/models/upload" \
  -H "Authorization: Bearer <token>" \
  -F "file=@model.pth" \
  -F "name=MyCustomModel" \
  -F "type=cnn" \
  -F "framework=pytorch" \
  -F "description=Custom CNN for image classification"
```

**Response:**
```json
{
  "status": "success",
  "message": "Model uploaded successfully",
  "model": {
    "id": "custom_model_123",
    "name": "MyCustomModel",
    "type": "cnn",
    "framework": "pytorch",
    "file_size": "45.2 MB",
    "created_at": "2026-02-25T12:00:00Z"
  }
}
```

### Delete Model

Delete a model from the system.

```http
DELETE /api/v1/models/{model_id}
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| model_id | string | Yes | Model identifier |

**Response:**
```json
{
  "status": "success",
  "message": "Model deleted successfully",
  "model_id": "custom_model_123"
}
```

---

## Inference API

### Run Inference

Execute model inference on input data.

```http
POST /api/v1/inference
```

**Request Body:**
```json
{
  "model_id": "vgg16",
  "input": [[0.5, 0.3, ...]], 
  "options": {
    "batch_size": 1,
    "device": "cpu",
    "return_intermediates": false
  }
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| model_id | string | Yes | Model identifier |
| input | array | Yes | Input data (shape depends on model) |
| options | object | No | Inference options |

**Response:**
```json
{
  "output": [[0.001, 0.002, 0.997, ...]],
  "predictions": [
    {
      "class": "cat",
      "confidence": 0.997,
      "index": 281
    },
    {
      "class": "dog",
      "confidence": 0.002,
      "index": 243
    }
  ],
  "execution_time": 0.045,
  "device": "cpu"
}
```

### Batch Inference

Run inference on multiple inputs.

```http
POST /api/v1/inference/batch
```

**Request Body:**
```json
{
  "requests": [
    {
      "model_id": "vgg16",
      "input": [[0.5, 0.3, ...]]
    },
    {
      "model_id": "vgg16",
      "input": [[0.2, 0.8, ...]]
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "output": [[0.001, 0.002, 0.997, ...]],
      "predictions": [...]
    },
    {
      "output": [[0.003, 0.995, 0.002, ...]],
      "predictions": [...]
    }
  ],
  "total_execution_time": 0.089
}
```

---

## Explainability API

### Get Explanation

Generate explainability visualization for a model prediction.

```http
POST /api/v1/explainability
```

**Request Body:**
```json
{
  "model_id": "vgg16",
  "input": [[0.5, 0.3, ...]],
  "method": "gradcam",
  "target_layer": "conv5_3",
  "target_class": 281
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| model_id | string | Yes | Model identifier |
| input | array | Yes | Input data |
| method | string | Yes | Method (gradcam, saliency, integrated_gradients) |
| target_layer | string | No | Target layer for visualization |
| target_class | integer | No | Target class index |

**Response:**
```json
{
  "method": "gradcam",
  "heatmap": [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  "attribution": [0.5, 0.3, 0.2, ...],
  "visualization": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "target_class": 281,
  "target_layer": "conv5_3"
}
```

### Compare Explanations

Compare multiple explainability methods side-by-side.

```http
POST /api/v1/explainability/compare
```

**Request Body:**
```json
{
  "model_id": "vgg16",
  "input": [[0.5, 0.3, ...]],
  "methods": ["gradcam", "saliency", "integrated_gradients"]
}
```

**Response:**
```json
{
  "gradcam": {
    "heatmap": [[...]],
    "visualization": "data:image/png;base64,..."
  },
  "saliency": {
    "heatmap": [[...]],
    "visualization": "data:image/png;base64,..."
  },
  "integrated_gradients": {
    "attribution": [...],
    "visualization": "data:image/png;base64,..."
  }
}
```

---

## Visualization API

### Get Model Visualization

Retrieve 3D visualization data for a model.

```http
GET /api/v1/visualization/{model_id}
```

**Response:**
```json
{
  "graph": {
    "nodes": [
      {
        "id": "conv1_1",
        "type": "conv2d",
        "position": {"x": 0, "y": 0, "z": 0},
        "shape": [224, 224, 64]
      }
    ],
    "edges": [
      {
        "source": "conv1_1",
        "target": "conv1_2"
      }
    ]
  }
}
```

### Get Layer Activations

Retrieve activation values for specific layers.

```http
POST /api/v1/visualization/{model_id}/activations
```

**Request Body:**
```json
{
  "input": [[0.5, 0.3, ...]],
  "layer_id": "conv5_3"
}
```

**Response:**
```json
{
  "conv5_3": [0.1, 0.2, 0.3, ...],
  "shape": [14, 14, 512]
}
```

---

## Tutorials API

### List Tutorials

```http
GET /api/v1/tutorials
```

**Response:**
```json
{
  "items": [
    {
      "id": "intro-to-cnns",
      "title": "Introduction to CNNs",
      "description": "Learn the basics of convolutional neural networks",
      "difficulty": "beginner",
      "duration": 30,
      "tags": ["cnn", "basics", "image-classification"]
    }
  ]
}
```

### Get Tutorial

```http
GET /api/v1/tutorials/{tutorial_id}
```

**Response:**
```json
{
  "id": "intro-to-cnns",
  "title": "Introduction to CNNs",
  "steps": [
    {
      "id": "step1",
      "title": "What is a CNN?",
      "content": "Convolutional Neural Networks are...",
      "code": "import torch\n...",
      "interactive": true
    }
  ]
}
```

---

## Datasets API

### List Datasets

```http
GET /api/v1/datasets
```

### Upload Dataset

```http
POST /api/v1/datasets/upload
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "MODEL_NOT_FOUND",
    "message": "Model with ID 'invalid_model' not found",
    "details": {
      "model_id": "invalid_model"
    }
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Common Error Codes

| Code | Description |
|------|-------------|
| INVALID_INPUT | Input validation failed |
| MODEL_NOT_FOUND | Model does not exist |
| INFERENCE_FAILED | Model inference error |
| UPLOAD_FAILED | File upload error |
| UNAUTHORIZED | Authentication required |
| RATE_LIMIT_EXCEEDED | Too many requests |

---

## Rate Limiting

### Limits

- **Anonymous:** 100 requests/hour
- **Authenticated:** 1000 requests/hour
- **Premium:** 10000 requests/hour

### Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1614556800
```

---

## Webhooks

### Register Webhook

```http
POST /api/v1/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["model.uploaded", "inference.completed"]
}
```

---

## SDK Examples

### Python

```python
from whytebox import WhyteBoxClient

client = WhyteBoxClient(api_key="your_api_key")

# List models
models = client.models.list()

# Run inference
result = client.inference.run(
    model_id="vgg16",
    input=image_data
)

# Get explanation
explanation = client.explainability.get(
    model_id="vgg16",
    input=image_data,
    method="gradcam"
)
```

### JavaScript

```javascript
import { WhyteBoxClient } from '@whytebox/sdk';

const client = new WhyteBoxClient({ apiKey: 'your_api_key' });

// List models
const models = await client.models.list();

// Run inference
const result = await client.inference.run({
  modelId: 'vgg16',
  input: imageData
});

// Get explanation
const explanation = await client.explainability.get({
  modelId: 'vgg16',
  input: imageData,
  method: 'gradcam'
});
```

---

## Changelog

### v2.0.0 (2026-02-25)
- Initial API release
- Models API
- Inference API
- Explainability API
- Visualization API

---

**API Version:** 2.0.0  
**Last Updated:** 2026-02-25  
**Support:** api-support@whytebox.com