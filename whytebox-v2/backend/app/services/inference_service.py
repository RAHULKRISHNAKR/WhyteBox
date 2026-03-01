"""
Inference service for orchestrating model inference.

Provides a unified interface for running inference across different frameworks
with preprocessing, postprocessing, and caching support.
"""

import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np

from ..engines import (BaseInferenceEngine, InferenceResult, ONNXInferenceEngine,
                       PyTorchInferenceEngine, TensorFlowInferenceEngine)
from ..schemas.model import Framework
from ..utils.model_loader import ModelLoader
from ..utils.postprocessing import ClassificationPostprocessor
from ..utils.preprocessing import ImagePreprocessor, NormalizationMethod, ResizeMethod


class InferenceService:
    """
    Service for managing model inference.

    Handles model loading, preprocessing, inference, and postprocessing
    across multiple frameworks.
    """

    def __init__(self):
        """Initialize inference service."""
        self.model_cache: Dict[str, Dict[str, Any]] = {}
        self.loader = ModelLoader()

    def load_model(
        self,
        model_path: str,
        framework: Framework,
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
        cache_key: Optional[str] = None,
    ) -> BaseInferenceEngine:
        """
        Load a model and create inference engine.

        Args:
            model_path: Path to model file
            framework: Model framework
            device: Device to run inference on
            class_names: Optional list of class names
            cache_key: Optional cache key for model reuse

        Returns:
            Inference engine instance
        """
        # Check cache
        if cache_key and cache_key in self.model_cache:
            cached = self.model_cache[cache_key]
            if cached["device"] == device:
                return cached["engine"]

        # Load model
        if framework == Framework.PYTORCH:
            model = self.loader.load_pytorch_model(model_path, device)
            engine = PyTorchInferenceEngine(model, device, class_names)
        elif framework == Framework.TENSORFLOW:
            model = self.loader.load_tensorflow_model(model_path)
            engine = TensorFlowInferenceEngine(model, device, class_names)
        elif framework == Framework.KERAS:
            model = self.loader.load_keras_model(model_path)
            engine = TensorFlowInferenceEngine(model, device, class_names)
        elif framework == Framework.ONNX:
            model = self.loader.load_onnx_model(model_path, device)
            engine = ONNXInferenceEngine(model, device, class_names)
        else:
            raise ValueError(f"Unsupported framework: {framework}")

        # Cache model
        if cache_key:
            self.model_cache[cache_key] = {
                "engine": engine,
                "device": device,
                "framework": framework,
                "loaded_at": time.time(),
            }

        return engine

    async def run_inference(
        self,
        model_path: str,
        framework: Framework,
        input_data: Union[np.ndarray, List[np.ndarray]],
        device: str = "cpu",
        class_names: Optional[List[str]] = None,
        preprocessing_config: Optional[Dict[str, Any]] = None,
        postprocessing_config: Optional[Dict[str, Any]] = None,
        cache_key: Optional[str] = None,
    ) -> InferenceResult:
        """
        Run inference on input data.

        Args:
            model_path: Path to model file
            framework: Model framework
            input_data: Input data (image or array)
            device: Device to run inference on
            class_names: Optional list of class names
            preprocessing_config: Preprocessing configuration
            postprocessing_config: Postprocessing configuration
            cache_key: Optional cache key for model reuse

        Returns:
            InferenceResult object
        """
        # Load model
        engine = self.load_model(model_path, framework, device, class_names, cache_key)

        # Preprocess input
        if preprocessing_config:
            input_data = self._preprocess_input(input_data, preprocessing_config)

        # Run inference
        result = engine.predict(input_data)

        # Postprocess output
        if postprocessing_config:
            result = self._postprocess_output(result, postprocessing_config)

        return result

    async def run_batch_inference(
        self,
        model_path: str,
        framework: Framework,
        input_batch: List[np.ndarray],
        device: str = "cpu",
        batch_size: int = 32,
        class_names: Optional[List[str]] = None,
        preprocessing_config: Optional[Dict[str, Any]] = None,
        postprocessing_config: Optional[Dict[str, Any]] = None,
        cache_key: Optional[str] = None,
    ) -> List[InferenceResult]:
        """
        Run batch inference on multiple inputs.

        Args:
            model_path: Path to model file
            framework: Model framework
            input_batch: List of input data
            device: Device to run inference on
            batch_size: Batch size for processing
            class_names: Optional list of class names
            preprocessing_config: Preprocessing configuration
            postprocessing_config: Postprocessing configuration
            cache_key: Optional cache key for model reuse

        Returns:
            List of InferenceResult objects
        """
        # Load model
        engine = self.load_model(model_path, framework, device, class_names, cache_key)

        # Preprocess inputs
        if preprocessing_config:
            input_batch = [self._preprocess_input(inp, preprocessing_config) for inp in input_batch]

        # Run batch inference
        results = engine.predict_batch(input_batch, batch_size)

        # Postprocess outputs
        if postprocessing_config:
            results = [
                self._postprocess_output(result, postprocessing_config) for result in results
            ]

        return results

    def _preprocess_input(self, input_data: np.ndarray, config: Dict[str, Any]) -> np.ndarray:
        """
        Preprocess input data.

        Args:
            input_data: Raw input data
            config: Preprocessing configuration

        Returns:
            Preprocessed data
        """
        # Get configuration
        target_size = config.get("target_size")
        normalization = config.get("normalization", NormalizationMethod.IMAGENET)
        channel_first = config.get("channel_first", True)
        resize_method = config.get("resize_method", ResizeMethod.BILINEAR)

        # Apply preprocessing
        if target_size:
            processed = ImagePreprocessor.preprocess_for_model(
                input_data,
                target_size=tuple(target_size),
                normalization=normalization,
                channel_first=channel_first,
                resize_method=resize_method,
            )
        else:
            # Just normalize
            processed = ImagePreprocessor.normalize(input_data, normalization)
            if channel_first:
                processed = ImagePreprocessor.to_channel_first(processed)

        return processed

    def _postprocess_output(
        self, result: InferenceResult, config: Dict[str, Any]
    ) -> InferenceResult:
        """
        Postprocess inference result.

        Args:
            result: Raw inference result
            config: Postprocessing configuration

        Returns:
            Postprocessed result
        """
        # Apply softmax if needed
        if config.get("apply_softmax", False):
            result.predictions = ClassificationPostprocessor.apply_softmax(
                result.predictions, temperature=config.get("temperature", 1.0)
            )

        # Get top-k if needed
        if config.get("top_k"):
            top_k_results = ClassificationPostprocessor.get_top_k(
                result.predictions, k=config["top_k"], class_names=result.class_names
            )

            # Update result
            if isinstance(top_k_results, dict):
                result.class_indices = np.array(top_k_results["indices"])
                result.confidence_scores = np.array(top_k_results["scores"])
                if "class_names" in top_k_results:
                    result.class_names = top_k_results["class_names"]

        return result

    def get_model_info(
        self,
        model_path: str,
        framework: Framework,
        device: str = "cpu",
        cache_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get information about a model.

        Args:
            model_path: Path to model file
            framework: Model framework
            device: Device to run inference on
            cache_key: Optional cache key

        Returns:
            Dictionary containing model information
        """
        engine = self.load_model(model_path, framework, device, cache_key=cache_key)
        return engine.get_model_info()

    def warmup_model(
        self,
        model_path: str,
        framework: Framework,
        input_shape: tuple,
        device: str = "cpu",
        num_iterations: int = 3,
        cache_key: Optional[str] = None,
    ) -> float:
        """
        Warm up a model by running dummy inferences.

        Args:
            model_path: Path to model file
            framework: Model framework
            input_shape: Shape of input tensor
            device: Device to run inference on
            num_iterations: Number of warmup iterations
            cache_key: Optional cache key

        Returns:
            Average warmup time in seconds
        """
        engine = self.load_model(model_path, framework, device, cache_key=cache_key)
        return engine.warmup(input_shape, num_iterations)

    def clear_cache(self, cache_key: Optional[str] = None) -> None:
        """
        Clear model cache.

        Args:
            cache_key: Optional specific cache key to clear. If None, clears all.
        """
        if cache_key:
            if cache_key in self.model_cache:
                del self.model_cache[cache_key]
        else:
            self.model_cache.clear()

    def get_cache_info(self) -> Dict[str, Any]:
        """
        Get information about cached models.

        Returns:
            Dictionary containing cache information
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

    async def extract_features(
        self,
        model_path: str,
        framework: Framework,
        input_data: np.ndarray,
        layer_name: Optional[str] = None,
        device: str = "cpu",
        preprocessing_config: Optional[Dict[str, Any]] = None,
        cache_key: Optional[str] = None,
    ) -> np.ndarray:
        """
        Extract features from a specific layer.

        Args:
            model_path: Path to model file
            framework: Model framework
            input_data: Input data
            layer_name: Name of layer to extract features from
            device: Device to run inference on
            preprocessing_config: Preprocessing configuration
            cache_key: Optional cache key

        Returns:
            Feature maps as numpy array
        """
        # Load model
        engine = self.load_model(model_path, framework, device, cache_key=cache_key)

        # Preprocess input
        if preprocessing_config:
            input_data = self._preprocess_input(input_data, preprocessing_config)

        # Extract features
        if hasattr(engine, "extract_features"):
            return engine.extract_features(input_data, layer_name)
        else:
            raise NotImplementedError(f"Feature extraction not supported for {framework}")


# Global inference service instance
inference_service = InferenceService()

# Made with Bob
