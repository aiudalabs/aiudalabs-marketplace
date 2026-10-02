"""
extract_site_text.py — Extract readable text from a URL or local HTML file.

Outputs clean markdown-style text, removing scripts, styles, nav, and footer noise.

Usage:
    # From URL
    python extract_site_text.py https://example.com

    # From local HTML file
    python extract_site_text.py path/to/page.html

    # Save to file
    python extract_site_text.py https://example.com -o site_text.md

    # Verbose mode (shows what tags were removed)
    python extract_site_text.py https://example.com --verbose

Requirements:
    pip install requests beautifulsoup4

Falls back to stdlib urllib if requests is unavailable.
"""

import sys
import os
import re
import argparse
from pathlib import Path


def fetch_url(url: str, timeout: int = 15) -> str:
    """Fetch HTML content from a URL. Tries requests first, then urllib."""
    try:
        import requests
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        return response.text
    except ImportError:
        from urllib.request import urlopen, Request
        from urllib.error import URLError, HTTPError
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urlopen(req, timeout=timeout) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except (URLError, HTTPError) as e:
            raise RuntimeError(f"Failed to fetch {url}: {e}") from e


def read_local_file(path: str) -> str:
    """Read HTML from a local file."""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def extract_text(html: str, verbose: bool = False) -> str:
    """
    Extract readable text from HTML.
    Uses BeautifulSoup if available, falls back to regex stripping.
    """
    try:
        from bs4 import BeautifulSoup
        return _extract_with_bs4(html, verbose)
    except ImportError:
        if verbose:
            print("[WARNING] beautifulsoup4 not installed. Using regex fallback (lower quality).", file=sys.stderr)
        return _extract_with_regex(html)


def _extract_with_bs4(html: str, verbose: bool = False) -> str:
    """Full extraction using BeautifulSoup."""
    from bs4 import BeautifulSoup, Comment

    soup = BeautifulSoup(html, "html.parser")

    # Tags to remove entirely
    noise_tags = [
        "script", "style", "noscript", "iframe", "svg", "img",
        "nav", "header", "footer", "aside", "form",
        "meta", "link", "button", "input", "select", "textarea",
        "cookie-consent", "cookie-banner",
    ]

    removed_counts = {}
    for tag_name in noise_tags:
        tags = soup.find_all(tag_name)
        removed_counts[tag_name] = len(tags)
        for tag in tags:
            tag.decompose()

    # Remove HTML comments
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # Remove elements with noise class/id patterns
    noise_patterns = re.compile(
        r"(nav|navigation|header|footer|sidebar|cookie|banner|popup|modal|overlay|ad-|advertisement|widget)",
        re.IGNORECASE
    )
    for tag in soup.find_all(True):
        class_str = " ".join(tag.get("class", []))
        id_str = tag.get("id", "")
        if noise_patterns.search(class_str) or noise_patterns.search(id_str):
            tag.decompose()

    if verbose:
        for tag, count in removed_counts.items():
            if count > 0:
                print(f"[REMOVED] {count} <{tag}> tags", file=sys.stderr)

    # Extract structured text
    sections = []
    for tag in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote", "td", "th"]):
        text = tag.get_text(separator=" ", strip=True)
        if not text or len(text) < 3:
            continue

        tag_name = tag.name
        if tag_name == "h1":
            sections.append(f"\n# {text}\n")
        elif tag_name == "h2":
            sections.append(f"\n## {text}\n")
        elif tag_name == "h3":
            sections.append(f"\n### {text}\n")
        elif tag_name in ("h4", "h5", "h6"):
            sections.append(f"\n#### {text}\n")
        elif tag_name == "li":
            sections.append(f"- {text}")
        elif tag_name == "blockquote":
            sections.append(f"> {text}")
        else:
            sections.append(text)

    result = "\n".join(sections)

    # Clean up excessive blank lines
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


def _extract_with_regex(html: str) -> str:
    """Fallback regex-based extraction when BeautifulSoup is unavailable."""
    # Remove script and style blocks
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)

    # Replace headings
    html = re.sub(r"<h1[^>]*>(.*?)</h1>", r"\n# \1\n", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<h2[^>]*>(.*?)</h2>", r"\n## \1\n", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<h3[^>]*>(.*?)</h3>", r"\n### \1\n", html, flags=re.DOTALL | re.IGNORECASE)

    # Replace list items
    html = re.sub(r"<li[^>]*>(.*?)</li>", r"\n- \1", html, flags=re.DOTALL | re.IGNORECASE)

    # Replace paragraph and div breaks
    html = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    html = re.sub(r"</p>|</div>|</section>|</article>", "\n", html, flags=re.IGNORECASE)

    # Remove remaining tags
    html = re.sub(r"<[^>]+>", "", html)

    # Decode common HTML entities
    html = html.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    html = html.replace("&nbsp;", " ").replace("&quot;", '"').replace("&#39;", "'")

    # Clean whitespace
    lines = [line.strip() for line in html.split("\n")]
    lines = [line for line in lines if line]
    result = "\n".join(lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


def main():
    parser = argparse.ArgumentParser(
        description="Extract readable text from a URL or HTML file for startup positioning audit."
    )
    parser.add_argument("source", help="URL (http/https) or path to local HTML file")
    parser.add_argument("-o", "--output", help="Output file path (default: stdout)", default=None)
    parser.add_argument("--verbose", action="store_true", help="Show extraction stats")
    parser.add_argument("--timeout", type=int, default=15, help="Request timeout in seconds (default: 15)")

    args = parser.parse_args()
    source = args.source

    try:
        if source.startswith("http://") or source.startswith("https://"):
            if args.verbose:
                print(f"[INFO] Fetching: {source}", file=sys.stderr)
            html = fetch_url(source, timeout=args.timeout)
        elif Path(source).exists():
            if args.verbose:
                print(f"[INFO] Reading file: {source}", file=sys.stderr)
            html = read_local_file(source)
        else:
            print(f"[ERROR] '{source}' is not a valid URL or existing file.", file=sys.stderr)
            sys.exit(1)

        text = extract_text(html, verbose=args.verbose)

        if not text.strip():
            print("[WARNING] Extracted text is empty. The page may be JavaScript-rendered.", file=sys.stderr)

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"[INFO] Saved to {args.output} ({len(text)} characters)", file=sys.stderr)
        else:
            print(text)

    except RuntimeError as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
