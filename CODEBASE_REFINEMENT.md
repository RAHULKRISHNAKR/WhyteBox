# WhyteBox Codebase Refinement Plan

## 🎯 Identified Issues & Improvements

### 1. **Duplicate File** ❌
- **Issue:** `backend/api/explainability_endpoint.py` is a duplicate/old version
- **Action:** Remove duplicate file (functionality already in app.py)
- **Priority:** HIGH

### 2. **Code Organization** 🔧
- **Issue:** app.py is 1197 lines (too large)
- **Action:** Split into modular files:
  - `routes/model_routes.py` - Model loading/listing endpoints
  - `routes/inference_routes.py` - Inference endpoints
  - `routes/explainability_routes.py` - XAI endpoints
  - `utils/model_loader.py` - Model loading utilities
- **Priority:** MEDIUM

### 3. **Error Handling** ⚠️
- **Issue:** Inconsistent error responses
- **Action:** Use centralized error handler from `backend/utils/error_handler.py`
- **Priority:** HIGH

### 4. **Logging** 📝
- **Issue:** Mixed logging styles
- **Action:** Standardize logging with emojis and consistent format
- **Priority:** LOW

### 5. **Type Hints** 🔤
- **Issue:** Missing type hints in many functions
- **Action:** Add type hints for better IDE support
- **Priority:** MEDIUM

### 6. **Documentation** 📚
- **Issue:** Some functions lack docstrings
- **Action:** Add comprehensive docstrings
- **Priority:** LOW

### 7. **Configuration** ⚙️
- **Issue:** Hardcoded values in app.py
- **Action:** Move to config.py or environment variables
- **Priority:** MEDIUM

### 8. **WebSocket Integration** 🔌
- **Issue:** WebSocket not used in existing endpoints
- **Action:** Add progress updates to long-running operations
- **Priority:** HIGH

### 9. **Security** 🔒
- **Issue:** File upload validation could be stronger
- **Action:** Add file size limits, MIME type checking
- **Priority:** HIGH

### 10. **Performance** ⚡
- **Issue:** Model cache could be more efficient
- **Action:** Add LRU cache with size limits
- **Priority:** MEDIUM

## 🚀 Refinement Implementation Plan

### Phase 1: Critical Fixes (Immediate)
1. ✅ Remove duplicate explainability_endpoint.py
2. ✅ Integrate error_handler.py into app.py
3. ✅ Add WebSocket progress to model loading
4. ✅ Strengthen file upload validation
5. ✅ Add rate limiting to API endpoints

### Phase 2: Code Quality (This Week)
6. ⏳ Split app.py into modular routes
7. ⏳ Add type hints to all functions
8. ⏳ Standardize logging format
9. ⏳ Add comprehensive docstrings
10. ⏳ Move hardcoded values to config

### Phase 3: Performance (Next Week)
11. ⏳ Implement LRU cache for models
12. ⏳ Add request caching
13. ⏳ Optimize image preprocessing
14. ⏳ Add async support for long operations
15. ⏳ Database for model metadata

## 📋 Detailed Refinements

### 1. Remove Duplicate File

```bash
rm backend/api/explainability_endpoint.py
```

### 2. Integrate Error Handler

**Before:**
```python
return jsonify({'error': str(e)}), 500
```

**After:**
```python
from backend.utils.error_handler import handle_error
return handle_error(e, 'Model loading failed')
```

### 3. Add WebSocket Progress

**Before:**
```python
model = load_model(path)
```

**After:**
```python
from backend.api.websocket_handler import send_progress

send_progress(0, 'Loading model...')
model = load_model(path)
send_progress(50, 'Processing layers...')
# ... processing ...
send_progress(100, 'Complete!')
```

### 4. Strengthen File Validation

**Add to app.py:**
```python
ALLOWED_MIME_TYPES = {
    'application/octet-stream',  # .pth, .pt
    'application/x-hdf',          # .h5
    'application/zip'             # .keras
}

MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

def validate_upload(file):
    """Validate uploaded file"""
    # Check file size
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    
    if size > MAX_FILE_SIZE:
        raise ValueError(f'File too large: {size} bytes')
    
    # Check extension
    if not allowed_file(file.filename):
        raise ValueError(f'Invalid file type: {file.filename}')
    
    return True
```

### 5. Add Rate Limiting

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/api/inference', methods=['POST'])
@limiter.limit("10 per minute")
def run_inference():
    # ... existing code ...
```

### 6. Modular Route Structure

**New file: `backend/api/routes/model_routes.py`**
```python
from flask import Blueprint, request, jsonify

model_bp = Blueprint('models', __name__, url_prefix='/api/models')

@model_bp.route('/list', methods=['GET'])
def list_models():
    """List all available models"""
    # ... existing code ...

@model_bp.route('/generate', methods=['POST'])
def generate_model_visualization():
    """Generate model visualization"""
    # ... existing code ...
```

**In app.py:**
```python
from routes.model_routes import model_bp
from routes.inference_routes import inference_bp
from routes.explainability_routes import xai_bp

app.register_blueprint(model_bp)
app.register_blueprint(inference_bp)
app.register_blueprint(xai_bp)
```

### 7. Add Type Hints

**Before:**
```python
def load_model(path, framework):
    # ... code ...
```

**After:**
```python
from typing import Tuple, Optional, Dict, Any
import torch

def load_model(
    path: str, 
    framework: str
) -> Tuple[torch.nn.Module, Dict[str, Any]]:
    """
    Load a model from file path.
    
    Args:
        path: Path to model file
        framework: Framework name ('pytorch' or 'tensorflow')
    
    Returns:
        Tuple of (model, metadata)
    
    Raises:
        FileNotFoundError: If model file doesn't exist
        ValueError: If framework is unsupported
    """
    # ... code ...
```

### 8. Standardize Logging

**Create logging utility:**
```python
# backend/utils/logger.py
import logging
from colorlog import ColoredFormatter

def setup_logger(name: str) -> logging.Logger:
    """Setup colored logger with emojis"""
    logger = logging.getLogger(name)
    
    formatter = ColoredFormatter(
        "%(log_color)s%(levelname)-8s%(reset)s %(blue)s%(message)s",
        log_colors={
            'DEBUG': 'cyan',
            'INFO': 'green',
            'WARNING': 'yellow',
            'ERROR': 'red',
            'CRITICAL': 'red,bg_white',
        }
    )
    
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    
    return logger
```

**Usage:**
```python
from backend.utils.logger import setup_logger
logger = setup_logger(__name__)

logger.info("✅ Model loaded successfully")
logger.warning("⚠️ Cache miss, loading from disk")
logger.error("❌ Failed to process image")
```

### 9. LRU Cache for Models

```python
from functools import lru_cache
from collections import OrderedDict

class ModelCache:
    """LRU cache for loaded models"""
    
    def __init__(self, max_size: int = 5):
        self.cache = OrderedDict()
        self.max_size = max_size
    
    def get(self, key: str):
        """Get model from cache"""
        if key in self.cache:
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            return self.cache[key]
        return None
    
    def put(self, key: str, model):
        """Add model to cache"""
        if key in self.cache:
            self.cache.move_to_end(key)
        else:
            self.cache[key] = model
            if len(self.cache) > self.max_size:
                # Remove least recently used
                self.cache.popitem(last=False)
    
    def clear(self):
        """Clear cache"""
        self.cache.clear()

# Usage
model_cache = ModelCache(max_size=5)
```

### 10. Configuration Management

**backend/config.py enhancements:**
```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration"""
    
    # Server
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5001))
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Paths
    BASE_DIR = Path(__file__).parent
    UPLOAD_FOLDER = BASE_DIR / 'models'
    OUTPUT_FOLDER = BASE_DIR / 'output'
    
    # Limits
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB
    MAX_MODELS_IN_CACHE = 5
    
    # Security
    ALLOWED_EXTENSIONS = {'pth', 'pt', 'h5', 'keras', 'onnx', 'pb'}
    ALLOWED_MIME_TYPES = {
        'application/octet-stream',
        'application/x-hdf',
        'application/zip'
    }
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE = 10
    RATE_LIMIT_PER_HOUR = 50
    RATE_LIMIT_PER_DAY = 200
    
    # WebSocket
    WEBSOCKET_ENABLED = os.getenv('WEBSOCKET_ENABLED', 'True').lower() == 'true'
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

config = Config()
```

## 🧪 Testing Improvements

### Add Integration Tests

```python
# backend/tests/test_websocket.py
import pytest
from flask_socketio import SocketIOTestClient

def test_websocket_connection(app, socketio):
    """Test WebSocket connection"""
    client = SocketIOTestClient(app, socketio)
    
    received = client.get_received()
    assert len(received) > 0
    assert received[0]['args'][0]['type'] == 'connected'

def test_progress_updates(app, socketio):
    """Test progress updates via WebSocket"""
    client = SocketIOTestClient(app, socketio)
    
    # Trigger long-running task
    # ... code ...
    
    received = client.get_received()
    progress_messages = [
        msg for msg in received 
        if msg['args'][0]['type'] == 'progress'
    ]
    
    assert len(progress_messages) > 0
```

### Add Performance Tests

```python
# backend/tests/test_performance.py
import pytest
import time

def test_model_cache_performance(app):
    """Test model cache improves performance"""
    
    # First load (cache miss)
    start = time.time()
    model1 = load_model('vgg16', 'pytorch')
    time1 = time.time() - start
    
    # Second load (cache hit)
    start = time.time()
    model2 = load_model('vgg16', 'pytorch')
    time2 = time.time() - start
    
    # Cache hit should be much faster
    assert time2 < time1 * 0.1  # At least 10x faster
```

## 📊 Metrics & Monitoring

### Add Prometheus Metrics

```python
from prometheus_flask_exporter import PrometheusMetrics

metrics = PrometheusMetrics(app)

# Custom metrics
model_load_time = metrics.histogram(
    'model_load_duration_seconds',
    'Time spent loading models'
)

@model_load_time.time()
def load_model(path, framework):
    # ... existing code ...
```

## 🔐 Security Enhancements

### Add API Key Authentication

```python
from functools import wraps

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key or api_key != config.API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/inference', methods=['POST'])
@require_api_key
def run_inference():
    # ... existing code ...
```

## 📝 Summary

### Immediate Actions (Today)
1. ✅ Remove duplicate file
2. ✅ Add WebSocket progress updates
3. ✅ Strengthen file validation
4. ✅ Integrate error handler

### Short-term (This Week)
5. ⏳ Split app.py into modules
6. ⏳ Add type hints
7. ⏳ Standardize logging
8. ⏳ Add rate limiting

### Long-term (Next Sprint)
9. ⏳ Implement LRU cache
10. ⏳ Add monitoring/metrics
11. ⏳ Security enhancements
12. ⏳ Performance optimizations

---

**Status:** Refinement plan complete, ready for implementation  
**Priority:** Start with Phase 1 (Critical Fixes)  
**Timeline:** Phase 1 today, Phase 2 this week, Phase 3 next week