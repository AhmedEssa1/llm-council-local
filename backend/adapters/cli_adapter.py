"""CLI adapter for local CLI-based models (claude, gemini)."""

import asyncio
import shutil
from typing import Optional, TYPE_CHECKING
from .base import BaseAdapter

if TYPE_CHECKING:
    from models.schemas import ImageData


class CLIAdapter(BaseAdapter):
    """Adapter for CLI-based models (claude CLI, gemini CLI)."""
    
    def __init__(self, model_id: str, model_name: str, command: str, args: list[str] = None):
        super().__init__(model_id, model_name)
        self.command = command
        self.args = args or []
    
    async def generate(self, prompt: str, images: Optional[list["ImageData"]] = None) -> str:
        """Execute CLI command and return response. Images are ignored (CLI tools don't support images)."""
        try:
            import platform

            # Escape the prompt properly for command-line usage
            # Replace newlines with spaces and escape special characters
            safe_prompt = prompt.replace('\n', ' ').replace('\r', ' ')

            # Remove patterns that could be interpreted as command-line options
            # Remove double dashes, remove asterisk patterns, remove backticks
            safe_prompt = safe_prompt.replace('--', ' ')  # Remove double dashes (CLI options)
            safe_prompt = safe_prompt.replace('**', ' ')   # Remove bold markdown
            safe_prompt = safe_prompt.replace('* ', ' ')   # Remove italic markdown
            safe_prompt = safe_prompt.replace('`', ' ')    # Remove code markdown
            safe_prompt = safe_prompt.replace('"', "'")    # Replace double quotes with single
            safe_prompt = safe_prompt.replace('(', '[')    # Replace parens to avoid issues
            safe_prompt = safe_prompt.replace(')', ']')
            safe_prompt = ' '.join(safe_prompt.split())   # Clean up multiple spaces

            # Build the full command
            full_args = self.args + [safe_prompt]

            # Windows-specific handling for .CMD/.BAT files
            if platform.system() == "Windows":
                # On Windows, use shell=True to properly execute .CMD/.BAT files
                command_line = [self.command] + full_args
                # Join with spaces and let shell handle execution
                # Better escaping: wrap everything with spaces in quotes, escape quotes
                escaped_args = []
                for arg in command_line:
                    if " " in arg or any(c in arg for c in ['&', '|', '>', '<', '^']):
                        # Escape quotes and wrap in quotes
                        safe_arg = arg.replace('"', '\\"')
                        escaped_args.append(f'"{safe_arg}"')
                    else:
                        escaped_args.append(arg)

                cmd_str = " ".join(escaped_args)

                proc = await asyncio.create_subprocess_shell(
                    cmd_str,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    stdin=asyncio.subprocess.DEVNULL  # Don't pass stdin
                )
            else:
                # Unix-like systems use direct execution
                proc = await asyncio.create_subprocess_exec(
                    self.command,
                    *full_args,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    stdin=asyncio.subprocess.DEVNULL  # Don't pass stdin
                )

            # Add timeout to prevent hanging
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60.0)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                raise RuntimeError(f"CLI command timed out after 60 seconds")

            if proc.returncode != 0:
                error_msg = stderr.decode().strip() or f"Exit code: {proc.returncode}"
                raise RuntimeError(f"CLI error: {error_msg}")

            return stdout.decode().strip()

        except FileNotFoundError:
            raise RuntimeError(
                f"CLI command not found: '{self.command}'. "
                f"Please install {self.command} or disable this model in config/council.yaml. "
                f"You can disable it by setting: enabled: false"
            )
        except Exception as e:
            if "timed out" in str(e):
                raise RuntimeError(
                    f"CLI command '{self.command}' timed out after 60 seconds. "
                    f"The command may be hanging or waiting for input."
                )
            raise RuntimeError(f"CLI adapter error for '{self.command}': {str(e)}")
    
    async def is_available(self) -> bool:
        """Check if the CLI command exists and can run."""
        import platform

        # First check if command is on PATH
        if not shutil.which(self.command):
            return False

        # On Windows, also test if it can actually execute
        if platform.system() == "Windows":
            try:
                # Try to run with --version or --help flag
                test_cmd = f'"{self.command}" --version'
                proc = await asyncio.create_subprocess_shell(
                    test_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                await proc.communicate()
                # If we got here without exception, command works
                return True
            except Exception:
                return False

        return True
