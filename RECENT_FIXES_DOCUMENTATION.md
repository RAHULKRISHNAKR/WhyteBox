# WhyteBox Recent Fixes Documentation

**Date**: January 2-6, 2026  
**Session Summary**: Fixed critical issues with feature map activation visualization, post-inference interactions, and backend connectivity

---

## Table of Contents

1. [Feature Map Activation Heatmap Fix](#1-feature-map-activation-heatmap-fix)
2. [Post-Inference Interaction Fix](#2-post-inference-interaction-fix)
3. [Backend Inference Connection Fix](#3-backend-inference-connection-fix)
4. [Testing Guide](#testing-guide)
5. [Files Modified](#files-modified)

---

## 1. Feature Map Activation Heatmap Fix

### Problem
Feature map updates with real heatmaps from neural network activations were not working correctly. After running inference, the expanded feature maps would not display the actual activation data as colorful textures.

### Root Causes

1. **Incorrect Channel Extraction Logic**
   - Original code only handled PyTorch 4D format `[batch, channels, height, width]`
   - Didn't support Keras/TensorFlow format `[batch, height, width, channels]`
   - Didn't handle 3D tensors (when batch dimension is removed)

2. **Missing Validation**
   - No proper validation of activation data shape
   - Silent failures when data didn't match expected format
   - No error feedback for debugging

3. **Poor Tensor Format Detection**
   - Couldn't distinguish between PyTorch and Keras tensor layouts
   - Fixed dimensions assumptions broke with different frameworks

### Solution

#### File: `FeatureMapTexturer.js`

**A. Enhanced Tensor Format Detection** (lines 55-113)

Added smart detection for both 3D and 4D tensors with automatic PyTorch/Keras format identification:

```javascript
// Detects format by comparing dimension sizes
if (shape.length === 4) {
    if (shape[1] < shape[3]) {
        // PyTorch format: [batch, channels, height, width]
        numChannels = shape[1];
        height = shape[2];
        width = shape[3];
    } else {
        // Keras format: [batch, height, width, channels]
        height = shape[1];
        width = shape[2];
        numChannels = shape[3];
    }
}
```

**B. Fixed Channel Extraction** (lines 159-265)

Completely rewrote `_extractChannel()` method to handle:
- **PyTorch 4D** `[batch, channels, height, width]` - Uses slice extraction
- **Keras 4D** `[batch, height, width, channels]` - Extracts interleaved data
- **PyTorch 3D** `[channels, height, width]` - Direct slice
- **Keras 3D** `[height, width, channels]` - Interleaved extraction
- **Dense 2D** `[batch, units]` - Returns all values

**C. Improved Material Application** (lines 334-426)

Enhanced `applyActivationToMesh()` with:
- Comprehensive input validation
- Support for both StandardMaterial and PBRMaterial
- Detailed error logging with stack traces
- Graceful degradation for unknown material types

**D. Added Comprehensive Logging**

Throughout the file:
- Deserializing activation data
- Tensor format detection results
- Channel extraction details
- Texture creation progress
- Material application success/failure

### Supported Tensor Formats

| Format | Dimensions | Example Shape | Description |
|--------|-----------|---------------|-------------|
| PyTorch 4D | `[N, C, H, W]` | `[1, 64, 56, 56]` | Batch, Channels, Height, Width |
| Keras 4D | `[N, H, W, C]` | `[1, 56, 56, 64]` | Batch, Height, Width, Channels |
| PyTorch 3D | `[C, H, W]` | `[64, 56, 56]` | Channels, Height, Width |
| Keras 3D | `[H, W, C]` | `[56, 56, 64]` | Height, Width, Channels |
| Dense 2D | `[N, Units]` | `[1, 1000]` | Batch, Units |

### Viridis Colormap

Activation values are normalized to `[0, 1]` and mapped to colors:
- **0.00 - 0.25**: Dark purple → Blue
- **0.25 - 0.50**: Blue → Cyan  
- **0.50 - 0.75**: Cyan → Green
- **0.75 - 1.00**: Green → Yellow

---

## 2. Post-Inference Interaction Fix

### Problem
After running inference and expanding layers, the 3D model became unclickable:
- Could not expand/collapse layers by clicking
- Hover tooltips did not appear
- Demo models failed to load with 404 errors

### Root Causes

1. **Feature Map Picking Interference**
   - Feature map planes created during layer expansion were pickable by default
   - When positioned in front of layer meshes, they intercepted all mouse clicks
   - BabylonJS ray casting hit the feature maps first, blocking layer interaction

2. **Tooltip Element ID Typo**
   - `hideLayerTooltip()` tried to select `layerInfoTooltiip` (3 i's) 
   - Actual element ID was `layerInfoTooltip` (2 i's)
   - Tooltips couldn't be hidden properly

3. **Demo Model Path Issues**
   - HTTP server at `localhost:8000` served from `frontend/` directory
   - Demo model paths tried to access `../../backend/output/` (outside server root)
   - Server couldn't reach files outside its root directory

### Solution

#### A. Made Feature Maps Non-Pickable

**File**: `LayerExpansionController.js` (line 165)

Added `plane.isPickable = false` when creating feature map planes:

```javascript
const plane = BABYLON.MeshBuilder.CreatePlane(
    `featuremap_${layerData.id}_${i}`,
    { width: mapSize.width, height: mapSize.height },
    this.scene
);

// Make feature maps non-pickable so they don't interfere with layer picking
plane.isPickable = false;
```

**Why this works**: BabylonJS picking system respects the `isPickable` property. When `false`, meshes are ignored during ray casting for mouse events, allowing clicks to pass through to pickable layer meshes behind them.

#### B. Fixed Tooltip Typo

**File**: `visualize-model.html` (line 782)

```javascript
// Before (wrong)
const tooltip = document.getElementById('layerInfoTooltiip');

// After (correct)
const tooltip = document.getElementById('layerInfoTooltip');
```

#### C. Fixed Demo Model Paths

**File**: `visualize-model.html` (lines 542, 544)

Changed from relative paths to local paths:
```javascript
// Before
url = '../../backend/output/vgg16_pytorch_visualization.json';

// After  
url = 'vgg16_pytorch_visualization.json';
```

Copied VGG16 visualization JSON to `frontend/examples/` directory so HTTP server can access it.

### Interaction Flow

**Before Fix**:
1. User runs inference → Feature maps expand
2. User hovers → Ray hits feature map (pickable by default)
3. Feature map has no layer metadata → No tooltip
4. User clicks → Click intercepted by feature map → No expansion

**After Fix**:
1. User runs inference → Feature maps expand
2. User hovers → Ray passes through feature map (isPickable=false)
3. Ray hits layer mesh → Tooltip shows layer info
4. User clicks → Click passes through → Layer expands/collapses

---

## 3. Backend Inference Connection Fix

### Problem
Backend server crashed with `ERR_CONNECTION_RESET` when running inference. The API request failed with "Failed to fetch" errors.

### Root Cause
Frontend was passing incorrect model path to backend. Backend expects paths relative to its `models/` folder, but the code wasn't configured correctly.

### Solution

**File**: `visualize-model.html` (line 835)

Updated inference code to pass just the filename:

```javascript
// Backend automatically looks in models/ folder
const modelPath = 'vgg16_pretrained.pth';
const framework = 'pytorch';
```

**Backend behavior** (`api/app.py` line 433):
- If path is relative (not absolute), prepends `UPLOAD_FOLDER` (which points to `models/`)
- Looks for file at `backend/models/vgg16_pretrained.pth`
- Model file exists at this location ✓

---

## Testing Guide

### Prerequisites
1. Backend server running: `cd backend && python api/app.py`
2. Frontend server running: `cd frontend && python -m http.server 8000`
3. VGG16 model downloaded at `backend/models/vgg16_pretrained.pth`

### Test Workflow

1. **Load Model**
   - Open browser to `http://localhost:8000/examples/visualize-model.html`
   - Click "Load VGG16 (Backend Required)"
   - ✅ Model should load and display in 3D

2. **Test Pre-Inference Interactions**
   - Hover over layers → Should see tooltips with layer info
   - Click on a Conv2d layer → Should expand to show feature map grid
   - ✅ All interactions work

3. **Upload and Process Image**
   - Click "📷 Upload Image"
   - Select any image (cat, dog, object, etc.)
   - Click "▶️ Run Inference"
   - ✅ Should see top-5 predictions with confidence scores

4. **Verify Activation Heatmaps**
   - Look at expanded feature maps
   - ✅ Should display colorful textures (viridis colormap)
   - ✅ Dark purple/blue = low activation
   - ✅ Yellow/bright = high activation

5. **Test Post-Inference Interactions**
   - Hover over layers → ✅ Tooltips still work
   - Click layers → ✅ Can still expand/collapse
   - Rotate/pan/zoom → ✅ All camera controls work

### Console Output

When working correctly, you'll see detailed logs:

```
Deserializing activation data with encoding: direct
Deserialized 200704 values from direct encoding
Creating activation texture for channel 0 {shape: [1, 64, 56, 56], dataLength: 200704}
Detected PyTorch format (NCHW)
Extracting channel 0 from shape: [1, 64, 56, 56]
PyTorch 4D extraction: channel 0, range [0:3136], size 3136
Extracted channel 0: 3136 values, expected: 3136
✓ Created activation texture: 56x56
✅ Applied activation texture to StandardMaterial (channel 0)
```

---

## Files Modified

### Frontend Files

| File | Lines Changed | Description |
|------|---------------|-------------|
| `frontend/src/inference/FeatureMapTexturer.js` | 16-32, 55-265, 334-426 | Enhanced activation deserialization, tensor format detection, channel extraction, and material application |
| `frontend/src/visualization/LayerExpansionController.js` | 165 | Made feature map planes non-pickable |
| `frontend/examples/visualize-model.html` | 542, 544, 782, 835 | Fixed tooltip typo, demo model paths, and inference model path |

### Backend Files
No backend files were modified. The existing API at `backend/api/app.py` already had correct behavior.

### New Files Created
| File | Description |
|------|-------------|
| `frontend/examples/vgg16_pytorch_visualization.json` | Copied from `backend/output/` for local HTTP server access |

---

## Summary

This session fixed three critical issues:

1. **Feature map activation heatmaps** now correctly display real neural network activations with:
   - Support for multiple tensor formats (PyTorch/Keras, 3D/4D)
   - Proper channel extraction logic
   - Viridis colormap visualization
   - Comprehensive error logging

2. **Post-inference interactions** are fully functional:
   - Hover tooltips work after inference
   - Layer expansion/collapse works anytime
   - Feature maps don't block mouse events

3. **Backend inference connection** works reliably:
   - Correct model path handling
   - File loading from models directory
   - Successful inference with activation extraction

The WhyteBox 3D visualization now provides complete end-to-end functionality from model loading through inference to real-time activation visualization.
