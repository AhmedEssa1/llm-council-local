"""Tests for CLI adapter."""

import pytest
import asyncio
from adapters.cli_adapter import CLIAdapter


class TestCLIAdapter:
    """Test CLI adapter functionality."""

    def test_cli_adapter_initialization(self):
        """Should create adapter with correct properties."""
        adapter = CLIAdapter("test-id", "Test CLI", "echo", ["-n"])
        assert adapter.model_id == "test-id"
        assert adapter.model_name == "Test CLI"
        assert adapter.command == "echo"
        assert adapter.args == ["-n"]

    @pytest.mark.asyncio
    async def test_cli_adapter_working_command(self):
        """Should successfully execute a working command."""
        adapter = CLIAdapter("test-id", "Test CLI", "python", ["-c", "print('test')"])
        result = await adapter.generate("ignored")
        assert result.strip() == "test"

    @pytest.mark.asyncio
    async def test_cli_adapter_nonexistent_command(self):
        """Should raise error for nonexistent command."""
        adapter = CLIAdapter("test-id", "Test CLI", "nonexistent-command-test", [])
        with pytest.raises(RuntimeError, match="CLI adapter error"):
            await adapter.generate("test")

    @pytest.mark.asyncio
    async def test_cli_adapter_timeout(self):
        """Should timeout after 60 seconds."""
        # This test uses sleep to simulate a hanging command
        adapter = CLIAdapter("test-id", "Test CLI", "python", ["-c", "import time; time.sleep(70)"])
        with pytest.raises(RuntimeError, match="timed out"):
            await adapter.generate("test")

    @pytest.mark.asyncio
    async def test_cli_adapter_is_available_working(self):
        """Should return True for available commands."""
        adapter = CLIAdapter("test-id", "Test CLI", "echo", [])
        assert await adapter.is_available() is True

    @pytest.mark.asyncio
    async def test_cli_adapter_is_available_missing(self):
        """Should return False for missing commands."""
        adapter = CLIAdapter("test-id", "Test CLI", "nonexistent-command-testxyz", [])
        assert await adapter.is_available() is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
