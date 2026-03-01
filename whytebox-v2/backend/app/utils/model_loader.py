"""
Framework-agnostic model loader utilities.
"""
import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from app.schemas.model import Framework, ModelType

logger = logging.getLogger(__name__)


class ModelLoader:
    """Utility class for loading models from different frameworks."""

    @staticmethod
    def detect_framework(file_path: str) -> Optional[Framework]:
        """
        Detect the framework from file extension.
        
        Args:
            file_path: Path to the model file
            
        Returns:
            Detected framework or None
        """
        path = Path(file_path)
        extension = path.suffix.lower()

        framework_map = {
            ".pt": Framework.PYTORCH,
            ".pth": Framework.PYTORCH,
            ".pb": Framework.TENSORFLOW,
            ".h5": Framework.KERAS,  # Could be TensorFlow or Keras
            ".onnx": Framework.ONNX,
        }

        return framework_map.get(extension)

    @staticmethod
    def compute_file_hash(file_path: str) -> str:
        """
        Compute SHA-256 hash of a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            SHA-256 hash as hex string
        """
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            # Read file in chunks to handle large files
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @staticmethod
    def get_file_size(file_path: str) -> int:
        """
        Get file size in bytes.
        
        Args:
            file_path: Path to the file
            
        Returns:
            File size in bytes
        """
        return Path(file_path).stat().st_size

    @staticmethod
    def load_pytorch_model(file_path: str, device: str = "cpu") -> Tuple[Any, Dict]:
        """
        Load a PyTorch model.
        
        Args:
            file_path: Path to the model file
            device: Device to load model on
            
        Returns:
            Tuple of (model, metadata)
        """
        try:
            import torch
        except ImportError:
            raise ImportError("PyTorch is not installed. Install with: pip install torch")

        try:
            # Load model
            model = torch.load(file_path, map_location=device)
            
            # Extract metadata
            metadata = {
                "framework": "pytorch",
                "device": device,
            }

            # If it's a state dict, we need the model architecture separately
            if isinstance(model, dict):
                metadata["is_state_dict"] = True
                metadata["keys"] = list(model.keys())
            else:
                metadata["is_state_dict"] = False
                # Try to get model info
                if hasattr(model, "eval"):
                    model.eval()

            return model, metadata

        except Exception as e:
            logger.error(f"Error loading PyTorch model: {e}")
            raise

    @staticmethod
    def load_tensorflow_model(file_path: str) -> Tuple[Any, Dict]:
        """
        Load a TensorFlow model.
        
        Args:
            file_path: Path to the model file or directory
            
        Returns:
            Tuple of (model, metadata)
        """
        try:
            import tensorflow as tf
        except ImportError:
            raise ImportError(
                "TensorFlow is not installed. Install with: pip install tensorflow"
            )

        try:
            # Load model
            model = tf.keras.models.load_model(file_path)

            # Extract metadata
            metadata = {
                "framework": "tensorflow",
                "input_shape": model.input_shape if hasattr(model, "input_shape") else None,
                "output_shape": model.output_shape if hasattr(model, "output_shape") else None,
            }

            return model, metadata

        except Exception as e:
            logger.error(f"Error loading TensorFlow model: {e}")
            raise

    @staticmethod
    def load_keras_model(file_path: str) -> Tuple[Any, Dict]:
        """
        Load a Keras model.
        
        Args:
            file_path: Path to the model file
            
        Returns:
            Tuple of (model, metadata)
        """
        try:
            from tensorflow import keras
        except ImportError:
            raise ImportError(
                "Keras/TensorFlow is not installed. Install with: pip install tensorflow"
            )

        try:
            # Load model
            model = keras.models.load_model(file_path)

            # Extract metadata
            metadata = {
                "framework": "keras",
                "input_shape": model.input_shape if hasattr(model, "input_shape") else None,
                "output_shape": model.output_shape if hasattr(model, "output_shape") else None,
            }

            return model, metadata

        except Exception as e:
            logger.error(f"Error loading Keras model: {e}")
            raise

    @staticmethod
    def load_onnx_model(file_path: str) -> Tuple[Any, Dict]:
        """
        Load an ONNX model.
        
        Args:
            file_path: Path to the model file
            
        Returns:
            Tuple of (model, metadata)
        """
        try:
            import onnx
            import onnxruntime as ort
        except ImportError:
            raise ImportError(
                "ONNX is not installed. Install with: pip install onnx onnxruntime"
            )

        try:
            # Load ONNX model
            onnx_model = onnx.load(file_path)
            
            # Create inference session
            session = ort.InferenceSession(file_path)

            # Extract metadata
            metadata = {
                "framework": "onnx",
                "inputs": [
                    {
                        "name": inp.name,
                        "shape": [d.dim_value for d in inp.type.tensor_type.shape.dim],
                        "type": inp.type.tensor_type.elem_type,
                    }
                    for inp in session.get_inputs()
                ],
                "outputs": [
                    {
                        "name": out.name,
                        "shape": [d.dim_value for d in out.type.tensor_type.shape.dim],
                        "type": out.type.tensor_type.elem_type,
                    }
                    for out in session.get_outputs()
                ],
            }

            return session, metadata

        except Exception as e:
            logger.error(f"Error loading ONNX model: {e}")
            raise

    @staticmethod
    def extract_pytorch_architecture(model: Any) -> Optional[Dict]:
        """
        Extract architecture information from PyTorch model.
        
        Args:
            model: PyTorch model
            
        Returns:
            Architecture dictionary or None
        """
        try:
            import torch.nn as nn

            if isinstance(model, dict):
                # State dict - can't extract architecture
                return None

            layers = []
            total_params = 0
            trainable_params = 0

            # Iterate through model modules
            for name, module in model.named_modules():
                if len(list(module.children())) == 0:  # Leaf module
                    # Count parameters
                    params = sum(p.numel() for p in module.parameters())
                    trainable = sum(p.numel() for p in module.parameters() if p.requires_grad)

                    total_params += params
                    trainable_params += trainable

                    # Get module type
                    module_type = type(module).__name__

                    layers.append({
                        "id": name or f"layer_{len(layers)}",
                        "name": module_type,
                        "type": module_type.lower(),
                        "params": params,
                        "trainable": trainable > 0,
                    })

            return {
                "layers": layers,
                "total_params": total_params,
                "trainable_params": trainable_params,
                "non_trainable_params": total_params - trainable_params,
            }

        except Exception as e:
            logger.error(f"Error extracting PyTorch architecture: {e}")
            return None

    @staticmethod
    def extract_tensorflow_architecture(model: Any) -> Optional[Dict]:
        """
        Extract architecture information from TensorFlow/Keras model.
        
        Args:
            model: TensorFlow/Keras model
            
        Returns:
            Architecture dictionary or None
        """
        try:
            layers = []

            for layer in model.layers:
                layer_config = layer.get_config()
                
                layers.append({
                    "id": layer.name,
                    "name": layer.__class__.__name__,
                    "type": layer.__class__.__name__.lower(),
                    "input_shape": list(layer.input_shape) if hasattr(layer, "input_shape") else None,
                    "output_shape": list(layer.output_shape) if hasattr(layer, "output_shape") else None,
                    "params": layer.count_params(),
                    "config": layer_config,
                })

            # Get total parameters
            total_params = model.count_params()
            trainable_params = sum(
                [layer.count_params() for layer in model.layers if layer.trainable]
            )

            return {
                "layers": layers,
                "total_params": total_params,
                "trainable_params": trainable_params,
                "non_trainable_params": total_params - trainable_params,
            }

        except Exception as e:
            logger.error(f"Error extracting TensorFlow architecture: {e}")
            return None

    @staticmethod
    def load_model(
        file_path: str, framework: Optional[Framework] = None, device: str = "cpu"
    ) -> Tuple[Any, Dict]:
        """
        Load a model from any supported framework.
        
        Args:
            file_path: Path to the model file
            framework: Framework to use (auto-detected if None)
            device: Device to load model on (for PyTorch)
            
        Returns:
            Tuple of (model, metadata)
        """
        # Auto-detect framework if not provided
        if framework is None:
            framework = ModelLoader.detect_framework(file_path)
            if framework is None:
                raise ValueError(f"Could not detect framework from file: {file_path}")

        # Load based on framework
        if framework == Framework.PYTORCH:
            return ModelLoader.load_pytorch_model(file_path, device)
        elif framework == Framework.TENSORFLOW:
            return ModelLoader.load_tensorflow_model(file_path)
        elif framework == Framework.KERAS:
            return ModelLoader.load_keras_model(file_path)
        elif framework == Framework.ONNX:
            return ModelLoader.load_onnx_model(file_path)
        else:
            raise ValueError(f"Unsupported framework: {framework}")

    @staticmethod
    def extract_architecture(model: Any, framework: Framework) -> Optional[Dict]:
        """
        Extract architecture from a loaded model.
        
        Args:
            model: Loaded model
            framework: Model framework
            
        Returns:
            Architecture dictionary or None
        """
        if framework == Framework.PYTORCH:
            return ModelLoader.extract_pytorch_architecture(model)
        elif framework in [Framework.TENSORFLOW, Framework.KERAS]:
            return ModelLoader.extract_tensorflow_architecture(model)
        else:
            logger.warning(f"Architecture extraction not supported for {framework}")
            return None

# Made with Bob
