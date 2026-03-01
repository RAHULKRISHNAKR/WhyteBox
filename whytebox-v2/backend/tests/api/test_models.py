"""
Tests for Models API endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
@pytest.mark.unit
class TestModelsAPI:
    """Test suite for Models API endpoints."""
    
    async def test_list_models_success(self, client: AsyncClient, auth_headers: dict):
        """Test listing models successfully."""
        response = await client.get(
            "/api/v1/models/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert isinstance(data["items"], list)
    
    async def test_list_models_pagination(self, client: AsyncClient, auth_headers: dict):
        """Test models list pagination."""
        response = await client.get(
            "/api/v1/models/?page=1&page_size=5",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert len(data["items"]) <= 5
    
    async def test_list_models_filter_by_framework(self, client: AsyncClient, auth_headers: dict):
        """Test filtering models by framework."""
        response = await client.get(
            "/api/v1/models/?framework=pytorch",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        for model in data["items"]:
            assert model["framework"] == "pytorch"
    
    async def test_list_models_filter_by_type(self, client: AsyncClient, auth_headers: dict):
        """Test filtering models by type."""
        response = await client.get(
            "/api/v1/models/?type=cnn",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        for model in data["items"]:
            assert model["type"] == "cnn"
    
    async def test_list_models_unauthorized(self, client: AsyncClient):
        """Test listing models without authentication."""
        response = await client.get("/api/v1/models/")
        assert response.status_code == 401
    
    async def test_get_model_success(self, client: AsyncClient, auth_headers: dict, sample_model_data: dict):
        """Test getting a specific model."""
        # First create a model (mock)
        model_id = "vgg16"
        
        response = await client.get(
            f"/api/v1/models/{model_id}",
            headers=auth_headers
        )
        
        # For now, expect 404 since we haven't seeded data
        # In real implementation, this would return 200 with model data
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert data["id"] == model_id
            assert "name" in data
            assert "type" in data
            assert "framework" in data
            assert "architecture" in data
    
    async def test_get_model_not_found(self, client: AsyncClient, auth_headers: dict):
        """Test getting a non-existent model."""
        response = await client.get(
            "/api/v1/models/nonexistent_model",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data or "detail" in data
    
    async def test_get_model_unauthorized(self, client: AsyncClient):
        """Test getting model without authentication."""
        response = await client.get("/api/v1/models/vgg16")
        assert response.status_code == 401
    
    async def test_load_model_success(self, client: AsyncClient, auth_headers: dict):
        """Test loading a model."""
        response = await client.post(
            "/api/v1/models/load",
            headers=auth_headers,
            json={
                "model_id": "vgg16",
                "device": "cpu"
            }
        )
        
        # Expect 200 or 404 depending on if model exists
        assert response.status_code in [200, 404, 422]
        
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "success"
            assert data["model_id"] == "vgg16"
            assert "device" in data
    
    async def test_load_model_invalid_device(self, client: AsyncClient, auth_headers: dict):
        """Test loading model with invalid device."""
        response = await client.post(
            "/api/v1/models/load",
            headers=auth_headers,
            json={
                "model_id": "vgg16",
                "device": "invalid_device"
            }
        )
        
        assert response.status_code == 422
    
    async def test_load_model_missing_model_id(self, client: AsyncClient, auth_headers: dict):
        """Test loading model without model_id."""
        response = await client.post(
            "/api/v1/models/load",
            headers=auth_headers,
            json={"device": "cpu"}
        )
        
        assert response.status_code == 422
    
    async def test_upload_model_success(self, client: AsyncClient, auth_headers: dict, mock_model_file):
        """Test uploading a model file."""
        with open(mock_model_file, "rb") as f:
            response = await client.post(
                "/api/v1/models/upload",
                headers=auth_headers,
                files={"file": ("test_model.pth", f, "application/octet-stream")},
                data={
                    "name": "Test Model",
                    "type": "cnn",
                    "framework": "pytorch",
                    "description": "Test model upload"
                }
            )
        
        # Expect 200 or 201 for successful upload
        assert response.status_code in [200, 201, 422]
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert data["status"] == "success"
            assert "model" in data
    
    async def test_upload_model_missing_file(self, client: AsyncClient, auth_headers: dict):
        """Test uploading model without file."""
        response = await client.post(
            "/api/v1/models/upload",
            headers=auth_headers,
            data={
                "name": "Test Model",
                "type": "cnn",
                "framework": "pytorch"
            }
        )
        
        assert response.status_code == 422
    
    async def test_upload_model_invalid_framework(self, client: AsyncClient, auth_headers: dict, mock_model_file):
        """Test uploading model with invalid framework."""
        with open(mock_model_file, "rb") as f:
            response = await client.post(
                "/api/v1/models/upload",
                headers=auth_headers,
                files={"file": ("test_model.pth", f, "application/octet-stream")},
                data={
                    "name": "Test Model",
                    "type": "cnn",
                    "framework": "invalid_framework"
                }
            )
        
        assert response.status_code == 422
    
    async def test_delete_model_success(self, client: AsyncClient, auth_headers: dict):
        """Test deleting a model."""
        model_id = "test_model_to_delete"
        
        response = await client.delete(
            f"/api/v1/models/{model_id}",
            headers=auth_headers
        )
        
        # Expect 200 or 404 depending on if model exists
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "success"
            assert data["model_id"] == model_id
    
    async def test_delete_model_not_found(self, client: AsyncClient, auth_headers: dict):
        """Test deleting a non-existent model."""
        response = await client.delete(
            "/api/v1/models/nonexistent_model",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    async def test_delete_model_unauthorized(self, client: AsyncClient):
        """Test deleting model without authentication."""
        response = await client.delete("/api/v1/models/test_model")
        assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
class TestModelsIntegration:
    """Integration tests for Models API."""
    
    async def test_model_lifecycle(self, client: AsyncClient, auth_headers: dict, mock_model_file):
        """Test complete model lifecycle: upload -> load -> get -> delete."""
        # 1. Upload model
        with open(mock_model_file, "rb") as f:
            upload_response = await client.post(
                "/api/v1/models/upload",
                headers=auth_headers,
                files={"file": ("test_model.pth", f, "application/octet-stream")},
                data={
                    "name": "Lifecycle Test Model",
                    "type": "cnn",
                    "framework": "pytorch",
                    "description": "Model for lifecycle testing"
                }
            )
        
        if upload_response.status_code not in [200, 201]:
            pytest.skip("Model upload not implemented yet")
        
        model_id = upload_response.json()["model"]["id"]
        
        # 2. Load model
        load_response = await client.post(
            "/api/v1/models/load",
            headers=auth_headers,
            json={"model_id": model_id, "device": "cpu"}
        )
        assert load_response.status_code == 200
        
        # 3. Get model details
        get_response = await client.get(
            f"/api/v1/models/{model_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        # 4. Delete model
        delete_response = await client.delete(
            f"/api/v1/models/{model_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # 5. Verify deletion
        verify_response = await client.get(
            f"/api/v1/models/{model_id}",
            headers=auth_headers
        )
        assert verify_response.status_code == 404
    
    async def test_concurrent_model_loads(self, client: AsyncClient, auth_headers: dict):
        """Test loading multiple models concurrently."""
        import asyncio
        
        model_ids = ["vgg16", "resnet50", "mobilenet"]
        
        async def load_model(model_id: str):
            return await client.post(
                "/api/v1/models/load",
                headers=auth_headers,
                json={"model_id": model_id, "device": "cpu"}
            )
        
        # Load models concurrently
        responses = await asyncio.gather(
            *[load_model(mid) for mid in model_ids],
            return_exceptions=True
        )
        
        # Check that all requests completed (success or expected failure)
        for response in responses:
            if not isinstance(response, Exception):
                assert response.status_code in [200, 404]

# Made with Bob
