"""
Explainability service for orchestrating explainability methods.

Provides a unified interface for generating explanations across different
methods and frameworks.
"""

import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np

from ..explainability import (BaseExplainer, ExplainabilityResult, GradCAM, IntegratedGradients,
                              SaliencyMap)
from ..schemas.model import Framework
from ..utils.model_loader import ModelLoader


class ExplainabilityService:
    """
    Service for managing explainability methods.

    Handles model loading and explanation generation across multiple
    explainability techniques.
    """

    def __init__(self):
        """Initialize explainability service."""
        self.model_cache: Dict[str, Dict[str, Any]] = {}
        self.loader = ModelLoader()

    def load_model(
        self,
        model_path: str,
        framework: Framework,
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
        cache_key: Optional[str] = None,
    ) -> Any:
        """
        Load a model for explainability.

        Args:
            model_path: Path to model file
            framework: Model framework
            device: Device to run on
            class_names: Optional list of class names
            cache_key: Optional cache key

        Returns:
            Loaded model
        """
        # Check cache
        if cache_key and cache_key in self.model_cache:
            cached = self.model_cache[cache_key]
            if cached["device"] == device:
                return cached["model"]

        # Load model
        if framework == Framework.PYTORCH:
            model = self.loader.load_pytorch_model(model_path, device)
        elif framework == Framework.TENSORFLOW:
            model = self.loader.load_tensorflow_model(model_path)
        elif framework == Framework.KERAS:
            model = self.loader.load_keras_model(model_path)
        else:
            raise ValueError(f"Unsupported framework: {framework}")

        # Cache model
        if cache_key:
            self.model_cache[cache_key] = {
                "model": model,
                "device": device,
                "framework": framework,
                "class_names": class_names,
                "loaded_at": time.time(),
            }

        return model

    async def explain_gradcam(
        self,
        model_path: str,
        framework: Framework,
        input_data: np.ndarray,
        target_layer: str,
        target_class: Optional[int] = None,
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
        cache_key: Optional[str] = None,
    ) -> ExplainabilityResult:
        """
        Generate Grad-CAM explanation.

        Args:
            model_path: Path to model file
            framework: Model framework
            input_data: Input data
            target_layer: Target convolutional layer
            target_class: Target class (None for predicted)
            device: Device to run on
            class_names: Optional list of class names
            cache_key: Optional cache key

        Returns:
            ExplainabilityResult object
        """
        # Load model
        model = self.load_model(model_path, framework, device, class_names, cache_key)

        # Create explainer
        explainer = GradCAM(
            model=model,
            target_layer=target_layer,
            device=device,
            class_names=class_names,
            framework=framework.value,
        )

        # Generate explanation
        result = explainer.explain(input_data, target_class)

        return result

    async def explain_saliency(
        self,
        model_path: str,
        framework: Framework,
        input_data: np.ndarray,
        target_class: Optional[int] = None,
        absolute: bool = True,
        smooth: bool = False,
        num_samples: int = 50,
        noise_level: float = 0.1,
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
        cache_key: Optional[str] = None,
    ) -> ExplainabilityResult:
        """
        Generate Saliency Map explanation.

        Args:
            model_path: Path to model file
            framework: Model framework
            input_data: Input data
            target_class: Target class (None for predicted)
            absolute: Whether to take absolute value
            smooth: Whether to use SmoothGrad
            num_samples: Number of samples for SmoothGrad
            noise_level: Noise level for SmoothGrad
            device: Device to run on
            class_names: Optional list of class names
            cache_key: Optional cache key

        Returns:
            ExplainabilityResult object
        """
        # Load model
        model = self.load_model(model_path, framework, device, class_names, cache_key)

        # Create explainer
        explainer = SaliencyMap(
            model=model,
            device=device,
            class_names=class_names,
            framework=framework.value,
        )

        # Generate explanation
        if smooth:
            result = explainer.explain_smooth(
                input_data,
                target_class,
                num_samples=num_samples,
                noise_level=noise_level,
                absolute=absolute,
            )
        else:
            result = explainer.explain(input_data, target_class, absolute)

        return result

    async def explain_integrated_gradients(
        self,
        model_path: str,
        framework: Framework,
        input_data: np.ndarray,
        target_class: Optional[int] = None,
        baseline: Optional[np.ndarray] = None,
        num_steps: int = 50,
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
        cache_key: Optional[str] = None,
    ) -> ExplainabilityResult:
        """
        Generate Integrated Gradients explanation.

        Args:
            model_path: Path to model file
            framework: Model framework
            input_data: Input data
            target_class: Target class (None for predicted)
            baseline: Baseline input (None for zeros)
            num_steps: Number of interpolation steps
            device: Device to run on
            class_names: Optional list of class names
            cache_key: Optional cache key

        Returns:
            ExplainabilityResult object
        """
        # Load model
        model = self.load_model(model_path, framework, device, class_names, cache_key)

        # Create explainer
        explainer = IntegratedGradients(
            model=model,
            device=device,
            class_names=class_names,
            framework=framework.value,
        )

        # Generate explanation
        result = explainer.explain(input_data, target_class, baseline, num_steps)

        return result

    async def compare_methods(
        self,
        model_path: str,
        framework: Framework,
        input_data: np.ndarray,
        target_layer: str,
        target_class: Optional[int] = None,
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
        cache_key: Optional[str] = None,
    ) -> Dict[str, ExplainabilityResult]:
        """
        Compare multiple explainability methods.

        Args:
            model_path: Path to model file
            framework: Model framework
            input_data: Input data
            target_layer: Target layer for Grad-CAM
            target_class: Target class (None for predicted)
            device: Device to run on
            class_names: Optional list of class names
            cache_key: Optional cache key

        Returns:
            Dictionary of method names to results
        """
        results = {}

        # Grad-CAM
        try:
            results["gradcam"] = await self.explain_gradcam(
                model_path,
                framework,
                input_data,
                target_layer,
                target_class,
                device,
                class_names,
                cache_key,
            )
        except Exception as e:
            print(f"Grad-CAM failed: {e}")

        # Saliency Map
        try:
            results["saliency"] = await self.explain_saliency(
                model_path,
                framework,
                input_data,
                target_class,
                absolute=True,
                device=device,
                class_names=class_names,
                cache_key=cache_key,
            )
        except Exception as e:
            print(f"Saliency Map failed: {e}")

        # SmoothGrad
        try:
            results["smoothgrad"] = await self.explain_saliency(
                model_path,
                framework,
                input_data,
                target_class,
                absolute=True,
                smooth=True,
                device=device,
                class_names=class_names,
                cache_key=cache_key,
            )
        except Exception as e:
            print(f"SmoothGrad failed: {e}")

        # Integrated Gradients
        try:
            results["integrated_gradients"] = await self.explain_integrated_gradients(
                model_path,
                framework,
                input_data,
                target_class,
                device=device,
                class_names=class_names,
                cache_key=cache_key,
            )
        except Exception as e:
            print(f"Integrated Gradients failed: {e}")

        return results

    def get_available_layers(
        self,
        model_path: str,
        framework: Framework,
        device: str = "cpu",
        cache_key: Optional[str] = None,
    ) -> List[str]:
        """
        Get list of available layers for Grad-CAM.

        Args:
            model_path: Path to model file
            framework: Model framework
            device: Device to run on
            cache_key: Optional cache key

        Returns:
            List of layer names
        """
        # Load model
        model = self.load_model(model_path, framework, device, cache_key=cache_key)

        # Get layers
        if framework == Framework.PYTORCH:
            return [name for name, _ in model.named_modules()]
        elif framework in [Framework.TENSORFLOW, Framework.KERAS]:
            return [layer.name for layer in model.layers]
        else:
            return []

    def clear_cache(self, cache_key: Optional[str] = None) -> None:
        """
        Clear model cache.

        Args:
            cache_key: Optional specific cache key to clear
        """
        if cache_key:
            if cache_key in self.model_cache:
                del self.model_cache[cache_key]
        else:
            self.model_cache.clear()

    def get_cache_info(self) -> Dict[str, Any]:
        """
        Get cache information.

        Returns:
            Dictionary containing cache info
        """
        return {
            "num_cached_models": len(self.model_cache),
            "cached_models": [
                {
                    "cache_key": key,
                    "framework": str(info["framework"]),
                    "device": info["device"],
                    "loaded_at": info["loaded_at"],
                    "age_seconds": time.time() - info["loaded_at"],
                }
                for key, info in self.model_cache.items()
            ],
        }


# Global explainability service instance
explainability_service = ExplainabilityService()

# Made with Bob
