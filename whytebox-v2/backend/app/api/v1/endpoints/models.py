"""
Models API Endpoints

Full implementation with pretrained model loading, architecture extraction,
and model-id-based operations.
"""

import logging
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ....services.model_service import PRETRAINED_MODELS, ArchitectureExtractor, model_registry

logger = logging.getLogger(__name__)

router = APIRouter()

# Storage directory for uploaded models
MODELS_DIR = Path("storage/models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# In-memory registry for uploaded custom models
# { model_id: { "path": str, "metadata": dict } }
_custom_models: Dict[str, Dict[str, Any]] = {}


# ─────────────────────────────────────────────────────────────────────────────
# List & Get
# ─────────────────────────────────────────────────────────────────────────────

# Static param counts for pretrained models (avoids loading model just for listing)
_PRETRAINED_PARAM_COUNTS: Dict[str, int] = {
    "vgg16": 138_357_544,
    "resnet50": 25_557_032,
    "mobilenet_v2": 3_504_872,
    "efficientnet_b0": 5_288_548,
    "alexnet": 61_100_840,
}


def _normalize_model_meta(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize a raw model metadata dict into the shape expected by the frontend ModelMeta:
      { id, name, framework, description, type, total_params, input_size, num_classes, source }
    """
    model_id = raw.get("id", "")
    # Resolve total_params: prefer numeric, fall back to static lookup, then 0
    raw_params = raw.get("parameters", raw.get("total_params", 0))
    if isinstance(raw_params, int):
        total_params = raw_params
    elif isinstance(raw_params, float):
        total_params = int(raw_params)
    else:
        # String like "138M", "25.6M" → parse
        total_params = _PRETRAINED_PARAM_COUNTS.get(model_id, 0)

    return {
        "id": model_id,
        "name": raw.get("name", model_id),
        "framework": raw.get("framework", "unknown"),
        "description": raw.get("description", ""),
        "type": "classification",
        "total_params": total_params,
        "input_size": raw.get("input_size", [224, 224, 3]),
        "num_classes": raw.get("num_classes", 1000),
        "source": "custom" if raw.get("pretrained") is False else "pretrained",
        # Pass through extra fields for UI
        "tags": raw.get("tags", []),
        "dataset": raw.get("dataset", ""),
        "paper": raw.get("paper", ""),
    }


@router.get("/")
async def list_models() -> Dict[str, Any]:
    """
    List all available models (pretrained + uploaded).
    Returns normalized ModelMeta objects with numeric total_params.
    """
    pretrained_raw = model_registry.list_pretrained()
    pretrained = [_normalize_model_meta(m) for m in pretrained_raw]

    # Add custom uploaded models
    custom = [
        _normalize_model_meta(
            {
                "id": mid,
                "name": info["metadata"].get("name", mid),
                "framework": info["metadata"].get("framework", "unknown"),
                "description": info["metadata"].get("description", "Custom uploaded model"),
                "total_params": info["metadata"].get("total_params", 0),
                "input_size": info["metadata"].get("input_size", [224, 224, 3]),
                "num_classes": info["metadata"].get("num_classes", 1000),
                "pretrained": False,
                "tags": ["custom"],
            }
        )
        for mid, info in _custom_models.items()
    ]

    all_models = pretrained + custom

    return {
        "models": all_models,
        "count": len(all_models),
        "pretrained_count": len(pretrained),
        "custom_count": len(custom),
        "message": "Available models",
    }


@router.get("/{model_id}")
async def get_model(model_id: str) -> Dict[str, Any]:
    """
    Get detailed metadata for a specific model.
    """
    # Check pretrained
    info = model_registry.get_pretrained_info(model_id)
    if info:
        cache_info = model_registry.get_cache_info()
        return {
            **info,
            "status": "loaded" if model_id in cache_info["cached_models"] else "available",
        }

    # Check custom
    if model_id in _custom_models:
        return {
            "id": model_id,
            "status": "available",
            **_custom_models[model_id]["metadata"],
        }

    raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")


@router.get("/{model_id}/stats")
async def get_model_stats(model_id: str) -> Dict[str, Any]:
    """
    Get statistics for a specific model.
    For pretrained models, loads the model to get real stats.
    """
    # Check pretrained
    info = model_registry.get_pretrained_info(model_id)
    if not info and model_id not in _custom_models:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

    # Try to get real stats from loaded model
    cache_info = model_registry.get_cache_info()
    if model_id in cache_info["cached_models"]:
        try:
            model, metadata = model_registry.load_pretrained(model_id)
            arch = ArchitectureExtractor.extract(model, model_id)
            stats = arch["stats"]
            return {
                "model_id": model_id,
                "total_params": stats["total_params"],
                "trainable_params": stats["trainable_params"],
                "non_trainable_params": stats["non_trainable_params"],
                "total_layers": stats["total_layers"],
                "layer_type_counts": stats["layer_type_counts"],
                "model_size_mb": round(stats["total_params"] * 4 / 1024 / 1024, 2),
                "inference_count": 0,
                "avg_inference_time_ms": 0,
                "last_inference_at": None,
            }
        except Exception as e:
            logger.warning(f"Could not get real stats for {model_id}: {e}")

    # Fallback to static stats
    static_stats = {
        "vgg16": {"total_params": 138357544, "model_size_mb": 528.0},
        "resnet50": {"total_params": 25557032, "model_size_mb": 97.5},
        "mobilenet_v2": {"total_params": 3504872, "model_size_mb": 13.4},
        "efficientnet_b0": {"total_params": 5288548, "model_size_mb": 20.2},
        "alexnet": {"total_params": 61100840, "model_size_mb": 233.1},
    }

    s = static_stats.get(model_id, {"total_params": 0, "model_size_mb": 0})
    return {
        "model_id": model_id,
        "total_params": s["total_params"],
        "trainable_params": s["total_params"],
        "non_trainable_params": 0,
        "model_size_mb": s["model_size_mb"],
        "inference_count": 0,
        "avg_inference_time_ms": 0,
        "last_inference_at": None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Architecture Extraction
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/{model_id}/architecture")
async def get_model_architecture(model_id: str) -> Dict[str, Any]:
    """
    Get full architecture of a model with layer details.
    Loads the model if not already cached.
    Returns structured data for 3D visualization.
    """
    try:
        # Load model (from cache or fresh)
        if model_id in PRETRAINED_MODELS:
            model, metadata = model_registry.load_pretrained(model_id)
        elif model_id in _custom_models:
            from ....schemas.model import Framework
            from ....utils.model_loader import ModelLoader

            path = _custom_models[model_id]["path"]
            framework = _custom_models[model_id]["metadata"].get("framework", "pytorch")
            fw = Framework(framework)
            model, _ = ModelLoader.load_model(path, fw)
        else:
            raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

        # Extract architecture
        arch = ArchitectureExtractor.extract(model, model_id)

        return {
            "success": True,
            "model_id": model_id,
            **arch,
        }

    except HTTPException:
        raise
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"PyTorch/torchvision not installed: {str(e)}")
    except Exception as e:
        logger.error(f"Architecture extraction failed for {model_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_id}/layers")
async def get_model_layers(model_id: str) -> Dict[str, Any]:
    """
    Get list of layer names (useful for Grad-CAM target layer selection).
    """
    try:
        if model_id in PRETRAINED_MODELS:
            model, _ = model_registry.load_pretrained(model_id)
        elif model_id in _custom_models:
            from ....schemas.model import Framework
            from ....utils.model_loader import ModelLoader

            path = _custom_models[model_id]["path"]
            fw = Framework(_custom_models[model_id]["metadata"].get("framework", "pytorch"))
            model, _ = ModelLoader.load_model(path, fw)
        else:
            raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

        # Get all named modules
        all_layers = [name for name, _ in model.named_modules() if name]

        # Filter for conv layers (good Grad-CAM targets)
        conv_layers = [
            name
            for name, mod in model.named_modules()
            if name and type(mod).__name__ in ("Conv2d", "ConvTranspose2d")
        ]

        # Get default target layer
        default_layer = PRETRAINED_MODELS.get(model_id, {}).get("default_target_layer")
        if not default_layer and conv_layers:
            default_layer = conv_layers[-1]

        return {
            "success": True,
            "model_id": model_id,
            "total_layers": len(all_layers),
            "all_layers": all_layers,
            "conv_layers": conv_layers,
            "recommended_layers": conv_layers[-5:] if conv_layers else all_layers[-5:],
            "default_target_layer": default_layer,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Layer listing failed for {model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Model Loading (explicit load into cache)
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/{model_id}/load")
async def load_model(model_id: str) -> Dict[str, Any]:
    """
    Explicitly load a model into the cache.
    Returns basic architecture summary.
    """
    try:
        if model_id in PRETRAINED_MODELS:
            model, metadata = model_registry.load_pretrained(model_id)
        elif model_id in _custom_models:
            from ....schemas.model import Framework
            from ....utils.model_loader import ModelLoader

            path = _custom_models[model_id]["path"]
            fw = Framework(_custom_models[model_id]["metadata"].get("framework", "pytorch"))
            model, metadata = ModelLoader.load_model(path, fw)
        else:
            raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

        # Quick stats
        try:
            import torch

            total_params = sum(p.numel() for p in model.parameters())
        except Exception:
            total_params = 0

        return {
            "model_id": model_id,
            "status": "loaded",
            "total_params": total_params,
            "message": f"Model {model_id} loaded successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model load failed for {model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Upload Custom Model
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/upload")
async def upload_model(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
) -> Dict[str, Any]:
    """
    Upload a custom model file (.pt, .pth, .h5, .onnx).
    """
    logger.info(f"Uploading model: {file.filename}")

    # Validate extension
    allowed = {".pth", ".pt", ".h5", ".keras", ".onnx"}
    suffix = Path(file.filename).suffix.lower() if file.filename else ""
    if suffix not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{suffix}'. Allowed: {', '.join(sorted(allowed))}",
        )

    # Detect framework from extension
    framework_map = {
        ".pt": "pytorch",
        ".pth": "pytorch",
        ".h5": "tensorflow",
        ".keras": "tensorflow",
        ".onnx": "onnx",
    }
    framework = framework_map.get(suffix, "unknown")

    # Save file
    model_id = f"custom_{uuid.uuid4().hex[:8]}"
    save_path = MODELS_DIR / f"{model_id}{suffix}"

    try:
        content = await file.read()
        with open(save_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    file_size_mb = round(len(content) / 1024 / 1024, 2)

    # Register in custom models
    _custom_models[model_id] = {
        "path": str(save_path),
        "metadata": {
            "id": model_id,
            "name": Path(file.filename).stem,
            "framework": framework,
            "description": f"Custom uploaded model from {file.filename}",
            "parameters": "Unknown",
            "input_size": [224, 224, 3],
            "pretrained": False,
            "file_size_mb": file_size_mb,
            "original_filename": file.filename,
        },
    }

    return {
        "model_id": model_id,
        "filename": file.filename,
        "framework": framework,
        "file_size_mb": file_size_mb,
        "status": "uploaded",
        "message": f"Model uploaded. Use model_id '{model_id}' for inference.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Delete
# ─────────────────────────────────────────────────────────────────────────────


@router.delete("/{model_id}")
async def delete_model(model_id: str) -> Dict[str, Any]:
    """
    Delete a custom uploaded model.
    Pretrained models cannot be deleted.
    """
    if model_id in PRETRAINED_MODELS:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete pretrained models",
        )

    if model_id not in _custom_models:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

    # Remove file
    path = Path(_custom_models[model_id]["path"])
    if path.exists():
        path.unlink()

    del _custom_models[model_id]

    return {
        "model_id": model_id,
        "status": "deleted",
        "message": f"Model {model_id} deleted successfully",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Cache management
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/cache/info")
async def get_cache_info() -> Dict[str, Any]:
    """Get model cache information."""
    return model_registry.get_cache_info()


# Made with Bob
