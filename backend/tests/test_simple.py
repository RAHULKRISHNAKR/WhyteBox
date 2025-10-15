"""
Simple Test - Verify backend structure without deep learning libraries

This test verifies the backend structure and basic functionality
without requiring PyTorch or TensorFlow to be installed.
"""

import sys
from pathlib import Path
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_imports():
    """Test that all modules can be imported."""
    print("="*70)
    print("Testing Module Imports")
    print("="*70)
    
    try:
        from extractors.base_extractor import BaseExtractor
        print("✓ Base extractor imported successfully")
    except Exception as e:
        print(f"✗ Failed to import base extractor: {e}")
        return False
    
    try:
        from converters.universal_converter import UniversalConverter
        print("✓ Universal converter imported successfully")
    except Exception as e:
        print(f"✗ Failed to import universal converter: {e}")
        return False
    
    try:
        from validators.schema_validator import SchemaValidator
        print("✓ Schema validator imported successfully")
    except Exception as e:
        print(f"✗ Failed to import schema validator: {e}")
        return False
    
    return True


def test_converter_with_mock_data():
    """Test converter with mock data."""
    print("\n" + "="*70)
    print("Testing Converter with Mock Data")
    print("="*70)
    
    try:
        from converters.universal_converter import UniversalConverter
        
        # Create mock extracted data
        mock_data = {
            'metadata': {
                'model_name': 'TestModel',
                'framework': 'pytorch',
                'framework_version': '2.0.0',
                'total_layers': 3,
                'total_parameters': 5000,
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
                    'parameters': {
                        'in_channels': 3,
                        'out_channels': 64,
                        'kernel_size': [3, 3],
                        'stride': [1, 1],
                        'padding': [1, 1]
                    },
                    'activation': 'relu',
                    'trainable': True
                },
                {
                    'id': 'layer_1',
                    'name': 'pool1',
                    'type': 'MaxPool2d',
                    'index': 1,
                    'input_shape': [1, 64, 224, 224],
                    'output_shape': [1, 64, 112, 112],
                    'parameters': {
                        'kernel_size': [2, 2],
                        'stride': [2, 2]
                    },
                    'activation': None,
                    'trainable': False
                },
                {
                    'id': 'layer_2',
                    'name': 'fc',
                    'type': 'Linear',
                    'index': 2,
                    'input_shape': [1, 64 * 112 * 112],
                    'output_shape': [1, 10],
                    'parameters': {
                        'in_features': 64 * 112 * 112,
                        'out_features': 10
                    },
                    'activation': 'softmax',
                    'trainable': True
                }
            ],
            'connections': [
                {
                    'from_layer': 'layer_0',
                    'to_layer': 'layer_1',
                    'connection_type': 'sequential',
                    'data_flow': 'forward'
                },
                {
                    'from_layer': 'layer_1',
                    'to_layer': 'layer_2',
                    'connection_type': 'sequential',
                    'data_flow': 'forward'
                }
            ]
        }
        
        print(f"✓ Created mock data with {len(mock_data['layers'])} layers")
        
        # Convert
        converter = UniversalConverter()
        viz_data = converter.convert(mock_data)
        
        print(f"✓ Converted successfully")
        print(f"  - Layers: {len(viz_data['layers'])}")
        print(f"  - Connections: {len(viz_data['connections'])}")
        print(f"  - Architecture type: {viz_data['architecture']['architecture_type']}")
        
        # Save to file
        output_path = Path(__file__).parent.parent / 'output' / 'test_model.json'
        converter.save_to_file(viz_data, str(output_path))
        print(f"✓ Saved to: {output_path}")
        
        return True, viz_data
        
    except Exception as e:
        print(f"✗ Converter test failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None


def test_validator(viz_data):
    """Test validator with converted data."""
    print("\n" + "="*70)
    print("Testing Schema Validator")
    print("="*70)
    
    try:
        from validators.schema_validator import SchemaValidator
        
        validator = SchemaValidator()
        is_valid, errors = validator.validate(viz_data)
        
        if is_valid:
            print("✓ Validation passed successfully")
            print(f"  - Schema compliance: ✓")
            print(f"  - Layer integrity: ✓")
            print(f"  - Connection integrity: ✓")
            return True
        else:
            print("✗ Validation failed")
            for error in errors:
                print(f"  - {error}")
            return False
            
    except Exception as e:
        print(f"✗ Validator test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_file_structure():
    """Test that all required folders exist."""
    print("\n" + "="*70)
    print("Testing File Structure")
    print("="*70)
    
    backend_path = Path(__file__).parent.parent
    required_folders = [
        'extractors',
        'converters',
        'validators',
        'api',
        'examples',
        'tests',
        'output',
        'models'
    ]
    
    all_exist = True
    for folder in required_folders:
        folder_path = backend_path / folder
        if folder_path.exists():
            print(f"✓ {folder}/ exists")
        else:
            print(f"✗ {folder}/ missing")
            all_exist = False
    
    return all_exist


def print_summary(viz_data):
    """Print detailed summary of converted data."""
    print("\n" + "="*70)
    print("Conversion Summary")
    print("="*70)
    
    print(f"\nModel: {viz_data['metadata']['model_name']}")
    print(f"Framework: {viz_data['metadata']['framework']}")
    print(f"Total Parameters: {viz_data['metadata']['total_parameters']:,}")
    
    print(f"\nLayers ({len(viz_data['layers'])}):")
    for layer in viz_data['layers']:
        viz = layer.get('visualization', {})
        print(f"  [{layer['index']}] {layer['name']:20s} {layer['type']:15s} "
              f"→ {str(layer['output_shape']):30s} (color: {viz.get('color', 'N/A')})")
    
    print(f"\nConnections ({len(viz_data['connections'])}):")
    for conn in viz_data['connections'][:5]:  # Show first 5
        print(f"  {conn['from_layer']} → {conn['to_layer']} ({conn['connection_type']})")
    
    if len(viz_data['connections']) > 5:
        print(f"  ... and {len(viz_data['connections']) - 5} more")
    
    print(f"\nArchitecture:")
    for key, value in viz_data['architecture'].items():
        if key != 'layer_type_distribution' and key != 'stages':
            print(f"  {key}: {value}")
    
    print(f"\nVisualization Hints:")
    hints = viz_data.get('visualization_hints', {})
    print(f"  Layout: {hints.get('recommended_layout', 'N/A')}")
    print(f"  Color Scheme: {hints.get('color_scheme', 'N/A')}")
    print(f"  Layer Spacing: {hints.get('layer_spacing', 'N/A')}")


def main():
    """Run all tests."""
    print("\n" + "="*70)
    print("WhyteBox Backend - Simple Structure Test")
    print("="*70)
    print("\nThis test verifies the backend without requiring PyTorch/TensorFlow\n")
    
    # Test imports
    if not test_imports():
        print("\n✗ Import test failed. Cannot continue.")
        return False
    
    # Test file structure
    if not test_file_structure():
        print("\n⚠ Some folders are missing but continuing...")
    
    # Test converter
    success, viz_data = test_converter_with_mock_data()
    if not success:
        print("\n✗ Converter test failed. Cannot continue.")
        return False
    
    # Test validator
    if not test_validator(viz_data):
        print("\n✗ Validator test failed.")
        return False
    
    # Print summary
    print_summary(viz_data)
    
    # Final summary
    print("\n" + "="*70)
    print("✓ All Tests Passed Successfully!")
    print("="*70)
    print("\nNext Steps:")
    print("1. Install PyTorch: pip install torch torchvision")
    print("2. Or install TensorFlow: pip install tensorflow")
    print("3. Run: python examples\\convert_vgg16.py")
    print("4. Check output\\ folder for generated JSON files")
    print("="*70)
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
