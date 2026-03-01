"""
PyTorch inference engine implementation.

Provides inference capabilities for PyTorch models with GPU/CPU support.
"""

import time
from typing import Any, Dict, List, Optional, Union
import numpy as np

from .base_engine import BaseInferenceEngine, InferenceResult


class PyTorchInferenceEngine(BaseInferenceEngine):
    """
    Inference engine for PyTorch models.
    
    Supports both CPU and GPU inference with automatic device management.
    """
    
    def __init__(
        self,
        model: Any,
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
    ):
        """
        Initialize PyTorch inference engine.
        
        Args:
            model: PyTorch model (nn.Module)
            device: Device to run inference on ('cpu' or 'cuda')
            class_names: Optional list of class names
        """
        super().__init__(model, device, class_names)
        self._setup_model()
    
    def _validate_device(self) -> None:
        """Validate that the specified device is available."""
        try:
            import torch
            
            if self.device.startswith("cuda"):
                if not torch.cuda.is_available():
                    print(f"Warning: CUDA not available, falling back to CPU")
                    self.device = "cpu"
                else:
                    # Validate specific GPU index if provided
                    if ":" in self.device:
                        gpu_id = int(self.device.split(":")[1])
                        if gpu_id >= torch.cuda.device_count():
                            print(f"Warning: GPU {gpu_id} not available, using GPU 0")
                            self.device = "cuda:0"
        except ImportError:
            raise ImportError("PyTorch is not installed. Install with: pip install torch")
    
    def _setup_model(self) -> None:
        """Setup model for inference."""
        import torch
        
        # Move model to device
        self.model = self.model.to(self.device)
        
        # Set to evaluation mode
        self.model.eval()
        
        # Disable gradient computation
        torch.set_grad_enabled(False)
    
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
            **kwargs: Additional arguments (e.g., temperature for softmax)
            
        Returns:
            InferenceResult object
        """
        import torch
        
        start_time = time.time()
        
        # Convert to tensor
        if isinstance(inputs, list):
            inputs = np.array(inputs)
        
        input_tensor = torch.from_numpy(inputs).float().to(self.device)
        
        # Add batch dimension if needed
        if input_tensor.ndim == 3:  # (C, H, W)
            input_tensor = input_tensor.unsqueeze(0)
        
        preprocessing_time = time.time() - start_time
        
        # Run inference
        inference_start = time.time()
        with torch.no_grad():
            outputs = self.model(input_tensor)
        
        inference_time = time.time() - inference_start
        
        # Post-process outputs
        postprocessing_start = time.time()
        
        # Convert to numpy
        predictions = self._ensure_numpy(outputs)
        
        # Apply softmax if needed
        if kwargs.get("apply_softmax", True) and predictions.ndim >= 2:
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
                "framework": "pytorch",
                "device": self.device,
                "input_shape": list(input_tensor.shape),
                "output_shape": list(outputs.shape),
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
        import torch
        
        results = []
        
        # Process in batches
        for i in range(0, len(inputs), batch_size):
            batch = inputs[i:i + batch_size]
            
            # Stack batch
            batch_array = np.stack(batch)
            
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
        import torch
        
        # Count parameters
        total_params = sum(p.numel() for p in self.model.parameters())
        trainable_params = sum(p.numel() for p in self.model.parameters() if p.requires_grad)
        
        # Get model structure info
        layers = []
        for name, module in self.model.named_modules():
            if len(list(module.children())) == 0:  # Leaf modules only
                layers.append({
                    "name": name,
                    "type": module.__class__.__name__,
                })
        
        return {
            "framework": "pytorch",
            "device": self.device,
            "total_parameters": total_params,
            "trainable_parameters": trainable_params,
            "non_trainable_parameters": total_params - trainable_params,
            "num_layers": len(layers),
            "model_class": self.model.__class__.__name__,
            "cuda_available": torch.cuda.is_available(),
            "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        }
    
    def get_device_info(self) -> Dict[str, Any]:
        """
        Get detailed device information.
        
        Returns:
            Dictionary containing device information
        """
        import torch
        
        info = super().get_device_info()
        
        if torch.cuda.is_available() and self.device.startswith("cuda"):
            gpu_id = 0 if ":" not in self.device else int(self.device.split(":")[1])
            info.update({
                "gpu_name": torch.cuda.get_device_name(gpu_id),
                "gpu_memory_allocated": torch.cuda.memory_allocated(gpu_id) / 1024**3,  # GB
                "gpu_memory_reserved": torch.cuda.memory_reserved(gpu_id) / 1024**3,  # GB
                "gpu_memory_total": torch.cuda.get_device_properties(gpu_id).total_memory / 1024**3,  # GB
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
    
    def extract_features(
        self,
        inputs: np.ndarray,
        layer_name: Optional[str] = None
    ) -> np.ndarray:
        """
        Extract features from a specific layer.
        
        Args:
            inputs: Input data
            layer_name: Name of layer to extract features from
            
        Returns:
            Feature maps as numpy array
        """
        import torch
        
        features = []
        
        def hook_fn(module, input, output):
            features.append(output)
        
        # Register hook
        if layer_name:
            layer = dict(self.model.named_modules())[layer_name]
            handle = layer.register_forward_hook(hook_fn)
        else:
            # Use last layer before classifier
            handle = None
            for name, module in self.model.named_modules():
                if isinstance(module, (torch.nn.Linear, torch.nn.Conv2d)):
                    handle = module.register_forward_hook(hook_fn)
        
        # Run forward pass
        input_tensor = torch.from_numpy(inputs).float().to(self.device)
        if input_tensor.ndim == 3:
            input_tensor = input_tensor.unsqueeze(0)
        
        with torch.no_grad():
            _ = self.model(input_tensor)
        
        # Remove hook
        if handle:
            handle.remove()
        
        # Return features
        if features:
            return self._ensure_numpy(features[0])
        return None

# Made with Bob
