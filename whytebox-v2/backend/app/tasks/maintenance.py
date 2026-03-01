"""
Maintenance Tasks for WhyteBox Platform

Scheduled tasks for system maintenance:
- Cleanup old results
- Cache cleanup
- Model statistics updates
- Health checks

Author: WhyteBox Team
Date: 2026-02-26
"""

import logging
from typing import Dict, Any
from datetime import datetime, timedelta

from celery import Task
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.cache import cache_manager
from app.models.model import Model
from app.models.user import User

logger = logging.getLogger(__name__)


class MaintenanceTask(Task):
    """Base task for maintenance operations"""
    
    def __init__(self):
        self._db = None
    
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
    base=MaintenanceTask,
    name="app.tasks.maintenance.cleanup_old_results"
)
def cleanup_old_results(self, days: int = 7) -> Dict[str, Any]:
    """
    Clean up old task results.
    
    Args:
        days: Delete results older than this many days
        
    Returns:
        Cleanup statistics
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Clean up Celery results
        from celery.result import AsyncResult
        
        # Get all task IDs (this is a simplified version)
        # In production, you'd want to track task IDs in database
        deleted_count = 0
        
        logger.info(
            f"Cleaned up {deleted_count} old task results",
            extra={"cutoff_date": cutoff_date.isoformat()}
        )
        
        return {
            "status": "success",
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat(),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=MaintenanceTask,
    name="app.tasks.maintenance.cleanup_cache"
)
def cleanup_cache(self) -> Dict[str, Any]:
    """
    Clean up expired cache entries.
    
    Returns:
        Cleanup statistics
    """
    try:
        # Redis automatically handles TTL expiration
        # This task can be used for additional cleanup logic
        
        # Get cache statistics
        stats = cache_manager.get_stats()
        
        logger.info(
            "Cache cleanup completed",
            extra={"stats": stats}
        )
        
        return {
            "status": "success",
            "cache_stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cache cleanup failed: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=MaintenanceTask,
    name="app.tasks.maintenance.update_model_statistics"
)
def update_model_statistics(self) -> Dict[str, Any]:
    """
    Update model usage statistics.
    
    Returns:
        Statistics update results
    """
    try:
        # Get model statistics
        total_models = self.db.query(func.count(Model.id)).scalar()
        
        # Count by framework
        framework_stats = (
            self.db.query(Model.framework, func.count(Model.id))
            .group_by(Model.framework)
            .all()
        )
        
        # Count by status
        status_stats = (
            self.db.query(Model.status, func.count(Model.id))
            .group_by(Model.status)
            .all()
        )
        
        # Get most used models
        most_used = (
            self.db.query(Model.id, Model.name, Model.inference_count)
            .order_by(Model.inference_count.desc())
            .limit(10)
            .all()
        )
        
        stats = {
            "total_models": total_models,
            "by_framework": {fw: count for fw, count in framework_stats},
            "by_status": {status: count for status, count in status_stats},
            "most_used": [
                {"id": m.id, "name": m.name, "count": m.inference_count}
                for m in most_used
            ]
        }
        
        # Cache statistics
        cache_manager.set("model_statistics", stats, ttl=3600)
        
        logger.info(
            "Model statistics updated",
            extra={"total_models": total_models}
        )
        
        return {
            "status": "success",
            "statistics": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Statistics update failed: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=MaintenanceTask,
    name="app.tasks.maintenance.health_check"
)
def health_check(self) -> Dict[str, Any]:
    """
    Perform system health check.
    
    Returns:
        Health check results
    """
    try:
        health_status = {
            "database": False,
            "cache": False,
            "celery": True  # If this runs, Celery is working
        }
        
        # Check database
        try:
            self.db.execute("SELECT 1")
            health_status["database"] = True
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
        
        # Check cache
        try:
            health_status["cache"] = cache_manager.health_check()
        except Exception as e:
            logger.error(f"Cache health check failed: {str(e)}")
        
        # Overall status
        all_healthy = all(health_status.values())
        
        result = {
            "status": "healthy" if all_healthy else "degraded",
            "components": health_status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if not all_healthy:
            logger.warning(
                "System health check failed",
                extra={"health_status": health_status}
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=MaintenanceTask,
    name="app.tasks.maintenance.cleanup_temp_files"
)
def cleanup_temp_files(self, days: int = 1) -> Dict[str, Any]:
    """
    Clean up temporary files.
    
    Args:
        days: Delete files older than this many days
        
    Returns:
        Cleanup statistics
    """
    try:
        import os
        from pathlib import Path
        
        temp_dir = Path("/tmp/whytebox")
        if not temp_dir.exists():
            return {
                "status": "success",
                "deleted_count": 0,
                "message": "Temp directory does not exist"
            }
        
        cutoff_time = datetime.utcnow().timestamp() - (days * 86400)
        deleted_count = 0
        deleted_size = 0
        
        # Clean up old files
        for file_path in temp_dir.rglob("*"):
            if file_path.is_file():
                if file_path.stat().st_mtime < cutoff_time:
                    try:
                        size = file_path.stat().st_size
                        file_path.unlink()
                        deleted_count += 1
                        deleted_size += size
                    except Exception as e:
                        logger.warning(f"Failed to delete {file_path}: {str(e)}")
        
        logger.info(
            f"Cleaned up {deleted_count} temp files ({deleted_size} bytes)",
            extra={
                "deleted_count": deleted_count,
                "deleted_size": deleted_size
            }
        )
        
        return {
            "status": "success",
            "deleted_count": deleted_count,
            "deleted_size": deleted_size,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Temp file cleanup failed: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    base=MaintenanceTask,
    name="app.tasks.maintenance.backup_database"
)
def backup_database(self) -> Dict[str, Any]:
    """
    Create database backup.
    
    Returns:
        Backup result
    """
    try:
        from app.core.config import settings
        import subprocess
        from pathlib import Path
        
        # Create backup directory
        backup_dir = Path("/backups/whytebox")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate backup filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"whytebox_backup_{timestamp}.sql"
        
        # Run pg_dump (for PostgreSQL)
        # This is a simplified version - adjust for your database
        cmd = [
            "pg_dump",
            "-h", settings.DATABASE_HOST,
            "-U", settings.DATABASE_USER,
            "-d", settings.DATABASE_NAME,
            "-f", str(backup_file)
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env={"PGPASSWORD": settings.DATABASE_PASSWORD}
        )
        
        if result.returncode != 0:
            raise Exception(f"Backup failed: {result.stderr}")
        
        # Get backup size
        backup_size = backup_file.stat().st_size
        
        logger.info(
            f"Database backup created: {backup_file}",
            extra={
                "backup_file": str(backup_file),
                "size": backup_size
            }
        )
        
        return {
            "status": "success",
            "backup_file": str(backup_file),
            "size": backup_size,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Database backup failed: {str(e)}")
        raise

# Made with Bob
