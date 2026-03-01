"""
Integrated Gradients implementation.

Provides attribution by integrating gradients along a path from a baseline
to the input. Satisfies sensitivity and implementation invariance axioms.

Reference: Sundararajan et al. "Axiomatic Attribution for Deep Networks" (2017)
"""

import time
from typing import Any, Callable, Dict, Optional, Union

import numpy as np

from .base_explainer import BaseExplainer, ExplainabilityResult


class IntegratedGradients(BaseExplainer):
    """
    Integrated Gradients explainability method.

    Computes attributions by integrating gradients along a straight path
    from a baseline (typically zeros or blurred image) to the input.

    Key properties:
    - Sensitivity: If input and baseline differ in one feature and have
      different predictions, that feature gets non-zero attribution
    - Implementation Invariance: Attribution is independent of implementation
      details of the network
    """

    def __init__(
        self,
        model: Any,
        device: str = "cpu",
        class_names: Optional[list] = None,
        framework: str = "pytorch",
    ):
        """
        Initialize Integrated Gradients explainer.

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
        baseline: Optional[np.ndarray] = None,
        num_steps: int = 50,
        **kwargs,
    ) -> ExplainabilityResult:
        """
        Generate Integrated Gradients explanation.

        Args:
            input_data: Input data to explain (C, H, W) or (H, W, C)
            target_class: Target class to explain (None for predicted class)
            baseline: Baseline input (None for zeros)
            num_steps: Number of interpolation steps
            **kwargs: Additional arguments

        Returns:
            ExplainabilityResult object
        """
        start_time = time.time()

        if self.framework == "pytorch":
            result = self._explain_pytorch(input_data, target_class, baseline, num_steps, **kwargs)
        elif self.framework == "tensorflow":
            result = self._explain_tensorflow(
                input_data, target_class, baseline, num_steps, **kwargs
            )
        else:
            raise ValueError(f"Unsupported framework: {self.framework}")

        result.computation_time = time.time() - start_time
        result.method = "Integrated Gradients"
        result.metadata["num_steps"] = num_steps

        return result

    def _explain_pytorch(
        self,
        input_data: np.ndarray,
        target_class: Optional[int] = None,
        baseline: Optional[np.ndarray] = None,
        num_steps: int = 50,
        **kwargs,
    ) -> ExplainabilityResult:
        """Generate Integrated Gradients for PyTorch model."""
        import torch

        # Prepare input
        input_tensor = torch.from_numpy(input_data).float().to(self.device)
        if input_tensor.ndim == 3:
            input_tensor = input_tensor.unsqueeze(0)

        # Create baseline (zeros if not provided)
        if baseline is None:
            baseline_tensor = torch.zeros_like(input_tensor)
        else:
            baseline_tensor = torch.from_numpy(baseline).float().to(self.device)
            if baseline_tensor.ndim == 3:
                baseline_tensor = baseline_tensor.unsqueeze(0)

        # Get predicted class if not specified
        self.model.eval()
        with torch.no_grad():
            output = self.model(input_tensor)

        if target_class is None:
            target_class = output.argmax(dim=1).item()

        # Get confidence
        probs = torch.softmax(output, dim=1)
        confidence = probs[0, target_class].item()

        # Compute integrated gradients
        integrated_grads = self._compute_integrated_gradients_pytorch(
            input_tensor, baseline_tensor, target_class, num_steps
        )

        # Convert to numpy
        attributions = integrated_grads[0].cpu().numpy()  # (C, H, W)

        # Aggregate across channels
        aggregation = kwargs.get("aggregation", "l2")
        if aggregation == "max":
            attribution_map = np.max(np.abs(attributions), axis=0)
        elif aggregation == "mean":
            attribution_map = np.mean(np.abs(attributions), axis=0)
        elif aggregation == "l2":
            attribution_map = np.sqrt(np.sum(attributions**2, axis=0))
        else:
            attribution_map = np.sqrt(np.sum(attributions**2, axis=0))

        # Normalize
        heatmap = self.normalize_heatmap(attribution_map)

        # Prepare original image
        original_image = input_data
        if original_image.shape[0] == 3:  # (C, H, W)
            original_image = np.transpose(original_image, (1, 2, 0))  # (H, W, C)

        return ExplainabilityResult(
            attribution_map=attributions,
            heatmap=heatmap,
            original_image=original_image,
            predicted_class=target_class,
            predicted_class_name=self.get_class_name(target_class),
            confidence=confidence,
        )

    def _compute_integrated_gradients_pytorch(
        self, input_tensor: Any, baseline_tensor: Any, target_class: int, num_steps: int
    ) -> Any:
        """
        Compute integrated gradients for PyTorch.

        Args:
            input_tensor: Input tensor
            baseline_tensor: Baseline tensor
            target_class: Target class
            num_steps: Number of interpolation steps

        Returns:
            Integrated gradients tensor
        """
        import torch

        # Generate interpolated inputs
        alphas = torch.linspace(0, 1, num_steps + 1, device=self.device)

        # Compute gradients for each interpolated input
        gradients = []

        for alpha in alphas:
            # Interpolate
            interpolated = baseline_tensor + alpha * (input_tensor - baseline_tensor)
            interpolated.requires_grad = True

            # Forward pass
            output = self.model(interpolated)

            # Backward pass
            self.model.zero_grad()
            output[0, target_class].backward()

            # Store gradient
            gradients.append(interpolated.grad.detach())

        # Average gradients (trapezoidal rule)
        avg_gradients = torch.stack(gradients).mean(dim=0)

        # Multiply by (input - baseline)
        integrated_grads = (input_tensor - baseline_tensor) * avg_gradients

        return integrated_grads

    def _explain_tensorflow(
        self,
        input_data: np.ndarray,
        target_class: Optional[int] = None,
        baseline: Optional[np.ndarray] = None,
        num_steps: int = 50,
        **kwargs,
    ) -> ExplainabilityResult:
        """Generate Integrated Gradients for TensorFlow model."""
        import tensorflow as tf

        # Prepare input
        input_tensor = tf.convert_to_tensor(input_data, dtype=tf.float32)
        if input_tensor.ndim == 3:
            input_tensor = tf.expand_dims(input_tensor, 0)

        # Create baseline
        if baseline is None:
            baseline_tensor = tf.zeros_like(input_tensor)
        else:
            baseline_tensor = tf.convert_to_tensor(baseline, dtype=tf.float32)
            if baseline_tensor.ndim == 3:
                baseline_tensor = tf.expand_dims(baseline_tensor, 0)

        # Get predicted class
        predictions = self.model(input_tensor)

        if target_class is None:
            target_class = tf.argmax(predictions[0]).numpy()

        # Get confidence
        probs = tf.nn.softmax(predictions)
        confidence = probs[0, target_class].numpy()

        # Compute integrated gradients
        integrated_grads = self._compute_integrated_gradients_tensorflow(
            input_tensor, baseline_tensor, target_class, num_steps
        )

        # Convert to numpy
        attributions = integrated_grads[0].numpy()

        # Aggregate across channels
        aggregation = kwargs.get("aggregation", "l2")
        if attributions.shape[-1] == 3 or attributions.shape[-1] == 1:  # (H, W, C)
            if aggregation == "max":
                attribution_map = np.max(np.abs(attributions), axis=-1)
            elif aggregation == "mean":
                attribution_map = np.mean(np.abs(attributions), axis=-1)
            elif aggregation == "l2":
                attribution_map = np.sqrt(np.sum(attributions**2, axis=-1))
            else:
                attribution_map = np.sqrt(np.sum(attributions**2, axis=-1))
        else:  # (C, H, W)
            if aggregation == "max":
                attribution_map = np.max(np.abs(attributions), axis=0)
            elif aggregation == "mean":
                attribution_map = np.mean(np.abs(attributions), axis=0)
            elif aggregation == "l2":
                attribution_map = np.sqrt(np.sum(attributions**2, axis=0))
            else:
                attribution_map = np.sqrt(np.sum(attributions**2, axis=0))

        # Normalize
        heatmap = self.normalize_heatmap(attribution_map)

        # Prepare original image
        original_image = input_data

        return ExplainabilityResult(
            attribution_map=attributions,
            heatmap=heatmap,
            original_image=original_image,
            predicted_class=int(target_class),
            predicted_class_name=self.get_class_name(int(target_class)),
            confidence=float(confidence),
        )

    def _compute_integrated_gradients_tensorflow(
        self, input_tensor: Any, baseline_tensor: Any, target_class: int, num_steps: int
    ) -> Any:
        """
        Compute integrated gradients for TensorFlow.

        Args:
            input_tensor: Input tensor
            baseline_tensor: Baseline tensor
            target_class: Target class
            num_steps: Number of interpolation steps

        Returns:
            Integrated gradients tensor
        """
        import tensorflow as tf

        # Generate interpolated inputs
        alphas = tf.linspace(0.0, 1.0, num_steps + 1)

        # Compute gradients for each interpolated input
        gradients = []

        for alpha in alphas:
            # Interpolate
            interpolated = baseline_tensor + alpha * (input_tensor - baseline_tensor)

            # Compute gradient
            with tf.GradientTape() as tape:
                tape.watch(interpolated)
                predictions = self.model(interpolated)
                target_output = predictions[:, target_class]

            gradient = tape.gradient(target_output, interpolated)
            gradients.append(gradient)

        # Average gradients (trapezoidal rule)
        avg_gradients = tf.reduce_mean(tf.stack(gradients), axis=0)

        # Multiply by (input - baseline)
        integrated_grads = (input_tensor - baseline_tensor) * avg_gradients

        return integrated_grads

    def explain_batch(
        self,
        input_batch: np.ndarray,
        target_classes: Optional[list] = None,
        baseline: Optional[np.ndarray] = None,
        num_steps: int = 50,
        **kwargs,
    ) -> list:
        """
        Generate Integrated Gradients for a batch of inputs.

        Args:
            input_batch: Batch of input data (B, C, H, W) or (B, H, W, C)
            target_classes: List of target classes
            baseline: Baseline input
            num_steps: Number of interpolation steps
            **kwargs: Additional arguments

        Returns:
            List of ExplainabilityResult objects
        """
        results = []

        for i in range(len(input_batch)):
            target_class = target_classes[i] if target_classes else None
            result = self.explain(input_batch[i], target_class, baseline, num_steps, **kwargs)
            results.append(result)

        return results

    @staticmethod
    def create_blurred_baseline(image: np.ndarray, sigma: float = 5.0) -> np.ndarray:
        """
        Create blurred baseline from image.

        Args:
            image: Input image
            sigma: Gaussian blur sigma

        Returns:
            Blurred baseline
        """
        try:
            from scipy.ndimage import gaussian_filter

            if image.ndim == 3 and image.shape[0] == 3:  # (C, H, W)
                blurred = np.stack([gaussian_filter(image[i], sigma=sigma) for i in range(3)])
            elif image.ndim == 3 and image.shape[-1] == 3:  # (H, W, C)
                blurred = np.stack(
                    [gaussian_filter(image[:, :, i], sigma=sigma) for i in range(3)], axis=-1
                )
            else:
                blurred = gaussian_filter(image, sigma=sigma)

            return blurred

        except ImportError:
            # Fallback to zeros if scipy not available
            return np.zeros_like(image)


# Made with Bob
