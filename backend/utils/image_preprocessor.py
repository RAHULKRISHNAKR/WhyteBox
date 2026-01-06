"""
Image Preprocessing Utilities

Handle image loading, resizing, and normalization for model inference.
"""

import numpy as np
from PIL import Image
from io import BytesIO
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """Preprocess images for neural network inference."""
    
    # ImageNet normalization (most common)
    IMAGENET_MEAN = [0.485, 0.456, 0.406]
    IMAGENET_STD = [0.229, 0.224, 0.225]
    
    def __init__(self, framework='pytorch', normalization='imagenet'):
        """
        Initialize preprocessor.
        
        Args:
            framework: 'pytorch' or 'keras'
            normalization: 'imagenet', 'none', or custom dict
        """
        self.framework = framework.lower()
        self.normalization = normalization
        
        # Set normalization parameters
        if normalization == 'imagenet':
            self.mean = self.IMAGENET_MEAN
            self.std = self.IMAGENET_STD
        elif normalization == 'none':
            self.mean = [0.0, 0.0, 0.0]
            self.std = [1.0, 1.0, 1.0]
        elif isinstance(normalization, dict):
            self.mean = normalization.get('mean', [0.0, 0.0, 0.0])
            self.std = normalization.get('std', [1.0, 1.0, 1.0])
        else:
            raise ValueError(f"Invalid normalization: {normalization}")
    
    def load_image(self, image_source):
        """
        Load image from various sources.
        
        Args:
            image_source: File path, BytesIO, file-like object, or PIL Image
            
        Returns:
            PIL Image in RGB mode
        """
        if isinstance(image_source, str):
            # Load from file path
            image = Image.open(image_source).convert('RGB')
        elif isinstance(image_source, BytesIO):
            # Load from BytesIO
            image = Image.open(image_source).convert('RGB')
        elif isinstance(image_source, Image.Image):
            # Already a PIL image
            image = image.convert('RGB')
        elif hasattr(image_source, 'read'):
            # File-like object (includes Flask's SpooledTemporaryFile)
            image = Image.open(image_source).convert('RGB')
        else:
            raise ValueError(f"Unsupported image source type: {type(image_source)}")
        
        logger.debug(f"Loaded image: {image.size}")
        return image
    
    def resize_image(self, image, input_shape):
        """
        Resize image to match model input shape.
        
        Args:
            image: PIL Image
            input_shape: Tuple (batch, channels, height, width) for PyTorch
                        or (batch, height, width, channels) for Keras
            
        Returns:
            Resized PIL Image
        """
        # Extract spatial dimensions
        if self.framework == 'pytorch':
            # PyTorch: (batch, channels, height, width)
            if len(input_shape) == 4:
                height, width = input_shape[2], input_shape[3]
            elif len(input_shape) == 3:
                height, width = input_shape[1], input_shape[2]
            else:
                raise ValueError(f"Invalid input shape: {input_shape}")
        else:
            # Keras: (batch, height, width, channels)
            if len(input_shape) == 4:
                height, width = input_shape[1], input_shape[2]
            elif len(input_shape) == 3:
                height, width = input_shape[0], input_shape[1]
            else:
                raise ValueError(f"Invalid input shape: {input_shape}")
        
        # Resize with high-quality resampling
        resized = image.resize((width, height), Image.LANCZOS)
        logger.debug(f"Resized image to: {resized.size}")
        return resized
    
    def normalize_image(self, image_array):
        """
        Normalize image array.
        
        Args:
            image_array: Numpy array (H, W, C) in range [0, 255]
            
        Returns:
            Normalized array in range appropriate for model
        """
        # Convert to float and scale to [0, 1]
        normalized = image_array.astype(np.float32) / 255.0
        
        # Apply mean/std normalization
        mean = np.array(self.mean, dtype=np.float32).reshape(1, 1, 3)
        std = np.array(self.std, dtype=np.float32).reshape(1, 1, 3)
        normalized = (normalized - mean) / std
        
        return normalized
    
    def preprocess(self, image_source, input_shape):
        """
        Complete preprocessing pipeline.
        
        Args:
            image_source: Image source (path, bytes, or PIL Image)
            input_shape: Model input shape
            
        Returns:
            Preprocessed array ready for model input
        """
        # Load image
        image = self.load_image(image_source)
        
        # Resize
        resized = self.resize_image(image, input_shape)
        
        # Convert to array (H, W, C)
        image_array = np.array(resized)
        
        # Normalize
        normalized = self.normalize_image(image_array)
        
        # Transpose for PyTorch (C, H, W)
        if self.framework == 'pytorch':
            normalized = np.transpose(normalized, (2, 0, 1))
        
        # Add batch dimension
        batched = np.expand_dims(normalized, axis=0)
        
        logger.info(f"Preprocessed image shape: {batched.shape}")
        return batched
    
    def preprocess_pytorch(self, image_source, input_shape):
        """Preprocess specifically for PyTorch."""
        self.framework = 'pytorch'
        preprocessed = self.preprocess(image_source, input_shape)
        
        # Convert to PyTorch tensor
        import torch
        return torch.from_numpy(preprocessed).float()
    
    def preprocess_keras(self, image_source, input_shape):
        """Preprocess specifically for Keras."""
        self.framework = 'keras'
        preprocessed = self.preprocess(image_source, input_shape)
        
        # Keras uses numpy arrays directly
        return preprocessed


def get_imagenet_classes():
    """
    Get ImageNet class labels.
    
    Returns:
        List of 1000 class names
    """
    from pathlib import Path
    
    # Try to load from file
    classes_file = Path(__file__).parent / 'imagenet_classes.txt'
    
    if classes_file.exists():
        with open(classes_file, 'r') as f:
            return [line.strip() for line in f.readlines()]
    else:
        logger.warning(f"ImageNet classes file not found at {classes_file}")
        logger.warning("Run: python utils/download_imagenet_classes.py")
        # Return placeholders as fallback
        return [f"class_{i}" for i in range(1000)]


def decode_predictions(predictions, top_k=5):
    """
    Decode model predictions to class labels.
    
    Args:
        predictions: Numpy array of class probabilities
        top_k: Number of top predictions to return
        
    Returns:
        List of (class_id, class_name, probability) tuples
    """
    # Get class labels
    class_labels = get_imagenet_classes()
    
    # Handle different prediction formats
    if len(predictions.shape) == 2:
        predictions = predictions[0]  # Remove batch dimension
    
    # Get top k indices
    top_indices = np.argsort(predictions)[-top_k:][::-1]
    
    # Build result
    results = []
    for idx in top_indices:
        results.append({
            'class_id': int(idx),
            'class_name': class_labels[idx] if idx < len(class_labels) else f'class_{idx}',
            'confidence': float(predictions[idx])
        })
    
    return results
