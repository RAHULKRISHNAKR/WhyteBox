# 🚀 Interactive Model Converter - User Guide

## Overview

The Interactive Model Converter is a CLI tool that allows you to:
- **Browse** 20+ pre-trained neural network architectures
- **Automatically cache** converted models (no re-conversion needed)
- **View** complete model details in the terminal
- **Export** visualization-ready JSON files

---

## 🎯 Quick Start

### Method 1: Direct Python
```powershell
cd backend
python examples\interactive_converter.py
```

### Method 2: Batch Script (Windows)
```powershell
cd backend
.\run_interactive.bat
```

### Method 3: PowerShell Script
```powershell
cd backend
.\run_interactive.ps1
```

---

## 📋 Available Models (20 PyTorch Models)

### CNN Architectures
1. **VGG16** - 138M parameters, 16 layers
2. **VGG19** - 144M parameters, 19 layers
3. **ResNet18** - 11.7M parameters, 18 layers
4. **ResNet34** - 21.8M parameters, 34 layers
5. **ResNet50** - 25.6M parameters, 50 layers
6. **ResNet101** - 44.5M parameters, 101 layers
7. **DenseNet121** - 8M parameters, dense connections
8. **DenseNet161** - 28.7M parameters, dense connections

### Efficient Architectures
9. **MobileNetV2** - 3.5M parameters, mobile-optimized
10. **MobileNetV3-Small** - 2.5M parameters, lightweight
11. **MobileNetV3-Large** - 5.5M parameters, efficient
12. **SqueezeNet1_0** - 1.2M parameters, fire modules
13. **SqueezeNet1_1** - 1.2M parameters, improved
14. **EfficientNet-B0** - 5.3M parameters, compound scaling
15. **EfficientNet-B1** - 7.8M parameters, compound scaling
16. **RegNet-Y-400MF** - 4.3M parameters, regularized

### Classic Architectures
17. **AlexNet** - 61M parameters, pioneering CNN
18. **InceptionV3** - 27M parameters, inception modules
19. **GoogLeNet** - 13M parameters, 22 layers
20. **ShuffleNetV2** - 2.3M parameters, channel shuffle

---

## 🎨 Features

### 1. Smart Caching System
- **First time**: Converts model and saves to `output/` folder
- **Subsequent times**: Instantly loads from cache
- **Cache indicator**: ✓ Cached or New shown in menu

### 2. Automatic Conversion
```
Selected Model Not Cached → Load Model → Extract Layers → Convert to JSON → Save → Display
Selected Model Cached     → Load from output/ → Display
```

### 3. Detailed Terminal Display

When you select a model, you'll see:

#### Model Metadata
```
Model Name:          VGG16
Framework:           PYTORCH
Total Layers:        41
Total Parameters:    138,357,544
Input Shape:         [1, 3, 224, 224]
Output Shape:        [1, 1000]
```

#### Layer Information
```
Layers (41 total):
  [1] features.0        Conv2d          → [1, 64, 224, 224]    (1,792 params) #4A90E2
  [2] features.1        ReLU            → [1, 64, 224, 224]    (0 params)     #E74C3C
  ...
  [41] classifier.6     Linear          → [1, 1000]            (4,096,000 params) #50C878
```

#### Connections
```
Connections (38 total):
  layer_0 → layer_1 (sequential)
  layer_1 → layer_2 (sequential)
  ...
```

#### Architecture Analysis
```
Architecture:
  Type:                VGG
  Depth:               16
  Skip Connections:    False
  Branches:            False
```

#### Visualization Hints
```
Visualization Hints:
  Layout:              sequential
  Camera Position:     [0, 5, 20]
  Layer Spacing:       2.0
  Color Scheme:        layer_type
```

#### File Information
```
File:
  Location:            output/vgg16_pytorch_visualization.json
  Size:                45.65 KB
  Format:              JSON
```

---

## 💡 Usage Examples

### Example 1: Convert VGG16 (First Time)
```
🎯 Select a model (enter number): 1

Selected: VGG16
⚠️  No cached output found.
   Converting model now...

🔄 Converting VGG16...
   Loading model from torchvision...
   Extracting layers and connections...
   Converting to visualization format...
   ✓ Saved to: vgg16_pytorch_visualization.json

✓ Conversion complete!

[Displays detailed model information]
```

### Example 2: Load VGG16 (Cached)
```
🎯 Select a model (enter number): 1

Selected: VGG16
✓ Found cached output: vgg16_pytorch_visualization.json
   Loading from cache...

[Instantly displays model information]
```

### Example 3: Convert ResNet50
```
🎯 Select a model (enter number): 5

Selected: ResNet50
⚠️  No cached output found.
   Converting model now...

[Converts and displays ResNet50 information]
```

---

## 📂 Output Files

All converted models are saved to: `backend/output/`

### File Naming Convention
```
{model_name}_{framework}_visualization.json

Examples:
- vgg16_pytorch_visualization.json
- resnet50_pytorch_visualization.json
- mobilenetv2_pytorch_visualization.json
```

### File Contents
Each JSON file contains:
- **metadata**: Model name, framework, parameter counts, shapes
- **layers**: Complete layer definitions with parameters
- **connections**: Data flow between layers
- **architecture**: Structural analysis
- **visualization_hints**: Rendering suggestions

---

## 🔧 Technical Details

### What Happens During Conversion

1. **Model Loading**
   ```python
   model = models.vgg16(pretrained=False)
   model.eval()
   ```

2. **Layer Extraction**
   - Forward hooks capture tensor shapes
   - Parameters extracted (kernel size, stride, etc.)
   - Weights counted but not exported (smaller files)

3. **JSON Conversion**
   - Universal format creation
   - Color assignment by layer type
   - Visualization hints generation

4. **File Saving**
   - JSON schema validation
   - File saved to output folder
   - Size optimization applied

---

## 🎯 Integration with Frontend

After conversion, use the JSON files in your visualization:

### Babylon.js Example
```javascript
fetch('backend/output/vgg16_pytorch_visualization.json')
  .then(res => res.json())
  .then(modelData => {
    // Create 3D visualization
    modelData.layers.forEach(layer => {
      // Create 3D mesh for each layer
    });
  });
```

### TensorSpace.js Example
```javascript
const modelData = await loadJSON('output/vgg16_pytorch_visualization.json');
const model = new TSP.models.Sequential(container);
// Add layers from JSON
```

---

## 📊 Performance

### Conversion Time (approx.)
- **VGG16**: ~5 seconds
- **ResNet50**: ~8 seconds
- **MobileNetV2**: ~3 seconds
- **EfficientNet**: ~6 seconds

### File Sizes (without weights)
- **VGG16**: ~46 KB
- **ResNet50**: ~60-80 KB
- **MobileNetV2**: ~20-30 KB
- **DenseNet**: ~50-70 KB

### Cache Loading
- **Instant**: < 1 second for any cached model

---

## 🐛 Troubleshooting

### Issue: "No module named 'torch'"
```powershell
pip install torch torchvision
```

### Issue: Model conversion fails
- Check internet connection (models download from PyTorch)
- Ensure sufficient disk space (output folder)
- Check Python version (3.8+)

### Issue: Cache not working
- Check `backend/output/` folder exists
- Verify write permissions
- Look for error messages during save

### Issue: Terminal display cut off
- Expand terminal window
- Full data is still in JSON file

---

## 🚀 Advanced Usage

### Convert All Models (Batch)
Create a script to convert all models at once:

```python
from interactive_converter import ModelConverter

converter = ModelConverter()
for key, model_info in converter.pytorch_models.items():
    try:
        converter.convert_pytorch_model(model_info)
        print(f"✓ {model_info['name']} converted")
    except Exception as e:
        print(f"✗ {model_info['name']} failed: {e}")
```

### Custom Model Addition
Add your own model to the list:

```python
self.pytorch_models['21'] = {
    'name': 'MyCustomModel',
    'loader': lambda: your_model_loader(),
    'input_shape': (1, 3, 224, 224)
}
```

---

## 📝 Tips & Best Practices

1. **Convert popular models first** - Start with VGG16, ResNet50
2. **Use cache** - Don't delete output folder to avoid re-conversion
3. **Check file sizes** - Larger models = larger JSON files
4. **Terminal width** - Expand for better display
5. **Background running** - Conversion runs in foreground, be patient

---

## 🎉 Summary

The Interactive Model Converter makes it easy to:
- ✅ Browse 20+ neural network architectures
- ✅ Convert models with a single number input
- ✅ Automatically cache for instant reuse
- ✅ View complete model details in terminal
- ✅ Generate visualization-ready JSON files

**Just run it and select a number!** 🚀

---

## 📞 Next Steps

1. Run the interactive converter
2. Select a model (try VGG16 first)
3. Check the output folder for JSON file
4. Load JSON in your frontend visualization
5. Try different models!

**Command:**
```powershell
cd backend
python examples\interactive_converter.py
```

Enjoy exploring neural network architectures! 🎨
