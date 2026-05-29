#!/usr/bin/env python3
"""
LLM Council CLI - Query multiple AI models from your terminal.

Usage:
    python council.py "What is 2+2?"
    python council.py "What's in this image?" --image photo.jpg
    python council.py "Explain this" --models ollama-gemma4,gemini-local
    python council.py "Compare these" --show-individual

Examples:
    council "What is the capital of France?"
    council "Analyze this chart" --image chart.png
    council "Code a python function" --models ollama-gemma4
"""

import sys
import argparse
import base64
import json
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional

# Fix Windows encoding issues
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def encode_image(image_path: str) -> dict:
    """Encode image to base64 for API transmission."""
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    # Get file extension for format
    ext = path.suffix.lower().lstrip('.')
    if ext not in ['jpg', 'jpeg', 'png', 'webp']:
        raise ValueError(f"Unsupported image format: {ext}. Use: jpg, png, webp")

    # Check file size (5MB limit)
    if path.stat().st_size > 5 * 1024 * 1024:
        raise ValueError(f"Image too large: {image_path}. Maximum size: 5MB")

    # Read and encode
    with open(path, 'rb') as f:
        data = base64.b64encode(f.read()).decode('utf-8')

    return {
        "data": data,
        "format": "jpeg" if ext in ['jpg', 'jpeg'] else ext,
        "size": path.stat().st_size
    }


def query_council(
    prompt: str,
    models: Optional[list[str]] = None,
    images: Optional[list[str]] = None,
    show_individual: bool = False,
    chairman: Optional[str] = None,
    api_base: str = "http://localhost:8000"
) -> dict:
    """Query the LLM Council API."""

    # Build request payload
    payload = {
        "prompt": prompt,
        "return_individual": True,
        "models": models,
        "chairman": chairman
    }

    # Add images if provided
    if images:
        image_data = []
        for img_path in images:
            try:
                encoded = encode_image(img_path)
                image_data.append(encoded)
                print(f"[IMAGE] Loaded: {img_path} ({encoded['size']} bytes)")
            except Exception as e:
                print(f"[WARN] Failed to load image {img_path}: {e}")

        if image_data:
            payload["images"] = image_data

    # Send request
    url = f"{api_base}/api/query"
    data = json.dumps(payload).encode('utf-8')

    try:
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result

    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        print(f"[ERROR] API Error: {error_msg}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"[ERROR] Cannot connect to backend at {api_base}", file=sys.stderr)
        print(f"[INFO] Start the backend: cd backend && python main.py", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)


def format_response(result: dict, show_individual: bool = False):
    """Format and display the council response."""

    print()
    print("=" * 60)
    print("[COUNCIL] LLM COUNCIL RESPONSE")
    print("=" * 60)
    print()

    # Show chairman response
    print("[CHAIRMAN] SYNTHESIZED ANSWER:")
    print("-" * 60)
    print(result.get("chairman_response", "No response"))
    print()

    # Show individual responses if requested
    if show_individual and result.get("individual_responses"):
        print("=" * 60)
        print("[MODELS] INDIVIDUAL MODEL RESPONSES:")
        print("=" * 60)
        print()

        for resp in result["individual_responses"]:
            model_name = resp.get("model_name", "Unknown")
            duration = resp.get("duration_ms")
            error = resp.get("error")
            content = resp.get("content", "")

            if error:
                print(f"[ERROR] {model_name}: {error}")
            else:
                print(f"[OK] {model_name}")
                if duration:
                    print(f"   [TIME] {duration}ms")
                print(f"   [TEXT] {content[:200]}{'...' if len(content) > 200 else ''}")
            print()

    # Show rankings if available
    if result.get("rankings"):
        print("=" * 60)
        print("[RANK] MODEL RANKINGS:")
        print("=" * 60)
        print()
        rankings = result["rankings"]
        # Sort by rank
        sorted_rankings = sorted(rankings.items(), key=lambda x: x[1])
        for model_id, rank in sorted_rankings:
            print(f"{rank}. {model_id}")
        print()

    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="LLM Council CLI - Query multiple AI models from your terminal",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python council.py "What is 2+2?"
  python council.py "What's in this image?" --image photo.jpg
  python council.py "Explain this" --models ollama-gemma4,gemini-local
  python council.py "Compare these" --show-individual
        """
    )

    parser.add_argument(
        "prompt",
        help="Your question or prompt for the AI council"
    )

    parser.add_argument(
        "--image", "-i",
        action="append",
        help="Image file to analyze (can be used multiple times, max 3)"
    )

    parser.add_argument(
        "--models", "-m",
        help="Comma-separated list of model IDs to query (default: all enabled)"
    )

    parser.add_argument(
        "--chairman", "-c",
        help="Specific model to use as chairman"
    )

    parser.add_argument(
        "--show-individual", "-s",
        action="store_true",
        help="Show individual model responses"
    )

    parser.add_argument(
        "--api", "-a",
        default="http://localhost:8000",
        help="Backend API URL (default: http://localhost:8000)"
    )

    args = parser.parse_args()

    # Parse models if provided
    models = None
    if args.models:
        models = [m.strip() for m in args.models.split(',')]

    # Validate image count
    if args.image and len(args.image) > 3:
        print("[ERROR] Maximum 3 images allowed", file=sys.stderr)
        sys.exit(1)

    # Query the council
    result = query_council(
        prompt=args.prompt,
        models=models,
        images=args.image,
        show_individual=args.show_individual,
        chairman=args.chairman,
        api_base=args.api
    )

    # Format and display response
    format_response(result, args.show_individual)


if __name__ == "__main__":
    main()
