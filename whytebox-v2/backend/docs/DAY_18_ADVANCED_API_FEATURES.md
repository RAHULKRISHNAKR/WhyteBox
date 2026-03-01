# Day 18: Advanced API Features - Implementation Documentation

**Date:** 2026-02-26  
**Phase:** Backend Modernization (Week 3-4)  
**Status:** ✅ Complete

## Overview

Day 18 focused on implementing production-ready API features including rate limiting, API key authentication, request validation, and enhanced error handling. These features are essential for a secure, scalable, and maintainable API.

## Objectives Completed

✅ Rate limiting with Redis backend  
✅ API key authentication and management  
✅ Request validation middleware  
✅ Enhanced error handling  
✅ Admin endpoints for API management  
✅ Rate limit response headers  

## Deliverables

### 1. Rate Limiter (`app/core/rate_limiter.py`) - 280 lines

**Purpose:** Distributed rate limiting with multiple algorithms and tiers.

**Key Features:**
- Token bucket algorithm with Redis backend
- Sliding window rate limiting
- Multiple rate limit tiers (FREE, BASIC, PRO, ENTERPRISE)
- Per-user, per-IP, and per-endpoint limiting
- Automatic fallback to local memory if Redis unavailable
- FastAPI dependency injection support

**Rate Limit Tiers:**
```python
FREE:       10 requests/min,  100 requests/hour
BASIC:      30 requests/min,  500 requests/hour
PRO:       100 requests/min, 2000 requests/hour
ENTERPRISE: 1000 requests/min, 20000 requests/hour
```

**Usage Example:**
```python
from app.core.rate_limiter import rate_limit_strict, rate_limit_moderate

@router.post("/inference")
async def run_inference(
    data: dict,
    _: None = Depends(rate_limit_strict)  # 10 req/min
):
    ...

@router.get("/models")
async def list_models(
    _: None = Depends(rate_limit_moderate)  # 30 req/min
):
    ...
```

**Technical Details:**
- Uses Redis sorted sets for distributed rate limiting
- Implements sliding window algorithm for accurate rate limiting
- Automatic cleanup of expired entries
- Client identification priority: user_id > api_key > IP address
- Supports X-Forwarded-For header for proxied requests

---

### 2. API Key Manager (`app/core/api_keys.py`) - 300 lines

**Purpose:** Secure API key generation, validation, and lifecycle management.

**Key Features:**
- Secure key generation with `wb_` prefix
- SHA-256 key hashing (never store plain keys)
- Scope-based permission system
- Expiration support with configurable days
- Usage tracking (last_used_at, usage_count)
- Key revocation functionality
- FastAPI security scheme integration

**Available Scopes:**
- `read` - Read-only access
- `write` - Create/update resources
- `inference` - Run model inference
- `explainability` - Generate explanations
- `conversion` - Convert models
- `admin` - Administrative access

**Usage Example:**
```python
from app.core.api_keys import require_inference, require_admin

@router.post("/inference")
async def run_inference(
    data: dict,
    current_user: User = Depends(require_inference)
):
    # User has inference scope
    ...

@router.delete("/models/{model_id}")
async def delete_model(
    model_id: int,
    current_user: User = Depends(require_admin)
):
    # User has admin scope
    ...
```

**Security Best Practices:**
- Plain API keys only shown once during generation
- Keys hashed with SHA-256 before storage
- Cannot retrieve plain keys after creation
- Automatic expiration support
- Usage tracking for audit trails

---

### 3. Error Handlers (`app/core/error_handlers.py`) - 250 lines

**Purpose:** Consistent error responses and logging across the application.

**Key Features:**
- Custom exception classes (APIError, ValidationAPIError, NotFoundAPIError, etc.)
- Standardized error response format
- Request ID tracking for debugging
- Detailed logging with context
- Development vs production error details
- Global exception handlers

**Error Response Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "status_code": 422,
    "details": {
      "errors": [
        {
          "field": "model_id",
          "message": "field required",
          "type": "value_error.missing"
        }
      ]
    }
  },
  "request_id": "req_a1b2c3d4e5f6"
}
```

**Custom Exception Classes:**
- `APIError` - Base exception class
- `ValidationAPIError` - Validation errors (422)
- `NotFoundAPIError` - Resource not found (404)
- `UnauthorizedAPIError` - Authentication required (401)
- `ForbiddenAPIError` - Insufficient permissions (403)
- `ConflictAPIError` - Resource conflict (409)

**Usage Example:**
```python
from app.core.error_handlers import NotFoundAPIError, ValidationAPIError

# Raise custom exceptions
if not model:
    raise NotFoundAPIError("Model", model_id)

if invalid_data:
    raise ValidationAPIError(
        message="Invalid configuration",
        details={"field": "batch_size", "error": "must be positive"}
    )
```

---

### 4. Request Validation Middleware (`app/middleware/validation.py`) - 310 lines

**Purpose:** Comprehensive request validation and security.

**Key Features:**
- Content-Type validation
- Request size limits (100MB default)
- File upload validation (50MB default)
- JSON structure validation
- Security headers injection
- Request ID generation

**Validators:**

**FileUploadValidator:**
```python
validator = FileUploadValidator(
    max_size=50 * 1024 * 1024,  # 50MB
    allowed_extensions=[".pt", ".onnx", ".h5"],
    allowed_mime_types=["application/octet-stream"]
)

@router.post("/upload")
async def upload_model(file: UploadFile = File(...)):
    await validator.validate(file)
    ...
```

**JSONValidator:**
```python
validator = JSONValidator(
    max_depth=10,
    max_keys=100,
    max_string_length=10000
)

@router.post("/config")
async def update_config(data: dict):
    validator.validate(data)
    ...
```

**Security Headers Added:**
- `X-Request-ID` - Unique request identifier
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

### 5. Admin Endpoints (`app/api/v1/endpoints/admin.py`) - 450 lines

**Purpose:** Administrative API for managing keys, rate limits, and system config.

**Endpoints:**

**API Key Management:**
- `POST /admin/api-keys` - Generate new API key
- `GET /admin/api-keys` - List API keys with pagination
- `GET /admin/api-keys/{key_id}` - Get key details
- `DELETE /admin/api-keys/{key_id}` - Revoke API key
- `POST /admin/api-keys/{key_id}/rotate` - Rotate API key

**Rate Limit Management:**
- `GET /admin/rate-limits/stats` - Get rate limit statistics
- `POST /admin/rate-limits/reset` - Reset rate limits for user/IP

**System Configuration:**
- `GET /admin/config` - Get system configuration
- `GET /admin/health/detailed` - Detailed health status with system metrics

**Example Usage:**
```bash
# Generate API key
curl -X POST http://localhost:8000/api/v1/admin/api-keys \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "scopes": ["read", "inference"],
    "expires_in_days": 90
  }'

# Response (plain key only shown once!)
{
  "key": "wb_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "key_id": "key_xyz123",
  "user_id": 1,
  "name": "Production API Key",
  "scopes": ["read", "inference"],
  "created_at": "2026-02-26T10:00:00Z",
  "expires_at": "2026-05-27T10:00:00Z",
  "is_active": true
}

# List API keys
curl -X GET "http://localhost:8000/api/v1/admin/api-keys?active_only=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get rate limit stats
curl -X GET http://localhost:8000/api/v1/admin/rate-limits/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Reset rate limits
curl -X POST "http://localhost:8000/api/v1/admin/rate-limits/reset?user_id=123" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 6. Rate Limit Headers Middleware (`app/middleware/rate_limit_headers.py`) - 70 lines

**Purpose:** Add rate limit information to response headers.

**Headers Added:**
- `X-RateLimit-Limit` - Maximum requests in window
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Unix timestamp when limit resets
- `Retry-After` - Seconds to wait (when rate limited)

**Example Response:**
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1708945200
X-Request-ID: req_a1b2c3d4e5f6
```

**When Rate Limited:**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1708945200
Retry-After: 45
```

---

## Integration Guide

### 1. Register Middleware and Error Handlers

Update `app/main.py`:

```python
from fastapi import FastAPI
from app.core.error_handlers import register_error_handlers
from app.middleware.validation import RequestValidationMiddleware
from app.middleware.rate_limit_headers import RateLimitHeadersMiddleware

app = FastAPI()

# Register error handlers
register_error_handlers(app)

# Add middleware
app.add_middleware(RateLimitHeadersMiddleware)
app.add_middleware(
    RequestValidationMiddleware,
    max_request_size=100 * 1024 * 1024,  # 100MB
    max_file_size=50 * 1024 * 1024  # 50MB
)
```

### 2. Apply Rate Limiting to Endpoints

```python
from app.core.rate_limiter import rate_limit_strict, rate_limit_moderate

@router.post("/inference", dependencies=[Depends(rate_limit_strict)])
async def run_inference(data: dict):
    ...

@router.get("/models", dependencies=[Depends(rate_limit_moderate)])
async def list_models():
    ...
```

### 3. Protect Endpoints with API Keys

```python
from app.core.api_keys import require_inference, require_admin

@router.post("/inference")
async def run_inference(
    data: dict,
    current_user: User = Depends(require_inference)
):
    # User authenticated with API key having inference scope
    ...
```

### 4. Use Custom Exceptions

```python
from app.core.error_handlers import NotFoundAPIError, ValidationAPIError

if not model:
    raise NotFoundAPIError("Model", model_id)

if invalid_config:
    raise ValidationAPIError(
        message="Invalid configuration",
        details={"errors": validation_errors}
    )
```

---

## Testing

### Rate Limiting Test

```python
import pytest
from app.core.rate_limiter import RateLimiter, RateLimitTier

@pytest.mark.asyncio
async def test_rate_limiting():
    limiter = RateLimiter()
    
    # Should allow first 10 requests
    for i in range(10):
        allowed = await limiter.check_rate_limit(
            "test_user",
            tier=RateLimitTier.FREE
        )
        assert allowed
    
    # 11th request should be blocked
    allowed = await limiter.check_rate_limit(
        "test_user",
        tier=RateLimitTier.FREE
    )
    assert not allowed
```

### API Key Test

```python
def test_api_key_generation(db_session):
    manager = APIKeyManager(db_session)
    
    result = manager.generate_key(
        user_id=1,
        name="Test Key",
        scopes=["read", "inference"]
    )
    
    assert result["key"].startswith("wb_")
    assert len(result["key"]) == 35
    assert result["scopes"] == ["read", "inference"]
    
    # Validate key
    user = manager.validate_key(result["key"])
    assert user is not None
    assert user.id == 1
```

### Error Handling Test

```python
def test_custom_exceptions(client):
    response = client.get("/api/v1/models/99999")
    
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
    assert "request_id" in data
```

---

## Performance Considerations

### Rate Limiting
- **Redis Backend:** Distributed rate limiting across multiple servers
- **Local Fallback:** Continues working if Redis unavailable
- **Sliding Window:** More accurate than fixed window
- **Automatic Cleanup:** Old entries removed automatically

### API Key Validation
- **Hashed Storage:** SHA-256 hashing for security
- **Database Indexing:** Fast key lookup with indexed key_hash
- **Caching:** Consider caching validated keys for performance

### Request Validation
- **Early Rejection:** Invalid requests rejected before processing
- **Size Limits:** Prevents memory exhaustion
- **Streaming:** Large files handled efficiently

---

## Security Best Practices

### API Keys
1. ✅ Never store plain keys in database
2. ✅ Use SHA-256 hashing for key storage
3. ✅ Show plain key only once during generation
4. ✅ Implement key expiration
5. ✅ Track key usage for audit trails
6. ✅ Support key revocation
7. ✅ Use scope-based permissions

### Rate Limiting
1. ✅ Implement per-user and per-IP limits
2. ✅ Use distributed rate limiting (Redis)
3. ✅ Provide clear error messages
4. ✅ Add Retry-After headers
5. ✅ Monitor rate limit violations

### Request Validation
1. ✅ Validate Content-Type headers
2. ✅ Enforce request size limits
3. ✅ Validate file uploads
4. ✅ Add security headers
5. ✅ Generate request IDs for tracking

---

## Monitoring and Observability

### Metrics to Track
- Rate limit violations per user/IP
- API key usage statistics
- Request validation failures
- Error rates by type
- Response times by endpoint

### Logging
All components include comprehensive logging:
- Request/response logging with request IDs
- Rate limit violations
- API key validation failures
- Error details with stack traces (dev mode)

### Health Checks
- Database connectivity
- Redis connectivity
- System metrics (CPU, memory, disk)
- Component status

---

## Next Steps

### Day 19: Background Tasks & Queue
- Implement Celery for async task processing
- Add task monitoring and status tracking
- Create task queue for long-running operations
- Implement task retry logic

### Day 20: Testing & Documentation
- Write comprehensive service tests
- Create integration tests
- Generate API documentation
- Performance testing

---

## Summary

Day 18 successfully implemented production-ready API features:

**Files Created:** 6  
**Total Lines:** 1,660  
**Key Features:** 
- ✅ Distributed rate limiting with Redis
- ✅ Secure API key authentication
- ✅ Request validation and security
- ✅ Enhanced error handling
- ✅ Admin management endpoints
- ✅ Rate limit response headers

**Production Ready:**
- Secure API key management with hashing
- Distributed rate limiting across servers
- Comprehensive request validation
- Consistent error responses
- Security headers on all responses
- Request tracking with unique IDs

The API is now production-ready with enterprise-grade security, rate limiting, and error handling!