# 🎨 WhyteBox - Interactive 3D Neural Network Visualizer

<div align="center">

![WhyteBox Logo](https://img.shields.io/badge/WhyteBox-Neural%20Network%20Visualizer-blue?style=for-the-badge)
[![Python](https://img.shields.io/badge/Python-3.9+-green?style=flat-square&logo=python)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-red?style=flat-square&logo=pytorch)](https://pytorch.org/)
[![BabylonJS](https://img.shields.io/badge/BabylonJS-6.0+-orange?style=flat-square)](https://www.babylonjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**Transform neural networks from black boxes into interactive 3D white boxes**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Examples](#-examples) • [Contributing](#-contributing)

</div>

---

## 🌟 What is WhyteBox?

WhyteBox is a **web-based 3D visualization platform** that makes neural networks transparent and understandable. Upload any PyTorch or Keras model, explore its architecture in interactive 3D, run live inference with images, and see real-time activation heatmaps—all in your browser.

### Why WhyteBox?

- 🎓 **Educational**: Perfect for students learning deep learning
- 🔬 **Research**: Analyze and debug model architectures
- 🎨 **Interactive**: Explore networks in immersive 3D
- ⚡ **Real-time**: Live inference with activation visualization
- 🌐 **Web-based**: No installation, runs in browser
- 🔧 **Multi-framework**: Supports PyTorch and TensorFlow/Keras

---

## ✨ Features

### 🏗️ Architecture Visualization
- **Interactive 3D Models**: Rotate, zoom, and explore neural networks in 3D space
- **Layer Types**: Supports Conv, Dense, Pooling, Activation, Normalization, and more
- **Smart Layout**: Automatic positioning with sequential and skip connections
- **Color Coding**: Different colors for different layer types
- **Hover Details**: Tooltips showing layer parameters and shapes

### 🔍 Layer Exploration
- **Feature Map Expansion**: Click any layer to see individual feature maps
- **Grid Layout**: Up to 64 feature maps displayed in organized grids
- **Real-time Updates**: Expand/collapse layers anytime during or after inference

### 🖼️ Live Inference
- **Image Upload**: Process any image (JPG, PNG, etc.)
- **20+ Pretrained Models**: VGG, ResNet, DenseNet, MobileNet, EfficientNet, and more
- **Top-K Predictions**: See confidence scores for top predictions
- **Activation Heatmaps**: Visualize what each layer "sees" with colorful heatmaps

### 🧠 Explainability (XAI)
- **Grad-CAM**: Gradient-weighted Class Activation Mapping
- **Saliency Maps**: Raw gradient magnitude visualization
- **Integrated Gradients**: Path-integrated attribution (NEW!)
- **Compare Mode**: Side-by-side comparison of multiple methods

### 🎯 Supported Models
- **Vision Models**: VGG16/19, ResNet18/34/50/101, DenseNet121/161, MobileNetV2/V3, EfficientNet B0/B1, InceptionV3, GoogLeNet, AlexNet, SqueezeNet, ShuffleNet, RegNet
- **Custom Models**: Upload your own PyTorch (.pth) or Keras (.h5) models
- **Frameworks**: PyTorch, TensorFlow/Keras

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/WhyteBox.git
cd WhyteBox
```

2. **Install backend dependencies**
```bash
cd backend
pip install -r requirements.txt
```

3. **Start the servers**

**On macOS/Linux:**
```bash
./start.sh
```

**On Windows:**
```bash
start.bat
```

4. **Open in browser**
```
http://localhost:8000/frontend/examples/visualize-model.html
```

That's it! 🎉

---

## 📖 Usage

### Basic Workflow

1. **Load a Model**
   - Click "Load VGG16" for a quick demo
   - Or upload your own model file

2. **Explore Architecture**
   - Rotate: Left-click + drag
   - Pan: Right-click + drag
   - Zoom: Scroll wheel
   - Click layers to expand feature maps

3. **Run Inference**
   - Click "📷 Upload Image"
   - Select an image file
   - Click "▶️ Run Inference"
   - View predictions and activation heatmaps

4. **Analyze Results**
   - Expanded layers show colorful activation heatmaps
   - Dark purple/blue = low activation
   - Yellow/bright = high activation
   - Hover over layers for details

### Advanced Features

#### Explainability Analysis
```
Open: http://localhost:8000/frontend/examples/explainable-ai.html
```
- Upload an image
- Select a model
- Choose explainability method (Grad-CAM, Saliency, Integrated Gradients)
- View attribution heatmaps

#### Model Comparison
- Load multiple models
- Run same image through both
- Compare activations layer-by-layer

---

## 📚 Documentation

- **[Installation Guide](INSTALLATION.md)**: Detailed setup instructions
- **[User Guide](USER_GUIDE.md)**: Step-by-step tutorials with screenshots
- **[API Reference](backend/API_REFERENCE.md)**: Complete API documentation
- **[Developer Guide](DEVELOPER_GUIDE.md)**: Architecture and contributing
- **[Project Analysis](PROJECT_ANALYSIS.md)**: Comprehensive project review

---

## 🎬 Examples

### Example 1: Visualize VGG16
```python
# Backend automatically loads pretrained VGG16
# Just click "Load VGG16" in the UI
```

### Example 2: Custom Model Inference
```python
# Upload your model.pth file
# Upload an image
# Click "Run Inference"
# Explore activations in 3D
```

### Example 3: Explainability Analysis
```python
# Open explainable-ai.html
# Upload image and select model
# Choose "Integrated Gradients"
# View attribution heatmap
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (Browser)              │
│  • BabylonJS 3D Rendering               │
│  • Interactive Controls                 │
│  • Activation Visualization             │
└──────────────┬──────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────┐
│         Backend (Python/Flask)          │
│  • Model Loading & Caching              │
│  • PyTorch/Keras Inference              │
│  • Activation Extraction                │
│  • Explainability Methods               │
└─────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- BabylonJS 6.0+ (3D graphics)
- Vanilla JavaScript (no framework overhead)
- HTML5/CSS3 (responsive design)

**Backend:**
- Flask 3.0+ (web server)
- PyTorch 2.0+ (deep learning)
- TensorFlow/Keras 2.15+ (optional)
- NumPy, OpenCV (image processing)

---

## 🔧 Configuration

### Backend Configuration
Edit `backend/config.py`:
```python
# Server settings
HOST = '0.0.0.0'
PORT = 5001  # Note: 5001 due to macOS AirPlay conflict

# File upload settings
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB
ALLOWED_EXTENSIONS = {'pth', 'pt', 'h5', 'keras', 'onnx'}
```

### Environment Variables
Create `.env` file:
```bash
FLASK_ENV=development
BACKEND_PORT=5001
FRONTEND_PORT=8000
MODEL_CACHE_SIZE=5
```

---

## 🧪 Testing

Run backend tests:
```bash
cd backend
pytest tests/
```

Run with coverage:
```bash
pytest --cov=. --cov-report=html
```

---

## 🐛 Known Issues

1. **PyTorch Autograd Warning**: Some explainability methods (Grad-CAM, Guided Backprop) may show warnings with certain models. Use Integrated Gradients as a robust alternative.

2. **Large Model Performance**: Models with 100+ layers may be slow to load. We're working on lazy loading optimization.

3. **Browser Compatibility**: Best experience on Chrome/Edge. Firefox and Safari work but may have minor rendering differences.

See [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md) for detailed issue tracking.

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📊 Project Status

- ✅ Core visualization (Complete)
- ✅ Live inference (Complete)
- ✅ Activation heatmaps (Complete)
- ✅ Explainability methods (Complete)
- 🚧 UI/UX improvements (In Progress)
- 🚧 Performance optimization (In Progress)
- 📋 Advanced features (Planned)

See [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md) for comprehensive status.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **BabylonJS**: Amazing 3D engine
- **PyTorch**: Powerful deep learning framework
- **TensorFlow**: Alternative framework support
- **TensorSpace.js**: Inspiration for 3D neural network visualization
- **Community**: All contributors and users

---

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/WhyteBox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/WhyteBox/discussions)
- **Email**: your.email@example.com

---

## 🌟 Star History

If you find WhyteBox useful, please consider giving it a star ⭐

---

<div align="center">

**Made with ❤️ for the Deep Learning Community**

[⬆ Back to Top](#-whytebox---interactive-3d-neural-network-visualizer)

</div>
