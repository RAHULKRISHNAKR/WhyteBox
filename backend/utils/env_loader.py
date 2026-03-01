"""
Environment Variable Loader for WhyteBox

Loads configuration from .env file with fallback to defaults
"""

import os
from pathlib import Path
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)


class EnvLoader:
    """Load and manage environment variables"""
    
    def __init__(self, env_file: str = '.env'):
        """
        Initialize environment loader
        
        Args:
            env_file: Path to .env file (relative to project root)
        """
        self.env_file = env_file
        self.loaded = False
        self._load_env_file()
    
    def _load_env_file(self):
        """Load environment variables from .env file"""
        # Find project root (where .env should be)
        current_dir = Path(__file__).parent
        project_root = current_dir.parent.parent
        env_path = project_root / self.env_file
        
        if not env_path.exists():
            logger.warning(f".env file not found at {env_path}. Using defaults.")
            return
        
        try:
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    
                    # Skip comments and empty lines
                    if not line or line.startswith('#'):
                        continue
                    
                    # Parse KEY=VALUE
                    if '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip()
                        
                        # Remove quotes if present
                        if value.startswith('"') and value.endswith('"'):
                            value = value[1:-1]
                        elif value.startswith("'") and value.endswith("'"):
                            value = value[1:-1]
                        
                        # Set environment variable if not already set
                        if key not in os.environ:
                            os.environ[key] = value
            
            self.loaded = True
            logger.info(f"Loaded environment variables from {env_path}")
            
        except Exception as e:
            logger.error(f"Error loading .env file: {e}")
    
    @staticmethod
    def get(key: str, default: Any = None, cast_type: type = str) -> Any:
        """
        Get environment variable with type casting
        
        Args:
            key: Environment variable name
            default: Default value if not found
            cast_type: Type to cast value to (str, int, float, bool)
            
        Returns:
            Environment variable value cast to specified type
        """
        value = os.environ.get(key)
        
        if value is None:
            return default
        
        try:
            if cast_type == bool:
                return value.lower() in ('true', '1', 'yes', 'on')
            elif cast_type == int:
                return int(value)
            elif cast_type == float:
                return float(value)
            elif cast_type == list:
                return [item.strip() for item in value.split(',')]
            else:
                return str(value)
        except (ValueError, AttributeError) as e:
            logger.warning(f"Error casting {key}={value} to {cast_type}: {e}")
            return default
    
    @staticmethod
    def get_int(key: str, default: int = 0) -> int:
        """Get integer environment variable"""
        return EnvLoader.get(key, default, int)
    
    @staticmethod
    def get_float(key: str, default: float = 0.0) -> float:
        """Get float environment variable"""
        return EnvLoader.get(key, default, float)
    
    @staticmethod
    def get_bool(key: str, default: bool = False) -> bool:
        """Get boolean environment variable"""
        return EnvLoader.get(key, default, bool)
    
    @staticmethod
    def get_list(key: str, default: Optional[list] = None) -> list:
        """Get list environment variable (comma-separated)"""
        return EnvLoader.get(key, default or [], list)
    
    @staticmethod
    def require(key: str, cast_type: type = str) -> Any:
        """
        Get required environment variable (raises error if not found)
        
        Args:
            key: Environment variable name
            cast_type: Type to cast value to
            
        Returns:
            Environment variable value
            
        Raises:
            ValueError: If environment variable is not set
        """
        value = EnvLoader.get(key, cast_type=cast_type)
        if value is None:
            raise ValueError(f"Required environment variable '{key}' is not set")
        return value


# Global instance
env = EnvLoader()


# Convenience functions
def get_env(key: str, default: Any = None, cast_type: type = str) -> Any:
    """Get environment variable"""
    return env.get(key, default, cast_type)


def get_env_int(key: str, default: int = 0) -> int:
    """Get integer environment variable"""
    return env.get_int(key, default)


def get_env_float(key: str, default: float = 0.0) -> float:
    """Get float environment variable"""
    return env.get_float(key, default)


def get_env_bool(key: str, default: bool = False) -> bool:
    """Get boolean environment variable"""
    return env.get_bool(key, default)


def get_env_list(key: str, default: Optional[list] = None) -> list:
    """Get list environment variable"""
    return env.get_list(key, default)


def require_env(key: str, cast_type: type = str) -> Any:
    """Get required environment variable"""
    return env.require(key, cast_type)

# Made with Bob
