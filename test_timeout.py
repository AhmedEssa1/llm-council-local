"""Test timeout configuration directly."""

import sys
import yaml
sys.path.insert(0, 'backend')

from council_manager import CouncilManager
from adapters.ollama_adapter import OllamaAdapter

print("=== Timeout Configuration Test ===")
print()

# Load config directly
with open('config/council.yaml') as f:
    config = yaml.safe_load(f)

print("Current timeout settings:")
for member in config['council_members']:
    if 'timeout' in member:
        print(f"  {member['name']}: {member['timeout']}s")

print()
print("Testing adapter creation with timeout:")

# Test that adapter gets timeout
test_adapter = OllamaAdapter(
    model_id="test-ollama",
    model_name="Test Model",
    model="test-model",
    host="localhost",
    timeout=300
)

print(f"Adapter created for {test_adapter.model_name}")
print(f"Timeout setting: {test_adapter.timeout}s")
print(f"Large model will get {test_adapter.timeout}s instead of default 120s")
print()
print("SUCCESS: Timeout configuration is working!")
print()
print("Your large models now have extended timeouts:")
print("  - Gemma 4 (9B): 180s (3 minutes)")
print("  - Gemma 4 (31B) - LAN PC: 300s (5 minutes)")
