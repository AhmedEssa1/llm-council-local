"""Council Manager - orchestrates model queries and synthesis."""

import asyncio
import time
import re
from typing import Optional
import yaml
from pathlib import Path
from threading import Thread
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent

from adapters import CLIAdapter, OllamaAdapter, APIAdapter, BaseAdapter
from models.schemas import (
    CouncilMember, ModelType, QueryRequest,
    ModelResponse, CouncilResult, ImageData
)


class ConfigFileHandler(FileSystemEventHandler):
    """Handles config file change events for hot-reload."""

    def __init__(self, council_manager):
        self.council_manager = council_manager
        self.last_reload = time.time()
        self.reload_cooldown = 1.0  # Wait 1 second between reloads

    def on_modified(self, event):
        """Called when config file is modified."""
        if event.is_directory:
            return

        # Only reload if enough time has passed (prevents multiple reloads from single save)
        if time.time() - self.last_reload < self.reload_cooldown:
            return

        # Check if it's the config file
        if str(event.src_path).endswith('council.yaml'):
            print(f"[Config] Detected change to {event.src_path}, reloading...")
            try:
                self.council_manager._load_config()
                self.last_reload = time.time()
                print(f"[Config] Successfully reloaded configuration")
                print(f"[Config] Chairman: {self.council_manager.chairman_id}")
                print(f"[Config] Members: {len(self.council_manager.members)} models")
            except Exception as e:
                print(f"[Config] Error reloading configuration: {e}")


class CouncilManager:
    """Manages the LLM Council - loads config, routes queries, synthesizes responses."""
    
    def __init__(self, config_path: str = "../config/council.yaml"):
        self.config_path = Path(config_path)
        self.members: dict[str, CouncilMember] = {}
        self.adapters: dict[str, BaseAdapter] = {}
        self.chairman_id: str = ""
        self._load_config()

        # Start file watcher for hot-reload
        self._start_config_watcher()

    def _start_config_watcher(self):
        """Start watching config file for changes."""
        try:
            # Create observer and event handler
            event_handler = ConfigFileHandler(self)
            observer = Observer()
            observer.schedule(event_handler, path=str(self.config_path.parent), recursive=False)

            # Start observer in a separate thread
            observer.start()
            self.observer = observer

            print(f"[Config] Watching {self.config_path} for changes...")
        except Exception as e:
            print(f"[Config] Could not start file watcher: {e}")
            self.observer = None
    
    def _load_config(self):
        """Load council configuration from YAML."""
        if not self.config_path.exists():
            print(f"Warning: Config file not found at {self.config_path}")
            return
        
        with open(self.config_path) as f:
            config = yaml.safe_load(f)
        
        # Load members
        for member_data in config.get("council_members", []):
            # Convert string type to ModelType enum
            if isinstance(member_data.get("type"), str):
                member_data["type"] = ModelType(member_data["type"].lower())

            member = CouncilMember(**member_data)
            self.members[member.id] = member
            self.adapters[member.id] = self._create_adapter(member)
        
        # Load chairman
        self.chairman_id = config.get("chairman", "")
    
    def _create_adapter(self, member: CouncilMember) -> BaseAdapter:
        """Create appropriate adapter for a council member."""
        # Get timeout from member config, use defaults if not specified
        timeout = member.timeout if member.timeout is not None else 120  # Default 120 seconds

        if member.type == ModelType.CLI:
            return CLIAdapter(
                model_id=member.id,
                model_name=member.name,
                command=member.command,
                args=member.args
            )
        elif member.type == ModelType.OLLAMA:
            return OllamaAdapter(
                model_id=member.id,
                model_name=member.name,
                model=member.model,
                host=member.host or "localhost",
                timeout=timeout
            )
        elif member.type == ModelType.API:
            return APIAdapter(
                model_id=member.id,
                model_name=member.name,
                provider=member.provider,
                model=member.model
            )
        else:
            raise ValueError(f"Unknown model type: {member.type}")
    
    async def query(self, request: QueryRequest) -> CouncilResult:
        """Query the council and return synthesized result."""
        start_time = time.time()
        
        # Determine which models to query
        if request.models:
            model_ids = [m for m in request.models if m in self.adapters]
        else:
            model_ids = [mid for mid, m in self.members.items() if m.enabled]
        
        # Query all models in parallel
        tasks = [
            self._query_model(mid, request.prompt, request.images)
            for mid in model_ids
        ]
        responses = await asyncio.gather(*tasks)
        
        # Determine chairman
        chairman_id = request.chairman or self.chairman_id
        if chairman_id not in self.adapters:
            # Fallback to first available
            chairman_id = model_ids[0] if model_ids else ""
        
        # Synthesize final response
        chairman_raw_response = await self._synthesize(
            request.prompt,
            responses,
            chairman_id,
            request.images
        )
        
        # Extract rankings if present
        rankings = self._parse_rankings(chairman_raw_response, responses)
        
        # Clean the response (remove the rankings section if it was successfully parsed)
        chairman_response = chairman_raw_response
        if rankings:
            # Look for the [RANKINGS] marker and remove everything after it
            parts = re.split(r'\[RANKINGS\]', chairman_raw_response, flags=re.IGNORECASE)
            if len(parts) > 1:
                chairman_response = parts[0].strip()
        
        return CouncilResult(
            prompt=request.prompt,
            chairman_response=chairman_response,
            chairman_model=self.members.get(chairman_id, CouncilMember(id=chairman_id, name=chairman_id, type=ModelType.CLI)).name,
            individual_responses=responses if request.return_individual else [],
            rankings=rankings
        )
    
    async def _query_model(self, model_id: str, prompt: str, images: Optional[list[ImageData]] = None) -> ModelResponse:
        """Query a single model and return response with optional image support."""
        member = self.members.get(model_id)
        adapter = self.adapters.get(model_id)

        if not adapter:
            return ModelResponse(
                model_id=model_id,
                model_name=member.name if member else model_id,
                content="",
                error="Adapter not found"
            )

        start_time = time.time()
        try:
            # Only send images to vision-capable models
            model_images = images if adapter.supports_images else None
            content = await adapter.generate(prompt, model_images)
            duration = int((time.time() - start_time) * 1000)

            return ModelResponse(
                model_id=model_id,
                model_name=member.name if member else model_id,
                content=content,
                duration_ms=duration
            )
        except Exception as e:
            return ModelResponse(
                model_id=model_id,
                model_name=member.name if member else model_id,
                content="",
                error=str(e)
            )
    
    async def _synthesize(self, prompt: str, responses: list[ModelResponse], chairman_id: str, images: Optional[list[ImageData]] = None) -> str:
        """Use chairman model to synthesize final response with optional image support."""
        # Build synthesis prompt
        valid_responses = [r for r in responses if not r.error and r.content]
        failed_responses = [r for r in responses if r.error]

        if not valid_responses:
            return "[!] ERROR: No valid responses received from council members. " \
                   f"Failed: {', '.join(r.model_name for r in failed_responses)}"

        # Add warning if some models failed
        prefix = ""
        if failed_responses:
            prefix = f"[NOTE: Only {len(valid_responses)} of {len(responses)} council members responded. " \
                    f"Failed: {', '.join(r.model_name for r in failed_responses)}]\n\n"

        # If only one response, return it directly with a note
        if len(valid_responses) == 1:
            return f"{prefix}{valid_responses[0].content}"

        # Build synthesis prompt
        synthesis_prompt = f"""You are the Chairman of an LLM Council. Multiple AI models have responded to a query.
Your job is to synthesize their responses into a single, comprehensive, accurate answer.

ORIGINAL QUERY:
{prompt}

RESPONSES FROM COUNCIL MEMBERS:
"""
        for i, resp in enumerate(valid_responses, 1):
            synthesis_prompt += f"\n--- {resp.model_name} ---\n{resp.content}\n"

        synthesis_prompt += """
---

As Chairman, synthesize the above responses into a single, well-structured answer.
- Include the best insights from each model
- Resolve any contradictions by favoring the most accurate/reasonable position
- Be comprehensive but concise
- Do not mention the individual models in your final answer

At the very end of your response, please provide a RANKING of the council members based on the quality and accuracy of their responses. Use the following format:
[RANKINGS]
1. ModelName: <brief reasoning>
2. ModelName: <brief reasoning>
..."""

        # Query chairman with images for comprehensive synthesis
        adapter = self.adapters.get(chairman_id)
        if adapter:
            try:
                # Only send images to vision-capable chairman
                chairman_images = images if adapter.supports_images else None
                chairman_response = await adapter.generate(synthesis_prompt, chairman_images)
                return f"{prefix}{chairman_response}"
            except Exception as e:
                # Fallback: concatenate responses
                fallback = "\n\n---\n\n".join(
                    f"**{r.model_name}:**\n{r.content}"
                    for r in valid_responses
                )
                return f"{prefix}[Chairman synthesis failed: {str(e)}]\n\n{fallback}"

        # No chairman: return concatenated
        fallback = "\n\n---\n\n".join(
            f"**{r.model_name}:**\n{r.content}"
            for r in valid_responses
        )
        return f"{prefix}{fallback}"

    def _parse_rankings(self, chairman_output: str, responses: list[ModelResponse]) -> Optional[dict[str, int]]:
        """Parse rankings from chairman output.
        
        Looks for the [RANKINGS] section and extracts model names and their ranks.
        Returns a dict of model_id -> rank (1-N).
        """
        if "[RANKINGS]" not in chairman_output:
            return None
        
        rankings = {}
        try:
            # Find the rankings section
            parts = re.split(r'\[RANKINGS\]', chairman_output, flags=re.IGNORECASE)
            ranking_text = parts[-1].strip()
            
            # Extract lines like "1. ModelName: Reason"
            lines = ranking_text.split("\n")
            for line in lines:
                match = re.search(r'(\d+)\.\s*([^:]+)', line)
                if match:
                    rank = int(match.group(1))
                    model_name_part = match.group(2).strip()
                    
                    # Try to find which model this name refers to
                    for resp in responses:
                        # Direct name match or fuzzy match
                        if (model_name_part.lower() in resp.model_name.lower() or 
                            resp.model_name.lower() in model_name_part.lower()):
                            rankings[resp.model_id] = rank
                            break
            
            return rankings if rankings else None
        except:
            return None
    
    def get_members(self) -> list[CouncilMember]:
        """Get all council members."""
        return list(self.members.values())
    
    def add_member(self, member: CouncilMember):
        """Add a new council member."""
        self.members[member.id] = member
        self.adapters[member.id] = self._create_adapter(member)
        self._save_config()
    
    def remove_member(self, member_id: str):
        """Remove a council member."""
        if member_id in self.members:
            del self.members[member_id]
            del self.adapters[member_id]
            self._save_config()
    
    def set_chairman(self, chairman_id: str):
        """Set the chairman model."""
        self.chairman_id = chairman_id
        self._save_config()
    
    def _save_config(self):
        """Save current config to YAML."""
        config = {
            "council_members": [m.model_dump(mode='json') for m in self.members.values()],
            "chairman": self.chairman_id
        }

        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, "w") as f:
            yaml.dump(config, f, default_flow_style=False)
    
    async def check_availability(self) -> dict[str, bool]:
        """Check availability of all models."""
        results = {}
        tasks = []
        
        for mid, adapter in self.adapters.items():
            tasks.append(self._check_single(mid, adapter))
        
        for mid, available in await asyncio.gather(*tasks):
            results[mid] = available
        
        return results
    
    async def _check_single(self, model_id: str, adapter: BaseAdapter):
        """Check single model availability."""
        try:
            available = await adapter.is_available()
            return model_id, available
        except:
            return model_id, False
