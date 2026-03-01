"""
Logging Configuration

Centralized logging setup with JSON formatting support.
"""
import logging
import sys
from pythonjsonlogger import jsonlogger

from app.core.config import settings


def setup_logging() -> logging.Logger:
    """
    Setup application logging with configurable format.
    
    Returns:
        Configured logger instance
    """
    # Get root logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Remove existing handlers
    logger.handlers = []
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    
    # Configure formatter based on settings
    if settings.LOG_FORMAT == "json":
        formatter = jsonlogger.JsonFormatter(
            '%(asctime)s %(name)s %(levelname)s %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Set specific log levels for noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    return logger


# Create module-level logger
logger = logging.getLogger(__name__)

# Made with Bob
