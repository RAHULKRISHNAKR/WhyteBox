# Installation Guide for Real Model Conversion

## Step 1: Install PyTorch (for PyTorch models)

```powershell
# CPU version (faster download, no GPU needed)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# OR GPU version (if you have NVIDIA GPU)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

## Step 2: Install TensorFlow (for Keras models)

```powershell
pip install tensorflow
```

## Step 3: Verify Installation

```powershell
python -c "import torch; print(f'PyTorch {torch.__version__} installed')"
python -c "import tensorflow as tf; print(f'TensorFlow {tf.__version__} installed')"
```

---

## 🎯 Method 1: Convert Pre-trained Models (Easiest)

### Option A: PyTorch VGG16

```powershell
cd backend
python examples\convert_vgg16.py
```

This script will:
1. ✅ Download VGG16 from torchvision (if `pretrained=True`)
2. ✅ Extract all layer information
3. ✅ Convert to visualization JSON
4. ✅ Save to `output/vgg16_pytorch_visualization.json`

**Expected output:**
```
======================================================================
Converting PyTorch VGG16
======================================================================
Loading VGG16 model from torchvision...
Extracting model information...
✓ Successfully extracted 41 layers and 40 connections
Converting to visualization format...
✓ Saved visualization data to output/vgg16_pytorch_visualization.json
```

### Option B: Other Pre-trained Models

Create a new script or modify the example:

```python
# examples/convert_resnet50.py
import torch
import torchvision.models as models
from extractors.pytorch_extractor import PyTorchExtractor
from converters.universal_converter import UniversalConverter

# Load ResNet50
model = models.resnet50(pretrained=True)
model.eval()

# Extract
extractor = PyTorchExtractor(
    model=model,
    input_shape=(1, 3, 224, 224),
    model_name="ResNet50",
    extract_weights=False  # Set True to include weights (larger file)
)
data = extractor.extract()
extractor.print_summary()

# Convert
converter = UniversalConverter()
viz_data = converter.convert(data)
converter.save_to_file(viz_data, 'output/resnet50_visualization.json')

print("✓ ResNet50 converted successfully!")
```

Run it:
```powershell
python examples\convert_resnet50.py
```

---

## 🎯 Method 2: Convert Your Own Trained Model

### PyTorch Custom Model

```python
# examples/convert_my_pytorch_model.py
import torch
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from extractors.pytorch_extractor import PyTorchExtractor
from converters.universal_converter import UniversalConverter

# Load your saved model
model = torch.load('path/to/your/model.pth', map_location='cpu')

# If your model is saved as state_dict, load it into your model class:
# from your_model_file import YourModelClass
# model = YourModelClass()
# model.load_state_dict(torch.load('path/to/state_dict.pth'))

model.eval()

# Extract (adjust input_shape to match your model)
extractor = PyTorchExtractor(
    model=model,
    input_shape=(1, 3, 224, 224),  # Change this!
    model_name="MyCustomModel",
    extract_weights=False
)

data = extractor.extract()
extractor.print_summary()

# Convert
converter = UniversalConverter()
viz_data = converter.convert(data)
converter.save_to_file(viz_data, 'output/my_model_visualization.json')

print("✓ Your model converted successfully!")
print(f"✓ Output: output/my_model_visualization.json")
```

Run it:
```powershell
python examples\convert_my_pytorch_model.py
```

### Keras Custom Model

```python
# examples/convert_my_keras_model.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tensorflow import keras
from extractors.keras_extractor import KerasExtractor
from converters.universal_converter import UniversalConverter

# Load your saved model
model = keras.models.load_model('path/to/your/model.h5')

# Or if you have the model definition:
# from your_model_file import build_model
# model = build_model()
# model.load_weights('path/to/weights.h5')

# Extract
extractor = KerasExtractor(
    model=model,
    model_name="MyKerasModel",
    extract_weights=False
)

data = extractor.extract()
extractor.print_summary()

# Convert
converter = UniversalConverter()
viz_data = converter.convert(data)
converter.save_to_file(viz_data, 'output/my_keras_model_visualization.json')

print("✓ Your Keras model converted successfully!")
```

---

## 🎯 Method 3: Using the API (Upload Models)

### Step 1: Start the API Server

```powershell
cd backend
python api\app.py
```

You should see:
```
======================================================================
WhyteBox Backend API Server
======================================================================
Upload folder: C:\...\backend\models
Output folder: C:\...\backend\output
Starting server on http://localhost:5000
======================================================================
```

### Step 2: Upload a Model via API

**Option A: Using curl (PowerShell)**

```powershell
# Convert PyTorch model
curl -X POST http://localhost:5000/api/convert `
  -F "model=@path\to\your\model.pth" `
  -F "framework=pytorch" `
  -F "input_shape=1,3,224,224" `
  -F "model_name=MyModel"

# Convert Keras model
curl -X POST http://localhost:5000/api/convert `
  -F "model=@path\to\your\model.h5" `
  -F "framework=keras" `
  -F "model_name=MyKerasModel"
```

**Option B: Using Python requests**

```python
import requests

# Upload and convert
with open('path/to/your/model.pth', 'rb') as f:
    files = {'model': f}
    data = {
        'framework': 'pytorch',
        'input_shape': '1,3,224,224',
        'model_name': 'MyModel'
    }
    
    response = requests.post(
        'http://localhost:5000/api/convert',
        files=files,
        data=data
    )
    
    result = response.json()
    print(result)
    
    if result['status'] == 'success':
        # Download the converted file
        download_url = f"http://localhost:5000{result['download_url']}"
        viz_response = requests.get(download_url)
        
        with open('my_converted_model.json', 'w') as out:
            out.write(viz_response.text)
        
        print("✓ Model converted and downloaded!")
```

**Option C: Using a Web Form (HTML)**

```html
<!DOCTYPE html>
<html>
<body>
  <h2>Upload Model for Conversion</h2>
  
  <form id="uploadForm">
    <label>Model File:</label>
    <input type="file" name="model" id="modelFile" required><br><br>
    
    <label>Framework:</label>
    <select name="framework" id="framework">
      <option value="pytorch">PyTorch</option>
      <option value="keras">Keras</option>
    </select><br><br>
    
    <label>Input Shape (comma-separated):</label>
    <input type="text" name="input_shape" value="1,3,224,224"><br><br>
    
    <label>Model Name:</label>
    <input type="text" name="model_name" value="MyModel"><br><br>
    
    <button type="submit">Convert</button>
  </form>
  
  <div id="result"></div>
  
  <script>
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      
      const response = await fetch('http://localhost:5000/api/convert', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        document.getElementById('result').innerHTML = `
          <h3>✓ Conversion Successful!</h3>
          <p>Layers: ${result.stats.total_layers}</p>
          <p>Parameters: ${result.metadata.total_parameters}</p>
          <p><a href="http://localhost:5000${result.download_url}">
            Download JSON
          </a></p>
        `;
      } else {
        document.getElementById('result').innerHTML = `
          <h3>✗ Conversion Failed</h3>
          <p>${result.error}</p>
        `;
      }
    });
  </script>
</body>
</html>
```

---

## 📊 Quick Reference: Popular Models

### PyTorch (torchvision models)

```python
import torchvision.models as models

# Available models
vgg16 = models.vgg16(pretrained=True)
resnet50 = models.resnet50(pretrained=True)
mobilenet = models.mobilenet_v2(pretrained=True)
efficientnet = models.efficientnet_b0(pretrained=True)
inception = models.inception_v3(pretrained=True)
densenet = models.densenet121(pretrained=True)
```

### Keras (keras.applications)

```python
from tensorflow.keras.applications import *

# Available models
vgg16 = VGG16(weights='imagenet')
resnet50 = ResNet50(weights='imagenet')
mobilenet = MobileNetV2(weights='imagenet')
efficientnet = EfficientNetB0(weights='imagenet')
inception = InceptionV3(weights='imagenet')
densenet = DenseNet121(weights='imagenet')
```

---

## 🔧 Common Issues & Solutions

### Issue 1: "No module named 'torch'"
```powershell
pip install torch torchvision
```

### Issue 2: "No module named 'tensorflow'"
```powershell
pip install tensorflow
```

### Issue 3: DLL load failed (Windows PyTorch)
```powershell
# Install Visual C++ Redistributable
# Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe

# OR use CPU-only version
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Issue 4: Model file path not found
```python
# Use absolute paths
from pathlib import Path
model_path = Path(__file__).parent.parent / 'models' / 'my_model.pth'
model = torch.load(str(model_path))
```

### Issue 5: Input shape mismatch
```python
# For image models: (batch, channels, height, width)
input_shape = (1, 3, 224, 224)  # RGB images

# For grayscale: (batch, channels, height, width)
input_shape = (1, 1, 28, 28)  # MNIST

# For time series: (batch, features, time_steps)
input_shape = (1, 10, 100)
```

---

## 🎯 Complete Example: VGG16 Start to Finish

```powershell
# 1. Navigate to backend
cd C:\Users\rahul\OneDrive\Documents\GitHub\WhyteBox\backend

# 2. Install PyTorch (if not already installed)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 3. Run the VGG16 example
python examples\convert_vgg16.py

# 4. Check the output
dir output

# 5. View the JSON
code output\vgg16_pytorch_visualization.json
```

**Expected output files:**
- `vgg16_pytorch_visualization.json` (~50-100 KB without weights)
- `vgg16_keras_visualization.json` (if Keras installed)

---

## 📈 What You'll Get

After conversion, you'll have a JSON file with:

```json
{
  "metadata": {
    "model_name": "VGG16",
    "total_layers": 41,
    "total_parameters": 138357544
  },
  "layers": [
    {
      "name": "features.0",
      "type": "Conv2d",
      "output_shape": [1, 64, 224, 224],
      "visualization": {
        "color": "#4A90E2",
        "size_hint": 1.5
      }
    }
    // ... 40 more layers
  ],
  "connections": [ /* ... */ ],
  "architecture": {
    "architecture_type": "VGG"
  }
}
```

This JSON can then be loaded in your frontend visualization!

---

## ✅ Next Steps

1. **Convert a real model**: Run `python examples\convert_vgg16.py`
2. **Check the output**: Open `output/vgg16_pytorch_visualization.json`
3. **Try your own model**: Modify the examples
4. **Use the API**: Start the server and upload models
5. **Integrate with frontend**: Load JSON in Babylon.js/TensorSpace

---

**Ready to convert? Just run:**
```powershell
python examples\convert_vgg16.py
```
