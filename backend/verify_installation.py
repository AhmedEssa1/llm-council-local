#!/usr/bin/env python3
"""
Installation verification script for LLM Council backend.

Run this script after installing dependencies to verify everything is working correctly.

Usage:
    python verify_installation.py
"""

import sys

def test_imports():
    """Test if all required packages can be imported."""
    print("LLM Council Backend - Installation Verification")
    print("=" * 50)
    print()

    required_packages = [
        ("fastapi", "FastAPI web framework"),
        ("uvicorn", "ASGI server"),
        ("httpx", "Async HTTP client"),
        ("pydantic", "Data validation"),
        ("dotenv", "Environment variables"),
        ("yaml", "YAML configuration parser"),
        ("openai", "OpenAI API client"),
        ("anthropic", "Anthropic API client"),
        ("mcp", "Model Context Protocol server")
    ]

    all_ok = True
    failed_packages = []

    for module_name, description in required_packages:
        try:
            __import__(module_name)
            print(f"[OK] {module_name:20s} - {description}")
        except ImportError as e:
            print(f"[FAIL] {module_name:20s} - {description}")
            print(f"      Error: {e}")
            all_ok = False
            failed_packages.append(module_name)

    print()
    print("=" * 50)

    if all_ok:
        print("SUCCESS: All required dependencies installed!")
        print()
        print("You can now start the backend with:")
        print("  python main.py")
        return 0
    else:
        print("FAILED: Some dependencies are missing!")
        print()
        print(f"Missing packages: {', '.join(failed_packages)}")
        print()
        print("To install missing packages, run:")
        print("  pip install -r requirements.txt")
        return 1

def test_python_version():
    """Check if Python version is adequate."""
    print("Checking Python version...")
    version = sys.version_info

    if version.major >= 3 and version.minor >= 10:
        print(f"[OK] Python {version.major}.{version.minor}.{version.micro}")
        print()
        return True
    else:
        print(f"[FAIL] Python {version.major}.{version.minor}.{version.micro}")
        print("Required: Python 3.10 or higher")
        print()
        return False

if __name__ == "__main__":
    # Check Python version first
    if not test_python_version():
        sys.exit(1)

    # Test all imports
    exit_code = test_imports()
    sys.exit(exit_code)
