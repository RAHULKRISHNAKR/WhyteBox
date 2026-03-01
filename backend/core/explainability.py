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


class GuidedBackpropGenerator:
    """
    Guided Backpropagation
    
    Modifies the standard backpropagation to only allow positive gradients
    to flow through ReLU units where the activation is also positive.
    Produces sharper, more fine-grained attribution maps than vanilla saliency.
    """

    def __init__(self, model, framework='pytorch'):
        self.model = model
        self.framework = framework.lower()
        self._hooks = []

    def _register_guided_relu_hooks(self):
        """Patch ReLU layers so only positive gradients through positive activations pass."""
        def guided_relu_backward(module, grad_input, grad_output):
            # Must return a new tensor, not a view or modified version
            # Use detach() and clone() to ensure we create a completely new tensor
            if grad_input[0] is not None:
                grad = grad_input[0].detach().clone()
                grad = grad.clamp(min=0.0)
                return (grad,)
            return grad_input

        for module in self.model.modules():
            if isinstance(module, torch.nn.ReLU):
                handle = module.register_full_backward_hook(guided_relu_backward)
                self._hooks.append(handle)

    def _remove_hooks(self):
        for h in self._hooks:
            h.remove()
        self._hooks.clear()

    def generate_guided_backprop_pytorch(
        self,
        input_tensor: torch.Tensor,
        target_class: int
    ) -> np.ndarray:
        """
        Generate guided-backprop attribution for PyTorch model.

        Returns:
            Attribution map [H, W] normalized to [0, 1]
        """
        self.model.eval()
        self._register_guided_relu_hooks()

        try:
            inp = input_tensor.clone().requires_grad_(True)
            output = self.model(inp)

            # Handle tuple outputs (GoogLeNet, InceptionV3)
            if isinstance(output, (tuple, list)):
                output = output[0]

            self.model.zero_grad()
            output[0, target_class].backward()

            # Gradient with respect to input image
            attribution = inp.grad.data.abs()          # [1, C, H, W]
            attribution, _ = torch.max(attribution, dim=1)  # max over channels
            attribution = attribution.squeeze().cpu().numpy()
            attribution = (attribution - attribution.min()) / (attribution.max() - attribution.min() + 1e-8)

            return attribution

        finally:
            self._remove_hooks()

    def generate(
        self,
        input_data: Union[torch.Tensor, np.ndarray],
        target_class: int
    ) -> np.ndarray:
        """Generate guided backprop (framework-agnostic interface)."""
        if self.framework == 'pytorch':
            if isinstance(input_data, np.ndarray):
                input_data = torch.from_numpy(input_data).float()
            return self.generate_guided_backprop_pytorch(input_data, target_class)
        else:
            raise NotImplementedError(f"Framework {self.framework} not yet implemented")

class IntegratedGradientsGenerator:
    """
    Integrated Gradients
    
    Computes attribution by integrating gradients along a path from a baseline
    (typically all zeros) to the actual input. This method satisfies important
    axioms like sensitivity and implementation invariance, making it more robust
    than simple gradient-based methods.
    
    Reference: Sundararajan et al. "Axiomatic Attribution for Deep Networks" (2017)
    """
    
    def __init__(self, model, framework='pytorch'):
        """
        Initialize Integrated Gradients generator
        
        Args:
            model: Neural network model
            framework: 'pytorch' or 'keras'
        """
        self.model = model
        self.framework = framework.lower()
        
    def generate_integrated_gradients_pytorch(
        self,
        input_tensor: torch.Tensor,
        target_class: int,
        baseline: Optional[torch.Tensor] = None,
        steps: int = 50
    ) -> np.ndarray:
        """
        Generate Integrated Gradients attribution for PyTorch model
        
        Args:
            input_tensor: Input image tensor [1, C, H, W]
            target_class: Target class index
            baseline: Baseline tensor (default: zeros)
            steps: Number of interpolation steps (default: 50)
            
        Returns:
            Attribution map as numpy array [H, W] normalized to [0, 1]
        """
        self.model.eval()
        
        # Create baseline (all zeros if not provided)
        if baseline is None:
            baseline = torch.zeros_like(input_tensor)
            
        # Generate interpolated inputs between baseline and actual input
        # alphas shape: [steps]
        alphas = torch.linspace(0, 1, steps + 1, device=input_tensor.device)
        
        # Compute gradients at each interpolated input
        gradients = []
        
        for alpha in alphas:
            # Interpolated input: baseline + alpha * (input - baseline)
            interpolated = baseline + alpha * (input_tensor - baseline)
            interpolated.requires_grad = True
            
            # Forward pass
            output = self.model(interpolated)
            
            # Handle tuple outputs (GoogLeNet, InceptionV3)
            if isinstance(output, (tuple, list)):
                output = output[0]
                
            # Backward pass for target class
            self.model.zero_grad()
            target_score = output[0, target_class]
            target_score.backward()
            
            # Store gradient
            gradients.append(interpolated.grad.detach().clone())
            
        # Stack gradients: [steps+1, 1, C, H, W]
        gradients = torch.stack(gradients)
        
        # Average gradients (trapezoidal rule approximation)
        avg_gradients = torch.mean(gradients, dim=0)
        
        # Integrated gradients = (input - baseline) * avg_gradients
        integrated_grads = (input_tensor - baseline) * avg_gradients
        
        # Take absolute value and max across color channels
        attribution = integrated_grads.abs()
        attribution, _ = torch.max(attribution, dim=1)
        attribution = attribution.squeeze().cpu().numpy()
        
        # Normalize to [0, 1]
        attribution = (attribution - attribution.min()) / (attribution.max() - attribution.min() + 1e-8)
        
        return attribution
        
    def generate(
        self,
        input_data: Union[torch.Tensor, np.ndarray],
        target_class: int,
        baseline: Optional[Union[torch.Tensor, np.ndarray]] = None,
        steps: int = 50
    ) -> np.ndarray:
        """
        Generate Integrated Gradients (framework-agnostic interface)
        
        Args:
            input_data: Input tensor or numpy array
            target_class: Target class index
            baseline: Baseline tensor or numpy array (optional)
            steps: Number of interpolation steps (default: 50)
            
        Returns:
            Attribution map as numpy array [H, W] normalized to [0, 1]
        """
        if self.framework == 'pytorch':
            if isinstance(input_data, np.ndarray):
                input_data = torch.from_numpy(input_data).float()
            if baseline is not None and isinstance(baseline, np.ndarray):
                baseline = torch.from_numpy(baseline).float()
            return self.generate_integrated_gradients_pytorch(
                input_data, target_class, baseline, steps
            )
        else:
            raise NotImplementedError(f"Framework {self.framework} not yet implemented")

