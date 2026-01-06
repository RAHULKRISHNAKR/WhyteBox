# WhyteBox Backend - Complete Technical Documentation

**Version:** 1.0.0  
**Date:** October 16, 2025  
**Purpose:** Neural Network Model Conversion System for 3D Visualization

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [API Reference](#api-reference)
6. [File Format Specifications](#file-format-specifications)
7. [Extension Guide](#extension-guide)
8. [Troubleshooting](#troubleshooting)

---

## System Overview

### Purpose

The WhyteBox Backend is a comprehensive system designed to:
1. **Extract** layer information from neural network models (PyTorch, Keras, ONNX)
2. **Convert** extracted data into a universal JSON format
3. **Validate** the output against a defined schema
4. **Serve** models via REST API or CLI tools

### Key Features

- ✅ Multi-framework support (PyTorch, TensorFlow/Keras, ONNX)
- ✅ Automatic layer detection and shape inference
- ✅ Connection topology analysis
- ✅ Visualization-optimized output format
- ✅ REST API for model upload and conversion
- ✅ Interactive CLI for quick conversions
- ✅ Smart caching system
- ✅ Comprehensive validation

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WhyteBox Backend                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │  Extractors  │─────▶│  Converters  │─────▶│Validators││
│  └──────────────┘      └──────────────┘      └──────────┘ │
│         │                      │                    │      │
│         │                      │                    │      │
│    ┌────┴────┐           ┌────┴────┐         ┌────┴───┐  │
│    │PyTorch  │           │Universal│         │ Schema │  │
│    │ Keras   │           │ JSON    │         │Validator│ │
│    │ ONNX    │           │         │         │        │  │
│    └─────────┘           └─────────┘         └────────┘  │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                    Interfaces                             │
├───────────────────────────────────────────────────────────┤
│  ┌──────────┐              ┌──────────────────┐          │
│  │Flask API │              │Interactive CLI   │          │
│  │(HTTP)    │              │(Terminal)        │          │
│  └──────────┘              └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction

```
User Input (Model)
      ↓
┌─────────────┐
│  Extractor  │ ← Detects framework (PyTorch/Keras/ONNX)
└──────┬──────┘
       │
       ├─→ Extract Layers (types, shapes, parameters)
       ├─→ Extract Connections (topology)
       └─→ Extract Metadata (model info)
       ↓
┌─────────────┐
│  Converter  │ ← Transforms to universal format
└──────┬──────┘
       │
       ├─→ Add visualization hints (colors, positions)
       ├─→ Analyze architecture (VGG, ResNet, etc.)
       └─→ Generate topology data
       ↓
┌─────────────┐
│  Validator  │ ← Validates against JSON schema
└──────┬──────┘
       │
       └─→ Checks structure, integrity, connections
       ↓
  JSON Output (Ready for frontend)
```

---

## Core Components

### 1. Extractors

**Location:** `backend/extractors/`

#### 1.1 Base Extractor (`base_extractor.py`)

**Purpose:** Abstract base class defining the extractor interface.

**Class:** `BaseExtractor(ABC)`

**Key Methods:**

```python
class BaseExtractor(ABC):
    def __init__(model, input_shape, model_name, extract_weights, extract_detailed_params):
        """
        Initialize extractor
        
        Args:
            model: Neural network model object
            input_shape: Input tensor shape (e.g., (1, 3, 224, 224))
            model_name: Custom name for the model
            extract_weights: Whether to extract weight tensors
            extract_detailed_params: Extract detailed layer parameters
        """
    
    @abstractmethod
    def extract() -> Dict[str, Any]:
        """
        Main extraction method
        
        Returns:
            {
                'metadata': {...},
                'layers': [{...}, {...}, ...],
                'connections': [{...}, {...}, ...]
            }
        """
    
    @abstractmethod
    def extract_layers() -> List[Dict[str, Any]]:
        """Extract layer information"""
    
    @abstractmethod
    def extract_connections() -> List[Dict[str, Any]]:
        """Extract connection topology"""
    
    @abstractmethod
    def extract_metadata() -> Dict[str, Any]:
        """Extract model metadata"""
    
    def validate_extraction() -> Tuple[bool, List[str]]:
        """Validate extracted data"""
    
    def print_summary():
        """Print extraction summary to console"""
```

**Validation Checks:**
- At least one layer exists
- All layers have required fields (id, name, type)
- Connections reference valid layer IDs
- No circular dependencies in sequential connections

---

#### 1.2 PyTorch Extractor (`pytorch_extractor.py`)

**Purpose:** Extract information from PyTorch `nn.Module` models.

**Class:** `PyTorchExtractor(BaseExtractor)`

**Supported Models:**
- Sequential models
- Custom nn.Module models
- torchvision models (VGG, ResNet, DenseNet, etc.)
- Models with skip connections (ResNet-style)
- Models with branching (Inception-style)

**Key Features:**

1. **Automatic Shape Inference**
   ```python
   # Uses forward hooks to capture tensor shapes
   def _register_hooks():
       for layer in model.modules():
           layer.register_forward_hook(capture_shape)
   
   # Pass dummy input through model
   dummy_input = torch.zeros(input_shape)
   model(dummy_input)  # Hooks capture shapes
   ```

2. **Layer Parameter Extraction**
   ```python
   def _extract_layer_parameters(layer):
       if isinstance(layer, nn.Conv2d):
           return {
               'in_channels': layer.in_channels,
               'out_channels': layer.out_channels,
               'kernel_size': layer.kernel_size,
               'stride': layer.stride,
               'padding': layer.padding,
               'dilation': layer.dilation,
               'groups': layer.groups
           }
       elif isinstance(layer, nn.Linear):
           return {
               'in_features': layer.in_features,
               'out_features': layer.out_features
           }
       # ... more layer types
   ```

3. **Connection Detection**
   ```python
   def extract_connections():
       connections = []
       # Sequential connections
       for i in range(len(layers) - 1):
           connections.append({
               'from_layer': f'layer_{i}',
               'to_layer': f'layer_{i+1}',
               'connection_type': 'sequential'
           })
       # Skip connections (detected from forward pass)
       # ...
       return connections
   ```

**Extracted Layer Data:**
```python
{
    'id': 'layer_0',
    'name': 'conv1',
    'type': 'Conv2d',
    'index': 0,
    'input_shape': [1, 3, 224, 224],
    'output_shape': [1, 64, 224, 224],
    'parameters': {
        'in_channels': 3,
        'out_channels': 64,
        'kernel_size': [3, 3],
        'stride': [1, 1],
        'padding': [1, 1]
    },
    'num_parameters': 1792,
    'trainable': True,
    'activation': 'relu',
    'device': 'cpu'
}
```

**Parameter Counting:**
```python
def _count_parameters():
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return total, trainable
```

---

#### 1.3 Keras Extractor (`keras_extractor.py`)

**Purpose:** Extract information from TensorFlow/Keras models.

**Class:** `KerasExtractor(BaseExtractor)`

**Supported Models:**
- Sequential models
- Functional API models
- keras.applications models

**Key Features:**

1. **Layer Configuration Extraction**
   ```python
   def _extract_layer_info(layer):
       config = layer.get_config()
       return {
           'id': f'layer_{index}',
           'name': layer.name,
           'type': layer.__class__.__name__,
           'config': config,
           'input_shape': layer.input_shape,
           'output_shape': layer.output_shape
       }
   ```

2. **Connection Inference**
   ```python
   def extract_connections():
       # For Sequential models
       if isinstance(model, Sequential):
           return sequential_connections()
       
       # For Functional models
       else:
           connections = []
           for layer in model.layers:
               for node in layer._inbound_nodes:
                   # Extract connections from computational graph
                   for inbound_layer in node.inbound_layers:
                       connections.append({
                           'from_layer': inbound_layer.name,
                           'to_layer': layer.name
                       })
           return connections
   ```

**Extracted Data Example:**
```python
{
    'id': 'layer_0',
    'name': 'conv2d',
    'type': 'Conv2D',
    'input_shape': (None, 224, 224, 3),
    'output_shape': (None, 224, 224, 64),
    'parameters': {
        'filters': 64,
        'kernel_size': (3, 3),
        'strides': (1, 1),
        'padding': 'same',
        'activation': 'relu'
    },
    'num_parameters': 1792,
    'trainable': True
}
```

---

### 2. Converters

**Location:** `backend/converters/`

#### 2.1 Universal Converter (`universal_converter.py`)

**Purpose:** Transform extracted data into visualization-ready JSON format.

**Class:** `UniversalConverter`

**Key Methods:**

```python
class UniversalConverter:
    def __init__(include_weights=False, compress_output=False, add_visualization_hints=True):
        """
        Initialize converter
        
        Args:
            include_weights: Include weight tensors in output
            compress_output: Minimize JSON output size
            add_visualization_hints: Add rendering suggestions
        """
    
    def convert(extracted_data: Dict) -> Dict:
        """
        Main conversion method
        
        Input: Extracted data from extractor
        Output: Visualization-ready JSON
        """
    
    def save_to_file(data: Dict, filepath: str):
        """Save JSON to file"""
    
    def load_from_file(filepath: str) -> Dict:
        """Load JSON from file"""
```

**Conversion Pipeline:**

```
Extracted Data
      ↓
┌─────────────────────┐
│ Convert Metadata    │ ← Add timestamps, versions
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Convert Layers      │ ← Add colors, size hints
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Convert Connections │ ← Add visualization style
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Analyze Architecture│ ← Detect VGG, ResNet, etc.
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Generate Hints      │ ← Camera position, layout
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Analyze Topology    │ ← Graph properties
└──────────┬──────────┘
           ↓
   Visualization JSON
```

**Layer Conversion:**

```python
def _convert_layers(layers):
    converted = []
    for layer in layers:
        converted_layer = {
            'id': layer['id'],
            'name': layer['name'],
            'type': layer['type'],
            'index': layer['index'],
            'input_shape': layer.get('input_shape'),
            'output_shape': layer.get('output_shape'),
            'parameters': layer.get('parameters', {}),
            'num_parameters': layer.get('num_parameters', 0),
            'trainable': layer.get('trainable', True),
            'activation': layer.get('activation'),
            
            # Visualization enhancements
            'visualization': {
                'color': _assign_layer_color(layer['type']),
                'size_hint': _calculate_layer_size(layer),
                'position_hint': _suggest_position(layer, index)
            }
        }
        converted.append(converted_layer)
    return converted
```

**Color Assignment:**

```python
def _assign_layer_color(layer_type):
    """Assign colors based on layer type"""
    color_map = {
        'Conv2d': '#4A90E2',      # Blue - Convolutional layers
        'Linear': '#50C878',       # Green - Fully connected
        'MaxPool2d': '#F5A623',    # Orange - Pooling
        'BatchNorm2d': '#BD10E0',  # Purple - Normalization
        'ReLU': '#FF6B6B',         # Red - Activation
        'Dropout': '#95A5A6',      # Gray - Regularization
        'Flatten': '#95A5A6',      # Gray - Utility
        'AdaptiveAvgPool2d': '#F5A623'  # Orange - Pooling
    }
    return color_map.get(layer_type, '#CCCCCC')  # Default gray
```

**Architecture Detection:**

```python
def _generate_architecture_summary(data):
    """Detect architecture type (VGG, ResNet, etc.)"""
    layers = data['layers']
    connections = data['connections']
    
    # Detect VGG
    if _is_vgg_architecture(layers):
        return {
            'architecture_type': 'VGG',
            'depth': _count_conv_layers(layers),
            'has_skip_connections': False,
            'has_branches': False
        }
    
    # Detect ResNet
    if _has_skip_connections(connections):
        return {
            'architecture_type': 'ResNet',
            'depth': _calculate_depth(layers),
            'has_skip_connections': True,
            'has_branches': _has_branching(connections)
        }
    
    # Detect DenseNet
    if _is_densenet_architecture(layers, connections):
        return {
            'architecture_type': 'DenseNet',
            'depth': len(layers),
            'has_skip_connections': True,
            'has_branches': True
        }
    
    # Default Sequential
    return {
        'architecture_type': 'Sequential',
        'depth': len(layers),
        'has_skip_connections': False,
        'has_branches': False
    }
```

**Visualization Hints:**

```python
def _generate_visualization_hints(data):
    """Generate rendering suggestions"""
    layers = data['layers']
    architecture = data.get('architecture', {})
    
    hints = {
        'suggested_layout': _suggest_layout(architecture),
        'camera_position': _suggest_camera_position(layers),
        'layer_spacing': _calculate_spacing(layers),
        'vertical_spacing': 1.5,
        'color_scheme': 'layer_type',
        'show_connections': True,
        'show_parameters': True,
        'animation_speed': 1.0,
        'highlight_important_layers': _identify_important_layers(layers)
    }
    
    return hints

def _suggest_layout(architecture):
    """Suggest layout based on architecture"""
    arch_type = architecture.get('architecture_type', 'Sequential')
    
    if arch_type == 'Sequential' or arch_type == 'VGG':
        return 'linear'
    elif arch_type == 'ResNet' or arch_type == 'DenseNet':
        return 'hierarchical'
    elif 'Inception' in arch_type:
        return 'radial'
    else:
        return 'force-directed'

def _suggest_camera_position(layers):
    """Suggest camera position based on model complexity"""
    num_layers = len(layers)
    
    if num_layers < 20:
        return [0, 5, 20]   # Close view
    elif num_layers < 50:
        return [0, 10, 30]  # Medium view
    else:
        return [0, 15, 50]  # Far view
```

**Topology Analysis:**

```python
def _analyze_topology(data):
    """Analyze graph properties"""
    layers = data['layers']
    connections = data['connections']
    
    # Build adjacency graph
    adjacency = {}
    for conn in connections:
        from_id = conn['source_layer']
        to_id = conn['target_layer']
        
        if from_id not in adjacency:
            adjacency[from_id] = {'incoming': [], 'outgoing': []}
        if to_id not in adjacency:
            adjacency[to_id] = {'incoming': [], 'outgoing': []}
        
        adjacency[from_id]['outgoing'].append(to_id)
        adjacency[to_id]['incoming'].append(from_id)
    
    # Calculate properties
    topology = {
        'total_nodes': len(layers),
        'total_edges': len(connections),
        'input_layers': _find_input_layers(adjacency),
        'output_layers': _find_output_layers(adjacency),
        'max_depth': _calculate_max_depth(adjacency),
        'branching_factor': _calculate_branching_factor(adjacency),
        'has_cycles': _detect_cycles(adjacency)
    }
    
    return topology
```

---

### 3. Validators

**Location:** `backend/validators/`

#### 3.1 Schema Validator (`schema_validator.py`)

**Purpose:** Validate visualization JSON against defined schema.

**Class:** `SchemaValidator`

**JSON Schema:**

```python
VISUALIZATION_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "WhyteBox Visualization Format",
    "type": "object",
    "required": ["metadata", "layers", "connections"],
    "properties": {
        "metadata": {
            "type": "object",
            "required": ["model_name", "framework", "total_layers", "total_parameters"],
            "properties": {
                "model_name": {"type": "string"},
                "framework": {"type": "string"},
                "total_layers": {"type": "integer", "minimum": 0},
                "total_parameters": {"type": "integer", "minimum": 0},
                "input_shape": {"type": "array"},
                "output_shape": {"type": "array"}
            }
        },
        "layers": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "name", "type", "index"],
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "type": {"type": "string"},
                    "index": {"type": "integer"},
                    "input_shape": {"type": ["array", "null"]},
                    "output_shape": {"type": ["array", "null"]}
                }
            }
        },
        "connections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["source_layer", "target_layer"],
                "properties": {
                    "source_layer": {"type": "string"},
                    "target_layer": {"type": "string"},
                    "connection_type": {"type": "string"}
                }
            }
        }
    }
}
```

**Validation Methods:**

```python
def validate(data: Dict) -> Tuple[bool, List[str]]:
    """
    Validate against JSON schema
    
    Returns:
        (is_valid, list_of_errors)
    """
    errors = []
    
    try:
        # Schema validation
        jsonschema.validate(data, VISUALIZATION_SCHEMA)
    except ValidationError as e:
        errors.append(f"Schema validation failed: {e.message}")
        return False, errors
    
    # Custom validations
    layer_errors = _validate_layers(data['layers'])
    connection_errors = _validate_connections(data['connections'], data['layers'])
    
    errors.extend(layer_errors)
    errors.extend(connection_errors)
    
    is_valid = len(errors) == 0
    return is_valid, errors

def _validate_layers(layers):
    """Validate layer integrity"""
    errors = []
    layer_ids = set()
    
    for layer in layers:
        # Check unique IDs
        if layer['id'] in layer_ids:
            errors.append(f"Duplicate layer ID: {layer['id']}")
        layer_ids.add(layer['id'])
        
        # Check shapes
        if layer.get('output_shape') and not isinstance(layer['output_shape'], list):
            errors.append(f"Invalid output_shape for layer {layer['id']}")
    
    return errors

def _validate_connections(connections, layers):
    """Validate connection integrity"""
    errors = []
    layer_ids = {layer['id'] for layer in layers}
    
    for conn in connections:
        # Check layer references
        if conn['source_layer'] not in layer_ids:
            errors.append(f"Connection references unknown source: {conn['source_layer']}")
        if conn['target_layer'] not in layer_ids:
            errors.append(f"Connection references unknown target: {conn['target_layer']}")
    
    return errors
```

---

### 4. API Server

**Location:** `backend/api/`

#### 4.1 Flask API (`app.py`)

**Purpose:** REST API for model upload and conversion.

**Endpoints:**

**1. Root Endpoint**
```http
GET /
```
Returns API information and available endpoints.

**2. Health Check**
```http
GET /api/health
```
Returns service health status.

**3. Convert Model**
```http
POST /api/convert

Form Data:
  - model: File (model file)
  - framework: String ('pytorch', 'keras', 'onnx')
  - input_shape: String (comma-separated, e.g., "1,3,224,224")
  - model_name: String (optional)
  - extract_weights: Boolean (optional, default: false)

Response:
{
  "status": "success",
  "filename": "model_visualization.json",
  "download_url": "/api/download/model_visualization.json",
  "metadata": {
    "model_name": "CustomModel",
    "total_layers": 41,
    "total_parameters": 138357544
  },
  "stats": {
    "total_layers": 41,
    "total_connections": 40,
    "file_size_kb": 45.65
  }
}
```

**4. List Models**
```http
GET /api/models

Response:
{
  "models": [
    {
      "filename": "vgg16_visualization.json",
      "size_kb": 45.65,
      "created": "2025-10-16T10:30:00",
      "model_name": "VGG16"
    },
    ...
  ]
}
```

**5. Download Model**
```http
GET /api/download/<filename>

Response:
JSON file (application/json)
```

**6. Validate JSON**
```http
POST /api/validate

JSON Body:
{
  "data": { ... visualization JSON ... }
}

Response:
{
  "valid": true,
  "errors": []
}
```

**Configuration:**
```python
app.config = {
    'UPLOAD_FOLDER': 'models/',
    'OUTPUT_FOLDER': 'output/',
    'MAX_CONTENT_LENGTH': 500 * 1024 * 1024,  # 500MB
    'ALLOWED_EXTENSIONS': {'pth', 'pt', 'h5', 'keras', 'onnx', 'pb'}
}
```

**CORS Configuration:**
```python
# Enable CORS for frontend access
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})
```

---

### 5. Interactive CLI

**Location:** `backend/examples/interactive_converter.py`

**Purpose:** Interactive command-line tool for quick model conversion.

**Class:** `ModelConverter`

**Features:**
- 20+ pre-trained models from torchvision
- Smart caching (checks output folder first)
- Automatic conversion for new models
- Complete terminal display
- User-friendly menu interface

**Workflow:**

```
User runs CLI
      ↓
Display Menu (20 models)
  ✓ Cached - Shows cached models
    New - Shows models needing conversion
      ↓
User selects model number
      ↓
Check Cache
  ├─→ Found: Load from cache (< 1 sec)
  └─→ Not Found: Convert model (3-10 sec)
      ↓
Display Complete Details
  ├─→ Metadata (name, params, shapes)
  ├─→ Layers (first 10 + last 3)
  ├─→ Connections (first 5)
  ├─→ Architecture analysis
  ├─→ Visualization hints
  └─→ File information
      ↓
JSON Ready for Frontend
```

**Key Methods:**

```python
class ModelConverter:
    def __init__():
        """Initialize with 20 pre-defined models"""
    
    def display_menu():
        """Show interactive menu"""
    
    def check_cached_output(model_name, framework) -> Optional[Path]:
        """Check if model already converted"""
    
    def convert_pytorch_model(model_info) -> Path:
        """Convert PyTorch model"""
    
    def display_visualization_data(filepath):
        """Display JSON contents in terminal"""
    
    def run():
        """Main interactive loop"""
```

---

## Data Flow

### Complete Conversion Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                    CONVERSION PIPELINE                        │
└──────────────────────────────────────────────────────────────┘

Step 1: Model Input
┌─────────────────┐
│ PyTorch Model   │
│ (.pth, .pt)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ PyTorchExtractor                                            │
│                                                             │
│ 1. Model Analysis                                           │
│    - Iterate through model.modules()                        │
│    - Identify layer types (Conv2d, Linear, etc.)            │
│                                                             │
│ 2. Shape Inference                                          │
│    - Register forward hooks on all layers                   │
│    - Pass dummy input: torch.zeros(input_shape)             │
│    - Hooks capture input/output shapes                      │
│                                                             │
│ 3. Parameter Extraction                                     │
│    - Extract layer configs (kernel_size, stride, etc.)      │
│    - Count parameters per layer                             │
│    - Identify trainable parameters                          │
│                                                             │
│ 4. Connection Detection                                     │
│    - Sequential connections (layer_i → layer_i+1)           │
│    - Skip connections (detected from forward pass)          │
│    - Branch connections (multiple outputs)                  │
│                                                             │
│ Output:                                                     │
│ {                                                           │
│   'metadata': {...},                                        │
│   'layers': [{...}, {...}, ...],                            │
│   'connections': [{...}, {...}, ...]                        │
│ }                                                           │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ UniversalConverter                                          │
│                                                             │
│ 1. Metadata Enhancement                                     │
│    - Add timestamp, converter version                       │
│    - Calculate total parameters                             │
│                                                             │
│ 2. Layer Enhancement                                        │
│    for each layer:                                          │
│      - Assign color based on type                           │
│      - Calculate size hint                                  │
│      - Suggest position                                     │
│                                                             │
│ 3. Connection Enhancement                                   │
│    for each connection:                                     │
│      - Add visualization color                              │
│      - Calculate line width                                 │
│      - Set connection style                                 │
│                                                             │
│ 4. Architecture Detection                                   │
│    - Analyze pattern (VGG, ResNet, DenseNet)                │
│    - Detect skip connections                                │
│    - Identify branching                                     │
│                                                             │
│ 5. Visualization Hints                                      │
│    - Suggest layout (linear, hierarchical, radial)          │
│    - Calculate camera position                              │
│    - Set layer spacing                                      │
│                                                             │
│ 6. Topology Analysis                                        │
│    - Build adjacency graph                                  │
│    - Calculate depth, branching factor                      │
│    - Identify input/output layers                           │
│                                                             │
│ Output:                                                     │
│ {                                                           │
│   'metadata': {...enhanced...},                             │
│   'layers': [{...with visualization...}, ...],              │
│   'connections': [{...with style...}, ...],                 │
│   'architecture': {...},                                    │
│   'visualization_hints': {...},                             │
│   'topology': {...}                                         │
│ }                                                           │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ SchemaValidator                                             │
│                                                             │
│ 1. JSON Schema Validation                                   │
│    - Check required fields exist                            │
│    - Validate data types                                    │
│    - Verify array structures                                │
│                                                             │
│ 2. Layer Integrity Check                                    │
│    - Verify unique layer IDs                                │
│    - Check shape validity                                   │
│    - Validate parameter counts                              │
│                                                             │
│ 3. Connection Integrity Check                               │
│    - Verify layer references exist                          │
│    - Check for invalid connections                          │
│    - Validate connection types                              │
│                                                             │
│ Output:                                                     │
│ (is_valid: bool, errors: List[str])                         │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  JSON Output    │
│  (45-100 KB)    │
└─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend Consumption                                        │
│                                                             │
│ - Babylon.js (3D visualization)                             │
│ - TensorSpace.js (interactive model explorer)               │
│ - D3.js (2D network diagrams)                               │
│ - Custom visualizers                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## File Format Specifications

### Output JSON Structure

```json
{
  "metadata": {
    "model_name": "VGG16",
    "framework": "pytorch",
    "framework_version": "2.8.0+cpu",
    "converter_version": "1.0.0",
    "total_layers": 41,
    "total_parameters": 138357544,
    "trainable_parameters": 138357544,
    "input_shape": [1, 3, 224, 224],
    "output_shape": [1, 1000],
    "timestamp": "2025-10-16T10:30:00.000000",
    "conversion_timestamp": "2025-10-16T10:30:00.000000"
  },
  
  "layers": [
    {
      "id": "layer_0",
      "name": "features.0",
      "type": "Conv2d",
      "index": 0,
      "input_shape": [1, 3, 224, 224],
      "output_shape": [1, 64, 224, 224],
      "parameters": {
        "in_channels": 3,
        "out_channels": 64,
        "kernel_size": [3, 3],
        "stride": [1, 1],
        "padding": [1, 1],
        "dilation": [1, 1],
        "groups": 1,
        "bias": true
      },
      "num_parameters": 1792,
      "trainable": true,
      "activation": null,
      "device": "cpu",
      "visualization": {
        "color": "#4A90E2",
        "size_hint": 1.5,
        "position_hint": [0, 0, 0]
      }
    },
    // ... more layers
  ],
  
  "connections": [
    {
      "id": "conn_0",
      "source_layer": "layer_0",
      "target_layer": "layer_1",
      "connection_type": "sequential",
      "data_flow": "forward",
      "visualization": {
        "color": "#999999",
        "width": 2.0,
        "style": "solid"
      }
    },
    // ... more connections
  ],
  
  "architecture": {
    "architecture_type": "VGG",
    "depth": 16,
    "has_skip_connections": false,
    "has_branches": false,
    "complexity": "medium"
  },
  
  "visualization_hints": {
    "suggested_layout": "linear",
    "camera_position": [0, 5, 20],
    "layer_spacing": 2.0,
    "vertical_spacing": 1.5,
    "color_scheme": "layer_type",
    "show_connections": true,
    "show_parameters": true,
    "animation_speed": 1.0,
    "highlight_important_layers": ["layer_0", "layer_40"]
  },
  
  "topology": {
    "total_nodes": 41,
    "total_edges": 40,
    "input_layers": ["layer_0"],
    "output_layers": ["layer_40"],
    "max_depth": 41,
    "branching_factor": 1.0,
    "has_cycles": false
  }
}
```

### Field Descriptions

#### Metadata Fields
- **model_name**: Human-readable model name
- **framework**: Source framework ('pytorch', 'keras', 'onnx')
- **framework_version**: Version of the framework used
- **converter_version**: Version of the converter
- **total_layers**: Total number of layers in the model
- **total_parameters**: Total trainable + non-trainable parameters
- **trainable_parameters**: Only trainable parameters
- **input_shape**: Expected input tensor shape
- **output_shape**: Output tensor shape
- **timestamp**: Model creation/extraction timestamp
- **conversion_timestamp**: Conversion completion timestamp

#### Layer Fields
- **id**: Unique layer identifier (e.g., "layer_0")
- **name**: Original layer name from framework
- **type**: Layer type (Conv2d, Linear, ReLU, etc.)
- **index**: Sequential index in the model
- **input_shape**: Input tensor dimensions
- **output_shape**: Output tensor dimensions
- **parameters**: Layer-specific configuration
- **num_parameters**: Number of parameters in this layer
- **trainable**: Whether layer parameters are trainable
- **activation**: Activation function name (if applicable)
- **device**: Device placement ('cpu' or 'cuda')
- **visualization**: Rendering hints for this layer

#### Connection Fields
- **id**: Unique connection identifier
- **source_layer**: Source layer ID
- **target_layer**: Target layer ID
- **connection_type**: Type ('sequential', 'skip', 'branch')
- **data_flow**: Direction ('forward', 'backward', 'bidirectional')
- **visualization**: Rendering style for this connection

#### Architecture Fields
- **architecture_type**: Detected pattern (VGG, ResNet, etc.)
- **depth**: Effective network depth
- **has_skip_connections**: Boolean flag
- **has_branches**: Boolean flag
- **complexity**: Relative complexity ('low', 'medium', 'high')

#### Visualization Hints Fields
- **suggested_layout**: Recommended layout algorithm
- **camera_position**: Suggested camera [x, y, z]
- **layer_spacing**: Horizontal spacing between layers
- **vertical_spacing**: Vertical spacing between layers
- **color_scheme**: Coloring strategy
- **show_connections**: Whether to render connections
- **show_parameters**: Whether to display parameter counts
- **animation_speed**: Suggested animation speed
- **highlight_important_layers**: List of important layer IDs

#### Topology Fields
- **total_nodes**: Number of layers
- **total_edges**: Number of connections
- **input_layers**: List of input layer IDs
- **output_layers**: List of output layer IDs
- **max_depth**: Maximum path length
- **branching_factor**: Average branching factor
- **has_cycles**: Whether graph has cycles

---

## Extension Guide

### Adding a New Framework Extractor

**Example: Adding ONNX Support**

```python
# backend/extractors/onnx_extractor.py

import onnx
from extractors.base_extractor import BaseExtractor

class ONNXExtractor(BaseExtractor):
    """Extract from ONNX models"""
    
    def __init__(self, model_path, model_name=None):
        # Load ONNX model
        model = onnx.load(model_path)
        super().__init__(model, model_name=model_name)
    
    def extract(self):
        """Main extraction"""
        self.metadata = self.extract_metadata()
        self.layers_data = self.extract_layers()
        self.connections_data = self.extract_connections()
        
        return {
            'metadata': self.metadata,
            'layers': self.layers_data,
            'connections': self.connections_data
        }
    
    def extract_layers(self):
        """Extract ONNX nodes as layers"""
        layers = []
        graph = self.model.graph
        
        for idx, node in enumerate(graph.node):
            layer = {
                'id': f'layer_{idx}',
                'name': node.name or f'{node.op_type}_{idx}',
                'type': node.op_type,
                'index': idx,
                'parameters': self._extract_node_attributes(node)
            }
            layers.append(layer)
        
        return layers
    
    def extract_connections(self):
        """Extract ONNX edges as connections"""
        connections = []
        graph = self.model.graph
        
        # Build node output mapping
        output_to_node = {}
        for idx, node in enumerate(graph.node):
            for output in node.output:
                output_to_node[output] = f'layer_{idx}'
        
        # Create connections
        for idx, node in enumerate(graph.node):
            for input_name in node.input:
                if input_name in output_to_node:
                    connections.append({
                        'from_layer': output_to_node[input_name],
                        'to_layer': f'layer_{idx}',
                        'connection_type': 'sequential'
                    })
        
        return connections
    
    def extract_metadata(self):
        """Extract ONNX model metadata"""
        return {
            'model_name': self.model_name,
            'framework': 'onnx',
            'framework_version': onnx.__version__,
            'total_layers': len(self.model.graph.node)
        }
```

### Adding Custom Visualization Hints

```python
# In universal_converter.py

def _generate_custom_hints(self, data):
    """Add custom visualization hints"""
    hints = self._generate_visualization_hints(data)
    
    # Add custom hints
    hints['custom'] = {
        'show_gradient_flow': True,
        'highlight_bottlenecks': True,
        'show_receptive_fields': True,
        'animate_forward_pass': True
    }
    
    return hints
```

### Adding Custom Validators

```python
# backend/validators/custom_validator.py

class CustomValidator:
    """Custom validation rules"""
    
    def validate_parameter_counts(self, data):
        """Validate parameter counts match expected values"""
        errors = []
        
        total_params = data['metadata']['total_parameters']
        layer_params = sum(layer.get('num_parameters', 0) 
                          for layer in data['layers'])
        
        if total_params != layer_params:
            errors.append(f"Parameter mismatch: {total_params} != {layer_params}")
        
        return errors
    
    def validate_shapes(self, data):
        """Validate shape compatibility"""
        errors = []
        layers = data['layers']
        connections = data['connections']
        
        for conn in connections:
            source = next(l for l in layers if l['id'] == conn['source_layer'])
            target = next(l for l in layers if l['id'] == conn['target_layer'])
            
            if source['output_shape'] != target['input_shape']:
                errors.append(f"Shape mismatch: {conn['source_layer']} → {conn['target_layer']}")
        
        return errors
```

---

## Troubleshooting

### Common Issues

#### 1. Import Errors

**Problem:** `ModuleNotFoundError: No module named 'extractors'`

**Solution:**
```python
# Add parent directory to path
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
```

#### 2. Shape Inference Fails

**Problem:** Output shapes are `None` or incorrect

**Solution:**
```python
# Ensure model is in eval mode
model.eval()

# Use correct input shape
input_shape = (1, 3, 224, 224)  # batch, channels, height, width

# For dynamic models, use a representative input size
```

#### 3. Connection Key Mismatch

**Problem:** `KeyError: 'source_layer'` when displaying connections

**Solution:**
```python
# Support both key formats
from_layer = conn.get('source_layer') or conn.get('from_layer')
to_layer = conn.get('target_layer') or conn.get('to_layer')
```

#### 4. Memory Issues

**Problem:** `RuntimeError: CUDA out of memory`

**Solution:**
```python
# Use CPU for extraction
extractor = PyTorchExtractor(model, device='cpu')

# Don't extract weights
extractor = PyTorchExtractor(model, extract_weights=False)

# Process in smaller batches
```

#### 5. JSON Encoding Errors

**Problem:** `TypeError: Object of type 'Tensor' is not JSON serializable`

**Solution:**
```python
# Convert tensors to lists
if isinstance(value, torch.Tensor):
    value = value.detach().cpu().numpy().tolist()

# Or use custom JSON encoder
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)
```

### Performance Optimization

#### Large Models

```python
# 1. Disable weight extraction
extractor = PyTorchExtractor(model, extract_weights=False)

# 2. Use compression
converter = UniversalConverter(compress_output=True)

# 3. Limit detailed parameters
extractor = PyTorchExtractor(model, extract_detailed_params=False)
```

#### Batch Processing

```python
# Convert multiple models
models = ['vgg16', 'resnet50', 'mobilenet']

for model_name in models:
    model = load_model(model_name)
    extractor = PyTorchExtractor(model)
    data = extractor.extract()
    
    converter = UniversalConverter()
    viz_data = converter.convert(data)
    converter.save_to_file(viz_data, f'{model_name}_viz.json')
```

---

## Summary

### System Capabilities

✅ **Multi-framework support** - PyTorch, Keras, ONNX  
✅ **Automatic extraction** - Layers, connections, parameters  
✅ **Shape inference** - Forward hooks for automatic shape detection  
✅ **Architecture detection** - VGG, ResNet, DenseNet, etc.  
✅ **Visualization optimization** - Colors, positions, hints  
✅ **Validation** - JSON schema + custom checks  
✅ **REST API** - Upload and convert via HTTP  
✅ **Interactive CLI** - User-friendly terminal interface  
✅ **Smart caching** - Avoid redundant conversions  

### File Organization

```
backend/
├── extractors/          # Framework-specific extraction
│   ├── base_extractor.py
│   ├── pytorch_extractor.py
│   └── keras_extractor.py
│
├── converters/          # Format transformation
│   └── universal_converter.py
│
├── validators/          # Quality assurance
│   └── schema_validator.py
│
├── api/                 # REST API
│   └── app.py
│
├── examples/            # Usage examples
│   ├── interactive_converter.py
│   ├── convert_vgg16.py
│   └── convert_vgg16_pytorch_only.py
│
├── output/              # Generated JSON files
├── models/              # Uploaded models
└── tests/               # Test suite
```

### Key Design Principles

1. **Modularity** - Each component has a single responsibility
2. **Extensibility** - Easy to add new frameworks and features
3. **Validation** - Multiple layers of validation ensure correctness
4. **Documentation** - Comprehensive inline and external docs
5. **User Experience** - Multiple interfaces (API, CLI) for different use cases

---

**Document Version:** 1.0.0  
**Last Updated:** October 16, 2025  
**Maintainer:** WhyteBox Team  
**Status:** Production Ready ✅