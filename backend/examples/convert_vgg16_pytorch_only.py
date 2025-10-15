"""
Convert VGG16 model from PyTorch to visualization format
This script only requires PyTorch (no TensorFlow needed)
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import torch
import torchvision.models as models
from extractors.pytorch_extractor import PyTorchExtractor
from converters.universal_converter import UniversalConverter
from validators.schema_validator import SchemaValidator

def convert_pytorch_vgg16():
    """Convert PyTorch VGG16 model"""
    print("\n" + "="*70)
    print("Converting PyTorch VGG16 to Visualization Format")
    print("="*70)
    
    # Load VGG16 model
    print("\n📥 Loading VGG16 model from torchvision...")
    model = models.vgg16(pretrained=False)  # Set to True to download pretrained weights
    model.eval()
    
    # Extract model information
    print("🔍 Extracting model information...")
    extractor = PyTorchExtractor(
        model=model,
        input_shape=(1, 3, 224, 224),  # Batch size 1, RGB, 224x224
        model_name="VGG16",
        extract_weights=False  # Set to True to include weight data
    )
    
    extracted_data = extractor.extract()
    
    # Print summary
    print("\n✓ Successfully extracted model information:")
    extractor.print_summary()
    
    # Convert to visualization format
    print("\n🔄 Converting to visualization format...")
    converter = UniversalConverter()
    visualization_data = converter.convert(extracted_data)
    
    # Save to file
    output_path = Path(__file__).parent.parent / 'output' / 'vgg16_pytorch_visualization.json'
    converter.save_to_file(visualization_data, str(output_path))
    
    print(f"\n✓ Saved visualization data to: {output_path}")
    
    # Validate the output
    print("\n🔍 Validating output...")
    validator = SchemaValidator()
    is_valid, errors = validator.validate(visualization_data)
    
    if is_valid:
        print("✓ Output is valid!")
    else:
        print("✗ Validation errors found:")
        for error in errors:
            print(f"  - {error}")
    
    # Print statistics
    print("\n" + "="*70)
    print("📊 Conversion Statistics")
    print("="*70)
    print(f"Model Name:       {visualization_data['metadata']['model_name']}")
    print(f"Framework:        {visualization_data['metadata']['framework']}")
    print(f"Total Layers:     {visualization_data['metadata']['total_layers']}")
    print(f"Total Parameters: {visualization_data['metadata']['total_parameters']:,}")
    print(f"Architecture Type: {visualization_data['architecture']['architecture_type']}")
    
    # Sample layers
    print(f"\n📋 First 5 Layers:")
    for i, layer in enumerate(visualization_data['layers'][:5]):
        print(f"  {i+1}. {layer['name']} ({layer['type']}) -> {layer['output_shape']}")
    
    print(f"\n📋 Last 3 Layers:")
    for i, layer in enumerate(visualization_data['layers'][-3:]):
        idx = len(visualization_data['layers']) - 3 + i
        print(f"  {idx+1}. {layer['name']} ({layer['type']}) -> {layer['output_shape']}")
    
    print(f"\n🔗 Total Connections: {len(visualization_data['connections'])}")
    
    print("\n" + "="*70)
    print("✅ Conversion Complete!")
    print("="*70)
    print(f"\n💡 You can now use '{output_path.name}' in your frontend visualization!")
    print("   - Load it in Babylon.js to create 3D neural network visualization")
    print("   - Use with TensorSpace.js for interactive model exploration")
    print("   - Visualize with D3.js for 2D network diagrams")
    
    return visualization_data

if __name__ == "__main__":
    try:
        visualization_data = convert_pytorch_vgg16()
        print("\n🎉 Success! Your model is ready for visualization.")
    except ImportError as e:
        print(f"\n❌ Import Error: {e}")
        print("\n💡 Make sure PyTorch is installed:")
        print("   pip install torch torchvision")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
