"""Base adapter interface for all model providers."""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from models.schemas import ImageData


class BaseAdapter(ABC):
    """Abstract base class for model adapters."""
    
    def __init__(self, model_id: str, model_name: str):
        self.model_id = model_id
        self.model_name = model_name
    
    @abstractmethod
    async def generate(self, prompt: str, images: Optional[list["ImageData"]] = None) -> str:
        """Generate response from the model with optional image analysis."""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the model is available."""
        pass
    
    @property
    def supports_images(self) -> bool:
        """Whether this model supports image input."""
        return False
