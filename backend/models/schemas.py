"""Pydantic models for LLM Council API."""

from typing import Optional
from pydantic import BaseModel
from enum import Enum


class ModelType(str, Enum):
    CLI = "cli"
    OLLAMA = "ollama"
    API = "api"


class ImageData(BaseModel):
    """Image data for multimodal queries."""
    data: str  # Base64 encoded image data
    format: str  # "jpeg", "png", "webp", etc.
    size: int  # File size in bytes


class CouncilMember(BaseModel):
    id: str
    name: str
    type: ModelType
    enabled: bool = True

    # CLI settings
    command: Optional[str] = None
    args: list[str] = []

    # Ollama settings
    host: Optional[str] = None
    model: Optional[str] = None

    # API settings
    provider: Optional[str] = None  # openai, anthropic

    # Timeout settings (in seconds)
    timeout: Optional[int] = None  # None = use default (120s for Ollama, 60s for API, 30s for CLI)


class QueryRequest(BaseModel):
    prompt: str
    images: Optional[list[ImageData]] = None  # Images for analysis
    models: Optional[list[str]] = None  # None = all enabled models
    chairman: Optional[str] = None  # Override chairman
    return_individual: bool = True  # Include individual responses


class ModelResponse(BaseModel):
    model_id: str
    model_name: str
    content: str
    error: Optional[str] = None
    duration_ms: Optional[int] = None


class CouncilResult(BaseModel):
    prompt: str
    chairman_response: str
    chairman_model: str
    individual_responses: list[ModelResponse]
    rankings: Optional[dict[str, int]] = None


class CouncilConfig(BaseModel):
    council_members: list[CouncilMember]
    chairman: str  # model ID or "automatic"


# Admin API models
class AddMemberRequest(BaseModel):
    member: CouncilMember


class UpdateMemberRequest(BaseModel):
    member: CouncilMember


class SetChairmanRequest(BaseModel):
    chairman: str  # model ID or "automatic"
