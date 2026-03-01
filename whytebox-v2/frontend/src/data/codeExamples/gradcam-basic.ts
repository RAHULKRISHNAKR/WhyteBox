/**
 * Basic Grad-CAM Implementation Example
 */

import { CodeExample } from '../../types/codeExample';

export const gradcamBasicExample: CodeExample = {
  id: 'gradcam-basic',
  title: 'Basic Grad-CAM Implementation',
  description: 'Learn how to implement Grad-CAM from scratch using PyTorch. This example shows the core algorithm for generating class activation maps.',
  category: 'gradcam',
  difficulty: 'intermediate',
  language: 'python',
  code: `import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt

class GradCAM:
    """
    Grad-CAM implementation for PyTorch models
    """
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Register hooks
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_backward_hook(self.save_gradient)
    
    def save_activation(self, module, input, output):
        """Save forward pass activations"""
        self.activations = output.detach()
    
    def save_gradient(self, module, grad_input, grad_output):
        """Save backward pass gradients"""
        self.gradients = grad_output[0].detach()
    
    def generate_cam(self, input_image, target_class=None):
        """
        Generate Grad-CAM heatmap
        
        Args:
            input_image: Input tensor (1, C, H, W)
            target_class: Target class index (None for predicted class)
        
        Returns:
            cam: Grad-CAM heatmap (H, W)
        """
        # Forward pass
        self.model.eval()
        output = self.model(input_image)
        
        # Get target class
        if target_class is None:
            target_class = output.argmax(dim=1).item()
        
        # Backward pass
        self.model.zero_grad()
        target = output[0, target_class]
        target.backward()
        
        # Calculate weights (global average pooling of gradients)
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        
        # Weighted combination of activation maps
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        
        # Apply ReLU
        cam = F.relu(cam)
        
        # Normalize to [0, 1]
        cam = cam - cam.min()
        cam = cam / cam.max()
        
        # Resize to input size
        cam = F.interpolate(
            cam,
            size=input_image.shape[2:],
            mode='bilinear',
            align_corners=False
        )
        
        return cam.squeeze().cpu().numpy()

# Example usage
def visualize_gradcam(model, image_path, target_layer):
    """
    Complete example of using Grad-CAM
    """
    # Load and preprocess image
    image = Image.open(image_path).convert('RGB')
    image = image.resize((224, 224))
    
    # Convert to tensor
    from torchvision import transforms
    preprocess = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])
    input_tensor = preprocess(image).unsqueeze(0)
    
    # Generate Grad-CAM
    gradcam = GradCAM(model, target_layer)
    cam = gradcam.generate_cam(input_tensor)
    
    # Visualize
    plt.figure(figsize=(12, 4))
    
    plt.subplot(1, 3, 1)
    plt.imshow(image)
    plt.title('Original Image')
    plt.axis('off')
    
    plt.subplot(1, 3, 2)
    plt.imshow(cam, cmap='jet')
    plt.title('Grad-CAM Heatmap')
    plt.axis('off')
    
    plt.subplot(1, 3, 3)
    plt.imshow(image)
    plt.imshow(cam, cmap='jet', alpha=0.5)
    plt.title('Overlay')
    plt.axis('off')
    
    plt.tight_layout()
    plt.show()

# Test with ResNet
if __name__ == '__main__':
    import torchvision.models as models
    
    # Load pre-trained ResNet
    model = models.resnet50(pretrained=True)
    target_layer = model.layer4[-1]
    
    # Generate Grad-CAM
    visualize_gradcam(model, 'path/to/image.jpg', target_layer)
`,
  tags: ['grad-cam', 'pytorch', 'visualization', 'cnn', 'explainability'],
  estimatedTime: 20,
  hasTests: false,
  isExecutable: true,
  requiresBackend: true,
  explanation: `This implementation shows the core Grad-CAM algorithm:

1. **Forward Pass**: Run the image through the model and save activations from the target layer
2. **Backward Pass**: Compute gradients of the target class score with respect to the feature maps
3. **Weight Calculation**: Global average pooling of gradients gives importance weights
4. **Weighted Combination**: Multiply weights by activations and sum
5. **Post-processing**: Apply ReLU, normalize, and resize to input dimensions

The key insight is that gradients tell us how much each feature map contributes to the target class prediction.`,
  learningObjectives: [
    'Understand the Grad-CAM algorithm',
    'Implement forward and backward hooks in PyTorch',
    'Generate and visualize class activation maps',
    'Apply Grad-CAM to pre-trained models',
  ],
  prerequisites: ['Basic PyTorch knowledge', 'Understanding of CNNs'],
  relatedExamples: ['gradcam-advanced', 'saliency-basic'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Made with Bob
