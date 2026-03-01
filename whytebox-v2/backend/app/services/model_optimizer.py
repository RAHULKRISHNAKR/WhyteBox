"""
Model Optimization Service

Provides model optimization techniques:
- Quantization (INT8, FP16)
- Pruning (structured, unstructured)
- Knowledge distillation
- Model compression

Author: WhyteBox Team
Date: 2026-02-26
"""

import copy
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.quantization as quant

logger = logging.getLogger(__name__)


class ModelOptimizer:
    """
    Optimize models for deployment with various techniques.

    Supported optimizations:
    - Dynamic quantization (INT8)
    - Static quantization (INT8)
    - FP16 conversion
    - Unstructured pruning
    - Structured pruning
    """

    def __init__(self, output_dir: str = "./optimized_models"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def dynamic_quantization(
        self,
        model: nn.Module,
        dtype: torch.dtype = torch.qint8,
        modules_to_quantize: Optional[set] = None,
    ) -> Tuple[nn.Module, Dict[str, Any]]:
        """
        Apply dynamic quantization to model.

        Dynamic quantization quantizes weights ahead of time but activations
        are quantized dynamically at runtime. Good for models where runtime
        is dominated by loading weights (e.g., LSTMs, Transformers).

        Args:
            model: PyTorch model
            dtype: Quantization dtype (qint8 or float16)
            modules_to_quantize: Set of module types to quantize

        Returns:
            Quantized model and optimization metadata
        """
        if modules_to_quantize is None:
            modules_to_quantize = {nn.Linear, nn.LSTM, nn.GRU}

        # Get original model size
        original_size = self._get_model_size(model)

        # Apply dynamic quantization
        quantized_model = quant.quantize_dynamic(model, modules_to_quantize, dtype=dtype)

        # Get quantized model size
        quantized_size = self._get_model_size(quantized_model)

        compression_ratio = original_size / quantized_size

        logger.info(
            f"Dynamic quantization complete. "
            f"Size: {original_size:.2f}MB → {quantized_size:.2f}MB "
            f"(compression: {compression_ratio:.2f}x)"
        )

        return quantized_model, {
            "method": "dynamic_quantization",
            "dtype": str(dtype),
            "original_size_mb": original_size,
            "quantized_size_mb": quantized_size,
            "compression_ratio": compression_ratio,
            "modules_quantized": [m.__name__ for m in modules_to_quantize],
        }

    def static_quantization(
        self, model: nn.Module, calibration_data: torch.Tensor, backend: str = "fbgemm"
    ) -> Tuple[nn.Module, Dict[str, Any]]:
        """
        Apply static quantization to model.

        Static quantization quantizes both weights and activations ahead of time.
        Requires calibration data to determine activation ranges. Provides better
        performance than dynamic quantization.

        Args:
            model: PyTorch model
            calibration_data: Data for calibrating activation ranges
            backend: Quantization backend ('fbgemm' for x86, 'qnnpack' for ARM)

        Returns:
            Quantized model and optimization metadata
        """
        # Set quantization backend
        torch.backends.quantized.engine = backend

        # Get original model size
        original_size = self._get_model_size(model)

        # Prepare model for quantization
        model.eval()
        model.qconfig = quant.get_default_qconfig(backend)

        # Fuse modules if possible (Conv+BN+ReLU, etc.)
        model_fused = quant.fuse_modules(model, [["conv", "bn", "relu"]])

        # Prepare for quantization
        model_prepared = quant.prepare(model_fused)

        # Calibrate with sample data
        with torch.no_grad():
            model_prepared(calibration_data)

        # Convert to quantized model
        quantized_model = quant.convert(model_prepared)

        # Get quantized model size
        quantized_size = self._get_model_size(quantized_model)

        compression_ratio = original_size / quantized_size

        logger.info(
            f"Static quantization complete. "
            f"Size: {original_size:.2f}MB → {quantized_size:.2f}MB "
            f"(compression: {compression_ratio:.2f}x)"
        )

        return quantized_model, {
            "method": "static_quantization",
            "backend": backend,
            "original_size_mb": original_size,
            "quantized_size_mb": quantized_size,
            "compression_ratio": compression_ratio,
            "calibration_samples": calibration_data.shape[0],
        }

    def fp16_conversion(self, model: nn.Module) -> Tuple[nn.Module, Dict[str, Any]]:
        """
        Convert model to FP16 (half precision).

        FP16 reduces model size by 2x and can provide speedup on GPUs
        with Tensor Cores. May have slight accuracy loss.

        Args:
            model: PyTorch model

        Returns:
            FP16 model and optimization metadata
        """
        # Get original model size
        original_size = self._get_model_size(model)

        # Convert to FP16
        fp16_model = model.half()

        # Get FP16 model size
        fp16_size = self._get_model_size(fp16_model)

        compression_ratio = original_size / fp16_size

        logger.info(
            f"FP16 conversion complete. "
            f"Size: {original_size:.2f}MB → {fp16_size:.2f}MB "
            f"(compression: {compression_ratio:.2f}x)"
        )

        return fp16_model, {
            "method": "fp16_conversion",
            "original_size_mb": original_size,
            "fp16_size_mb": fp16_size,
            "compression_ratio": compression_ratio,
        }

    def unstructured_pruning(
        self, model: nn.Module, amount: float = 0.3, modules_to_prune: Optional[list] = None
    ) -> Tuple[nn.Module, Dict[str, Any]]:
        """
        Apply unstructured magnitude-based pruning.

        Removes individual weights with smallest magnitudes. Can achieve
        high sparsity but may not provide speedup without specialized hardware.

        Args:
            model: PyTorch model
            amount: Fraction of weights to prune (0.0 to 1.0)
            modules_to_prune: List of (module, parameter_name) tuples

        Returns:
            Pruned model and optimization metadata
        """
        import torch.nn.utils.prune as prune

        # Get original model size
        original_size = self._get_model_size(model)

        # Collect modules to prune if not specified
        if modules_to_prune is None:
            modules_to_prune = []
            for name, module in model.named_modules():
                if isinstance(module, (nn.Linear, nn.Conv2d)):
                    modules_to_prune.append((module, "weight"))

        # Apply global unstructured pruning
        prune.global_unstructured(
            modules_to_prune, pruning_method=prune.L1Unstructured, amount=amount
        )

        # Make pruning permanent
        for module, param_name in modules_to_prune:
            prune.remove(module, param_name)

        # Get pruned model size
        pruned_size = self._get_model_size(model)

        # Calculate sparsity
        total_params = 0
        zero_params = 0
        for module, param_name in modules_to_prune:
            param = getattr(module, param_name)
            total_params += param.numel()
            zero_params += (param == 0).sum().item()

        sparsity = zero_params / total_params if total_params > 0 else 0

        logger.info(
            f"Unstructured pruning complete. "
            f"Sparsity: {sparsity:.2%}, "
            f"Size: {original_size:.2f}MB → {pruned_size:.2f}MB"
        )

        return model, {
            "method": "unstructured_pruning",
            "amount": amount,
            "sparsity": sparsity,
            "original_size_mb": original_size,
            "pruned_size_mb": pruned_size,
            "modules_pruned": len(modules_to_prune),
        }

    def structured_pruning(
        self, model: nn.Module, amount: float = 0.3, dim: int = 0
    ) -> Tuple[nn.Module, Dict[str, Any]]:
        """
        Apply structured pruning (removes entire channels/filters).

        Removes entire structures (channels, filters) which can provide
        actual speedup without specialized hardware.

        Args:
            model: PyTorch model
            amount: Fraction of structures to prune
            dim: Dimension to prune (0 for filters, 1 for channels)

        Returns:
            Pruned model and optimization metadata
        """
        import torch.nn.utils.prune as prune

        # Get original model size
        original_size = self._get_model_size(model)

        # Collect Conv2d layers
        conv_layers = []
        for name, module in model.named_modules():
            if isinstance(module, nn.Conv2d):
                conv_layers.append((module, "weight"))

        # Apply structured pruning
        for module, param_name in conv_layers:
            prune.ln_structured(module, name=param_name, amount=amount, n=2, dim=dim)

        # Make pruning permanent
        for module, param_name in conv_layers:
            prune.remove(module, param_name)

        # Get pruned model size
        pruned_size = self._get_model_size(model)

        logger.info(
            f"Structured pruning complete. " f"Size: {original_size:.2f}MB → {pruned_size:.2f}MB"
        )

        return model, {
            "method": "structured_pruning",
            "amount": amount,
            "dim": dim,
            "original_size_mb": original_size,
            "pruned_size_mb": pruned_size,
            "layers_pruned": len(conv_layers),
        }

    def optimize_for_mobile(
        self, model: nn.Module, example_input: torch.Tensor, output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Optimize model for mobile deployment.

        Applies TorchScript tracing and mobile optimization.

        Args:
            model: PyTorch model
            example_input: Example input tensor for tracing
            output_path: Output path for optimized model

        Returns:
            Optimization metadata
        """
        if output_path is None:
            output_path = self.output_dir / "mobile_model.pt"
        else:
            output_path = Path(output_path)

        # Set model to eval mode
        model.eval()

        # Trace the model
        traced_model = torch.jit.trace(model, example_input)

        # Optimize for mobile
        from torch.utils.mobile_optimizer import optimize_for_mobile

        optimized_model = optimize_for_mobile(traced_model)

        # Save optimized model
        optimized_model._save_for_lite_interpreter(str(output_path))

        file_size = output_path.stat().st_size / (1024 * 1024)

        logger.info(f"Mobile optimization complete: {output_path}")

        return {
            "method": "mobile_optimization",
            "output_path": str(output_path),
            "file_size_mb": file_size,
            "format": "torchscript_mobile",
        }

    def benchmark_model(
        self,
        model: nn.Module,
        input_shape: Tuple[int, ...],
        num_iterations: int = 100,
        warmup_iterations: int = 10,
    ) -> Dict[str, Any]:
        """
        Benchmark model inference performance.

        Args:
            model: PyTorch model
            input_shape: Input tensor shape
            num_iterations: Number of inference iterations
            warmup_iterations: Number of warmup iterations

        Returns:
            Benchmark results
        """
        import time

        model.eval()
        device = next(model.parameters()).device

        # Create dummy input
        dummy_input = torch.randn(*input_shape).to(device)

        # Warmup
        with torch.no_grad():
            for _ in range(warmup_iterations):
                _ = model(dummy_input)

        # Benchmark
        times = []
        with torch.no_grad():
            for _ in range(num_iterations):
                start = time.time()
                _ = model(dummy_input)
                if device.type == "cuda":
                    torch.cuda.synchronize()
                times.append(time.time() - start)

        times = np.array(times) * 1000  # Convert to ms

        return {
            "mean_ms": float(np.mean(times)),
            "std_ms": float(np.std(times)),
            "min_ms": float(np.min(times)),
            "max_ms": float(np.max(times)),
            "p50_ms": float(np.percentile(times, 50)),
            "p95_ms": float(np.percentile(times, 95)),
            "p99_ms": float(np.percentile(times, 99)),
            "throughput_fps": 1000.0 / np.mean(times),
            "num_iterations": num_iterations,
        }

    def _get_model_size(self, model: nn.Module) -> float:
        """
        Calculate model size in MB.

        Args:
            model: PyTorch model

        Returns:
            Model size in megabytes
        """
        param_size = 0
        for param in model.parameters():
            param_size += param.nelement() * param.element_size()

        buffer_size = 0
        for buffer in model.buffers():
            buffer_size += buffer.nelement() * buffer.element_size()

        size_mb = (param_size + buffer_size) / (1024**2)
        return size_mb

    def compare_optimizations(
        self, model: nn.Module, input_shape: Tuple[int, ...], optimizations: list = None
    ) -> Dict[str, Any]:
        """
        Compare different optimization techniques.

        Args:
            model: PyTorch model
            input_shape: Input tensor shape
            optimizations: List of optimization methods to compare

        Returns:
            Comparison results
        """
        if optimizations is None:
            optimizations = ["original", "dynamic_quant", "fp16", "pruning"]

        results = {}

        # Original model
        if "original" in optimizations:
            results["original"] = {
                "size_mb": self._get_model_size(model),
                "benchmark": self.benchmark_model(model, input_shape),
            }

        # Dynamic quantization
        if "dynamic_quant" in optimizations:
            quant_model, quant_info = self.dynamic_quantization(copy.deepcopy(model))
            results["dynamic_quant"] = {
                **quant_info,
                "benchmark": self.benchmark_model(quant_model, input_shape),
            }

        # FP16
        if "fp16" in optimizations:
            fp16_model, fp16_info = self.fp16_conversion(copy.deepcopy(model))
            results["fp16"] = {
                **fp16_info,
                "benchmark": self.benchmark_model(fp16_model, input_shape),
            }

        # Pruning
        if "pruning" in optimizations:
            pruned_model, prune_info = self.unstructured_pruning(copy.deepcopy(model), amount=0.3)
            results["pruning"] = {
                **prune_info,
                "benchmark": self.benchmark_model(pruned_model, input_shape),
            }

        return results


# Global optimizer instance
model_optimizer = ModelOptimizer()


def get_model_optimizer() -> ModelOptimizer:
    """Dependency to get model optimizer"""
    return model_optimizer


# Made with Bob
