# WhyteBox Backend - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Run Example Conversion (VGG16)

```powershell
python examples\convert_vgg16.py
```

This will:
- Extract VGG16 architecture from PyTorch/Keras
- Convert to visualization format
- Save JSON to `output/` folder
- Display summary information

### Step 3: Start API Server (Optional)

```powershell
python api\app.py
```

Server will start on `http://localhost:5000`

### Step 4: Test API (Optional)

Open another terminal:

```powershell
# Health check
curl http://localhost:5000/api/health

# List converted models
curl http://localhost:5000/api/models
```

---

## 📊 What Gets Generated?

The converter produces a comprehensive JSON file containing:

```json
{
  "metadata": {
    "model_name": "VGG16",
    "framework": "pytorch",
    "total_layers": 41,
    "total_parameters": 138357544,
    "input_shape": [1, 3, 224, 224],
    "output_shape": [1, 1000]
  },
  "layers": [
    {
      "id": "layer_0",
      "name": "features.0",
      "type": "Conv2d",
      "input_shape": [1, 3, 224, 224],
      "output_shape": [1, 64, 224, 224],
      "parameters": {
        "in_channels": 3,
        "out_channels": 64,
        "kernel_size": [3, 3],
        "stride": [1, 1],
        "padding": [1, 1]
      },
      "activation": null,
      "visualization": {
        "color": "#4A90E2",
        "opacity": 1.0,
        "size_hint": 1.5
      }
    },
    // ... more layers
  ],
  "connections": [
    {
      "from_layer": "layer_0",
      "to_layer": "layer_1",
      "connection_type": "sequential",
      "data_flow": "forward"
    }
    // ... more connections
  ],
  "architecture": {
    "architecture_type": "VGG",
    "has_skip_connections": false,
    "depth": 41
  },
  "visualization_hints": {
    "recommended_layout": "linear",
    "color_scheme": "gradient",
    "layer_spacing": 2.0
  }
}
```

---

## 🎯 Common Use Cases

### 1. Convert Your Own PyTorch Model

```python
import torch
from extractors.pytorch_extractor import PyTorchExtractor
from converters.universal_converter import UniversalConverter

# Your model
model = YourModel()
model.load_state_dict(torch.load('your_model.pth'))

# Extract and convert
extractor = PyTorchExtractor(model, input_shape=(1, 3, 224, 224))
data = extractor.extract()

converter = UniversalConverter()
viz_data = converter.convert(data)
converter.save_to_file(viz_data, 'output/your_model.json')
```

### 2. Convert Keras Model

```python
from tensorflow.keras.models import load_model
from extractors.keras_extractor import KerasExtractor
from converters.universal_converter import UniversalConverter

model = load_model('your_model.h5')

extractor = KerasExtractor(model)
data = extractor.extract()

converter = UniversalConverter()
viz_data = converter.convert(data)
converter.save_to_file(viz_data, 'output/your_model.json')
```

### 3. Use API to Convert

```powershell
curl -X POST http://localhost:5000/api/convert `
  -F "model=@path/to/model.pth" `
  -F "framework=pytorch" `
  -F "input_shape=1,3,224,224" `
  -F "model_name=MyModel"
```

---

## 🧪 Running Tests

```powershell
# Install test dependencies
pip install pytest pytest-cov

# Run all tests
pytest tests/ -v

# Run with coverage
pytest --cov=. tests/

# Run specific test file
pytest tests/test_extraction.py -v
```

---

## 🔍 Troubleshooting

### "ModuleNotFoundError: No module named 'torch'"

```powershell
pip install torch torchvision
```

### "ModuleNotFoundError: No module named 'tensorflow'"

```powershell
pip install tensorflow
```

### "No module named 'extractors'"

Make sure you're running scripts from the correct directory:

```powershell
cd backend
python examples\convert_vgg16.py
```

### Output folder not found

The script will create it automatically, but you can create manually:

```powershell
mkdir output
mkdir models
```

---

## 📁 Generated Files

After running conversions, check these locations:

```
backend/
├── output/                           # ← Converted JSON files here
│   ├── vgg16_pytorch_visualization.json
│   └── vgg16_keras_visualization.json
│
├── models/                           # ← Uploaded models stored here
│   └── 20251015_123456_model.pth
```

---

## 🎨 Using with Frontend

The generated JSON files can be loaded in your frontend visualization:

```javascript
// Fetch the converted model
fetch('http://localhost:5000/api/download/vgg16_pytorch_visualization.json')
  .then(response => response.json())
  .then(modelData => {
    // Use with TensorSpace, Babylon.js, or custom visualizer
    buildVisualization(modelData);
  });
```

---

## 📊 Supported Models

### Pre-trained Models (via torchvision/keras.applications):
- ✅ VGG (11, 13, 16, 19)
- ✅ ResNet (18, 34, 50, 101, 152)
- ✅ MobileNet (v2, v3)
- ✅ EfficientNet
- ✅ Inception (v3)
- ✅ DenseNet

### Custom Models:
- ✅ Any PyTorch nn.Module
- ✅ Any Keras Model (Sequential, Functional)
- 🔄 ONNX models (coming soon)

---

## 🚦 Next Steps

1. ✅ **Generated your first visualization** → Load it in the frontend
2. 📚 **Read the main README.md** → Understand the full architecture
3. 🔧 **Customize converters** → Add your own layer types
4. 🌐 **Integrate with your app** → Use the API endpoints

---

## 💡 Tips

- **Start small**: Test with simple models before complex architectures
- **Without weights**: Set `extract_weights=False` for faster conversion
- **Check output**: Always inspect the generated JSON to understand the structure
- **Validate**: Use the validator to ensure JSON quality

---

## 🐛 Known Issues

1. **Very large models (>1GB)** may take time to process
   - Solution: Use `extract_weights=False`

2. **Custom layers** may not be fully supported
   - Solution: Extend extractors with custom layer handlers

3. **Dynamic models** (e.g., conditional branching) have limited support
   - Solution: Use static graph versions

---

## 📞 Need Help?

- Check `examples/` folder for working code
- Review `tests/` for usage patterns
- Read layer-specific documentation in extractors

---

**Ready to visualize? Start with the VGG16 example!**

```powershell
python examples\convert_vgg16.py
```
