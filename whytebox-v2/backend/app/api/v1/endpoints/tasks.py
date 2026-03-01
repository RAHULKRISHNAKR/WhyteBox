"""
Task Management API Endpoints for WhyteBox Platform

Provides endpoints for:
- Task submission
- Task status monitoring
- Task cancellation
- Task history

Author: WhyteBox Team
Date: 2026-02-26
"""

import logging
from datetime import datetime
from typing import List, Optional

from app.core.api_keys import require_admin, require_inference
from app.core.celery_app import celery_app
from app.core.error_handlers import NotFoundAPIError, ValidationAPIError
from app.core.rate_limiter import rate_limit_moderate
from app.models.user import User
from app.tasks import conversion, explainability, inference
from celery.result import AsyncResult
from fastapi import APIRouter, BackgroundTasks, Depends, Query, status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ============================================================================
# Task Submission Endpoints
# ============================================================================


@router.post(
    "/inference",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit_moderate)],
    summary="Submit inference task",
    description="Submit an async inference task",
)
async def submit_inference_task(
    model_id: int, input_data: dict, current_user: User = Depends(require_inference)
):
    """
    Submit an async inference task.

    Args:
        model_id: Model ID to use
        input_data: Input data for inference
        current_user: Authenticated user

    Returns:
        Task ID and status URL
    """
    try:
        # Submit task
        task = inference.run_inference.delay(
            model_id=model_id, input_data=input_data, user_id=current_user.id
        )

        logger.info(
            f"Inference task submitted: {task.id}",
            extra={"task_id": task.id, "model_id": model_id, "user_id": current_user.id},
        )

        return {
            "task_id": task.id,
            "status": "pending",
            "status_url": f"/api/v1/tasks/{task.id}",
            "message": "Task submitted successfully",
        }

    except Exception as e:
        logger.error(f"Failed to submit inference task: {str(e)}")
        raise ValidationAPIError(message="Failed to submit task", details={"error": str(e)})


@router.post(
    "/inference/batch",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit_moderate)],
    summary="Submit batch inference task",
)
async def submit_batch_inference_task(
    model_id: int, batch_data: List[dict], current_user: User = Depends(require_inference)
):
    """Submit batch inference task"""
    try:
        task = inference.run_batch_inference.delay(
            model_id=model_id, batch_data=batch_data, user_id=current_user.id
        )

        return {
            "task_id": task.id,
            "status": "pending",
            "batch_size": len(batch_data),
            "status_url": f"/api/v1/tasks/{task.id}",
        }

    except Exception as e:
        raise ValidationAPIError(message="Failed to submit batch task", details={"error": str(e)})


@router.post(
    "/conversion/onnx", status_code=status.HTTP_202_ACCEPTED, summary="Submit ONNX conversion task"
)
async def submit_onnx_conversion_task(
    model_id: int,
    input_shape: List[int],
    opset_version: int = 13,
    current_user: User = Depends(require_inference),
):
    """Submit ONNX conversion task"""
    try:
        task = conversion.convert_to_onnx.delay(
            model_id=model_id,
            input_shape=tuple(input_shape),
            opset_version=opset_version,
            user_id=current_user.id,
        )

        return {"task_id": task.id, "status": "pending", "status_url": f"/api/v1/tasks/{task.id}"}

    except Exception as e:
        raise ValidationAPIError(
            message="Failed to submit conversion task", details={"error": str(e)}
        )


@router.post(
    "/explainability", status_code=status.HTTP_202_ACCEPTED, summary="Submit explainability task"
)
async def submit_explainability_task(
    model_id: int,
    input_data: dict,
    method: str = Query(..., regex="^(gradcam|saliency|integrated_gradients)$"),
    config: Optional[dict] = None,
    current_user: User = Depends(require_inference),
):
    """Submit explainability generation task"""
    try:
        task = explainability.generate_explanation.delay(
            model_id=model_id,
            input_data=input_data,
            method=method,
            config=config,
            user_id=current_user.id,
        )

        return {
            "task_id": task.id,
            "status": "pending",
            "method": method,
            "status_url": f"/api/v1/tasks/{task.id}",
        }

    except Exception as e:
        raise ValidationAPIError(
            message="Failed to submit explainability task", details={"error": str(e)}
        )


# ============================================================================
# Task Monitoring Endpoints
# ============================================================================


@router.get("/{task_id}", summary="Get task status", description="Get the current status of a task")
async def get_task_status(task_id: str, current_user: User = Depends(require_inference)):
    """
    Get task status.

    Args:
        task_id: Task ID
        current_user: Authenticated user

    Returns:
        Task status and result (if complete)
    """
    try:
        task = AsyncResult(task_id, app=celery_app)

        response = {
            "task_id": task_id,
            "status": task.state,
            "timestamp": datetime.utcnow().isoformat(),
        }

        if task.state == "PENDING":
            response["message"] = "Task is waiting to be processed"

        elif task.state == "PROCESSING":
            # Get progress info
            if task.info:
                response["progress"] = task.info.get("progress", 0)
                response["message"] = task.info.get("status", "Processing")

        elif task.state == "SUCCESS":
            response["result"] = task.result
            response["message"] = "Task completed successfully"

        elif task.state == "FAILURE":
            response["error"] = str(task.info)
            response["message"] = "Task failed"

        elif task.state == "RETRY":
            response["message"] = "Task is being retried"
            response["retry_count"] = task.info.get("retry_count", 0)

        return response

    except Exception as e:
        logger.error(f"Failed to get task status: {str(e)}")
        raise NotFoundAPIError("Task", task_id)


@router.get(
    "/{task_id}/result", summary="Get task result", description="Get the result of a completed task"
)
async def get_task_result(task_id: str, current_user: User = Depends(require_inference)):
    """Get task result (only for completed tasks)"""
    try:
        task = AsyncResult(task_id, app=celery_app)

        if task.state != "SUCCESS":
            raise ValidationAPIError(message=f"Task is not complete. Current status: {task.state}")

        return {
            "task_id": task_id,
            "status": "success",
            "result": task.result,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except ValidationAPIError:
        raise
    except Exception as e:
        raise NotFoundAPIError("Task", task_id)


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel task",
    description="Cancel a running task",
)
async def cancel_task(task_id: str, current_user: User = Depends(require_inference)):
    """Cancel a running task"""
    try:
        task = AsyncResult(task_id, app=celery_app)

        if task.state in ["SUCCESS", "FAILURE"]:
            raise ValidationAPIError(message=f"Cannot cancel task in state: {task.state}")

        # Revoke task
        task.revoke(terminate=True)

        logger.info(
            f"Task cancelled: {task_id}", extra={"task_id": task_id, "user_id": current_user.id}
        )

    except ValidationAPIError:
        raise
    except Exception as e:
        raise NotFoundAPIError("Task", task_id)


# ============================================================================
# Task History Endpoints
# ============================================================================


@router.get("/", summary="List tasks", description="List all tasks for the current user")
async def list_tasks(
    status: Optional[str] = Query(None, regex="^(pending|processing|success|failure)$"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_inference),
):
    """
    List tasks.

    Note: This is a simplified version. In production, you'd want to
    store task metadata in the database for efficient querying.
    """
    # This would typically query a database table with task metadata
    # For now, return a placeholder response

    return {
        "tasks": [],
        "total": 0,
        "limit": limit,
        "message": "Task history tracking not yet implemented",
    }


# ============================================================================
# Admin Endpoints
# ============================================================================


@router.get(
    "/admin/stats",
    summary="Get task statistics",
    description="Get overall task statistics (admin only)",
)
async def get_task_stats(current_user: User = Depends(require_admin)):
    """Get task statistics"""
    try:
        # Get Celery stats
        inspect = celery_app.control.inspect()

        active_tasks = inspect.active()
        scheduled_tasks = inspect.scheduled()
        reserved_tasks = inspect.reserved()

        stats = {
            "active": sum(len(tasks) for tasks in (active_tasks or {}).values()),
            "scheduled": sum(len(tasks) for tasks in (scheduled_tasks or {}).values()),
            "reserved": sum(len(tasks) for tasks in (reserved_tasks or {}).values()),
            "workers": len(active_tasks or {}),
            "timestamp": datetime.utcnow().isoformat(),
        }

        return stats

    except Exception as e:
        logger.error(f"Failed to get task stats: {str(e)}")
        return {"error": "Failed to retrieve task statistics", "message": str(e)}


@router.post(
    "/admin/purge", summary="Purge all tasks", description="Purge all pending tasks (admin only)"
)
async def purge_tasks(current_user: User = Depends(require_admin)):
    """Purge all pending tasks"""
    try:
        celery_app.control.purge()

        logger.warning("All pending tasks purged", extra={"admin_user": current_user.id})

        return {"status": "success", "message": "All pending tasks purged"}

    except Exception as e:
        raise ValidationAPIError(message="Failed to purge tasks", details={"error": str(e)})


# Made with Bob
