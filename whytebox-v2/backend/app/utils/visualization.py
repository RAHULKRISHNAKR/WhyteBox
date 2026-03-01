"""
Visualization utilities for explainability results.

Provides functions for creating visual representations of explanations.
"""

from typing import Optional, Tuple
import numpy as np
from io import BytesIO
import base64


class ExplainabilityVisualizer:
    """
    Utilities for visualizing explainability results.
    
    Provides methods for creating heatmaps, overlays, and comparison views.
    """

    @staticmethod
    def apply_colormap(
        heatmap: np.ndarray,
        colormap: str = "jet"
    ) -> np.ndarray:
        """
        Apply a matplotlib colormap to a normalized heatmap.

        Args:
            heatmap: Normalized heatmap [0, 1] shape (H, W)
            colormap: Matplotlib colormap name (e.g. 'jet', 'hot', 'RdBu_r')

        Returns:
            RGB image (H, W, 3) uint8
        """
        try:
            import matplotlib.cm as cm
            cmap = cm.get_cmap(colormap)
            colored = cmap(heatmap)[:, :, :3]  # drop alpha channel
            return (colored * 255).astype(np.uint8)
        except Exception:
            # Fallback: simple red heatmap
            rgb = np.zeros((*heatmap.shape, 3), dtype=np.uint8)
            rgb[:, :, 0] = (heatmap * 255).astype(np.uint8)
            return rgb

    @staticmethod
    def create_heatmap_overlay(
        image: np.ndarray,
        heatmap: np.ndarray,
        alpha: float = 0.5,
        colormap: str = "jet"
    ) -> np.ndarray:
        """
        Create heatmap overlay on image.
        
        Args:
            image: Original image (H, W, 3)
            heatmap: Heatmap (H, W) normalized [0, 1]
            alpha: Overlay transparency (0=original, 1=heatmap)
            colormap: Colormap name
            
        Returns:
            Overlayed image (H, W, 3) uint8
        """
        # Ensure image is uint8 RGB
        if image.dtype != np.uint8:
            image = (image * 255).clip(0, 255).astype(np.uint8)
        if image.ndim == 2:
            image = np.stack([image] * 3, axis=-1)
        if image.shape[2] == 4:
            image = image[:, :, :3]

        # Resize heatmap to match image if needed
        if heatmap.shape[:2] != image.shape[:2]:
            from PIL import Image as PILImage
            h_pil = PILImage.fromarray((heatmap * 255).astype(np.uint8))
            h_pil = h_pil.resize((image.shape[1], image.shape[0]), PILImage.BILINEAR)
            heatmap = np.array(h_pil).astype(np.float32) / 255.0

        # Apply colormap
        colored = ExplainabilityVisualizer.apply_colormap(heatmap, colormap)

        # Blend
        overlay = (
            (1 - alpha) * image.astype(np.float32) +
            alpha * colored.astype(np.float32)
        ).clip(0, 255).astype(np.uint8)

        return overlay
    
    @staticmethod
    def create_side_by_side(
        original: np.ndarray,
        heatmap: np.ndarray,
        overlay: np.ndarray,
        padding: int = 10
    ) -> np.ndarray:
        """
        Create side-by-side comparison view.
        
        Args:
            original: Original image
            heatmap: Heatmap visualization
            overlay: Overlay visualization
            padding: Padding between images
            
        Returns:
            Combined image
        """
        # Ensure all images are same size
        h, w = original.shape[:2]
        
        # Resize heatmap if needed
        if heatmap.shape[:2] != (h, w):
            from ..explainability.base_explainer import BaseExplainer
            heatmap = BaseExplainer.resize_heatmap(heatmap, (h, w))
        
        # Convert heatmap to RGB
        if heatmap.ndim == 2:
            from ..explainability.base_explainer import BaseExplainer
            heatmap = BaseExplainer.apply_colormap(heatmap)
        
        # Create padding
        pad = np.ones((h, padding, 3), dtype=np.uint8) * 255
        
        # Concatenate horizontally
        combined = np.concatenate([original, pad, heatmap, pad, overlay], axis=1)
        
        return combined
    
    @staticmethod
    def create_comparison_grid(
        original: np.ndarray,
        results: dict,
        padding: int = 10
    ) -> np.ndarray:
        """
        Create grid comparison of multiple methods.
        
        Args:
            original: Original image
            results: Dictionary of method names to heatmaps
            padding: Padding between images
            
        Returns:
            Grid image
        """
        from ..explainability.base_explainer import BaseExplainer
        
        # Prepare images
        images = [original]
        labels = ["Original"]
        
        for method_name, heatmap in results.items():
            # Resize if needed
            if heatmap.shape[:2] != original.shape[:2]:
                heatmap = BaseExplainer.resize_heatmap(heatmap, original.shape[:2])
            
            # Convert to RGB
            if heatmap.ndim == 2:
                heatmap_rgb = BaseExplainer.apply_colormap(heatmap)
            else:
                heatmap_rgb = heatmap
            
            # Create overlay
            overlay = BaseExplainer.overlay_heatmap(original, heatmap)
            
            images.extend([heatmap_rgb, overlay])
            labels.extend([f"{method_name} (heatmap)", f"{method_name} (overlay)"])
        
        # Calculate grid dimensions
        n_images = len(images)
        n_cols = min(3, n_images)
        n_rows = (n_images + n_cols - 1) // n_cols
        
        # Get image dimensions
        h, w = images[0].shape[:2]
        
        # Create grid
        grid_h = n_rows * h + (n_rows - 1) * padding
        grid_w = n_cols * w + (n_cols - 1) * padding
        grid = np.ones((grid_h, grid_w, 3), dtype=np.uint8) * 255
        
        # Place images
        for idx, img in enumerate(images):
            row = idx // n_cols
            col = idx % n_cols
            
            y_start = row * (h + padding)
            x_start = col * (w + padding)
            
            grid[y_start:y_start + h, x_start:x_start + w] = img
        
        return grid
    
    @staticmethod
    def array_to_base64(image: np.ndarray, format: str = "PNG") -> str:
        """
        Convert numpy array to base64 encoded string.
        
        Args:
            image: Image array
            format: Image format (PNG, JPEG)
            
        Returns:
            Base64 encoded string
        """
        try:
            from PIL import Image
            
            # Convert to PIL Image
            if image.dtype != np.uint8:
                if image.max() <= 1.0:
                    image = (image * 255).astype(np.uint8)
                else:
                    image = image.astype(np.uint8)
            
            pil_image = Image.fromarray(image)
            
            # Save to bytes
            buffer = BytesIO()
            pil_image.save(buffer, format=format)
            buffer.seek(0)
            
            # Encode to base64
            img_str = base64.b64encode(buffer.read()).decode()
            
            return f"data:image/{format.lower()};base64,{img_str}"
            
        except ImportError:
            raise ImportError("PIL is required for image encoding")
    
    @staticmethod
    def save_visualization(
        image: np.ndarray,
        output_path: str,
        format: str = "PNG"
    ) -> None:
        """
        Save visualization to file.
        
        Args:
            image: Image array
            output_path: Output file path
            format: Image format
        """
        try:
            from PIL import Image
            
            # Convert to PIL Image
            if image.dtype != np.uint8:
                if image.max() <= 1.0:
                    image = (image * 255).astype(np.uint8)
                else:
                    image = image.astype(np.uint8)
            
            pil_image = Image.fromarray(image)
            pil_image.save(output_path, format=format)
            
        except ImportError:
            raise ImportError("PIL is required for saving images")
    
    @staticmethod
    def create_attention_map(
        heatmap: np.ndarray,
        threshold: float = 0.5
    ) -> np.ndarray:
        """
        Create binary attention map from heatmap.
        
        Args:
            heatmap: Normalized heatmap [0, 1]
            threshold: Threshold for attention
            
        Returns:
            Binary attention map
        """
        return (heatmap >= threshold).astype(np.uint8) * 255
    
    @staticmethod
    def highlight_regions(
        image: np.ndarray,
        heatmap: np.ndarray,
        threshold: float = 0.5,
        color: Tuple[int, int, int] = (255, 0, 0)
    ) -> np.ndarray:
        """
        Highlight important regions with colored overlay.
        
        Args:
            image: Original image
            heatmap: Heatmap
            threshold: Threshold for highlighting
            color: Highlight color (R, G, B)
            
        Returns:
            Image with highlighted regions
        """
        # Create attention mask
        mask = heatmap >= threshold
        
        # Create colored overlay
        overlay = image.copy()
        overlay[mask] = (0.7 * overlay[mask] + 0.3 * np.array(color)).astype(np.uint8)
        
        return overlay
    
    @staticmethod
    def create_bounding_box(
        image: np.ndarray,
        heatmap: np.ndarray,
        threshold: float = 0.5
    ) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
        """
        Create bounding box around important region.
        
        Args:
            image: Original image
            heatmap: Heatmap
            threshold: Threshold for region detection
            
        Returns:
            Tuple of (image with box, box coordinates (x1, y1, x2, y2))
        """
        # Create attention mask
        mask = heatmap >= threshold
        
        # Find bounding box
        rows = np.any(mask, axis=1)
        cols = np.any(mask, axis=0)
        
        if not rows.any() or not cols.any():
            return image, (0, 0, 0, 0)
        
        y1, y2 = np.where(rows)[0][[0, -1]]
        x1, x2 = np.where(cols)[0][[0, -1]]
        
        # Draw box
        result = image.copy()
        
        # Draw rectangle (simple implementation)
        result[y1:y2, x1:x1+2] = [255, 0, 0]  # Left edge
        result[y1:y2, x2:x2+2] = [255, 0, 0]  # Right edge
        result[y1:y1+2, x1:x2] = [255, 0, 0]  # Top edge
        result[y2:y2+2, x1:x2] = [255, 0, 0]  # Bottom edge
        
        return result, (int(x1), int(y1), int(x2), int(y2))

# Made with Bob
