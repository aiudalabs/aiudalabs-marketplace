"""
perplexity_research.py — Run competitor and category research via Perplexity Sonar API.

Reads PERPLEXITY_API_KEY from environment. Accepts one or more queries as CLI arguments.
Returns results as formatted markdown or JSON, with citations if the API provides them.

Usage:
    # Set API key first
    export PERPLEXITY_API_KEY=your_key_here

    # Single query
    python perplexity_research.py "B2B AI automation agency LATAM competitors"

    # Multiple queries
    python perplexity_research.py "AI consulting LATAM" "AI automation agency alternatives" "AI implementation pricing"

    # JSON output
    python perplexity_research.py "AI consulting LATAM" --format json

    # Save to file
    python perplexity_research.py "AI consulting LATAM" -o research_output.md

    # Quiet mode (suppress progress messages)
    python perplexity_research.py "AI consulting LATAM" --quiet

Requirements:
    pip install requests

The Perplexity API is compatible with the OpenAI API format.
Default model: sonar (fast, good for research queries).
"""

import sys
import os
import json
import time
import argparse
from typing import Optional


PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"
DEFAULT_MODEL = "sonar"
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5


def get_api_key() -> Optional[str]:
    """Read PERPLEXITY_API_KEY from environment. Returns None if not set."""
    return os.environ.get("PERPLEXITY_API_KEY")


def run_query(query: str, api_key: str, model: str = DEFAULT_MODEL) -> dict:
    """
    Send a single query to Perplexity API.
    Returns a dict with 'content', 'citations', and 'model'.
    Raises RuntimeError on API error.
    """
    try:
        import requests
    except ImportError:
        raise RuntimeError(
            "The 'requests' library is required. Install it with: pip install requests"
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a competitive intelligence researcher. "
                    "Provide factual, specific, and sourced information. "
                    "Focus on real companies, pricing data, and market information. "
                    "Be concise and structured."
                ),
            },
            {
                "role": "user",
                "content": query,
            },
        ],
        "max_tokens": 1024,
        "temperature": 0.2,
        "return_citations": True,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.post(
                PERPLEXITY_API_URL,
                headers=headers,
                json=payload,
                timeout=30,
            )

            if response.status_code == 429:
                wait = RETRY_DELAY_SECONDS * attempt
                print(f"[RATE LIMIT] Waiting {wait}s before retry {attempt}/{MAX_RETRIES}...", file=sys.stderr)
                time.sleep(wait)
                continue

            if response.status_code == 401:
                raise RuntimeError(
                    "Invalid API key. Check PERPLEXITY_API_KEY environment variable."
                )

            if response.status_code >= 400:
                raise RuntimeError(
                    f"API error {response.status_code}: {response.text[:200]}"
                )

            data = response.json()
            content = data["choices"][0]["message"]["content"]
            citations = data.get("citations", [])

            return {
                "query": query,
                "content": content,
                "citations": citations,
                "model": data.get("model", model),
            }

        except requests.exceptions.Timeout:
            if attempt == MAX_RETRIES:
                raise RuntimeError(f"Request timed out after {MAX_RETRIES} attempts.")
            print(f"[TIMEOUT] Retrying ({attempt}/{MAX_RETRIES})...", file=sys.stderr)
            time.sleep(RETRY_DELAY_SECONDS)

        except requests.exceptions.ConnectionError as e:
            raise RuntimeError(f"Connection error: {e}") from e

    raise RuntimeError(f"Failed after {MAX_RETRIES} attempts.")


def format_as_markdown(results: list[dict]) -> str:
    """Format query results as markdown."""
    lines = ["# Perplexity Research Results\n"]

    for i, result in enumerate(results, 1):
        lines.append(f"## Query {i}: {result['query']}\n")
        lines.append(result["content"])
        lines.append("")

        if result.get("citations"):
            lines.append("**Sources:**")
            for j, citation in enumerate(result["citations"], 1):
                if isinstance(citation, str):
                    lines.append(f"{j}. {citation}")
                elif isinstance(citation, dict):
                    url = citation.get("url", citation.get("link", str(citation)))
                    title = citation.get("title", url)
                    lines.append(f"{j}. [{title}]({url})")
            lines.append("")

        lines.append("---\n")

    return "\n".join(lines)


def format_as_json(results: list[dict]) -> str:
    """Format query results as JSON."""
    return json.dumps(results, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(
        description="Run competitor/category research queries via Perplexity Sonar API."
    )
    parser.add_argument(
        "queries",
        nargs="+",
        help="One or more research queries (wrap in quotes)",
    )
    parser.add_argument(
        "--format",
        choices=["markdown", "json"],
        default="markdown",
        help="Output format (default: markdown)",
    )
    parser.add_argument(
        "-o", "--output",
        help="Save output to file instead of stdout",
        default=None,
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Perplexity model to use (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress progress messages",
    )

    args = parser.parse_args()

    api_key = get_api_key()
    if not api_key:
        print(
            "[ERROR] PERPLEXITY_API_KEY environment variable is not set.\n"
            "Set it with: export PERPLEXITY_API_KEY=your_key_here",
            file=sys.stderr,
        )
        sys.exit(1)

    results = []
    failed = []

    for i, query in enumerate(args.queries, 1):
        if not args.quiet:
            print(f"[{i}/{len(args.queries)}] Running: {query}", file=sys.stderr)

        try:
            result = run_query(query, api_key=api_key, model=args.model)
            results.append(result)
            if not args.quiet:
                print(f"  ✓ Done ({len(result['citations'])} citations)", file=sys.stderr)
        except RuntimeError as e:
            print(f"  ✗ Failed: {e}", file=sys.stderr)
            failed.append({"query": query, "error": str(e)})

        # Small delay between queries to avoid rate limiting
        if i < len(args.queries):
            time.sleep(1)

    if not results:
        print("[ERROR] All queries failed. No results to output.", file=sys.stderr)
        sys.exit(1)

    if failed and not args.quiet:
        print(f"\n[WARNING] {len(failed)} query(ies) failed:", file=sys.stderr)
        for f in failed:
            print(f"  - {f['query']}: {f['error']}", file=sys.stderr)

    # Format output
    if args.format == "json":
        output = format_as_json(results)
    else:
        output = format_as_markdown(results)

    # Write or print
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        if not args.quiet:
            print(f"\n[INFO] Saved to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
