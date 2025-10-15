"""
Base Extractor - Abstract base class for model extraction

Defines the interface that all framework-specific extractors must implement.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BaseExtractor(ABC):
    """
    Abstract base class for neural network model extractors.
    
    All framework-specific extractors (PyTorch, Keras, ONNX) should inherit
    from this class and implement the required methods.
    """
    
    def __init__(
        self, 
        model: Any, 
        input_shape: Optional[Tuple] = None,
        model_name: Optional[str] = None,
        extract_weights: bool = True,
        extract_detailed_params: bool = True
    ):
        """
        Initialize the base extractor.
        
        Args:
            model: The neural network model to extract
            input_shape: Expected input shape (batch_size, channels, height, width)
            model_name: Custom name for the model
            extract_weights: Whether to extract weight tensors (may be large)
            extract_detailed_params: Whether to extract detailed layer parameters
        """
        self.model = model
        self.input_shape = input_shape
        self.model_name = model_name or self._infer_model_name()
        self.extract_weights = extract_weights
        self.extract_detailed_params = extract_detailed_params
        
        self.layers_data = []
        self.connections_data = []
        self.metadata = {}
        
        logger.info(f"Initialized {self.__class__.__name__} for model: {self.model_name}")
    
    @abstractmethod
    def extract(self) -> Dict[str, Any]:
        """
        Main extraction method. Must be implemented by subclasses.
        
        Returns:
            Dictionary containing:
                - metadata: Model-level information
                - layers: List of layer dictionaries
                - connections: List of connection dictionaries
        """
        pass
    
    @abstractmethod
    def extract_layers(self) -> List[Dict[str, Any]]:
        """
        Extract detailed information about each layer.
        
        Returns:
            List of dictionaries, each containing:
                - id: Unique layer identifier
                - name: Layer name
                - type: Layer type (Conv2d, Dense, etc.)
                - input_shape: Input tensor shape
                - output_shape: Output tensor shape
                - parameters: Layer-specific parameters
                - weights: Weight information (if extract_weights=True)
                - activation: Activation function name
        """
        pass
    
    @abstractmethod
    def extract_connections(self) -> List[Dict[str, Any]]:
        """
        Extract connection topology between layers.
        
        Returns:
            List of dictionaries, each containing:
                - from_layer: Source layer ID
                - to_layer: Target layer ID
                - connection_type: Type of connection (sequential, skip, branch)
                - data_flow: Direction of data flow
        """
        pass
    
    @abstractmethod
    def extract_metadata(self) -> Dict[str, Any]:
        """
        Extract model-level metadata.
        
        Returns:
            Dictionary containing:
                - model_name: Name of the model
                - framework: Framework used (pytorch, keras, onnx)
                - version: Framework version
                - total_layers: Number of layers
                - total_parameters: Total trainable parameters
                - input_shape: Model input shape
                - output_shape: Model output shape
                - timestamp: Extraction timestamp
        """
        pass
    
    def _infer_model_name(self) -> str:
        """
        Attempt to infer the model name from the model object.
        
        Returns:
            Inferred model name or 'UnknownModel'
        """
        if hasattr(self.model, '__class__'):
            return self.model.__class__.__name__
        return "UnknownModel"
    
    def _count_parameters(self) -> int:
        """
        Count total trainable parameters in the model.
        Must be implemented by subclasses for accurate counting.
        
        Returns:
            Total number of parameters
        """
        return 0
    
    def validate_extraction(self) -> Tuple[bool, List[str]]:
        """
        Validate the extracted data for completeness and consistency.
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Check if extraction has been performed
        if not self.layers_data:
            errors.append("No layers extracted. Call extract() first.")
        
        # Check metadata
        if not self.metadata:
            errors.append("No metadata extracted.")
        
        # Validate layer IDs are unique
        if self.layers_data:
            layer_ids = [layer.get('id') for layer in self.layers_data]
            if len(layer_ids) != len(set(layer_ids)):
                errors.append("Duplicate layer IDs found.")
        
        # Validate connections reference existing layers
        if self.layers_data and self.connections_data:
            valid_ids = set(layer.get('id') for layer in self.layers_data)
            for conn in self.connections_data:
                if conn.get('from_layer') not in valid_ids:
                    errors.append(f"Connection references non-existent layer: {conn.get('from_layer')}")
                if conn.get('to_layer') not in valid_ids:
                    errors.append(f"Connection references non-existent layer: {conn.get('to_layer')}")
        
        is_valid = len(errors) == 0
        
        if is_valid:
            logger.info("✓ Extraction validation passed")
        else:
            logger.error(f"✗ Extraction validation failed with {len(errors)} errors")
            for error in errors:
                logger.error(f"  - {error}")
        
        return is_valid, errors
    
    def get_layer_by_id(self, layer_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve layer data by ID.
        
        Args:
            layer_id: Layer identifier
            
        Returns:
            Layer dictionary or None if not found
        """
        for layer in self.layers_data:
            if layer.get('id') == layer_id:
                return layer
        return None
    
    def get_layer_by_name(self, layer_name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve layer data by name.
        
        Args:
            layer_name: Layer name
            
        Returns:
            Layer dictionary or None if not found
        """
        for layer in self.layers_data:
            if layer.get('name') == layer_name:
                return layer
        return None
    
    def get_connections_for_layer(self, layer_id: str) -> Dict[str, List[Dict]]:
        """
        Get all incoming and outgoing connections for a layer.
        
        Args:
            layer_id: Layer identifier
            
        Returns:
            Dictionary with 'incoming' and 'outgoing' connection lists
        """
        incoming = []
        outgoing = []
        
        for conn in self.connections_data:
            if conn.get('to_layer') == layer_id:
                incoming.append(conn)
            if conn.get('from_layer') == layer_id:
                outgoing.append(conn)
        
        return {
            'incoming': incoming,
            'outgoing': outgoing
        }
    
    def print_summary(self) -> None:
        """
        Print a human-readable summary of the extracted model.
        """
        print("\n" + "="*70)
        print(f"MODEL EXTRACTION SUMMARY: {self.model_name}")
        print("="*70)
        
        if self.metadata:
            print(f"\nFramework: {self.metadata.get('framework', 'N/A')}")
            print(f"Total Layers: {self.metadata.get('total_layers', 0)}")
            print(f"Total Parameters: {self.metadata.get('total_parameters', 0):,}")
            print(f"Input Shape: {self.metadata.get('input_shape', 'N/A')}")
            print(f"Output Shape: {self.metadata.get('output_shape', 'N/A')}")
        
        if self.layers_data:
            print(f"\nLAYERS ({len(self.layers_data)}):")
            print("-" * 70)
            for i, layer in enumerate(self.layers_data[:10]):  # Show first 10
                print(f"{i+1:3d}. {layer.get('name', 'unnamed'):20s} "
                      f"{layer.get('type', 'unknown'):15s} "
                      f"{str(layer.get('output_shape', '')):30s}")
            if len(self.layers_data) > 10:
                print(f"     ... and {len(self.layers_data) - 10} more layers")
        
        if self.connections_data:
            print(f"\nCONNECTIONS: {len(self.connections_data)} total")
        
        print("="*70 + "\n")
    
    def _format_shape(self, shape: Any) -> str:
        """
        Format shape tuple/list as string.
        
        Args:
            shape: Shape tuple or list
            
        Returns:
            Formatted shape string
        """
        if isinstance(shape, (list, tuple)):
            return f"[{', '.join(map(str, shape))}]"
        return str(shape)
