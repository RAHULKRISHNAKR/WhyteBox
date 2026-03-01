"""
ONNX inference engine implementation.

Provides inference capabilities for ONNX models with ONNX Runtime.
"""

import time
from typing import Any, Dict, List, Optional, Union
import numpy as np

from .base_engine import BaseInferenceEngine, InferenceResult


class ONNXInferenceEngine(BaseInferenceEngine):
    """
    Inference engine for ONNX models.
    
    Uses ONNX Runtime for efficient inference on CPU and GPU.
    """
    
    def __init__(
        self,
        model: Any,
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
    ):
        """
        Initialize ONNX inference engine.
        
        Args:
            model: ONNX Runtime InferenceSession
            device: Device to run inference on ('cpu' or 'cuda')
            class_names: Optional list of class names
        """
        super().__init__(model, device, class_names)
        self._setup_model()
    
    def _validate_device(self) -> None:
        """Validate that the specified device is available."""
        try:
            import onnxruntime as ort
            
            # Check available providers
            available_providers = ort.get_available_providers()
            
            if self.device.startswith("cuda") or self.device.startswith("gpu"):
                if 'CUDAExecutionProvider' not in available_providers:
                    print(f"Warning: CUDA provider not available, falling back to CPU")
                    self.device = "cpu"
                else:
                    self.device = "cuda"
            else:
                self.device = "cpu"
                
        except ImportError:
            raise ImportError("ONNX Runtime is not installed. Install with: pip install onnxruntime or onnxruntime-gpu")
    
    def _setup_model(self) -> None:
        """Setup model for inference."""
        import onnxruntime as ort
        
        # Get input/output names
        self.input_name = self.model.get_inputs()[0].name
        self.output_name = self.model.get_outputs()[0].name
        
        # Get input shape
        self.input_shape = self.model.get_inputs()[0].shape
        
        # Store session options
        self.sess_options = self.model.get_session_options()
    
    def predict(
        self,
        inputs: Union[np.ndarray, List[np.ndarray]],
        batch_size: Optional[int] = None,
        return_top_k: int = 5,
        **kwargs
    ) -> InferenceResult:
        """
        Run inference on input data.
        
        Args:
            inputs: Input data as numpy array
            batch_size: Batch size (unused for single prediction)
            return_top_k: Number of top predictions to return
            **kwargs: Additional arguments
            
        Returns:
            InferenceResult object
        """
        start_time = time.time()
        
        # Convert to numpy if needed
        if isinstance(inputs, list):
            inputs = np.array(inputs)
        
        # Ensure float32
        inputs = inputs.astype(np.float32)
        
        # Add batch dimension if needed
        if inputs.ndim == 3:
            inputs = np.expand_dims(inputs, axis=0)
        
        preprocessing_time = time.time() - start_time
        
        # Run inference
        inference_start = time.time()
        predictions = self.model.run(
            [self.output_name],
            {self.input_name: inputs}
        )[0]
        
        inference_time = time.time() - inference_start
        
        # Post-process outputs
        postprocessing_start = time.time()
        
        # Apply softmax if needed
        if kwargs.get("apply_softmax", False):
            predictions = self._apply_softmax(predictions)
        
        # Get top-k predictions
        class_indices, confidence_scores, class_names = self._get_top_k_predictions(
            predictions, k=return_top_k, class_names=self.class_names
        )
        
        postprocessing_time = time.time() - postprocessing_start
        
        # Create result
        result = InferenceResult(
            predictions=predictions,
            class_indices=class_indices[0] if class_indices.ndim > 1 else class_indices,
            class_names=class_names[0] if class_names else None,
            confidence_scores=confidence_scores[0] if confidence_scores.ndim > 1 else confidence_scores,
            inference_time=inference_time,
            preprocessing_time=preprocessing_time,
            postprocessing_time=postprocessing_time,
            metadata={
                "framework": "onnx",
                "device": self.device,
                "input_shape": list(inputs.shape),
                "output_shape": list(predictions.shape),
            }
        )
        
        return result
    
    def predict_batch(
        self,
        inputs: List[np.ndarray],
        batch_size: int = 32,
        return_top_k: int = 5,
        **kwargs
    ) -> List[InferenceResult]:
        """
        Run batch inference on multiple inputs.
        
        Args:
            inputs: List of input arrays
            batch_size: Batch size for processing
            return_top_k: Number of top predictions to return
            **kwargs: Additional arguments
            
        Returns:
            List of InferenceResult objects
        """
        results = []
        
        # Process in batches
        for i in range(0, len(inputs), batch_size):
            batch = inputs[i:i + batch_size]
            
            # Stack batch
            batch_array = np.stack(batch).astype(np.float32)
            
            # Run inference
            result = self.predict(
                batch_array,
                return_top_k=return_top_k,
                **kwargs
            )
            
            # Split batch results
            for j in range(len(batch)):
                single_result = InferenceResult(
                    predictions=result.predictions[j] if result.predictions.ndim > 1 else result.predictions,
                    class_indices=result.class_indices[j] if hasattr(result.class_indices, '__len__') else result.class_indices,
                    class_names=result.class_names[j] if result.class_names and len(result.class_names) > j else None,
                    confidence_scores=result.confidence_scores[j] if result.confidence_scores.ndim > 1 else result.confidence_scores,
                    inference_time=result.inference_time / len(batch),
                    preprocessing_time=result.preprocessing_time / len(batch),
                    postprocessing_time=result.postprocessing_time / len(batch),
                    metadata=result.metadata.copy()
                )
                results.append(single_result)
        
        return results
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded model.
        
        Returns:
            Dictionary containing model metadata
        """
        import onnxruntime as ort
        
        # Get input/output information
        inputs_info = []
        for inp in self.model.get_inputs():
            inputs_info.append({
                "name": inp.name,
                "shape": inp.shape,
                "type": inp.type,
            })
        
        outputs_info = []
        for out in self.model.get_outputs():
            outputs_info.append({
                "name": out.name,
                "shape": out.shape,
                "type": out.type,
            })
        
        # Get providers
        providers = self.model.get_providers()
        
        return {
            "framework": "onnx",
            "device": self.device,
            "inputs": inputs_info,
            "outputs": outputs_info,
            "providers": providers,
            "available_providers": ort.get_available_providers(),
        }
    
    def get_device_info(self) -> Dict[str, Any]:
        """
        Get detailed device information.
        
        Returns:
            Dictionary containing device information
        """
        import onnxruntime as ort
        
        info = super().get_device_info()
        
        info.update({
            "providers": self.model.get_providers(),
            "available_providers": ort.get_available_providers(),
        })
        
        return info
    
    @staticmethod
    def _apply_softmax(predictions: np.ndarray, temperature: float = 1.0) -> np.ndarray:
        """
        Apply softmax to predictions.
        
        Args:
            predictions: Raw model outputs
            temperature: Temperature for softmax (default: 1.0)
            
        Returns:
            Softmax probabilities
        """
        # Apply temperature scaling
        predictions = predictions / temperature
        
        # Subtract max for numerical stability
        predictions = predictions - np.max(predictions, axis=-1, keepdims=True)
        
        # Compute softmax
        exp_predictions = np.exp(predictions)
        return exp_predictions / np.sum(exp_predictions, axis=-1, keepdims=True)
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Get ONNX model metadata.
        
        Returns:
            Dictionary containing model metadata
        """
        metadata = {}
        
        # Get model metadata
        model_meta = self.model.get_modelmeta()
        
        if model_meta:
            metadata.update({
                "producer_name": model_meta.producer_name,
                "graph_name": model_meta.graph_name,
                "domain": model_meta.domain,
                "description": model_meta.description,
                "version": model_meta.version,
            })
        
        return metadata

# Made with Bob
