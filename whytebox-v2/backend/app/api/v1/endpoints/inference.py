"""
Inference API endpoints - model_id based.

Provides REST API for running model inference using model IDs
(both pretrained and custom uploaded models).
"""

import logging
import time
from io import BytesIO
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from PIL import Image

from ....services.model_service import model_registry, PRETRAINED_MODELS
from ....utils.preprocessing import ImagePreprocessor, NormalizationMethod

logger = logging.getLogger(__name__)

router = APIRouter()

# ImageNet class labels (top 1000) - loaded lazily
_imagenet_classes: Optional[List[str]] = None


def _get_imagenet_classes() -> List[str]:
    """Load ImageNet class names lazily."""
    global _imagenet_classes
    if _imagenet_classes is None:
        try:
            # Try to load from torchvision
            from torchvision.models import ResNet50_Weights
            _imagenet_classes = ResNet50_Weights.IMAGENET1K_V2.meta["categories"]
        except Exception:
            # Fallback to a short list
            _imagenet_classes = [f"class_{i}" for i in range(1000)]
    return _imagenet_classes


def _load_model_by_id(model_id: str):
    """Load a model by ID from registry or custom store."""
    if model_id in PRETRAINED_MODELS:
        model, metadata = model_registry.load_pretrained(model_id)
        return model, metadata, "pytorch"

    # Check custom models (stored in models endpoint module)
    from ....api.v1.endpoints import models as models_endpoint
    custom_store = models_endpoint._custom_models
    if model_id in custom_store:
        from ....utils.model_loader import ModelLoader
        from ....schemas.model import Framework
        path = custom_store[model_id]["path"]
        framework = custom_store[model_id]["metadata"].get("framework", "pytorch")
        fw = Framework(framework)
        model, meta = ModelLoader.load_model(path, fw)
        return model, meta, framework

    raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")


def _preprocess_image(
    image_array: np.ndarray,
    target_size: tuple = (224, 224),
    normalization: str = "imagenet",
) -> np.ndarray:
    """Preprocess image for model inference."""
    norm_method = NormalizationMethod.IMAGENET if normalization == "imagenet" else NormalizationMethod.ZERO_ONE

    processed = ImagePreprocessor.preprocess_for_model(
        image_array,
        target_size=target_size,
        normalization=norm_method,
        channel_first=True,
    )
    return processed


def _run_pytorch_inference(
    model: Any,
    input_array: np.ndarray,
    top_k: int = 5,
    apply_softmax: bool = True,
) -> Dict[str, Any]:
    """Run PyTorch inference and return structured results."""
    import torch

    start = time.time()

    input_tensor = torch.from_numpy(input_array).float()
    if input_tensor.ndim == 3:
        input_tensor = input_tensor.unsqueeze(0)

    model.eval()
    with torch.no_grad():
        outputs = model(input_tensor)

    inference_time_ms = (time.time() - start) * 1000

    # Apply softmax
    if apply_softmax:
        probs = torch.softmax(outputs, dim=1)
    else:
        probs = outputs

    probs_np = probs[0].cpu().numpy()

    # Get top-k
    top_k = min(top_k, len(probs_np))
    top_indices = np.argsort(probs_np)[::-1][:top_k]

    classes = _get_imagenet_classes()

    predictions = [
        {
            "rank": i + 1,
            "class_index": int(idx),
            "class_name": classes[idx] if idx < len(classes) else f"class_{idx}",
            "confidence": float(probs_np[idx]),
            "confidence_pct": round(float(probs_np[idx]) * 100, 2),
        }
        for i, idx in enumerate(top_indices)
    ]

    return {
        "predictions": predictions,
        "inference_time_ms": round(inference_time_ms, 2),
        "output_shape": list(outputs.shape),
        "num_classes": outputs.shape[-1],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Single Image Inference
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/predict")
async def predict(
    model_id: str = Form(...),
    image: UploadFile = File(...),
    top_k: int = Form(5),
    target_size: str = Form("224,224"),
    normalization: str = Form("imagenet"),
    apply_softmax: bool = Form(True),
) -> Dict[str, Any]:
    """
    Run inference on a single image using a model by ID.

    Args:
        model_id: Model identifier (e.g. 'resnet50', 'vgg16')
        image: Input image file
        top_k: Number of top predictions to return
        target_size: Resize target as "H,W"
        normalization: Normalization method ('imagenet' or 'zero_one')
        apply_softmax: Whether to apply softmax to outputs

    Returns:
        Top-K predictions with class names and confidence scores
    """
    try:
        # Load image
        image_data = await image.read()
        pil_image = Image.open(BytesIO(image_data)).convert("RGB")
        image_array = np.array(pil_image)

        # Parse target size
        h, w = map(int, target_size.split(","))

        # Preprocess
        processed = _preprocess_image(image_array, (h, w), normalization)

        # Load model
        model, metadata, framework = _load_model_by_id(model_id)

        # Run inference
        if framework == "pytorch":
            result = _run_pytorch_inference(model, processed, top_k, apply_softmax)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Framework '{framework}' inference not yet supported via this endpoint"
            )

        predictions = result["predictions"]
        top_prediction = predictions[0] if predictions else {
            "rank": 1, "class_index": 0, "class_name": "unknown", "confidence": 0.0, "confidence_pct": 0.0
        }

        return {
            "success": True,
            "model_id": model_id,
            "model_name": metadata.get("name", model_id),
            "image_size": [pil_image.width, pil_image.height],
            "top_prediction": top_prediction,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            **result,
        }

    except HTTPException:
        raise
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"PyTorch not installed: {e}")
    except Exception as e:
        logger.error(f"Inference failed for {model_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Batch Inference
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/predict-batch")
async def predict_batch(
    model_id: str = Form(...),
    images: List[UploadFile] = File(...),
    top_k: int = Form(5),
    target_size: str = Form("224,224"),
    normalization: str = Form("imagenet"),
) -> Dict[str, Any]:
    """
    Run batch inference on multiple images.
    """
    try:
        h, w = map(int, target_size.split(","))
        model, metadata, framework = _load_model_by_id(model_id)

        results = []
        for img_file in images:
            image_data = await img_file.read()
            pil_image = Image.open(BytesIO(image_data)).convert("RGB")
            image_array = np.array(pil_image)
            processed = _preprocess_image(image_array, (h, w), normalization)

            if framework == "pytorch":
                result = _run_pytorch_inference(model, processed, top_k)
                results.append({
                    "filename": img_file.filename,
                    **result,
                })

        return {
            "success": True,
            "model_id": model_id,
            "num_images": len(results),
            "results": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Activation Extraction (for visualization)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/activations")
async def get_activations(
    model_id: str = Form(...),
    image: UploadFile = File(...),
    layer_name: Optional[str] = Form(None),
    target_size: str = Form("224,224"),
    normalization: str = Form("imagenet"),
    max_channels: int = Form(16),
) -> Dict[str, Any]:
    """
    Extract intermediate layer activations for visualization.

    Returns activation maps as 2D arrays (one per channel, up to max_channels).
    """
    try:
        import torch

        # Load image
        image_data = await image.read()
        pil_image = Image.open(BytesIO(image_data)).convert("RGB")
        image_array = np.array(pil_image)

        h, w = map(int, target_size.split(","))
        processed = _preprocess_image(image_array, (h, w), normalization)

        # Load model
        model, metadata, framework = _load_model_by_id(model_id)

        if framework != "pytorch":
            raise HTTPException(status_code=400, detail="Only PyTorch models supported")

        # If no layer specified, use default target layer
        if not layer_name:
            layer_name = PRETRAINED_MODELS.get(model_id, {}).get("default_target_layer")
            if not layer_name:
                # Find last conv layer
                for name, mod in reversed(list(model.named_modules())):
                    if type(mod).__name__ == "Conv2d":
                        layer_name = name
                        break

        if not layer_name:
            raise HTTPException(status_code=400, detail="Could not determine target layer")

        # Register hook
        activations_store = {}

        def hook_fn(module, inp, out):
            activations_store["output"] = out.detach().cpu().numpy()

        # Find and hook the layer
        target_module = None
        for name, mod in model.named_modules():
            if name == layer_name:
                target_module = mod
                break

        if target_module is None:
            raise HTTPException(status_code=400, detail=f"Layer '{layer_name}' not found")

        handle = target_module.register_forward_hook(hook_fn)

        try:
            input_tensor = torch.from_numpy(processed).float().unsqueeze(0)
            model.eval()
            with torch.no_grad():
                model(input_tensor)
        finally:
            handle.remove()

        if "output" not in activations_store:
            raise HTTPException(status_code=500, detail="Failed to capture activations")

        acts = activations_store["output"][0]  # (C, H, W)
        num_channels = min(max_channels, acts.shape[0])

        # Determine layer type from the hooked module
        layer_type = type(target_module).__name__

        # Spatial dimensions (H, W) — handle 1D activations gracefully
        if acts.ndim == 3:
            spatial_h, spatial_w = int(acts.shape[1]), int(acts.shape[2])
        elif acts.ndim == 2:
            spatial_h, spatial_w = int(acts.shape[1]), 1
        else:
            spatial_h, spatial_w = 1, 1

        # Convert to list of 2D arrays (normalized per channel)
        # Field name: activation_maps  (matches ActivationResponse frontend type)
        activation_maps = []
        for c in range(num_channels):
            ch = acts[c]
            ch_min, ch_max = float(ch.min()), float(ch.max())
            if ch_max > ch_min:
                ch_norm = (ch - ch_min) / (ch_max - ch_min)
            else:
                ch_norm = ch * 0
            activation_maps.append(ch_norm.tolist())

        # Global activation map (mean across channels, normalised)
        global_act = np.mean(acts, axis=0)
        g_min, g_max = float(global_act.min()), float(global_act.max())
        if g_max > g_min:
            global_norm = (global_act - g_min) / (g_max - g_min)
        else:
            global_norm = global_act * 0

        return {
            "success": True,
            "model_id": model_id,
            "layer_name": layer_name,
            "layer_type": layer_type,
            "activation_shape": list(acts.shape),
            "num_channels": num_channels,
            "spatial_size": [spatial_h, spatial_w],
            # Primary field consumed by frontend ActivationResponse type
            "activation_maps": activation_maps,
            # Legacy alias kept for backward compat with any old callers
            "channel_activations": activation_maps,
            "global_activation": global_norm.tolist(),
            "stats": {
                "mean": float(acts.mean()),
                "std": float(acts.std()),
                "min": float(acts.min()),
                "max": float(acts.max()),
                "sparsity": float((acts == 0).mean()),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Activation extraction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Model Info
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/model-info")
async def get_model_info(
    model_id: str,
    device: str = "cpu",
) -> Dict[str, Any]:
    """Get information about a model."""
    try:
        model, metadata, framework = _load_model_by_id(model_id)

        if framework == "pytorch":
            import torch
            total_params = sum(p.numel() for p in model.parameters())
            trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
            num_layers = sum(1 for _ in model.named_modules() if not list(_[1].children()))

            return {
                "success": True,
                "model_id": model_id,
                "framework": "pytorch",
                "device": device,
                "total_parameters": total_params,
                "trainable_parameters": trainable_params,
                "num_layers": num_layers,
                "model_class": model.__class__.__name__,
                "cuda_available": torch.cuda.is_available(),
            }

        return {"success": True, "model_id": model_id, "framework": framework}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache-info")
async def get_cache_info() -> Dict[str, Any]:
    """Get information about cached models."""
    return {
        "success": True,
        "cache_info": model_registry.get_cache_info(),
    }


@router.post("/clear-cache")
async def clear_cache(model_id: Optional[str] = None) -> Dict[str, Any]:
    """Clear model cache."""
    # ModelRegistry doesn't expose clear yet - add basic support
    if model_id and model_id in model_registry._cache:
        del model_registry._cache[model_id]
        if model_id in model_registry._load_order:
            model_registry._load_order.remove(model_id)
    elif not model_id:
        model_registry._cache.clear()
        model_registry._load_order.clear()

    return {"success": True, "message": "Cache cleared"}

# Made with Bob
