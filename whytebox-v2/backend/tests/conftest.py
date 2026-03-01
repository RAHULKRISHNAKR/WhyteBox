"""
Pytest Configuration and Fixtures for WhyteBox Platform Tests

Provides shared fixtures for testing:
- Database sessions
- Test client
- Mock data
- Authentication

Author: WhyteBox Team
Date: 2026-02-26
"""

from typing import Generator

import pytest
from app.core.api_keys import APIKeyManager
from app.core.database import Base, get_db
from app.main import app
from app.models.model import Model
from app.models.user import User
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Test database URL (in-memory SQLite)
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

# Create test engine
engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Create test session factory
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """
    Create a fresh database session for each test.

    Yields:
        Database session
    """
    # Create tables
    Base.metadata.create_all(bind=engine)

    # Create session
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        # Drop tables
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    Create a test client with database session override.

    Args:
        db_session: Test database session

    Yields:
        FastAPI test client
    """

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session: Session) -> User:
    """
    Create a test user.

    Args:
        db_session: Database session

    Returns:
        Test user
    """
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed_password_here",
        is_active=True,
        is_admin=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """
    Create an admin user.

    Args:
        db_session: Database session

    Returns:
        Admin user
    """
    user = User(
        email="admin@example.com",
        username="admin",
        hashed_password="hashed_password_here",
        is_active=True,
        is_admin=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_api_key(db_session: Session, test_user: User) -> dict:
    """
    Create a test API key.

    Args:
        db_session: Database session
        test_user: Test user

    Returns:
        API key data with plain key
    """
    manager = APIKeyManager(db_session)
    result = manager.generate_key(
        user_id=test_user.id, name="Test API Key", scopes=["read", "write", "inference"]
    )
    return result


@pytest.fixture
def test_model(db_session: Session, test_user: User) -> Model:
    """
    Create a test model.

    Args:
        db_session: Database session
        test_user: Test user

    Returns:
        Test model
    """
    model = Model(
        name="Test Model",
        description="A test model",
        framework="pytorch",
        file_path="/tmp/test_model.pt",
        input_shape="(1, 3, 224, 224)",
        output_shape="(1, 1000)",
        user_id=test_user.id,
        status="active",
    )
    db_session.add(model)
    db_session.commit()
    db_session.refresh(model)
    return model


@pytest.fixture
def auth_headers(test_api_key: dict) -> dict:
    """
    Create authentication headers with API key.

    Args:
        test_api_key: Test API key data

    Returns:
        Headers dict with authorization
    """
    return {"Authorization": f"Bearer {test_api_key['key']}"}


@pytest.fixture
def admin_headers(db_session: Session, admin_user: User) -> dict:
    """
    Create admin authentication headers.

    Args:
        db_session: Database session
        admin_user: Admin user

    Returns:
        Headers dict with admin authorization
    """
    manager = APIKeyManager(db_session)
    result = manager.generate_key(
        user_id=admin_user.id, name="Admin API Key", scopes=["read", "write", "inference", "admin"]
    )
    return {"Authorization": f"Bearer {result['key']}"}


@pytest.fixture
def mock_model_file(tmp_path):
    """
    Create a mock model file for testing.

    Args:
        tmp_path: Pytest tmp_path fixture

    Returns:
        Path to mock model file
    """
    model_file = tmp_path / "test_model.pt"
    model_file.write_bytes(b"mock model data")
    return str(model_file)


@pytest.fixture
def sample_input_data() -> dict:
    """
    Create sample input data for testing.

    Returns:
        Sample input data
    """
    return {
        "image": "base64_encoded_image_data_here",
        "preprocessing": {"normalize": True, "resize": [224, 224]},
    }


@pytest.fixture(autouse=True)
def reset_cache():
    """Reset cache before each test"""
    from app.core.cache import cache_manager

    try:
        cache_manager.clear()
    except:
        pass  # Cache might not be available in tests
    yield


# Made with Bob
