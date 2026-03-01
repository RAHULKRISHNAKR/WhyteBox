"""
Tests for Flask API Endpoints

Tests health check, model loading, inference, and explainability endpoints.
"""

import pytest
import json
import io
from PIL import Image


@pytest.mark.api
class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_check(self, flask_client):
        """Test /api/health endpoint"""
        response = flask_client.get('/api/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert 'pytorch_available' in data
        assert 'keras_available' in data
    
    def test_root_endpoint(self, flask_client):
        """Test root / endpoint"""
        response = flask_client.get('/')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['name'] == 'WhyteBox Backend API'
        assert 'endpoints' in data


@pytest.mark.api
class TestModelEndpoints:
    """Test model-related endpoints"""
    
    def test_list_models(self, flask_client):
        """Test /api/models endpoint"""
        response = flask_client.get('/api/models')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'models' in data
        assert isinstance(data['models'], list)
    
    def test_list_available_models(self, flask_client):
        """Test /api/models/available endpoint"""
        response = flask_client.get('/api/models/available')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'models' in data
        assert len(data['models']) > 0
        
        # Check model structure
        first_model = data['models'][0]
        assert 'name' in first_model
        assert 'display_name' in first_model
        assert 'framework' in first_model


@pytest.mark.api
class TestInferenceEndpoint:
    """Test inference endpoint"""
    
    def test_inference_missing_image(self, flask_client):
        """Test inference without image"""
        response = flask_client.post('/api/inference', data={
            'model_path': 'vgg16',
            'framework': 'pytorch'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_inference_missing_model_path(self, flask_client, sample_image):
        """Test inference without model path"""
        # Create image file
        img_io = io.BytesIO()
        sample_image.save(img_io, 'JPEG')
        img_io.seek(0)
        
        response = flask_client.post('/api/inference', data={
            'image': (img_io, 'test.jpg'),
            'framework': 'pytorch'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_inference_invalid_framework(self, flask_client, sample_image):
        """Test inference with invalid framework"""
        img_io = io.BytesIO()
        sample_image.save(img_io, 'JPEG')
        img_io.seek(0)
        
        response = flask_client.post('/api/inference', data={
            'image': (img_io, 'test.jpg'),
            'model_path': 'vgg16',
            'framework': 'invalid'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data


@pytest.mark.api
class TestExplainabilityEndpoint:
    """Test explainability endpoint"""
    
    def test_explainability_missing_image(self, flask_client):
        """Test explainability without image"""
        response = flask_client.post('/api/explainability', data={
            'model_path': 'vgg16',
            'framework': 'pytorch',
            'method': 'gradcam'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_explainability_invalid_method(self, flask_client, sample_image):
        """Test explainability with invalid method"""
        img_io = io.BytesIO()
        sample_image.save(img_io, 'JPEG')
        img_io.seek(0)
        
        response = flask_client.post('/api/explainability', data={
            'image': (img_io, 'test.jpg'),
            'model_path': 'vgg16',
            'framework': 'pytorch',
            'method': 'invalid_method'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Invalid method' in data['error']


@pytest.mark.api
class TestValidationEndpoint:
    """Test validation endpoint"""
    
    def test_validate_missing_file(self, flask_client):
        """Test validation without file"""
        response = flask_client.post('/api/validate')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_validate_invalid_json(self, flask_client):
        """Test validation with invalid JSON"""
        file_content = b"not valid json"
        
        response = flask_client.post('/api/validate', data={
            'file': (io.BytesIO(file_content), 'test.json')
        })
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'error' in data


@pytest.mark.api
class TestErrorHandling:
    """Test API error handling"""
    
    def test_404_error(self, flask_client):
        """Test 404 error handling"""
        response = flask_client.get('/api/nonexistent')
        
        assert response.status_code == 404
    
    def test_method_not_allowed(self, flask_client):
        """Test 405 method not allowed"""
        response = flask_client.put('/api/health')
        
        assert response.status_code == 405


@pytest.mark.api
@pytest.mark.integration
class TestFullWorkflow:
    """Test complete workflow integration"""
    
    def test_health_then_models(self, flask_client):
        """Test health check followed by model list"""
        # Check health
        health_response = flask_client.get('/api/health')
        assert health_response.status_code == 200
        
        # List models
        models_response = flask_client.get('/api/models/available')
        assert models_response.status_code == 200
        
        data = json.loads(models_response.data)
        assert len(data['models']) > 0


@pytest.mark.api
class TestCORSHeaders:
    """Test CORS headers"""
    
    def test_cors_headers_present(self, flask_client):
        """Test that CORS headers are present"""
        response = flask_client.get('/api/health')
        
        assert response.status_code == 200
        # CORS headers should be present
        assert 'Access-Control-Allow-Origin' in response.headers or \
               response.headers.get('Access-Control-Allow-Origin') is not None


@pytest.mark.api
class TestRateLimiting:
    """Test rate limiting (if implemented)"""
    
    def test_multiple_requests(self, flask_client):
        """Test multiple rapid requests"""
        # Make multiple requests
        for _ in range(10):
            response = flask_client.get('/api/health')
            assert response.status_code == 200

# Made with Bob
