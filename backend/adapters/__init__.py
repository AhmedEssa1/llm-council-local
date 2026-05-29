"""Model adapters package."""

from .base import BaseAdapter
from .cli_adapter import CLIAdapter
from .ollama_adapter import OllamaAdapter
from .api_adapter import APIAdapter

__all__ = ["BaseAdapter", "CLIAdapter", "OllamaAdapter", "APIAdapter"]
