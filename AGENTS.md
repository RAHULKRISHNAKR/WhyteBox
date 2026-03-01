# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Critical Non-Obvious Patterns

### Port Configuration Mismatch
- **Backend runs on port 5001** (not 5000 as in config.py) - macOS AirPlay Receiver conflict
- Frontend expects port 5001 in all fetch calls
- start.sh uses port 5001, but backend/config.py still shows 5000 (ignored)

### Path Resolution Requirements
- Backend API must run from `backend/api/` directory with `sys.path.insert(0, '.')` 
- Imports require parent directory insertion: `sys.path.insert(0, str(Path(__file__).parent.parent))`
- Core modules need explicit path: `sys.path.insert(0, str(Path(__file__).parent.parent / 'core'))`

### PyTorch Autograd Hook Pattern
- Use `.detach().clone()` (not just `.clone()`) for gradient manipulation in backward hooks
- Required to avoid "view being modified inplace" errors in Guided Backpropagation
- Pattern: `grad_input[0].detach().clone().clamp(min=0.0)` creates independent tensor

### Lazy Import Strategy
- TensorFlow/Keras imports wrapped in try/except with KERAS_AVAILABLE flag
- Allows PyTorch-only operation without TensorFlow installed
- Pattern used in api/app.py and examples/convert_vgg16.py

### Model Cache Architecture
- Backend maintains `model_cache = {}` dict to avoid reloading models
- Critical for inference endpoints to prevent memory exhaustion
- Not documented in config.py

### Explainability Methods
- **Grad-CAM**: Gradient-weighted Class Activation Mapping for CNN visualizations
- **Saliency Maps**: Raw gradient magnitude showing pixel influence
- **Guided Backpropagation**: Has PyTorch autograd warning issues (view modification inplace) - NOT RECOMMENDED
- **Integrated Gradients**: NEW - Path-integrated gradients method, more robust than Guided Backprop
  - No gradient flow issues
  - Satisfies sensitivity and implementation invariance axioms
  - Uses 50 interpolation steps by default between baseline (zeros) and input
  - Available via `/api/explainability` with `method=integrated_gradients`
  - Included in `/api/explainability/compare` endpoint
  - Reference: Sundararajan et al. "Axiomatic Attribution for Deep Networks" (2017)

### Frontend-Backend Integration
- Frontend uses static Python HTTP server on port 8000
- Backend API separate process on port 5001
- No build step - direct HTML/JS serving from frontend/examples/

## Running the Application

```bash
# macOS (uses python3/pip3)
./start.sh

# Windows (uses python/pip)
start.bat
```

## Testing
- Tests in backend/tests/ use pytest
- Mock data tests don't require PyTorch/TensorFlow
- Real model tests require framework installation