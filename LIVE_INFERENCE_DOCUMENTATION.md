# WhyteBox Live Inference & Activation Visualization

**Feature Documentation**  
**Version**: 1.0  
**Last Updated**: January 6, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Live Inference System](#live-inference-system)
3. [Activation Visualization](#activation-visualization)
4. [Layer Expansion & Feature Maps](#layer-expansion--feature-maps)
5. [Architecture & Components](#architecture--components)
6. [API Reference](#api-reference)
7. [Usage Examples](#usage-examples)

---

## Overview

WhyteBox provides real-time neural network inference with interactive 3D visualization of layer activations. Users can:

- Upload images and run inference through loaded neural network models
- View top-K predictions with confidence scores
- Expand layers to see individual feature maps
- Visualize real activation data as heatmaps on feature maps
- Interact with the 3D model during and after inference

### Key Features

- ✅ **Real-time Inference** - Run predictions on uploaded images
- ✅ **Activation Extraction** - Capture intermediate layer outputs
- ✅ **3D Heatmap Visualization** - Display activations as colorful textures
- ✅ **Multi-Framework Support** - PyTorch and Keras/TensorFlow
- ✅ **Interactive Exploration** - Click, hover, and inspect during inference
- ✅ **Multiple Tensor Formats** - Automatic detection of NCHW/NHWC layouts

---

## Live Inference System

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Frontend  │─────▶│   Backend    │─────▶│  Neural Network │
│  (Browser)  │      │  API Server  │      │     Model       │
└─────────────┘      └──────────────┘      └─────────────────┘
      │                      │                       │
      │                      │                       │
      ▼                      ▼                       ▼
 Image Upload          Preprocessing          Forward Pass
      │                      │                       │
      │                      │                       │
      ▼                      ▼                       ▼
Display Results   ◀─── Activation      ◀───  Hook Registration
                         Extraction
```

### Components

#### 1. **InferenceController** (Frontend)
`frontend/src/inference/InferenceController.js`

Manages the inference workflow from the browser:

```javascript
const controller = new InferenceController('http://localhost:5000');

const results = await controller.runInference(
    imageFile,           // File object from input
    'model.pth',         // Model path (relative to backend/models/)
    'pytorch',           // Framework: 'pytorch' or 'keras'
    {
        include_activations: true,  // Extract layer activations
        max_features: 64            // Max feature maps per layer
    }
);
```

**Features**:
- State management (idle, uploading, inferencing, displaying)
- Event listeners for state changes
- Automatic API error handling
- Result caching

#### 2. **Backend Inference API**
`backend/api/app.py` - `/api/inference` endpoint

Handles server-side model inference:

**Request Parameters**:
- `image` (file): Image to process
- `model_path` (string): Path to model file
- `framework` (string): 'pytorch' or 'keras'
- `include_activations` (bool): Whether to extract activations
- `max_features` (int): Maximum feature maps per layer
- `layers` (string): Comma-separated layer names (optional)

**Response**:
```json
{
    "success": true,
    "predictions": [
        {"class_name": "golden_retriever", "confidence": 0.89},
        {"class_name": "labrador", "confidence": 0.06}
    ],
    "activations": {
        "conv1": {
            "shape": [1, 64, 112, 112],
            "encoding": "direct",
            "data": [...]
        },
        "conv2": {...}
    }
}
```

#### 3. **ActivationExtractor** (Backend)
`backend/core/activation_extractor.py`

Extracts intermediate layer outputs during forward pass:

**PyTorch Implementation**:
- Registers forward hooks on specified layers
- Captures outputs during model inference
- Serializes activations for transmission

**Keras Implementation**:
- Creates intermediate models to specified layers
- Runs predictions to extract outputs
- Handles multi-output layers

---

## Activation Visualization

### Feature Map Texturing

The `FeatureMapTexturer` class converts raw activation data into visual textures applied to 3D feature map meshes.

#### Process Flow

```
Activation Data (NumPy) 
    ↓
Deserialization (Float32Array)
    ↓
Format Detection (NCHW vs NHWC)
    ↓
Channel Extraction
    ↓
Normalization [0, 1]
    ↓
Colormap Application (Viridis)
    ↓
Dynamic Texture Creation
    ↓
Material Application
```

### Tensor Format Support

The system automatically detects and handles multiple tensor layouts:

| Format | Layout | Example Shape | Use Case |
|--------|--------|---------------|----------|
| **PyTorch 4D** | NCHW | `[1, 64, 56, 56]` | Convolutional layers |
| **Keras 4D** | NHWC | `[1, 56, 56, 64]` | TensorFlow models |
| **PyTorch 3D** | CHW | `[64, 56, 56]` | Single batch |
| **Keras 3D** | HWC | `[56, 56, 64]` | Single batch TF |
| **Dense 2D** | [N, Units] | `[1, 1000]` | Fully connected |

#### Format Detection Algorithm

```javascript
if (shape[1] < shape[3]) {
    // NCHW (channels < width)
    // PyTorch format
} else {
    // NHWC (height < channels)
    // Keras/TensorFlow format
}
```

### Viridis Colormap

Activation values are mapped to a perceptually uniform colormap:

```
Value Range    Color          RGB
───────────────────────────────────
0.00 - 0.25   Dark Purple    (68, 1, 84)
0.25 - 0.50   Blue           (39, 75, 145)
0.50 - 0.75   Cyan/Green     (31, 130, 142)
0.75 - 1.00   Yellow         (253, 231, 37)
```

**Advantages**:
- High contrast for distinguishing activation levels
- Colorblind-friendly
- Print-friendly
- Perceived as continuous

### Channel Extraction

For multi-channel tensors, individual channels are extracted:

**PyTorch (NCHW)**: Contiguous slicing
```javascript
const channelStart = channelIndex * (height * width);
return activations.slice(channelStart, channelStart + height * width);
```

**Keras (NHWC)**: Interleaved extraction
```javascript
for (let i = 0; i < height * width; i++) {
    result[i] = activations[i * numChannels + channelIndex];
}
```

---

## Layer Expansion & Feature Maps

### Layer Expansion System

Users can click on layers to expand them into individual feature map visualizations.

#### Expandable Layer Types
- Convolutional layers (Conv1d, Conv2d, Conv3d)
- Pooling layers (MaxPool2d, AvgPool2d)
- Dense/Linear layers

#### Feature Map Generation

**File**: `LayerExpansionController.js`

When a layer is expanded:

1. **Calculate Grid Layout**
   ```javascript
   const cols = Math.ceil(Math.sqrt(numMaps));
   const rows = Math.ceil(numMaps / cols);
   ```

2. **Create Feature Map Planes**
   - Creates BABYLON.Plane meshes
   - Positions in grid formation
   - Sets `isPickable = false` to not block interactions
   - Applies gradient coloring

3. **Animate Expansion**
   - Staggered animation for visual appeal
   - Ease-out cubic for smooth motion
   - 800ms duration with fade-in

4. **Apply Activations** (if available)
   - Match feature maps to activation channels
   - Create dynamic textures from data
   - Apply textures to plane materials

### Interaction Preservation

Feature maps are configured to allow underlying layer interaction:

```javascript
plane.isPickable = false;  // Allows click-through to layer meshes
```

This ensures:
- ✅ Hover tooltips work on layers with expanded maps
- ✅ Layers can be re-clicked to collapse
- ✅ Camera controls remain responsive

---

## Architecture & Components

### Frontend Components

```
frontend/src/
├── inference/
│   ├── InferenceController.js      # Manages inference workflow
│   └── FeatureMapTexturer.js       # Converts activations to textures
├── visualization/
│   ├── LayerExpansionController.js # Handles layer expansion
│   ├── ModelVisualizer.js          # Main 3D scene orchestrator
│   └── layerVisualizers/           # Individual layer renderers
└── core/
    └── Scene3DManager.js           # BabylonJS scene management
```

### Backend Components

```
backend/
├── api/
│   └── app.py                      # Flask API endpoints
├── core/
│   └── activation_extractor.py     # Layer output capture
└── utils/
    └── image_preprocessor.py       # Image preprocessing & prediction decoding
```

### Data Flow

```
1. User uploads image
   ↓
2. Frontend → POST /api/inference
   ↓
3. Backend preprocesses image
   ↓
4. Backend runs model.forward()
   ↓
5. Activation hooks capture layer outputs
   ↓
6. Backend serializes activations
   ↓
7. Response with predictions + activations
   ↓
8. Frontend applies textures to expanded layers
   ↓
9. User sees colorful heatmaps on feature maps
```

---

## API Reference

### InferenceController

#### Constructor
```javascript
new InferenceController(apiBaseUrl)
```
- `apiBaseUrl`: Backend API URL (default: 'http://localhost:5000')

#### Methods

**runInference(imageFile, modelPath, framework, options)**
```javascript
await controller.runInference(imageFile, 'vgg16.pth', 'pytorch', {
    include_activations: true,
    max_features: 64,
    layers: ['conv1', 'conv2']  // Optional
});
```

**getActivationForLayer(layerId)**
```javascript
const activation = controller.getActivationForLayer('conv1');
// Returns: { shape: [...], encoding: 'direct', data: [...] }
```

**getPredictions()**
```javascript
const predictions = controller.getPredictions();
// Returns: [{ class_name: '...', confidence: 0.xx }, ...]
```

**clear()**
```javascript
controller.clear();  // Resets state and clears cache
```

### FeatureMapTexturer

#### Constructor
```javascript
new FeatureMapTexturer(scene)
```
- `scene`: BabylonJS scene instance

#### Methods

**applyActivationToMesh(mesh, activationData, channelIndex)**
```javascript
texturer.applyActivationToMesh(
    featureMapMesh,
    activationData,
    0  // Channel index
);
```

**createActivationTexture(activations, shape, channelIndex)**
```javascript
const texture = texturer.createActivationTexture(
    Float32Array,
    [1, 64, 56, 56],
    0
);
```

### LayerExpansionController

#### Constructor
```javascript
new LayerExpansionController(scene)
```

#### Methods

**toggleExpansion(layerId, meshData, layerData)**
```javascript
controller.toggleExpansion('conv1', meshData, layerData);
```

**expandLayer(layerId, meshData, layerData, activationData)**
```javascript
await controller.expandLayer(
    'conv1',
    meshData,
    layerData,
    activationData  // Optional
);
```

**collapseLayer(layerId)**
```javascript
await controller.collapseLayer('conv1');
```

---

## Usage Examples

### Basic Inference

```javascript
// Initialize controller
const inferenceController = new InferenceController('http://localhost:5000');

// Handle image upload
async function handleInference(imageFile) {
    try {
        const results = await inferenceController.runInference(
            imageFile,
            'vgg16_pretrained.pth',
            'pytorch',
            { include_activations: true, max_features: 64 }
        );
        
        // Display predictions
        console.log('Top predictions:', results.predictions);
        
        // Apply activations to expanded layers
        applyActivationsToExpandedLayers(results.activations);
        
    } catch (error) {
        console.error('Inference failed:', error);
    }
}
```

### Applying Activations to Feature Maps

```javascript
function applyActivations(activations) {
    const texturer = new FeatureMapTexturer(scene);
    
    // Get all expanded layers
    const expandedLayers = expansionController.expandedLayers;
    
    expandedLayers.forEach((expansionData, layerId) => {
        const activation = activations[layerId];
        
        if (activation) {
            expansionData.featureMaps.forEach((fm) => {
                texturer.applyActivationToMesh(
                    fm.mesh,
                    activation,
                    fm.channelIndex
                );
            });
        }
    });
}
```

### Layer Expansion with Activations

```javascript
// Expand a layer
await expansionController.expandLayer(
    'conv1',
    meshData,
    layerData
);

// Later, after inference, apply activations
const activation = inferenceController.getActivationForLayer('conv1');
if (activation) {
    const featureMaps = expansionController.expandedLayers.get('conv1').featureMaps;
    featureMaps.forEach(fm => {
        texturer.applyActivationToMesh(fm.mesh, activation, fm.channelIndex);
    });
}
```

### Custom Colormap

To use a different colormap, modify `_applyColormap()` in `FeatureMapTexturer.js`:

```javascript
_applyColormap(value) {
    // Grayscale
    const intensity = Math.floor(value * 255);
    return { r: intensity, g: intensity, b: intensity };
    
    // Or custom RGB mapping
    return {
        r: Math.floor(value * 255),
        g: Math.floor((1 - value) * 255),
        b: 128
    };
}
```

---

## Performance Considerations

### Optimization Techniques

1. **Feature Map Limiting**
   - Max 64 feature maps per layer by default
   - Prevents performance degradation with high-channel layers

2. **Activation Compression**
   - `direct` encoding for small datasets
   - `base64_npy_float16` for large activations (future)

3. **Model Caching**
   - Backend caches loaded models
   - Avoids reload on each inference

4. **Texture Reuse**
   - BabylonJS manages texture memory
   - Automatic cleanup on layer collapse

### Memory Management

```javascript
// Clear resources when done
inferenceController.clear();
expansionController.collapseAll();
```

---

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

**Requirements**:
- WebGL 2.0 support
- ES6+ JavaScript
- Fetch API

---

## Known Limitations

1. **Tensor Size**: Very large activations (>100MB) may be slow to transfer
2. **Feature Maps**: Limited to 64 per layer for performance
3. **Frameworks**: Currently PyTorch and Keras/TensorFlow only
4. **Image Formats**: Standard web formats (JPEG, PNG, WebP)

---

## Future Enhancements

- [ ] Support for ONNX models
- [ ] WebAssembly acceleration for preprocessing
- [ ] Real-time video inference
- [ ] Custom activation layer selection UI
- [ ] Activation comparison across multiple images
- [ ] Export activation data as CSV/JSON
- [ ] Interactive colormap selection

---

## Troubleshooting

### Common Issues

**Activations not displaying**:
- Check browser console for errors
- Verify `include_activations: true` in request
- Ensure layer is expanded before inference

**Backend connection errors**:
- Verify backend is running on `localhost:5000`
- Check CORS is enabled
- Confirm model file exists in `backend/models/`

**Slow performance**:
- Reduce `max_features` option
- Limit number of expanded layers
- Use smaller input images

### Debug Logging

Enable detailed logging in `FeatureMapTexturer.js`:
```javascript
console.log('Creating activation texture for channel', channelIndex);
console.log('Detected format:', format);
console.log('Extracted channel data:', channelData.length);
```

---

## References

- [BabylonJS Documentation](https://doc.babylonjs.com/)
- [PyTorch Hooks](https://pytorch.org/tutorials/beginner/former_torchies/nnft_tutorial.html#forward-and-backward-function-hooks)
- [Viridis Colormap](https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html)

---

**End of Documentation**
