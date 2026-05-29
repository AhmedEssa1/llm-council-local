# LLM Council MCP - Quick Reference Card

## 🚀 Quick Start

```bash
# Start the MCP server
python start_mcp_server.py

# Test it works
python backend/test_mcp.py

# Run examples
python test_mcp_integration.py
```

## 🔌 Integration Examples

### OpenClaw Configuration
```yaml
mcpServers:
  llm-council:
    command: python
    args: ["C:/DATA/llm-council-local/backend/mcp_server/server.py"]
    env: {
      "PYTHONPATH": "C:/DATA/llm-council-local/backend"
    }
```

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "llm-council": {
      "command": "python",
      "args": ["C:\\DATA\\llm-council-local\\backend\\mcp_server\\server.py"],
      "env": {
        "PYTHONPATH": "C:\\DATA\\llm-council-local\\backend"
      }
    }
  }
}
```

## 🛠️ Available Tools

| Tool | Purpose | Parameters |
|------|---------|------------|
| `council_query` | Query multiple AI models | `prompt` (required), `models` (optional), `chairman` (optional) |
| `council_list` | List all council members | None |
| `council_availability` | Check model status | None |

## 📝 Usage Examples

### Basic Query
```python
await call_tool("council_query", {
  "prompt": "Explain quantum computing"
})
```

### Select Specific Models
```python
await call_tool("council_query", {
  "prompt": "Compare Python and JavaScript",
  "models": ["ollama-gemma4", "api-gpt4"]
})
```

### Custom Chairman
```python
await call_tool("council_query", {
  "prompt": "Your question",
  "chairman": "cli-gemini"
})
```

## 🔍 Configuration

- **Config:** `config/council.yaml`
- **API Keys:** `.env` file
- **Models:** All enabled models from council config

## 📚 Documentation

- Full Guide: `MCP_INTEGRATION.md`
- Main README: `README.md`
- Backend Docs: `backend/README.md`

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Won't start | `pip install -r backend/requirements.txt` |
| Models missing | Check `config/council.yaml` |
| Can't connect | Verify PYTHONPATH in config |

## ✅ Status Check

```bash
# Test MCP server
python backend/test_mcp.py

# Expected output:
# OK - MCP Server imported successfully!
# Available tools: 3
# OK - MCP Server is fully functional!
```

---

**Ready to integrate with OpenClaw and other MCP tools!**
