"""
Error Handling Utilities for WhyteBox Backend

Provides structured error responses, custom exceptions, and error logging.
"""

import logging
import traceback
from functools import wraps
from typing import Dict, Any, Optional, Tuple
from flask import jsonify

logger = logging.getLogger(__name__)


# Custom Exception Classes
class WhyteBoxError(Exception):
    """Base exception for WhyteBox errors"""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class ModelLoadError(WhyteBoxError):
    """Error loading neural network model"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, status_code=400, details=details)


class InferenceError(WhyteBoxError):
    """Error during model inference"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, status_code=500, details=details)


class ValidationError(WhyteBoxError):
    """Error validating input data"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, status_code=400, details=details)


class FileUploadError(WhyteBoxError):
    """Error uploading or processing file"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, status_code=400, details=details)


class ConfigurationError(WhyteBoxError):
    """Error in configuration"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, status_code=500, details=details)


# Error Response Formatter
def format_error_response(
    error: Exception,
    include_traceback: bool = False
) -> Tuple[Dict[str, Any], int]:
    """
    Format error as JSON response
    
    Args:
        error: Exception object
        include_traceback: Whether to include full traceback (dev mode only)
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    if isinstance(error, WhyteBoxError):
        response = {
            'success': False,
            'error': {
                'type': error.__class__.__name__,
                'message': error.message,
                'details': error.details
            }
        }
        status_code = error.status_code
    else:
        # Generic error
        response = {
            'success': False,
            'error': {
                'type': error.__class__.__name__,
                'message': str(error),
                'details': {}
            }
        }
        status_code = 500
    
    if include_traceback:
        response['error']['traceback'] = traceback.format_exc()
    
    return response, status_code


# Decorator for API Error Handling
def handle_errors(include_traceback: bool = False):
    """
    Decorator to handle errors in Flask routes
    
    Usage:
        @app.route('/api/endpoint')
        @handle_errors(include_traceback=True)
        def my_endpoint():
            # Your code here
            pass
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in {f.__name__}: {str(e)}")
                if include_traceback:
                    logger.error(traceback.format_exc())
                
                response, status_code = format_error_response(e, include_traceback)
                return jsonify(response), status_code
        
        return wrapper
    return decorator


# Retry Decorator
def retry_on_error(max_attempts: int = 3, delay: float = 1.0, exceptions: tuple = (Exception,)):
    """
    Retry function on error
    
    Args:
        max_attempts: Maximum number of retry attempts
        delay: Delay between retries in seconds
        exceptions: Tuple of exceptions to catch
    """
    import time
    
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            attempts = 0
            while attempts < max_attempts:
                try:
                    return f(*args, **kwargs)
                except exceptions as e:
                    attempts += 1
                    if attempts >= max_attempts:
                        raise
                    logger.warning(f"Attempt {attempts}/{max_attempts} failed for {f.__name__}: {str(e)}")
                    time.sleep(delay)
            
        return wrapper
    return decorator


# Validation Helpers
def validate_required_fields(data: Dict, required_fields: list) -> None:
    """
    Validate that required fields are present in data
    
    Args:
        data: Dictionary to validate
        required_fields: List of required field names
        
    Raises:
        ValidationError: If any required field is missing
    """
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise ValidationError(
            f"Missing required fields: {', '.join(missing_fields)}",
            details={'missing_fields': missing_fields}
        )


def validate_file_extension(filename: str, allowed_extensions: set) -> None:
    """
    Validate file extension
    
    Args:
        filename: Name of file to validate
        allowed_extensions: Set of allowed extensions (e.g., {'pth', 'h5'})
        
    Raises:
        FileUploadError: If extension is not allowed
    """
    if '.' not in filename:
        raise FileUploadError("File has no extension")
    
    ext = filename.rsplit('.', 1)[1].lower()
    if ext not in allowed_extensions:
        raise FileUploadError(
            f"File extension '.{ext}' not allowed",
            details={
                'provided_extension': ext,
                'allowed_extensions': list(allowed_extensions)
            }
        )


def validate_file_size(file_size: int, max_size: int) -> None:
    """
    Validate file size
    
    Args:
        file_size: Size of file in bytes
        max_size: Maximum allowed size in bytes
        
    Raises:
        FileUploadError: If file is too large
    """
    if file_size > max_size:
        raise FileUploadError(
            f"File too large: {file_size / (1024*1024):.2f}MB (max: {max_size / (1024*1024):.2f}MB)",
            details={
                'file_size_mb': file_size / (1024*1024),
                'max_size_mb': max_size / (1024*1024)
            }
        )


# Success Response Helper
def success_response(data: Any, message: str = "Success") -> Dict[str, Any]:
    """
    Create standardized success response
    
    Args:
        data: Response data
        message: Success message
        
    Returns:
        Standardized response dictionary
    """
    return {
        'success': True,
        'message': message,
        'data': data
    }


# Error Logger
class ErrorLogger:
    """Centralized error logging"""
    
    @staticmethod
    def log_model_error(model_name: str, error: Exception):
        """Log model-related errors"""
        logger.error(f"Model error [{model_name}]: {str(error)}")
        logger.debug(traceback.format_exc())
    
    @staticmethod
    def log_inference_error(model_name: str, image_name: str, error: Exception):
        """Log inference errors"""
        logger.error(f"Inference error [model={model_name}, image={image_name}]: {str(error)}")
        logger.debug(traceback.format_exc())
    
    @staticmethod
    def log_api_error(endpoint: str, error: Exception):
        """Log API endpoint errors"""
        logger.error(f"API error [{endpoint}]: {str(error)}")
        logger.debug(traceback.format_exc())
    
    @staticmethod
    def log_validation_error(field: str, value: Any, error: Exception):
        """Log validation errors"""
        logger.warning(f"Validation error [field={field}, value={value}]: {str(error)}")


# Context Manager for Error Handling
class ErrorContext:
    """Context manager for error handling with cleanup"""
    
    def __init__(self, operation_name: str, cleanup_func=None):
        self.operation_name = operation_name
        self.cleanup_func = cleanup_func
    
    def __enter__(self):
        logger.info(f"Starting operation: {self.operation_name}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            logger.error(f"Error in {self.operation_name}: {exc_val}")
            if self.cleanup_func:
                try:
                    self.cleanup_func()
                except Exception as cleanup_error:
                    logger.error(f"Cleanup error: {cleanup_error}")
        else:
            logger.info(f"Completed operation: {self.operation_name}")
        
        return False  # Don't suppress exceptions

# Made with Bob
