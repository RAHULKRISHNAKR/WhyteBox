"""
Interactive Model Converter - CLI Tool

Allows users to select a model from a list, automatically converts it if needed,
and displays the visualization data.
"""

import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import json
from typing import Dict, List, Optional
import torch
import torchvision.models as models
from extractors.pytorch_extractor import PyTorchExtractor
from converters.universal_converter import UniversalConverter
from validators.schema_validator import SchemaValidator

# Try to import Keras models (optional)
try:
    from tensorflow.keras.applications import *
    KERAS_AVAILABLE = True
except ImportError:
    KERAS_AVAILABLE = False


class ModelConverter:
    """Interactive model converter with automatic caching"""
    
    def __init__(self):
        self.output_dir = Path(__file__).parent.parent / 'output'
        self.output_dir.mkdir(exist_ok=True)
        
        # Define available models
        self.pytorch_models = {
            '1': {'name': 'VGG16', 'loader': lambda: models.vgg16(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '2': {'name': 'VGG19', 'loader': lambda: models.vgg19(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '3': {'name': 'ResNet18', 'loader': lambda: models.resnet18(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '4': {'name': 'ResNet34', 'loader': lambda: models.resnet34(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '5': {'name': 'ResNet50', 'loader': lambda: models.resnet50(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '6': {'name': 'ResNet101', 'loader': lambda: models.resnet101(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '7': {'name': 'DenseNet121', 'loader': lambda: models.densenet121(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '8': {'name': 'DenseNet161', 'loader': lambda: models.densenet161(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '9': {'name': 'MobileNetV2', 'loader': lambda: models.mobilenet_v2(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '10': {'name': 'MobileNetV3-Small', 'loader': lambda: models.mobilenet_v3_small(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '11': {'name': 'MobileNetV3-Large', 'loader': lambda: models.mobilenet_v3_large(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '12': {'name': 'SqueezeNet1_0', 'loader': lambda: models.squeezenet1_0(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '13': {'name': 'SqueezeNet1_1', 'loader': lambda: models.squeezenet1_1(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '14': {'name': 'AlexNet', 'loader': lambda: models.alexnet(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '15': {'name': 'InceptionV3', 'loader': lambda: models.inception_v3(pretrained=False), 'input_shape': (1, 3, 299, 299)},
            '16': {'name': 'GoogLeNet', 'loader': lambda: models.googlenet(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '17': {'name': 'ShuffleNetV2', 'loader': lambda: models.shufflenet_v2_x1_0(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '18': {'name': 'EfficientNet-B0', 'loader': lambda: models.efficientnet_b0(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '19': {'name': 'EfficientNet-B1', 'loader': lambda: models.efficientnet_b1(pretrained=False), 'input_shape': (1, 3, 224, 224)},
            '20': {'name': 'RegNet-Y-400MF', 'loader': lambda: models.regnet_y_400mf(pretrained=False), 'input_shape': (1, 3, 224, 224)},
        }
        
        self.keras_models = {}
        if KERAS_AVAILABLE:
            self.keras_models = {
                '21': {'name': 'VGG16-Keras', 'loader': lambda: VGG16(weights=None), 'framework': 'keras'},
                '22': {'name': 'VGG19-Keras', 'loader': lambda: VGG19(weights=None), 'framework': 'keras'},
                '23': {'name': 'ResNet50-Keras', 'loader': lambda: ResNet50(weights=None), 'framework': 'keras'},
                '24': {'name': 'MobileNetV2-Keras', 'loader': lambda: MobileNetV2(weights=None), 'framework': 'keras'},
                '25': {'name': 'DenseNet121-Keras', 'loader': lambda: DenseNet121(weights=None), 'framework': 'keras'},
            }
    
    def display_menu(self):
        """Display interactive menu of available models"""
        print("\n" + "="*70)
        print("🚀 WhyteBox - Interactive Model Converter")
        print("="*70)
        print("\n📋 Available PyTorch Models:")
        print("-" * 70)
        
        for key, model_info in self.pytorch_models.items():
            filename = self.get_output_filename(model_info['name'], 'pytorch')
            cached = "✓ Cached" if (self.output_dir / filename).exists() else "  New"
            print(f"  [{key:>2}] {model_info['name']:<25} {cached}")
        
        if KERAS_AVAILABLE and self.keras_models:
            print("\n📋 Available Keras Models:")
            print("-" * 70)
            for key, model_info in self.keras_models.items():
                filename = self.get_output_filename(model_info['name'], 'keras')
                cached = "✓ Cached" if (self.output_dir / filename).exists() else "  New"
                print(f"  [{key:>2}] {model_info['name']:<25} {cached}")
        
        print("\n" + "="*70)
        print("  [0] Exit")
        print("="*70)
    
    def get_output_filename(self, model_name: str, framework: str) -> str:
        """Generate consistent output filename"""
        # Clean model name for filename
        clean_name = model_name.replace(' ', '_').replace('-', '_').lower()
        return f"{clean_name}_{framework}_visualization.json"
    
    def check_cached_output(self, model_name: str, framework: str) -> Optional[Path]:
        """Check if output already exists"""
        filename = self.get_output_filename(model_name, framework)
        filepath = self.output_dir / filename
        
        if filepath.exists():
            return filepath
        return None
    
    def convert_pytorch_model(self, model_info: Dict) -> Path:
        """Convert a PyTorch model"""
        model_name = model_info['name']
        print(f"\n🔄 Converting {model_name}...")
        print("   Loading model from torchvision...")
        
        # Load model
        model = model_info['loader']()
        model.eval()
        
        # Extract
        print(f"   Extracting layers and connections...")
        extractor = PyTorchExtractor(
            model=model,
            input_shape=model_info['input_shape'],
            model_name=model_name,
            extract_weights=False
        )
        extracted_data = extractor.extract()
        
        # Convert
        print(f"   Converting to visualization format...")
        converter = UniversalConverter()
        viz_data = converter.convert(extracted_data)
        
        # Save
        output_file = self.output_dir / self.get_output_filename(model_name, 'pytorch')
        converter.save_to_file(viz_data, str(output_file))
        
        print(f"   ✓ Saved to: {output_file.name}")
        return output_file
    
    def convert_keras_model(self, model_info: Dict) -> Path:
        """Convert a Keras model"""
        from extractors.keras_extractor import KerasExtractor
        
        model_name = model_info['name']
        print(f"\n🔄 Converting {model_name}...")
        print("   Loading model from keras.applications...")
        
        # Load model
        model = model_info['loader']()
        
        # Extract
        print(f"   Extracting layers and connections...")
        extractor = KerasExtractor(
            model=model,
            model_name=model_name,
            extract_weights=False
        )
        extracted_data = extractor.extract()
        
        # Convert
        print(f"   Converting to visualization format...")
        converter = UniversalConverter()
        viz_data = converter.convert(extracted_data)
        
        # Save
        output_file = self.output_dir / self.get_output_filename(model_name, 'keras')
        converter.save_to_file(viz_data, str(output_file))
        
        print(f"   ✓ Saved to: {output_file.name}")
        return output_file
    
    def display_visualization_data(self, filepath: Path):
        """Display the visualization data in terminal"""
        print("\n" + "="*70)
        print(f"📊 Visualization Data: {filepath.name}")
        print("="*70)
        
        # Load JSON
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        # Display metadata
        metadata = data['metadata']
        print("\n📋 Model Metadata:")
        print("-" * 70)
        print(f"  Model Name:          {metadata['model_name']}")
        print(f"  Framework:           {metadata['framework'].upper()}")
        print(f"  Total Layers:        {metadata['total_layers']}")
        print(f"  Total Parameters:    {metadata['total_parameters']:,}")
        print(f"  Trainable Params:    {metadata.get('trainable_parameters', 'N/A'):,}")
        print(f"  Input Shape:         {metadata['input_shape']}")
        print(f"  Output Shape:        {metadata['output_shape']}")
        
        # Display layer summary
        layers = data['layers']
        print(f"\n📦 Layers ({len(layers)} total):")
        print("-" * 70)
        
        # Show first 10 layers
        for i, layer in enumerate(layers[:10]):
            layer_type = layer['type']
            output_shape = layer['output_shape']
            params = layer.get('num_parameters', 0)
            color = layer.get('visualization', {}).get('color', '#CCCCCC')
            
            print(f"  [{i+1:>3}] {layer['name']:<30} {layer_type:<15} → {str(output_shape):<20} ({params:>10,} params) {color}")
        
        if len(layers) > 10:
            print(f"  ...  [{len(layers) - 10} more layers]")
        
        # Show last 3 layers
        if len(layers) > 10:
            print(f"\n  Last 3 layers:")
            for i, layer in enumerate(layers[-3:]):
                idx = len(layers) - 3 + i
                layer_type = layer['type']
                output_shape = layer['output_shape']
                params = layer.get('num_parameters', 0)
                color = layer.get('visualization', {}).get('color', '#CCCCCC')
                
                print(f"  [{idx+1:>3}] {layer['name']:<30} {layer_type:<15} → {str(output_shape):<20} ({params:>10,} params) {color}")
        
        # Display connections
        connections = data['connections']
        print(f"\n🔗 Connections ({len(connections)} total):")
        print("-" * 70)
        
        # Sample connections
        sample_count = min(5, len(connections))
        for i, conn in enumerate(connections[:sample_count]):
            # Support both old and new key formats for backward compatibility
            from_layer = conn.get('source_layer') or conn.get('from_layer', 'unknown')
            to_layer = conn.get('target_layer') or conn.get('to_layer', 'unknown')
            conn_type = conn.get('connection_type', 'sequential')
            print(f"  {from_layer} → {to_layer} ({conn_type})")
        
        if len(connections) > sample_count:
            print(f"  ... [{len(connections) - sample_count} more connections]")
        
        # Display architecture
        if 'architecture' in data:
            arch = data['architecture']
            print(f"\n🏗️  Architecture Analysis:")
            print("-" * 70)
            print(f"  Type:                {arch.get('architecture_type', 'Unknown')}")
            print(f"  Depth:               {arch.get('depth', 'N/A')}")
            print(f"  Skip Connections:    {arch.get('has_skip_connections', False)}")
            print(f"  Branches:            {arch.get('has_branches', False)}")
        
        # Display visualization hints
        if 'visualization_hints' in data:
            hints = data['visualization_hints']
            print(f"\n🎨 Visualization Hints:")
            print("-" * 70)
            print(f"  Layout:              {hints.get('suggested_layout', 'N/A')}")
            print(f"  Camera Position:     {hints.get('camera_position', 'N/A')}")
            print(f"  Layer Spacing:       {hints.get('layer_spacing', 'N/A')}")
            print(f"  Color Scheme:        {hints.get('color_scheme', 'N/A')}")
        
        # File info
        file_size = filepath.stat().st_size / 1024  # KB
        print(f"\n💾 File Information:")
        print("-" * 70)
        print(f"  Location:            {filepath}")
        print(f"  Size:                {file_size:.2f} KB")
        print(f"  Format:              JSON")
        
        print("\n" + "="*70)
        print("✓ Ready to load in frontend visualization!")
        print("="*70)
    
    def run(self):
        """Main interactive loop"""
        while True:
            self.display_menu()
            
            choice = input("\n🎯 Select a model (enter number): ").strip()
            
            if choice == '0':
                print("\n👋 Thanks for using WhyteBox! Goodbye.\n")
                break
            
            # Check if valid choice
            all_models = {**self.pytorch_models, **self.keras_models}
            
            if choice not in all_models:
                print(f"\n❌ Invalid choice: {choice}. Please try again.")
                input("\nPress Enter to continue...")
                continue
            
            model_info = all_models[choice]
            model_name = model_info['name']
            framework = 'keras' if choice in self.keras_models else 'pytorch'
            
            print(f"\n" + "="*70)
            print(f"Selected: {model_name}")
            print("="*70)
            
            # Check if already cached
            cached_file = self.check_cached_output(model_name, framework)
            
            if cached_file:
                print(f"\n✓ Found cached output: {cached_file.name}")
                print("   Loading from cache...")
                output_file = cached_file
            else:
                print(f"\n⚠️  No cached output found.")
                print("   Converting model now...")
                
                try:
                    if framework == 'pytorch':
                        output_file = self.convert_pytorch_model(model_info)
                    else:
                        output_file = self.convert_keras_model(model_info)
                    
                    print(f"\n✓ Conversion complete!")
                except Exception as e:
                    print(f"\n❌ Error during conversion: {e}")
                    import traceback
                    traceback.print_exc()
                    input("\nPress Enter to continue...")
                    continue
            
            # Display the data
            try:
                self.display_visualization_data(output_file)
            except Exception as e:
                print(f"\n❌ Error displaying data: {e}")
                import traceback
                traceback.print_exc()
            
            input("\n⏎ Press Enter to continue...")


def main():
    """Entry point"""
    try:
        converter = ModelConverter()
        converter.run()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user. Goodbye!\n")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
