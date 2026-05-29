"""LLM Council - Main FastAPI Application."""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from models.schemas import QueryRequest, CouncilResult
from council_manager import CouncilManager
from admin.routes import router as admin_router

# Load environment variables
load_dotenv()

# Global council manager
council_manager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events - startup and shutdown."""
    global council_manager

    # Startup - resolve config path relative to project root
    project_root = Path(__file__).parent.parent
    config_path = os.getenv("COUNCIL_CONFIG", str(project_root / "config" / "council.yaml"))
    council_manager = CouncilManager(config_path)

    # Make it available to admin routes
    import admin.routes
    admin.routes.council = council_manager

    print(f"LLM Council started with {len(council_manager.members)} members")
    print(f"Chairman: {council_manager.chairman_id}")

    # Validate availability during startup
    print("\n[*] Checking model availability...")
    availability = await council_manager.check_availability()

    available_models = [mid for mid, avail in availability.items() if avail]
    unavailable_models = [mid for mid, avail in availability.items() if not avail]

    if available_models:
        print(f"[+] Available models ({len(available_models)}):")
        for mid in available_models:
            member = council_manager.members.get(mid)
            print(f"   - {member.name} ({mid})")

    if unavailable_models:
        print(f"\n[!] Unavailable models ({len(unavailable_models)}):")
        for mid in unavailable_models:
            member = council_manager.members.get(mid)
            print(f"   - {member.name} ({mid})")
            # Provide helpful hints
            if member.type == "cli":
                print(f"     [*] Install: {member.command}")
                print(f"     [*] Or disable in config/council.yaml: enabled: false")
            elif member.type == "ollama":
                print(f"     [*] Check if Ollama is running: ollama list")
                print(f"     [*] Check host: {member.host or 'localhost'}:11434")
            elif member.type == "api":
                provider = member.provider or "unknown"
                key_env = f"{provider.upper()}_API_KEY"
                print(f"     [*] Set {key_env} in .env file")

    # Fail fast if NO models available
    if len(available_models) == 0:
        print("\n[!] ERROR: No models available! Please fix the issues above or disable unavailable models in config/council.yaml")
        raise RuntimeError("No models available. Check configuration and dependencies.")

    print(f"\n[+] Council ready with {len(available_models)} available models\n")

    yield

    # Shutdown
    print("LLM Council shutting down")


# Create FastAPI app
app = FastAPI(
    title="LLM Council",
    description="Multi-model AI council with synthesis",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8000", "http://localhost:5182", "http://localhost:5181", "http://localhost:5180"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include admin routes
app.include_router(admin_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "LLM Council",
        "version": "1.0.0",
        "members": len(council_manager.members),
        "chairman": council_manager.chairman_id
    }


@app.post("/api/query", response_model=CouncilResult)
async def query_council(request: QueryRequest):
    """Query the LLM Council.
    
    Send a prompt to multiple AI models and receive a synthesized response.
    """
    if not request.prompt:
        raise HTTPException(400, "Prompt is required")
    
    result = await council_manager.query(request)
    return result


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "members": len(council_manager.members)}


# OpenAI-compatible endpoint for external apps
@app.post("/v1/chat/completions")
async def openai_compatible_endpoint(body: dict):
    """OpenAI-compatible endpoint for external apps.
    
    Accepts OpenAI-format requests and returns council response.
    """
    messages = body.get("messages", [])
    if not messages:
        raise HTTPException(400, "messages are required")
    
    # Extract prompt from messages
    prompt = "\n".join(
        m.get("content", "") 
        for m in messages 
        if m.get("role") == "user"
    )
    
    if not prompt:
        raise HTTPException(400, "No user message found")
    
    # Query council
    request = QueryRequest(
        prompt=prompt,
        models=body.get("model").split(",") if body.get("model") else None,
        return_individual=False
    )
    result = await council_manager.query(request)
    
    # Return OpenAI-compatible response
    return {
        "id": "council-response",
        "object": "chat.completion",
        "created": 0,
        "model": "llm-council",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": result.chairman_response
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
