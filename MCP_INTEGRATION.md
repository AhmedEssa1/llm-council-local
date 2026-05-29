# MCP Integration Guide

The LLM Council app includes a fully functional **Model Context Protocol (MCP)** server that allows you to integrate it with **OpenClaw**, **Claude Desktop**, and other MCP-compatible tools.

## What is MCP?

MCP (Model Context Protocol) is a standardized protocol that allows AI assistants to interact with external tools and data sources. With MCP, you can use your LLM Council directly from Claude Desktop, OpenClaw, or other MCP clients.

## Available MCP Tools

The LLM Council MCP server exposes **3 tools**:

### 1. `council_query`
Query the LLM Council and get a synthesized answer from multiple AI models.

**Parameters:**
- `prompt` (required): The question or prompt to send to the council
- `models` (optional): Array of model IDs to query. If empty, uses all enabled models
- `chairman` (optional): Model ID to use as chairman for synthesis

**Example:**
```python
{
  "prompt": "What are the pros and cons of microservices architecture?",
  "models": ["ollama-gemma4", "lan-gemma31b"],
  "chairman": "cli-claude"
}
```

### 2. `council_list`
List all available council members (models) and their status.

**Parameters:** None

**Returns:** Formatted list of all models with their status

### 3. `council_availability`
Check which council members are currently available and online.

**Parameters:** None

**Returns:** Availability status for each model

## Running the MCP Server

### Method 1: Standalone (Recommended)

```bash
cd backend
python mcp_server/server.py
```

### Method 2: From Python

```python
from backend.mcp_server import server, run_mcp_server
import asyncio

asyncio.run(run_mcp_server())
```

## Integration Examples

### With OpenClaw

Add to your OpenClaw configuration:

```yaml
mcpServers:
  llm-council:
    command: python
    args:
      - "C:/DATA/llm-council-local/backend/mcp_server/server.py"
    env: {
      "PYTHONPATH": "C:/DATA/llm-council-local/backend"
    }
```

### With Claude Desktop

Add to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "llm-council": {
      "command": "python",
      "args": [
        "C:\\DATA\\llm-council-local\\backend\\mcp_server\\server.py"
      ],
      "env": {
        "PYTHONPATH": "C:\\DATA\\llm-council-local\\backend"
      }
    }
  }
}
```

### With MCP Inspector (Testing)

```bash
npx @modelcontextprotocol/inspector python mcp_server/server.py
```

## Testing the MCP Server

Run the test script to verify everything works:

```bash
cd backend
python test_mcp.py
```

Expected output:
```
Testing LLM Council MCP Server...
OK - MCP Server imported successfully!
Server name: llm-council
Available tools: 3
   - council_query: Query the LLM Council. Multiple AI models will respond and a chairman will synthesize the final answer.
   - council_list: List all available council members (models) and their status.
   - council_availability: Check which council members are currently available.

OK - MCP Server is fully functional!
```

## Usage Examples

### Example 1: Simple Query

```python
# From an MCP client
result = await call_tool("council_query", {
  "prompt": "Explain quantum computing in simple terms"
})
```

### Example 2: Select Specific Models

```python
result = await call_tool("council_query", {
  "prompt": "Compare Python and JavaScript",
  "models": ["ollama-gemma4", "api-gpt4"]
})
```

### Example 3: Check Council Status

```python
# List all members
members = await call_tool("council_list", {})

# Check availability
status = await call_tool("council_availability", {})
```

## Configuration

The MCP server uses the same configuration as the main backend:

- **Config File:** `config/council.yaml`
- **API Keys:** `.env` file (for API-based models)
- **Models:** All models from your council configuration are available

## Benefits of MCP Integration

1. **Unified Interface:** Access multiple AI models through a single protocol
2. **Synthesized Responses:** Get answers that combine insights from multiple models
3. **Flexible Model Selection:** Choose which models to query for each request
4. **Status Monitoring:** Check model availability in real-time
5. **Easy Integration:** Works with any MCP-compatible client

## Troubleshooting

### Issue: MCP server won't start
**Solution:** Make sure all dependencies are installed:
```bash
cd backend
pip install -r requirements.txt
```

### Issue: Models not available
**Solution:** Check that your `config/council.yaml` is properly configured and models are enabled.

### Issue: Circular import errors
**Solution:** The MCP server directory was renamed to `mcp_server` to avoid conflicts with the `mcp` package.

### Issue: Connection refused
**Solution:** Make sure the MCP server is running and accessible from your MCP client.

## Advanced Usage

### Custom Chairman Selection

```python
result = await call_tool("council_query", {
  "prompt": "Analyze market trends",
  "chairman": "cli-gemini"  # Use Gemini as synthesizer
})
```

### Filtering by Model Type

```python
# First get the list
members = await call_tool("council_list", {})

# Then filter and query specific types
ollama_models = [m for m in members if m.type == "ollama"]
result = await call_tool("council_query", {
  "prompt": "Your question",
  "models": [m.id for m in ollama_models]
})
```

## Security Considerations

1. **API Keys:** Never commit `.env` file with API keys
2. **Network Access:** MCP server runs locally, but can be exposed if needed
3. **Model Access:** Ensure only authorized models are enabled in `council.yaml`
4. **Input Validation:** The MCP server validates all inputs before processing

## Performance Tips

1. **Use Specific Models:** Specify only the models you need for faster responses
2. **Cache Results:** Consider caching frequent queries
3. **Monitor Availability:** Use `council_availability` to check models before querying
4. **Parallel Queries:** The MCP server queries all models in parallel automatically

## Next Steps

1. **Test the MCP server:** Run `python backend/test_mcp.py`
2. **Integrate with your client:** Follow the integration examples above
3. **Customize models:** Edit `config/council.yaml` to add/remove models
4. **Experiment:** Try different model combinations and chairmen

## Support

For issues or questions:
1. Check the main README.md
2. Review `config/council.yaml` for model configuration
3. Run test scripts to diagnose issues
4. Check MCP client documentation for integration details

---

**Ready to use your LLM Council with OpenClaw and other MCP tools!**
