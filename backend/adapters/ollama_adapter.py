"""Ollama adapter for local and remote Ollama models."""

import httpx
from typing import Optional, TYPE_CHECKING
from .base import BaseAdapter

if TYPE_CHECKING:
    from models.schemas import ImageData


class OllamaAdapter(BaseAdapter):
    """Adapter for Ollama models (local or remote)."""

    def __init__(self, model_id: str, model_name: str, model: str, host: str = "localhost", timeout: int = 120):
        super().__init__(model_id, model_name)
        self.model = model
        self.host = host
        self.timeout = timeout
        self.base_url = f"http://{host}:11434"

    async def generate(self, prompt: str, images: Optional[list["ImageData"]] = None) -> str:
        """Call Ollama API and return response with optional image support."""
        try:
            # Build request payload
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False
            }

            # Add images if provided and model supports vision
            if images and self._supports_vision_model():
                # Ollama expects images as base64 data
                payload["images"] = [img.data for img in images]

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                return data.get("response", "")

        except httpx.ConnectError:
            raise RuntimeError(
                f"Cannot connect to Ollama at {self.base_url}. "
                f"Please ensure Ollama is running: 'ollama list'. "
                f"Or disable this model in config/council.yaml"
            )
        except httpx.TimeoutException:
            raise RuntimeError(
                f"Ollama request timed out after {self.timeout} seconds. "
                f"Try increasing the timeout in config/council.yaml for model '{self.model_name}'."
            )
        except Exception as e:
            raise RuntimeError(f"Ollama error for model '{self.model}': {str(e)}")

    def _supports_vision_model(self) -> bool:
        """Check if this Ollama model supports vision."""
        vision_models = {"llava", "bakllava", "cllm", "minicpm", "moondream", "nomic"}
        return any(model in self.model.lower() for model in vision_models)

    @property
    def supports_images(self) -> bool:
        """Ollama models support vision if they're vision-capable models."""
        return self._supports_vision_model()
    
    async def is_available(self) -> bool:
        """Check if Ollama server is reachable and model exists."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Check if Ollama is running
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code != 200:
                    return False
                
                # Check if model is available
                data = response.json()
                models = [m["name"] for m in data.get("models", [])]
                return self.model in models or any(self.model in m for m in models)
                
        except Exception:
            return False
