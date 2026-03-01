"""
Request Validation Middleware for WhyteBox Platform

Provides comprehensive request validation including:
- Content-Type validation
- Request size limits
- File upload validation
- JSON schema validation
- Security headers

Author: WhyteBox Team
Date: 2026-02-26
"""

import json
import logging
from typing import Callable, Optional, List
from datetime import datetime

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.error_handlers import create_error_response

logger = logging.getLogger(__name__)


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware for validating incoming requests.
    
    Features:
    - Content-Type validation
    - Request size limits
    - File upload validation
    - JSON validation
    - Security headers
    """
    
    def __init__(
        self,
        app,
        max_request_size: int = 100 * 1024 * 1024,  # 100MB
        max_file_size: int = 50 * 1024 * 1024,  # 50MB
        allowed_content_types: Optional[List[str]] = None,
        allowed_file_extensions: Optional[List[str]] = None
    ):
        super().__init__(app)
        self.max_request_size = max_request_size
        self.max_file_size = max_file_size
        self.allowed_content_types = allowed_content_types or [
            "application/json",
            "multipart/form-data",
            "application/x-www-form-urlencoded",
            "application/octet-stream"
        ]
        self.allowed_file_extensions = allowed_file_extensions or [
            ".pt", ".pth", ".onnx", ".pb", ".h5", ".keras",
            ".json", ".yaml", ".yml", ".txt", ".md"
        ]
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """Process request validation"""
        
        # Add request ID for tracking
        request_id = self._generate_request_id()
        request.state.request_id = request_id
        
        # Log incoming request
        logger.info(
            f"Incoming request: {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host if request.client else None
            }
        )
        
        # Skip validation for health check and docs
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            response = await call_next(request)
            return self._add_security_headers(response, request_id)
        
        # Validate request size
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > self.max_request_size:
                    return create_error_response(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        message=f"Request size {size} exceeds maximum {self.max_request_size}",
                        error_code="REQUEST_TOO_LARGE",
                        request_id=request_id
                    )
            except ValueError:
                pass
        
        # Validate Content-Type for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "").split(";")[0].strip()
            
            # Allow empty body for some endpoints
            if content_length and int(content_length) > 0:
                if not any(ct in content_type for ct in self.allowed_content_types):
                    return create_error_response(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        message=f"Unsupported Content-Type: {content_type}",
                        error_code="UNSUPPORTED_MEDIA_TYPE",
                        details={"allowed_types": self.allowed_content_types},
                        request_id=request_id
                    )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Add security headers
            response = self._add_security_headers(response, request_id)
            
            # Log response
            logger.info(
                f"Response: {response.status_code}",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "path": request.url.path
                }
            )
            
            return response
            
        except Exception as e:
            logger.error(
                f"Request processing error: {str(e)}",
                extra={
                    "request_id": request_id,
                    "error": str(e)
                }
            )
            raise
    
    def _generate_request_id(self) -> str:
        """Generate unique request ID"""
        from uuid import uuid4
        return f"req_{uuid4().hex[:16]}"
    
    def _add_security_headers(
        self,
        response: Response,
        request_id: str
    ) -> Response:
        """Add security headers to response"""
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class FileUploadValidator:
    """
    Validator for file uploads.
    
    Usage:
        validator = FileUploadValidator(
            max_size=50 * 1024 * 1024,
            allowed_extensions=[".pt", ".onnx"]
        )
        
        @app.post("/upload")
        async def upload(file: UploadFile = File(...)):
            validator.validate(file)
            ...
    """
    
    def __init__(
        self,
        max_size: int = 50 * 1024 * 1024,  # 50MB
        allowed_extensions: Optional[List[str]] = None,
        allowed_mime_types: Optional[List[str]] = None
    ):
        self.max_size = max_size
        self.allowed_extensions = allowed_extensions or [
            ".pt", ".pth", ".onnx", ".pb", ".h5", ".keras"
        ]
        self.allowed_mime_types = allowed_mime_types or [
            "application/octet-stream",
            "application/x-pytorch",
            "application/x-onnx"
        ]
    
    async def validate(self, file) -> None:
        """
        Validate uploaded file.
        
        Args:
            file: UploadFile object
            
        Raises:
            ValidationAPIError: If validation fails
        """
        from app.core.error_handlers import ValidationAPIError
        
        # Check file extension
        if not any(file.filename.endswith(ext) for ext in self.allowed_extensions):
            raise ValidationAPIError(
                message=f"Invalid file extension: {file.filename}",
                details={
                    "allowed_extensions": self.allowed_extensions,
                    "filename": file.filename
                }
            )
        
        # Check MIME type
        if file.content_type not in self.allowed_mime_types:
            raise ValidationAPIError(
                message=f"Invalid MIME type: {file.content_type}",
                details={
                    "allowed_types": self.allowed_mime_types,
                    "content_type": file.content_type
                }
            )
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        size = file.file.tell()
        file.file.seek(0)  # Reset to start
        
        if size > self.max_size:
            raise ValidationAPIError(
                message=f"File size {size} exceeds maximum {self.max_size}",
                details={
                    "size": size,
                    "max_size": self.max_size
                }
            )
        
        # Check if file is empty
        if size == 0:
            raise ValidationAPIError(
                message="File is empty",
                details={"filename": file.filename}
            )


class JSONValidator:
    """
    Validator for JSON payloads.
    
    Usage:
        validator = JSONValidator(max_depth=10, max_keys=100)
        
        @app.post("/data")
        async def process(data: dict):
            validator.validate(data)
            ...
    """
    
    def __init__(
        self,
        max_depth: int = 10,
        max_keys: int = 100,
        max_string_length: int = 10000
    ):
        self.max_depth = max_depth
        self.max_keys = max_keys
        self.max_string_length = max_string_length
    
    def validate(self, data: dict, depth: int = 0) -> None:
        """
        Validate JSON structure.
        
        Args:
            data: JSON data to validate
            depth: Current nesting depth
            
        Raises:
            ValidationAPIError: If validation fails
        """
        from app.core.error_handlers import ValidationAPIError
        
        # Check depth
        if depth > self.max_depth:
            raise ValidationAPIError(
                message=f"JSON nesting depth {depth} exceeds maximum {self.max_depth}",
                details={"depth": depth, "max_depth": self.max_depth}
            )
        
        # Check number of keys
        if isinstance(data, dict):
            if len(data) > self.max_keys:
                raise ValidationAPIError(
                    message=f"Number of keys {len(data)} exceeds maximum {self.max_keys}",
                    details={"keys": len(data), "max_keys": self.max_keys}
                )
            
            # Recursively validate nested objects
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    self.validate(value, depth + 1)
                elif isinstance(value, str) and len(value) > self.max_string_length:
                    raise ValidationAPIError(
                        message=f"String length {len(value)} exceeds maximum {self.max_string_length}",
                        details={
                            "key": key,
                            "length": len(value),
                            "max_length": self.max_string_length
                        }
                    )
        
        elif isinstance(data, list):
            if len(data) > self.max_keys:
                raise ValidationAPIError(
                    message=f"Array length {len(data)} exceeds maximum {self.max_keys}",
                    details={"length": len(data), "max_length": self.max_keys}
                )
            
            # Recursively validate array items
            for item in data:
                if isinstance(item, (dict, list)):
                    self.validate(item, depth + 1)

# Made with Bob
