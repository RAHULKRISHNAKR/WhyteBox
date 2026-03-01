"""
Enhanced Logger Utility with Colored Output and Emojis
Provides consistent logging across the application
"""

import logging
import sys
from typing import Optional

try:
    from colorlog import ColoredFormatter
    COLORLOG_AVAILABLE = True
except ImportError:
    COLORLOG_AVAILABLE = False


def setup_logger(
    name: str,
    level: int = logging.INFO,
    use_colors: bool = True
) -> logging.Logger:
    """
    Setup a logger with colored output and emoji support.
    
    Args:
        name: Logger name (usually __name__)
        level: Logging level (default: INFO)
        use_colors: Whether to use colored output (default: True)
    
    Returns:
        Configured logger instance
    
    Example:
        >>> logger = setup_logger(__name__)
        >>> logger.info("✅ Operation successful")
        >>> logger.warning("⚠️ Cache miss")
        >>> logger.error("❌ Failed to load model")
    """
    logger = logging.getLogger(name)
    
    # Avoid adding handlers multiple times
    if logger.handlers:
        return logger
    
    logger.setLevel(level)
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    
    # Setup formatter
    if use_colors and COLORLOG_AVAILABLE:
        formatter = ColoredFormatter(
            "%(log_color)s%(levelname)-8s%(reset)s %(blue)s[%(name)s]%(reset)s %(message)s",
            datefmt=None,
            reset=True,
            log_colors={
                'DEBUG': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'red,bg_white',
            },
            secondary_log_colors={},
            style='%'
        )
    else:
        formatter = logging.Formatter(
            '%(levelname)-8s [%(name)s] %(message)s'
        )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger


class LoggerMixin:
    """
    Mixin class to add logging capabilities to any class.
    
    Example:
        >>> class MyClass(LoggerMixin):
        ...     def process(self):
        ...         self.logger.info("✅ Processing complete")
    """
    
    @property
    def logger(self) -> logging.Logger:
        """Get logger for this class"""
        if not hasattr(self, '_logger'):
            self._logger = setup_logger(self.__class__.__name__)
        return self._logger


# Emoji constants for consistent usage
class LogEmoji:
    """Standard emojis for logging"""
    SUCCESS = "✅"
    ERROR = "❌"
    WARNING = "⚠️"
    INFO = "ℹ️"
    LOADING = "⏳"
    ROCKET = "🚀"
    FIRE = "🔥"
    BRAIN = "🧠"
    CHART = "📊"
    LOCK = "🔒"
    KEY = "🔑"
    PACKAGE = "📦"
    FOLDER = "📁"
    FILE = "📄"
    NETWORK = "🌐"
    DATABASE = "💾"
    CACHE = "💿"
    CLOCK = "⏰"
    CHECK = "✓"
    CROSS = "✗"
    ARROW_RIGHT = "→"
    ARROW_LEFT = "←"
    ARROW_UP = "↑"
    ARROW_DOWN = "↓"


# Example usage
if __name__ == '__main__':
    # Test logger
    logger = setup_logger(__name__)
    
    logger.debug(f"{LogEmoji.INFO} Debug message")
    logger.info(f"{LogEmoji.SUCCESS} Info message")
    logger.warning(f"{LogEmoji.WARNING} Warning message")
    logger.error(f"{LogEmoji.ERROR} Error message")
    logger.critical(f"{LogEmoji.FIRE} Critical message")
    
    # Test mixin
    class TestClass(LoggerMixin):
        def test(self):
            self.logger.info(f"{LogEmoji.ROCKET} Testing mixin")
    
    obj = TestClass()
    obj.test()

# Made with Bob
