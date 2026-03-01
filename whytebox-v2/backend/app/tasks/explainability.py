"""
Explainability Tasks for WhyteBox Platform

Async tasks for generating model explanations:
- Grad-CAM
- Saliency Maps
- Integrated Gradients
- Batch explanations

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
from app.services.explainability_service import ExplainabilityService
from app.services.model_service import ModelService
from celery import Task
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ExplainabilityTask(Task):
    """Base task for explainability operations"""

    def __init__(self):
        self._service = None
        self._db = None

    @property
    def service(self) -> ExplainabilityService:
        """Lazy load explainability service"""
        if self._service is None:
            self._service = ExplainabilityService()
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
    base=ExplainabilityTask,
    name="app.tasks.explainability.generate_explanation",
    max_retries=3,
)
def generate_explanation(
    self,
    model_id: int,
    input_data: Dict[str, Any],
    method: str,  # "gradcam", "saliency", "integrated_gradients"
    config: Optional[Dict[str, Any]] = None,
    user_id: Optional[int] = None,
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate model explanation.

    Args:
        model_id: Model ID
        input_data: Input data
        method: Explanation method
        config: Method configuration
        user_id: Optional user ID
        task_id: Optional task ID

    Returns:
        Explanation result
    """
    try:
        config = config or {}

        # Update state
        self.update_state(
            state="PROCESSING", meta={"status": "Loading model", "progress": 10, "method": method}
        )

        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "processing",
                    "progress": 10,
                    "message": f"Generating {method} explanation",
                }
            )

        # Load model
        model_service = ModelService(self.db)
        model = model_service.get_model(model_id)

        if not model:
            raise ValueError(f"Model {model_id} not found")

        # Update progress
        self.update_state(
            state="PROCESSING", meta={"status": f"Generating {method}", "progress": 50}
        )

        # Generate explanation
        if method == "gradcam":
            result = self.service.generate_gradcam(
                model_path=model.file_path,
                input_data=input_data,
                target_layer=config.get("target_layer"),
                framework=model.framework,
            )
        elif method == "saliency":
            result = self.service.generate_saliency(
                model_path=model.file_path, input_data=input_data, framework=model.framework
            )
        elif method == "integrated_gradients":
            result = self.service.generate_integrated_gradients(
                model_path=model.file_path,
                input_data=input_data,
                steps=config.get("steps", 50),
                framework=model.framework,
            )
        else:
            raise ValueError(f"Unknown explanation method: {method}")

        # Cache result
        cache_key = f"explanation:{model_id}:{method}:{hash(str(input_data))}"
        cache_manager.set(cache_key, result, ttl=3600)

        # Update progress
        self.update_state(
            state="SUCCESS", meta={"status": "Complete", "progress": 100, "method": method}
        )

        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "success",
                    "progress": 100,
                    "message": f"{method} explanation complete",
                    "result": result,
                }
            )

        logger.info(
            f"Explanation generated: {method} for model {model_id}",
            extra={"model_id": model_id, "method": method, "task_id": self.request.id},
        )

        return {
            "status": "success",
            "model_id": model_id,
            "method": method,
            "result": result,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Explanation generation failed: {str(e)}")

        if task_id:
            connection_manager.broadcast_json(
                {
                    "type": "task_update",
                    "task_id": task_id,
                    "status": "failed",
                    "message": f"Explanation failed: {str(e)}",
                }
            )

        raise


@celery_app.task(
    bind=True, base=ExplainabilityTask, name="app.tasks.explainability.compare_methods"
)
def compare_methods(
    self,
    model_id: int,
    input_data: Dict[str, Any],
    methods: List[str],
    user_id: Optional[int] = None,
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compare multiple explanation methods.

    Args:
        model_id: Model ID
        input_data: Input data
        methods: List of methods to compare
        user_id: Optional user ID
        task_id: Optional task ID

    Returns:
        Comparison results
    """
    try:
        # Load model
        model_service = ModelService(self.db)
        model = model_service.get_model(model_id)

        if not model:
            raise ValueError(f"Model {model_id} not found")

        results = {}
        total_methods = len(methods)

        # Generate explanations for each method
        for idx, method in enumerate(methods):
            try:
                progress = int((idx / total_methods) * 100)
                self.update_state(
                    state="PROCESSING",
                    meta={"status": f"Generating {method}", "progress": progress},
                )

                # Generate explanation
                if method == "gradcam":
                    result = self.service.generate_gradcam(
                        model_path=model.file_path, input_data=input_data, framework=model.framework
                    )
                elif method == "saliency":
                    result = self.service.generate_saliency(
                        model_path=model.file_path, input_data=input_data, framework=model.framework
                    )
                elif method == "integrated_gradients":
                    result = self.service.generate_integrated_gradients(
                        model_path=model.file_path, input_data=input_data, framework=model.framework
                    )
                else:
                    continue

                results[method] = result

            except Exception as e:
                logger.error(f"Method {method} failed: {str(e)}")
                results[method] = {"error": str(e)}

        # Calculate comparison metrics
        comparison = self.service.compare_explanations(results)

        logger.info(f"Method comparison completed for model {model_id}")

        return {
            "status": "success",
            "model_id": model_id,
            "methods": methods,
            "results": results,
            "comparison": comparison,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Method comparison failed: {str(e)}")
        raise


# Made with Bob
