"""
Celery Application Configuration for WhyteBox Platform

Provides async task processing for long-running operations:
- Model inference
- Model conversion
- Explainability generation
- Batch processing
- Scheduled tasks

Author: WhyteBox Team
Date: 2026-02-26
"""

import logging
from celery import Celery
from celery.schedules import crontab
from kombu import Exchange, Queue

from app.core.config import settings

logger = logging.getLogger(__name__)


# Create Celery app
celery_app = Celery(
    "whytebox",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)


# Celery Configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task execution
    task_track_started=True,
    task_time_limit=3600,  # 1 hour hard limit
    task_soft_time_limit=3300,  # 55 minutes soft limit
    task_acks_late=True,  # Acknowledge after task completion
    task_reject_on_worker_lost=True,
    
    # Result backend
    result_expires=86400,  # 24 hours
    result_persistent=True,
    
    # Worker settings
    worker_prefetch_multiplier=1,  # One task at a time
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks
    worker_disable_rate_limits=False,
    
    # Retry settings
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)


# Task routing
celery_app.conf.task_routes = {
    "app.tasks.inference.*": {"queue": "inference"},
    "app.tasks.conversion.*": {"queue": "conversion"},
    "app.tasks.explainability.*": {"queue": "explainability"},
    "app.tasks.maintenance.*": {"queue": "maintenance"},
}


# Queue definitions
celery_app.conf.task_queues = (
    Queue(
        "default",
        Exchange("default"),
        routing_key="default",
        queue_arguments={"x-max-priority": 10}
    ),
    Queue(
        "inference",
        Exchange("inference"),
        routing_key="inference",
        queue_arguments={"x-max-priority": 10}
    ),
    Queue(
        "conversion",
        Exchange("conversion"),
        routing_key="conversion",
        queue_arguments={"x-max-priority": 5}
    ),
    Queue(
        "explainability",
        Exchange("explainability"),
        routing_key="explainability",
        queue_arguments={"x-max-priority": 5}
    ),
    Queue(
        "maintenance",
        Exchange("maintenance"),
        routing_key="maintenance",
        queue_arguments={"x-max-priority": 1}
    ),
)


# Scheduled tasks (Celery Beat)
celery_app.conf.beat_schedule = {
    # Clean up old task results every day at 2 AM
    "cleanup-old-results": {
        "task": "app.tasks.maintenance.cleanup_old_results",
        "schedule": crontab(hour=2, minute=0),
    },
    # Clean up expired cache entries every 6 hours
    "cleanup-cache": {
        "task": "app.tasks.maintenance.cleanup_cache",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    # Update model statistics every hour
    "update-model-stats": {
        "task": "app.tasks.maintenance.update_model_statistics",
        "schedule": crontab(minute=0),
    },
    # Health check every 5 minutes
    "health-check": {
        "task": "app.tasks.maintenance.health_check",
        "schedule": crontab(minute="*/5"),
    },
}


# Task annotations for monitoring
celery_app.conf.task_annotations = {
    "*": {
        "rate_limit": "100/m",  # 100 tasks per minute default
    },
    "app.tasks.inference.run_inference": {
        "rate_limit": "50/m",
        "time_limit": 600,  # 10 minutes
    },
    "app.tasks.conversion.convert_to_onnx": {
        "rate_limit": "10/m",
        "time_limit": 1800,  # 30 minutes
    },
    "app.tasks.explainability.generate_explanation": {
        "rate_limit": "30/m",
        "time_limit": 900,  # 15 minutes
    },
}


# Error handling
@celery_app.task(bind=True)
def error_handler(self, uuid):
    """Handle task errors"""
    result = celery_app.AsyncResult(uuid)
    logger.error(
        f"Task {uuid} failed: {result.info}",
        extra={
            "task_id": uuid,
            "task_name": result.name,
            "error": str(result.info)
        }
    )


# Task events
@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Setup periodic tasks after configuration"""
    logger.info("Celery periodic tasks configured")


@celery_app.on_after_finalize.connect
def setup_task_routes(sender, **kwargs):
    """Setup task routes after finalization"""
    logger.info("Celery task routes configured")


# Import tasks to register them
def register_tasks():
    """Import all task modules to register them with Celery"""
    try:
        from app.tasks import inference  # noqa
        from app.tasks import conversion  # noqa
        from app.tasks import explainability  # noqa
        from app.tasks import maintenance  # noqa
        logger.info("All Celery tasks registered")
    except ImportError as e:
        logger.warning(f"Failed to import some task modules: {e}")


# Auto-discover tasks
celery_app.autodiscover_tasks(["app.tasks"])


if __name__ == "__main__":
    celery_app.start()

# Made with Bob
