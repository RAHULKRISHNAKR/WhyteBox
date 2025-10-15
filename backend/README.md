# WhyteBox Backend - Neural Network Model Converter

> **Universal model converter for 3D neural network visualization**

The WhyteBox Backend is a comprehensive system that converts neural networks from popular Python deep learning frameworks (PyTorch, TensorFlow/Keras, ONNX) into a structured JSON format optimized for 3D visualization in the frontend.

---

## 🎯 Purpose

Transform any neural network architecture into visualization-ready data containing:
- **Layer details** (type, shape, parameters)
- **Connection topology** (layer-to-layer connections)
- **Kernel weights** (for convolutional layers)
- **Activation functions** and configurations
- **Metadata** (model name, framework, total parameters)

---

## 📁 Directory Structure

```
backend/
├── extractors/          # Model introspection modules
│   ├── pytorch_extractor.py      # PyTorch model extraction
│   ├── keras_extractor.py        # TensorFlow/Keras extraction
│   ├── onnx_extractor.py         # ONNX model extraction
│   └── base_extractor.py         # Abstract base extractor
│
├── converters/          # Format transformation utilities
│   ├── tensorspace_converter.py  # TensorSpace format
│   ├── babylon_converter.py      # Babylon.js format
│   └── universal_converter.py    # Universal JSON format
│
├── validators/          # Quality assurance
│   ├── schema_validator.py       # JSON schema validation
│   ├── topology_validator.py     # Connection validation
│   └── data_validator.py         # Data integrity checks
│
├── api/                 # REST API endpoints
│   ├── app.py                    # Flask application
│   ├── routes.py                 # API route definitions
│   └── utils.py                  # API utilities
│
├── examples/            # Usage examples
│   ├── convert_vgg16.py          # VGG16 example
│   ├── convert_resnet50.py       # ResNet50 example
│   └── batch_convert.py          # Batch processing
│
├── tests/               # Test suite
│   ├── test_extractors.py
│   ├── test_converters.py
│   └── test_validators.py
│
├── output/              # Generated visualization files
├── models/              # Sample model storage
└── requirements.txt     # Python dependencies
```

---

## 🚀 Quick Start

### Installation

1. **Create virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Basic Usage

#### Convert a PyTorch Model

```python
from extractors.pytorch_extractor import PyTorchExtractor
from converters.universal_converter import UniversalConverter

# Load your model
import torchvision.models as models
model = models.vgg16(pretrained=True)

# Extract model information
extractor = PyTorchExtractor(model, input_shape=(1, 3, 224, 224))
model_data = extractor.extract()

# Convert to visualization format
converter = UniversalConverter()
viz_data = converter.convert(model_data)

# Save to file
converter.save_to_file(viz_data, 'output/vgg16_visualization.json')
```

#### Convert a Keras Model

```python
from extractors.keras_extractor import KerasExtractor
from converters.universal_converter import UniversalConverter

# Load your model
from tensorflow.keras.applications import VGG16
model = VGG16(weights='imagenet')

# Extract and convert
extractor = KerasExtractor(model)
model_data = extractor.extract()

converter = UniversalConverter()
viz_data = converter.convert(model_data)
converter.save_to_file(viz_data, 'output/vgg16_keras.json')
```

#### Using the API

```bash
# Start the Flask API server
python api/app.py

# Upload and convert a model (in another terminal)
curl -X POST http://localhost:5000/api/convert \
  -F "model=@path/to/model.pth" \
  -F "framework=pytorch" \
  -F "input_shape=1,3,224,224"
```

---

## 📊 Output Format

The converter generates a comprehensive JSON structure:

```json
{
  "metadata": {
    "model_name": "VGG16",
    "framework": "pytorch",
    "version": "1.0.0",
    "total_layers": 41,
    "total_parameters": 138357544,
    "input_shape": [1, 3, 224, 224],
    "output_shape": [1, 1000],
    "timestamp": "2025-10-15T10:30:00Z"
  },
  "layers": [
    {
      "id": "layer_0",
      "name": "conv1_1",
      "type": "Conv2d",
      "index": 0,
      "input_shape": [1, 3, 224, 224],
      "output_shape": [1, 64, 224, 224],
      "parameters": {
        "kernel_size": [3, 3],
        "stride": [1, 1],
        "padding": [1, 1],
        "in_channels": 3,
        "out_channels": 64,
        "has_bias": true
      },
      "weights": {
        "shape": [64, 3, 3, 3],
        "total_params": 1792,
        "data": "base64_encoded_or_url"
      },
      "activation": "relu",
      "trainable": true
    }
  ],
  "connections": [
    {
      "from_layer": "layer_0",
      "to_layer": "layer_1",
      "connection_type": "sequential",
      "data_flow": "forward"
    }
  ],
  "visualization_hints": {
    "color_scheme": "default",
    "layout": "sequential",
    "grouping": ["stage1", "stage2", "stage3", "stage4", "stage5"]
  }
}
```

---

## 🔧 Features

### ✅ Supported Frameworks
- **PyTorch** (torchvision models, custom models)
- **TensorFlow/Keras** (Sequential, Functional, Subclassed)
- **ONNX** (converted models from any framework)

### ✅ Supported Layer Types
- Convolutional (Conv1d, Conv2d, Conv3d, DepthwiseConv, TransposedConv)
- Pooling (MaxPool, AvgPool, GlobalPooling)
- Dense/Linear layers
- Normalization (BatchNorm, LayerNorm, GroupNorm)
- Activation functions (ReLU, Sigmoid, Tanh, Softmax, etc.)
- Dropout, Flatten, Reshape
- Residual connections (Add, Concatenate)

### ✅ Extraction Capabilities
- Layer topology and connectivity
- Parameter counts and shapes
- Kernel/weight dimensions
- Activation functions
- Skip connections (ResNet-style)
- Multi-branch architectures (Inception-style)

### ✅ Validation System
- JSON schema compliance
- Topology consistency checks
- Shape compatibility verification
- Weight dimension validation
- Connection integrity checks

---

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
pytest tests/

# Run specific test
pytest tests/test_extractors.py -v

# Test with coverage
pytest --cov=. tests/
```

Test with example models:

```bash
# VGG16 conversion test
python examples/convert_vgg16.py

# ResNet50 conversion test
python examples/convert_resnet50.py
```

---

## 📚 API Documentation

### Endpoints

#### `POST /api/convert`
Convert an uploaded model file to visualization format.

**Parameters**:
- `model` (file): Model file (.pth, .h5, .onnx)
- `framework` (string): 'pytorch', 'keras', or 'onnx'
- `input_shape` (string): Input shape as comma-separated values

**Response**:
```json
{
  "status": "success",
  "output_file": "output/model_12345.json",
  "download_url": "/api/download/model_12345.json",
  "metadata": { ... }
}
```

#### `GET /api/download/<filename>`
Download converted visualization file.

#### `GET /api/models`
List available converted models.

#### `POST /api/validate`
Validate a visualization JSON file.

---

## 🎨 Integration with Frontend

The generated JSON files can be consumed by:

1. **TensorSpace.js** - Load as preprocessed model
2. **Babylon.js** - Use for node-based visualization
3. **Custom viewers** - Parse JSON for any visualization approach

Example integration:

```javascript
// Frontend (JavaScript)
fetch('/api/convert', {
  method: 'POST',
  body: formData
})
.then(res => res.json())
.then(data => {
  // Load in TensorSpace
  const model = new TSP.models.Sequential(/* ... */);
  // Or use in Babylon.js custom visualizer
  buildBabylonVisualization(data);
});
```

---

## 🔍 Advanced Usage

### Custom Extractors

Create custom extractors for specialized architectures:

```python
from extractors.base_extractor import BaseExtractor

class CustomExtractor(BaseExtractor):
    def extract_layers(self):
        # Custom extraction logic
        pass
    
    def extract_connections(self):
        # Custom connection logic
        pass
```

### Batch Processing

```python
from examples.batch_convert import batch_convert_models

models_list = [
    ('models/vgg16.pth', 'pytorch'),
    ('models/resnet50.h5', 'keras'),
    ('models/mobilenet.onnx', 'onnx')
]

batch_convert_models(models_list, output_dir='output/')
```

---

## 🐛 Troubleshooting

### Common Issues

1. **Import errors**: Ensure all dependencies are installed
   ```bash
   pip install -r requirements.txt
   ```

2. **Shape mismatch**: Verify input_shape matches model expectations
   ```python
   # PyTorch expects: (batch, channels, height, width)
   input_shape = (1, 3, 224, 224)
   ```

3. **Memory errors**: Use `extract_weights=False` for large models
   ```python
   extractor = PyTorchExtractor(model, extract_weights=False)
   ```

---

## 📄 License

MIT License - Part of the WhyteBox project

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional framework support (JAX, MXNet)
- More layer types
- Performance optimizations
- Enhanced visualization hints

---

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing examples in `examples/`
- Review test cases in `tests/`
