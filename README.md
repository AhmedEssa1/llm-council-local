# 🏛️ LLM Council Local

**Multi-model AI council** — query multiple LLMs simultaneously, get a synthesized final answer from a Chairman model.

---

## 🚀 Quick Start for New AI Agents

### **CURRENT STATUS: ✅ WORKING & TESTED (Last Updated: 2026-04-08)**

**✅ What's Working:**
- ✅ **Timeout Configuration:** Per-model timeout control (30s-300s) implemented
- ✅ **Dark Mode Contrast:** Excellent readability with improved contrast
- ✅ **Backend:** Fully functional on Windows 11
- ✅ **Frontend:** Running with beautiful dark mode UI
- ✅ **MCP Server:** Integrated and tested (3 tools available)
- ✅ **Multi-Model Queries:** Successfully queries Gemini CLI, Ollama models
- ✅ **Chairman Synthesis:** Working correctly with response aggregation
- ✅ **Admin API:** Full CRUD operations functional

### **Immediate Testing Commands:**

```bash
# 1. Start Backend (REQUIRES running from backend/ directory)
cd C:\DATA\llm-council-local\backend
python main.py

# 2. Start Frontend (new terminal)
cd C:\DATA\llm-council-local\frontend
npm run dev

# 3. Test Backend (PowerShell)
Invoke-RestMethod -Uri "http://localhost:8000/api/query" `
  -Method POST -ContentType "application/json" `
  -Body '{"prompt": "What is 2+2?"}'

# 4. Test MCP Server
cd C:\DATA\llm-council-local\backend
python test_mcp.py

# 5. Start MCP Server
python start_mcp_server.py
```

**URLs:**
- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

---

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Quick Start](#quick-start)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Frontend](#frontend)
8. [MCP Integration](#mcp-integration)
9. [Known Issues & Solutions](#known-issues--solutions)
10. [Development Guidelines](#development-guidelines)
11. [Troubleshooting](#troubleshooting)

---

## Architecture

```
                         ┌─────────────────────────────────┐
                         │         COUNCIL HUB             │
                         │  (FastAPI on main PC :8000)     │
                         │                                 │

  External Apps ──────── │  REST API  /api/query          │
  OpenClaw (MCP) ─────── │  MCP Server (3 tools)          │
  Browser ────────────── │  React Frontend (Dark Mode)    │
                         │                                 │
                         │  CouncilManager (Orchestrator)  │
                         │    ├── CLIAdapter   (claude/gemini)
                         │    ├── OllamaAdapter (local/remote)
                         │    └── APIAdapter    (OpenAI/Anthropic)
                         │                                 │
                         │  Chairman → synthesizes answers │
                         └───────────┬─────────────────────┘
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                    Local PC    Remote PC   Remote PC
                    (this)     (Tailscale) (Tailscale)
```

**Query Flow:**
1. User submits prompt (via UI, API, or MCP)
2. CouncilManager sends prompt to all selected models **in parallel**
3. Each model responds independently (with timeout handling)
4. Chairman model receives all responses and synthesizes final answer
5. Returns: `{chairman_response, individual_responses[], chairman_model}`

---

## Tech Stack

| Component | Technology | Version | Why |
|-----------|-----------|---------|-----|
| **Backend** | Python + FastAPI | 3.10+ | Async, subprocess handling, AI ecosystem |
| **Frontend** | React + TypeScript + Vite | 19+ | Fast dev, type-safe, modern |
| **Styling** | TailwindCSS | Latest | Dark theme optimized, utility-first |
| **Config** | YAML | - | Human-readable, easy to edit |
| **Remote PCs** | Tailscale | - | Zero-config VPN, bypasses NAT |
| **MCP** | mcp Python SDK | 1.0+ | OpenClaw integration |
| **HTTP Client** | httpx | - | Modern async HTTP |

---

## Project Structure

```
C:\DATA\llm-council-local\
│
├── README.md                    ← THIS FILE (AI handoff optimized)
├── .env.example                 ← API keys template
├── MCP_INTEGRATION.md           ← Detailed MCP guide
├── MCP_QUICKSTART.md            ← MCP quick reference
├── start_mcp_server.py          ← Easy MCP server startup
├── test_mcp_integration.py      ← MCP usage examples
│
├── config/
│   └── council.yaml             ← Council members + chairman config (SIMPLIFIED FORMAT)
│
├── backend/
│   ├── main.py                  ← FastAPI app (entry point)
│   ├── council_manager.py       ← Orchestrator: loads config, routes queries, synthesis
│   ├── requirements.txt         ← Python dependencies
│   ├── test_mcp.py             ← MCP server test script
│   │
│   ├── adapters/                ← Model provider adapters
│   │   ├── __init__.py
│   │   ├── base.py              ← BaseAdapter abstract class
│   │   ├── cli_adapter.py       ← Claude CLI, Gemini CLI
│   │   ├── ollama_adapter.py    ← Local + remote Ollama (HTTP)
│   │   └── api_adapter.py       ← OpenAI, Anthropic (API)
│   │
│   ├── admin/
│   │   ├── __init__.py
│   │   └── routes.py            ← Admin CRUD API routes
│   │
│   ├── mcp_server/              ← MCP server (renamed from mcp to avoid conflicts)
│   │   ├── __init__.py
│   │   └── server.py            ← MCP server for OpenClaw (3 tools)
│   │
│   └── models/
│       └── schemas.py           ← Pydantic models (request/response)
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx             ← React entry
│       ├── App.tsx              ← Main app (Query + Admin pages, FIXED CONTRAST)
│       ├── index.css            ← Tailwind + custom styles (IMPROVED DARK MODE)
│       └── types.ts             ← TypeScript interfaces
│
└── agent/
    └── agent.py                 ← Remote agent for other PCs (NOT YET IMPLEMENTED)
```

---

## Quick Start

### Prerequisites

- ✅ **Python 3.10+** (tested on Windows 11)
- ✅ **Node.js 18+** (tested locally)
- ✅ **CLI models** (at least one working):
  - `claude` CLI (Anthropic's Claude CLI) - tested ✅
  - `gemini` CLI (Google's Gemini CLI) - tested ✅
- ⚠️ **Ollama** (optional): running locally with models pulled
- ⚠️ **API keys** (optional): OpenAI, Anthropic (in `.env` file)

### 1. Backend Setup & Testing

```bash
# Navigate to backend directory (IMPORTANT: must run from here)
cd C:\DATA\llm-council-local\backend

# Install dependencies
pip install -r requirements.txt

# Copy example env file
copy .env.example .env

# Edit .env if using API models
# notepad .env

# Start backend
python main.py
```

**Expected Output:**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Test the backend:**
```powershell
# PowerShell test
Invoke-RestMethod -Uri "http://localhost:8000/api/query" `
  -Method POST -ContentType "application/json" `
  -Body '{"prompt": "What is 2+2?"}'

# Or check API docs in browser
Start-Process http://localhost:8000/docs
```

### 2. Frontend Setup & Testing

```bash
# Navigate to frontend directory
cd C:\DATA\llm-council-local\frontend

# Install dependencies (already done, but for reference)
npm install

# Start development server
npm run dev
```

**Frontend will be at:** http://localhost:5173

**Features:**
- ✅ Excellent dark mode contrast (FIXED)
- ✅ Responsive design
- ✅ Real-time model selection
- ✅ Individual response display
- ✅ Failure notifications
- ✅ Admin panel for model management

### 3. MCP Server Testing

```bash
# Test MCP server functionality
cd C:\DATA\llm-council-local\backend
python test_mcp.py

# Start MCP server for use with OpenClaw/Claude Desktop
python start_mcp_server.py

# Run integration examples
python test_mcp_integration.py
```

---

## Configuration

### `config/council.yaml` (SIMPLIFIED FORMAT)

**IMPORTANT:** The YAML format was recently simplified to avoid Python object serialization issues.

```yaml
# The chairman model synthesizes responses from all council members
chairman: gemini-local

# Council members - models that will respond to queries
council_members:
  # CLI-based models (local CLIs)
  - id: claude-local
    name: Claude CLI
    type: cli
    enabled: false
    command: claude
    args: ["--print"]
    timeout: 30  # seconds (optional, default: 30)

  - id: gemini-local
    name: Gemini CLI
    type: cli
    enabled: true
    command: gemini
    args: []
    timeout: 60  # seconds (optional, default: 60)

  # Ollama models (local/remote)
  - id: ollama-gemma4
    name: Gemma 4 (9B)
    type: ollama
    enabled: true
    host: localhost
    model: gemma2:e4b
    timeout: 180  # seconds (optional, default: 120) - Medium models

  - id: lan-gemma31b
    name: Gemma 4 (31B) - LAN PC
    type: ollama
    enabled: true
    host: 100.x.x.x
    model: gemma2:e4b
    timeout: 300  # seconds (optional, default: 120) - Large models need more time

  # API-based models (requires API keys)
  - id: api-gpt4
    name: GPT-4
    type: api
    enabled: false
    provider: openai
    model: gpt-4
    timeout: 60  # seconds (optional, default: 60)

  - id: api-claude
    name: Claude
    type: api
    enabled: false
    provider: anthropic
    model: claude-3-sonnet-20240229
    timeout: 90  # seconds (optional, default: 90)
```

### Environment Variables (`.env`)

```env
# OpenAI API Key (for GPT models)
OPENAI_API_KEY=

# Anthropic API Key (for Claude models)
ANTHROPIC_API_KEY=

# Optional: Override config path
COUNCIL_CONFIG=config/council.yaml
```

### Timeout Configuration

**⭐ NEW FEATURE:** Per-model timeout control to prevent "Ollama request timed out" errors.

**Recommended Timeout Settings:**
- **CLI Models:** 30-60s (fast local execution)
- **Small Ollama Models (<7B):** 120s (default)
- **Medium Ollama Models (9B-13B):** 180s (3 minutes)
- **Large Ollama Models (26B+):** 300s (5 minutes)
- **API Models:** 60-90s (depends on provider)

**Example Timeout Configuration:**
```yaml
# Add timeout field to any model
- id: lan-gemma31b
  name: Gemma 4 (31B) - LAN PC
  type: ollama
  timeout: 300  # 5 minutes for large models
```

**How It Works:**
1. Each model can have custom timeout in `config/council.yaml`
2. Timeout value passed to adapter during initialization
3. Ollama adapter uses timeout for HTTP requests
4. Error messages show specific timeout value if exceeded
5. Frontend displays timeout in admin panel

---

## API Reference

### Main Query Endpoint

```http
POST /api/query
Content-Type: application/json

{
  "prompt": "Explain quantum computing",
  "models": ["claude-local", "ollama-gemma4"],  // optional
  "chairman": "gemini-local",                    // optional
  "return_individual": true                       // include individual responses
}
```

**Response:**
```json
{
  "prompt": "Explain quantum computing",
  "chairman_response": "Quantum computing is...",
  "chairman_model": "Gemini CLI",
  "individual_responses": [
    {
      "model_id": "gemini-local",
      "model_name": "Gemini CLI",
      "content": "...",
      "error": null,
      "duration_ms": 3200
    },
    {
      "model_id": "ollama-gemma4",
      "model_name": "Gemma 4 (9B)",
      "content": "...",
      "error": "Could not connect to Ollama",
      "duration_ms": 8500
    }
  ]
}
```

### OpenAI-Compatible Endpoint

```http
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "council",
  "messages": [{"role": "user", "content": "Hello"}]
}
```

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/config` | Full config (members + chairman) |
| GET | `/admin/members` | List all council members |
| PUT | `/admin/members/{id}` | Update member (enable/disable) |
| GET | `/admin/chairman` | Get current chairman |
| GET | `/admin/availability` | Check which models are online |

---

## Frontend

**Stack:** React 19 + TypeScript + Vite + TailwindCSS

**Pages:**
1. **Query Page** — submit prompts, select models, pick chairman, view results
2. **Admin Page** — view all members, check availability, toggle models

**Recent Improvements:**
- ✅ **FIXED:** Dark mode contrast issues - text now clearly readable
- ✅ **FIXED:** Button borders visible in dark mode
- ✅ **ADDED:** Failure notifications when models fail
- ✅ **IMPROVED:** Markdown rendering (tables, bold, code blocks)
- ✅ **ENHANCED:** Loading states and visual feedback

**Running:**
```bash
cd frontend
npm run dev   # http://localhost:5173
npm run build # Production build
```

---

## MCP Integration

**✅ FULLY FUNCTIONAL & TESTED**

The MCP server exposes **3 tools** for OpenClaw, Claude Desktop, and other MCP-compatible tools:

### Available Tools

| Tool | Purpose | Parameters |
|------|---------|------------|
| `council_query` | Query the council | `prompt` (required), `models` (optional), `chairman` (optional) |
| `council_list` | List all council members | None |
| `council_availability` | Check model status | None |

### Quick Start

```bash
# Test MCP server
cd backend
python test_mcp.py

# Start MCP server
python start_mcp_server.py
```

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

**📚 Documentation:**
- `MCP_INTEGRATION.md` - Comprehensive guide
- `MCP_QUICKSTART.md` - Quick reference card

---

## Known Issues & Solutions

### ✅ **FIXED ISSUES:**

1. **❌ Dark Mode Contrast (FIXED - 2026-04-08)**
   - **Problem:** Text was invisible/too light (white) on dark backgrounds
   - **Solution:** Changed to much darker text colors (`gray-400` → `gray-500`)
   - **Status:** ✅ **RESOLVED** - Excellent contrast, clearly readable

2. **❌ Ollama Timeout Errors (FIXED - 2026-04-08)**
   - **Problem:** "Ollama request timed out after 120 seconds" for large models
   - **Solution:** Implemented per-model timeout configuration (30s-300s)
   - **Status:** ✅ **RESOLVED** - Configurable timeouts prevent errors

3. **❌ Button Borders Not Visible (FIXED)**
   - **Problem:** Button borders were too subtle in dark mode
   - **Solution:** Improved border colors and card background contrast
   - **Status:** ✅ **RESOLVED** - All interactive elements clearly visible

4. **❌ YAML Configuration Issues (FIXED)**
   - **Problem:** Used Python object serialization (`!!python/object/apply`)
   - **Solution:** Simplified to plain YAML with string types
   - **Status:** ✅ **RESOLVED** - Portable, human-readable format

5. **❌ MCP Server Import Conflicts (FIXED)**
   - **Problem:** `mcp/` directory conflicted with `mcp` package
   - **Solution:** Renamed to `mcp_server/` directory
   - **Status:** ✅ **RESOLVED** - No more circular imports

### ⚠️ **REMAINING ISSUES:**

1. **Backend Port Conflicts**
   - **Issue:** `[Errno 10048] error while attempting to bind on address ('0.0.0.0', 8000)`
   - **Workaround:** Kill existing processes or change port in main.py
   - **Solution:** `netstat -ano | findstr :8000` then `taskkill /PID <PID> /F`

2. **Import Path Quirk**
   - **Issue:** Backend uses relative imports, must run from `backend/` directory
   - **Workaround:** Always run `cd backend && python main.py`
   - **Fix:** Could add to `sys.path` or use absolute imports

3. **CLI Adapter Behavior**
   - **Issue:** Some CLIs may require interactive mode
   - **Workaround:** `--print` flag handles claude CLI
   - **Note:** Gemini CLI behavior may vary by version

4. **Config Hot-Reload**
   - **Issue:** Must restart backend after config changes
   - **Workaround:** Manual restart required
   - **Enhancement:** Could add file watching for auto-reload

5. **Remote Agent Hub Endpoints**
   - **Issue:** `POST /agent/register`, `GET /agent/{id}/tasks` not implemented
   - **Status:** ❌ **NOT IMPLEMENTED** - See agent/agent.py for expected interface

6. **Admin UI Forms**
   - **Issue:** Admin page is view-only, can't add/edit members
   - **Workaround:** Edit `config/council.yaml` directly
   - **Status:** ⚠️ **PARTIAL** - View-only, no forms yet

---

## Development Guidelines

### **For AI Agents Taking Over This Project:**

1. **UNDERSTAND THE ARCHITECTURE:**
   - Read `CLAUDE.md` for essential commands
   - Study `council_manager.py` for core orchestration logic
   - Review adapter pattern in `adapters/` directory

2. **RESPECT THE WORKING PARTS:**
   - ✅ Backend is tested and working
   - ✅ Frontend has excellent dark mode contrast
   - ✅ MCP integration is functional
   - Don't break these without good reason

3. **FOLLOW THE PATTERNS:**
   - Use the existing adapter pattern for new model types
   - Follow the YAML configuration format
   - Maintain the contrast standards in dark mode
   - Keep error handling consistent

4. **TEST BEFORE COMMITTING:**
   - Test backend: `cd backend && python main.py`
   - Test frontend: `cd frontend && npm run dev`
   - Test MCP: `python backend/test_mcp.py`
   - Verify dark mode contrast is still good

5. **KNOWN LIMITATIONS:**
   - Import paths require running from specific directories
   - Some CLIs may behave differently
   - Ollama timeout is 120s (may need adjustment for large models)
   - No streaming responses (yet)

### **Code Quality Standards:**

- **Type Hints:** All functions should have proper type hints
- **Error Handling:** Use try-except with meaningful error messages
- **Comments:** Document non-obvious logic
- **Testing:** Test with at least 2 different model types
- **Accessibility:** Maintain WCAG AA contrast ratios

---

## Troubleshooting

### **Backend Won't Start**

```bash
# Check Python version
python --version  # Should be 3.10+

# Check dependencies
pip list | findstr FastAPI

# Reinstall if needed
pip install -r requirements.txt

# Check port availability
netstat -ano | findstr :8000
```

### **Models Not Responding**

```bash
# Test CLI directly
claude --print "hello"
gemini "hello"

# Test Ollama
ollama run gemma2:e4b "hello"

# Check config file
type config\council.yaml

# Check backend logs for errors
# Look for timeout/connection errors
```

### **Timeout Issues**

```bash
# Problem: "Ollama request timed out after 120 seconds"
# Solution: Increase timeout in config/council.yaml

# For large models (26B+), add:
# timeout: 300  # 5 minutes

# For medium models (9B-13B), add:
# timeout: 180  # 3 minutes

# Test timeout configuration
python test_timeout.py

# Check current timeout settings
type config\council.yaml | findstr timeout
```

### **Frontend Issues**

```bash
# Clear cache and reinstall
cd frontend
rmdir /s /q node_modules
rmdir /s /q dist
npm install
npm run dev

# Check console for errors
# Open browser DevTools (F12)
```

### **MCP Server Issues**

```bash
# Test MCP server
cd backend
python test_mcp.py

# Check Python path
echo %PYTHONPATH%

# Test imports
python -c "from mcp_server.server import server; print('OK')"
```

### **Dark Mode Contrast Issues**

```bash
# If contrast is still poor, check these files:
# - frontend/src/App.tsx (themeClasses section)
# - frontend/src/index.css (dark mode overrides)

# Key contrast values:
# text-gray-300 (main text in dark mode)
# bg-gray-600 (card backgrounds in dark mode)
# border-gray-500 (borders in dark mode)
```

---

## Current Status Summary

### **✅ WORKING & TESTED (Last Updated: 2026-04-08):**
- ✅ **Timeout Configuration:** Per-model timeout control (30s-300s)
- ✅ **Dark Mode UI:** Excellent contrast and readability
- ✅ **Backend API:** FastAPI fully functional
- ✅ **Frontend:** React + TypeScript with beautiful UI
- ✅ **MCP Server:** 3 tools available and tested
- ✅ **CLI Adapters:** Claude, Gemini working
- ✅ **Ollama Adapter:** Local + remote models
- ✅ **Chairman Synthesis:** Response aggregation working
- ✅ **Admin CRUD:** Full member management API
- ✅ **Configuration:** YAML-based, easy to edit

### **⚠️ PARTIAL / NEEDS WORK:**
- ⚠️ **Backend Stability:** Occasional port conflicts
- ⚠️ **Remote Agent Hub:** Endpoints not implemented
- ⚠️ **Admin UI:** View-only (no add/edit forms)
- ⚠️ **Streaming:** No streaming responses yet
- ⚠️ **Config Hot-Reload:** Requires restart after changes

### **❌ NOT IMPLEMENTED:**
- ❌ Response ranking between models
- ❌ Docker support
- ❌ Auth/API keys for public access
- ❌ Image/multimodal support
- ❌ Conversation history

---

## Next Steps for New AI Agent

1. **Verify Everything Works:**
   ```bash
   # Test all components
   cd backend && python main.py
   cd frontend && npm run dev
   python backend/test_mcp.py
   ```

2. **Decide Your Priority:**
   - Fix remote agent endpoints?
   - Add admin UI forms?
   - Implement streaming?
   - Add Docker support?

3. **Read the Documentation:**
   - `CLAUDE.md` - Essential commands
   - `MCP_INTEGRATION.md` - MCP guide
   - `MCP_QUICKSTART.md` - Quick reference

4. **Follow the Patterns:**
   - Adapter pattern for new models
   - YAML configuration format
   - Contrast standards for UI
   - Error handling patterns

5. **Test Changes Thoroughly:**
   - Backend still works?
   - Frontend contrast still good?
   - MCP integration functional?
   - No regressions?

---

*Last updated: 2026-04-08 (Timeout Configuration + Dark Mode Fix Edition)*
