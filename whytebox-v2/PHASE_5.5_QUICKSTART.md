# Phase 5.5: Core Features - Quick Start Guide

**Status:** Ready to begin
**Duration:** 3-4 weeks (22 days)
**Current Phase:** Week 1 - Model Loading & Architecture Extraction

---

## What We're Building

Phase 5.5 implements the **four core features** that make WhyteBox a powerful AI explainability platform:

1. ✅ **Model Loading** - Load PyTorch, TensorFlow, ONNX models and extract architecture
2. ✅ **3D Visualization** - Advanced interactive visualization with real model data
3. ✅ **Live Inference** - Real-time inference with activation visualization
4. ✅ **Explainability** - Grad-CAM, Saliency Maps, Integrated Gradients

---

## Current Status

### What's Already Done ✅
- Project structure and architecture
- Backend API framework (FastAPI)
- Frontend UI framework (React + TypeScript)
- Database and caching infrastructure
- Authentication and authorization
- Testing infrastructure (348 tests)
- Basic model listing (mock data)
- Basic 3D visualization (placeholder)

### What's Missing ❌
- **Real model loading** (currently mock data)
- **Architecture extraction** from loaded models
- **Advanced 3D rendering** (only basic placeholder exists)
- **Interactive layer selection** and feature maps
- **Live inference engine** (no real model execution)
- **Explainability methods** (UI exists but no implementation)

---

## Week 1: Model Loading (Days 51-57)

### Day 51: PyTorch Model Loader Foundation
**Start Here! 👈**

#### What to Build
```python
# whytebox-v2/backend/app/services/model_loader.py
class ModelLoader(ABC):
    """Base class for all model loaders"""
    @abstractmethod
    def load_model(self, file_path: str) -> Any
    
    @abstractmethod
    def extract_architecture(self, model: Any) -> ModelArchitecture
    
    @abstractmethod
    def get_layer_info(self, layer: Any) -> LayerInfo

class PyTorchModelLoader(ModelLoader):
    """Load and analyze PyTorch models"""
    def load_model(self, file_path: str) -> torch.nn.Module:
        # Load .pt or .pth file
        # Handle state_dict vs full model
        
    def extract_architecture(self, model: torch.nn.Module) -> ModelArchitecture:
        # Use model.named_modules() to get all layers
        # Extract layer types, shapes, parameters
        # Build connection graph
        
    def get_layer_info(self, layer: torch.nn.Module) -> LayerInfo:
        # Extract layer type (Conv2D, Linear, etc.)
        # Get input/output shapes
        # Count parameters
        # Get weight shapes
```

#### Key Implementation Details

**1. Loading Models**
```python
def load_model(self, file_path: str) -> torch.nn.Module:
    try:
        # Try loading full model first
        model = torch.load(file_path, map_location='cpu')
        if isinstance(model, dict):
            # It's a state_dict, need architecture
            raise ValueError("State dict requires model architecture")
        return model
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise
```

**2. Extracting Architecture**
```python
def extract_architecture(self, model: torch.nn.Module) -> ModelArchitecture:
    layers = []
    connections = []
    
    # Get all modules
    for name, module in model.named_modules():
        if len(list(module.children())) == 0:  # Leaf module
            layer_info = self.get_layer_info(module)
            layer_info.name = name
            layers.append(layer_info)
    
    # Build connection graph (simplified)
    for i in range(len(layers) - 1):
        connections.append({
            'from': layers[i].name,
            'to': layers[i + 1].name
        })
    
    return ModelArchitecture(layers=layers, connections=connections)
```

**3. Layer Information**
```python
def get_layer_info(self, layer: torch.nn.Module) -> LayerInfo:
    layer_type = type(layer).__name__
    
    # Get parameters
    params = sum(p.numel() for p in layer.parameters())
    
    # Get shapes (example for Conv2d)
    if isinstance(layer, torch.nn.Conv2d):
        return LayerInfo(
            type='Conv2D',
            parameters=params,
            input_shape=None,  # Need forward pass to determine
            output_shape=None,
            config={
                'in_channels': layer.in_channels,
                'out_channels': layer.out_channels,
                'kernel_size': layer.kernel_size,
                'stride': layer.stride,
                'padding': layer.padding
            }
        )
    # ... handle other layer types
```

#### Files to Create
1. `backend/app/services/model_loader.py` (300 lines)
2. `backend/app/models/architecture.py` (150 lines)
3. `backend/tests/services/test_model_loader.py` (200 lines)

#### Testing Strategy
```python
# Test with real models
def test_load_resnet18():
    loader = PyTorchModelLoader()
    model = torchvision.models.resnet18(pretrained=True)
    
    # Save and reload
    torch.save(model, 'test_resnet18.pt')
    loaded = loader.load_model('test_resnet18.pt')
    
    assert loaded is not None
    assert isinstance(loaded, torch.nn.Module)

def test_extract_architecture():
    loader = PyTorchModelLoader()
    model = torchvision.models.resnet18(pretrained=True)
    
    arch = loader.extract_architecture(model)
    
    assert len(arch.layers) > 0
    assert len(arch.connections) > 0
    assert arch.layers[0].type in ['Conv2D', 'Linear']
```

---

## Dependencies to Install

```bash
# Backend dependencies
cd whytebox-v2/backend
pip install torch torchvision  # PyTorch
pip install tensorflow         # TensorFlow (Day 53)
pip install onnx onnxruntime  # ONNX (Day 54)
```

---

## Development Workflow

### 1. Start Backend
```bash
cd whytebox-v2/backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload --port 8000
```

### 2. Start Frontend
```bash
cd whytebox-v2/frontend
npm run dev
```

### 3. Run Tests
```bash
# Backend tests
cd whytebox-v2/backend
pytest tests/services/test_model_loader.py -v

# Frontend tests
cd whytebox-v2/frontend
npm test
```

---

## Key Design Decisions

### 1. Model Storage
- **Location:** `whytebox-v2/backend/storage/models/`
- **Format:** Original format (.pt, .h5, .onnx)
- **Metadata:** Stored in database
- **Cache:** In-memory cache for loaded models (max 5)

### 2. Architecture Format
```typescript
interface ModelArchitecture {
  layers: Layer[];
  connections: Connection[];
  metadata: {
    framework: 'pytorch' | 'tensorflow' | 'onnx';
    total_params: number;
    model_size_mb: number;
  };
}

interface Layer {
  id: string;
  name: string;
  type: string;  // 'Conv2D', 'Dense', 'ReLU', etc.
  input_shape?: number[];
  output_shape?: number[];
  parameters: number;
  config: Record<string, any>;
}

interface Connection {
  from: string;  // layer id
  to: string;    // layer id
  weight?: number;  // optional weight magnitude
}
```

### 3. API Endpoints
```
POST   /api/v1/models/upload          # Upload model file
GET    /api/v1/models/{id}/architecture  # Get architecture
GET    /api/v1/models/{id}/layers/{layer_id}  # Get layer details
DELETE /api/v1/models/{id}            # Delete model
```

---

## Common Pitfalls to Avoid

### 1. Memory Management
❌ **Don't:** Load all models into memory
✅ **Do:** Use LRU cache with max 5 models

### 2. Error Handling
❌ **Don't:** Crash on unsupported layer types
✅ **Do:** Log warning and use generic layer representation

### 3. Shape Inference
❌ **Don't:** Assume static shapes
✅ **Do:** Run dummy forward pass to get actual shapes

### 4. Framework Detection
❌ **Don't:** Rely on file extension only
✅ **Do:** Try loading with each framework and detect

---

## Success Metrics for Week 1

By end of Day 57, you should have:
- ✅ PyTorch models loading successfully
- ✅ Architecture extraction working for 5+ model types
- ✅ TensorFlow/Keras support
- ✅ ONNX support
- ✅ Model registry with caching
- ✅ API endpoints functional
- ✅ 105+ tests passing
- ✅ Documentation complete

---

## Next Steps After Week 1

**Week 2: Advanced 3D Visualization**
- Use extracted architecture to render real models
- Implement interactive layer selection
- Add feature map visualization
- Show connection weights

**Week 3: Live Inference Engine**
- Real-time inference on uploaded images
- Extract intermediate activations
- Batch processing

**Week 4: Explainability Methods**
- Grad-CAM implementation
- Saliency Maps
- Integrated Gradients

---

## Getting Help

### Documentation
- See [`PHASE_5.5_CORE_FEATURES_PLAN.md`](./PHASE_5.5_CORE_FEATURES_PLAN.md) for full plan
- See [`CURRENT_STATUS_AND_GAPS.md`](./CURRENT_STATUS_AND_GAPS.md) for current status
- See [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md) for setup

### Resources
- PyTorch Model Loading: https://pytorch.org/tutorials/beginner/saving_loading_models.html
- TensorFlow Model Loading: https://www.tensorflow.org/guide/keras/save_and_serialize
- ONNX: https://onnx.ai/

---

## Ready to Start?

1. ✅ Read this guide
2. ✅ Review [`PHASE_5.5_CORE_FEATURES_PLAN.md`](./PHASE_5.5_CORE_FEATURES_PLAN.md)
3. ✅ Install dependencies
4. ✅ Start with Day 51: PyTorch Model Loader
5. ✅ Follow the implementation plan
6. ✅ Write tests as you go
7. ✅ Update TODO list daily

**Let's build the core of WhyteBox! 🚀**

---

*Created: 2026-02-26*
*Phase: 5.5 - Core Features*
*Week: 1 - Model Loading*
*Day: 51 - PyTorch Foundation*