"""Tests for Council Manager."""

import pytest
import asyncio
from pathlib import Path
import tempfile
import yaml

from council_manager import CouncilManager
from models.schemas import CouncilMember, ModelType, QueryRequest


class TestCouncilManager:
    """Test Council Manager functionality."""

    @pytest.fixture
    def temp_config(self):
        """Create a temporary config file."""
        config = {
            "council_members": [
                {
                    "id": "test-echo",
                    "name": "Test Echo",
                    "type": "cli",
                    "command": "echo",
                    "args": ["-n"],
                    "enabled": True
                }
            ],
            "chairman": "test-echo"
        }

        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(config, f)
            temp_path = f.name

        yield temp_path

        # Cleanup
        Path(temp_path).unlink(missing_ok=True)

    def test_council_manager_initialization(self, temp_config):
        """Should initialize with config from file."""
        manager = CouncilManager(temp_config)
        assert len(manager.members) == 1
        assert "test-echo" in manager.members
        assert manager.chairman_id == "test-echo"

    def test_council_manager_get_members(self, temp_config):
        """Should return all members."""
        manager = CouncilManager(temp_config)
        members = manager.get_members()
        assert len(members) == 1
        assert members[0].id == "test-echo"

    @pytest.mark.asyncio
    async def test_council_manager_query_with_working_model(self, temp_config):
        """Should successfully query working model."""
        manager = CouncilManager(temp_config)
        request = QueryRequest(prompt="test", models=["test-echo"])
        result = await manager.query(request)

        assert result.prompt == "test"
        # The actual response may include "-n" on Windows, so just check it's not empty
        assert len(result.chairman_response) > 0
        assert len(result.individual_responses) == 1
        assert len(result.individual_responses[0].content) > 0

    @pytest.mark.asyncio
    async def test_council_manager_query_with_broken_model(self, temp_config):
        """Should handle broken models gracefully."""
        # Add a broken model
        manager = CouncilManager(temp_config)
        broken_member = CouncilMember(
            id="broken",
            name="Broken Model",
            type=ModelType.CLI,
            command="nonexistent-command-xyz",
            enabled=True
        )
        manager.add_member(broken_member)

        request = QueryRequest(prompt="test", models=["test-echo", "broken"])
        result = await manager.query(request)

        # Should have partial results
        assert len([r for r in result.individual_responses if not r.error]) == 1
        assert len([r for r in result.individual_responses if r.error]) == 1

    @pytest.mark.asyncio
    async def test_council_manager_check_availability(self, temp_config):
        """Should check availability of all models."""
        manager = CouncilManager(temp_config)

        # Add a broken model
        broken_member = CouncilMember(
            id="broken",
            name="Broken Model",
            type=ModelType.CLI,
            command="nonexistent-command-xyz",
            enabled=True
        )
        manager.add_member(broken_member)

        availability = await manager.check_availability()
        assert availability["test-echo"] is True
        assert availability["broken"] is False

    def test_council_manager_add_member(self, temp_config):
        """Should add new member."""
        manager = CouncilManager(temp_config)
        new_member = CouncilMember(
            id="new-member",
            name="New Member",
            type=ModelType.CLI,
            command="echo",
            enabled=True
        )

        manager.add_member(new_member)
        assert "new-member" in manager.members
        assert len(manager.members) == 2

    def test_council_manager_remove_member(self, temp_config):
        """Should remove member."""
        manager = CouncilManager(temp_config)
        manager.remove_member("test-echo")
        assert "test-echo" not in manager.members
        assert len(manager.members) == 0

    def test_council_manager_set_chairman(self, temp_config):
        """Should set chairman."""
        manager = CouncilManager(temp_config)

        # Add another member
        new_member = CouncilMember(
            id="new-member",
            name="New Member",
            type=ModelType.CLI,
            command="echo",
            enabled=True
        )
        manager.add_member(new_member)

        manager.set_chairman("new-member")
        assert manager.chairman_id == "new-member"

    def test_council_manager_parse_rankings(self, temp_config):
        """Should correctly parse rankings from chairman output."""
        manager = CouncilManager(temp_config)
        
        from models.schemas import ModelResponse
        
        responses = [
            ModelResponse(model_id="gpt4", model_name="GPT-4", content="res1"),
            ModelResponse(model_id="claude", model_name="Claude 3", content="res2")
        ]
        
        chairman_output = """
Here is the synthesis of the responses.
[RANKINGS]
1. GPT-4: Very accurate and detailed.
2. Claude 3: Good but missed some points.
"""
        rankings = manager._parse_rankings(chairman_output, responses)
        
        assert rankings is not None
        assert rankings["gpt4"] == 1
        assert rankings["claude"] == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
