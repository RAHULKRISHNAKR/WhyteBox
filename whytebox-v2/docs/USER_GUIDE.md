# WhyteBox v2.0 User Guide

**Version:** 2.0.0  
**Last Updated:** 2026-02-25

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Understanding Neural Networks](#understanding-neural-networks)
4. [Using the Platform](#using-the-platform)
5. [Model Visualization](#model-visualization)
6. [Running Inference](#running-inference)
7. [Explainability Features](#explainability-features)
8. [Interactive Tutorials](#interactive-tutorials)
9. [Advanced Features](#advanced-features)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is WhyteBox?

WhyteBox is an educational platform designed to demystify neural networks through interactive 3D visualization and explainability tools. Whether you're a student, researcher, or AI enthusiast, WhyteBox helps you understand how neural networks work from the inside out.

### Key Features

- **3D Model Visualization**: Explore neural network architectures in interactive 3D space
- **Real-time Inference**: Run predictions and see data flow through the network
- **Explainability Tools**: Understand why models make specific predictions
- **Interactive Tutorials**: Learn AI concepts through hands-on exercises
- **Multiple Frameworks**: Support for PyTorch, TensorFlow, and Keras models

### Who is This For?

- **Students**: Learn neural network concepts visually
- **Educators**: Teach AI/ML with interactive demonstrations
- **Researchers**: Analyze and debug model architectures
- **Developers**: Understand model behavior before deployment
- **AI Enthusiasts**: Explore how neural networks work

---

## Getting Started

### Creating an Account

1. Navigate to `http://localhost:3000` (or your deployment URL)
2. Click **Sign Up** in the top right corner
3. Enter your email and create a password
4. Verify your email address
5. Complete your profile

### First Login

After logging in, you'll see the **Dashboard** with:
- Quick start tutorials
- Featured models
- Recent activity
- Learning path recommendations

### Platform Overview

#### Main Navigation

- **Dashboard**: Overview and quick access
- **Models**: Browse and manage neural network models
- **Visualize**: 3D model visualization workspace
- **Inference**: Run predictions on models
- **Explain**: Explainability and interpretation tools
- **Tutorials**: Interactive learning modules
- **Datasets**: Manage training and test datasets

---

## Understanding Neural Networks

### What is a Neural Network?

A neural network is a computational model inspired by biological neurons. It consists of:

1. **Input Layer**: Receives data (images, text, numbers)
2. **Hidden Layers**: Process and transform data
3. **Output Layer**: Produces predictions or classifications

### Common Layer Types

#### Convolutional Layers (Conv2D)
- Used for image processing
- Detect patterns like edges, textures, shapes
- Preserve spatial relationships

#### Pooling Layers
- Reduce spatial dimensions
- Make features more robust
- Common types: MaxPooling, AveragePooling

#### Dense/Fully Connected Layers
- Connect every neuron to every neuron in next layer
- Used for final classification
- Learn complex relationships

#### Activation Functions
- **ReLU**: Most common, introduces non-linearity
- **Sigmoid**: Outputs between 0 and 1
- **Softmax**: Converts outputs to probabilities

### Model Architectures

#### VGG16
- 16 layers deep
- Simple, uniform architecture
- Good for learning CNN basics
- 138M parameters

#### ResNet50
- 50 layers with skip connections
- Solves vanishing gradient problem
- State-of-the-art performance
- 25M parameters

#### MobileNet
- Lightweight, efficient
- Designed for mobile devices
- Fast inference
- 4M parameters

---

## Using the Platform

### Browsing Models

1. Click **Models** in the navigation
2. Browse available models or use filters:
   - Framework (PyTorch, TensorFlow, Keras)
   - Type (CNN, RNN, Transformer)
   - Complexity (Beginner, Intermediate, Advanced)
3. Click on a model card to view details

### Model Details Page

Each model page shows:
- **Architecture Diagram**: Visual representation of layers
- **Statistics**: Parameters, accuracy, training info
- **Description**: What the model does
- **Actions**: Visualize, Run Inference, Explain

### Loading a Model

1. Navigate to the model you want to use
2. Click **Load Model**
3. Choose device (CPU or GPU if available)
4. Wait for loading confirmation
5. Model is now ready for visualization or inference

---

## Model Visualization

### Opening the 3D Viewer

1. Select a model from the Models page
2. Click **Visualize** button
3. The 3D visualization workspace opens

### Navigation Controls

#### Mouse Controls
- **Left Click + Drag**: Rotate camera
- **Right Click + Drag**: Pan camera
- **Scroll Wheel**: Zoom in/out
- **Double Click**: Focus on layer

#### Keyboard Shortcuts
- **Space**: Play/pause animation
- **R**: Reset camera
- **F**: Fit model to view
- **H**: Toggle help overlay
- **1-9**: Jump to layer group

### Understanding the Visualization

#### Layer Representation
- **Boxes**: Represent layers
- **Size**: Proportional to layer dimensions
- **Color**: Indicates layer type
  - Blue: Convolutional layers
  - Green: Pooling layers
  - Orange: Dense layers
  - Purple: Activation functions

#### Connections
- **Lines**: Show data flow between layers
- **Thickness**: Indicates connection strength
- **Animation**: Shows data propagation

### Interactive Features

#### Layer Inspection
1. Click on any layer
2. View layer details panel:
   - Layer name and type
   - Input/output shapes
   - Number of parameters
   - Configuration settings

#### Data Flow Animation
1. Click **Animate** button
2. Watch data flow through the network
3. Adjust animation speed with slider
4. Pause at any layer to inspect

#### Layer Filtering
- Toggle layer types on/off
- Hide/show specific layers
- Group layers by type
- Collapse/expand layer groups

---

## Running Inference

### Preparing Input Data

#### Image Input
1. Click **Inference** in navigation
2. Select your loaded model
3. Choose input method:
   - **Upload Image**: Select from computer
   - **Use Sample**: Choose from provided examples
   - **Camera**: Capture from webcam
   - **URL**: Load from web address

#### Preprocessing
- Images are automatically resized to model's expected input size
- Normalization is applied based on model requirements
- You can preview the preprocessed image

### Running Predictions

1. After loading input, click **Run Inference**
2. Watch the progress indicator
3. View results in the output panel

### Understanding Results

#### Classification Results
```
Top 5 Predictions:
1. Cat (98.7%)
2. Dog (0.8%)
3. Tiger (0.3%)
4. Lion (0.1%)
5. Leopard (0.1%)
```

#### Confidence Scores
- **High Confidence (>90%)**: Model is very certain
- **Medium Confidence (50-90%)**: Model is somewhat certain
- **Low Confidence (<50%)**: Model is uncertain

#### Visualization Options
- **Bar Chart**: Compare prediction probabilities
- **Pie Chart**: See distribution of top predictions
- **Heatmap**: View activation patterns

### Batch Inference

1. Click **Batch Mode**
2. Upload multiple images
3. Run inference on all images
4. Export results as CSV or JSON

---

## Explainability Features

### Why Explainability Matters

Understanding *why* a model makes a prediction is crucial for:
- Debugging model behavior
- Building trust in AI systems
- Identifying biases
- Meeting regulatory requirements

### Available Methods

#### Grad-CAM (Gradient-weighted Class Activation Mapping)

**What it does**: Highlights regions of the input that influenced the prediction

**How to use**:
1. Run inference on an image
2. Click **Explain** button
3. Select **Grad-CAM** method
4. Choose target layer (usually last conv layer)
5. View heatmap overlay

**Interpreting Results**:
- **Red/Hot colors**: High importance regions
- **Blue/Cold colors**: Low importance regions
- Overlay shows which parts of image the model "looked at"

**Example Use Case**:
```
Input: Image of a cat
Prediction: Cat (98.7%)
Grad-CAM: Highlights the cat's face and ears
Interpretation: Model correctly focused on cat features
```

#### Saliency Maps

**What it does**: Shows pixel-level importance using gradients

**How to use**:
1. After inference, select **Saliency Map**
2. View gradient magnitude visualization
3. Brighter pixels = more important

**Interpreting Results**:
- Sharp edges and boundaries are often highlighted
- Shows fine-grained feature importance
- Useful for understanding low-level features

#### Integrated Gradients

**What it does**: Computes attribution by integrating gradients along path from baseline to input

**How to use**:
1. Select **Integrated Gradients** method
2. Choose baseline (default: black image)
3. Set number of steps (default: 50)
4. View attribution map

**Interpreting Results**:
- More robust than simple gradients
- Satisfies sensitivity and implementation invariance
- Better for understanding feature importance

**Advantages**:
- No gradient flow issues
- Theoretically grounded
- Works well with deep networks

### Comparing Methods

1. Click **Compare Methods**
2. Select multiple explainability methods
3. View side-by-side comparison
4. Analyze differences and similarities

### Interactive Exploration

#### Region Analysis
1. Draw bounding box on image
2. See how prediction changes
3. Understand spatial importance

#### Feature Ablation
1. Mask parts of the input
2. Re-run inference
3. Measure impact on prediction

---

## Interactive Tutorials

### Tutorial Categories

#### Beginner
- Introduction to Neural Networks
- Understanding CNNs
- Your First Model
- Basic Image Classification

#### Intermediate
- Transfer Learning
- Model Fine-tuning
- Understanding Activations
- Debugging Models

#### Advanced
- Custom Architectures
- Attention Mechanisms
- Model Optimization
- Production Deployment

### Tutorial Structure

Each tutorial includes:
1. **Theory**: Conceptual explanation
2. **Visualization**: Interactive 3D demos
3. **Code**: Hands-on coding exercises
4. **Quiz**: Test your understanding
5. **Project**: Apply what you learned

### Starting a Tutorial

1. Navigate to **Tutorials**
2. Choose a tutorial based on your level
3. Click **Start Tutorial**
4. Follow step-by-step instructions
5. Complete exercises and quizzes

### Tutorial Features

#### Interactive Code Editor
- Write and run code in browser
- Instant feedback
- Syntax highlighting
- Auto-completion

#### Live Visualization
- See changes in real-time
- Manipulate parameters
- Observe effects immediately

#### Progress Tracking
- Track completed tutorials
- Earn badges and achievements
- View learning path progress

---

## Advanced Features

### Custom Model Upload

1. Navigate to **Models** → **Upload**
2. Select model file (.pt, .pth, .h5, .pb)
3. Fill in model details:
   - Name and description
   - Framework and type
   - Input/output specifications
4. Click **Upload**
5. Wait for validation
6. Model is now available for use

### Model Comparison

1. Select multiple models
2. Click **Compare**
3. View side-by-side comparison:
   - Architecture differences
   - Performance metrics
   - Inference speed
   - Memory usage

### Dataset Management

#### Uploading Datasets
1. Go to **Datasets** → **Upload**
2. Select dataset files
3. Specify format (images, CSV, etc.)
4. Add metadata and labels
5. Upload and validate

#### Using Datasets
- Test models on custom data
- Evaluate performance
- Generate reports
- Export results

### API Access

For programmatic access, see [API Reference](API_REFERENCE.md)

```python
from whytebox import WhyteBoxClient

client = WhyteBoxClient(api_key="your_key")
models = client.models.list()
```

---

## Troubleshooting

### Common Issues

#### Model Won't Load
**Problem**: Error when loading model  
**Solutions**:
- Check model file format is supported
- Ensure sufficient memory available
- Try loading on CPU instead of GPU
- Verify model file isn't corrupted

#### Slow Inference
**Problem**: Predictions take too long  
**Solutions**:
- Use GPU if available
- Reduce batch size
- Try a smaller model
- Check system resources

#### Visualization Not Rendering
**Problem**: 3D view is blank or frozen  
**Solutions**:
- Refresh the page
- Check browser WebGL support
- Update graphics drivers
- Try a different browser (Chrome recommended)

#### Upload Fails
**Problem**: Can't upload model or dataset  
**Solutions**:
- Check file size limits (max 500MB)
- Verify file format
- Ensure stable internet connection
- Try uploading smaller files first

### Browser Compatibility

**Recommended**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

**Required Features**:
- WebGL 2.0
- ES6 JavaScript
- WebAssembly
- Local Storage

### Performance Tips

1. **Close Unused Tabs**: Free up memory
2. **Use GPU**: Enable hardware acceleration
3. **Reduce Quality**: Lower visualization quality for speed
4. **Clear Cache**: Periodically clear browser cache
5. **Update Browser**: Use latest version

### Getting Help

#### Documentation
- [API Reference](API_REFERENCE.md)
- [Architecture Guide](ARCHITECTURE.md)
- [Developer Guide](DEVELOPER_GUIDE.md)

#### Support Channels
- **Email**: support@whytebox.com
- **Forum**: forum.whytebox.com
- **Discord**: discord.gg/whytebox
- **GitHub Issues**: github.com/whytebox/whytebox/issues

#### Reporting Bugs

When reporting bugs, include:
1. Browser and version
2. Operating system
3. Steps to reproduce
4. Expected vs actual behavior
5. Screenshots or error messages
6. Console logs (F12 → Console)

---

## Keyboard Shortcuts

### Global
- `Ctrl/Cmd + K`: Search
- `Ctrl/Cmd + /`: Toggle help
- `Esc`: Close modal/panel

### Visualization
- `Space`: Play/pause animation
- `R`: Reset camera
- `F`: Fit to view
- `H`: Toggle help
- `1-9`: Jump to layer
- `+/-`: Zoom in/out
- `Arrow Keys`: Rotate camera

### Editor
- `Ctrl/Cmd + S`: Save
- `Ctrl/Cmd + Enter`: Run code
- `Ctrl/Cmd + /`: Comment line
- `Tab`: Indent
- `Shift + Tab`: Unindent

---

## Best Practices

### Learning Path

1. **Start with Basics**: Complete beginner tutorials
2. **Explore Models**: Visualize pre-trained models
3. **Run Inference**: Test models with your own data
4. **Use Explainability**: Understand model decisions
5. **Build Projects**: Apply knowledge to real problems

### Model Selection

- **Learning**: Start with VGG16 (simple architecture)
- **Performance**: Use ResNet50 (state-of-the-art)
- **Speed**: Try MobileNet (fast inference)
- **Custom**: Upload your own models

### Visualization Tips

- Start with layer-by-layer exploration
- Use animation to understand data flow
- Compare different architectures
- Focus on one concept at a time

---

## Glossary

**Activation**: Output of a neuron after applying activation function  
**Backpropagation**: Algorithm for training neural networks  
**Batch Size**: Number of samples processed together  
**CNN**: Convolutional Neural Network  
**Epoch**: One complete pass through training data  
**Feature Map**: Output of a convolutional layer  
**Gradient**: Direction and rate of change  
**Inference**: Making predictions with a trained model  
**Layer**: Building block of neural network  
**Loss Function**: Measures prediction error  
**Neuron**: Basic computational unit  
**Overfitting**: Model memorizes training data  
**Parameter**: Learnable weight in the network  
**ReLU**: Rectified Linear Unit activation  
**Tensor**: Multi-dimensional array  
**Training**: Process of learning from data  
**Transfer Learning**: Using pre-trained models  
**Validation**: Evaluating model on unseen data  

---

**Version:** 2.0.0  
**Last Updated:** 2026-02-25  
**Need Help?** support@whytebox.com