# Phase 5.5: Core Features Implementation
## Before Production Deployment

**Duration:** 3-4 weeks (Days 51-72)
**Priority:** CRITICAL - These are the core features that make WhyteBox valuable

---

## Overview

This phase implements the four core features that define WhyteBox as an AI explainability platform:
1. **Model Loading & Architecture Extraction** (Backend)
2. **Advanced 3D Visualization** (Frontend)
3. **Live Inference Engine** (Backend + Frontend)
4. **Explainability Methods** (Backend + Frontend)

---

## Week 1: Model Loading & Architecture Extraction (Days 51-57)

### Day 51: PyTorch Model Loader Foundation
**Goal:** Load PyTorch models and extract basic architecture

**Backend Tasks:**
```python
# whytebox-v2/backend/app/services/model_loader.py
class PyTorchModelLoader:
    def load_model(self, file_path: str) -> Dict[str, Any]
    def extract_architecture(self, model) -> ModelArchitecture
    def get_layer_info(self, layer) -> LayerInfo
    def extract_weights(self, model) -> Dict[str, np.ndarray]
```

**Implementation:**
- [ ] Create `ModelLoader` base class
- [ ] Implement `PyTorchModelLoader` 
- [ ] Parse model structure using `model.named_modules()`
- [ ] Extract layer types, shapes, parameters
- [ ] Handle common architectures (CNN, ResNet, VGG, MobileNet)
- [ ] Add error handling for unsupported models

**Deliverables:**
- `backend/app/services/model_loader.py` (300 lines)
- `backend/app/models/architecture.py` (150 lines)
- Unit tests (50 tests)

---

### Day 52: Model Architecture API Endpoints
**Goal:** Expose model architecture through REST API

**Backend Tasks:**
```python
# whytebox-v2/backend/app/api/v1/endpoints/models.py

@router.post("/upload")
async def upload_model(file: UploadFile) -> ModelResponse
    # Save file, load model, extract architecture
    
@router.get("/{model_id}/architecture")
async def get_architecture(model_id: str) -> ArchitectureResponse
    # Return layers, connections, shapes
    
@router.get("/{model_id}/layers/{layer_id}")
async def get_layer_details(model_id: str, layer_id: str) -> LayerResponse
    # Return specific layer info, weights shape
```

**Implementation:**
- [ ] Update models endpoint to use real loader
- [ ] Add architecture endpoint with full layer details
- [ ] Add layer-specific endpoint
- [ ] Implement caching for loaded models
- [ ] Add validation for model formats

**Deliverables:**
- Updated `backend/app/api/v1/endpoints/models.py` (400 lines)
- Integration tests (20 tests)

---

### Day 53: TensorFlow/Keras Support
**Goal:** Support TensorFlow and Keras models

**Backend Tasks:**
```python
# whytebox-v2/backend/app/services/tensorflow_loader.py
class TensorFlowModelLoader(ModelLoader):
    def load_model(self, file_path: str)
    def extract_architecture(self, model)
    # Handle .h5, SavedModel formats
```

**Implementation:**
- [ ] Create `TensorFlowModelLoader`
- [ ] Parse Keras Sequential and Functional API models
- [ ] Extract layer configurations
- [ ] Handle custom layers gracefully
- [ ] Add format detection (auto-detect framework)

**Deliverables:**
- `backend/app/services/tensorflow_loader.py` (250 lines)
- Unit tests (30 tests)

---

### Day 54: ONNX Support & Model Registry
**Goal:** Add ONNX support and create model registry

**Backend Tasks:**
```python
# whytebox-v2/backend/app/services/onnx_loader.py
class ONNXModelLoader(ModelLoader):
    def load_model(self, file_path: str)
    def extract_architecture(self, model)
    
# whytebox-v2/backend/app/services/model_registry.py
class ModelRegistry:
    def register_model(self, model_id: str, metadata: Dict)
    def get_model(self, model_id: str) -> LoadedModel
    def list_models(self) -> List[ModelMetadata]
```

**Implementation:**
- [ ] Create `ONNXModelLoader`
- [ ] Parse ONNX graph structure
- [ ] Create `ModelRegistry` for managing loaded models
- [ ] Implement LRU cache for models (max 5 models)
- [ ] Add model metadata storage

**Deliverables:**
- `backend/app/services/onnx_loader.py` (200 lines)
- `backend/app/services/model_registry.py` (150 lines)
- Unit tests (25 tests)

---

### Day 55-56: Testing & Documentation
**Goal:** Comprehensive testing with real models

**Tasks:**
- [ ] Test with real PyTorch models (ResNet, VGG, MobileNet)
- [ ] Test with TensorFlow models (EfficientNet, Inception)
- [ ] Test with ONNX models
- [ ] Handle edge cases (custom layers, dynamic shapes)
- [ ] Performance testing (load time, memory usage)
- [ ] Write API documentation

**Deliverables:**
- Integration tests with real models (40 tests)
- Performance benchmarks
- API documentation (200 lines)

---

### Day 57: Buffer Day & Code Review
**Goal:** Fix issues, optimize, review code

---

## Week 2: Advanced 3D Visualization (Days 58-64)

### Day 58: Real Architecture Rendering
**Goal:** Render actual model architecture from backend data

**Frontend Tasks:**
```typescript
// whytebox-v2/frontend/src/components/visualization/ArchitectureRenderer.ts
class ArchitectureRenderer {
  renderArchitecture(architecture: ModelArchitecture): void
  createLayerMesh(layer: Layer): Mesh
  createConnections(layers: Layer[]): Mesh[]
  updateVisualization(architecture: ModelArchitecture): void
}
```

**Implementation:**
- [ ] Fetch architecture from backend API
- [ ] Parse layer types (Conv2D, Dense, ReLU, etc.)
- [ ] Create appropriate 3D representations:
  - Conv2D: 3D boxes with depth
  - Dense: Spheres/cylinders
  - Pooling: Flat boxes
  - Activation: Colored indicators
- [ ] Position layers based on topology
- [ ] Create connections between layers

**Deliverables:**
- `frontend/src/components/visualization/ArchitectureRenderer.ts` (400 lines)
- `frontend/src/types/architecture.ts` (100 lines)
- Component tests (15 tests)

---

### Day 59: Interactive Layer Selection
**Goal:** Click layers to see details, highlight connections

**Frontend Tasks:**
```typescript
// whytebox-v2/frontend/src/components/visualization/LayerInteraction.ts
class LayerInteraction {
  onLayerClick(layer: Layer): void
  highlightLayer(layerId: string): void
  showLayerDetails(layer: Layer): void
  highlightConnections(layerId: string): void
}
```

**Implementation:**
- [ ] Add click handlers to layer meshes
- [ ] Implement layer highlighting (glow effect)
- [ ] Show layer details panel on click
- [ ] Highlight incoming/outgoing connections
- [ ] Add hover tooltips with layer info
- [ ] Implement layer search/filter

**Deliverables:**
- `frontend/src/components/visualization/LayerInteraction.ts` (300 lines)
- `frontend/src/components/visualization/LayerDetailsPanel.tsx` (200 lines)
- Component tests (10 tests)

---

### Day 60: Feature Map Visualization
**Goal:** Expand layers to show feature maps as 2D grids

**Frontend Tasks:**
```typescript
// whytebox-v2/frontend/src/components/visualization/FeatureMapRenderer.ts
class FeatureMapRenderer {
  expandLayer(layerId: string): void
  renderFeatureMaps(activations: number[][][]): Mesh[]
  createHeatmap(values: number[][]): Texture
  animateExpansion(layer: Mesh): void
}
```

**Implementation:**
- [ ] Create expandable layer view
- [ ] Render feature maps as 2D grids
- [ ] Use heatmap colors for activation values
- [ ] Add smooth expand/collapse animation
- [ ] Support multiple feature map layouts (grid, stack)
- [ ] Add zoom controls for feature maps

**Deliverables:**
- `frontend/src/components/visualization/FeatureMapRenderer.ts` (350 lines)
- Shader code for heatmaps (100 lines)
- Component tests (12 tests)

---

### Day 61: Connection Weight Visualization
**Goal:** Show connection weights with thickness/color

**Frontend Tasks:**
```typescript
// whytebox-v2/frontend/src/components/visualization/ConnectionRenderer.ts
class ConnectionRenderer {
  renderWeightedConnections(weights: number[][]): Mesh[]
  updateConnectionThickness(weight: number): number
  updateConnectionColor(weight: number): Color3
  animateDataFlow(): void
}
```

**Implementation:**
- [ ] Fetch weight data from backend
- [ ] Map weight magnitude to line thickness
- [ ] Map weight sign to color (positive=blue, negative=red)
- [ ] Add transparency for weak connections
- [ ] Implement data flow animation
- [ ] Add weight distribution histogram

**Deliverables:**
- `frontend/src/components/visualization/ConnectionRenderer.ts` (300 lines)
- Animation system (150 lines)
- Component tests (10 tests)

---

### Day 62: Visualization Modes & Controls
**Goal:** Multiple visualization modes and advanced controls

**Frontend Tasks:**
```typescript
// Visualization modes:
enum VisualizationMode {
  COMPACT,      // Simple boxes
  DETAILED,     // Full 3D with connections
  HIERARCHICAL, // Tree-like structure
  FLOW,         // Data flow animation
}
```

**Implementation:**
- [ ] Implement mode switcher UI
- [ ] Create compact mode (simple boxes)
- [ ] Create detailed mode (full 3D)
- [ ] Create hierarchical mode (tree layout)
- [ ] Create flow mode (animated data flow)
- [ ] Add layer grouping (by type, by block)
- [ ] Add performance mode (LOD system)

**Deliverables:**
- `frontend/src/components/visualization/VisualizationModes.ts` (400 lines)
- Mode switcher UI (100 lines)
- Component tests (15 tests)

---

### Day 63-64: Testing, Optimization & Polish
**Goal:** Performance optimization and visual polish

**Tasks:**
- [ ] Performance testing with large models (100+ layers)
- [ ] Implement Level of Detail (LOD) system
- [ ] Optimize mesh generation
- [ ] Add loading states and progress bars
- [ ] Implement scene caching
- [ ] Add keyboard shortcuts
- [ ] Mobile responsiveness testing
- [ ] Cross-browser testing

**Deliverables:**
- Performance optimizations
- E2E tests (20 tests)
- User guide (150 lines)

---

## Week 3: Live Inference Engine (Days 65-69)

### Day 65: Backend Inference Service
**Goal:** Real-time inference on uploaded images

**Backend Tasks:**
```python
# whytebox-v2/backend/app/services/inference_service.py
class InferenceService:
    def preprocess_image(self, image: Image, model_config: Dict) -> Tensor
    def run_inference(self, model_id: str, input_tensor: Tensor) -> InferenceResult
    def postprocess_output(self, output: Tensor, model_config: Dict) -> Predictions
    def get_intermediate_activations(self, model_id: str, input_tensor: Tensor) -> Dict[str, Tensor]
```

**Implementation:**
- [ ] Create `InferenceService` class
- [ ] Implement image preprocessing (resize, normalize, augment)
- [ ] Add inference execution with PyTorch/TensorFlow
- [ ] Implement postprocessing (softmax, NMS, etc.)
- [ ] Extract intermediate layer activations
- [ ] Add batch inference support
- [ ] Implement GPU acceleration (if available)

**Deliverables:**
- `backend/app/services/inference_service.py` (400 lines)
- `backend/app/api/v1/endpoints/inference.py` (200 lines)
- Unit tests (30 tests)

---

### Day 66: Frontend Inference UI
**Goal:** Upload images and display results

**Frontend Tasks:**
```typescript
// whytebox-v2/frontend/src/pages/inference/InferenceEngine.tsx
- Image upload with preview
- Model selection dropdown
- Real-time inference button
- Results display with confidence scores
- Top-K predictions
- Inference time display
```

**Implementation:**
- [ ] Create image upload component with drag-and-drop
- [ ] Add image preview and crop functionality
- [ ] Implement model selection
- [ ] Add inference trigger button
- [ ] Display results with confidence bars
- [ ] Show top-K predictions
- [ ] Display inference time and FPS
- [ ] Add batch inference UI

**Deliverables:**
- `frontend/src/pages/inference/InferenceEngine.tsx` (400 lines)
- `frontend/src/components/inference/ImageUpload.tsx` (200 lines)
- `frontend/src/components/inference/ResultsDisplay.tsx` (250 lines)
- Component tests (20 tests)

---

### Day 67: Activation Visualization
**Goal:** Show intermediate layer activations

**Frontend Tasks:**
```typescript
// whytebox-v2/frontend/src/components/inference/ActivationViewer.tsx
- Fetch activations from backend
- Display as heatmaps
- Layer-by-layer navigation
- Overlay on original image
```

**Implementation:**
- [ ] Fetch activation data from backend
- [ ] Render activations as heatmaps
- [ ] Create layer selector for activations
- [ ] Implement activation overlay on input image
- [ ] Add activation statistics (min, max, mean)
- [ ] Support multiple activation visualization modes

**Deliverables:**
- `frontend/src/components/inference/ActivationViewer.tsx` (350 lines)
- Heatmap rendering utilities (150 lines)
- Component tests (15 tests)

---

### Day 68: Batch Inference & Export
**Goal:** Process multiple images and export results

**Backend Tasks:**
```python
# whytebox-v2/backend/app/services/batch_inference.py
class BatchInferenceService:
    def process_batch(self, images: List[Image], model_id: str) -> List[InferenceResult]
    def export_results(self, results: List[InferenceResult], format: str) -> bytes
```

**Frontend Tasks:**
- [ ] Multi-image upload
- [ ] Batch processing UI
- [ ] Progress tracking
- [ ] Results export (CSV, JSON)

**Deliverables:**
- `backend/app/services/batch_inference.py` (250 lines)
- `frontend/src/components/inference/BatchProcessor.tsx` (300 lines)
- Integration tests (15 tests)

---

### Day 69: Testing & Optimization
**Goal:** Performance testing and optimization

**Tasks:**
- [ ] Test with various image sizes
- [ ] Test with different model types
- [ ] Optimize inference speed
- [ ] Add model warm-up
- [ ] Implement result caching
- [ ] Memory leak testing
- [ ] Load testing (concurrent requests)

**Deliverables:**
- Performance benchmarks
- Integration tests (25 tests)
- Optimization report

---

## Week 4: Explainability Methods (Days 70-72)

### Day 70: Grad-CAM Implementation
**Goal:** Gradient-weighted Class Activation Mapping

**Backend Tasks:**
```python
# whytebox-v2/backend/app/services/explainability/gradcam.py
class GradCAM:
    def __init__(self, model, target_layer: str)
    def generate_heatmap(self, input_tensor: Tensor, class_idx: int) -> np.ndarray
    def overlay_heatmap(self, image: Image, heatmap: np.ndarray) -> Image
```

**Implementation:**
- [ ] Implement Grad-CAM algorithm
- [ ] Register forward and backward hooks
- [ ] Compute gradients for target class
- [ ] Generate activation heatmap
- [ ] Overlay heatmap on original image
- [ ] Support multiple target layers

**Frontend Tasks:**
- [ ] Grad-CAM visualization component
- [ ] Layer selection for Grad-CAM
- [ ] Class selection for attribution
- [ ] Heatmap overlay controls

**Deliverables:**
- `backend/app/services/explainability/gradcam.py` (300 lines)
- `frontend/src/components/explainability/GradCAM.tsx` (250 lines)
- Unit tests (20 tests)

---

### Day 71: Saliency Maps & Integrated Gradients
**Goal:** Additional explainability methods

**Backend Tasks:**
```python
# whytebox-v2/backend/app/services/explainability/saliency.py
class SaliencyMap:
    def generate(self, model, input_tensor: Tensor, class_idx: int) -> np.ndarray

# whytebox-v2/backend/app/services/explainability/integrated_gradients.py
class IntegratedGradients:
    def generate(self, model, input_tensor: Tensor, class_idx: int, steps: int = 50) -> np.ndarray
```

**Implementation:**
- [ ] Implement Saliency Maps (vanilla gradients)
- [ ] Implement Integrated Gradients
- [ ] Add baseline selection for IG
- [ ] Implement path integration
- [ ] Add smoothing options
- [ ] Support batch processing

**Frontend Tasks:**
- [ ] Method selector UI
- [ ] Side-by-side comparison view
- [ ] Export functionality

**Deliverables:**
- `backend/app/services/explainability/saliency.py` (200 lines)
- `backend/app/services/explainability/integrated_gradients.py` (250 lines)
- `frontend/src/components/explainability/MethodComparison.tsx` (300 lines)
- Unit tests (25 tests)

---

### Day 72: Integration & Testing
**Goal:** Integrate all explainability methods

**Backend Tasks:**
```python
# whytebox-v2/backend/app/api/v1/endpoints/explainability.py
@router.post("/explain")
async def explain_prediction(
    model_id: str,
    image: UploadFile,
    method: ExplainabilityMethod,
    params: Dict[str, Any]
) -> ExplainabilityResult
```

**Frontend Tasks:**
- [ ] Unified explainability interface
- [ ] Method comparison dashboard
- [ ] Export all results
- [ ] Interactive parameter tuning

**Deliverables:**
- `backend/app/api/v1/endpoints/explainability.py` (300 lines)
- `frontend/src/pages/explainability/ExplainabilityDashboard.tsx` (400 lines)
- Integration tests (30 tests)
- User documentation (200 lines)

---

## Success Criteria

### Model Loading
- ✅ Load PyTorch, TensorFlow, ONNX models
- ✅ Extract complete architecture (layers, shapes, parameters)
- ✅ Handle 10+ common architectures
- ✅ API response time < 2 seconds
- ✅ Support models up to 500MB

### 3D Visualization
- ✅ Render real model architectures
- ✅ Interactive layer selection
- ✅ Feature map expansion
- ✅ Connection weight visualization
- ✅ 60 FPS with 100+ layer models
- ✅ 4 visualization modes

### Inference Engine
- ✅ Real-time inference < 1 second
- ✅ Support images up to 4K resolution
- ✅ Batch processing (10+ images)
- ✅ Intermediate activation extraction
- ✅ GPU acceleration (if available)
- ✅ Export results (CSV, JSON)

### Explainability
- ✅ Grad-CAM implementation
- ✅ Saliency Maps
- ✅ Integrated Gradients
- ✅ Side-by-side comparison
- ✅ Interactive parameter tuning
- ✅ Export visualizations

---

## Testing Strategy

### Unit Tests (150 new tests)
- Model loaders (50 tests)
- Inference service (30 tests)
- Explainability methods (40 tests)
- Visualization components (30 tests)

### Integration Tests (80 new tests)
- End-to-end model loading (20 tests)
- Inference pipeline (25 tests)
- Explainability pipeline (20 tests)
- API endpoints (15 tests)

### E2E Tests (40 new tests)
- Complete user workflows (20 tests)
- Performance tests (10 tests)
- Cross-browser tests (10 tests)

**Total New Tests: 270**
**Total Project Tests: 618**

---

## Deliverables Summary

### Backend (3,500 lines)
- Model loaders (PyTorch, TensorFlow, ONNX)
- Inference service
- Explainability methods
- API endpoints
- Tests

### Frontend (3,200 lines)
- Advanced 3D visualization
- Inference UI
- Explainability dashboard
- Interactive components
- Tests

### Documentation (800 lines)
- API documentation
- User guides
- Developer guides
- Performance benchmarks

**Total New Code: ~7,500 lines**

---

## Risk Mitigation

### Technical Risks
1. **Performance with large models**
   - Mitigation: Implement LOD system, lazy loading
   
2. **Memory constraints**
   - Mitigation: Model caching with LRU, streaming for large files
   
3. **Browser compatibility**
   - Mitigation: WebGL fallbacks, progressive enhancement
   
4. **GPU availability**
   - Mitigation: CPU fallback, clear performance expectations

### Schedule Risks
1. **Complex 3D rendering**
   - Mitigation: Start with basic rendering, iterate
   
2. **Model format variations**
   - Mitigation: Focus on common formats first, add others later
   
3. **Testing overhead**
   - Mitigation: Parallel testing, automated CI/CD

---

## Timeline Summary

| Week | Focus | Days | Deliverables |
|------|-------|------|--------------|
| 1 | Model Loading | 51-57 | PyTorch, TF, ONNX loaders + API |
| 2 | 3D Visualization | 58-64 | Advanced rendering + interactions |
| 3 | Inference Engine | 65-69 | Real-time inference + activations |
| 4 | Explainability | 70-72 | Grad-CAM, Saliency, IG |

**Total Duration: 22 days (3.1 weeks)**
**Buffer: 2-3 days for unexpected issues**

---

## After Phase 5.5

With these core features implemented, WhyteBox will be:
- ✅ **Functional** as an AI explainability platform
- ✅ **Educational** with real model visualization
- ✅ **Interactive** with live inference and explanations
- ✅ **Production-ready** for Phase 6 deployment

**Then proceed to Phase 6: Production Deployment**

---

*Created: 2026-02-26*
*Priority: CRITICAL*
*Status: READY TO START*