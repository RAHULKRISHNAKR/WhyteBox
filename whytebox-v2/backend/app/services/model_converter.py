"""
Model Conversion Service

Converts models between different frameworks and formats:
- PyTorch to ONNX
- TensorFlow to ONNX
- PyTorch to TensorFlow.js
- TensorFlow to TensorFlow.js

Author: WhyteBox Team
Date: 2026-02-26
"""

import os
import logging
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
import json

import torch
import torch.nn as nn
import numpy as np

logger = logging.getLogger(__name__)

# Try to import optional dependencies
try:
    import onnx
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logger.warning("ONNX not available. Install with: pip install onnx onnxruntime")

try:
    import tensorflow as tf
    import tensorflowjs as tfjs
    TFJS_AVAILABLE = True
except ImportError:
    TFJS_AVAILABLE = False
    logger.warning("TensorFlow.js not available. Install with: pip install tensorflowjs")


class ModelConverter:
    """
    Convert models between different frameworks and formats.
    
    Supported conversions:
    - PyTorch → ONNX
    - TensorFlow → ONNX
    - PyTorch → TensorFlow.js
    - TensorFlow → TensorFlow.js
    - ONNX → TensorFlow
    """
    
    def __init__(self, output_dir: str = "./converted_models"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def pytorch_to_onnx(
        self,
        model: nn.Module,
        input_shape: Tuple[int, ...],
        output_path: Optional[str] = None,
        opset_version: int = 13,
        dynamic_axes: Optional[Dict] = None,
        input_names: Optional[List[str]] = None,
        output_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Convert PyTorch model to ONNX format.
        
        Args:
            model: PyTorch model
            input_shape: Input tensor shape (e.g., (1, 3, 224, 224))
            output_path: Output file path (auto-generated if None)
            opset_version: ONNX opset version
            dynamic_axes: Dynamic axes for variable input sizes
            input_names: Names for input tensors
            output_names: Names for output tensors
            
        Returns:
            Conversion metadata including file path and model info
        """
        if not ONNX_AVAILABLE:
            raise ImportError("ONNX not available. Install with: pip install onnx onnxruntime")
        
        # Generate output path if not provided
        if output_path is None:
            output_path = self.output_dir / f"model_{id(model)}.onnx"
        else:
            output_path = Path(output_path)
        
        # Set model to eval mode
        model.eval()
        
        # Create dummy input
        dummy_input = torch.randn(*input_shape)
        
        # Default names
        if input_names is None:
            input_names = ["input"]
        if output_names is None:
            output_names = ["output"]
        
        # Default dynamic axes for batch size
        if dynamic_axes is None:
            dynamic_axes = {
                input_names[0]: {0: "batch_size"},
                output_names[0]: {0: "batch_size"}
            }
        
        try:
            # Export to ONNX
            torch.onnx.export(
                model,
                dummy_input,
                str(output_path),
                export_params=True,
                opset_version=opset_version,
                do_constant_folding=True,
                input_names=input_names,
                output_names=output_names,
                dynamic_axes=dynamic_axes
            )
            
            # Verify the model
            onnx_model = onnx.load(str(output_path))
            onnx.checker.check_model(onnx_model)
            
            # Get model info
            model_info = self._get_onnx_model_info(onnx_model)
            
            logger.info(f"Successfully converted PyTorch model to ONNX: {output_path}")
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "format": "onnx",
                "opset_version": opset_version,
                "input_shape": input_shape,
                "model_info": model_info,
                "file_size_mb": output_path.stat().st_size / (1024 * 1024)
            }
        
        except Exception as e:
            logger.error(f"Failed to convert PyTorch model to ONNX: {e}")
            raise
    
    def tensorflow_to_onnx(
        self,
        model_path: str,
        output_path: Optional[str] = None,
        opset_version: int = 13
    ) -> Dict[str, Any]:
        """
        Convert TensorFlow model to ONNX format.
        
        Args:
            model_path: Path to TensorFlow SavedModel
            output_path: Output ONNX file path
            opset_version: ONNX opset version
            
        Returns:
            Conversion metadata
        """
        try:
            import tf2onnx
        except ImportError:
            raise ImportError("tf2onnx not available. Install with: pip install tf2onnx")
        
        if output_path is None:
            output_path = self.output_dir / "model_tf_to_onnx.onnx"
        else:
            output_path = Path(output_path)
        
        try:
            # Convert using tf2onnx
            import subprocess
            cmd = [
                "python", "-m", "tf2onnx.convert",
                "--saved-model", model_path,
                "--output", str(output_path),
                "--opset", str(opset_version)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise RuntimeError(f"Conversion failed: {result.stderr}")
            
            # Verify the model
            onnx_model = onnx.load(str(output_path))
            onnx.checker.check_model(onnx_model)
            
            model_info = self._get_onnx_model_info(onnx_model)
            
            logger.info(f"Successfully converted TensorFlow model to ONNX: {output_path}")
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "format": "onnx",
                "opset_version": opset_version,
                "model_info": model_info,
                "file_size_mb": output_path.stat().st_size / (1024 * 1024)
            }
        
        except Exception as e:
            logger.error(f"Failed to convert TensorFlow model to ONNX: {e}")
            raise
    
    def pytorch_to_tensorflowjs(
        self,
        model: nn.Module,
        input_shape: Tuple[int, ...],
        output_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convert PyTorch model to TensorFlow.js format.
        
        Process: PyTorch → ONNX → TensorFlow → TensorFlow.js
        
        Args:
            model: PyTorch model
            input_shape: Input tensor shape
            output_dir: Output directory for TensorFlow.js model
            
        Returns:
            Conversion metadata
        """
        if not TFJS_AVAILABLE:
            raise ImportError("TensorFlow.js not available")
        
        # Step 1: Convert to ONNX
        with tempfile.NamedTemporaryFile(suffix=".onnx", delete=False) as tmp:
            onnx_path = tmp.name
        
        try:
            onnx_result = self.pytorch_to_onnx(
                model=model,
                input_shape=input_shape,
                output_path=onnx_path
            )
            
            # Step 2: Convert ONNX to TensorFlow.js
            if output_dir is None:
                output_dir = self.output_dir / f"tfjs_model_{id(model)}"
            else:
                output_dir = Path(output_dir)
            
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Use onnx-tf to convert ONNX to TensorFlow SavedModel
            try:
                from onnx_tf.backend import prepare
            except ImportError:
                raise ImportError("onnx-tf not available. Install with: pip install onnx-tf")
            
            onnx_model = onnx.load(onnx_path)
            tf_rep = prepare(onnx_model)
            
            # Save as TensorFlow SavedModel
            tf_model_dir = output_dir / "tf_model"
            tf_rep.export_graph(str(tf_model_dir))
            
            # Convert TensorFlow to TensorFlow.js
            tfjs.converters.convert_tf_saved_model(
                str(tf_model_dir),
                str(output_dir)
            )
            
            logger.info(f"Successfully converted PyTorch model to TensorFlow.js: {output_dir}")
            
            return {
                "status": "success",
                "output_dir": str(output_dir),
                "format": "tensorflowjs",
                "input_shape": input_shape,
                "intermediate_onnx": onnx_result
            }
        
        finally:
            # Cleanup temporary ONNX file
            if os.path.exists(onnx_path):
                os.remove(onnx_path)
    
    def tensorflow_to_tensorflowjs(
        self,
        model_path: str,
        output_dir: Optional[str] = None,
        quantization: bool = False
    ) -> Dict[str, Any]:
        """
        Convert TensorFlow model to TensorFlow.js format.
        
        Args:
            model_path: Path to TensorFlow SavedModel
            output_dir: Output directory for TensorFlow.js model
            quantization: Apply quantization for smaller model size
            
        Returns:
            Conversion metadata
        """
        if not TFJS_AVAILABLE:
            raise ImportError("TensorFlow.js not available")
        
        if output_dir is None:
            output_dir = self.output_dir / "tfjs_model"
        else:
            output_dir = Path(output_dir)
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Convert with optional quantization
            if quantization:
                tfjs.converters.convert_tf_saved_model(
                    model_path,
                    str(output_dir),
                    quantization_dtype_map={'uint8': '*'}
                )
            else:
                tfjs.converters.convert_tf_saved_model(
                    model_path,
                    str(output_dir)
                )
            
            # Get model info
            model_json_path = output_dir / "model.json"
            if model_json_path.exists():
                with open(model_json_path, 'r') as f:
                    model_json = json.load(f)
                
                model_info = {
                    "format": model_json.get("format"),
                    "model_topology": model_json.get("modelTopology", {}).get("class_name"),
                    "weights_manifest": len(model_json.get("weightsManifest", []))
                }
            else:
                model_info = {}
            
            logger.info(f"Successfully converted TensorFlow model to TensorFlow.js: {output_dir}")
            
            return {
                "status": "success",
                "output_dir": str(output_dir),
                "format": "tensorflowjs",
                "quantized": quantization,
                "model_info": model_info
            }
        
        except Exception as e:
            logger.error(f"Failed to convert TensorFlow model to TensorFlow.js: {e}")
            raise
    
    def _get_onnx_model_info(self, onnx_model) -> Dict[str, Any]:
        """Extract information from ONNX model"""
        graph = onnx_model.graph
        
        # Get input/output info
        inputs = []
        for input_tensor in graph.input:
            shape = [dim.dim_value for dim in input_tensor.type.tensor_type.shape.dim]
            inputs.append({
                "name": input_tensor.name,
                "shape": shape,
                "dtype": input_tensor.type.tensor_type.elem_type
            })
        
        outputs = []
        for output_tensor in graph.output:
            shape = [dim.dim_value for dim in output_tensor.type.tensor_type.shape.dim]
            outputs.append({
                "name": output_tensor.name,
                "shape": shape,
                "dtype": output_tensor.type.tensor_type.elem_type
            })
        
        return {
            "inputs": inputs,
            "outputs": outputs,
            "num_nodes": len(graph.node),
            "num_initializers": len(graph.initializer)
        }
    
    def verify_onnx_model(
        self,
        onnx_path: str,
        test_input: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Verify ONNX model can be loaded and run inference.
        
        Args:
            onnx_path: Path to ONNX model
            test_input: Optional test input for inference
            
        Returns:
            Verification results
        """
        if not ONNX_AVAILABLE:
            raise ImportError("ONNX not available")
        
        try:
            # Load and check model
            onnx_model = onnx.load(onnx_path)
            onnx.checker.check_model(onnx_model)
            
            # Create inference session
            session = ort.InferenceSession(onnx_path)
            
            # Get input/output info
            input_info = session.get_inputs()[0]
            output_info = session.get_outputs()[0]
            
            result = {
                "status": "valid",
                "input_name": input_info.name,
                "input_shape": input_info.shape,
                "input_type": input_info.type,
                "output_name": output_info.name,
                "output_shape": output_info.shape,
                "output_type": output_info.type
            }
            
            # Run test inference if input provided
            if test_input is not None:
                outputs = session.run(None, {input_info.name: test_input})
                result["test_inference"] = {
                    "success": True,
                    "output_shape": outputs[0].shape
                }
            
            logger.info(f"ONNX model verification successful: {onnx_path}")
            return result
        
        except Exception as e:
            logger.error(f"ONNX model verification failed: {e}")
            return {
                "status": "invalid",
                "error": str(e)
            }


# Global converter instance
model_converter = ModelConverter()


def get_model_converter() -> ModelConverter:
    """Dependency to get model converter"""
    return model_converter

# Made with Bob
