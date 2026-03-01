"""
Base inference engine interface.

Defines the contract that all framework-specific inference engines must implement.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union
import numpy as np
from datetime import datetime


@dataclass
class InferenceResult:
    """
    Standardized inference result across all frameworks.
    
    Attributes:
        predictions: Model predictions (probabilities, logits, or raw outputs)
        class_indices: Predicted class indices (for classification)
        class_names: Predicted class names (if available)
        confidence_scores: Confidence scores for predictions
        inference_time: Time taken for inference in seconds
        preprocessing_time: Time taken for preprocessing in seconds
        postprocessing_time: Time taken for postprocessing in seconds
        metadata: Additional metadata about the inference
    """
    predictions: np.ndarray
    class_indices: Optional[np.ndarray] = None
    class_names: Optional[List[str]] = None
    confidence_scores: Optional[np.ndarray] = None
    inference_time: float = 0.0
    preprocessing_time: float = 0.0
    postprocessing_time: float = 0.0
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        self.metadata["timestamp"] = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary format."""
        return {
            "predictions": self.predictions.tolist() if isinstance(self.predictions, np.ndarray) else self.predictions,
            "class_indices": self.class_indices.tolist() if self.class_indices is not None else None,
            "class_names": self.class_names,
            "confidence_scores": self.confidence_scores.tolist() if self.confidence_scores is not None else None,
            "inference_time": self.inference_time,
            "preprocessing_time": self.preprocessing_time,
            "postprocessing_time": self.postprocessing_time,
            "total_time": self.inference_time + self.preprocessing_time + self.postprocessing_time,
            "metadata": self.metadata,
        }


class BaseInferenceEngine(ABC):
    """
    Abstract base class for inference engines.
    
    All framework-specific engines must inherit from this class and implement
    the required methods.
    """
    
    def __init__(
        self,
        model: Any,
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
    ):
        """
        Initialize the inference engine.
        
        Args:
            model: The loaded model object
            device: Device to run inference on ('cpu' or 'cuda')
            class_names: Optional list of class names for classification tasks
        """
        self.model = model
        self.device = device
        self.class_names = class_names
        self._validate_device()
    
    @abstractmethod
    def _validate_device(self) -> None:
        """Validate that the specified device is available."""
        pass
    
    @abstractmethod
    def predict(
        self,
        inputs: Union[np.ndarray, List[np.ndarray]],
        batch_size: Optional[int] = None,
        **kwargs
    ) -> InferenceResult:
        """
        Run inference on the input data.
        
        Args:
            inputs: Input data (single sample or batch)
            batch_size: Batch size for batch inference
            **kwargs: Additional framework-specific arguments
            
        Returns:
            InferenceResult object containing predictions and metadata
        """
        pass
    
    @abstractmethod
    def predict_batch(
        self,
        inputs: List[np.ndarray],
        batch_size: int = 32,
        **kwargs
    ) -> List[InferenceResult]:
        """
        Run batch inference on multiple inputs.
        
        Args:
            inputs: List of input samples
            batch_size: Batch size for processing
            **kwargs: Additional framework-specific arguments
            
        Returns:
            List of InferenceResult objects
        """
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded model.
        
        Returns:
            Dictionary containing model metadata
        """
        pass
    
    def warmup(self, input_shape: tuple, num_iterations: int = 3) -> float:
        """
        Warm up the model by running dummy inferences.
        
        Args:
            input_shape: Shape of input tensor for warmup
            num_iterations: Number of warmup iterations
            
        Returns:
            Average warmup time in seconds
        """
        import time
        
        dummy_input = np.random.randn(*input_shape).astype(np.float32)
        times = []
        
        for _ in range(num_iterations):
            start = time.time()
            self.predict(dummy_input)
            times.append(time.time() - start)
        
        return sum(times) / len(times)
    
    def get_device_info(self) -> Dict[str, Any]:
        """
        Get information about the device being used.
        
        Returns:
            Dictionary containing device information
        """
        return {
            "device": self.device,
            "device_type": "GPU" if "cuda" in self.device.lower() else "CPU",
        }
    
    @staticmethod
    def _ensure_numpy(data: Any) -> np.ndarray:
        """
        Ensure data is in numpy array format.
        
        Args:
            data: Input data in any format
            
        Returns:
            Data as numpy array
        """
        if isinstance(data, np.ndarray):
            return data
        elif hasattr(data, "numpy"):
            return data.numpy()
        elif hasattr(data, "cpu"):
            return data.cpu().numpy()
        else:
            return np.array(data)
    
    @staticmethod
    def _get_top_k_predictions(
        predictions: np.ndarray,
        k: int = 5,
        class_names: Optional[List[str]] = None
    ) -> tuple:
        """
        Get top-k predictions from model output.
        
        Args:
            predictions: Model predictions (probabilities or logits)
            k: Number of top predictions to return
            class_names: Optional list of class names
            
        Returns:
            Tuple of (indices, scores, names)
        """
        # Handle batch dimension
        if predictions.ndim == 1:
            predictions = predictions.reshape(1, -1)
        
        # Get top-k indices
        top_k_indices = np.argsort(predictions, axis=-1)[:, -k:][:, ::-1]
        
        # Get corresponding scores
        top_k_scores = np.take_along_axis(predictions, top_k_indices, axis=-1)
        
        # Get class names if available
        top_k_names = None
        if class_names is not None:
            top_k_names = [[class_names[idx] for idx in indices] for indices in top_k_indices]
        
        return top_k_indices, top_k_scores, top_k_names

# Made with Bob
