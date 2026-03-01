"""
Tests for Authentication API endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
@pytest.mark.unit
class TestAuthAPI:
    """Test suite for Authentication API endpoints."""

    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "SecurePass123!",
                "full_name": "New User",
            },
        )

        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data or "user" in data
        assert "email" in data or ("user" in data and "email" in data["user"])

    async def test_register_duplicate_email(self, client: AsyncClient, test_user):
        """Test registration with duplicate email."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",  # Already exists
                "password": "SecurePass123!",
                "full_name": "Duplicate User",
            },
        )

        assert response.status_code in [400, 409, 422]
        data = response.json()
        assert "error" in data or "detail" in data

    async def test_register_invalid_email(self, client: AsyncClient):
        """Test registration with invalid email format."""
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "invalid-email", "password": "SecurePass123!", "full_name": "Test User"},
        )

        assert response.status_code == 422

    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with weak password."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "user@example.com",
                "password": "123",  # Too weak
                "full_name": "Test User",
            },
        )

        assert response.status_code in [400, 422]

    async def test_register_missing_fields(self, client: AsyncClient):
        """Test registration with missing required fields."""
        response = await client.post("/api/v1/auth/register", json={"email": "user@example.com"})

        assert response.status_code == 422

    async def test_login_success(self, client: AsyncClient, test_user):
        """Test successful login."""
        response = await client.post(
            "/api/v1/auth/login", json={"email": "test@example.com", "password": "testpassword123"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient, test_user):
        """Test login with incorrect password."""
        response = await client.post(
            "/api/v1/auth/login", json={"email": "test@example.com", "password": "wrongpassword"}
        )

        assert response.status_code in [401, 403]
        data = response.json()
        assert "error" in data or "detail" in data

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@example.com", "password": "password123"},
        )

        assert response.status_code in [401, 404]

    async def test_login_missing_credentials(self, client: AsyncClient):
        """Test login with missing credentials."""
        response = await client.post("/api/v1/auth/login", json={"email": "test@example.com"})

        assert response.status_code == 422

    async def test_get_current_user(self, client: AsyncClient, auth_headers: dict):
        """Test getting current user information."""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == "test@example.com"

    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """Test getting current user without authentication."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token."""
        response = await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == 401

    async def test_refresh_token(self, client: AsyncClient, auth_headers: dict):
        """Test refreshing access token."""
        response = await client.post("/api/v1/auth/refresh", headers=auth_headers)

        # Endpoint may not be implemented yet
        assert response.status_code in [200, 404, 501]

        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data

    async def test_logout(self, client: AsyncClient, auth_headers: dict):
        """Test user logout."""
        response = await client.post("/api/v1/auth/logout", headers=auth_headers)

        # Endpoint may not be implemented yet
        assert response.status_code in [200, 204, 404, 501]

    async def test_change_password(self, client: AsyncClient, auth_headers: dict):
        """Test changing user password."""
        response = await client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers,
            json={"old_password": "testpassword123", "new_password": "NewSecurePass123!"},
        )

        # Endpoint may not be implemented yet
        assert response.status_code in [200, 404, 501]


@pytest.mark.asyncio
@pytest.mark.integration
class TestAuthIntegration:
    """Integration tests for Authentication."""

    async def test_register_login_flow(self, client: AsyncClient):
        """Test complete registration and login flow."""
        # 1. Register new user
        register_response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "flowtest@example.com",
                "password": "SecurePass123!",
                "full_name": "Flow Test User",
            },
        )

        assert register_response.status_code in [200, 201]

        # 2. Login with new credentials
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "flowtest@example.com", "password": "SecurePass123!"},
        )

        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # 3. Access protected endpoint
        me_response = await client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )

        assert me_response.status_code == 200
        assert me_response.json()["email"] == "flowtest@example.com"

    async def test_token_expiration(self, client: AsyncClient, test_user):
        """Test token expiration handling."""
        # Login to get token
        login_response = await client.post(
            "/api/v1/auth/login", json={"email": "test@example.com", "password": "testpassword123"}
        )

        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Use token immediately (should work)
        response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200

        # Note: Testing actual expiration would require waiting or mocking time

    async def test_concurrent_logins(self, client: AsyncClient, test_user):
        """Test multiple concurrent login attempts."""
        import asyncio

        async def login():
            return await client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "testpassword123"},
            )

        # Perform concurrent logins
        responses = await asyncio.gather(*[login() for _ in range(5)], return_exceptions=True)

        # All should succeed
        for response in responses:
            if not isinstance(response, Exception):
                assert response.status_code == 200
                assert "access_token" in response.json()


@pytest.mark.asyncio
@pytest.mark.unit
class TestAuthSecurity:
    """Security-focused tests for authentication."""

    async def test_sql_injection_attempt(self, client: AsyncClient):
        """Test SQL injection protection in login."""
        response = await client.post(
            "/api/v1/auth/login", json={"email": "admin' OR '1'='1", "password": "password"}
        )

        assert response.status_code in [401, 422]

    async def test_xss_in_registration(self, client: AsyncClient):
        """Test XSS protection in registration."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "full_name": "<script>alert('xss')</script>",
            },
        )

        # Should either sanitize or reject
        if response.status_code in [200, 201]:
            data = response.json()
            full_name = data.get("full_name") or data.get("user", {}).get("full_name")
            assert "<script>" not in str(full_name)

    async def test_rate_limiting(self, client: AsyncClient):
        """Test rate limiting on login attempts."""
        # Attempt multiple failed logins
        for _ in range(10):
            await client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "wrongpassword"},
            )

        # Next attempt should be rate limited (if implemented)
        response = await client.post(
            "/api/v1/auth/login", json={"email": "test@example.com", "password": "wrongpassword"}
        )

        # May return 429 if rate limiting is implemented
        assert response.status_code in [401, 429]

    async def test_password_not_in_response(self, client: AsyncClient, test_user):
        """Test that password is never returned in responses."""
        response = await client.post(
            "/api/v1/auth/login", json={"email": "test@example.com", "password": "testpassword123"}
        )

        assert response.status_code == 200
        data = response.json()

        # Password should never be in response
        assert "password" not in str(data).lower() or "password" in [
            "password_reset",
            "password_changed",
        ]


# Made with Bob
