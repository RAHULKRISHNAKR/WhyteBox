"""
Keras/TensorFlow Model Extractor

Extracts layer information, connections, and weights from Keras/TensorFlow models.
"""

import tensorflow as tf
from tensorflow import keras
from typing import Dict, List, Any, Optional, Tuple
import logging
from datetime import datetime
import numpy as np

from extractors.base_extractor import BaseExtractor

logger = logging.getLogger(__name__)


class KerasExtractor(BaseExtractor):
    """
    Extractor for Keras/TensorFlow models.
    
    Supports:
    - Sequential models
    - Functional API models
    - Subclassed models (limited support)
    - keras.applications models
    """
    
    def __init__(
        self,
        model: keras.Model,
        input_shape: Optional[Tuple] = None,
        model_name: Optional[str] = None,
        extract_weights: bool = True,
        extract_detailed_params: bool = True
    ):
        """
        Initialize Keras extractor.
        
        Args:
            model: Keras Model instance
            input_shape: Input tensor shape (e.g., (1, 224, 224, 3))
            model_name: Custom model name
            extract_weights: Whether to extract weight tensors
            extract_detailed_params: Extract detailed parameters
        """
        super().__init__(model, input_shape, model_name, extract_weights, extract_detailed_params)
        
        # Infer input shape from model if not provided
        if input_shape is None and hasattr(model, 'input_shape'):
            self.input_shape = model.input_shape
        elif input_shape is None:
            self.input_shape = (1, 224, 224, 3)  # Default
            logger.warning(f"No input_shape provided. Using default: {self.input_shape}")
    
    def extract(self) -> Dict[str, Any]:
        """
        Extract complete model information.
        
        Returns:
            Dictionary with metadata, layers, and connections
        """
        logger.info(f"Starting extraction of Keras model: {self.model_name}")
        
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
        
        # Get input and output shapes
        input_shape = self.model.input_shape
        output_shape = self.model.output_shape
        
        # Handle multiple inputs/outputs
        if isinstance(input_shape, list):
            input_shape = [list(s) if s is not None else None for s in input_shape]
        else:
            input_shape = list(input_shape) if input_shape is not None else []
        
        if isinstance(output_shape, list):
            output_shape = [list(s) if s is not None else None for s in output_shape]
        else:
            output_shape = list(output_shape) if output_shape is not None else []
        
        metadata = {
            'model_name': self.model_name or self.model.name,
            'framework': 'keras',
            'framework_version': tf.__version__,
            'version': '1.0.0',
            'total_layers': len(self.model.layers),
            'total_parameters': total_params,
            'trainable_parameters': sum([tf.size(w).numpy() for w in self.model.trainable_weights]),
            'input_shape': input_shape,
            'output_shape': output_shape,
            'timestamp': datetime.now().isoformat(),
            'extractor': 'KerasExtractor'
        }
        
        return metadata
    
    def extract_layers(self) -> List[Dict[str, Any]]:
        """Extract detailed layer information."""
        layers = []
        
        for idx, layer in enumerate(self.model.layers):
            layer_info = self._extract_layer_info(layer, idx)
            if layer_info:
                layers.append(layer_info)
        
        return layers
    
    def _extract_layer_info(self, layer: keras.layers.Layer, index: int) -> Dict[str, Any]:
        """Extract information for a single layer."""
        layer_type = layer.__class__.__name__
        
        # Get input/output shapes
        input_shape = layer.input_shape
        output_shape = layer.output_shape
        
        # Handle multiple inputs/outputs
        if isinstance(input_shape, list):
            input_shape = [list(s) if s is not None else None for s in input_shape]
        else:
            input_shape = list(input_shape) if input_shape is not None else None
        
        if isinstance(output_shape, list):
            output_shape = [list(s) if s is not None else None for s in output_shape]
        else:
            output_shape = list(output_shape) if output_shape is not None else None
        
        layer_info = {
            'id': f'layer_{index}',
            'name': layer.name,
            'type': layer_type,
            'index': index,
            'input_shape': input_shape,
            'output_shape': output_shape,
            'parameters': self._extract_layer_parameters(layer),
            'activation': self._get_activation_function(layer),
            'trainable': layer.trainable
        }
        
        # Extract weights if requested
        if self.extract_weights and layer.weights:
            layer_info['weights'] = self._extract_weights(layer)
        
        return layer_info
    
    def _extract_layer_parameters(self, layer: keras.layers.Layer) -> Dict[str, Any]:
        """Extract layer-specific parameters."""
        params = {}
        config = layer.get_config()
        
        # Convolutional layers
        if isinstance(layer, (keras.layers.Conv1D, keras.layers.Conv2D, keras.layers.Conv3D)):
            params.update({
                'filters': config.get('filters'),
                'kernel_size': config.get('kernel_size'),
                'strides': config.get('strides'),
                'padding': config.get('padding'),
                'dilation_rate': config.get('dilation_rate'),
                'groups': config.get('groups', 1),
                'use_bias': config.get('use_bias')
            })
        
        # Pooling layers
        elif isinstance(layer, (keras.layers.MaxPooling1D, keras.layers.MaxPooling2D, keras.layers.MaxPooling3D,
                                keras.layers.AveragePooling1D, keras.layers.AveragePooling2D, keras.layers.AveragePooling3D)):
            params.update({
                'pool_size': config.get('pool_size'),
                'strides': config.get('strides'),
                'padding': config.get('padding')
            })
        
        # Dense layers
        elif isinstance(layer, keras.layers.Dense):
            params.update({
                'units': config.get('units'),
                'use_bias': config.get('use_bias')
            })
        
        # Batch Normalization
        elif isinstance(layer, keras.layers.BatchNormalization):
            params.update({
                'axis': config.get('axis'),
                'momentum': config.get('momentum'),
                'epsilon': config.get('epsilon'),
                'center': config.get('center'),
                'scale': config.get('scale')
            })
        
        # Dropout
        elif isinstance(layer, keras.layers.Dropout):
            params.update({
                'rate': config.get('rate')
            })
        
        # Flatten, Reshape
        elif isinstance(layer, keras.layers.Reshape):
            params.update({
                'target_shape': config.get('target_shape')
            })
        
        # Add more layer types as needed
        
        return params
    
    def _extract_weights(self, layer: keras.layers.Layer) -> Dict[str, Any]:
        """Extract weight tensors from a layer."""
        weights_info = {
            'total_params': sum(tf.size(w).numpy() for w in layer.weights)
        }
        
        for weight in layer.weights:
            weight_name = weight.name.split('/')[-1].replace(':0', '')
            weights_info[weight_name] = {
                'shape': weight.shape.as_list(),
                'dtype': str(weight.dtype.name)
            }
            
            # Optionally include actual weight data (can be large!)
            if self.extract_detailed_params and weight.numpy().size < 10000:
                weights_info[weight_name]['data'] = weight.numpy().tolist()
        
        return weights_info
    
    def _get_activation_function(self, layer: keras.layers.Layer) -> Optional[str]:
        """Determine activation function for a layer."""
        # Check if layer has activation attribute
        if hasattr(layer, 'activation') and layer.activation is not None:
            if hasattr(layer.activation, '__name__'):
                return layer.activation.__name__
            else:
                return str(layer.activation).split()[1]
        
        # Check if layer itself is an activation
        activation_layers = {
            keras.layers.ReLU: 'relu',
            keras.layers.LeakyReLU: 'leaky_relu',
            keras.layers.PReLU: 'prelu',
            keras.layers.ELU: 'elu',
            keras.layers.Activation: 'activation'
        }
        
        for act_class, act_name in activation_layers.items():
            if isinstance(layer, act_class):
                if hasattr(layer, 'activation'):
                    return layer.activation.__name__ if hasattr(layer.activation, '__name__') else act_name
                return act_name
        
        return None
    
    def extract_connections(self) -> List[Dict[str, Any]]:
        """Extract connections between layers."""
        connections = []
        
        # Build a mapping of layer names to indices
        layer_name_to_idx = {layer.name: idx for idx, layer in enumerate(self.model.layers)}
        
        # Extract connections from layer inbound nodes
        for idx, layer in enumerate(self.model.layers):
            # Get inbound nodes (layers that feed into this layer)
            if hasattr(layer, '_inbound_nodes'):
                for node in layer._inbound_nodes:
                    if hasattr(node, 'inbound_layers'):
                        for inbound_layer in node.inbound_layers:
                            if inbound_layer.name in layer_name_to_idx:
                                from_idx = layer_name_to_idx[inbound_layer.name]
                                connections.append({
                                    'from_layer': f'layer_{from_idx}',
                                    'to_layer': f'layer_{idx}',
                                    'connection_type': self._infer_connection_type(inbound_layer, layer),
                                    'data_flow': 'forward'
                                })
        
        # If no connections found (e.g., Sequential model), create sequential connections
        if not connections and len(self.model.layers) > 1:
            for i in range(len(self.model.layers) - 1):
                connections.append({
                    'from_layer': f'layer_{i}',
                    'to_layer': f'layer_{i+1}',
                    'connection_type': 'sequential',
                    'data_flow': 'forward'
                })
        
        return connections
    
    def _infer_connection_type(
        self, 
        from_layer: keras.layers.Layer, 
        to_layer: keras.layers.Layer
    ) -> str:
        """Infer the type of connection between two layers."""
        # Check if it's a merge/concatenation layer
        if isinstance(to_layer, (keras.layers.Add, keras.layers.Concatenate, 
                                 keras.layers.Subtract, keras.layers.Multiply)):
            return 'merge'
        
        # Check for skip connections (simplified heuristic)
        # This would require more sophisticated analysis for accurate detection
        return 'sequential'
    
    def _count_parameters(self) -> int:
        """Count total parameters."""
        return self.model.count_params()


# Utility function for quick extraction
def extract_keras_model(
    model: keras.Model,
    model_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Quick utility to extract Keras model.
    
    Args:
        model: Keras model
        model_name: Optional model name
        
    Returns:
        Extraction dictionary
    """
    extractor = KerasExtractor(model, model_name=model_name)
    return extractor.extract()
