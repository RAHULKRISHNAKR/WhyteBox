"""
Explainability Module - Grad-CAM and Saliency Maps
Provides gradient-based explanations for neural network predictions
"""

import numpy as np
import torch
import torch.nn.functional as F
from typing import Optional, Tuple, Union
import logging

logger = logging.getLogger(__name__)


class GradCAMGenerator:
    """
    Gradient-weighted Class Activation Mapping (Grad-CAM)
    Generates visual explanations for CNN classifications
    """
    
    def __init__(self, model, framework='pytorch'):
        """
        Initialize Grad-CAM generator
        
        Args:
            model: Neural network model (PyTorch or Keras)
            framework: 'pytorch' or 'keras'
        """
        self.model = model
        self.framework = framework.lower()
        self.gradients = None
        self.activations = None
        
    def _register_hooks_pytorch(self, target_layer):
        """Register forward and backward hooks for PyTorch"""
        def forward_hook(module, input, output):
            self.activations = output.clone().detach()
            
        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].clone().detach()
            
        # Register hooks on target layer
        forward_handle = target_layer.register_forward_hook(forward_hook)
        backward_handle = target_layer.register_full_backward_hook(backward_hook)
        
        return forward_handle, backward_handle
        
    def generate_gradcam_pytorch(
        self,
        input_tensor: torch.Tensor,
        target_class: int,
        target_layer: Optional[torch.nn.Module] = None
    ) -> np.ndarray:
        """
        Generate Grad-CAM heatmap for PyTorch model
        
        Args:
            input_tensor: Input image tensor [1, C, H, W]
            target_class: Target class index
            target_layer: Target convolutional layer (auto-detects if None)
            
        Returns:
            Heatmap as numpy array [H, W] normalized to [0, 1]
        """
        self.model.eval()
        
        # Auto-detect target layer if not provided
        if target_layer is None:
            target_layer = self._find_last_conv_layer_pytorch()
            logger.info(f"Auto-detected target layer: {target_layer}")
            
        # Register hooks
        forward_handle, backward_handle = self._register_hooks_pytorch(target_layer)
        
        try:
            # Forward pass
            input_tensor.requires_grad = True
            output = self.model(input_tensor)
            
            # Backward pass for target class
            self.model.zero_grad()
            target_score = output[0, target_class]
            target_score.backward()
            
            # Compute Grad-CAM
            # Gradients shape: [1, C, H, W]
            # Activations shape: [1, C, H, W]
            
            # Global average pooling of gradients (weights for each channel)
            weights = torch.mean(self.gradients, dim=(2, 3), keepdim=True)  # [1, C, 1, 1]
            
            # Weighted combination of activation maps
            cam = torch.sum(weights * self.activations, dim=1, keepdim=True)  # [1, 1, H, W]
            
            # Apply ReLU (only positive influences)
            cam = F.relu(cam)
            
            # Normalize to [0, 1]
            cam = cam.squeeze().cpu().numpy()
            cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
            
            # Resize to input image size
            input_size = (input_tensor.shape[2], input_tensor.shape[3])
            cam = self._resize_heatmap(cam, input_size)
            
            return cam
            
        finally:
            # Clean up hooks
            forward_handle.remove()
            backward_handle.remove()
            
    def _find_last_conv_layer_pytorch(self) -> torch.nn.Module:
        """Find the last convolutional layer in PyTorch model"""
        conv_layers = []
        
        def find_conv(module, name=''):
            for child_name, child in module.named_children():
                full_name = f"{name}.{child_name}" if name else child_name
                if isinstance(child, (torch.nn.Conv2d, torch.nn.Conv1d, torch.nn.Conv3d)):
                    conv_layers.append((full_name, child))
                find_conv(child, full_name)
                
        find_conv(self.model)
        
        if not conv_layers:
            raise ValueError("No convolutional layers found in model")
            
        last_conv_name, last_conv_layer = conv_layers[-1]
        logger.info(f"Found last conv layer: {last_conv_name}")
        return last_conv_layer
        
    def _resize_heatmap(self, heatmap: np.ndarray, target_size: Tuple[int, int]) -> np.ndarray:
        """Resize heatmap to target size using bilinear interpolation"""
        import cv2
        return cv2.resize(heatmap, target_size, interpolation=cv2.INTER_LINEAR)
        
    def generate(
        self,
        input_data: Union[torch.Tensor, np.ndarray],
        target_class: int,
        target_layer: Optional[Union[torch.nn.Module, str]] = None
    ) -> np.ndarray:
        """
        Generate Grad-CAM heatmap (framework-agnostic interface)
        
        Args:
            input_data: Input tensor or numpy array
            target_class: Target class index
            target_layer: Target layer (module or name)
            
        Returns:
            Heatmap as numpy array [H, W] normalized to [0, 1]
        """
        if self.framework == 'pytorch':
            if isinstance(input_data, np.ndarray):
                input_data = torch.from_numpy(input_data).float()
            return self.generate_gradcam_pytorch(input_data, target_class, target_layer)
        else:
            raise NotImplementedError(f"Framework {self.framework} not yet implemented")


class SaliencyMapGenerator:
    """
    Gradient-based Saliency Maps
    Shows which input pixels have the strongest influence on predictions
    """
    
    def __init__(self, model, framework='pytorch'):
        """
        Initialize saliency map generator
        
        Args:
            model: Neural network model
            framework: 'pytorch' or 'keras'
        """
        self.model = model
        self.framework = framework.lower()
        
    def generate_saliency_pytorch(
        self,
        input_tensor: torch.Tensor,
        target_class: int
    ) -> np.ndarray:
        """
        Generate saliency map for PyTorch model
        
        Args:
            input_tensor: Input image tensor [1, C, H, W]
            target_class: Target class index
            
        Returns:
            Saliency map as numpy array [H, W] normalized to [0, 1]
        """
        self.model.eval()
        
        # Forward pass with gradient tracking
        input_tensor.requires_grad = True
        output = self.model(input_tensor)
        
        # Backward pass for target class
        self.model.zero_grad()
        target_score = output[0, target_class]
        target_score.backward()
        
        # Get gradients with respect to input
        saliency = input_tensor.grad.data.abs()
        
        # Take maximum across color channels
        saliency, _ = torch.max(saliency, dim=1)
        saliency = saliency.squeeze().cpu().numpy()
        
        # Normalize to [0, 1]
        saliency = (saliency - saliency.min()) / (saliency.max() - saliency.min() + 1e-8)
        
        return saliency
        
    def generate(
        self,
        input_data: Union[torch.Tensor, np.ndarray],
        target_class: int
    ) -> np.ndarray:
        """
        Generate saliency map (framework-agnostic interface)
        
        Args:
            input_data: Input tensor or numpy array
            target_class: Target class index
            
        Returns:
            Saliency map as numpy array [H, W] normalized to [0, 1]
        """
        if self.framework == 'pytorch':
            if isinstance(input_data, np.ndarray):
                input_data = torch.from_numpy(input_data).float()
            return self.generate_saliency_pytorch(input_data, target_class)
        else:
            raise NotImplementedError(f"Framework {self.framework} not yet implemented")


def serialize_heatmap(heatmap: np.ndarray, original_image_shape: Tuple[int, int]) -> dict:
    """
    Serialize heatmap for JSON transmission
    
    Args:
        heatmap: Heatmap array [H, W] normalized to [0, 1]
        original_image_shape: Original image (H, W)
        
    Returns:
        Dictionary with serialized heatmap data
    """
    # Resize to original image size if needed
    if heatmap.shape != original_image_shape:
        import cv2
        heatmap = cv2.resize(heatmap, (original_image_shape[1], original_image_shape[0]))
        
    return {
        'data': heatmap.tolist(),  # Convert to nested list for JSON
        'shape': list(heatmap.shape),
        'min': float(np.min(heatmap)),
        'max': float(np.max(heatmap)),
        'mean': float(np.mean(heatmap))
    }
