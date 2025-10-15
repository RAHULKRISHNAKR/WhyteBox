"""
Test Suite for Backend Extraction and Conversion

Run with: pytest tests/test_extraction.py -v
"""

import sys
from pathlib import Path
import pytest

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestBaseExtractor:
    """Test base extractor functionality."""
    
    def test_base_extractor_instantiation(self):
        """Test that base extractor cannot be instantiated directly."""
        from extractors.base_extractor import BaseExtractor
        
        # Should not be able to instantiate abstract class
        with pytest.raises(TypeError):
            extractor = BaseExtractor(None)


class TestPyTorchExtractor:
    """Test PyTorch extractor."""
    
    def test_pytorch_import(self):
        """Test PyTorch imports."""
        try:
            import torch
            import torchvision
            assert True
        except ImportError:
            pytest.skip("PyTorch not installed")
    
    def test_simple_model_extraction(self):
        """Test extraction of a simple PyTorch model."""
        try:
            import torch
            import torch.nn as nn
            from extractors.pytorch_extractor import PyTorchExtractor
            
            # Create simple model
            class SimpleModel(nn.Module):
                def __init__(self):
                    super().__init__()
                    self.conv1 = nn.Conv2d(3, 64, 3, padding=1)
                    self.relu = nn.ReLU()
                    self.pool = nn.MaxPool2d(2, 2)
                    self.fc = nn.Linear(64 * 112 * 112, 10)
                
                def forward(self, x):
                    x = self.conv1(x)
                    x = self.relu(x)
                    x = self.pool(x)
                    x = x.view(x.size(0), -1)
                    x = self.fc(x)
                    return x
            
            model = SimpleModel()
            
            # Extract
            extractor = PyTorchExtractor(
                model=model,
                input_shape=(1, 3, 224, 224),
                model_name="SimpleModel"
            )
            
            data = extractor.extract()
            
            # Assertions
            assert 'metadata' in data
            assert 'layers' in data
            assert 'connections' in data
            assert len(data['layers']) > 0
            assert data['metadata']['model_name'] == 'SimpleModel'
            
        except ImportError:
            pytest.skip("PyTorch not installed")


class TestKerasExtractor:
    """Test Keras extractor."""
    
    def test_keras_import(self):
        """Test Keras/TensorFlow imports."""
        try:
            import tensorflow as tf
            from tensorflow import keras
            assert True
        except ImportError:
            pytest.skip("TensorFlow not installed")
    
    def test_simple_model_extraction(self):
        """Test extraction of a simple Keras model."""
        try:
            from tensorflow import keras
            from tensorflow.keras import layers
            from extractors.keras_extractor import KerasExtractor
            
            # Create simple model
            model = keras.Sequential([
                layers.Conv2D(64, 3, activation='relu', input_shape=(224, 224, 3)),
                layers.MaxPooling2D(2),
                layers.Flatten(),
                layers.Dense(10, activation='softmax')
            ])
            
            # Extract
            extractor = KerasExtractor(
                model=model,
                model_name="SimpleKerasModel"
            )
            
            data = extractor.extract()
            
            # Assertions
            assert 'metadata' in data
            assert 'layers' in data
            assert 'connections' in data
            assert len(data['layers']) > 0
            assert data['metadata']['model_name'] == 'SimpleKerasModel'
            
        except ImportError:
            pytest.skip("TensorFlow not installed")


class TestUniversalConverter:
    """Test universal converter."""
    
    def test_converter_instantiation(self):
        """Test converter can be instantiated."""
        from converters.universal_converter import UniversalConverter
        
        converter = UniversalConverter()
        assert converter is not None
    
    def test_converter_with_mock_data(self):
        """Test converter with mock extracted data."""
        from converters.universal_converter import UniversalConverter
        
        # Create mock extracted data
        mock_data = {
            'metadata': {
                'model_name': 'TestModel',
                'framework': 'pytorch',
                'framework_version': '2.0.0',
                'total_layers': 2,
                'total_parameters': 1000,
                'input_shape': [1, 3, 224, 224],
                'output_shape': [1, 10]
            },
            'layers': [
                {
                    'id': 'layer_0',
                    'name': 'conv1',
                    'type': 'Conv2d',
                    'index': 0,
                    'input_shape': [1, 3, 224, 224],
                    'output_shape': [1, 64, 224, 224],
                    'parameters': {'in_channels': 3, 'out_channels': 64},
                    'activation': 'relu',
                    'trainable': True
                },
                {
                    'id': 'layer_1',
                    'name': 'fc',
                    'type': 'Linear',
                    'index': 1,
                    'input_shape': [1, 64],
                    'output_shape': [1, 10],
                    'parameters': {'in_features': 64, 'out_features': 10},
                    'activation': None,
                    'trainable': True
                }
            ],
            'connections': [
                {
                    'from_layer': 'layer_0',
                    'to_layer': 'layer_1',
                    'connection_type': 'sequential',
                    'data_flow': 'forward'
                }
            ]
        }
        
        # Convert
        converter = UniversalConverter()
        viz_data = converter.convert(mock_data)
        
        # Assertions
        assert 'metadata' in viz_data
        assert 'layers' in viz_data
        assert 'connections' in viz_data
        assert 'architecture' in viz_data
        assert len(viz_data['layers']) == 2


class TestSchemaValidator:
    """Test schema validator."""
    
    def test_validator_instantiation(self):
        """Test validator can be instantiated."""
        from validators.schema_validator import SchemaValidator
        
        validator = SchemaValidator()
        assert validator is not None
    
    def test_valid_data_validation(self):
        """Test validation of valid data."""
        from validators.schema_validator import SchemaValidator
        
        valid_data = {
            'metadata': {
                'model_name': 'TestModel',
                'framework': 'pytorch',
                'total_layers': 1,
                'total_parameters': 100
            },
            'layers': [
                {
                    'id': 'layer_0',
                    'name': 'test_layer',
                    'type': 'Conv2d',
                    'index': 0
                }
            ],
            'connections': []
        }
        
        validator = SchemaValidator()
        is_valid, errors = validator.validate(valid_data)
        
        assert is_valid
        assert len(errors) == 0
    
    def test_invalid_data_validation(self):
        """Test validation of invalid data."""
        from validators.schema_validator import SchemaValidator
        
        invalid_data = {
            'metadata': {
                # Missing required fields
                'model_name': 'TestModel'
            },
            'layers': [],
            'connections': []
        }
        
        validator = SchemaValidator()
        is_valid, errors = validator.validate(invalid_data)
        
        assert not is_valid
        assert len(errors) > 0


def test_integration_flow():
    """Test complete extraction and conversion flow."""
    try:
        import torch
        import torch.nn as nn
        from extractors.pytorch_extractor import PyTorchExtractor
        from converters.universal_converter import UniversalConverter
        from validators.schema_validator import SchemaValidator
        
        # Create simple model
        model = nn.Sequential(
            nn.Conv2d(3, 64, 3),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        
        # Extract
        extractor = PyTorchExtractor(model, input_shape=(1, 3, 224, 224))
        extracted_data = extractor.extract()
        
        # Convert
        converter = UniversalConverter()
        viz_data = converter.convert(extracted_data)
        
        # Validate
        validator = SchemaValidator()
        is_valid, errors = validator.validate(viz_data)
        
        assert is_valid, f"Validation failed: {errors}"
        
    except ImportError:
        pytest.skip("PyTorch not installed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
