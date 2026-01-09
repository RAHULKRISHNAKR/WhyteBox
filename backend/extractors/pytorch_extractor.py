"""
PyTorch Model Extractor

Extracts layer information, connections, and weights from PyTorch models.
"""

import torch
import torch.nn as nn
from typing import Dict, List, Any, Optional, Tuple
import logging
from datetime import datetime
import base64
import io
import numpy as np

from extractors.base_extractor import BaseExtractor

logger = logging.getLogger(__name__)


class PyTorchExtractor(BaseExtractor):
    """
    Extractor for PyTorch models (torch.nn.Module).
    
    Supports:
    - Sequential models
    - Custom nn.Module models
    - torchvision models
    - Models with skip connections (ResNet-style)
    """
    
    def __init__(
        self,
        model: nn.Module,
        input_shape: Optional[Tuple] = None,
        model_name: Optional[str] = None,
        extract_weights: bool = True,
        extract_detailed_params: bool = True,
        device: str = 'cpu'
    ):
        """
        Initialize PyTorch extractor.
        
        Args:
            model: PyTorch nn.Module
            input_shape: Input tensor shape (e.g., (1, 3, 224, 224))
            model_name: Custom model name
            extract_weights: Whether to extract weight tensors
            extract_detailed_params: Extract detailed parameters
            device: Device to use ('cpu' or 'cuda')
        """
        super().__init__(model, input_shape, model_name, extract_weights, extract_detailed_params)
        self.device = device
        self.model.to(device)
        self.model.eval()
        
        # Default input shape for vision models
        if input_shape is None:
            self.input_shape = (1, 3, 224, 224)
            logger.warning(f"No input_shape provided. Using default: {self.input_shape}")
    
    def extract(self) -> Dict[str, Any]:
        """
        Extract complete model information.
        
        Returns:
            Dictionary with metadata, layers, and connections
        """
        logger.info(f"Starting extraction of PyTorch model: {self.model_name}")
        
        try:
            # Extract in order
            self.metadata = self.extract_metadata()
            self.layers_data = self.extract_layers()
            self.connections_data = self.extract_connections()
            
            # Validate extraction
            is_valid, errors = self.validate_extraction()
            if not is_valid:
                logger.error("Extraction validation failed!")
                raise ValueError(f"Extraction errors: {errors}")
            
            result = {
                'metadata': self.metadata,
                'layers': self.layers_data,
                'connections': self.connections_data
            }
            
            logger.info(f"✓ Successfully extracted {len(self.layers_data)} layers and {len(self.connections_data)} connections")
            
            return result
            
        except Exception as e:
            logger.error(f"✗ Extraction failed: {str(e)}")
            raise
    
    def extract_metadata(self) -> Dict[str, Any]:
        """Extract model-level metadata."""
        total_params = self._count_parameters()
        
        # Infer output shape by running dummy forward pass
        output_shape = self._infer_output_shape()
        
        metadata = {
            'model_name': self.model_name,
            'framework': 'pytorch',
            'framework_version': torch.__version__,
            'version': '1.0.0',
            'total_layers': len(list(self.model.modules())) - 1,  # Exclude root module
            'total_parameters': total_params,
            'trainable_parameters': total_params,  # Simplified
            'input_shape': list(self.input_shape),
            'output_shape': output_shape,
            'device': self.device,
            'timestamp': datetime.now().isoformat(),
            'extractor': 'PyTorchExtractor'
        }
        
        return metadata
    
    def extract_layers(self) -> List[Dict[str, Any]]:
        """Extract detailed layer information using forward hooks."""
        layers = []
        layer_outputs = {}
        
        # Register forward hooks to capture layer outputs
        hooks = []
        def create_hook(name):
            def hook(module, input, output):
                layer_outputs[name] = {
                    'input': input[0] if isinstance(input, tuple) else input,
                    'output': output
                }
            return hook
        
        # Register hooks for all leaf modules
        for name, module in self.model.named_modules():
            if len(list(module.children())) == 0 and name:  # Leaf modules only
                hooks.append(module.register_forward_hook(create_hook(name)))
        
        # Run forward pass to get shapes
        try:
            with torch.no_grad():
                dummy_input = torch.randn(*self.input_shape).to(self.device)
                _ = self.model(dummy_input)
        except Exception as e:
            logger.warning(f"Forward pass failed: {e}. Layer shapes may be incomplete.")
        
        for hook in hooks:
            hook.remove()
        
        # ADD SYNTHETIC INPUT LAYER (for educational visualization)
        input_layer = {
            'id': 'layer_input',
            'name': 'Input Image',
            'type': 'Input',
            'index': -1,
            'input_shape': list(self.input_shape),
            'output_shape': list(self.input_shape),
            'parameters': {
                'channels': self.input_shape[1] if len(self.input_shape) > 1 else 1,
                'height': self.input_shape[2] if len(self.input_shape) > 2 else 1,
                'width': self.input_shape[3] if len(self.input_shape) > 3 else 1
            },
            'trainable': False,
            'visualization': {'color': '#20E830', 'size_hint': 1.0}
        }
        layers.append(input_layer)
        
        # Extract layer information
        layer_idx = 0
        for name, module in self.model.named_modules():
            if len(list(module.children())) == 0 and name:  # Leaf modules only
                layer_info = self._extract_layer_info(name, module, layer_idx, layer_outputs.get(name))
                if layer_info:
                    layers.append(layer_info)
                    layer_idx += 1
        
        # ADD SYNTHETIC OUTPUT LAYER (for educational visualization)
        last_output_shape = layers[-1]['output_shape'] if layers else list(self.input_shape)
        output_layer = {
            'id': 'layer_output',
            'name': 'Predictions',
            'type': 'Output',
            'index': layer_idx,
            'input_shape': last_output_shape,
            'output_shape': last_output_shape,
            'parameters': {
                'num_classes': last_output_shape[-1] if last_output_shape else 1000,
                'top_k': 3
            },
            'trainable': False,
            'visualization': {'color': '#F96020', 'size_hint': 1.0}
        }
        layers.append(output_layer)
        
        logger.info(f"Extracted {len(layers)} layers (including Input/Output)")
        
        return layers
    
    def _extract_layer_info(
        self, 
        name: str, 
        module: nn.Module, 
        index: int,
        io_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Extract information for a single layer."""
        layer_type = module.__class__.__name__
        
        # Get input/output shapes from hook data
        input_shape = None
        output_shape = None
        if io_data:
            if io_data['input'] is not None:
                input_shape = list(io_data['input'].shape)
            if io_data['output'] is not None:
                output_shape = list(io_data['output'].shape)
        
        layer_info = {
            'id': f'layer_{index}',
            'name': name or f'layer_{index}',
            'type': layer_type,
            'index': index,
            'input_shape': input_shape,
            'output_shape': output_shape,
            'parameters': self._extract_layer_parameters(module, layer_type),
            'activation': self._get_activation_function(module),
            'trainable': any(p.requires_grad for p in module.parameters()) if list(module.parameters()) else False
        }
        
        # Extract weights if requested
        if self.extract_weights and list(module.parameters()):
            layer_info['weights'] = self._extract_weights(module)
        
        return layer_info
    
    def _extract_layer_parameters(self, module: nn.Module, layer_type: str) -> Dict[str, Any]:
        """Extract layer-specific parameters."""
        params = {}
        
        # Convolutional layers
        if isinstance(module, (nn.Conv1d, nn.Conv2d, nn.Conv3d)):
            params.update({
                'in_channels': module.in_channels,
                'out_channels': module.out_channels,
                'kernel_size': list(module.kernel_size) if isinstance(module.kernel_size, tuple) else [module.kernel_size],
                'stride': list(module.stride) if isinstance(module.stride, tuple) else [module.stride],
                'padding': list(module.padding) if isinstance(module.padding, tuple) else [module.padding],
                'dilation': list(module.dilation) if isinstance(module.dilation, tuple) else [module.dilation],
                'groups': module.groups,
                'has_bias': module.bias is not None
            })
        
        # Pooling layers
        elif isinstance(module, (nn.MaxPool1d, nn.MaxPool2d, nn.MaxPool3d, 
                                 nn.AvgPool1d, nn.AvgPool2d, nn.AvgPool3d)):
            params.update({
                'kernel_size': list(module.kernel_size) if isinstance(module.kernel_size, tuple) else [module.kernel_size],
                'stride': list(module.stride) if isinstance(module.stride, tuple) else [module.stride],
                'padding': list(module.padding) if isinstance(module.padding, tuple) else [module.padding]
            })
        
        # Linear/Dense layers
        elif isinstance(module, nn.Linear):
            params.update({
                'in_features': module.in_features,
                'out_features': module.out_features,
                'has_bias': module.bias is not None
            })
        
        # Batch Normalization
        elif isinstance(module, (nn.BatchNorm1d, nn.BatchNorm2d, nn.BatchNorm3d)):
            params.update({
                'num_features': module.num_features,
                'eps': module.eps,
                'momentum': module.momentum,
                'affine': module.affine,
                'track_running_stats': module.track_running_stats
            })
        
        # Dropout
        elif isinstance(module, (nn.Dropout, nn.Dropout2d, nn.Dropout3d)):
            params.update({
                'p': module.p,
                'inplace': module.inplace
            })
        
        # Activation functions
        elif isinstance(module, (nn.ReLU, nn.LeakyReLU, nn.PReLU, nn.ELU)):
            if hasattr(module, 'inplace'):
                params['inplace'] = module.inplace
            if isinstance(module, nn.LeakyReLU):
                params['negative_slope'] = module.negative_slope
        
        return params
    
    def _extract_weights(self, module: nn.Module) -> Dict[str, Any]:
        """Extract weight tensors from a layer."""
        weights_info = {
            'total_params': sum(p.numel() for p in module.parameters())
        }
        
        for name, param in module.named_parameters():
            weights_info[name] = {
                'shape': list(param.shape),
                'dtype': str(param.dtype),
                'requires_grad': param.requires_grad,
                'device': str(param.device)
            }
            
            # Optionally include actual weight data (can be large!)
            if self.extract_detailed_params and param.numel() < 10000:  # Only for small tensors
                weights_info[name]['data'] = param.detach().cpu().numpy().tolist()
        
        return weights_info
    
    def _get_activation_function(self, module: nn.Module) -> Optional[str]:
        """Determine activation function for a layer."""
        activation_map = {
            nn.ReLU: 'relu',
            nn.LeakyReLU: 'leaky_relu',
            nn.PReLU: 'prelu',
            nn.ELU: 'elu',
            nn.Sigmoid: 'sigmoid',
            nn.Tanh: 'tanh',
            nn.Softmax: 'softmax',
            nn.LogSoftmax: 'log_softmax',
            nn.GELU: 'gelu',
            nn.SiLU: 'silu'
        }
        
        for act_class, act_name in activation_map.items():
            if isinstance(module, act_class):
                return act_name
        
        return None
    
    def extract_connections(self) -> List[Dict[str, Any]]:
        """Extract connections between layers."""
        connections = []
        
        # Get layer count (excluding synthetic layers)
        actual_layers = [name for name, _ in self.model.named_modules() 
                        if len(list(self.model.get_submodule(name).children())) == 0 and name]
        
        # Connection from Input layer to first real layer
        connections.append({
            'from_layer': 'layer_input',
            'to_layer': 'layer_0',
            'connection_type': 'sequential',
            'data_flow': 'forward'
        })
        
        # Connections between actual model layers
        for i in range(len(actual_layers) - 1):
            connections.append({
                'from_layer': f'layer_{i}',
                'to_layer': f'layer_{i+1}',
                'connection_type': 'sequential',
                'data_flow': 'forward'
            })
        
        # Connection from last real layer to Output layer
        if actual_layers:
            connections.append({
                'from_layer': f'layer_{len(actual_layers) - 1}',
                'to_layer': 'layer_output',
                'connection_type': 'sequential',
                'data_flow': 'forward'
            })
        
        return connections
    
    def _count_parameters(self) -> int:
        """Count total trainable parameters."""
        return sum(p.numel() for p in self.model.parameters() if p.requires_grad)
    
    def _infer_output_shape(self) -> List[int]:
        """Infer output shape by running a forward pass."""
        try:
            with torch.no_grad():
                dummy_input = torch.randn(*self.input_shape).to(self.device)
                output = self.model(dummy_input)
                if isinstance(output, torch.Tensor):
                    return list(output.shape)
                elif isinstance(output, (tuple, list)):
                    return [list(o.shape) for o in output]
                else:
                    return []
        except Exception as e:
            logger.warning(f"Could not infer output shape: {e}")
            return []


# Utility function for quick extraction
def extract_pytorch_model(
    model: nn.Module,
    input_shape: Tuple = (1, 3, 224, 224),
    model_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Quick utility to extract PyTorch model.
    
    Args:
        model: PyTorch model
        input_shape: Input tensor shape
        model_name: Optional model name
        
    Returns:
        Extraction dictionary
    """
    extractor = PyTorchExtractor(model, input_shape, model_name)
    return extractor.extract()
