"""
Inference Tasks for WhyteBox Platform

Async tasks for model inference operations:
- Single inference
- Batch inference
- Real-time inference with progress tracking

Author: WhyteBox Team
Date: 2026-02-26
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.cache import cache_manager
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.websocket import connection_manager
from app.services.inference_engine import InferenceEngine
from app.services.model_service import ModelService
from celery import Task
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class InferenceTask(Task):
    """Base task for inference operations with progress tracking"""

    def __init__(self):
        self._engine = None
        self._db = None

    @property
    def engine(self) -> InferenceEngine:
        """Lazy load inference engine"""
        if self._engine is None:
            self._engine = InferenceEngine()
        return self._engine

    @property
    def db(self) -> Session:
        """Get database session"""
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        """Cleanup after task completion"""
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(
    bind=True,
    base=InferenceTask,
    name="app.tasks.inference.run_inference",
    max_retries=3,
    default_retry_delay=60,
)
def run_inference(
    self,
    model_id: int,
    input_data: Dict[str, Any],
    user_id: Optional[int] = None,
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run model inference asynchronously.

    Args:
        model_id: Model ID to use for inference
        input_data: Input data for inference
        user_id: Optional user ID for tracking
        task_id: Optional task ID for progress tracking

    Returns:
        Inference results
    """
    try:
        # Update task state
        self.update_state(
            state="PROCESSING",
            meta={"status": "Loading model", "progress": 10, "model_id": model_id},
        )

        # Send WebSocket update
        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "processing",
                    "progress": 10,
                    "message": "Loading model",
                }
            )

        # Load model
        model_service = ModelService(self.db)
        model = model_service.get_model(model_id)

        if not model:
            raise ValueError(f"Model {model_id} not found")

        # Update progress
        self.update_state(
            state="PROCESSING",
            meta={"status": "Running inference", "progress": 50, "model_id": model_id},
        )

        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "processing",
                    "progress": 50,
                    "message": "Running inference",
                }
            )

        # Run inference
        result = self.engine.infer(
            model_path=model.file_path, input_data=input_data, framework=model.framework
        )

        # Cache result
        cache_key = f"inference:{model_id}:{hash(str(input_data))}"
        cache_manager.set(cache_key, result, ttl=3600)

        # Update model statistics
        model_service.increment_inference_count(model_id)

        # Update progress
        self.update_state(
            state="SUCCESS",
            meta={"status": "Complete", "progress": 100, "model_id": model_id, "result": result},
        )

        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "success",
                    "progress": 100,
                    "message": "Inference complete",
                    "result": result,
                }
            )

        logger.info(
            f"Inference completed for model {model_id}",
            extra={"model_id": model_id, "user_id": user_id, "task_id": self.request.id},
        )

        return {
            "status": "success",
            "model_id": model_id,
            "result": result,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(
            f"Inference failed for model {model_id}: {str(e)}",
            extra={"model_id": model_id, "error": str(e), "task_id": self.request.id},
        )

        # Send error via WebSocket
        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "failed",
                    "progress": 0,
                    "message": f"Inference failed: {str(e)}",
                }
            )

        # Retry on transient errors
        if "timeout" in str(e).lower() or "connection" in str(e).lower():
            raise self.retry(exc=e, countdown=60)

        raise


@celery_app.task(
    bind=True, base=InferenceTask, name="app.tasks.inference.run_batch_inference", max_retries=3
)
def run_batch_inference(
    self,
    model_id: int,
    batch_data: List[Dict[str, Any]],
    user_id: Optional[int] = None,
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run batch inference asynchronously.

    Args:
        model_id: Model ID to use
        batch_data: List of input data
        user_id: Optional user ID
        task_id: Optional task ID for progress tracking

    Returns:
        Batch inference results
    """
    try:
        total_items = len(batch_data)
        results = []

        # Update initial state
        self.update_state(
            state="PROCESSING",
            meta={
                "status": "Starting batch inference",
                "progress": 0,
                "total": total_items,
                "completed": 0,
            },
        )

        # Load model once
        model_service = ModelService(self.db)
        model = model_service.get_model(model_id)

        if not model:
            raise ValueError(f"Model {model_id} not found")

        # Process each item
        for idx, input_data in enumerate(batch_data):
            try:
                # Run inference
                result = self.engine.infer(
                    model_path=model.file_path, input_data=input_data, framework=model.framework
                )

                results.append({"index": idx, "status": "success", "result": result})

            except Exception as e:
                logger.error(f"Batch item {idx} failed: {str(e)}")
                results.append({"index": idx, "status": "failed", "error": str(e)})

            # Update progress
            progress = int((idx + 1) / total_items * 100)
            self.update_state(
                state="PROCESSING",
                meta={
                    "status": "Processing batch",
                    "progress": progress,
                    "total": total_items,
                    "completed": idx + 1,
                },
            )

            if task_id:
                connection_manager.broadcast_json(
                    {
                        "type": "task_update",
                        "task_id": task_id,
                        "status": "processing",
                        "progress": progress,
                        "message": f"Processed {idx + 1}/{total_items} items",
                    }
                )

        # Update model statistics
        model_service.increment_inference_count(model_id, count=total_items)

        # Calculate success rate
        success_count = sum(1 for r in results if r["status"] == "success")
        success_rate = success_count / total_items * 100

        logger.info(
            f"Batch inference completed: {success_count}/{total_items} successful",
            extra={
                "model_id": model_id,
                "total": total_items,
                "success_count": success_count,
                "success_rate": success_rate,
            },
        )

        return {
            "status": "success",
            "model_id": model_id,
            "total": total_items,
            "success_count": success_count,
            "success_rate": success_rate,
            "results": results,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Batch inference failed: {str(e)}")

        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "failed",
                    "message": f"Batch inference failed: {str(e)}",
                }
            )

        raise


@celery_app.task(bind=True, base=InferenceTask, name="app.tasks.inference.run_streaming_inference")
def run_streaming_inference(
    self,
    model_id: int,
    stream_data: List[Dict[str, Any]],
    user_id: Optional[int] = None,
    websocket_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run streaming inference with real-time results.

    Args:
        model_id: Model ID to use
        stream_data: Stream of input data
        user_id: Optional user ID
        websocket_id: WebSocket connection ID for streaming results

    Returns:
        Streaming inference summary
    """
    try:
        model_service = ModelService(self.db)
        model = model_service.get_model(model_id)

        if not model:
            raise ValueError(f"Model {model_id} not found")

        results_count = 0

        # Process stream
        for idx, input_data in enumerate(stream_data):
            try:
                # Run inference
                result = self.engine.infer(
                    model_path=model.file_path, input_data=input_data, framework=model.framework
                )

                # Stream result via WebSocket
                if websocket_id:
                    connection_manager.send_to_connection(
                        websocket_id,
                        {
                            "type": "inference_result",
                            "index": idx,
                            "result": result,
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )

                results_count += 1

            except Exception as e:
                logger.error(f"Stream item {idx} failed: {str(e)}")

                if websocket_id:
                    connection_manager.send_to_connection(
                        websocket_id, {"type": "inference_error", "index": idx, "error": str(e)}
                    )

        # Update statistics
        model_service.increment_inference_count(model_id, count=results_count)

        return {
            "status": "success",
            "model_id": model_id,
            "processed": results_count,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Streaming inference failed: {str(e)}")
        raise


# Made with Bob
