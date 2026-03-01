"""
Saliency Map implementation.

Provides visual explanations by computing gradients of the output with respect
to the input, showing which pixels most influence the prediction.
Reference: Simonyan et al. "Deep Inside Convolutional Networks: Visualising
Image Classification Models and Saliency Maps" (2013)
"""

import time
from typing import Any, Dict, Optional, Union
import numpy as np

from .base_explainer import BaseExplainer, ExplainabilityResult


class SaliencyMap(BaseExplainer):
    """
    Saliency Map explainability method.
    
    Computes the gradient of the target class score with respect to the input
    image, highlighting pixels that have the most influence on the prediction.
    """
    
    def __init__(
        self,
        model: Any,
        device: str = "cpu",
        class_names: Optional[list] = None,
        framework: str = "pytorch",
    ):
        """
        Initialize Saliency Map explainer.
        
        Args:
            model: The model to explain
            device: Device to run computations on
            class_names: Optional list of class names
            framework: Framework ('pytorch' or 'tensorflow')
        """
        super().__init__(model, device, class_names)
        self.framework = framework.lower()
    
    def explain(
        self,
        input_data: np.ndarray,
        target_class: Optional[int] = None,
        absolute: bool = True,
        **kwargs
    ) -> ExplainabilityResult:
        """
        Generate saliency map explanation.
        
        Args:
            input_data: Input data to explain (C, H, W) or (H, W, C)
            target_class: Target class to explain (None for predicted class)
            absolute: Whether to take absolute value of gradients
            **kwargs: Additional arguments
            
        Returns:
            ExplainabilityResult object
        """
        start_time = time.time()
        
        if self.framework == "pytorch":
            result = self._explain_pytorch(input_data, target_class, absolute, **kwargs)
        elif self.framework == "tensorflow":
            result = self._explain_tensorflow(input_data, target_class, absolute, **kwargs)
        else:
            raise ValueError(f"Unsupported framework: {self.framework}")
        
        result.computation_time = time.time() - start_time
        result.method = "Saliency Map"
        
        return result
    
    def _explain_pytorch(
        self,
        input_data: np.ndarray,
        target_class: Optional[int] = None,
        absolute: bool = True,
        **kwargs
    ) -> ExplainabilityResult:
        """Generate saliency map for PyTorch model."""
        import torch
        
        # Prepare input
        input_tensor = torch.from_numpy(input_data).float().to(self.device)
        if input_tensor.ndim == 3:
            input_tensor = input_tensor.unsqueeze(0)
        
        input_tensor.requires_grad = True
        
        # Forward pass
        self.model.eval()
        output = self.model(input_tensor)
        
        # Get predicted class if not specified
        if target_class is None:
            target_class = output.argmax(dim=1).item()
        
        # Get confidence
        probs = torch.softmax(output, dim=1)
        confidence = probs[0, target_class].item()
        
        # Backward pass
        self.model.zero_grad()
        output[0, target_class].backward()
        
        # Get gradients
        gradients = input_tensor.grad[0]  # (C, H, W)
        
        # Convert to numpy
        saliency = gradients.cpu().numpy()
        
        # Take absolute value if requested
        if absolute:
            saliency = np.abs(saliency)
        
        # Aggregate across channels (max or mean)
        aggregation = kwargs.get("aggregation", "max")
        if aggregation == "max":
            saliency_map = np.max(saliency, axis=0)
        elif aggregation == "mean":
            saliency_map = np.mean(saliency, axis=0)
        elif aggregation == "l2":
            saliency_map = np.sqrt(np.sum(saliency ** 2, axis=0))
        else:
            saliency_map = np.max(saliency, axis=0)
        
        # Normalize
        heatmap = self.normalize_heatmap(saliency_map)
        
        # Prepare original image for visualization
        original_image = input_data
        if original_image.shape[0] == 3:  # (C, H, W)
            original_image = np.transpose(original_image, (1, 2, 0))  # (H, W, C)
        
        return ExplainabilityResult(
            attribution_map=saliency,
            heatmap=heatmap,
            original_image=original_image,
            predicted_class=target_class,
            predicted_class_name=self.get_class_name(target_class),
            confidence=confidence,
        )
    
    def _explain_tensorflow(
        self,
        input_data: np.ndarray,
        target_class: Optional[int] = None,
        absolute: bool = True,
        **kwargs
    ) -> ExplainabilityResult:
        """Generate saliency map for TensorFlow model."""
        import tensorflow as tf
        
        # Prepare input
        input_tensor = tf.convert_to_tensor(input_data, dtype=tf.float32)
        if input_tensor.ndim == 3:
            input_tensor = tf.expand_dims(input_tensor, 0)
        
        # Forward pass with gradient tape
        with tf.GradientTape() as tape:
            tape.watch(input_tensor)
            predictions = self.model(input_tensor)
            
            # Get predicted class if not specified
            if target_class is None:
                target_class = tf.argmax(predictions[0]).numpy()
            
            # Get target class output
            target_output = predictions[:, target_class]
        
        # Compute gradients
        gradients = tape.gradient(target_output, input_tensor)
        
        # Get confidence
        probs = tf.nn.softmax(predictions)
        confidence = probs[0, target_class].numpy()
        
        # Convert to numpy
        saliency = gradients[0].numpy()  # (H, W, C) or (C, H, W)
        
        # Take absolute value if requested
        if absolute:
            saliency = np.abs(saliency)
        
        # Aggregate across channels
        aggregation = kwargs.get("aggregation", "max")
        if saliency.shape[-1] == 3 or saliency.shape[-1] == 1:  # (H, W, C)
            if aggregation == "max":
                saliency_map = np.max(saliency, axis=-1)
            elif aggregation == "mean":
                saliency_map = np.mean(saliency, axis=-1)
            elif aggregation == "l2":
                saliency_map = np.sqrt(np.sum(saliency ** 2, axis=-1))
            else:
                saliency_map = np.max(saliency, axis=-1)
        else:  # (C, H, W)
            if aggregation == "max":
                saliency_map = np.max(saliency, axis=0)
            elif aggregation == "mean":
                saliency_map = np.mean(saliency, axis=0)
            elif aggregation == "l2":
                saliency_map = np.sqrt(np.sum(saliency ** 2, axis=0))
            else:
                saliency_map = np.max(saliency, axis=0)
        
        # Normalize
        heatmap = self.normalize_heatmap(saliency_map)
        
        # Prepare original image
        original_image = input_data
        
        return ExplainabilityResult(
            attribution_map=saliency,
            heatmap=heatmap,
            original_image=original_image,
            predicted_class=int(target_class),
            predicted_class_name=self.get_class_name(int(target_class)),
            confidence=float(confidence),
        )
    
    def explain_batch(
        self,
        input_batch: np.ndarray,
        target_classes: Optional[list] = None,
        absolute: bool = True,
        **kwargs
    ) -> list:
        """
        Generate saliency maps for a batch of inputs.
        
        Args:
            input_batch: Batch of input data (B, C, H, W) or (B, H, W, C)
            target_classes: List of target classes (None for predicted classes)
            absolute: Whether to take absolute value of gradients
            **kwargs: Additional arguments
            
        Returns:
            List of ExplainabilityResult objects
        """
        results = []
        
        for i in range(len(input_batch)):
            target_class = target_classes[i] if target_classes else None
            result = self.explain(input_batch[i], target_class, absolute, **kwargs)
            results.append(result)
        
        return results
    
    def explain_smooth(
        self,
        input_data: np.ndarray,
        target_class: Optional[int] = None,
        num_samples: int = 50,
        noise_level: float = 0.1,
        absolute: bool = True,
        **kwargs
    ) -> ExplainabilityResult:
        """
        Generate smooth saliency map using SmoothGrad technique.
        
        SmoothGrad averages saliency maps computed on noisy versions of the input
        to reduce noise and produce smoother visualizations.
        
        Args:
            input_data: Input data to explain
            target_class: Target class to explain
            num_samples: Number of noisy samples to average
            noise_level: Standard deviation of Gaussian noise
            absolute: Whether to take absolute value of gradients
            **kwargs: Additional arguments
            
        Returns:
            ExplainabilityResult object
        """
        # Generate noisy samples
        noise_samples = []
        for _ in range(num_samples):
            noise = np.random.normal(0, noise_level, input_data.shape)
            noisy_input = input_data + noise
            noise_samples.append(noisy_input)
        
        # Compute saliency for each sample
        saliency_maps = []
        for noisy_input in noise_samples:
            result = self.explain(noisy_input, target_class, absolute, **kwargs)
            saliency_maps.append(result.attribution_map)
        
        # Average saliency maps
        smooth_saliency = np.mean(saliency_maps, axis=0)
        
        # Aggregate across channels
        aggregation = kwargs.get("aggregation", "max")
        if smooth_saliency.ndim == 3:
            if aggregation == "max":
                saliency_map = np.max(smooth_saliency, axis=0)
            elif aggregation == "mean":
                saliency_map = np.mean(smooth_saliency, axis=0)
            elif aggregation == "l2":
                saliency_map = np.sqrt(np.sum(smooth_saliency ** 2, axis=0))
            else:
                saliency_map = np.max(smooth_saliency, axis=0)
        else:
            saliency_map = smooth_saliency
        
        # Normalize
        heatmap = self.normalize_heatmap(saliency_map)
        
        # Prepare original image
        original_image = input_data
        if original_image.shape[0] == 3:  # (C, H, W)
            original_image = np.transpose(original_image, (1, 2, 0))  # (H, W, C)
        
        # Get prediction info from first sample
        first_result = self.explain(input_data, target_class, absolute, **kwargs)
        
        return ExplainabilityResult(
            attribution_map=smooth_saliency,
            heatmap=heatmap,
            original_image=original_image,
            predicted_class=first_result.predicted_class,
            predicted_class_name=first_result.predicted_class_name,
            confidence=first_result.confidence,
            metadata={
                "num_samples": num_samples,
                "noise_level": noise_level,
                "smoothgrad": True,
            }
        )

# Made with Bob
