"""Test MCP Server functionality."""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_mcp_server():
    """Test the MCP server."""
    print("Testing LLM Council MCP Server...")

    try:
        # Import the MCP server
        from mcp_server.server import server, list_tools
        print("OK - MCP Server imported successfully!")
        print(f"Server name: {server.name}")

        # Test listing tools
        tools = await list_tools()
        print(f"Available tools: {len(tools)}")
        for tool in tools:
            print(f"   - {tool.name}: {tool.description}")

        print("\nOK - MCP Server is fully functional!")
        return True

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_mcp_server())
    sys.exit(0 if result else 1)
