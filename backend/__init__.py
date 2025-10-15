"""
WhyteBox Backend - Neural Network Model Converter Package

This package provides tools for converting neural networks from various
frameworks (PyTorch, TensorFlow/Keras, ONNX) into structured formats
optimized for 3D visualization.
"""

__version__ = "1.0.0"
__author__ = "WhyteBox Team"
__license__ = "MIT"

from extractors.base_extractor import BaseExtractor
from extractors.pytorch_extractor import PyTorchExtractor
from extractors.keras_extractor import KerasExtractor
from extractors.onnx_extractor import ONNXExtractor

from converters.universal_converter import UniversalConverter
from converters.tensorspace_converter import TensorSpaceConverter
from converters.babylon_converter import BabylonConverter

from validators.schema_validator import SchemaValidator
from validators.topology_validator import TopologyValidator

__all__ = [
    # Extractors
    'BaseExtractor',
    'PyTorchExtractor',
    'KerasExtractor',
    'ONNXExtractor',
    
    # Converters
    'UniversalConverter',
    'TensorSpaceConverter',
    'BabylonConverter',
    
    # Validators
    'SchemaValidator',
    'TopologyValidator',
]
