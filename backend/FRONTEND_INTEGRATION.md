# Frontend Integration Guide

## 🔗 How to Use the Backend with Your Visualization System

This guide shows how to integrate the WhyteBox Backend with various frontend visualization frameworks.

---

## 📋 Prerequisites

1. **Backend API Running**:
   ```bash
   cd backend
   python api/app.py
   ```
   Server will be available at `http://localhost:5000`

2. **Model Converted**:
   - Either use pre-converted JSON files from `backend/output/`
   - Or upload models via API

---

## 🌐 Integration Methods

### Method 1: Direct JSON Loading (Static)

**Best for:** Pre-converted models, no server required

```javascript
// Load from local file or served directory
async function loadModelVisualization() {
  const response = await fetch('output/vgg16_visualization.json');
  const modelData = await response.json();
  
  // Now you have access to:
  console.log(modelData.metadata);        // Model information
  console.log(modelData.layers);          // Layer details
  console.log(modelData.connections);     // Network topology
  console.log(modelData.visualization_hints); // Display suggestions
  
  return modelData;
}
```

### Method 2: Backend API (Dynamic)

**Best for:** Real-time conversion, user uploads

```javascript
// Upload and convert model
async function convertModel(modelFile, framework) {
  const formData = new FormData();
  formData.append('model', modelFile);
  formData.append('framework', framework); // 'pytorch' or 'keras'
  formData.append('input_shape', '1,3,224,224');
  formData.append('model_name', modelFile.name);
  
  const response = await fetch('http://localhost:5000/api/convert', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    // Download the converted model
    const modelData = await fetch(
      `http://localhost:5000${result.download_url}`
    ).then(r => r.json());
    
    return modelData;
  }
}

// Usage
const fileInput = document.getElementById('modelFile');
fileInput.addEventListener('change', async (e) => {
  const modelData = await convertModel(e.target.files[0], 'pytorch');
  visualizeModel(modelData);
});
```

### Method 3: Fetch Available Models

**Best for:** Gallery view, model library

```javascript
async function listAvailableModels() {
  const response = await fetch('http://localhost:5000/api/models');
  const data = await response.json();
  
  // data.files contains list of converted models
  return data.files;
}

// Display model list
async function displayModelGallery() {
  const models = await listAvailableModels();
  
  models.forEach(model => {
    console.log(`${model.filename} (${model.size_kb} KB)`);
    console.log(`Download: ${model.download_url}`);
  });
}
```

---

## 🎨 Integration with Visualization Frameworks

### 1. Babylon.js Node-Based Visualization

```javascript
import * as BABYLON from '@babylonjs/core';

async function createBabylonVisualization(modelData, canvas) {
  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);
  
  // Setup camera using hints
  const hints = modelData.visualization_hints;
  const camera = new BABYLON.ArcRotateCamera(
    'camera',
    Math.PI / 2,
    Math.PI / 2,
    hints.camera_position.z,
    new BABYLON.Vector3(
      hints.camera_position.target_x,
      hints.camera_position.target_y,
      hints.camera_position.target_z
    ),
    scene
  );
  camera.attachControl(canvas, true);
  
  // Create light
  const light = new BABYLON.HemisphericLight(
    'light',
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  
  // Create layer nodes
  const layerSpacing = hints.layer_spacing || 2.0;
  const layerNodes = {};
  
  modelData.layers.forEach((layer, index) => {
    // Create sphere for each layer
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      layer.id,
      { diameter: layer.visualization.size_hint || 1.0 },
      scene
    );
    
    // Position based on index
    sphere.position.x = index * layerSpacing;
    sphere.position.y = 0;
    sphere.position.z = 0;
    
    // Color from visualization hints
    const color = BABYLON.Color3.FromHexString(
      layer.visualization.color
    );
    const material = new BABYLON.StandardMaterial(
      `mat_${layer.id}`,
      scene
    );
    material.diffuseColor = color;
    material.alpha = layer.visualization.opacity;
    sphere.material = material;
    
    // Store reference
    layerNodes[layer.id] = sphere;
    
    // Add label
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');
    const label = new BABYLON.GUI.TextBlock();
    label.text = layer.name;
    label.color = 'white';
    label.fontSize = 12;
    advancedTexture.addControl(label);
    label.linkWithMesh(sphere);
    label.linkOffsetY = -30;
  });
  
  // Create connections
  modelData.connections.forEach(conn => {
    const fromNode = layerNodes[conn.from_layer];
    const toNode = layerNodes[conn.to_layer];
    
    if (fromNode && toNode) {
      const line = BABYLON.MeshBuilder.CreateLines(
        `conn_${conn.id}`,
        {
          points: [fromNode.position, toNode.position]
        },
        scene
      );
      
      line.color = BABYLON.Color3.FromHexString(
        conn.visualization.color
      );
    }
  });
  
  // Render loop
  engine.runRenderLoop(() => {
    scene.render();
  });
  
  return { engine, scene, layerNodes };
}

// Usage
const canvas = document.getElementById('renderCanvas');
const modelData = await loadModelVisualization();
createBabylonVisualization(modelData, canvas);
```

### 2. TensorSpace.js Integration

```javascript
import * as TSP from 'tensorspace';

async function createTensorSpaceVisualization(modelData, container) {
  const model = new TSP.models.Sequential(container);
  
  // Add layers based on converted data
  modelData.layers.forEach((layer, index) => {
    const layerConfig = {
      name: layer.name,
      shape: layer.output_shape
    };
    
    // Map layer types to TensorSpace layers
    switch(layer.type) {
      case 'Conv2d':
        model.add(new TSP.layers.Conv2d({
          ...layerConfig,
          kernelSize: layer.parameters.kernel_size[0],
          filters: layer.parameters.out_channels
        }));
        break;
        
      case 'MaxPool2d':
        model.add(new TSP.layers.Pooling2d({
          ...layerConfig,
          poolSize: layer.parameters.kernel_size[0]
        }));
        break;
        
      case 'Dense':
      case 'Linear':
        model.add(new TSP.layers.Dense({
          ...layerConfig,
          units: layer.parameters.out_features
        }));
        break;
        
      // Add more layer type mappings...
    }
  });
  
  // Initialize and render
  model.init(() => {
    console.log('TensorSpace model loaded');
  });
  
  return model;
}

// Usage
const container = document.getElementById('model-container');
const modelData = await loadModelVisualization();
createTensorSpaceVisualization(modelData, container);
```

### 3. D3.js Graph Visualization

```javascript
import * as d3 from 'd3';

function createD3GraphVisualization(modelData, svgElement) {
  const width = 1200;
  const height = 800;
  
  const svg = d3.select(svgElement)
    .attr('width', width)
    .attr('height', height);
  
  // Create force simulation
  const simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(width / 2, height / 2));
  
  // Prepare nodes (layers)
  const nodes = modelData.layers.map(layer => ({
    id: layer.id,
    name: layer.name,
    type: layer.type,
    color: layer.visualization.color,
    size: layer.visualization.size_hint * 10
  }));
  
  // Prepare links (connections)
  const links = modelData.connections.map(conn => ({
    source: conn.from_layer,
    target: conn.to_layer,
    type: conn.connection_type,
    color: conn.visualization.color
  }));
  
  // Draw links
  const link = svg.append('g')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', d => d.color)
    .attr('stroke-width', 2);
  
  // Draw nodes
  const node = svg.append('g')
    .selectAll('circle')
    .data(nodes)
    .enter()
    .append('circle')
    .attr('r', d => d.size)
    .attr('fill', d => d.color)
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));
  
  // Add labels
  const label = svg.append('g')
    .selectAll('text')
    .data(nodes)
    .enter()
    .append('text')
    .text(d => d.name)
    .attr('font-size', 10)
    .attr('dx', 12)
    .attr('dy', 4);
  
  // Update positions
  simulation.nodes(nodes).on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    
    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
    
    label
      .attr('x', d => d.x)
      .attr('y', d => d.y);
  });
  
  simulation.force('link').links(links);
  
  // Drag functions
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

// Usage
const svg = document.getElementById('graph-svg');
const modelData = await loadModelVisualization();
createD3GraphVisualization(modelData, svg);
```

---

## 🎯 Data Structure Reference

### Layer Object
```javascript
{
  id: "layer_0",              // Unique identifier
  name: "conv1",              // Human-readable name
  type: "Conv2d",             // Layer type
  index: 0,                   // Position in network
  input_shape: [1,3,224,224], // Input dimensions
  output_shape: [1,64,224,224], // Output dimensions
  parameters: {               // Layer-specific params
    in_channels: 3,
    out_channels: 64,
    kernel_size: [3,3],
    stride: [1,1],
    padding: [1,1]
  },
  activation: "relu",         // Activation function
  trainable: true,            // Is trainable
  parameter_count: 1728,      // Number of parameters
  visualization: {            // Display hints
    color: "#4A90E2",
    opacity: 1.0,
    size_hint: 1.5,
    display_name: "Conv2d_0"
  }
}
```

### Connection Object
```javascript
{
  id: "conn_0",
  from_layer: "layer_0",
  to_layer: "layer_1",
  connection_type: "sequential", // or "skip", "merge", "branch"
  data_flow: "forward",
  visualization: {
    color: "#4A90E2",
    width: 1.0,
    style: "solid"            // or "dashed", "dotted"
  }
}
```

### Metadata Object
```javascript
{
  model_name: "VGG16",
  framework: "pytorch",
  framework_version: "2.0.0",
  total_layers: 41,
  total_parameters: 138357544,
  input_shape: [1,3,224,224],
  output_shape: [1,1000],
  timestamp: "2025-10-15T12:00:00"
}
```

---

## 🎨 Visualization Hints Usage

The backend provides helpful hints for optimal visualization:

```javascript
const hints = modelData.visualization_hints;

// Use recommended layout
if (hints.recommended_layout === 'linear') {
  arrangeLayersLinearly();
} else if (hints.recommended_layout === 'graph') {
  useGraphLayout();
}

// Apply suggested spacing
const spacing = hints.layer_spacing; // e.g., 2.0

// Position camera
setCameraPosition(
  hints.camera_position.x,
  hints.camera_position.y,
  hints.camera_position.z
);

// Highlight important layers
hints.highlight_layers.forEach(layerId => {
  highlightLayer(layerId);
});

// Make layers interactive
hints.interactive_layers.forEach(layerId => {
  makeInteractive(layerId);
});
```

---

## 🔄 Real-Time Updates

For dynamic applications with model selection:

```javascript
class ModelVisualizer {
  constructor(container) {
    this.container = container;
    this.currentModel = null;
  }
  
  async loadModel(modelName) {
    // Fetch from API
    const response = await fetch(
      `http://localhost:5000/api/download/${modelName}`
    );
    this.currentModel = await response.json();
    
    // Clear previous visualization
    this.clear();
    
    // Create new visualization
    this.visualize();
  }
  
  visualize() {
    // Use any visualization method
    createBabylonVisualization(
      this.currentModel,
      this.container
    );
  }
  
  clear() {
    // Clean up previous visualization
    this.container.innerHTML = '';
  }
}

// Usage
const visualizer = new ModelVisualizer(
  document.getElementById('viz-container')
);

// Switch between models
document.getElementById('modelSelect').addEventListener('change', (e) => {
  visualizer.loadModel(e.target.value);
});
```

---

## 🐛 Error Handling

Always handle errors gracefully:

```javascript
async function safeLoadModel(modelPath) {
  try {
    const response = await fetch(modelPath);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const modelData = await response.json();
    
    // Validate data
    if (!modelData.metadata || !modelData.layers) {
      throw new Error('Invalid model data structure');
    }
    
    return modelData;
    
  } catch (error) {
    console.error('Failed to load model:', error);
    
    // Show user-friendly message
    showError('Failed to load model. Please try again.');
    
    return null;
  }
}
```

---

## 📦 Example: Complete Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>WhyteBox Visualization</title>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
</head>
<body>
  <canvas id="renderCanvas" width="1200" height="800"></canvas>
  
  <div id="controls">
    <select id="modelSelect">
      <option value="">Select a model...</option>
    </select>
  </div>
  
  <script>
    // Fetch available models
    async function loadModelList() {
      const response = await fetch('http://localhost:5000/api/models');
      const data = await response.json();
      
      const select = document.getElementById('modelSelect');
      data.files.forEach(file => {
        const option = document.createElement('option');
        option.value = file.filename;
        option.textContent = file.filename;
        select.appendChild(option);
      });
    }
    
    // Load and visualize selected model
    document.getElementById('modelSelect').addEventListener('change', async (e) => {
      const filename = e.target.value;
      if (!filename) return;
      
      const response = await fetch(
        `http://localhost:5000/api/download/${filename}`
      );
      const modelData = await response.json();
      
      // Create visualization
      const canvas = document.getElementById('renderCanvas');
      createBabylonVisualization(modelData, canvas);
    });
    
    // Initialize
    loadModelList();
  </script>
</body>
</html>
```

---

## 🚀 Production Deployment

### CORS Configuration

If frontend and backend are on different domains:

```python
# In api/app.py
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://your-frontend-domain.com"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})
```

### Environment Configuration

```javascript
// config.js
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.whytebox.com'
  : 'http://localhost:5000';

export async function fetchModel(filename) {
  return fetch(`${API_BASE_URL}/api/download/${filename}`);
}
```

---

## 📚 Additional Resources

- **Backend API Docs**: See `backend/README.md`
- **Example Models**: Check `backend/output/` for sample JSON
- **Test Files**: Review `backend/tests/` for usage patterns

---

**Ready to integrate? Start with the simple Babylon.js example above!**
