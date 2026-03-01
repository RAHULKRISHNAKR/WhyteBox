"""
Global Error Handlers for WhyteBox Platform

Provides consistent error responses and logging across the application.

Author: WhyteBox Team
Date: 2026-02-26
"""

import logging
import traceback
from typing import Any, Dict, Union

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base API error class"""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_ERROR",
        details: Dict[str, Any] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationAPIError(APIError):
    """Validation error"""

    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class NotFoundAPIError(APIError):
    """Resource not found error"""

    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} not found: {identifier}",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
        )


class UnauthorizedAPIError(APIError):
    """Unauthorized access error"""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message, status_code=status.HTTP_401_UNAUTHORIZED, error_code="UNAUTHORIZED"
        )


class ForbiddenAPIError(APIError):
    """Forbidden access error"""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            message=message, status_code=status.HTTP_403_FORBIDDEN, error_code="FORBIDDEN"
        )


class ConflictAPIError(APIError):
    """Resource conflict error"""

    def __init__(self, message: str):
        super().__init__(
            message=message, status_code=status.HTTP_409_CONFLICT, error_code="CONFLICT"
        )


def create_error_response(
    status_code: int,
    message: str,
    error_code: str = "ERROR",
    details: Dict[str, Any] = None,
    request_id: str = None,
) -> JSONResponse:
    """
    Create standardized error response.

    Args:
        status_code: HTTP status code
        message: Error message
        error_code: Application-specific error code
        details: Additional error details
        request_id: Request ID for tracking

    Returns:
        JSONResponse with error details
    """
    error_response = {"error": {"code": error_code, "message": message, "status_code": status_code}}

    if details:
        error_response["error"]["details"] = details

    if request_id:
        error_response["request_id"] = request_id

    return JSONResponse(status_code=status_code, content=error_response)


async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle custom API errors"""
    request_id = getattr(request.state, "request_id", None)

    logger.error(
        f"API Error: {exc.error_code} - {exc.message}",
        extra={
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "request_id": request_id,
            "path": request.url.path,
        },
    )

    return create_error_response(
        status_code=exc.status_code,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details,
        request_id=request_id,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions"""
    request_id = getattr(request.state, "request_id", None)

    logger.warning(
        f"HTTP Exception: {exc.status_code} - {exc.detail}",
        extra={"status_code": exc.status_code, "request_id": request_id, "path": request.url.path},
    )

    return create_error_response(
        status_code=exc.status_code,
        message=str(exc.detail),
        error_code="HTTP_ERROR",
        request_id=request_id,
    )


async def validation_exception_handler(
    request: Request, exc: Union[RequestValidationError, ValidationError]
) -> JSONResponse:
    """Handle validation errors"""
    request_id = getattr(request.state, "request_id", None)

    # Extract validation errors
    errors = []
    for error in exc.errors():
        errors.append(
            {
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
        )

    logger.warning(
        f"Validation Error: {len(errors)} validation errors",
        extra={"request_id": request_id, "path": request.url.path, "errors": errors},
    )

    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message="Validation error",
        error_code="VALIDATION_ERROR",
        details={"errors": errors},
        request_id=request_id,
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions"""
    request_id = getattr(request.state, "request_id", None)

    # Log full traceback
    logger.error(
        f"Unhandled Exception: {type(exc).__name__} - {str(exc)}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "traceback": traceback.format_exc(),
        },
    )

    # Don't expose internal errors in production
    message = "Internal server error"
    details = None

    # In development, include more details
    from app.core.config import settings

    if settings.DEBUG:
        message = f"{type(exc).__name__}: {str(exc)}"
        details = {"traceback": traceback.format_exc().split("\n")}

    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message=message,
        error_code="INTERNAL_ERROR",
        details=details,
        request_id=request_id,
    )


def register_error_handlers(app):
    """
    Register all error handlers with FastAPI app.

    Usage:
        from app.core.error_handlers import register_error_handlers

        app = FastAPI()
        register_error_handlers(app)
    """
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    logger.info("Error handlers registered")


# Made with Bob
