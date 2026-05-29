# Installation Guide - Different PC Setup

## Quick Install on New PC

### 1. **Prerequisites Check**
Make sure you have Python 3.10+ installed:
```bash
python --version
# Should show: Python 3.10.0 or higher
```

### 2. **Choose Installation Type**

#### **Option A: Production Only** (Recommended for most users)
```bash
# Navigate to backend directory
cd C:\DATA\llm-council-local\backend

# Install core dependencies
pip install -r requirements.txt
```

This installs everything needed to **run the application**:
- FastAPI (web server)
- Uvicorn (ASGI server)
- Data validation libraries
- HTTP clients
- AI model APIs (OpenAI, Anthropic)
- MCP server integration
- Configuration file parsing

#### **Option B: Development + Testing** (For developers)
```bash
# Navigate to backend directory
cd C:\DATA\llm-council-local\backend

# Install everything including testing tools
pip install -r requirements-dev.txt
```

This includes everything in Option A **plus**:
- Pytest (testing framework)
- Pytest-asyncio (async testing support)

### 3. **Verify Installation**
```bash
# Check if FastAPI is installed
python -c "import fastapi; print('FastAPI:', fastapi.__version__)"

# Check if Uvicorn is installed
python -c "import uvicorn; print('Uvicorn installed successfully')"

# Check if httpx is installed (for Ollama)
python -c "import httpx; print('httpx installed successfully')"

# Check if PyYAML is installed (for config)
python -c "import yaml; print('PyYAML installed successfully')"
```

### 4. **Start the Backend**
```bash
# Navigate to backend directory
cd C:\DATA\llm-council-local\backend

# Start the server
python main.py
```

Server should start at: `http://localhost:8000`

---

## ✅ **What's Included in requirements.txt**

### Core Framework
- **fastapi** - Web framework for building REST APIs
- **uvicorn** - ASGI server to run FastAPI applications

### Data & Config
- **pydantic** - Data validation using Python type annotations
- **pyyaml** - Parse YAML configuration files (`council.yaml`)
- **python-dotenv** - Load environment variables from `.env` file

### HTTP & Networking
- **httpx** - Modern async HTTP client (used by Ollama adapter)

### AI Model APIs
- **openai** - OpenAI API client (for GPT-4, etc.)
- **anthropic** - Anthropic API client (for Claude models)

### Integration
- **mcp** - Model Context Protocol server (for OpenClaw integration)

---

## ❌ **What's NOT Included (And Why)**

### Removed Unused Packages:
1. **pydantic-settings** - Not used in code (was removed)
2. **websockets** - Not used in code (was removed)

These were in the original requirements.txt but aren't actually used anywhere in the codebase, so they were removed to keep the installation clean.

### Testing Dependencies (Separate):
- **pytest** - Only needed for running tests
- **pytest-asyncio** - Only needed for async testing

If you want to run tests, install `requirements-dev.txt` instead.

---

## 📋 **Complete Dependency List**

### Production (requirements.txt)
```
fastapi>=0.100.0
uvicorn>=0.23.0
httpx>=0.24.0
pydantic>=2.0.0
python-dotenv>=1.0.0
pyyaml>=6.0
openai>=1.0.0
anthropic>=0.18.0
mcp>=1.0.0
```

### Development (requirements-dev.txt)
```
# Everything from requirements.txt +
pytest>=9.0.0
pytest-asyncio>=1.0.0
```

---

## 🚀 **Installation on Different PC**

### Method 1: Copy Project Files
1. Copy the entire `llm-council-local` folder to the new PC
2. Open terminal/command prompt
3. Navigate to the backend directory:
   ```bash
   cd path\to\llm-council-local\backend
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Method 2: Clone from Git (if using version control)
```bash
# Clone repository (if you have one)
git clone <your-repo-url>
cd llm-council-local/backend

# Install dependencies
pip install -r requirements.txt
```

### Method 3: Install Manually (if requirements.txt is lost)
```bash
pip install fastapi uvicorn httpx pydantic python-dotenv pyyaml openai anthropic mcp
```

---

## ⚠️ **Important Notes**

### Python Version
- **Minimum:** Python 3.10
- **Recommended:** Python 3.11+ (current: 3.11.9)

### Virtual Environment (Recommended)
On a new PC, it's best practice to use a virtual environment:

**Windows:**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Linux/Mac:**
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### API Keys (Optional)
If you plan to use API models (OpenAI, Anthropic), you'll need to:
1. Create a `.env` file in the backend directory
2. Add your API keys:
   ```env
   OPENAI_API_KEY=
   ANTHROPIC_API_KEY=
   ```

---

## 🧪 **Test Your Installation**

After installation, test if everything works:

```bash
# 1. Check Python version
python --version

# 2. Test import key modules
python -c "import fastapi, uvicorn, httpx, yaml; print('Core modules: OK')"

# 3. Try to start the backend
cd backend
python main.py
```

If successful, you should see:
```
[*] Checking model availability...
[+] Available models (X):
   - Gemma 4 (9B) (ollama-gemma4)
   
[+] Council ready with X available models

INFO:     Started server process [PID]
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## 📦 **Package Details**

### Minimum Required Versions
- `fastapi`: 0.100.0+
- `uvicorn`: 0.23.0+
- `httpx`: 0.24.0+
- `pydantic`: 2.0.0+
- `python-dotenv`: 1.0.0+
- `pyyaml`: 6.0+
- `openai`: 1.0.0+
- `anthropic`: 0.18.0+
- `mcp`: 1.0.0+

### What Each Package Does

| Package | Purpose | Used By |
|---------|---------|---------|
| **fastapi** | Web framework | main.py, admin/routes.py |
| **uvicorn** | ASGI server | Running the FastAPI app |
| **httpx** | Async HTTP client | Ollama adapter (ollama_adapter.py) |
| **pydantic** | Data validation | All API models (schemas.py) |
| **python-dotenv** | Environment variables | main.py (loads .env) |
| **pyyaml** | YAML parsing | council_manager.py (loads council.yaml) |
| **openai** | OpenAI API | API adapter (api_adapter.py) |
| **anthropic** | Anthropic API | API adapter (api_adapter.py) |
| **mcp** | MCP protocol | MCP server (mcp/server.py) |

---

## 🎯 **Summary**

**✅ The requirements.txt file is COMPLETE and CORRECT**

It contains all dependencies needed to:
- Run the FastAPI backend server
- Handle HTTP requests to Ollama
- Connect to OpenAI/Anthropic APIs
- Serve the MCP integration
- Parse YAML configuration files
- Validate request/response data

**To install on a different PC:**
```bash
cd C:\DATA\llm-council-local\backend
pip install -r requirements.txt
```

That's it! The file is ready for deployment on any machine.
