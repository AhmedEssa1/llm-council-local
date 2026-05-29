"""MCP Server for OpenClaw integration."""

import json
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Create MCP server instance
server = Server("llm-council")


@server.list_tools()
async def list_tools():
    """List available MCP tools."""
    return [
        Tool(
            name="council_query",
            description="Query the LLM Council. Multiple AI models will respond and a chairman will synthesize the final answer.",
            inputSchema={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The question or prompt to send to the council"
                    },
                    "models": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of model IDs to query. If empty, uses all enabled models."
                    },
                    "chairman": {
                        "type": "string",
                        "description": "Optional model ID to use as chairman for synthesis"
                    }
                },
                "required": ["prompt"]
            }
        ),
        Tool(
            name="council_list",
            description="List all available council members (models) and their status.",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="council_availability",
            description="Check which council members are currently available.",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]


# Create a global council manager instance
_council_manager = None

def get_council_manager():
    """Get or create the council manager instance."""
    global _council_manager
    if _council_manager is None:
        from council_manager import CouncilManager
        _council_manager = CouncilManager()
    return _council_manager


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    """Handle MCP tool calls."""
    # Import here to avoid circular imports
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from council_manager import CouncilManager
    from models.schemas import QueryRequest

    # Get or create council manager
    council_manager = get_council_manager()

    if name == "council_query":
        request = QueryRequest(
            prompt=arguments["prompt"],
            models=arguments.get("models"),
            chairman=arguments.get("chairman"),
            return_individual=False  # Just return final result for MCP
        )
        result = await council_manager.query(request)
        
        output = result.chairman_response
        if result.rankings:
            output += "\n\n**Rankings:**\n"
            # Sort by rank
            sorted_ranks = sorted(result.rankings.items(), key=lambda x: x[1])
            for mid, rank in sorted_ranks:
                member = council_manager.members.get(mid)
                name = member.name if member else mid
                output += f"{rank}. {name}\n"
        
        return [TextContent(
            type="text",
            text=output
        )]

    elif name == "council_list":
        members = council_manager.get_members()
        lines = ["**LLM Council Members:**\n"]
        for m in members:
            status = "[ENABLED]" if m.enabled else "[DISABLED]"
            lines.append(f"- {status} **{m.name}** (`{m.id}`) - {m.type}")
        lines.append(f"\n**Chairman:** {council_manager.chairman_id}")
        return [TextContent(type="text", text="\n".join(lines))]

    elif name == "council_availability":
        availability = await council_manager.check_availability()
        lines = ["**Council Member Availability:**\n"]
        for mid, available in availability.items():
            member = council_manager.members.get(mid)
            name = member.name if member else mid
            status = "[Online]" if available else "[Offline]"
            lines.append(f"- {name}: {status}")
        return [TextContent(type="text", text="\n".join(lines))]

    else:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]


async def run_mcp_server():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_mcp_server())
