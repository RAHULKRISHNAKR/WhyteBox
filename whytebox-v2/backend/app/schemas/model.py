"""
Pydantic schemas for model validation and serialization.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class ModelType(str, Enum):
    """Model architecture types."""

    CNN = "cnn"
    RNN = "rnn"
    LSTM = "lstm"
    GRU = "gru"
    TRANSFORMER = "transformer"
    GAN = "gan"
    AUTOENCODER = "autoencoder"
    OTHER = "other"


class Framework(str, Enum):
    """Supported ML frameworks."""

    PYTORCH = "pytorch"
    TENSORFLOW = "tensorflow"
    KERAS = "keras"
    ONNX = "onnx"


class ModelStatus(str, Enum):
    """Model processing status."""

    ACTIVE = "active"
    ARCHIVED = "archived"
    PROCESSING = "processing"
    ERROR = "error"


class LayerInfo(BaseModel):
    """Information about a single layer in the model."""

    id: str = Field(..., description="Unique layer identifier")
    name: str = Field(..., description="Layer name/type")
    type: str = Field(..., description="Layer type (e.g., conv2d, dense)")
    input_shape: List[int] = Field(..., description="Input shape")
    output_shape: List[int] = Field(..., description="Output shape")
    params: int = Field(0, description="Number of parameters")
    config: Optional[Dict[str, Any]] = Field(None, description="Layer configuration")


class ModelArchitecture(BaseModel):
    """Model architecture information."""

    layers: List[LayerInfo] = Field(..., description="List of layers")
    total_params: int = Field(..., description="Total number of parameters")
    trainable_params: int = Field(..., description="Trainable parameters")
    non_trainable_params: int = Field(0, description="Non-trainable parameters")


class ModelMetadata(BaseModel):
    """Additional model metadata."""

    author: Optional[str] = Field(None, description="Model author")
    paper: Optional[str] = Field(None, description="Research paper URL")
    license: Optional[str] = Field(None, description="License type")
    tags: List[str] = Field(default_factory=list, description="Model tags")
    preprocessing: Optional[Dict[str, Any]] = Field(None, description="Preprocessing configuration")
    classes: Optional[List[str]] = Field(None, description="Output class names")
    custom: Optional[Dict[str, Any]] = Field(None, description="Custom metadata")


class ModelBase(BaseModel):
    """Base model schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255, description="Model name")
    description: Optional[str] = Field(None, description="Model description")
    type: ModelType = Field(..., description="Model architecture type")
    framework: Framework = Field(..., description="ML framework")
    version: str = Field("1.0.0", description="Model version")


class ModelCreate(ModelBase):
    """Schema for creating a new model."""

    # File information (provided during upload)
    file_path: str = Field(..., description="Path to model file")
    file_size: int = Field(..., gt=0, description="File size in bytes")
    file_hash: str = Field(..., min_length=64, max_length=64, description="SHA-256 hash")

    # Optional fields that can be provided or extracted
    architecture: Optional[ModelArchitecture] = None
    input_shape: Optional[List[int]] = None
    output_shape: Optional[List[int]] = None
    input_dtype: str = Field("float32", description="Input data type")
    output_dtype: str = Field("float32", description="Output data type")

    # Statistics
    total_params: Optional[int] = Field(None, ge=0)
    trainable_params: Optional[int] = Field(None, ge=0)
    non_trainable_params: Optional[int] = Field(None, ge=0)
    num_layers: Optional[int] = Field(None, ge=0)

    # Performance metrics
    accuracy: Optional[float] = Field(None, ge=0.0, le=1.0)
    top5_accuracy: Optional[float] = Field(None, ge=0.0, le=1.0)
    loss: Optional[float] = Field(None, ge=0.0)

    # Training information
    dataset: Optional[str] = None
    training_time: Optional[int] = Field(None, ge=0, description="Training time in hours")
    epochs: Optional[int] = Field(None, ge=1)
    batch_size: Optional[int] = Field(None, ge=1)

    # Metadata
    metadata: Optional[ModelMetadata] = None

    # Visibility
    is_public: bool = Field(False, description="Whether model is publicly accessible")
    is_pretrained: bool = Field(False, description="Whether model is pretrained")

    @field_validator("file_size")
    @classmethod
    def validate_file_size(cls, v: int) -> int:
        """Validate file size is within limits."""
        max_size = 500 * 1024 * 1024  # 500 MB
        if v > max_size:
            raise ValueError(f"File size exceeds maximum limit of {max_size} bytes")
        return v


class ModelUpdate(BaseModel):
    """Schema for updating an existing model."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    version: Optional[str] = None
    status: Optional[ModelStatus] = None
    is_public: Optional[bool] = None
    metadata: Optional[ModelMetadata] = None

    # Performance metrics can be updated
    accuracy: Optional[float] = Field(None, ge=0.0, le=1.0)
    top5_accuracy: Optional[float] = Field(None, ge=0.0, le=1.0)
    loss: Optional[float] = Field(None, ge=0.0)


class ModelResponse(ModelBase):
    """Schema for model response."""

    id: str = Field(..., description="Unique model identifier")
    file_size: int = Field(..., description="File size in bytes")
    file_hash: str = Field(..., description="SHA-256 hash")

    # Architecture
    architecture: Optional[ModelArchitecture] = None
    input_shape: Optional[List[int]] = None
    output_shape: Optional[List[int]] = None
    input_dtype: str
    output_dtype: str

    # Statistics
    total_params: Optional[int] = None
    trainable_params: Optional[int] = None
    non_trainable_params: Optional[int] = None
    num_layers: Optional[int] = None

    # Performance
    accuracy: Optional[float] = None
    top5_accuracy: Optional[float] = None
    loss: Optional[float] = None

    # Training info
    dataset: Optional[str] = None
    training_time: Optional[int] = None
    epochs: Optional[int] = None
    batch_size: Optional[int] = None

    # Metadata
    metadata: Optional[ModelMetadata] = None

    # Status
    status: ModelStatus
    is_public: bool
    is_pretrained: bool

    # Usage statistics
    download_count: int = 0
    inference_count: int = 0
    last_used_at: Optional[datetime] = None

    # Ownership
    user_id: str

    # Timestamps
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class ModelListResponse(BaseModel):
    """Schema for paginated model list response."""

    items: List[ModelResponse] = Field(..., description="List of models")
    total: int = Field(..., description="Total number of models")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


class ModelUploadResponse(BaseModel):
    """Schema for model upload response."""

    status: str = Field(..., description="Upload status")
    message: str = Field(..., description="Status message")
    model: ModelResponse = Field(..., description="Uploaded model information")


class ModelLoadRequest(BaseModel):
    """Schema for model load request."""

    model_id: str = Field(..., description="Model identifier")
    device: str = Field("cpu", description="Device to load model on (cpu, cuda)")

    @field_validator("device")
    @classmethod
    def validate_device(cls, v: str) -> str:
        """Validate device selection."""
        allowed_devices = ["cpu", "cuda", "cuda:0", "cuda:1", "mps"]
        if v not in allowed_devices and not v.startswith("cuda:"):
            raise ValueError(f"Device must be one of {allowed_devices}")
        return v


class ModelLoadResponse(BaseModel):
    """Schema for model load response."""

    status: str = Field(..., description="Load status")
    message: str = Field(..., description="Status message")
    model_id: str = Field(..., description="Model identifier")
    device: str = Field(..., description="Device model is loaded on")
    memory_usage: Optional[str] = Field(None, description="Memory usage")


class ModelDeleteResponse(BaseModel):
    """Schema for model deletion response."""

    status: str = Field(..., description="Deletion status")
    message: str = Field(..., description="Status message")
    model_id: str = Field(..., description="Deleted model identifier")


class ModelSearchQuery(BaseModel):
    """Schema for model search query."""

    query: Optional[str] = Field(None, description="Search query string")
    type: Optional[ModelType] = Field(None, description="Filter by model type")
    framework: Optional[Framework] = Field(None, description="Filter by framework")
    status: Optional[ModelStatus] = Field(None, description="Filter by status")
    is_public: Optional[bool] = Field(None, description="Filter by visibility")
    is_pretrained: Optional[bool] = Field(None, description="Filter by pretrained status")
    min_accuracy: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_params: Optional[int] = Field(None, ge=0)
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(10, ge=1, le=100, description="Items per page")
    sort_by: str = Field("created_at", description="Sort field")
    sort_order: str = Field("desc", description="Sort order (asc, desc)")

    @field_validator("sort_by")
    @classmethod
    def validate_sort_by(cls, v: str) -> str:
        """Validate sort field."""
        allowed_fields = [
            "created_at",
            "updated_at",
            "name",
            "accuracy",
            "total_params",
            "inference_count",
            "download_count",
        ]
        if v not in allowed_fields:
            raise ValueError(f"sort_by must be one of {allowed_fields}")
        return v

    @field_validator("sort_order")
    @classmethod
    def validate_sort_order(cls, v: str) -> str:
        """Validate sort order."""
        if v not in ["asc", "desc"]:
            raise ValueError("sort_order must be 'asc' or 'desc'")
        return v


# Made with Bob
