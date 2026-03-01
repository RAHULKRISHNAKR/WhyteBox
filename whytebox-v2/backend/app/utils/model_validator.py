"""
Model validation utilities.
"""

import logging
import mimetypes
from pathlib import Path
from typing import List, Optional, Tuple

from app.schemas.model import Framework

logger = logging.getLogger(__name__)


class ModelValidator:
    """Utility class for validating model files."""

    # Maximum file size (500 MB)
    MAX_FILE_SIZE = 500 * 1024 * 1024

    # Allowed file extensions by framework
    ALLOWED_EXTENSIONS = {
        Framework.PYTORCH: [".pt", ".pth"],
        Framework.TENSORFLOW: [".pb", ".h5"],
        Framework.KERAS: [".h5", ".keras"],
        Framework.ONNX: [".onnx"],
    }

    # Magic bytes for file type detection
    MAGIC_BYTES = {
        "pytorch": [b"PK\x03\x04"],  # PyTorch uses ZIP format
        "tensorflow": [b"\x08"],  # TensorFlow protobuf
        "onnx": [b"\x08"],  # ONNX protobuf
    }

    @staticmethod
    def validate_file_extension(file_path: str, framework: Framework) -> bool:
        """
        Validate file extension matches framework.

        Args:
            file_path: Path to the file
            framework: Expected framework

        Returns:
            True if valid, False otherwise
        """
        path = Path(file_path)
        extension = path.suffix.lower()

        allowed = ModelValidator.ALLOWED_EXTENSIONS.get(framework, [])
        return extension in allowed

    @staticmethod
    def validate_file_size(file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate file size is within limits.

        Args:
            file_path: Path to the file

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            file_size = Path(file_path).stat().st_size

            if file_size == 0:
                return False, "File is empty"

            if file_size > ModelValidator.MAX_FILE_SIZE:
                max_mb = ModelValidator.MAX_FILE_SIZE / (1024 * 1024)
                actual_mb = file_size / (1024 * 1024)
                return False, f"File size ({actual_mb:.2f} MB) exceeds maximum ({max_mb:.2f} MB)"

            return True, None

        except Exception as e:
            return False, f"Error checking file size: {str(e)}"

    @staticmethod
    def validate_file_exists(file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate file exists and is readable.

        Args:
            file_path: Path to the file

        Returns:
            Tuple of (is_valid, error_message)
        """
        path = Path(file_path)

        if not path.exists():
            return False, "File does not exist"

        if not path.is_file():
            return False, "Path is not a file"

        if not path.stat().st_size > 0:
            return False, "File is empty"

        try:
            # Try to open file to check readability
            with open(file_path, "rb") as f:
                f.read(1)
            return True, None
        except Exception as e:
            return False, f"File is not readable: {str(e)}"

    @staticmethod
    def detect_file_type(file_path: str) -> Optional[str]:
        """
        Detect file type from magic bytes.

        Args:
            file_path: Path to the file

        Returns:
            Detected file type or None
        """
        try:
            with open(file_path, "rb") as f:
                header = f.read(16)

            # Check PyTorch (ZIP format)
            if header.startswith(b"PK\x03\x04"):
                return "pytorch"

            # Check for protobuf (TensorFlow/ONNX)
            if header[0:1] == b"\x08":
                # Need more sophisticated detection
                # For now, check file extension
                ext = Path(file_path).suffix.lower()
                if ext == ".onnx":
                    return "onnx"
                elif ext in [".pb", ".h5"]:
                    return "tensorflow"

            return None

        except Exception as e:
            logger.error(f"Error detecting file type: {e}")
            return None

    @staticmethod
    def validate_pytorch_model(file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate PyTorch model file.

        Args:
            file_path: Path to the model file

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            import torch
        except ImportError:
            return False, "PyTorch is not installed"

        try:
            # Try to load model metadata without loading full model
            with open(file_path, "rb") as f:
                # PyTorch models are ZIP files
                import zipfile

                if not zipfile.is_zipfile(file_path):
                    return False, "Not a valid PyTorch model file (not a ZIP archive)"

            # Try to load model
            try:
                torch.load(file_path, map_location="cpu")
                return True, None
            except Exception as e:
                return False, f"Failed to load PyTorch model: {str(e)}"

        except Exception as e:
            return False, f"Error validating PyTorch model: {str(e)}"

    @staticmethod
    def validate_tensorflow_model(file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate TensorFlow model file.

        Args:
            file_path: Path to the model file

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            import tensorflow as tf
        except ImportError:
            return False, "TensorFlow is not installed"

        try:
            # Try to load model
            tf.keras.models.load_model(file_path)
            return True, None
        except Exception as e:
            return False, f"Failed to load TensorFlow model: {str(e)}"

    @staticmethod
    def validate_onnx_model(file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate ONNX model file.

        Args:
            file_path: Path to the model file

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            import onnx
        except ImportError:
            return False, "ONNX is not installed"

        try:
            # Load and check model
            model = onnx.load(file_path)
            onnx.checker.check_model(model)
            return True, None
        except Exception as e:
            return False, f"Failed to validate ONNX model: {str(e)}"

    @staticmethod
    def validate_model_file(file_path: str, framework: Framework) -> Tuple[bool, List[str]]:
        """
        Comprehensive model file validation.

        Args:
            file_path: Path to the model file
            framework: Expected framework

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        # Check file exists
        is_valid, error = ModelValidator.validate_file_exists(file_path)
        if not is_valid:
            errors.append(error)
            return False, errors

        # Check file size
        is_valid, error = ModelValidator.validate_file_size(file_path)
        if not is_valid:
            errors.append(error)

        # Check file extension
        if not ModelValidator.validate_file_extension(file_path, framework):
            allowed = ModelValidator.ALLOWED_EXTENSIONS.get(framework, [])
            errors.append(
                f"Invalid file extension for {framework.value}. "
                f"Allowed extensions: {', '.join(allowed)}"
            )

        # Framework-specific validation
        if framework == Framework.PYTORCH:
            is_valid, error = ModelValidator.validate_pytorch_model(file_path)
            if not is_valid:
                errors.append(error)
        elif framework in [Framework.TENSORFLOW, Framework.KERAS]:
            is_valid, error = ModelValidator.validate_tensorflow_model(file_path)
            if not is_valid:
                errors.append(error)
        elif framework == Framework.ONNX:
            is_valid, error = ModelValidator.validate_onnx_model(file_path)
            if not is_valid:
                errors.append(error)

        return len(errors) == 0, errors

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename to prevent path traversal attacks.

        Args:
            filename: Original filename

        Returns:
            Sanitized filename
        """
        # Remove path components
        filename = Path(filename).name

        # Remove potentially dangerous characters
        dangerous_chars = ["<", ">", ":", '"', "/", "\\", "|", "?", "*"]
        for char in dangerous_chars:
            filename = filename.replace(char, "_")

        # Limit length
        if len(filename) > 255:
            name, ext = Path(filename).stem, Path(filename).suffix
            filename = name[: 255 - len(ext)] + ext

        return filename

    @staticmethod
    def is_safe_path(base_dir: str, file_path: str) -> bool:
        """
        Check if file path is within base directory (prevent path traversal).

        Args:
            base_dir: Base directory
            file_path: File path to check

        Returns:
            True if safe, False otherwise
        """
        try:
            base = Path(base_dir).resolve()
            target = Path(file_path).resolve()

            # Check if target is within base directory
            return str(target).startswith(str(base))
        except Exception:
            return False

    @staticmethod
    def validate_model_name(name: str) -> Tuple[bool, Optional[str]]:
        """
        Validate model name.

        Args:
            name: Model name

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not name or len(name.strip()) == 0:
            return False, "Model name cannot be empty"

        if len(name) > 255:
            return False, "Model name too long (max 255 characters)"

        # Check for invalid characters
        invalid_chars = ["<", ">", ":", '"', "/", "\\", "|", "?", "*"]
        for char in invalid_chars:
            if char in name:
                return False, f"Model name contains invalid character: {char}"

        return True, None

    @staticmethod
    def get_mime_type(file_path: str) -> Optional[str]:
        """
        Get MIME type of file.

        Args:
            file_path: Path to the file

        Returns:
            MIME type or None
        """
        mime_type, _ = mimetypes.guess_type(file_path)
        return mime_type


# Made with Bob
