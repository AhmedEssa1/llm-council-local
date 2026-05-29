#!/usr/bin/env python3
"""
Example MCP Client for LLM Council.

This shows how to programmatically use the LLM Council MCP server
from your own applications.
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))


async def example_council_query():
    """Example: Query the council."""
    print("Example 1: Simple Query")
    print("-" * 40)

    try:
        from mcp_server.server import call_tool

        # Make a query
        result = await call_tool("council_query", {
            "prompt": "What is 2+2? Give a brief answer."
        })

        print("Response:")
        for content in result:
            if hasattr(content, 'text'):
                print(content.text[:200] + "..." if len(content.text) > 200 else content.text)

    except Exception as e:
        print(f"Error: {e}")


async def example_council_list():
    """Example: List council members."""
    print("\nExample 2: List Council Members")
    print("-" * 40)

    try:
        from mcp_server.server import call_tool

        # Get council members
        result = await call_tool("council_list", {})

        print("Council Members:")
        for content in result:
            if hasattr(content, 'text'):
                print(content.text)

    except Exception as e:
        print(f"Error: {e}")


async def example_council_availability():
    """Example: Check council availability."""
    print("\nExample 3: Check Availability")
    print("-" * 40)

    try:
        from mcp_server.server import call_tool

        # Check availability
        result = await call_tool("council_availability", {})

        print("Model Availability:")
        for content in result:
            if hasattr(content, 'text'):
                print(content.text)

    except Exception as e:
        print(f"Error: {e}")


async def main():
    """Run all examples."""
    print("=" * 60)
    print("LLM Council MCP Client Examples")
    print("=" * 60)
    print()

    # Run examples
    await example_council_list()
    await example_council_availability()
    await example_council_query()

    print("\n" + "=" * 60)
    print("Examples completed!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nExamples stopped.")
