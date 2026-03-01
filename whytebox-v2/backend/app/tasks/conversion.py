"""
Model Conversion Tasks for WhyteBox Platform

Async tasks for model conversion operations:
- ONNX conversion
- TensorFlow.js conversion
- Model optimization (quantization, pruning)

Author: WhyteBox Team
Date: 2026-02-26
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.websocket import connection_manager
from app.services.conversion_service import ConversionService
from app.services.model_service import ModelService
from celery import Task
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ConversionTask(Task):
    """Base task for conversion operations"""

    def __init__(self):
        self._service = None
        self._db = None

    @property
    def service(self) -> ConversionService:
        """Lazy load conversion service"""
        if self._service is None:
            self._service = ConversionService()
        return self._service

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
    base=ConversionTask,
    name="app.tasks.conversion.convert_to_onnx",
    max_retries=2,
    default_retry_delay=120,
)
def convert_to_onnx(
    self,
    model_id: int,
    input_shape: tuple,
    opset_version: int = 13,
    user_id: Optional[int] = None,
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Convert model to ONNX format.

    Args:
        model_id: Model ID to convert
        input_shape: Input tensor shape
        opset_version: ONNX opset version
        user_id: Optional user ID
        task_id: Optional task ID for progress tracking

    Returns:
        Conversion result with output path
    """
    try:
        # Update state
        self.update_state(
            state="PROCESSING",
            meta={"status": "Loading model", "progress": 10, "model_id": model_id},
        )

        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "processing",
                    "progress": 10,
                    "message": "Loading model for conversion",
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
            meta={"status": "Converting to ONNX", "progress": 50, "model_id": model_id},
        )

        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "processing",
                    "progress": 50,
                    "message": "Converting model to ONNX format",
                }
            )

        # Convert to ONNX
        output_path = self.service.convert_to_onnx(
            model_path=model.file_path,
            input_shape=input_shape,
            opset_version=opset_version,
            framework=model.framework,
        )

        # Validate conversion
        is_valid = self.service.validate_onnx_model(output_path)

        if not is_valid:
            raise ValueError("ONNX conversion validation failed")

        # Update progress
        self.update_state(
            state="SUCCESS",
            meta={
                "status": "Complete",
                "progress": 100,
                "model_id": model_id,
                "output_path": str(output_path),
            },
        )

        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "success",
                    "progress": 100,
                    "message": "ONNX conversion complete",
                    "output_path": str(output_path),
                }
            )

        logger.info(
            f"ONNX conversion completed for model {model_id}",
            extra={
                "model_id": model_id,
                "output_path": str(output_path),
                "task_id": self.request.id,
            },
        )

        return {
            "status": "success",
            "model_id": model_id,
            "output_path": str(output_path),
            "format": "onnx",
            "opset_version": opset_version,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"ONNX conversion failed: {str(e)}")

        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "failed",
                    "message": f"Conversion failed: {str(e)}",
                }
            )

        raise


@celery_app.task(
    bind=True, base=ConversionTask, name="app.tasks.conversion.convert_to_tfjs", max_retries=2
)
def convert_to_tfjs(
    self,
    model_id: int,
    quantization: bool = False,
    user_id: Optional[int] = None,
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Convert model to TensorFlow.js format.

    Args:
        model_id: Model ID to convert
        quantization: Apply quantization
        user_id: Optional user ID
        task_id: Optional task ID

    Returns:
        Conversion result
    """
    try:
        self.update_state(state="PROCESSING", meta={"status": "Loading model", "progress": 10})

        # Load model
        model_service = ModelService(self.db)
        model = model_service.get_model(model_id)

        if not model:
            raise ValueError(f"Model {model_id} not found")

        # Convert
        self.update_state(
            state="PROCESSING", meta={"status": "Converting to TensorFlow.js", "progress": 50}
        )

        output_path = self.service.convert_to_tfjs(
            model_path=model.file_path, quantization=quantization, framework=model.framework
        )

        logger.info(f"TensorFlow.js conversion completed for model {model_id}")

        return {
            "status": "success",
            "model_id": model_id,
            "output_path": str(output_path),
            "format": "tfjs",
            "quantization": quantization,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"TensorFlow.js conversion failed: {str(e)}")
        raise


@celery_app.task(
    bind=True, base=ConversionTask, name="app.tasks.conversion.optimize_model", max_retries=2
)
def optimize_model(
    self,
    model_id: int,
    optimization_type: str,  # "quantization" or "pruning"
    config: Dict[str, Any],
    user_id: Optional[int] = None,
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Optimize model (quantization or pruning).

    Args:
        model_id: Model ID to optimize
        optimization_type: Type of optimization
        config: Optimization configuration
        user_id: Optional user ID
        task_id: Optional task ID

    Returns:
        Optimization result
    """
    try:
        self.update_state(
            state="PROCESSING", meta={"status": f"Applying {optimization_type}", "progress": 20}
        )

        # Load model
        model_service = ModelService(self.db)
        model = model_service.get_model(model_id)

        if not model:
            raise ValueError(f"Model {model_id} not found")

        # Apply optimization
        if optimization_type == "quantization":
            output_path = self.service.quantize_model(
                model_path=model.file_path,
                quantization_type=config.get("type", "dynamic"),
                framework=model.framework,
            )
        elif optimization_type == "pruning":
            output_path = self.service.prune_model(
                model_path=model.file_path,
                pruning_amount=config.get("amount", 0.5),
                framework=model.framework,
            )
        else:
            raise ValueError(f"Unknown optimization type: {optimization_type}")

        logger.info(f"Model optimization completed: {optimization_type}")

        return {
            "status": "success",
            "model_id": model_id,
            "optimization_type": optimization_type,
            "output_path": str(output_path),
            "config": config,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Model optimization failed: {str(e)}")
        raise


# Made with Bob
