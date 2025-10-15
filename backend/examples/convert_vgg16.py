"""
Example: Convert VGG16 Model to Visualization Format

This script demonstrates how to extract and convert a VGG16 model
(from PyTorch or Keras) into visualization-ready JSON format.
"""

import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from extractors.pytorch_extractor import PyTorchExtractor
from converters.universal_converter import UniversalConverter

# Try to import Keras extractor (optional)
try:
    from extractors.keras_extractor import KerasExtractor
    KERAS_AVAILABLE = True
except ImportError:
    KERAS_AVAILABLE = False
    print("⚠️  TensorFlow/Keras not installed. Skipping Keras conversion.")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def convert_pytorch_vgg16():
    """Convert PyTorch VGG16 model."""
    logger.info("="*70)
    logger.info("Converting PyTorch VGG16")
    logger.info("="*70)
    
    try:
        import torch
        import torchvision.models as models
        
        # Load VGG16 model
        logger.info("Loading VGG16 model from torchvision...")
        model = models.vgg16(pretrained=False)  # Set to True to download weights
        model.eval()
        
        # Extract model information
        logger.info("Extracting model information...")
        extractor = PyTorchExtractor(
            model=model,
            input_shape=(1, 3, 224, 224),
            model_name="VGG16_PyTorch",
            extract_weights=False,  # Set to True to include weights
            extract_detailed_params=True
        )
        
        extracted_data = extractor.extract()
        
        # Print summary
        extractor.print_summary()
        
        # Convert to visualization format
        logger.info("Converting to visualization format...")
        converter = UniversalConverter(
            include_weights=False,
            add_visualization_hints=True
        )
        
        viz_data = converter.convert(extracted_data)
        
        # Save to file
        output_path = Path(__file__).parent.parent / 'output' / 'vgg16_pytorch_visualization.json'
        converter.save_to_file(viz_data, str(output_path))
        
        logger.info(f"✓ Successfully converted PyTorch VGG16!")
        logger.info(f"✓ Output saved to: {output_path}")
        
        return viz_data
        
    except ImportError as e:
        logger.error(f"✗ Missing required package: {e}")
        logger.info("Install with: pip install torch torchvision")
        return None
    except Exception as e:
        logger.error(f"✗ Conversion failed: {e}")
        raise


def convert_keras_vgg16():
    """Convert Keras VGG16 model."""
    logger.info("="*70)
    logger.info("Converting Keras VGG16")
    logger.info("="*70)
    
    try:
        import tensorflow as tf
        from tensorflow.keras.applications import VGG16
        
        # Load VGG16 model
        logger.info("Loading VGG16 model from Keras applications...")
        model = VGG16(weights=None, include_top=True)  # Set weights='imagenet' to download
        
        # Extract model information
        logger.info("Extracting model information...")
        extractor = KerasExtractor(
            model=model,
            model_name="VGG16_Keras",
            extract_weights=False,
            extract_detailed_params=True
        )
        
        extracted_data = extractor.extract()
        
        # Print summary
        extractor.print_summary()
        
        # Convert to visualization format
        logger.info("Converting to visualization format...")
        converter = UniversalConverter(
            include_weights=False,
            add_visualization_hints=True
        )
        
        viz_data = converter.convert(extracted_data)
        
        # Save to file
        output_path = Path(__file__).parent.parent / 'output' / 'vgg16_keras_visualization.json'
        converter.save_to_file(viz_data, str(output_path))
        
        logger.info(f"✓ Successfully converted Keras VGG16!")
        logger.info(f"✓ Output saved to: {output_path}")
        
        return viz_data
        
    except ImportError as e:
        logger.error(f"✗ Missing required package: {e}")
        logger.info("Install with: pip install tensorflow")
        return None
    except Exception as e:
        logger.error(f"✗ Conversion failed: {e}")
        raise


def compare_extractions(pytorch_data, keras_data):
    """Compare PyTorch and Keras extractions."""
    logger.info("="*70)
    logger.info("Comparison Summary")
    logger.info("="*70)
    
    if pytorch_data and keras_data:
        pt_layers = len(pytorch_data['layers'])
        keras_layers = len(keras_data['layers'])
        
        pt_params = pytorch_data['metadata']['total_parameters']
        keras_params = keras_data['metadata']['total_parameters']
        
        logger.info(f"PyTorch VGG16:")
        logger.info(f"  - Layers: {pt_layers}")
        logger.info(f"  - Parameters: {pt_params:,}")
        logger.info(f"  - Architecture: {pytorch_data['architecture']['architecture_type']}")
        
        logger.info(f"\nKeras VGG16:")
        logger.info(f"  - Layers: {keras_layers}")
        logger.info(f"  - Parameters: {keras_params:,}")
        logger.info(f"  - Architecture: {keras_data['architecture']['architecture_type']}")
        
        logger.info(f"\nBoth extractions should represent the same VGG16 architecture!")


def main():
    """Main execution function."""
    logger.info("\n" + "="*70)
    logger.info("VGG16 Model Conversion Example")
    logger.info("="*70 + "\n")
    
    # Try PyTorch conversion
    pytorch_data = None
    try:
        pytorch_data = convert_pytorch_vgg16()
    except Exception as e:
        logger.warning(f"PyTorch conversion skipped: {e}")
    
    print("\n")
    
    # Try Keras conversion (only if TensorFlow is available)
    keras_data = None
    if KERAS_AVAILABLE:
        try:
            keras_data = convert_keras_vgg16()
        except Exception as e:
            logger.warning(f"Keras conversion skipped: {e}")
    else:
        logger.info("Keras conversion skipped (TensorFlow not installed)")
    
    print("\n")
    
    # Compare if both succeeded
    if pytorch_data and keras_data:
        compare_extractions(pytorch_data, keras_data)
    
    logger.info("\n" + "="*70)
    logger.info("Example completed!")
    logger.info("="*70)
    
    if pytorch_data or keras_data:
        logger.info("\n✓ Check the 'output/' directory for generated JSON files")
        logger.info("✓ These files can be loaded in the frontend for 3D visualization")
    else:
        logger.warning("\n⚠ No conversions completed. Install required packages.")


if __name__ == "__main__":
    main()
