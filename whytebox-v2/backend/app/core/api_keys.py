"""
API Key Management for WhyteBox Platform

Provides API key generation, validation, and management with
scopes and rate limiting integration.

Author: WhyteBox Team
Date: 2026-02-26
"""

import secrets
import hashlib
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from fastapi import Request, HTTPException, status, Depends
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class APIKeyScope(str):
    """API key scopes for permission control"""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    INFERENCE = "inference"
    EXPLAINABILITY = "explainability"
    CONVERSION = "conversion"
    ALL = "all"


class APIKey(BaseModel):
    """API key model"""
    key_id: str
    key_hash: str
    name: str
    user_id: str
    scopes: List[str]
    rate_limit_tier: str = "FREE"
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    is_active: bool = True
    usage_count: int = 0


class APIKeyManager:
    """
    Manage API keys with validation and scope checking.
    
    Features:
    - Secure key generation
    - Key hashing (never store plain keys)
    - Scope-based permissions
    - Expiration support
    - Usage tracking
    - Rate limit tier assignment
    """
    
    def __init__(self):
        # In-memory storage (replace with database in production)
        self.keys: Dict[str, APIKey] = {}
        self.key_prefix = "wb_"  # WhyteBox prefix
    
    def generate_key(
        self,
        name: str,
        user_id: str,
        scopes: List[str],
        rate_limit_tier: str = "FREE",
        expires_in_days: Optional[int] = None
    ) -> tuple[str, APIKey]:
        """
        Generate a new API key.
        
        Args:
            name: Human-readable key name
            user_id: User ID who owns the key
            scopes: List of permission scopes
            rate_limit_tier: Rate limit tier (FREE, BASIC, PRO, ENTERPRISE)
            expires_in_days: Optional expiration in days
            
        Returns:
            Tuple of (plain_key, api_key_object)
            
        Note:
            The plain key is only returned once and should be shown to user.
            It cannot be retrieved later.
        """
        # Generate secure random key
        random_bytes = secrets.token_bytes(32)
        plain_key = f"{self.key_prefix}{secrets.token_urlsafe(32)}"
        
        # Hash the key for storage
        key_hash = self._hash_key(plain_key)
        key_id = secrets.token_urlsafe(16)
        
        # Calculate expiration
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        # Create API key object
        api_key = APIKey(
            key_id=key_id,
            key_hash=key_hash,
            name=name,
            user_id=user_id,
            scopes=scopes,
            rate_limit_tier=rate_limit_tier,
            created_at=datetime.utcnow(),
            expires_at=expires_at,
            is_active=True,
            usage_count=0
        )
        
        # Store key
        self.keys[key_hash] = api_key
        
        logger.info(f"Generated API key '{name}' for user {user_id}")
        
        return plain_key, api_key
    
    def validate_key(
        self,
        plain_key: str,
        required_scopes: Optional[List[str]] = None
    ) -> APIKey:
        """
        Validate API key and check scopes.
        
        Args:
            plain_key: Plain text API key
            required_scopes: Optional list of required scopes
            
        Returns:
            APIKey object if valid
            
        Raises:
            HTTPException: If key is invalid, expired, or lacks required scopes
        """
        # Hash the provided key
        key_hash = self._hash_key(plain_key)
        
        # Look up key
        api_key = self.keys.get(key_hash)
        
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        # Check if key is active
        if not api_key.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key has been revoked"
            )
        
        # Check expiration
        if api_key.expires_at and datetime.utcnow() > api_key.expires_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key has expired"
            )
        
        # Check scopes
        if required_scopes:
            if APIKeyScope.ALL not in api_key.scopes:
                missing_scopes = set(required_scopes) - set(api_key.scopes)
                if missing_scopes:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing required scopes: {', '.join(missing_scopes)}"
                    )
        
        # Update usage
        api_key.last_used_at = datetime.utcnow()
        api_key.usage_count += 1
        
        return api_key
    
    def revoke_key(self, key_id: str) -> bool:
        """
        Revoke an API key.
        
        Args:
            key_id: Key ID to revoke
            
        Returns:
            True if key was revoked, False if not found
        """
        for api_key in self.keys.values():
            if api_key.key_id == key_id:
                api_key.is_active = False
                logger.info(f"Revoked API key {key_id}")
                return True
        
        return False
    
    def list_keys(self, user_id: str) -> List[APIKey]:
        """
        List all API keys for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of API keys (excluding key hashes)
        """
        return [
            key for key in self.keys.values()
            if key.user_id == user_id
        ]
    
    def get_key_info(self, key_id: str) -> Optional[APIKey]:
        """
        Get information about an API key.
        
        Args:
            key_id: Key ID
            
        Returns:
            APIKey object or None if not found
        """
        for api_key in self.keys.values():
            if api_key.key_id == key_id:
                return api_key
        
        return None
    
    def _hash_key(self, plain_key: str) -> str:
        """Hash API key using SHA-256"""
        return hashlib.sha256(plain_key.encode()).hexdigest()


# Global API key manager
api_key_manager = APIKeyManager()


# FastAPI security scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_api_key(
    api_key: Optional[str] = Depends(api_key_header),
    required_scopes: Optional[List[str]] = None
) -> Optional[APIKey]:
    """
    FastAPI dependency for API key authentication.
    
    Usage:
        @app.get("/endpoint")
        async def endpoint(api_key: APIKey = Depends(get_api_key)):
            return {"user_id": api_key.user_id}
    """
    if not api_key:
        return None
    
    return api_key_manager.validate_key(api_key, required_scopes)


def require_api_key(required_scopes: Optional[List[str]] = None):
    """
    Create a dependency that requires API key with specific scopes.
    
    Usage:
        require_inference = require_api_key([APIKeyScope.INFERENCE])
        
        @app.post("/inference", dependencies=[Depends(require_inference)])
        async def inference():
            return {"result": "..."}
    """
    async def dependency(api_key: Optional[str] = Depends(api_key_header)):
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required"
            )
        
        return api_key_manager.validate_key(api_key, required_scopes)
    
    return dependency


# Pre-configured dependencies
require_read = require_api_key([APIKeyScope.READ])
require_write = require_api_key([APIKeyScope.WRITE])
require_inference = require_api_key([APIKeyScope.INFERENCE])
require_explainability = require_api_key([APIKeyScope.EXPLAINABILITY])
require_conversion = require_api_key([APIKeyScope.CONVERSION])
require_admin = require_api_key([APIKeyScope.ADMIN])


def get_api_key_manager() -> APIKeyManager:
    """Get API key manager instance"""
    return api_key_manager

# Made with Bob
