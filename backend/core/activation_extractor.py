"""
Activation Extractor - Extract layer activations during inference

Supports both PyTorch and TensorFlow/Keras models.
"""

import numpy as np
import base64
from io import BytesIO
from typing import Dict, List, Any, Tuple
import logging

logger = logging.getLogger(__name__)


class ActivationExtractor:
    """Extract activations from neural network layers during inference."""
    
    def __init__(self, model, framework='pytorch'):
        """
        Initialize activation extractor.
        
        Args:
            model: Neural network model (PyTorch or Keras)
            framework: 'pytorch' or 'keras'
        """
        self.model = model
        self.framework = framework.lower()
        self.activations = {}
        self.hooks = []
        
    def register_hooks(self, layer_names=None):
        """
        Register forward hooks to capture activations.
        
        Args:
            layer_names: List of layer names to capture (None = all layers)
        """
        if self.framework == 'pytorch':
            self._register_pytorch_hooks(layer_names)
        elif self.framework == 'keras':
            self._register_keras_hooks(layer_names)
        else:
            raise ValueError(f"Unsupported framework: {self.framework}")
    
    def _register_pytorch_hooks(self, layer_names=None):
        """Register PyTorch forward hooks."""
        import torch
        
        def get_activation(name):
            def hook(model, input, output):
                # Detach and move to CPU to save memory
                self.activations[name] = output.detach().cpu().numpy()
            return hook
        
        # Register hooks on named modules
        for name, module in self.model.named_modules():
            # Skip containers
            if len(list(module.children())) > 0:
                continue
            
            # Only hook if layer_names is None or name is in list
            if layer_names is None or name in layer_names:
                hook = module.register_forward_hook(get_activation(name))
                self.hooks.append(hook)
                logger.debug(f"Registered hook on: {name}")
    
    def _register_keras_hooks(self, layer_names=None):
        """
        For Keras, we don't use hooks but create intermediate models.
        Store layer names for later extraction.
        """
        if layer_names is None:
            self.target_layers = [layer.name for layer in self.model.layers]
        else:
            self.target_layers = layer_names
        
        logger.debug(f"Will extract activations for {len(self.target_layers)} Keras layers")
    
    def extract_activations(self, input_data):
        """
        Run forward pass and extract activations.
        
        Args:
            input_data: Input tensor/array
            
        Returns:
            Dict mapping layer names to activations
        """
        self.activations.clear()
        
        if self.framework == 'pytorch':
            return self._extract_pytorch_activations(input_data)
        elif self.framework == 'keras':
            return self._extract_keras_activations(input_data)
    
    def _extract_pytorch_activations(self, input_data):
        """Extract activations from PyTorch model."""
        import torch
        
        # Ensure input is a tensor
        if not isinstance(input_data, torch.Tensor):
            input_data = torch.from_numpy(input_data).float()
        
        # Forward pass (hooks will capture activations)
        with torch.no_grad():
            _ = self.model(input_data)
        
        return self.activations
    
    def _extract_keras_activations(self, input_data):
        """Extract activations from Keras model using intermediate models."""
        from tensorflow import keras
        import tensorflow as tf
        
        # Ensure input is correct format
        if not isinstance(input_data, (tf.Tensor, np.ndarray)):
            raise ValueError("Input must be tf.Tensor or numpy array")
        
        # Create intermediate models for each layer
        for layer_name in self.target_layers:
            try:
                layer = self.model.get_layer(layer_name)
                intermediate_model = keras.Model(
                    inputs=self.model.input,
                    outputs=layer.output
                )
                
                # Get activation
                activation = intermediate_model.predict(input_data, verbose=0)
                self.activations[layer_name] = activation
                
            except Exception as e:
                logger.warning(f"Could not extract activation for layer {layer_name}: {e}")
        
        return self.activations
    
    def clear_hooks(self):
        """Remove all registered hooks."""
        if self.framework == 'pytorch':
            for hook in self.hooks:
                hook.remove()
            self.hooks.clear()
        
        self.activations.clear()
    
    def serialize_activation(self, activation, max_features=64):
        """
        Serialize activation for JSON transmission.
        
        Args:
            activation: Numpy array of activations
            max_features: Maximum number of feature maps to include
            
        Returns:
            Dict with serialized activation data
        """
        # Get original shape
        original_shape = activation.shape
        
        # For convolutional layers: (batch, channels, height, width) or (batch, height, width, channels)
        # Limit number of channels/features
        if len(original_shape) == 4:
            # Assume batch=1 for inference
            if original_shape[1] < original_shape[-1]:
                # PyTorch format: (1, C, H, W)
                num_channels = original_shape[1]
                if num_channels > max_features:
                    activation = activation[:, :max_features, :, :]
            else:
                # TensorFlow format: (1, H, W, C)
                num_channels = original_shape[3]
                if num_channels > max_features:
                    activation = activation[:, :, :, :max_features]
        
        # Calculate statistics
        stats = {
            'min': float(np.min(activation)),
            'max': float(np.max(activation)),
            'mean': float(np.mean(activation)),
            'std': float(np.std(activation))
        }
        
        # For small activations, send directly
        if activation.size < 1000:
            return {
                'shape': list(original_shape),
                'data': activation.tolist(),
                'stats': stats,
                'encoding': 'direct'
            }
        
        # For larger activations, use base64 encoding
        buffer = BytesIO()
        np.save(buffer, activation.astype(np.float16))  # Use float16 to save space
        buffer.seek(0)
        encoded = base64.b64encode(buffer.read()).decode('utf-8')
        
        return {
            'shape': list(original_shape),
            'data': encoded,
            'stats': stats,
            'encoding': 'base64_npy_float16'
        }
    
    def get_serialized_activations(self, max_features=64, selected_layers=None):
        """
        Get all activations in serialized format.
        
        Args:
            max_features: Max features per layer
            selected_layers: List of layer names to include (None = all)
            
        Returns:
            Dict mapping layer names to serialized activations
        """
        result = {}
        
        for layer_name, activation in self.activations.items():
            # Skip if not in selected layers
            if selected_layers and layer_name not in selected_layers:
                continue
            
            try:
                result[layer_name] = self.serialize_activation(activation, max_features)
            except Exception as e:
                logger.warning(f"Failed to serialize activation for {layer_name}: {e}")
        
        return result


def deserialize_activation(serialized_data):
    """
    Deserialize activation data from JSON.
    
    Args:
        serialized_data: Dict with serialized activation
        
    Returns:
        Numpy array
    """
    encoding = serialized_data.get('encoding', 'direct')
    
    if encoding == 'direct':
        return np.array(serialized_data['data'])
    elif encoding == 'base64_npy_float16':
        decoded = base64.b64decode(serialized_data['data'])
        buffer = BytesIO(decoded)
        return np.load(buffer).astype(np.float32)
    else:
        raise ValueError(f"Unknown encoding: {encoding}")
