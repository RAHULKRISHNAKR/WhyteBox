"""
Explainability API endpoints - model_id based.

Provides REST API for generating model explanations using model IDs.
Supports Grad-CAM, Saliency Maps, and Integrated Gradients.
"""

import base64
import logging
import time
from io import BytesIO
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from PIL import Image

from ....services.model_service import model_registry, PRETRAINED_MODELS
from ....utils.preprocessing import ImagePreprocessor, NormalizationMethod
from ....utils.visualization import ExplainabilityVisualizer

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_model_by_id(model_id: str):
    """Load a model by ID."""
    if model_id in PRETRAINED_MODELS:
        model, metadata = model_registry.load_pretrained(model_id)
        return model, metadata, "pytorch"

    from ....api.v1.endpoints.models import _custom_models
    if model_id in _custom_models:
        from ....utils.model_loader import ModelLoader
        from ....schemas.model import Framework
        path = _custom_models[model_id]["path"]
        framework = _custom_models[model_id]["metadata"].get("framework", "pytorch")
        fw = Framework(framework)
        model, meta = ModelLoader.load_model(path, fw)
        return model, meta, framework

    raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")


def _preprocess_image(
    image_array: np.ndarray,
    target_size: tuple = (224, 224),
) -> np.ndarray:
    """Preprocess image for model (channel-first, ImageNet normalized)."""
    return ImagePreprocessor.preprocess_for_model(
        image_array,
        target_size=target_size,
        normalization=NormalizationMethod.IMAGENET,
        channel_first=True,
    )


def _array_to_base64(arr: np.ndarray) -> str:
    """Convert numpy array to base64 PNG string."""
    if arr.dtype != np.uint8:
        arr = (arr * 255).clip(0, 255).astype(np.uint8)
    pil = Image.fromarray(arr)
    buf = BytesIO()
    pil.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _get_default_target_layer(model_id: str, model: Any) -> str:
    """Get the default Grad-CAM target layer for a model."""
    # Check pretrained registry
    default = PRETRAINED_MODELS.get(model_id, {}).get("default_target_layer")
    if default:
        return default

    # Find last Conv2d layer
    last_conv = None
    for name, mod in model.named_modules():
        if type(mod).__name__ == "Conv2d":
            last_conv = name
    if last_conv:
        return last_conv

    raise ValueError(f"Could not determine target layer for model {model_id}")


# ─────────────────────────────────────────────────────────────────────────────
# Grad-CAM
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/gradcam")
async def explain_gradcam(
    model_id: str = Form(...),
    image: UploadFile = File(...),
    target_layer: Optional[str] = Form(None),
    target_class: Optional[int] = Form(None),
    colormap: str = Form("jet"),
    alpha: float = Form(0.5),
    target_size: str = Form("224,224"),
) -> Dict[str, Any]:
    """
    Generate Grad-CAM explanation.

    Args:
        model_id: Model identifier
        image: Input image
        target_layer: Conv layer for Grad-CAM (auto-detected if None)
        target_class: Target class index (None = top predicted)
        colormap: Heatmap colormap
        alpha: Overlay transparency
        target_size: Resize target as "H,W"

    Returns:
        Heatmap and overlay as base64 PNG images
    """
    try:
        import torch

        # Load image
        image_data = await image.read()
        pil_image = Image.open(BytesIO(image_data)).convert("RGB")
        original_array = np.array(pil_image)

        h, w = map(int, target_size.split(","))
        processed = _preprocess_image(original_array, (h, w))

        # Load model
        model, metadata, framework = _load_model_by_id(model_id)

        if framework != "pytorch":
            raise HTTPException(status_code=400, detail="Only PyTorch models supported")

        # Resolve target layer
        if not target_layer:
            target_layer = _get_default_target_layer(model_id, model)

        # ── Grad-CAM implementation ──────────────────────────────────────────
        activations_store = {}
        gradients_store = {}

        def forward_hook(module, inp, out):
            activations_store["value"] = out

        def backward_hook(module, grad_in, grad_out):
            gradients_store["value"] = grad_out[0]

        # Find target layer
        target_module = None
        for name, mod in model.named_modules():
            if name == target_layer:
                target_module = mod
                break

        if target_module is None:
            raise HTTPException(
                status_code=400,
                detail=f"Layer '{target_layer}' not found in model"
            )

        fwd_handle = target_module.register_forward_hook(forward_hook)
        bwd_handle = target_module.register_full_backward_hook(backward_hook)

        try:
            input_tensor = torch.from_numpy(processed).float().unsqueeze(0)
            input_tensor.requires_grad_(True)

            model.eval()
            # Enable gradients for Grad-CAM
            with torch.enable_grad():
                output = model(input_tensor)

                if target_class is None:
                    target_class = int(output.argmax(dim=1).item())

                probs = torch.softmax(output, dim=1)
                confidence = float(probs[0, target_class].item())

                model.zero_grad()
                output[0, target_class].backward()

        finally:
            fwd_handle.remove()
            bwd_handle.remove()

        if "value" not in activations_store or "value" not in gradients_store:
            raise HTTPException(status_code=500, detail="Failed to capture Grad-CAM data")

        # Compute CAM
        grads = gradients_store["value"][0]      # (C, H, W)
        acts = activations_store["value"][0]     # (C, H, W)

        weights = grads.mean(dim=(1, 2))         # (C,)
        cam = torch.zeros(acts.shape[1:])
        for i, wt in enumerate(weights):
            cam += wt * acts[i]

        cam = torch.relu(cam).detach().cpu().numpy()

        # Normalize
        if cam.max() > cam.min():
            cam = (cam - cam.min()) / (cam.max() - cam.min())
        else:
            cam = np.zeros_like(cam)

        # Resize to original image size
        from PIL import Image as PILImage
        cam_pil = PILImage.fromarray((cam * 255).astype(np.uint8))
        cam_resized = cam_pil.resize(
            (pil_image.width, pil_image.height), PILImage.BILINEAR
        )
        cam_np = np.array(cam_resized).astype(np.float32) / 255.0

        # Create colored heatmap
        heatmap_colored = ExplainabilityVisualizer.apply_colormap(cam_np, colormap)

        # Create overlay
        overlay = ExplainabilityVisualizer.create_heatmap_overlay(
            original_array, cam_np, alpha=alpha, colormap=colormap
        )

        # Get class name
        try:
            from torchvision.models import ResNet50_Weights
            classes = ResNet50_Weights.IMAGENET1K_V2.meta["categories"]
            class_name = classes[target_class] if target_class < len(classes) else f"class_{target_class}"
        except Exception:
            class_name = f"class_{target_class}"

        return {
            "success": True,
            "method": "Grad-CAM",
            "model_id": model_id,
            "target_layer": target_layer,
            "predicted_class": target_class,
            "predicted_class_name": class_name,
            "confidence": round(confidence, 4),
            "confidence_pct": round(confidence * 100, 2),
            "heatmap": _array_to_base64(heatmap_colored),
            "overlay": _array_to_base64(overlay),
            "heatmap_data": cam_np.tolist(),  # raw values for frontend rendering
        }

    except HTTPException:
        raise
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"PyTorch not installed: {e}")
    except Exception as e:
        logger.error(f"Grad-CAM failed for {model_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Saliency Maps
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/saliency")
async def explain_saliency(
    model_id: str = Form(...),
    image: UploadFile = File(...),
    target_class: Optional[int] = Form(None),
    absolute: bool = Form(True),
    smooth: bool = Form(False),
    num_samples: int = Form(20),
    noise_level: float = Form(0.1),
    colormap: str = Form("hot"),
    alpha: float = Form(0.5),
    target_size: str = Form("224,224"),
) -> Dict[str, Any]:
    """
    Generate Saliency Map explanation.
    Optionally uses SmoothGrad for noise-averaged gradients.
    """
    try:
        import torch

        image_data = await image.read()
        pil_image = Image.open(BytesIO(image_data)).convert("RGB")
        original_array = np.array(pil_image)

        h, w = map(int, target_size.split(","))
        processed = _preprocess_image(original_array, (h, w))

        model, metadata, framework = _load_model_by_id(model_id)
        if framework != "pytorch":
            raise HTTPException(status_code=400, detail="Only PyTorch models supported")

        model.eval()

        def _compute_saliency(inp_array: np.ndarray) -> tuple:
            """Compute saliency for one input. Returns (saliency, target_class, confidence)."""
            input_tensor = torch.from_numpy(inp_array).float().unsqueeze(0)
            input_tensor.requires_grad_(True)

            with torch.enable_grad():
                output = model(input_tensor)
                tc = target_class if target_class is not None else int(output.argmax(dim=1).item())
                probs = torch.softmax(output, dim=1)
                conf = float(probs[0, tc].item())
                model.zero_grad()
                output[0, tc].backward()

            grad = input_tensor.grad[0].cpu().numpy()  # (C, H, W)
            if absolute:
                grad = np.abs(grad)
            # Aggregate channels
            sal = grad.max(axis=0)  # (H, W)
            return sal, tc, conf

        if smooth:
            # SmoothGrad: average over noisy copies
            saliency_sum = np.zeros((h, w))
            tc_final, conf_final = None, 0.0
            noise_std = noise_level * (processed.max() - processed.min())

            for _ in range(num_samples):
                noisy = processed + np.random.normal(0, noise_std, processed.shape).astype(np.float32)
                sal, tc, conf = _compute_saliency(noisy)
                saliency_sum += sal
                tc_final = tc
                conf_final = conf

            saliency = saliency_sum / num_samples
        else:
            saliency, tc_final, conf_final = _compute_saliency(processed)

        # Normalize
        if saliency.max() > saliency.min():
            saliency_norm = (saliency - saliency.min()) / (saliency.max() - saliency.min())
        else:
            saliency_norm = np.zeros_like(saliency)

        # Resize to original
        sal_pil = Image.fromarray((saliency_norm * 255).astype(np.uint8))
        sal_resized = sal_pil.resize((pil_image.width, pil_image.height), Image.BILINEAR)
        sal_np = np.array(sal_resized).astype(np.float32) / 255.0

        heatmap_colored = ExplainabilityVisualizer.apply_colormap(sal_np, colormap)
        overlay = ExplainabilityVisualizer.create_heatmap_overlay(
            original_array, sal_np, alpha=alpha, colormap=colormap
        )

        try:
            from torchvision.models import ResNet50_Weights
            classes = ResNet50_Weights.IMAGENET1K_V2.meta["categories"]
            class_name = classes[tc_final] if tc_final < len(classes) else f"class_{tc_final}"
        except Exception:
            class_name = f"class_{tc_final}"

        method_name = "SmoothGrad" if smooth else "Saliency Map"

        return {
            "success": True,
            "method": method_name,
            "model_id": model_id,
            "predicted_class": tc_final,
            "predicted_class_name": class_name,
            "confidence": round(conf_final, 4),
            "confidence_pct": round(conf_final * 100, 2),
            "heatmap": _array_to_base64(heatmap_colored),
            "overlay": _array_to_base64(overlay),
            "heatmap_data": sal_np.tolist(),
            "metadata": {
                "absolute": absolute,
                "smooth": smooth,
                "num_samples": num_samples if smooth else 1,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Saliency failed for {model_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Integrated Gradients
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/integrated-gradients")
async def explain_integrated_gradients(
    model_id: str = Form(...),
    image: UploadFile = File(...),
    target_class: Optional[int] = Form(None),
    num_steps: int = Form(50),
    baseline_type: str = Form("zeros"),  # "zeros" | "blur" | "noise"
    colormap: str = Form("RdBu_r"),
    alpha: float = Form(0.5),
    target_size: str = Form("224,224"),
) -> Dict[str, Any]:
    """
    Generate Integrated Gradients explanation.

    Computes path-integrated gradients from baseline to input.
    Satisfies sensitivity and implementation invariance axioms.
    Reference: Sundararajan et al. (2017)
    """
    try:
        import torch

        image_data = await image.read()
        pil_image = Image.open(BytesIO(image_data)).convert("RGB")
        original_array = np.array(pil_image)

        h, w = map(int, target_size.split(","))
        processed = _preprocess_image(original_array, (h, w))

        model, metadata, framework = _load_model_by_id(model_id)
        if framework != "pytorch":
            raise HTTPException(status_code=400, detail="Only PyTorch models supported")

        model.eval()

        # Create baseline
        if baseline_type == "zeros":
            baseline = np.zeros_like(processed)
        elif baseline_type == "blur":
            from scipy.ndimage import gaussian_filter
            baseline = gaussian_filter(processed, sigma=10)
        elif baseline_type == "noise":
            baseline = np.random.normal(0, 0.1, processed.shape).astype(np.float32)
        else:
            baseline = np.zeros_like(processed)

        # Integrated Gradients computation
        input_t = torch.from_numpy(processed).float()
        baseline_t = torch.from_numpy(baseline).float()

        # Determine target class from full input
        with torch.no_grad():
            out = model(input_t.unsqueeze(0))
            tc = target_class if target_class is not None else int(out.argmax(dim=1).item())
            probs = torch.softmax(out, dim=1)
            confidence = float(probs[0, tc].item())

        # Compute integrated gradients via Riemann sum
        integrated_grads = torch.zeros_like(input_t)

        for step in range(num_steps):
            alpha_step = step / num_steps
            interpolated = baseline_t + alpha_step * (input_t - baseline_t)
            interpolated = interpolated.unsqueeze(0).requires_grad_(True)

            with torch.enable_grad():
                output = model(interpolated)
                model.zero_grad()
                output[0, tc].backward()

            integrated_grads += interpolated.grad[0].detach()

        # Scale by (input - baseline) / num_steps
        integrated_grads = integrated_grads / num_steps * (input_t - baseline_t)

        # Aggregate channels (sum of absolute values)
        ig_np = integrated_grads.cpu().numpy()
        attribution = np.abs(ig_np).sum(axis=0)  # (H, W)

        # Normalize
        if attribution.max() > attribution.min():
            attribution_norm = (attribution - attribution.min()) / (attribution.max() - attribution.min())
        else:
            attribution_norm = np.zeros_like(attribution)

        # Resize to original
        attr_pil = Image.fromarray((attribution_norm * 255).astype(np.uint8))
        attr_resized = attr_pil.resize((pil_image.width, pil_image.height), Image.BILINEAR)
        attr_np = np.array(attr_resized).astype(np.float32) / 255.0

        heatmap_colored = ExplainabilityVisualizer.apply_colormap(attr_np, colormap)
        overlay = ExplainabilityVisualizer.create_heatmap_overlay(
            original_array, attr_np, alpha=alpha, colormap=colormap
        )

        try:
            from torchvision.models import ResNet50_Weights
            classes = ResNet50_Weights.IMAGENET1K_V2.meta["categories"]
            class_name = classes[tc] if tc < len(classes) else f"class_{tc}"
        except Exception:
            class_name = f"class_{tc}"

        return {
            "success": True,
            "method": "Integrated Gradients",
            "model_id": model_id,
            "predicted_class": tc,
            "predicted_class_name": class_name,
            "confidence": round(confidence, 4),
            "confidence_pct": round(confidence * 100, 2),
            "num_steps": num_steps,
            "baseline_type": baseline_type,
            "heatmap": _array_to_base64(heatmap_colored),
            "overlay": _array_to_base64(overlay),
            "heatmap_data": attr_np.tolist(),
            "metadata": {
                "num_steps": num_steps,
                "baseline_type": baseline_type,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Integrated Gradients failed for {model_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Compare Methods
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/compare")
async def compare_methods(
    model_id: str = Form(...),
    image: UploadFile = File(...),
    target_layer: Optional[str] = Form(None),
    target_class: Optional[int] = Form(None),
    colormap: str = Form("jet"),
    target_size: str = Form("224,224"),
) -> Dict[str, Any]:
    """
    Run all explainability methods and return comparison.
    """
    try:
        import torch

        image_data = await image.read()
        pil_image = Image.open(BytesIO(image_data)).convert("RGB")
        original_array = np.array(pil_image)

        h, w = map(int, target_size.split(","))
        processed = _preprocess_image(original_array, (h, w))

        model, metadata, framework = _load_model_by_id(model_id)
        if framework != "pytorch":
            raise HTTPException(status_code=400, detail="Only PyTorch models supported")

        model.eval()

        # Determine target class once
        with torch.no_grad():
            out = model(torch.from_numpy(processed).float().unsqueeze(0))
            tc = target_class if target_class is not None else int(out.argmax(dim=1).item())
            probs = torch.softmax(out, dim=1)
            confidence = float(probs[0, tc].item())

        try:
            from torchvision.models import ResNet50_Weights
            classes = ResNet50_Weights.IMAGENET1K_V2.meta["categories"]
            class_name = classes[tc] if tc < len(classes) else f"class_{tc}"
        except Exception:
            class_name = f"class_{tc}"

        results = {
            "model_id": model_id,
            "predicted_class": tc,
            "predicted_class_name": class_name,
            "confidence": round(confidence, 4),
            "methods": {},
        }

        # ── Grad-CAM ──────────────────────────────────────────────────────────
        try:
            t0 = time.time()
            if not target_layer:
                tl = _get_default_target_layer(model_id, model)
            else:
                tl = target_layer

            acts_s, grads_s = {}, {}

            def fwd(m, i, o): acts_s["v"] = o
            def bwd(m, gi, go): grads_s["v"] = go[0]

            tmod = dict(model.named_modules()).get(tl)
            if tmod:
                fh = tmod.register_forward_hook(fwd)
                bh = tmod.register_full_backward_hook(bwd)
                inp = torch.from_numpy(processed).float().unsqueeze(0).requires_grad_(True)
                with torch.enable_grad():
                    o2 = model(inp)
                    model.zero_grad()
                    o2[0, tc].backward()
                fh.remove(); bh.remove()

                if "v" in acts_s and "v" in grads_s:
                    wts = grads_s["v"][0].mean(dim=(1, 2))
                    cam = sum(wts[i] * acts_s["v"][0][i] for i in range(len(wts)))
                    cam = torch.relu(cam).detach().cpu().numpy()
                    if cam.max() > cam.min():
                        cam = (cam - cam.min()) / (cam.max() - cam.min())
                    cam_pil = Image.fromarray((cam * 255).astype(np.uint8))
                    cam_r = np.array(cam_pil.resize((pil_image.width, pil_image.height), Image.BILINEAR)).astype(np.float32) / 255.0
                    overlay = ExplainabilityVisualizer.create_heatmap_overlay(original_array, cam_r, colormap=colormap)
                    results["methods"]["gradcam"] = {
                        "name": "Grad-CAM",
                        "overlay": _array_to_base64(overlay),
                        "heatmap_data": cam_r.tolist(),
                        "compute_time_ms": round((time.time() - t0) * 1000, 1),
                    }
        except Exception as e:
            logger.warning(f"Grad-CAM in compare failed: {e}")

        # ── Saliency ──────────────────────────────────────────────────────────
        try:
            t0 = time.time()
            inp = torch.from_numpy(processed).float().unsqueeze(0).requires_grad_(True)
            with torch.enable_grad():
                o2 = model(inp)
                model.zero_grad()
                o2[0, tc].backward()
            sal = inp.grad[0].abs().max(dim=0)[0].cpu().numpy()
            if sal.max() > sal.min():
                sal = (sal - sal.min()) / (sal.max() - sal.min())
            sal_pil = Image.fromarray((sal * 255).astype(np.uint8))
            sal_r = np.array(sal_pil.resize((pil_image.width, pil_image.height), Image.BILINEAR)).astype(np.float32) / 255.0
            overlay = ExplainabilityVisualizer.create_heatmap_overlay(original_array, sal_r, colormap="hot")
            results["methods"]["saliency"] = {
                "name": "Saliency Map",
                "overlay": _array_to_base64(overlay),
                "heatmap_data": sal_r.tolist(),
                "compute_time_ms": round((time.time() - t0) * 1000, 1),
            }
        except Exception as e:
            logger.warning(f"Saliency in compare failed: {e}")

        # ── Integrated Gradients (fast: 20 steps) ─────────────────────────────
        try:
            t0 = time.time()
            steps = 20
            input_t = torch.from_numpy(processed).float()
            baseline_t = torch.zeros_like(input_t)
            ig = torch.zeros_like(input_t)
            for step in range(steps):
                a = step / steps
                interp = (baseline_t + a * (input_t - baseline_t)).unsqueeze(0).requires_grad_(True)
                with torch.enable_grad():
                    o2 = model(interp)
                    model.zero_grad()
                    o2[0, tc].backward()
                ig += interp.grad[0].detach()
            ig = (ig / steps * (input_t - baseline_t)).abs().sum(dim=0).cpu().numpy()
            if ig.max() > ig.min():
                ig = (ig - ig.min()) / (ig.max() - ig.min())
            ig_pil = Image.fromarray((ig * 255).astype(np.uint8))
            ig_r = np.array(ig_pil.resize((pil_image.width, pil_image.height), Image.BILINEAR)).astype(np.float32) / 255.0
            overlay = ExplainabilityVisualizer.create_heatmap_overlay(original_array, ig_r, colormap="RdBu_r")
            results["methods"]["integrated_gradients"] = {
                "name": "Integrated Gradients",
                "overlay": _array_to_base64(overlay),
                "heatmap_data": ig_r.tolist(),
                "compute_time_ms": round((time.time() - t0) * 1000, 1),
            }
        except Exception as e:
            logger.warning(f"Integrated Gradients in compare failed: {e}")

        results["success"] = True
        results["num_methods"] = len(results["methods"])
        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Compare methods failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Available Layers
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/layers")
async def get_available_layers(
    model_id: str,
    device: str = "cpu",
) -> Dict[str, Any]:
    """Get list of available layers for Grad-CAM target selection."""
    try:
        model, metadata, framework = _load_model_by_id(model_id)

        if framework == "pytorch":
            all_layers = [name for name, _ in model.named_modules() if name]
            conv_layers = [
                name for name, mod in model.named_modules()
                if name and type(mod).__name__ in ("Conv2d", "ConvTranspose2d")
            ]
            default = _get_default_target_layer(model_id, model)
        else:
            all_layers = []
            conv_layers = []
            default = None

        return {
            "success": True,
            "model_id": model_id,
            "total_layers": len(all_layers),
            "all_layers": all_layers,
            "conv_layers": conv_layers,
            "recommended_layers": conv_layers[-5:] if conv_layers else all_layers[-5:],
            "default_target_layer": default,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Made with Bob
