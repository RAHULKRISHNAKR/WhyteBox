"""
Base explainer interface for all explainability methods.

Defines the contract that all explainability methods must implement.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional, Union

import numpy as np


@dataclass
class ExplainabilityResult:
    """
    Standardized explainability result.

    Attributes:
        attribution_map: Attribution/saliency map (H, W) or (H, W, C)
        heatmap: Normalized heatmap for visualization (H, W)
        original_image: Original input image
        predicted_class: Predicted class index
        predicted_class_name: Predicted class name (if available)
        confidence: Prediction confidence
        method: Explainability method used
        target_layer: Target layer for layer-based methods
        computation_time: Time taken to compute explanation
        metadata: Additional metadata
    """

    attribution_map: np.ndarray
    heatmap: np.ndarray
    original_image: np.ndarray
    predicted_class: int
    predicted_class_name: Optional[str] = None
    confidence: float = 0.0
    method: str = ""
    target_layer: Optional[str] = None
    computation_time: float = 0.0
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        self.metadata["timestamp"] = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary format."""
        return {
            "attribution_map": (
                self.attribution_map.tolist()
                if isinstance(self.attribution_map, np.ndarray)
                else self.attribution_map
            ),
            "heatmap": (
                self.heatmap.tolist() if isinstance(self.heatmap, np.ndarray) else self.heatmap
            ),
            "original_image": (
                self.original_image.tolist()
                if isinstance(self.original_image, np.ndarray)
                else self.original_image
            ),
            "predicted_class": int(self.predicted_class),
            "predicted_class_name": self.predicted_class_name,
            "confidence": float(self.confidence),
            "method": self.method,
            "target_layer": self.target_layer,
            "computation_time": self.computation_time,
            "metadata": self.metadata,
        }


class BaseExplainer(ABC):
    """
    Abstract base class for explainability methods.

    All explainability methods must inherit from this class and implement
    the required methods.
    """

    def __init__(
        self,
        model: Any,
        device: str = "cpu",
        class_names: Optional[list] = None,
    ):
        """
        Initialize the explainer.

        Args:
            model: The model to explain
            device: Device to run computations on
            class_names: Optional list of class names
        """
        self.model = model
        self.device = device
        self.class_names = class_names

    @abstractmethod
    def explain(
        self, input_data: np.ndarray, target_class: Optional[int] = None, **kwargs
    ) -> ExplainabilityResult:
        """
        Generate explanation for the input.

        Args:
            input_data: Input data to explain
            target_class: Target class to explain (None for predicted class)
            **kwargs: Additional method-specific arguments

        Returns:
            ExplainabilityResult object
        """
        pass

    @staticmethod
    def normalize_heatmap(heatmap: np.ndarray, percentile: float = 99.0) -> np.ndarray:
        """
        Normalize heatmap to [0, 1] range.

        Args:
            heatmap: Raw heatmap
            percentile: Percentile for clipping outliers

        Returns:
            Normalized heatmap
        """
        # Remove negative values
        heatmap = np.maximum(heatmap, 0)

        # Clip outliers
        if percentile < 100:
            vmax = np.percentile(heatmap, percentile)
            heatmap = np.minimum(heatmap, vmax)

        # Normalize to [0, 1]
        if heatmap.max() > 0:
            heatmap = heatmap / heatmap.max()

        return heatmap

    @staticmethod
    def resize_heatmap(
        heatmap: np.ndarray, target_size: tuple, method: str = "bilinear"
    ) -> np.ndarray:
        """
        Resize heatmap to target size.

        Args:
            heatmap: Input heatmap
            target_size: Target size as (height, width)
            method: Resize method

        Returns:
            Resized heatmap
        """
        try:
            from PIL import Image

            # Convert to PIL Image
            if heatmap.dtype != np.uint8:
                heatmap_uint8 = (heatmap * 255).astype(np.uint8)
            else:
                heatmap_uint8 = heatmap

            pil_image = Image.fromarray(heatmap_uint8)

            # Resize
            if method == "bilinear":
                resized = pil_image.resize((target_size[1], target_size[0]), Image.BILINEAR)
            else:
                resized = pil_image.resize((target_size[1], target_size[0]), Image.NEAREST)

            # Convert back to float
            return np.array(resized).astype(np.float32) / 255.0

        except ImportError:
            # Fallback to basic numpy resize
            return BaseExplainer._numpy_resize(heatmap, target_size)

    @staticmethod
    def _numpy_resize(heatmap: np.ndarray, target_size: tuple) -> np.ndarray:
        """Fallback resize using numpy."""
        h, w = heatmap.shape[:2]
        target_h, target_w = target_size

        # Calculate indices
        row_indices = (np.arange(target_h) * h / target_h).astype(int)
        col_indices = (np.arange(target_w) * w / target_w).astype(int)

        # Index into original heatmap
        return heatmap[row_indices[:, None], col_indices[None, :]]

    @staticmethod
    def apply_colormap(heatmap: np.ndarray, colormap: str = "jet") -> np.ndarray:
        """
        Apply colormap to heatmap.

        Args:
            heatmap: Normalized heatmap [0, 1]
            colormap: Colormap name ('jet', 'hot', 'viridis')

        Returns:
            RGB image (H, W, 3)
        """
        try:
            import matplotlib.pyplot as plt
            from matplotlib import cm

            # Get colormap
            cmap = cm.get_cmap(colormap)

            # Apply colormap
            colored = cmap(heatmap)

            # Convert to RGB (remove alpha channel)
            return (colored[:, :, :3] * 255).astype(np.uint8)

        except ImportError:
            # Fallback to simple jet colormap
            return BaseExplainer._simple_jet_colormap(heatmap)

    @staticmethod
    def _simple_jet_colormap(heatmap: np.ndarray) -> np.ndarray:
        """Simple jet colormap implementation."""
        # Normalize to [0, 255]
        heatmap_uint8 = (heatmap * 255).astype(np.uint8)

        # Create RGB channels
        r = np.zeros_like(heatmap_uint8)
        g = np.zeros_like(heatmap_uint8)
        b = np.zeros_like(heatmap_uint8)

        # Blue to cyan (0-64)
        mask = heatmap_uint8 < 64
        b[mask] = 255
        g[mask] = heatmap_uint8[mask] * 4

        # Cyan to green (64-128)
        mask = (heatmap_uint8 >= 64) & (heatmap_uint8 < 128)
        g[mask] = 255
        b[mask] = 255 - (heatmap_uint8[mask] - 64) * 4

        # Green to yellow (128-192)
        mask = (heatmap_uint8 >= 128) & (heatmap_uint8 < 192)
        g[mask] = 255
        r[mask] = (heatmap_uint8[mask] - 128) * 4

        # Yellow to red (192-255)
        mask = heatmap_uint8 >= 192
        r[mask] = 255
        g[mask] = 255 - (heatmap_uint8[mask] - 192) * 4

        return np.stack([r, g, b], axis=-1)

    @staticmethod
    def overlay_heatmap(
        image: np.ndarray, heatmap: np.ndarray, alpha: float = 0.5, colormap: str = "jet"
    ) -> np.ndarray:
        """
        Overlay heatmap on original image.

        Args:
            image: Original image (H, W, 3)
            heatmap: Normalized heatmap (H, W)
            alpha: Overlay transparency [0, 1]
            colormap: Colormap name

        Returns:
            Overlayed image (H, W, 3)
        """
        # Ensure image is in correct format
        if image.dtype != np.uint8:
            if image.max() <= 1.0:
                image = (image * 255).astype(np.uint8)
            else:
                image = image.astype(np.uint8)

        # Resize heatmap if needed
        if heatmap.shape[:2] != image.shape[:2]:
            heatmap = BaseExplainer.resize_heatmap(heatmap, image.shape[:2])

        # Apply colormap
        heatmap_colored = BaseExplainer.apply_colormap(heatmap, colormap)

        # Overlay
        overlayed = (alpha * heatmap_colored + (1 - alpha) * image).astype(np.uint8)

        return overlayed

    def get_class_name(self, class_idx: int) -> Optional[str]:
        """
        Get class name for class index.

        Args:
            class_idx: Class index

        Returns:
            Class name or None
        """
        if self.class_names and 0 <= class_idx < len(self.class_names):
            return self.class_names[class_idx]
        return None


# Made with Bob
