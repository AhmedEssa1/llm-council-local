#!/usr/bin/env python3
"""
Quick start script for LLM Council MCP Server.

Run this script to start the MCP server that can be used with
OpenClaw, Claude Desktop, and other MCP-compatible tools.

Usage:
    python start_mcp_server.py
"""

import sys
import asyncio
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def main():
    """Start the MCP server."""
    print("=" * 60)
    print("LLM Council MCP Server")
    print("=" * 60)
    print()
    print("Starting MCP server...")
    print("Server name: llm-council")
    print("Available tools:")
    print("  - council_query: Query the LLM Council")
    print("  - council_list: List all council members")
    print("  - council_availability: Check model availability")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    print()

    try:
        # Import and run the MCP server
        from mcp_server.server import run_mcp_server
        asyncio.run(run_mcp_server())
    except KeyboardInterrupt:
        print("\n\nMCP Server stopped.")
    except Exception as e:
        print(f"\n\nError starting MCP server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
