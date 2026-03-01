"""
Output postprocessing utilities for neural network inference.

Provides common postprocessing operations for model outputs.
"""

from typing import Any, Dict, List, Optional, Tuple

import numpy as np


class ClassificationPostprocessor:
    """
    Postprocessing utilities for classification tasks.

    Handles operations like softmax, top-k selection, and label mapping.
    """

    @staticmethod
    def apply_softmax(logits: np.ndarray, temperature: float = 1.0, axis: int = -1) -> np.ndarray:
        """
        Apply softmax to logits.

        Args:
            logits: Raw model outputs
            temperature: Temperature for softmax (default: 1.0)
            axis: Axis to apply softmax along

        Returns:
            Softmax probabilities
        """
        # Apply temperature scaling
        logits = logits / temperature

        # Subtract max for numerical stability
        logits = logits - np.max(logits, axis=axis, keepdims=True)

        # Compute softmax
        exp_logits = np.exp(logits)
        return exp_logits / np.sum(exp_logits, axis=axis, keepdims=True)

    @staticmethod
    def get_top_k(
        predictions: np.ndarray, k: int = 5, class_names: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get top-k predictions.

        Args:
            predictions: Model predictions (probabilities)
            k: Number of top predictions to return
            class_names: Optional list of class names

        Returns:
            List of dictionaries containing top-k predictions
        """
        # Handle batch dimension
        if predictions.ndim == 1:
            predictions = predictions.reshape(1, -1)

        results = []

        for pred in predictions:
            # Get top-k indices
            top_k_indices = np.argsort(pred)[-k:][::-1]

            # Get corresponding scores
            top_k_scores = pred[top_k_indices]

            # Create result
            result = {
                "indices": top_k_indices.tolist(),
                "scores": top_k_scores.tolist(),
            }

            # Add class names if available
            if class_names is not None:
                result["class_names"] = [class_names[idx] for idx in top_k_indices]

            results.append(result)

        return results if len(results) > 1 else results[0]

    @staticmethod
    def apply_threshold(predictions: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        """
        Apply threshold to predictions.

        Args:
            predictions: Model predictions (probabilities)
            threshold: Threshold value

        Returns:
            Binary predictions
        """
        return (predictions >= threshold).astype(int)

    @staticmethod
    def get_predicted_class(
        predictions: np.ndarray, class_names: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get predicted class for each sample.

        Args:
            predictions: Model predictions (probabilities)
            class_names: Optional list of class names

        Returns:
            List of dictionaries containing predicted class info
        """
        # Handle batch dimension
        if predictions.ndim == 1:
            predictions = predictions.reshape(1, -1)

        results = []

        for pred in predictions:
            # Get predicted class
            class_idx = np.argmax(pred)
            confidence = pred[class_idx]

            result = {
                "class_index": int(class_idx),
                "confidence": float(confidence),
            }

            # Add class name if available
            if class_names is not None:
                result["class_name"] = class_names[class_idx]

            results.append(result)

        return results if len(results) > 1 else results[0]


class DetectionPostprocessor:
    """
    Postprocessing utilities for object detection tasks.

    Handles operations like NMS, bounding box decoding, and filtering.
    """

    @staticmethod
    def non_max_suppression(
        boxes: np.ndarray,
        scores: np.ndarray,
        iou_threshold: float = 0.5,
        score_threshold: float = 0.5,
    ) -> np.ndarray:
        """
        Apply Non-Maximum Suppression (NMS).

        Args:
            boxes: Bounding boxes (N, 4) in format [x1, y1, x2, y2]
            scores: Confidence scores (N,)
            iou_threshold: IoU threshold for NMS
            score_threshold: Score threshold for filtering

        Returns:
            Indices of boxes to keep
        """
        # Filter by score threshold
        keep_mask = scores > score_threshold
        boxes = boxes[keep_mask]
        scores = scores[keep_mask]

        if len(boxes) == 0:
            return np.array([], dtype=int)

        # Sort by scores
        order = scores.argsort()[::-1]

        keep = []
        while order.size > 0:
            # Keep highest scoring box
            i = order[0]
            keep.append(i)

            if order.size == 1:
                break

            # Compute IoU with remaining boxes
            ious = DetectionPostprocessor._compute_iou(boxes[i : i + 1], boxes[order[1:]])

            # Keep boxes with IoU below threshold
            order = order[1:][ious[0] <= iou_threshold]

        return np.array(keep)

    @staticmethod
    def _compute_iou(boxes1: np.ndarray, boxes2: np.ndarray) -> np.ndarray:
        """
        Compute IoU between two sets of boxes.

        Args:
            boxes1: First set of boxes (N, 4)
            boxes2: Second set of boxes (M, 4)

        Returns:
            IoU matrix (N, M)
        """
        # Compute intersection
        x1 = np.maximum(boxes1[:, 0:1], boxes2[:, 0])
        y1 = np.maximum(boxes1[:, 1:2], boxes2[:, 1])
        x2 = np.minimum(boxes1[:, 2:3], boxes2[:, 2])
        y2 = np.minimum(boxes1[:, 3:4], boxes2[:, 3])

        intersection = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)

        # Compute areas
        area1 = (boxes1[:, 2] - boxes1[:, 0]) * (boxes1[:, 3] - boxes1[:, 1])
        area2 = (boxes2[:, 2] - boxes2[:, 0]) * (boxes2[:, 3] - boxes2[:, 1])

        # Compute union
        union = area1[:, None] + area2 - intersection

        # Compute IoU
        return intersection / (union + 1e-7)

    @staticmethod
    def decode_boxes(
        boxes: np.ndarray,
        anchors: np.ndarray,
        scale_factors: Tuple[float, float, float, float] = (10.0, 10.0, 5.0, 5.0),
    ) -> np.ndarray:
        """
        Decode bounding boxes from anchor-based predictions.

        Args:
            boxes: Encoded boxes (N, 4) in format [dx, dy, dw, dh]
            anchors: Anchor boxes (N, 4) in format [x1, y1, x2, y2]
            scale_factors: Scale factors for decoding

        Returns:
            Decoded boxes (N, 4) in format [x1, y1, x2, y2]
        """
        # Convert anchors to center format
        anchor_widths = anchors[:, 2] - anchors[:, 0]
        anchor_heights = anchors[:, 3] - anchors[:, 1]
        anchor_cx = anchors[:, 0] + 0.5 * anchor_widths
        anchor_cy = anchors[:, 1] + 0.5 * anchor_heights

        # Decode
        dx, dy, dw, dh = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]

        pred_cx = dx * anchor_widths / scale_factors[0] + anchor_cx
        pred_cy = dy * anchor_heights / scale_factors[1] + anchor_cy
        pred_w = np.exp(dw / scale_factors[2]) * anchor_widths
        pred_h = np.exp(dh / scale_factors[3]) * anchor_heights

        # Convert to corner format
        decoded_boxes = np.stack(
            [
                pred_cx - 0.5 * pred_w,
                pred_cy - 0.5 * pred_h,
                pred_cx + 0.5 * pred_w,
                pred_cy + 0.5 * pred_h,
            ],
            axis=1,
        )

        return decoded_boxes

    @staticmethod
    def clip_boxes(boxes: np.ndarray, image_shape: Tuple[int, int]) -> np.ndarray:
        """
        Clip boxes to image boundaries.

        Args:
            boxes: Bounding boxes (N, 4) in format [x1, y1, x2, y2]
            image_shape: Image shape as (height, width)

        Returns:
            Clipped boxes
        """
        height, width = image_shape

        boxes[:, 0] = np.clip(boxes[:, 0], 0, width)
        boxes[:, 1] = np.clip(boxes[:, 1], 0, height)
        boxes[:, 2] = np.clip(boxes[:, 2], 0, width)
        boxes[:, 3] = np.clip(boxes[:, 3], 0, height)

        return boxes


class SegmentationPostprocessor:
    """
    Postprocessing utilities for segmentation tasks.

    Handles operations like argmax, colormap application, and mask refinement.
    """

    @staticmethod
    def argmax_segmentation(logits: np.ndarray, axis: int = -1) -> np.ndarray:
        """
        Apply argmax to get segmentation mask.

        Args:
            logits: Model logits (H, W, C) or (B, H, W, C)
            axis: Axis to apply argmax along

        Returns:
            Segmentation mask with class indices
        """
        return np.argmax(logits, axis=axis)

    @staticmethod
    def apply_colormap(
        mask: np.ndarray, colormap: Optional[np.ndarray] = None, num_classes: Optional[int] = None
    ) -> np.ndarray:
        """
        Apply colormap to segmentation mask.

        Args:
            mask: Segmentation mask (H, W) with class indices
            colormap: Custom colormap (num_classes, 3)
            num_classes: Number of classes (if colormap not provided)

        Returns:
            RGB image (H, W, 3)
        """
        if colormap is None:
            # Generate default colormap
            if num_classes is None:
                num_classes = int(mask.max()) + 1
            colormap = SegmentationPostprocessor._generate_colormap(num_classes)

        # Apply colormap
        return colormap[mask]

    @staticmethod
    def _generate_colormap(num_classes: int) -> np.ndarray:
        """
        Generate a colormap for visualization.

        Args:
            num_classes: Number of classes

        Returns:
            Colormap (num_classes, 3)
        """
        colormap = np.zeros((num_classes, 3), dtype=np.uint8)

        for i in range(num_classes):
            # Generate distinct colors using bit manipulation
            r = (i * 67) % 256
            g = (i * 131) % 256
            b = (i * 197) % 256
            colormap[i] = [r, g, b]

        return colormap

    @staticmethod
    def resize_mask(
        mask: np.ndarray, target_size: Tuple[int, int], method: str = "nearest"
    ) -> np.ndarray:
        """
        Resize segmentation mask.

        Args:
            mask: Segmentation mask (H, W)
            target_size: Target size as (height, width)
            method: Resize method (only 'nearest' supported)

        Returns:
            Resized mask
        """
        h, w = mask.shape
        target_h, target_w = target_size

        # Calculate indices
        row_indices = (np.arange(target_h) * h / target_h).astype(int)
        col_indices = (np.arange(target_w) * w / target_w).astype(int)

        # Index into original mask
        return mask[row_indices[:, None], col_indices[None, :]]


class RegressionPostprocessor:
    """
    Postprocessing utilities for regression tasks.

    Handles operations like denormalization and clipping.
    """

    @staticmethod
    def denormalize(predictions: np.ndarray, mean: float, std: float) -> np.ndarray:
        """
        Denormalize predictions.

        Args:
            predictions: Normalized predictions
            mean: Mean used for normalization
            std: Standard deviation used for normalization

        Returns:
            Denormalized predictions
        """
        return predictions * std + mean

    @staticmethod
    def clip_predictions(
        predictions: np.ndarray,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
    ) -> np.ndarray:
        """
        Clip predictions to valid range.

        Args:
            predictions: Model predictions
            min_value: Minimum valid value
            max_value: Maximum valid value

        Returns:
            Clipped predictions
        """
        if min_value is not None:
            predictions = np.maximum(predictions, min_value)
        if max_value is not None:
            predictions = np.minimum(predictions, max_value)
        return predictions


# Made with Bob
