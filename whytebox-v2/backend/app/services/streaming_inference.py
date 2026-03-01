"""
Streaming Inference Service with WebSocket Progress Tracking

Provides real-time inference with progress updates via WebSocket.

Author: WhyteBox Team
Date: 2026-02-26
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.cache import get_cache
from app.core.websocket import (MessageType, ProgressTracker, WebSocketMessage,
                                get_connection_manager)

logger = logging.getLogger(__name__)


class StreamingInferenceService:
    """
    Service for running inference with real-time progress updates.

    Features:
    - WebSocket progress broadcasting
    - Stage-based progress tracking
    - Result caching
    - Error handling with notifications
    """

    def __init__(self):
        self.connection_manager = get_connection_manager()

    async def run_inference_with_progress(
        self,
        model_id: str,
        image_data: bytes,
        task_id: Optional[str] = None,
        preprocessing_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Run inference with WebSocket progress updates.

        Args:
            model_id: Model identifier
            image_data: Input image bytes
            task_id: Optional task ID (generated if not provided)
            preprocessing_params: Optional preprocessing parameters

        Returns:
            Inference results with metadata
        """
        # Generate task ID if not provided
        if not task_id:
            task_id = f"inference_{uuid.uuid4().hex[:8]}"

        # Create progress tracker
        tracker = ProgressTracker(
            task_id=task_id, connection_manager=self.connection_manager, total_steps=100
        )

        try:
            # Notify start
            await self.connection_manager.send_to_task_subscribers(
                task_id,
                WebSocketMessage(
                    type=MessageType.INFERENCE_START,
                    data={
                        "task_id": task_id,
                        "model_id": model_id,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    task_id=task_id,
                ),
            )

            # Stage 1: Check cache (10%)
            await tracker.update(
                step=10, stage="checking_cache", message="Checking cache for existing results"
            )

            cache = await get_cache()
            cached_result = await cache.get_inference(model_id, image_data)

            if cached_result:
                await tracker.update(
                    step=100, stage="cache_hit", message="Results retrieved from cache"
                )

                await self.connection_manager.send_to_task_subscribers(
                    task_id,
                    WebSocketMessage(
                        type=MessageType.INFERENCE_COMPLETE,
                        data={"task_id": task_id, "result": cached_result, "cached": True},
                        task_id=task_id,
                    ),
                )

                return {"task_id": task_id, "result": cached_result, "cached": True}

            # Stage 2: Load model (30%)
            await tracker.update(
                step=30, stage="loading_model", message=f"Loading model {model_id}"
            )

            # Simulate model loading (replace with actual model loading)
            await asyncio.sleep(0.5)

            # Stage 3: Preprocess image (50%)
            await tracker.update(
                step=50, stage="preprocessing", message="Preprocessing input image"
            )

            # Simulate preprocessing (replace with actual preprocessing)
            await asyncio.sleep(0.3)

            # Stage 4: Run inference (80%)
            await tracker.update(step=80, stage="inference", message="Running model inference")

            # Simulate inference (replace with actual inference)
            await asyncio.sleep(0.7)

            # Mock result (replace with actual inference result)
            result = {
                "predictions": [
                    {"class": "cat", "confidence": 0.95},
                    {"class": "dog", "confidence": 0.03},
                    {"class": "bird", "confidence": 0.02},
                ],
                "inference_time_ms": 700,
                "model_id": model_id,
            }

            # Stage 5: Cache result (90%)
            await tracker.update(step=90, stage="caching", message="Caching results")

            await cache.cache_inference(model_id, image_data, result)

            # Complete
            await tracker.complete(
                message="Inference completed successfully", data={"result": result}
            )

            await self.connection_manager.send_to_task_subscribers(
                task_id,
                WebSocketMessage(
                    type=MessageType.INFERENCE_COMPLETE,
                    data={"task_id": task_id, "result": result, "cached": False},
                    task_id=task_id,
                ),
            )

            return {"task_id": task_id, "result": result, "cached": False}

        except Exception as e:
            logger.error(f"Inference error for task {task_id}: {e}")

            await tracker.error(
                message=f"Inference failed: {str(e)}",
                error_details={"error": str(e), "type": type(e).__name__},
            )

            await self.connection_manager.send_to_task_subscribers(
                task_id,
                WebSocketMessage(
                    type=MessageType.INFERENCE_ERROR,
                    data={"task_id": task_id, "error": str(e), "error_type": type(e).__name__},
                    task_id=task_id,
                ),
            )

            raise

    async def run_batch_inference_with_progress(
        self, model_id: str, images: List[bytes], task_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Run batch inference with progress updates.

        Args:
            model_id: Model identifier
            images: List of image bytes
            task_id: Optional task ID

        Returns:
            Batch inference results
        """
        if not task_id:
            task_id = f"batch_inference_{uuid.uuid4().hex[:8]}"

        total_images = len(images)
        tracker = ProgressTracker(
            task_id=task_id, connection_manager=self.connection_manager, total_steps=total_images
        )

        try:
            await self.connection_manager.send_to_task_subscribers(
                task_id,
                WebSocketMessage(
                    type=MessageType.INFERENCE_START,
                    data={"task_id": task_id, "model_id": model_id, "batch_size": total_images},
                    task_id=task_id,
                ),
            )

            results = []

            for idx, image_data in enumerate(images):
                await tracker.update(
                    step=idx + 1,
                    stage="processing",
                    message=f"Processing image {idx + 1}/{total_images}",
                    data={"current_image": idx + 1, "total_images": total_images},
                )

                # Run inference for single image
                result = await self.run_inference_with_progress(
                    model_id=model_id, image_data=image_data, task_id=f"{task_id}_img_{idx}"
                )

                results.append(result["result"])

            await tracker.complete(
                message=f"Batch inference completed: {total_images} images",
                data={"total_images": total_images},
            )

            await self.connection_manager.send_to_task_subscribers(
                task_id,
                WebSocketMessage(
                    type=MessageType.INFERENCE_COMPLETE,
                    data={"task_id": task_id, "results": results, "batch_size": total_images},
                    task_id=task_id,
                ),
            )

            return {"task_id": task_id, "results": results, "batch_size": total_images}

        except Exception as e:
            logger.error(f"Batch inference error for task {task_id}: {e}")

            await tracker.error(
                message=f"Batch inference failed: {str(e)}", error_details={"error": str(e)}
            )

            raise


class StreamingExplainabilityService:
    """
    Service for running explainability methods with real-time progress.
    """

    def __init__(self):
        self.connection_manager = get_connection_manager()

    async def explain_with_progress(
        self,
        model_id: str,
        image_data: bytes,
        method: str,
        params: Optional[Dict] = None,
        task_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run explainability method with WebSocket progress updates.

        Args:
            model_id: Model identifier
            image_data: Input image bytes
            method: Explainability method name
            params: Method parameters
            task_id: Optional task ID

        Returns:
            Explainability results
        """
        if not task_id:
            task_id = f"explain_{method}_{uuid.uuid4().hex[:8]}"

        if not params:
            params = {}

        # Determine total steps based on method
        total_steps = {
            "grad_cam": 100,
            "saliency": 50,
            "smoothgrad": 150,
            "integrated_gradients": 200,
        }.get(method, 100)

        tracker = ProgressTracker(
            task_id=task_id, connection_manager=self.connection_manager, total_steps=total_steps
        )

        try:
            await self.connection_manager.send_to_task_subscribers(
                task_id,
                WebSocketMessage(
                    type=MessageType.EXPLAIN_START,
                    data={"task_id": task_id, "model_id": model_id, "method": method},
                    task_id=task_id,
                ),
            )

            # Check cache
            await tracker.update(step=10, stage="checking_cache", message="Checking cache")

            cache = await get_cache()
            cached_result = await cache.get_explainability(model_id, image_data, method, params)

            if cached_result:
                await tracker.complete(
                    message="Results retrieved from cache", data={"cached": True}
                )

                await self.connection_manager.send_to_task_subscribers(
                    task_id,
                    WebSocketMessage(
                        type=MessageType.EXPLAIN_COMPLETE,
                        data={"task_id": task_id, "result": cached_result, "cached": True},
                        task_id=task_id,
                    ),
                )

                return {"task_id": task_id, "result": cached_result, "cached": True}

            # Load model
            await tracker.update(step=30, stage="loading_model", message="Loading model")
            await asyncio.sleep(0.3)

            # Run explainability method
            await tracker.update(
                step=50, stage="computing", message=f"Computing {method} explanation"
            )

            # Simulate method-specific computation
            if method == "integrated_gradients":
                # Simulate 50 interpolation steps
                for i in range(50):
                    await tracker.update(
                        step=50 + i, stage="interpolation", message=f"Interpolation step {i+1}/50"
                    )
                    await asyncio.sleep(0.02)
            else:
                await asyncio.sleep(1.0)

            # Mock result
            result = {
                "method": method,
                "heatmap_base64": "mock_heatmap_data",
                "overlay_base64": "mock_overlay_data",
                "computation_time_ms": 1000,
            }

            # Cache result
            await tracker.update(step=total_steps - 10, stage="caching", message="Caching results")

            await cache.cache_explainability(model_id, image_data, method, params, result)

            await tracker.complete(
                message=f"{method} explanation completed", data={"method": method}
            )

            await self.connection_manager.send_to_task_subscribers(
                task_id,
                WebSocketMessage(
                    type=MessageType.EXPLAIN_COMPLETE,
                    data={"task_id": task_id, "result": result, "cached": False},
                    task_id=task_id,
                ),
            )

            return {"task_id": task_id, "result": result, "cached": False}

        except Exception as e:
            logger.error(f"Explainability error for task {task_id}: {e}")

            await tracker.error(
                message=f"Explainability failed: {str(e)}", error_details={"error": str(e)}
            )

            await self.connection_manager.send_to_task_subscribers(
                task_id,
                WebSocketMessage(
                    type=MessageType.EXPLAIN_ERROR,
                    data={"task_id": task_id, "error": str(e)},
                    task_id=task_id,
                ),
            )

            raise


# Global service instances
streaming_inference_service = StreamingInferenceService()
streaming_explainability_service = StreamingExplainabilityService()


def get_streaming_inference_service() -> StreamingInferenceService:
    """Dependency to get streaming inference service"""
    return streaming_inference_service


def get_streaming_explainability_service() -> StreamingExplainabilityService:
    """Dependency to get streaming explainability service"""
    return streaming_explainability_service


# Made with Bob
