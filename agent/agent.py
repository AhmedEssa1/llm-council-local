#!/usr/bin/env python3
"""
Remote Agent - runs on remote PCs to expose local models to the Council Hub.

Usage:
    python agent.py --hub http://100.x.x.x:8000 --id pc2

The agent will:
1. Discover local Ollama models
2. Register with the Council Hub
3. Listen for queries and execute them locally
"""

import argparse
import asyncio
import json
import httpx
import subprocess
from typing import Optional


class RemoteAgent:
    def __init__(self, hub_url: str, agent_id: str):
        self.hub_url = hub_url.rstrip("/")
        self.agent_id = agent_id
        self.models: dict[str, dict] = {}
    
    async def discover_ollama_models(self) -> list[dict]:
        """Discover available Ollama models on this machine."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get("http://localhost:11434/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    return data.get("models", [])
        except Exception as e:
            print(f"Warning: Could not discover Ollama models: {e}")
        return []
    
    async def check_claude_cli(self) -> bool:
        """Check if Claude CLI is available."""
        try:
            result = subprocess.run(
                ["claude", "--version"],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False
    
    async def check_gemini_cli(self) -> bool:
        """Check if Gemini CLI is available."""
        try:
            result = subprocess.run(
                ["gemini", "--version"],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False
    
    async def register(self):
        """Register this agent with the Council Hub."""
        models = []
        
        # Add Ollama models
        ollama_models = await self.discover_ollama_models()
        for m in ollama_models:
            model_id = f"{self.agent_id}-ollama-{m['name'].replace(':', '-')}"
            models.append({
                "id": model_id,
                "name": f"{m['name']} ({self.agent_id})",
                "type": "ollama",
                "host": "remote",  # Will be handled by agent
                "model": m["name"],
                "enabled": True
            })
            self.models[model_id] = {"type": "ollama", "model": m["name"]}
        
        # Check CLI availability
        if await self.check_claude_cli():
            model_id = f"{self.agent_id}-claude"
            models.append({
                "id": model_id,
                "name": f"Claude CLI ({self.agent_id})",
                "type": "cli",
                "command": "claude",
                "args": ["--print"],
                "enabled": True
            })
            self.models[model_id] = {"type": "cli", "command": "claude"}
        
        if await self.check_gemini_cli():
            model_id = f"{self.agent_id}-gemini"
            models.append({
                "id": model_id,
                "name": f"Gemini CLI ({self.agent_id})",
                "type": "cli",
                "command": "gemini",
                "args": [],
                "enabled": True
            })
            self.models[model_id] = {"type": "cli", "command": "gemini"}
        
        # Register with hub
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    f"{self.hub_url}/agent/register",
                    json={
                        "agent_id": self.agent_id,
                        "models": models
                    }
                )
                if response.status_code == 200:
                    print(f"✅ Registered {len(models)} models with hub")
                else:
                    print(f"❌ Registration failed: {response.text}")
            except Exception as e:
                print(f"❌ Could not connect to hub: {e}")
    
    async def execute_query(self, model_id: str, prompt: str) -> str:
        """Execute a query on a local model."""
        model = self.models.get(model_id)
        if not model:
            raise ValueError(f"Unknown model: {model_id}")
        
        if model["type"] == "ollama":
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": model["model"],
                        "prompt": prompt,
                        "stream": False
                    }
                )
                response.raise_for_status()
                return response.json().get("response", "")
        
        elif model["type"] == "cli":
            proc = await asyncio.create_subprocess_exec(
                model["command"],
                "--print" if model["command"] == "claude" else None,
                prompt,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            return stdout.decode().strip()
        
        raise ValueError(f"Unknown model type: {model['type']}")
    
    async def poll_for_tasks(self):
        """Poll the hub for tasks."""
        print("🔄 Listening for tasks...")
        
        while True:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        f"{self.hub_url}/agent/{self.agent_id}/tasks"
                    )
                    
                    if response.status_code == 200:
                        tasks = response.json().get("tasks", [])
                        for task in tasks:
                            task_id = task["task_id"]
                            model_id = task["model_id"]
                            prompt = task["prompt"]
                            
                            try:
                                result = await self.execute_query(model_id, prompt)
                                await client.post(
                                    f"{self.hub_url}/agent/{self.agent_id}/response",
                                    json={
                                        "task_id": task_id,
                                        "success": True,
                                        "result": result
                                    }
                                )
                            except Exception as e:
                                await client.post(
                                    f"{self.hub_url}/agent/{self.agent_id}/response",
                                    json={
                                        "task_id": task_id,
                                        "success": False,
                                        "error": str(e)
                                    }
                                )
            
            except httpx.TimeoutException:
                pass  # Normal, just keep polling
            except Exception as e:
                print(f"Polling error: {e}")
            
            await asyncio.sleep(1)


async def main():
    parser = argparse.ArgumentParser(description="LLM Council Remote Agent")
    parser.add_argument("--hub", required=True, help="URL of the Council Hub")
    parser.add_argument("--id", required=True, help="Unique agent ID")
    args = parser.parse_args()
    
    agent = RemoteAgent(args.hub, args.id)
    
    print(f"🚀 Starting Remote Agent: {args.id}")
    print(f"📡 Hub URL: {args.hub}")
    
    await agent.register()
    await agent.poll_for_tasks()


if __name__ == "__main__":
    asyncio.run(main())
