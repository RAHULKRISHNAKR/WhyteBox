"""
Streaming Inference WebSocket Endpoint

Provides a WebSocket endpoint that streams layer-by-layer activation data
during inference, enabling real-time visualization in the frontend.

Protocol:
  Client → Server:
    { "type": "start_inference", "data": { "model_id": "resnet50", "image_b64": "<base64>" } }
    { "type": "cancel" }

  Server → Client:
    { "type": "inference_start",    "data": { "model_id", "num_layers" } }
    { "type": "layer_activation",   "data": { "layer_index", "layer_name", "layer_type",
                                               "activation_mean", "activation_max",
                                               "activation_map": [[...]] } }
    { "type": "inference_complete", "data": { "predictions": [...], "top_prediction": {...},
                                               "inference_time_ms", "total_layers_processed" } }
    { "type": "inference_error",    "data": { "message" } }
"""

import asyncio
import base64
import json
import logging
import time
from io import BytesIO
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from PIL import Image

from ....services.model_service import model_registry, PRETRAINED_MODELS
from ....utils.preprocessing import ImagePreprocessor, NormalizationMethod

logger = logging.getLogger(__name__)

router = APIRouter()

# Maximum activation map size to send over WebSocket (downsampled)
MAX_ACT_SIZE = 16


def _preprocess_b64_image(image_b64: str, target_size: tuple = (224, 224)) -> np.ndarray:
    """Decode base64 image and preprocess for model."""
    image_bytes = base64.b64decode(image_b64)
    pil_image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image_array = np.array(pil_image)
    return ImagePreprocessor.preprocess_for_model(
        image_array,
        target_size=target_size,
        normalization=NormalizationMethod.IMAGENET,
        channel_first=True,
    )


def _downsample_activation(act_2d: np.ndarray, max_size: int = MAX_ACT_SIZE) -> List[List[float]]:
    """Downsample a 2D activation map to max_size × max_size for transmission."""
    h, w = act_2d.shape
    if h > max_size or w > max_size:
        from PIL import Image as PILImage
        pil = PILImage.fromarray((act_2d * 255).clip(0, 255).astype(np.uint8))
        pil = pil.resize((min(w, max_size), min(h, max_size)), PILImage.BILINEAR)
        act_2d = np.array(pil).astype(np.float32) / 255.0
    return act_2d.tolist()


@router.websocket("/ws/inference")
async def streaming_inference(websocket: WebSocket):
    """
    WebSocket endpoint for streaming layer-by-layer inference.

    Accepts base64-encoded images and streams activation data
    for each layer as inference progresses.
    """
    await websocket.accept()
    logger.info("Streaming inference WebSocket connected")

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "inference_error", "data": {"message": "Invalid JSON"}})
                continue

            msg_type = msg.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "data": {}})
                continue

            if msg_type != "start_inference":
                await websocket.send_json({
                    "type": "inference_error",
                    "data": {"message": f"Unknown message type: {msg_type}"}
                })
                continue

            # ── Start inference ──────────────────────────────────────────────
            data = msg.get("data", {})
            model_id: str = data.get("model_id", "")
            image_b64: str = data.get("image_b64", "")
            top_k: int = int(data.get("top_k", 5))

            if not model_id or not image_b64:
                await websocket.send_json({
                    "type": "inference_error",
                    "data": {"message": "model_id and image_b64 are required"}
                })
                continue

            await _run_streaming_inference(websocket, model_id, image_b64, top_k)

    except WebSocketDisconnect:
        logger.info("Streaming inference WebSocket disconnected")
    except Exception as e:
        logger.error(f"Streaming inference error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "inference_error",
                "data": {"message": str(e)}
            })
        except Exception:
            pass


async def _run_streaming_inference(
    websocket: WebSocket,
    model_id: str,
    image_b64: str,
    top_k: int,
) -> None:
    """
    Run inference with per-layer activation streaming.
    Sends one 'layer_activation' message per conv/linear layer.
    """
    try:
        import torch

        # Load model
        if model_id not in PRETRAINED_MODELS:
            await websocket.send_json({
                "type": "inference_error",
                "data": {"message": f"Model '{model_id}' not found"}
            })
            return

        model, metadata = model_registry.load_pretrained(model_id)
        model.eval()

        # Preprocess image
        processed = _preprocess_b64_image(image_b64)
        input_tensor = torch.from_numpy(processed).float().unsqueeze(0)

        # Collect leaf modules for streaming
        leaf_modules: List[tuple] = [
            (name, mod)
            for name, mod in model.named_modules()
            if not list(mod.children())
            and type(mod).__name__ in (
                "Conv2d", "Linear", "BatchNorm2d", "ReLU",
                "MaxPool2d", "AvgPool2d", "AdaptiveAvgPool2d",
            )
        ]

        # Notify start
        await websocket.send_json({
            "type": "inference_start",
            "data": {
                "model_id": model_id,
                "model_name": metadata.get("name", model_id),
                "num_layers": len(leaf_modules),
            }
        })

        # ── Register hooks for all target layers ─────────────────────────────
        activation_store: Dict[str, Any] = {}
        hooks = []

        def make_hook(layer_name: str):
            def hook(module, inp, out):
                activation_store[layer_name] = out.detach().cpu().numpy()
            return hook

        for name, mod in leaf_modules:
            h = mod.register_forward_hook(make_hook(name))
            hooks.append(h)

        # ── Forward pass ─────────────────────────────────────────────────────
        start_time = time.time()
        with torch.no_grad():
            output = model(input_tensor)
        inference_time_ms = (time.time() - start_time) * 1000

        # Remove hooks
        for h in hooks:
            h.remove()

        # ── Stream layer activations ──────────────────────────────────────────
        for layer_idx, (name, mod) in enumerate(leaf_modules):
            if name not in activation_store:
                continue

            act = activation_store[name]
            layer_type = type(mod).__name__

            # Compute stats
            act_mean = float(act.mean())
            act_max = float(act.max())
            act_std = float(act.std())
            sparsity = float((act == 0).mean())

            # Build 2D activation map (mean over channels if conv)
            if act.ndim == 4:
                # (1, C, H, W) → mean over channels → (H, W)
                act_2d = act[0].mean(axis=0)
            elif act.ndim == 2:
                # (1, N) → reshape to 2D
                n = act.shape[1]
                side = max(1, int(n ** 0.5))
                act_2d = act[0, :side * side].reshape(side, side)
            else:
                act_2d = act.reshape(-1)[:MAX_ACT_SIZE * MAX_ACT_SIZE]
                side = max(1, int(len(act_2d) ** 0.5))
                act_2d = act_2d[:side * side].reshape(side, side)

            # Normalize to [0, 1]
            a_min, a_max = act_2d.min(), act_2d.max()
            if a_max > a_min:
                act_2d_norm = (act_2d - a_min) / (a_max - a_min)
            else:
                act_2d_norm = np.zeros_like(act_2d)

            activation_map = _downsample_activation(act_2d_norm)

            await websocket.send_json({
                "type": "layer_activation",
                "data": {
                    "layer_index": layer_idx,
                    "layer_name": name,
                    "layer_type": layer_type,
                    "activation_mean": round(act_mean, 4),
                    "activation_max": round(act_max, 4),
                    "activation_std": round(act_std, 4),
                    "sparsity": round(sparsity, 4),
                    "activation_map": activation_map,
                    "total_layers": len(leaf_modules),
                }
            })

            # Small yield to allow WebSocket flush
            await asyncio.sleep(0)

        # ── Final predictions ─────────────────────────────────────────────────
        probs = torch.softmax(output, dim=1)[0].cpu().numpy()
        top_k_actual = min(top_k, len(probs))
        top_indices = np.argsort(probs)[::-1][:top_k_actual]

        try:
            from torchvision.models import ResNet50_Weights
            classes = ResNet50_Weights.IMAGENET1K_V2.meta["categories"]
        except Exception:
            classes = [f"class_{i}" for i in range(1000)]

        predictions = [
            {
                "rank": i + 1,
                "class_index": int(idx),
                "class_name": classes[idx] if idx < len(classes) else f"class_{idx}",
                "confidence": float(probs[idx]),
                "confidence_pct": round(float(probs[idx]) * 100, 2),
            }
            for i, idx in enumerate(top_indices)
        ]

        await websocket.send_json({
            "type": "inference_complete",
            "data": {
                "model_id": model_id,
                "predictions": predictions,
                "top_prediction": predictions[0] if predictions else None,
                "inference_time_ms": round(inference_time_ms, 2),
                "total_layers_processed": len(activation_store),
            }
        })

    except ImportError as e:
        await websocket.send_json({
            "type": "inference_error",
            "data": {"message": f"PyTorch not installed: {e}"}
        })
    except Exception as e:
        logger.error(f"Streaming inference failed: {e}", exc_info=True)
        await websocket.send_json({
            "type": "inference_error",
            "data": {"message": str(e)}
        })

# Made with Bob