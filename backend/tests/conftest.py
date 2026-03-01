"""
Pytest Configuration and Fixtures for WhyteBox Tests

Provides shared fixtures and configuration for all tests.
"""

import pytest
import sys
import os
from pathlib import Path
import tempfile
import shutil
import torch
import numpy as np
from PIL import Image

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


@pytest.fixture(scope="session")
def test_data_dir():
    """Create temporary directory for test data"""
    temp_dir = tempfile.mkdtemp(prefix="whytebox_test_")
    yield Path(temp_dir)
    shutil.rmtree(temp_dir)


@pytest.fixture(scope="session")
def sample_image():
    """Create a sample test image"""
    # Create 224x224 RGB image
    img = Image.new('RGB', (224, 224), color=(100, 150, 200))
    return img


@pytest.fixture(scope="session")
def sample_image_path(test_data_dir, sample_image):
    """Save sample image to file"""
    img_path = test_data_dir / "test_image.jpg"
    sample_image.save(img_path)
    return img_path


@pytest.fixture(scope="session")
def sample_model():
    """Create a simple PyTorch model for testing"""
    class SimpleModel(torch.nn.Module):
        def __init__(self):
            super().__init__()
            self.conv1 = torch.nn.Conv2d(3, 16, 3, padding=1)
            self.relu = torch.nn.ReLU()
            self.pool = torch.nn.MaxPool2d(2)
            self.conv2 = torch.nn.Conv2d(16, 32, 3, padding=1)
            self.flatten = torch.nn.Flatten()
            self.fc = torch.nn.Linear(32 * 56 * 56, 10)
        
        def forward(self, x):
            x = self.conv1(x)
            x = self.relu(x)
            x = self.pool(x)
            x = self.conv2(x)
            x = self.relu(x)
            x = self.pool(x)
            x = self.flatten(x)
            x = self.fc(x)
            return x
    
    model = SimpleModel()
    model.eval()
    return model


@pytest.fixture(scope="session")
def sample_model_path(test_data_dir, sample_model):
    """Save sample model to file"""
    model_path = test_data_dir / "test_model.pth"
    torch.save(sample_model.state_dict(), model_path)
    return model_path


@pytest.fixture(scope="session")
def sample_tensor():
    """Create sample input tensor"""
    return torch.randn(1, 3, 224, 224)


@pytest.fixture(scope="session")
def sample_activation_data():
    """Create sample activation data"""
    return {
        'layer_0': {
            'shape': [1, 16, 112, 112],
            'data': np.random.randn(1, 16, 112, 112).tolist()
        },
        'layer_1': {
            'shape': [1, 32, 56, 56],
            'data': np.random.randn(1, 32, 56, 56).tolist()
        }
    }


@pytest.fixture
def flask_app():
    """Create Flask app for testing"""
    from api.app import app
    app.config['TESTING'] = True
    app.config['DEBUG'] = False
    return app


@pytest.fixture
def flask_client(flask_app):
    """Create Flask test client"""
    return flask_app.test_client()


@pytest.fixture
def mock_model_cache(monkeypatch):
    """Mock model cache"""
    cache = {}
    
    def mock_load_model(path, framework):
        if path not in cache:
            cache[path] = sample_model()
        return cache[path]
    
    return cache


@pytest.fixture(scope="function")
def clean_temp_files(test_data_dir):
    """Clean up temporary files after each test"""
    yield
    # Cleanup logic here if needed
    pass


# Markers for different test categories
def pytest_configure(config):
    """Configure custom pytest markers"""
    config.addinivalue_line(
        "markers", "unit: Unit tests for individual functions"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests for multiple components"
    )
    config.addinivalue_line(
        "markers", "api: API endpoint tests"
    )
    config.addinivalue_line(
        "markers", "slow: Tests that take a long time to run"
    )
    config.addinivalue_line(
        "markers", "gpu: Tests that require GPU"
    )


# Skip GPU tests if CUDA not available
def pytest_collection_modifyitems(config, items):
    """Modify test collection"""
    skip_gpu = pytest.mark.skip(reason="CUDA not available")
    for item in items:
        if "gpu" in item.keywords and not torch.cuda.is_available():
            item.add_marker(skip_gpu)

# Made with Bob
