"""
TensorFlow/Keras inference engine implementation.

Provides inference capabilities for TensorFlow and Keras models.
"""

import time
from typing import Any, Dict, List, Optional, Union
import numpy as np

from .base_engine import BaseInferenceEngine, InferenceResult


class TensorFlowInferenceEngine(BaseInferenceEngine):
    """
    Inference engine for TensorFlow/Keras models.
    
    Supports both CPU and GPU inference with automatic device management.
    """
    
    def __init__(
        self,
        model: Any,
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
    ):
        """
        Initialize TensorFlow inference engine.
        
        Args:
            model: TensorFlow/Keras model
            device: Device to run inference on ('cpu' or 'cuda')
            class_names: Optional list of class names
        """
        super().__init__(model, device, class_names)
        self._setup_model()
    
    def _validate_device(self) -> None:
        """Validate that the specified device is available."""
        try:
            import tensorflow as tf
            
            # Check GPU availability
            gpus = tf.config.list_physical_devices('GPU')
            
            if self.device.startswith("cuda") or self.device.startswith("gpu"):
                if not gpus:
                    print(f"Warning: No GPU available, falling back to CPU")
                    self.device = "cpu"
                else:
                    # Set memory growth to avoid OOM
                    for gpu in gpus:
                        try:
                            tf.config.experimental.set_memory_growth(gpu, True)
                        except RuntimeError as e:
                            print(f"Warning: Could not set memory growth: {e}")
                    
                    # Use first GPU by default
                    self.device = "gpu:0"
            else:
                self.device = "cpu"
                
        except ImportError:
            raise ImportError("TensorFlow is not installed. Install with: pip install tensorflow")
    
    def _setup_model(self) -> None:
        """Setup model for inference."""
        import tensorflow as tf
        
        # Set device context
        if self.device.startswith("cpu"):
            self.device_context = tf.device('/CPU:0')
        else:
            gpu_id = 0 if ":" not in self.device else int(self.device.split(":")[1])
            self.device_context = tf.device(f'/GPU:{gpu_id}')
    
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
        import tensorflow as tf
        
        start_time = time.time()
        
        # Convert to numpy if needed
        if isinstance(inputs, list):
            inputs = np.array(inputs)
        
        # Ensure float32
        inputs = inputs.astype(np.float32)
        
        # Add batch dimension if needed
        if inputs.ndim == 3:  # (H, W, C) or (C, H, W)
            inputs = np.expand_dims(inputs, axis=0)
        
        preprocessing_time = time.time() - start_time
        
        # Run inference
        inference_start = time.time()
        with self.device_context:
            predictions = self.model.predict(inputs, verbose=0)
        
        inference_time = time.time() - inference_start
        
        # Post-process outputs
        postprocessing_start = time.time()
        
        # Ensure numpy array
        if hasattr(predictions, 'numpy'):
            predictions = predictions.numpy()
        
        # Apply softmax if needed (TensorFlow models often output logits)
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
                "framework": "tensorflow",
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
        import tensorflow as tf
        
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
        import tensorflow as tf
        
        # Count parameters
        total_params = self.model.count_params()
        
        # Get trainable/non-trainable split
        trainable_params = sum([tf.size(w).numpy() for w in self.model.trainable_weights])
        non_trainable_params = total_params - trainable_params
        
        # Get layer information
        layers = []
        for layer in self.model.layers:
            layers.append({
                "name": layer.name,
                "type": layer.__class__.__name__,
                "output_shape": str(layer.output_shape) if hasattr(layer, 'output_shape') else None,
            })
        
        return {
            "framework": "tensorflow",
            "device": self.device,
            "total_parameters": int(total_params),
            "trainable_parameters": int(trainable_params),
            "non_trainable_parameters": int(non_trainable_params),
            "num_layers": len(self.model.layers),
            "model_class": self.model.__class__.__name__,
            "input_shape": str(self.model.input_shape) if hasattr(self.model, 'input_shape') else None,
            "output_shape": str(self.model.output_shape) if hasattr(self.model, 'output_shape') else None,
            "gpu_available": len(tf.config.list_physical_devices('GPU')) > 0,
            "gpu_count": len(tf.config.list_physical_devices('GPU')),
        }
    
    def get_device_info(self) -> Dict[str, Any]:
        """
        Get detailed device information.
        
        Returns:
            Dictionary containing device information
        """
        import tensorflow as tf
        
        info = super().get_device_info()
        
        gpus = tf.config.list_physical_devices('GPU')
        if gpus and self.device.startswith("gpu"):
            gpu_id = 0 if ":" not in self.device else int(self.device.split(":")[1])
            if gpu_id < len(gpus):
                gpu_details = tf.config.experimental.get_device_details(gpus[gpu_id])
                info.update({
                    "gpu_name": gpu_details.get('device_name', 'Unknown'),
                    "compute_capability": gpu_details.get('compute_capability', 'Unknown'),
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
        import tensorflow as tf
        from tensorflow import keras
        
        # Ensure correct input format
        if inputs.ndim == 3:
            inputs = np.expand_dims(inputs, axis=0)
        inputs = inputs.astype(np.float32)
        
        # Get layer
        if layer_name:
            layer = self.model.get_layer(layer_name)
        else:
            # Use last convolutional or dense layer
            for layer in reversed(self.model.layers):
                if isinstance(layer, (keras.layers.Conv2D, keras.layers.Dense)):
                    break
        
        # Create feature extraction model
        feature_model = keras.Model(
            inputs=self.model.input,
            outputs=layer.output
        )
        
        # Extract features
        with self.device_context:
            features = feature_model.predict(inputs, verbose=0)
        
        return features

# Made with Bob
