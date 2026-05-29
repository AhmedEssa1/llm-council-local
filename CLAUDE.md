# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Backend (FastAPI):**
```bash
cd C:\DATA\llm-council-local\backend
python main.py                    # Starts server on http://localhost:8000
pip install -r requirements.txt  # Install dependencies
```

**Frontend (React + Vite):**
```bash
cd C:\DATA\llm-council-local\frontend
npm run dev                       # Starts dev server on http://localhost:5173
npm install                       # Install dependencies (already done)
```

**Test the API:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/query" `
  -Method POST -ContentType "application/json" `
  -Body '{"prompt": "What is 2+2?"}'
```

**MCP Server (OpenClaw):**
```bash
python backend/mcp/server.py      # Runs independently, doesn't need backend running
```

**Remote Agent (for other PCs):**
```bash
python agent/agent.py --hub http://100.x.x.x:8000 --id pc2
```

## Architecture Overview

LLM Council is a multi-model AI orchestrator that queries multiple LLMs in parallel and synthesizes a final answer through a "Chairman" model.

### Core Components

**CouncilManager** (`backend/council_manager.py`): Central orchestrator
- Loads config from `config/council.yaml` (YAML-based, not database)
- Routes queries to multiple models in parallel using `asyncio.gather()`
- Synthesizes responses through a Chairman model
- CRUD operations for council members and chairman selection

**Adapter Pattern** (`backend/adapters/`):
- `BaseAdapter`: Abstract interface with `generate()` and `is_available()`
- `CLIAdapter`: Shells out to claude/gemini CLIs via subprocess
- `OllamaAdapter`: HTTP requests to local/remote Ollama (port 11434)
- `APIAdapter`: OpenAI/Anthropic SDK calls (requires API keys in `.env`)
- Each model type gets its own adapter - easy to extend

**FastAPI App** (`backend/main.py`):
- REST API: `/api/query` (main endpoint), `/v1/chat/completions` (OpenAI-compatible)
- Admin API: `/admin/members`, `/admin/chairman`, `/admin/availability`
- CORS enabled for frontend on localhost:5173

**MCP Server** (`backend/mcp/server.py`):
- Runs independently via stdio transport
- Exposes 3 tools: `council_query`, `council_list`, `council_availability`
- Creates its own CouncilManager instance (doesn't share with backend)

**Remote Agent** (`agent/agent.py`):
- Discovers local Ollama models and CLI tools
- Registers with hub via `/agent/register` (NOT YET IMPLEMENTED in main.py)
- Polls for tasks via `/agent/{id}/tasks` (NOT YET IMPLEMENTED)

### Critical Implementation Details

**Import Path Quirk:** Backend uses relative imports (`from adapters import ...`). You MUST run from the `backend/` directory or imports will fail. The `sys.path.insert(0, ...)` in `main.py` handles this when running normally.

**Config System:** All config stored in `config/council.yaml`. Changes require backend restart (no hot-reload). CouncilManager automatically saves changes back to YAML when members are added/removed via admin API.

**Synthesis Pattern:** Chairman model receives all individual responses and synthesizes a final answer. If only one valid response exists, it's returned directly. If chairman fails, falls back to concatenating responses with model names.

**Admin Routes Hack:** The `council` variable in `admin/routes.py` is set at startup via `admin.routes.council = council_manager` in `main.py` lifespan function. This is a coupling pattern, not dependency injection.

**Parallel Execution:** All model queries run in parallel using `asyncio.gather()`. Timeout is 120s for Ollama, but CLI adapters hang indefinitely if CLI doesn't respond.

## Configuration

**`config/council.yaml`:** Defines council members (models) and chairman
- `type`: "cli", "ollama", or "api"
- CLI models: specify `command` and `args`
- Ollama models: specify `host` (localhost or Tailscale IP) and `model` name
- API models: specify `provider` ("openai" or "anthropic") and model name
- Set `enabled: false` to disable a model without removing it

**`.env`:** API keys for API models
- `OPENAI_API_KEY`: For OpenAI models
- `ANTHROPIC_API_KEY`: For Anthropic models
- `COUNCIL_CONFIG`: Override config path (defaults to `config/council.yaml`)

## Current Status

**✅ Scaffolded:** All components are implemented but NOT yet tested
**❌ Backend NEVER RUN:** The code has never been executed. First run will likely reveal bugs.

**Known Issues (from README):**
- Import paths require running from `backend/` directory
- CLI adapter behavior varies between CLIs (claude `--print` works, gemini untested)
- Ollama timeout: 26B models may take 60+ seconds (timeout set to 120s)
- Config hot-reload not implemented (must restart after config changes)
- Remote agent hub endpoints not implemented in `main.py`

**Priority Work (from README):**
1. Test backend with real claude CLI, gemini CLI, and Ollama
2. Fix import paths if they cause issues
3. Implement hub endpoints for remote agent registration
4. Add admin UI forms for adding/editing members (currently view-only)

## Testing Individual Adapters

Before running the full system:
```bash
# Test Claude CLI
claude --print "hello"

# Test Gemini CLI
gemini "hello"

# Test Ollama
ollama run gemma4:e4b "hello"
```

If these don't work, the adapters will fail.
