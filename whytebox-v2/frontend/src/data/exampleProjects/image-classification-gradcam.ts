/**
 * Example Project: Image Classification with Grad-CAM
 * 
 * A comprehensive beginner-friendly project that teaches:
 * - Loading pre-trained models
 * - Running inference on images
 * - Generating Grad-CAM visualizations
 * - Understanding model decisions
 */

import { ExampleProject } from '../../types/exampleProject';

export const imageClassificationGradCAM: ExampleProject = {
  id: 'image-classification-gradcam',
  title: 'Image Classification with Grad-CAM Explainability',
  slug: 'image-classification-gradcam',
  category: 'image-classification',
  difficulty: 'beginner',
  description: 'Build an image classifier and visualize what the model sees using Grad-CAM',
  longDescription: `
Learn how to build a complete image classification system with explainability features. 
This project will teach you how to load pre-trained models, run inference on images, 
and generate Grad-CAM visualizations to understand what parts of the image influenced 
the model's decision.

By the end of this project, you'll have a working image classifier that can explain 
its predictions visually, making it perfect for building trust in AI systems.
  `,
  objectives: [
    'Load and use a pre-trained ResNet50 model',
    'Preprocess images for model input',
    'Run inference and get predictions',
    'Generate Grad-CAM heatmaps',
    'Visualize and interpret results',
    'Build a simple web interface',
  ],
  prerequisites: [
    'Basic Python programming',
    'Understanding of neural networks',
    'Familiarity with PyTorch or TensorFlow',
    'Basic image processing concepts',
  ],
  estimatedTime: 120, // 2 hours
  framework: 'pytorch',
  language: 'python',
  tags: ['image-classification', 'grad-cam', 'explainability', 'computer-vision', 'beginner'],
  thumbnail: '/images/projects/image-classification-gradcam.jpg',
  author: {
    id: 'whytebox-team',
    name: 'WhyteBox Team',
    avatar: '/images/avatars/whytebox.png',
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  stats: {
    views: 2500,
    completions: 450,
    rating: {
      average: 4.7,
      count: 89,
    },
  },
  steps: [
    {
      id: 'step-1',
      order: 1,
      title: 'Project Setup and Environment',
      description: 'Set up your development environment and install required dependencies',
      content: `
# Step 1: Project Setup

Let's start by setting up our development environment and installing all necessary dependencies.

## Create Project Directory

\`\`\`bash
mkdir image-classifier-gradcam
cd image-classifier-gradcam
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
\`\`\`

## Install Dependencies

We'll need PyTorch, torchvision, and some utility libraries:

\`\`\`bash
pip install torch torchvision pillow matplotlib numpy opencv-python
\`\`\`

## Project Structure

Create the following directory structure:

\`\`\`
image-classifier-gradcam/
├── models/          # Pre-trained models
├── images/          # Test images
├── outputs/         # Generated visualizations
├── src/
│   ├── __init__.py
│   ├── model.py     # Model loading
│   ├── gradcam.py   # Grad-CAM implementation
│   └── utils.py     # Utility functions
└── main.py          # Main script
\`\`\`

## Verify Installation

Test that PyTorch is installed correctly:

\`\`\`python
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
\`\`\`

You should see the PyTorch version and whether CUDA is available for GPU acceleration.
      `,
      codeSnippets: [
        {
          id: 'setup-script',
          title: 'Setup Script',
          description: 'Automated setup script',
          language: 'python',
          filename: 'setup.py',
          code: `#!/usr/bin/env python3
"""
Setup script for Image Classification with Grad-CAM project
"""
import os
import sys

def create_directories():
    """Create project directory structure"""
    dirs = ['models', 'images', 'outputs', 'src']
    for dir_name in dirs:
        os.makedirs(dir_name, exist_ok=True)
        print(f"✓ Created {dir_name}/ directory")

def verify_dependencies():
    """Verify all dependencies are installed"""
    required = ['torch', 'torchvision', 'PIL', 'matplotlib', 'numpy', 'cv2']
    missing = []
    
    for package in required:
        try:
            __import__(package)
            print(f"✓ {package} is installed")
        except ImportError:
            missing.append(package)
            print(f"✗ {package} is missing")
    
    if missing:
        print(f"\\nPlease install missing packages:")
        print(f"pip install {' '.join(missing)}")
        sys.exit(1)
    
    print("\\n✓ All dependencies are installed!")

if __name__ == '__main__':
    print("Setting up Image Classification with Grad-CAM project...\\n")
    create_directories()
    print()
    verify_dependencies()
`,
        },
      ],
      checkpoints: [
        {
          id: 'checkpoint-1-1',
          title: 'Environment Created',
          description: 'Virtual environment is created and activated',
          validationType: 'manual',
        },
        {
          id: 'checkpoint-1-2',
          title: 'Dependencies Installed',
          description: 'All required packages are installed',
          validationType: 'code-output',
          validation: {
            testCommand: 'python -c "import torch, torchvision, PIL, matplotlib, numpy, cv2"',
          },
        },
        {
          id: 'checkpoint-1-3',
          title: 'Directory Structure',
          description: 'Project directories are created',
          validationType: 'file-exists',
          validation: {
            filePath: 'src/__init__.py',
          },
        },
      ],
      hints: [
        'Make sure to activate the virtual environment before installing packages',
        'If CUDA is not available, the project will still work on CPU',
        'You can use conda instead of venv if you prefer',
      ],
      estimatedTime: 15,
      isOptional: false,
    },
    {
      id: 'step-2',
      order: 2,
      title: 'Load Pre-trained Model',
      description: 'Load a pre-trained ResNet50 model from torchvision',
      content: `
# Step 2: Load Pre-trained Model

We'll use a pre-trained ResNet50 model from torchvision's model zoo.

## Understanding ResNet50

ResNet50 is a 50-layer deep convolutional neural network that:
- Was trained on ImageNet (1.2M images, 1000 classes)
- Uses residual connections to enable training very deep networks
- Achieves ~76% top-1 accuracy on ImageNet

## Implementation

Create \`src/model.py\`:

\`\`\`python
import torch
import torchvision.models as models
from torchvision import transforms

class ImageClassifier:
    def __init__(self, model_name='resnet50', device=None):
        self.device = device or torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self._load_model(model_name)
        self.transform = self._get_transform()
        
    def _load_model(self, model_name):
        """Load pre-trained model"""
        if model_name == 'resnet50':
            model = models.resnet50(pretrained=True)
        else:
            raise ValueError(f"Unsupported model: {model_name}")
        
        model = model.to(self.device)
        model.eval()
        return model
    
    def _get_transform(self):
        """Get image preprocessing transform"""
        return transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
\`\`\`

## Why These Preprocessing Steps?

1. **Resize(256)**: Resize shortest side to 256 pixels
2. **CenterCrop(224)**: Crop center 224x224 region
3. **ToTensor()**: Convert PIL Image to tensor
4. **Normalize()**: Normalize using ImageNet statistics

These are the same preprocessing steps used during training!
      `,
      codeSnippets: [
        {
          id: 'model-loader',
          title: 'Complete Model Loader',
          description: 'Full implementation of model loading',
          language: 'python',
          filename: 'src/model.py',
          code: `import torch
import torchvision.models as models
from torchvision import transforms
from PIL import Image
import json

class ImageClassifier:
    """Image classifier using pre-trained models"""
    
    def __init__(self, model_name='resnet50', device=None):
        self.device = device or torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self._load_model(model_name)
        self.transform = self._get_transform()
        self.labels = self._load_labels()
        
    def _load_model(self, model_name):
        """Load pre-trained model"""
        print(f"Loading {model_name} model...")
        
        if model_name == 'resnet50':
            model = models.resnet50(pretrained=True)
        elif model_name == 'resnet18':
            model = models.resnet18(pretrained=True)
        elif model_name == 'vgg16':
            model = models.vgg16(pretrained=True)
        else:
            raise ValueError(f"Unsupported model: {model_name}")
        
        model = model.to(self.device)
        model.eval()
        
        print(f"✓ Model loaded on {self.device}")
        return model
    
    def _get_transform(self):
        """Get image preprocessing transform"""
        return transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
    
    def _load_labels(self):
        """Load ImageNet class labels"""
        # In a real project, load from file
        # For now, return a simple dict
        return {i: f"class_{i}" for i in range(1000)}
    
    def preprocess(self, image_path):
        """Preprocess image for model input"""
        image = Image.open(image_path).convert('RGB')
        return self.transform(image).unsqueeze(0).to(self.device)
    
    def predict(self, image_path, top_k=5):
        """Run inference and return top-k predictions"""
        # Preprocess image
        input_tensor = self.preprocess(image_path)
        
        # Run inference
        with torch.no_grad():
            output = self.model(input_tensor)
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
        
        # Get top-k predictions
        top_probs, top_indices = torch.topk(probabilities, top_k)
        
        results = []
        for prob, idx in zip(top_probs, top_indices):
            results.append({
                'class_id': idx.item(),
                'class_name': self.labels.get(idx.item(), f"class_{idx.item()}"),
                'confidence': prob.item()
            })
        
        return results

# Example usage
if __name__ == '__main__':
    classifier = ImageClassifier()
    predictions = classifier.predict('images/sample.jpg')
    
    print("\\nTop 5 Predictions:")
    for i, pred in enumerate(predictions, 1):
        print(f"{i}. {pred['class_name']}: {pred['confidence']:.2%}")
`,
        },
      ],
      checkpoints: [
        {
          id: 'checkpoint-2-1',
          title: 'Model Loads Successfully',
          description: 'ResNet50 model loads without errors',
          validationType: 'code-output',
        },
        {
          id: 'checkpoint-2-2',
          title: 'Preprocessing Works',
          description: 'Image preprocessing produces correct tensor shape',
          validationType: 'test-passes',
        },
      ],
      hints: [
        'The first time you run this, it will download the model weights (~100MB)',
        'Make sure you have enough disk space for the model',
        'If download fails, check your internet connection',
      ],
      estimatedTime: 20,
      isOptional: false,
    },
    {
      id: 'step-3',
      order: 3,
      title: 'Implement Grad-CAM',
      description: 'Implement Grad-CAM algorithm for visual explanations',
      content: `
# Step 3: Implement Grad-CAM

Grad-CAM (Gradient-weighted Class Activation Mapping) generates visual explanations 
by highlighting important regions in the image.

## How Grad-CAM Works

1. Forward pass: Get model predictions
2. Backward pass: Compute gradients of target class w.r.t. feature maps
3. Global average pooling: Average gradients across spatial dimensions
4. Weighted combination: Multiply feature maps by weights
5. ReLU: Keep only positive influences
6. Upsample: Resize heatmap to input image size

## Implementation

Create \`src/gradcam.py\`:

This implementation will:
- Hook into the target layer to capture activations and gradients
- Compute importance weights from gradients
- Generate the final heatmap
- Overlay the heatmap on the original image
      `,
      codeSnippets: [
        {
          id: 'gradcam-implementation',
          title: 'Grad-CAM Implementation',
          description: 'Complete Grad-CAM algorithm',
          language: 'python',
          filename: 'src/gradcam.py',
          code: `import torch
import torch.nn.functional as F
import numpy as np
import cv2
from PIL import Image

class GradCAM:
    """Grad-CAM implementation for visual explanations"""
    
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Register hooks
        self._register_hooks()
    
    def _register_hooks(self):
        """Register forward and backward hooks"""
        def forward_hook(module, input, output):
            self.activations = output.detach()
        
        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()
        
        # Find target layer and register hooks
        for name, module in self.model.named_modules():
            if name == self.target_layer:
                module.register_forward_hook(forward_hook)
                module.register_full_backward_hook(backward_hook)
                break
    
    def generate(self, input_tensor, target_class=None):
        """
        Generate Grad-CAM heatmap
        
        Args:
            input_tensor: Preprocessed input image tensor
            target_class: Target class index (None for predicted class)
        
        Returns:
            heatmap: Grad-CAM heatmap as numpy array
        """
        # Forward pass
        output = self.model(input_tensor)
        
        # Get target class
        if target_class is None:
            target_class = output.argmax(dim=1).item()
        
        # Zero gradients
        self.model.zero_grad()
        
        # Backward pass for target class
        one_hot = torch.zeros_like(output)
        one_hot[0][target_class] = 1
        output.backward(gradient=one_hot, retain_graph=True)
        
        # Get gradients and activations
        gradients = self.gradients[0]  # [C, H, W]
        activations = self.activations[0]  # [C, H, W]
        
        # Global average pooling of gradients
        weights = gradients.mean(dim=(1, 2))  # [C]
        
        # Weighted combination of activation maps
        cam = torch.zeros(activations.shape[1:], dtype=torch.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i]
        
        # Apply ReLU
        cam = F.relu(cam)
        
        # Normalize to [0, 1]
        cam = cam - cam.min()
        cam = cam / cam.max()
        
        return cam.cpu().numpy()
    
    def visualize(self, image_path, heatmap, alpha=0.4):
        """
        Create visualization by overlaying heatmap on image
        
        Args:
            image_path: Path to original image
            heatmap: Grad-CAM heatmap
            alpha: Transparency of heatmap overlay
        
        Returns:
            overlay: Combined image with heatmap overlay
        """
        # Load original image
        image = cv2.imread(image_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize heatmap to match image size
        heatmap_resized = cv2.resize(heatmap, (image.shape[1], image.shape[0]))
        
        # Convert heatmap to RGB
        heatmap_colored = cv2.applyColorMap(
            np.uint8(255 * heatmap_resized), 
            cv2.COLORMAP_JET
        )
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        # Overlay heatmap on image
        overlay = cv2.addWeighted(image, 1 - alpha, heatmap_colored, alpha, 0)
        
        return overlay, heatmap_colored

# Example usage
if __name__ == '__main__':
    from model import ImageClassifier
    
    # Load model
    classifier = ImageClassifier()
    
    # Create Grad-CAM
    gradcam = GradCAM(classifier.model, target_layer='layer4')
    
    # Generate heatmap
    image_path = 'images/sample.jpg'
    input_tensor = classifier.preprocess(image_path)
    heatmap = gradcam.generate(input_tensor)
    
    # Visualize
    overlay, heatmap_colored = gradcam.visualize(image_path, heatmap)
    
    # Save results
    Image.fromarray(overlay).save('outputs/gradcam_overlay.jpg')
    Image.fromarray(heatmap_colored).save('outputs/gradcam_heatmap.jpg')
    
    print("✓ Grad-CAM visualization saved!")
`,
        },
      ],
      checkpoints: [
        {
          id: 'checkpoint-3-1',
          title: 'Hooks Registered',
          description: 'Forward and backward hooks are properly registered',
          validationType: 'code-output',
        },
        {
          id: 'checkpoint-3-2',
          title: 'Heatmap Generated',
          description: 'Grad-CAM heatmap is generated successfully',
          validationType: 'file-exists',
          validation: {
            filePath: 'outputs/gradcam_heatmap.jpg',
          },
        },
      ],
      hints: [
        'The target layer should be the last convolutional layer for best results',
        'For ResNet50, use "layer4" as the target layer',
        'Make sure to detach tensors to avoid memory leaks',
      ],
      estimatedTime: 30,
      isOptional: false,
    },
    // Additional steps would continue here...
  ],
  resources: [
    {
      id: 'resource-1',
      type: 'documentation',
      title: 'Grad-CAM Paper',
      description: 'Original Grad-CAM research paper',
      url: 'https://arxiv.org/abs/1610.02391',
      isRequired: false,
    },
    {
      id: 'resource-2',
      type: 'documentation',
      title: 'PyTorch Documentation',
      description: 'Official PyTorch documentation',
      url: 'https://pytorch.org/docs/stable/index.html',
      isRequired: false,
    },
    {
      id: 'resource-3',
      type: 'video',
      title: 'Understanding Grad-CAM',
      description: 'Video tutorial on Grad-CAM',
      url: '/videos/gradcam-tutorial.mp4',
      isRequired: false,
    },
  ],
  starterCode: {
    id: 'starter-1',
    description: 'Starter code with project structure and basic setup',
    files: [
      {
        path: 'main.py',
        content: '# Main script - implement your solution here\n',
        language: 'python',
        description: 'Main entry point',
        isEditable: true,
      },
      {
        path: 'src/__init__.py',
        content: '',
        language: 'python',
        description: 'Package init file',
        isEditable: false,
      },
      {
        path: 'requirements.txt',
        content: 'torch>=2.0.0\ntorchvision>=0.15.0\npillow>=9.0.0\nmatplotlib>=3.5.0\nnumpy>=1.21.0\nopencv-python>=4.5.0\n',
        language: 'python',
        description: 'Python dependencies',
        isEditable: false,
      },
    ],
    setupInstructions: 'Run `pip install -r requirements.txt` to install dependencies',
    dependencies: [
      { name: 'torch', version: '>=2.0.0', description: 'PyTorch deep learning framework', isOptional: false },
      { name: 'torchvision', version: '>=0.15.0', description: 'Computer vision models and utilities', isOptional: false },
      { name: 'pillow', version: '>=9.0.0', description: 'Image processing library', isOptional: false },
      { name: 'matplotlib', version: '>=3.5.0', description: 'Plotting library', isOptional: false },
      { name: 'numpy', version: '>=1.21.0', description: 'Numerical computing library', isOptional: false },
      { name: 'opencv-python', version: '>=4.5.0', description: 'Computer vision library', isOptional: false },
    ],
    downloadUrl: '/downloads/image-classification-gradcam-starter.zip',
  },
  solutionCode: {
    id: 'solution-1',
    description: 'Complete solution with all implementations',
    files: [],
    explanation: 'Full implementation with detailed comments and best practices',
    downloadUrl: '/downloads/image-classification-gradcam-solution.zip',
    isLocked: true,
  },
  datasets: [
    {
      id: 'dataset-1',
      name: 'Sample Images',
      description: 'Collection of sample images for testing',
      size: 5242880, // 5MB
      format: 'JPG',
      downloadUrl: '/downloads/sample-images.zip',
      license: 'CC0',
      samples: 20,
      features: ['Various objects', 'Different lighting conditions', 'Multiple angles'],
    },
  ],
  relatedProjects: [
    'object-detection-yolo',
    'medical-imaging-xray',
    'semantic-segmentation',
  ],
};

// Made with Bob
