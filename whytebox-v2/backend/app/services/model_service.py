"""
Model Service - Core model management with pretrained model support.

Handles loading pretrained models (torchvision), extracting architecture,
and managing a model registry with LRU caching.
"""

import logging
import time
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Pretrained model registry (no file upload needed for these)
# ─────────────────────────────────────────────────────────────────────────────

PRETRAINED_MODELS: Dict[str, Dict[str, Any]] = {
    "vgg16": {
        "id": "vgg16",
        "name": "VGG16",
        "framework": "pytorch",
        "description": "16-layer Visual Geometry Group network for ImageNet classification",
        "parameters": "138M",
        "input_size": [224, 224, 3],
        "pretrained": True,
        "num_classes": 1000,
        "dataset": "ImageNet",
        "paper": "Very Deep Convolutional Networks for Large-Scale Image Recognition",
        "loader": "torchvision.models.vgg16",
        "default_target_layer": "features.28",  # last conv layer
        "tags": ["classification", "cnn", "deep"],
    },
    "resnet50": {
        "id": "resnet50",
        "name": "ResNet-50",
        "framework": "pytorch",
        "description": "50-layer Residual Network with skip connections",
        "parameters": "25.6M",
        "input_size": [224, 224, 3],
        "pretrained": True,
        "num_classes": 1000,
        "dataset": "ImageNet",
        "paper": "Deep Residual Learning for Image Recognition",
        "loader": "torchvision.models.resnet50",
        "default_target_layer": "layer4.2.conv3",
        "tags": ["classification", "cnn", "residual"],
    },
    "mobilenet_v2": {
        "id": "mobilenet_v2",
        "name": "MobileNetV2",
        "framework": "pytorch",
        "description": "Efficient mobile architecture with inverted residuals",
        "parameters": "3.5M",
        "input_size": [224, 224, 3],
        "pretrained": True,
        "num_classes": 1000,
        "dataset": "ImageNet",
        "paper": "MobileNetV2: Inverted Residuals and Linear Bottlenecks",
        "loader": "torchvision.models.mobilenet_v2",
        "default_target_layer": "features.18.0",
        "tags": ["classification", "cnn", "mobile", "efficient"],
    },
    "efficientnet_b0": {
        "id": "efficientnet_b0",
        "name": "EfficientNet-B0",
        "framework": "pytorch",
        "description": "Compound-scaled efficient CNN baseline",
        "parameters": "5.3M",
        "input_size": [224, 224, 3],
        "pretrained": True,
        "num_classes": 1000,
        "dataset": "ImageNet",
        "paper": "EfficientNet: Rethinking Model Scaling for CNNs",
        "loader": "torchvision.models.efficientnet_b0",
        "default_target_layer": "features.8.0",
        "tags": ["classification", "cnn", "efficient"],
    },
    "alexnet": {
        "id": "alexnet",
        "name": "AlexNet",
        "framework": "pytorch",
        "description": "Pioneering deep CNN that won ImageNet 2012",
        "parameters": "61M",
        "input_size": [224, 224, 3],
        "pretrained": True,
        "num_classes": 1000,
        "dataset": "ImageNet",
        "paper": "ImageNet Classification with Deep Convolutional Neural Networks",
        "loader": "torchvision.models.alexnet",
        "default_target_layer": "features.10",
        "tags": ["classification", "cnn", "historic"],
    },
}

# ImageNet class names (first 10 for demo, full list loaded lazily)
IMAGENET_CLASSES_SAMPLE = [
    "tench",
    "goldfish",
    "great white shark",
    "tiger shark",
    "hammerhead",
    "electric ray",
    "stingray",
    "cock",
    "hen",
    "ostrich",
    "brambling",
    "goldfinch",
    "house finch",
    "junco",
    "indigo bunting",
    "robin",
    "bulbul",
    "jay",
    "magpie",
    "chickadee",
]


class ModelRegistry:
    """
    Registry for managing loaded models with LRU caching.
    Supports pretrained torchvision models and custom uploaded models.
    """

    def __init__(self, max_cached: int = 3):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._max_cached = max_cached
        self._load_order: List[str] = []

    def get_pretrained_info(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get metadata for a pretrained model without loading it."""
        return PRETRAINED_MODELS.get(model_id)

    def list_pretrained(self) -> List[Dict[str, Any]]:
        """List all available pretrained models."""
        return list(PRETRAINED_MODELS.values())

    def load_pretrained(self, model_id: str) -> Tuple[Any, Dict[str, Any]]:
        """
        Load a pretrained torchvision model.
        Returns (model, metadata) tuple.
        """
        # Check cache first
        if model_id in self._cache:
            logger.debug(f"Cache hit for model: {model_id}")
            return self._cache[model_id]["model"], self._cache[model_id]["metadata"]

        if model_id not in PRETRAINED_MODELS:
            raise ValueError(f"Unknown pretrained model: {model_id}")

        info = PRETRAINED_MODELS[model_id]
        logger.info(f"Loading pretrained model: {model_id}")

        try:
            import torch
            import torchvision.models as tv_models

            # Map model_id to torchvision loader
            loaders = {
                "vgg16": lambda: tv_models.vgg16(weights=tv_models.VGG16_Weights.IMAGENET1K_V1),
                "resnet50": lambda: tv_models.resnet50(
                    weights=tv_models.ResNet50_Weights.IMAGENET1K_V2
                ),
                "mobilenet_v2": lambda: tv_models.mobilenet_v2(
                    weights=tv_models.MobileNet_V2_Weights.IMAGENET1K_V2
                ),
                "efficientnet_b0": lambda: tv_models.efficientnet_b0(
                    weights=tv_models.EfficientNet_B0_Weights.IMAGENET1K_V1
                ),
                "alexnet": lambda: tv_models.alexnet(
                    weights=tv_models.AlexNet_Weights.IMAGENET1K_V1
                ),
            }

            if model_id not in loaders:
                raise ValueError(f"No loader for model: {model_id}")

            model = loaders[model_id]()
            model.eval()

            metadata = {
                **info,
                "loaded_at": time.time(),
                "device": "cpu",
            }

            # Evict oldest if cache full
            self._evict_if_needed()

            self._cache[model_id] = {"model": model, "metadata": metadata}
            self._load_order.append(model_id)

            logger.info(f"Model {model_id} loaded successfully")
            return model, metadata

        except ImportError:
            raise ImportError("torchvision not installed. Run: pip install torch torchvision")

    def _evict_if_needed(self):
        """Evict oldest cached model if at capacity."""
        while len(self._cache) >= self._max_cached and self._load_order:
            oldest = self._load_order.pop(0)
            if oldest in self._cache:
                del self._cache[oldest]
                logger.info(f"Evicted model from cache: {oldest}")

    def is_loaded(self, model_id: str) -> bool:
        return model_id in self._cache

    def get_cache_info(self) -> Dict[str, Any]:
        return {
            "cached_models": list(self._cache.keys()),
            "max_cached": self._max_cached,
            "num_cached": len(self._cache),
        }


class ArchitectureExtractor:
    """
    Extracts detailed architecture information from PyTorch models.
    Produces a structured representation suitable for 3D visualization.
    """

    # Layer type → visualization category mapping
    LAYER_CATEGORIES = {
        "Conv2d": "conv",
        "ConvTranspose2d": "conv",
        "Linear": "dense",
        "ReLU": "activation",
        "LeakyReLU": "activation",
        "GELU": "activation",
        "Sigmoid": "activation",
        "Tanh": "activation",
        "SiLU": "activation",
        "Hardswish": "activation",
        "MaxPool2d": "pooling",
        "AvgPool2d": "pooling",
        "AdaptiveAvgPool2d": "pooling",
        "AdaptiveMaxPool2d": "pooling",
        "BatchNorm2d": "normalization",
        "BatchNorm1d": "normalization",
        "LayerNorm": "normalization",
        "GroupNorm": "normalization",
        "Dropout": "regularization",
        "Dropout2d": "regularization",
        "Flatten": "reshape",
        "Softmax": "output",
        "LogSoftmax": "output",
    }

    # Colors for each category (hex)
    CATEGORY_COLORS = {
        "conv": "#4A90D9",
        "dense": "#7B68EE",
        "activation": "#50C878",
        "pooling": "#FF8C00",
        "normalization": "#FFD700",
        "regularization": "#FF6B6B",
        "reshape": "#A0A0A0",
        "output": "#FF4500",
        "unknown": "#808080",
    }

    @classmethod
    def extract(cls, model: Any, model_id: str) -> Dict[str, Any]:
        """
        Extract full architecture from a PyTorch model.

        Returns a dict with:
        - layers: list of layer info dicts
        - connections: list of {from, to} dicts
        - stats: parameter counts, layer counts by type
        - visualization_hints: layout suggestions for 3D rendering
        """
        try:
            import torch.nn as nn

            layers = []
            total_params = 0
            trainable_params = 0
            layer_type_counts: Dict[str, int] = {}

            # Walk all leaf modules
            for full_name, module in model.named_modules():
                # Skip container modules (only leaf nodes)
                children = list(module.children())
                if children:
                    continue

                module_type = type(module).__name__
                params = sum(p.numel() for p in module.parameters())
                trainable = sum(p.numel() for p in module.parameters() if p.requires_grad)

                total_params += params
                trainable_params += trainable

                category = cls.LAYER_CATEGORIES.get(module_type, "unknown")
                layer_type_counts[module_type] = layer_type_counts.get(module_type, 0) + 1

                layer_info = {
                    "id": full_name or f"layer_{len(layers)}",
                    "name": full_name or f"layer_{len(layers)}",
                    "type": module_type,
                    "category": category,
                    "color": cls.CATEGORY_COLORS.get(category, "#808080"),
                    "parameters": params,
                    "trainable": trainable > 0,
                    "config": cls._get_layer_config(module),
                    "input_shape": None,  # populated by shape inference
                    "output_shape": None,  # populated by shape inference
                }

                layers.append(layer_info)

            # Build sequential connections
            connections = []
            for i in range(len(layers) - 1):
                connections.append(
                    {
                        "from": layers[i]["id"],
                        "to": layers[i + 1]["id"],
                        "weight": 1.0,
                    }
                )

            # Try shape inference with a dummy forward pass
            try:
                layers = cls._infer_shapes(model, layers)
            except Exception as e:
                logger.warning(f"Shape inference failed: {e}")

            # Compute visualization layout hints
            viz_hints = cls._compute_layout_hints(layers)

            return {
                "model_id": model_id,
                "layers": layers,
                "connections": connections,
                "stats": {
                    "total_layers": len(layers),
                    "total_params": total_params,
                    "trainable_params": trainable_params,
                    "non_trainable_params": total_params - trainable_params,
                    "layer_type_counts": layer_type_counts,
                },
                "visualization_hints": viz_hints,
            }

        except Exception as e:
            logger.error(f"Architecture extraction failed: {e}")
            raise

    @classmethod
    def _get_layer_config(cls, module: Any) -> Dict[str, Any]:
        """Extract layer-specific configuration."""
        import torch.nn as nn

        config: Dict[str, Any] = {}

        if isinstance(module, nn.Conv2d):
            config = {
                "in_channels": module.in_channels,
                "out_channels": module.out_channels,
                "kernel_size": (
                    list(module.kernel_size)
                    if hasattr(module.kernel_size, "__iter__")
                    else module.kernel_size
                ),
                "stride": (
                    list(module.stride) if hasattr(module.stride, "__iter__") else module.stride
                ),
                "padding": (
                    list(module.padding) if hasattr(module.padding, "__iter__") else module.padding
                ),
                "groups": module.groups,
                "bias": module.bias is not None,
            }
        elif isinstance(module, nn.Linear):
            config = {
                "in_features": module.in_features,
                "out_features": module.out_features,
                "bias": module.bias is not None,
            }
        elif isinstance(module, (nn.MaxPool2d, nn.AvgPool2d)):
            config = {
                "kernel_size": module.kernel_size,
                "stride": module.stride,
                "padding": module.padding,
            }
        elif isinstance(module, (nn.BatchNorm2d, nn.BatchNorm1d)):
            config = {
                "num_features": module.num_features,
                "eps": module.eps,
                "momentum": module.momentum,
                "affine": module.affine,
            }
        elif isinstance(module, nn.Dropout):
            config = {"p": module.p}
        elif isinstance(module, (nn.AdaptiveAvgPool2d, nn.AdaptiveMaxPool2d)):
            config = {"output_size": module.output_size}

        return config

    @classmethod
    def _infer_shapes(cls, model: Any, layers: List[Dict]) -> List[Dict]:
        """
        Run a dummy forward pass with hooks to capture input/output shapes.
        """
        import torch
        import torch.nn as nn

        shape_map: Dict[str, Dict] = {}

        hooks = []

        def make_hook(layer_id: str):
            def hook(module, inp, out):
                in_shape = list(inp[0].shape[1:]) if inp else None  # remove batch dim
                out_shape = list(out.shape[1:]) if hasattr(out, "shape") else None
                shape_map[layer_id] = {
                    "input_shape": in_shape,
                    "output_shape": out_shape,
                }

            return hook

        # Register hooks on all leaf modules
        module_dict = {name: mod for name, mod in model.named_modules() if not list(mod.children())}

        for layer in layers:
            lid = layer["id"]
            if lid in module_dict:
                h = module_dict[lid].register_forward_hook(make_hook(lid))
                hooks.append(h)

        # Run dummy input
        try:
            dummy = torch.zeros(1, 3, 224, 224)
            with torch.no_grad():
                model(dummy)
        finally:
            for h in hooks:
                h.remove()

        # Update layers with shapes
        for layer in layers:
            if layer["id"] in shape_map:
                layer["input_shape"] = shape_map[layer["id"]]["input_shape"]
                layer["output_shape"] = shape_map[layer["id"]]["output_shape"]

        return layers

    @classmethod
    def _compute_layout_hints(cls, layers: List[Dict]) -> Dict[str, Any]:
        """
        Compute 3D layout hints for visualization.
        Groups layers by category and suggests positions.
        """
        # Group consecutive layers of same category into blocks
        blocks = []
        current_block: List[int] = []
        current_cat = None

        for i, layer in enumerate(layers):
            cat = layer["category"]
            if cat != current_cat:
                if current_block:
                    blocks.append(
                        {
                            "category": current_cat,
                            "layer_indices": current_block,
                            "count": len(current_block),
                        }
                    )
                current_block = [i]
                current_cat = cat
            else:
                current_block.append(i)

        if current_block:
            blocks.append(
                {
                    "category": current_cat,
                    "layer_indices": current_block,
                    "count": len(current_block),
                }
            )

        return {
            "total_depth": len(layers),
            "blocks": blocks,
            "suggested_spacing": 3.0,
            "suggested_scale": max(0.5, min(2.0, 20.0 / len(layers))),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Singleton instances
# ─────────────────────────────────────────────────────────────────────────────

model_registry = ModelRegistry(max_cached=3)
architecture_extractor = ArchitectureExtractor()

# Made with Bob
