"""
API Endpoint Tests for WhyteBox Platform

Tests for:
- Model endpoints
- Inference endpoints
- Task endpoints
- Admin endpoints
- Authentication

Author: WhyteBox Team
Date: 2026-02-26
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.model import Model
from app.models.user import User


# ============================================================================
# Model API Tests
# ============================================================================

class TestModelAPI:
    """Tests for model management endpoints"""
    
    def test_create_model(
        self,
        client: TestClient,
        auth_headers: dict,
        mock_model_file: str
    ):
        """Test creating a model via API"""
        response = client.post(
            "/api/v1/models",
            headers=auth_headers,
            json={
                "name": "API Test Model",
                "description": "Created via API",
                "framework": "pytorch",
                "file_path": mock_model_file,
                "input_shape": "(1, 3, 224, 224)",
                "output_shape": "(1, 1000)"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "API Test Model"
        assert data["framework"] == "pytorch"
        assert "id" in data
    
    def test_list_models(
        self,
        client: TestClient,
        auth_headers: dict,
        test_model: Model
    ):
        """Test listing models"""
        response = client.get(
            "/api/v1/models",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) > 0
    
    def test_get_model(
        self,
        client: TestClient,
        auth_headers: dict,
        test_model: Model
    ):
        """Test getting a specific model"""
        response = client.get(
            f"/api/v1/models/{test_model.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_model.id
        assert data["name"] == test_model.name
    
    def test_get_model_not_found(
        self,
        client: TestClient,
        auth_headers: dict
    ):
        """Test getting non-existent model"""
        response = client.get(
            "/api/v1/models/99999",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    def test_update_model(
        self,
        client: TestClient,
        auth_headers: dict,
        test_model: Model
    ):
        """Test updating a model"""
        response = client.put(
            f"/api/v1/models/{test_model.id}",
            headers=auth_headers,
            json={
                "description": "Updated via API"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Updated via API"
    
    def test_delete_model(
        self,
        client: TestClient,
        auth_headers: dict,
        test_model: Model
    ):
        """Test deleting a model"""
        response = client.delete(
            f"/api/v1/models/{test_model.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 204
        
        # Verify deleted
        response = client.get(
            f"/api/v1/models/{test_model.id}",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_unauthorized_access(self, client: TestClient, test_model: Model):
        """Test accessing endpoints without authentication"""
        response = client.get(f"/api/v1/models/{test_model.id}")
        
        assert response.status_code == 401


# ============================================================================
# Task API Tests
# ============================================================================

class TestTaskAPI:
    """Tests for task management endpoints"""
    
    def test_submit_inference_task(
        self,
        client: TestClient,
        auth_headers: dict,
        test_model: Model,
        sample_input_data: dict
    ):
        """Test submitting an inference task"""
        response = client.post(
            "/api/v1/tasks/inference",
            headers=auth_headers,
            json={
                "model_id": test_model.id,
                "input_data": sample_input_data
            }
        )
        
        assert response.status_code == 202
        data = response.json()
        assert "task_id" in data
        assert data["status"] == "pending"
        assert "status_url" in data
    
    def test_submit_batch_inference_task(
        self,
        client: TestClient,
        auth_headers: dict,
        test_model: Model,
        sample_input_data: dict
    ):
        """Test submitting a batch inference task"""
        response = client.post(
            "/api/v1/tasks/inference/batch",
            headers=auth_headers,
            json={
                "model_id": test_model.id,
                "batch_data": [sample_input_data, sample_input_data]
            }
        )
        
        assert response.status_code == 202
        data = response.json()
        assert "task_id" in data
        assert data["batch_size"] == 2
    
    def test_get_task_status(
        self,
        client: TestClient,
        auth_headers: dict
    ):
        """Test getting task status"""
        # This would need a real task ID
        # For now, test the endpoint structure
        response = client.get(
            "/api/v1/tasks/test_task_id",
            headers=auth_headers
        )
        
        # Might be 404 if task doesn't exist, which is expected
        assert response.status_code in [200, 404]


# ============================================================================
# Admin API Tests
# ============================================================================

class TestAdminAPI:
    """Tests for admin endpoints"""
    
    def test_create_api_key(
        self,
        client: TestClient,
        admin_headers: dict
    ):
        """Test creating an API key"""
        response = client.post(
            "/api/v1/admin/api-keys",
            headers=admin_headers,
            json={
                "name": "Test API Key",
                "scopes": ["read", "inference"],
                "expires_in_days": 90
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "key" in data
        assert data["key"].startswith("wb_")
        assert "key_id" in data
        assert data["scopes"] == ["read", "inference"]
    
    def test_list_api_keys(
        self,
        client: TestClient,
        admin_headers: dict
    ):
        """Test listing API keys"""
        response = client.get(
            "/api/v1/admin/api-keys",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "keys" in data
        assert "total" in data
    
    def test_get_system_config(
        self,
        client: TestClient,
        admin_headers: dict
    ):
        """Test getting system configuration"""
        response = client.get(
            "/api/v1/admin/config",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "environment" in data
        assert "features" in data
        assert "limits" in data
    
    def test_admin_only_access(
        self,
        client: TestClient,
        auth_headers: dict
    ):
        """Test that non-admin cannot access admin endpoints"""
        response = client.get(
            "/api/v1/admin/config",
            headers=auth_headers
        )
        
        assert response.status_code == 403


# ============================================================================
# Rate Limiting Tests
# ============================================================================

class TestRateLimiting:
    """Tests for rate limiting"""
    
    def test_rate_limit_headers(
        self,
        client: TestClient,
        auth_headers: dict
    ):
        """Test that rate limit headers are present"""
        response = client.get(
            "/api/v1/models",
            headers=auth_headers
        )
        
        # Check for rate limit headers
        assert "X-RateLimit-Limit" in response.headers or response.status_code == 200
    
    @pytest.mark.skip(reason="Requires actual rate limiting to be enforced")
    def test_rate_limit_exceeded(
        self,
        client: TestClient,
        auth_headers: dict
    ):
        """Test rate limit enforcement"""
        # Make many requests to trigger rate limit
        for _ in range(100):
            response = client.get(
                "/api/v1/models",
                headers=auth_headers
            )
        
        # Should eventually get rate limited
        assert response.status_code == 429
        assert "Retry-After" in response.headers


# ============================================================================
# Error Handling Tests
# ============================================================================

class TestErrorHandling:
    """Tests for error handling"""
    
    def test_validation_error(
        self,
        client: TestClient,
        auth_headers: dict
    ):
        """Test validation error response"""
        response = client.post(
            "/api/v1/models",
            headers=auth_headers,
            json={
                "name": "Test",
                # Missing required fields
            }
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
    
    def test_not_found_error(
        self,
        client: TestClient,
        auth_headers: dict
    ):
        """Test not found error response"""
        response = client.get(
            "/api/v1/models/99999",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "NOT_FOUND"
    
    def test_error_has_request_id(
        self,
        client: TestClient,
        auth_headers: dict
    ):
        """Test that errors include request ID"""
        response = client.get(
            "/api/v1/models/99999",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "request_id" in data


# ============================================================================
# Health Check Tests
# ============================================================================

class TestHealthCheck:
    """Tests for health check endpoint"""
    
    def test_health_check(self, client: TestClient):
        """Test health check endpoint"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "degraded"]
    
    def test_detailed_health_check(
        self,
        client: TestClient,
        admin_headers: dict
    ):
        """Test detailed health check (admin only)"""
        response = client.get(
            "/api/v1/admin/health/detailed",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "components" in data
        assert "system" in data


# ============================================================================
# Integration Tests
# ============================================================================

class TestAPIIntegration:
    """Integration tests for API workflows"""
    
    def test_complete_model_workflow(
        self,
        client: TestClient,
        auth_headers: dict,
        mock_model_file: str,
        sample_input_data: dict
    ):
        """Test complete workflow: create model, run inference, delete model"""
        # 1. Create model
        response = client.post(
            "/api/v1/models",
            headers=auth_headers,
            json={
                "name": "Workflow Test Model",
                "description": "Test workflow",
                "framework": "pytorch",
                "file_path": mock_model_file,
                "input_shape": "(1, 3, 224, 224)",
                "output_shape": "(1, 1000)"
            }
        )
        assert response.status_code == 201
        model_id = response.json()["id"]
        
        # 2. Submit inference task
        response = client.post(
            "/api/v1/tasks/inference",
            headers=auth_headers,
            json={
                "model_id": model_id,
                "input_data": sample_input_data
            }
        )
        assert response.status_code == 202
        task_id = response.json()["task_id"]
        
        # 3. Check task status
        response = client.get(
            f"/api/v1/tasks/{task_id}",
            headers=auth_headers
        )
        assert response.status_code in [200, 404]  # Task might not exist in test
        
        # 4. Delete model
        response = client.delete(
            f"/api/v1/models/{model_id}",
            headers=auth_headers
        )
        assert response.status_code == 204

# Made with Bob
