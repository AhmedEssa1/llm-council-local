"""API adapter for cloud providers (OpenAI, Anthropic)."""

import os
from typing import Optional, TYPE_CHECKING
from .base import BaseAdapter

if TYPE_CHECKING:
    from models.schemas import ImageData

# Lazy imports to avoid errors if not using API models
_openai_client = None
_anthropic_client = None


class APIAdapter(BaseAdapter):
    """Adapter for API-based models (OpenAI, Anthropic)."""
    
    def __init__(self, model_id: str, model_name: str, provider: str, model: str):
        super().__init__(model_id, model_name)
        self.provider = provider.lower()
        self.model = model
    
    async def generate(self, prompt: str, images: Optional[list["ImageData"]] = None) -> str:
        """Call appropriate API and return response."""
        if self.provider == "openai":
            return await self._call_openai(prompt, images)
        elif self.provider == "anthropic":
            return await self._call_anthropic(prompt, images)
        else:
            raise RuntimeError(f"Unknown provider: {self.provider}")

    @property
    def supports_images(self) -> bool:
        """API models support vision if they're vision-capable models."""
        # GPT-4 models with "vision" in name support images
        # Claude 3 models support images
        vision_models = {"gpt-4-vision", "gpt-4o", "claude-3"}
        return any(model in self.model.lower() for model in vision_models)
    
    async def _call_openai(self, prompt: str, images: Optional[list["ImageData"]] = None) -> str:
        """Call OpenAI API with optional image support."""
        global _openai_client

        try:
            if _openai_client is None:
                from openai import AsyncOpenAI
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise RuntimeError("OPENAI_API_KEY not set")
                _openai_client = AsyncOpenAI(api_key=api_key)

            # Build message content
            content = [{"type": "text", "text": prompt}]

            # Add images if provided
            if images:
                for img in images:
                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/{img.format};base64,{img.data}"
                        }
                    })

            response = await _openai_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": content}],
                max_tokens=4096
            )
            return response.choices[0].message.content or ""

        except Exception as e:
            if "OPENAI_API_KEY" in str(e) or "401" in str(e):
                raise RuntimeError(
                    f"OpenAI API key is missing or invalid. "
                    f"Please set OPENAI_API_KEY in your .env file. "
                    f"Or disable this model in config/council.yaml"
                )
            raise RuntimeError(f"OpenAI error for model '{self.model}': {str(e)}")
    
    async def _call_anthropic(self, prompt: str, images: Optional[list["ImageData"]] = None) -> str:
        """Call Anthropic API with optional image support."""
        global _anthropic_client

        try:
            if _anthropic_client is None:
                from anthropic import AsyncAnthropic
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    raise RuntimeError("ANTHROPIC_API_KEY not set")
                _anthropic_client = AsyncAnthropic(api_key=api_key)

            # Build message content
            content = [{"type": "text", "text": prompt}]

            # Add images if provided
            if images:
                for img in images:
                    content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": f"image/{img.format}",
                            "data": img.data
                        }
                    })

            response = await _anthropic_client.messages.create(
                model=self.model,
                max_tokens=4096,
                messages=[{"role": "user", "content": content}]
            )
            return response.content[0].text

        except Exception as e:
            if "ANTHROPIC_API_KEY" in str(e) or "401" in str(e):
                raise RuntimeError(
                    f"Anthropic API key is missing or invalid. "
                    f"Please set ANTHROPIC_API_KEY in your .env file. "
                    f"Or disable this model in config/council.yaml"
                )
            raise RuntimeError(f"Anthropic error for model '{self.model}': {str(e)}")
    
    async def is_available(self) -> bool:
        """Check if API key is configured."""
        if self.provider == "openai":
            return bool(os.getenv("OPENAI_API_KEY"))
        elif self.provider == "anthropic":
            return bool(os.getenv("ANTHROPIC_API_KEY"))
        return False
