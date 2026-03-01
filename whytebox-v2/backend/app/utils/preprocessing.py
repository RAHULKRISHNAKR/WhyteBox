"""
Input preprocessing utilities for neural network inference.

Provides common preprocessing operations for images and other data types.
"""

from enum import Enum
from typing import List, Optional, Tuple, Union

import numpy as np


class NormalizationMethod(str, Enum):
    """Normalization methods for preprocessing."""

    IMAGENET = "imagenet"  # ImageNet mean/std
    ZERO_ONE = "zero_one"  # Scale to [0, 1]
    NEG_ONE_ONE = "neg_one_one"  # Scale to [-1, 1]
    STANDARDIZE = "standardize"  # Zero mean, unit variance
    NONE = "none"  # No normalization


class ResizeMethod(str, Enum):
    """Resize methods for image preprocessing."""

    BILINEAR = "bilinear"
    NEAREST = "nearest"
    BICUBIC = "bicubic"
    LANCZOS = "lanczos"


class ImagePreprocessor:
    """
    Image preprocessing utilities.

    Handles common image preprocessing operations like resizing,
    normalization, and format conversion.
    """

    # ImageNet statistics
    IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    @staticmethod
    def resize(
        image: np.ndarray,
        target_size: Tuple[int, int],
        method: ResizeMethod = ResizeMethod.BILINEAR,
        keep_aspect_ratio: bool = False,
    ) -> np.ndarray:
        """
        Resize image to target size.

        Args:
            image: Input image (H, W, C) or (H, W)
            target_size: Target size as (height, width)
            method: Resize method
            keep_aspect_ratio: Whether to maintain aspect ratio

        Returns:
            Resized image
        """
        try:
            from PIL import Image

            # Convert to PIL Image
            if image.dtype != np.uint8:
                image = (image * 255).astype(np.uint8)

            pil_image = Image.fromarray(image)

            # Calculate new size if keeping aspect ratio
            if keep_aspect_ratio:
                target_size = ImagePreprocessor._calculate_aspect_ratio_size(
                    pil_image.size, target_size
                )

            # Map resize method
            resize_methods = {
                ResizeMethod.BILINEAR: Image.BILINEAR,
                ResizeMethod.NEAREST: Image.NEAREST,
                ResizeMethod.BICUBIC: Image.BICUBIC,
                ResizeMethod.LANCZOS: Image.LANCZOS,
            }

            # Resize
            resized = pil_image.resize(
                (target_size[1], target_size[0]), resize_methods[method]  # PIL uses (width, height)
            )

            return np.array(resized)

        except ImportError:
            # Fallback to basic numpy resize
            return ImagePreprocessor._numpy_resize(image, target_size)

    @staticmethod
    def _numpy_resize(image: np.ndarray, target_size: Tuple[int, int]) -> np.ndarray:
        """Fallback resize using numpy (basic nearest neighbor)."""
        h, w = image.shape[:2]
        target_h, target_w = target_size

        # Calculate indices
        row_indices = (np.arange(target_h) * h / target_h).astype(int)
        col_indices = (np.arange(target_w) * w / target_w).astype(int)

        # Index into original image
        if image.ndim == 3:
            return image[row_indices[:, None], col_indices[None, :], :]
        else:
            return image[row_indices[:, None], col_indices[None, :]]

    @staticmethod
    def _calculate_aspect_ratio_size(
        original_size: Tuple[int, int], target_size: Tuple[int, int]
    ) -> Tuple[int, int]:
        """Calculate size that maintains aspect ratio."""
        orig_w, orig_h = original_size
        target_h, target_w = target_size

        # Calculate scaling factors
        scale_h = target_h / orig_h
        scale_w = target_w / orig_w

        # Use smaller scale to fit within target
        scale = min(scale_h, scale_w)

        new_h = int(orig_h * scale)
        new_w = int(orig_w * scale)

        return (new_h, new_w)

    @staticmethod
    def normalize(
        image: np.ndarray,
        method: NormalizationMethod = NormalizationMethod.IMAGENET,
        mean: Optional[np.ndarray] = None,
        std: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """
        Normalize image.

        Args:
            image: Input image (H, W, C) with values in [0, 255] or [0, 1]
            method: Normalization method
            mean: Custom mean values (for STANDARDIZE method)
            std: Custom std values (for STANDARDIZE method)

        Returns:
            Normalized image
        """
        # Convert to float32
        image = image.astype(np.float32)

        # Scale to [0, 1] if needed
        if image.max() > 1.0:
            image = image / 255.0

        if method == NormalizationMethod.IMAGENET:
            # ImageNet normalization
            image = (image - ImagePreprocessor.IMAGENET_MEAN) / ImagePreprocessor.IMAGENET_STD

        elif method == NormalizationMethod.ZERO_ONE:
            # Already in [0, 1]
            pass

        elif method == NormalizationMethod.NEG_ONE_ONE:
            # Scale to [-1, 1]
            image = image * 2.0 - 1.0

        elif method == NormalizationMethod.STANDARDIZE:
            # Zero mean, unit variance
            if mean is None:
                mean = np.mean(image, axis=(0, 1), keepdims=True)
            if std is None:
                std = np.std(image, axis=(0, 1), keepdims=True)
            image = (image - mean) / (std + 1e-7)

        elif method == NormalizationMethod.NONE:
            pass

        return image

    @staticmethod
    def center_crop(image: np.ndarray, crop_size: Tuple[int, int]) -> np.ndarray:
        """
        Center crop image.

        Args:
            image: Input image (H, W, C) or (H, W)
            crop_size: Crop size as (height, width)

        Returns:
            Cropped image
        """
        h, w = image.shape[:2]
        crop_h, crop_w = crop_size

        # Calculate crop coordinates
        start_h = (h - crop_h) // 2
        start_w = (w - crop_w) // 2

        # Crop
        if image.ndim == 3:
            return image[start_h : start_h + crop_h, start_w : start_w + crop_w, :]
        else:
            return image[start_h : start_h + crop_h, start_w : start_w + crop_w]

    @staticmethod
    def to_channel_first(image: np.ndarray) -> np.ndarray:
        """
        Convert image from (H, W, C) to (C, H, W).

        Args:
            image: Input image in (H, W, C) format

        Returns:
            Image in (C, H, W) format
        """
        if image.ndim == 3:
            return np.transpose(image, (2, 0, 1))
        return image

    @staticmethod
    def to_channel_last(image: np.ndarray) -> np.ndarray:
        """
        Convert image from (C, H, W) to (H, W, C).

        Args:
            image: Input image in (C, H, W) format

        Returns:
            Image in (H, W, C) format
        """
        if image.ndim == 3:
            return np.transpose(image, (1, 2, 0))
        return image

    @staticmethod
    def preprocess_for_model(
        image: np.ndarray,
        target_size: Tuple[int, int],
        normalization: NormalizationMethod = NormalizationMethod.IMAGENET,
        channel_first: bool = True,
        resize_method: ResizeMethod = ResizeMethod.BILINEAR,
    ) -> np.ndarray:
        """
        Complete preprocessing pipeline for model input.

        Args:
            image: Input image
            target_size: Target size as (height, width)
            normalization: Normalization method
            channel_first: Whether to convert to channel-first format
            resize_method: Resize method

        Returns:
            Preprocessed image ready for model input
        """
        # Resize
        image = ImagePreprocessor.resize(image, target_size, resize_method)

        # Normalize
        image = ImagePreprocessor.normalize(image, normalization)

        # Convert to channel-first if needed
        if channel_first:
            image = ImagePreprocessor.to_channel_first(image)

        return image


class BatchPreprocessor:
    """
    Batch preprocessing utilities.

    Handles preprocessing of multiple samples efficiently.
    """

    @staticmethod
    def preprocess_batch(
        images: List[np.ndarray],
        target_size: Tuple[int, int],
        normalization: NormalizationMethod = NormalizationMethod.IMAGENET,
        channel_first: bool = True,
        resize_method: ResizeMethod = ResizeMethod.BILINEAR,
    ) -> np.ndarray:
        """
        Preprocess a batch of images.

        Args:
            images: List of input images
            target_size: Target size as (height, width)
            normalization: Normalization method
            channel_first: Whether to convert to channel-first format
            resize_method: Resize method

        Returns:
            Batch of preprocessed images as numpy array
        """
        preprocessed = []

        for image in images:
            processed = ImagePreprocessor.preprocess_for_model(
                image, target_size, normalization, channel_first, resize_method
            )
            preprocessed.append(processed)

        return np.stack(preprocessed)

    @staticmethod
    def pad_batch(batch: List[np.ndarray], pad_value: float = 0.0) -> np.ndarray:
        """
        Pad batch to same size.

        Args:
            batch: List of arrays with potentially different sizes
            pad_value: Value to use for padding

        Returns:
            Padded batch as numpy array
        """
        # Find max dimensions
        max_shape = np.max([arr.shape for arr in batch], axis=0)

        # Pad each array
        padded = []
        for arr in batch:
            pad_width = [(0, max_dim - dim) for max_dim, dim in zip(max_shape, arr.shape)]
            padded_arr = np.pad(arr, pad_width, constant_values=pad_value)
            padded.append(padded_arr)

        return np.stack(padded)


# Made with Bob
