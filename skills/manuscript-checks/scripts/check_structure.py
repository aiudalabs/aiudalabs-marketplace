#!/usr/bin/env python3
"""Deterministic structure gate for book chapters. Zero network, zero LLM call.

Catches what an LLM reviewer can miss by being persuaded a stub is fine:
truncation markers, empty sections, and malformed markdown. This is a
SUPPLEMENT to the editorial panel, not a replacement — it catches a
different class of defect (mechanical) than reviewers catch (judgment).

Usage:
    python3 check_structure.py <book-dir> [--json]

Exit code 0 if clean, 1 if any file has a finding. `[source needed]` is
reported, never failed on — book-author's own honesty convention marks a
real gap deliberately; hiding it would be worse than the gap itself.
"""
import argparse
import json
import re
import sys
from pathlib import Path

STUB_MARKERS = [
    (re.compile(r"^\s*TODO\b", re.MULTILINE), "TODO marker"),
    (re.compile(r"^\s*FIXME\b", re.MULTILINE), "FIXME marker"),
    (re.compile(r"^\s*XXX\b", re.MULTILINE), "XXX marker"),
]
# A bare "..." on its own line inside a fenced code block is almost always a
# truncation stub, not prose ellipsis (which reads fine inline in a sentence).
CODE_FENCE = re.compile(r"```[a-zA-Z0-9_+-]*\n(.*?)```", re.DOTALL)
BARE_ELLIPSIS_IN_CODE = re.compile(r"^\s*\.\.\.\s*$", re.MULTILINE)
HEADING = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)
SOURCE_NEEDED = re.compile(r"\[source needed\]", re.IGNORECASE)


def code_fence_spans(text: str) -> list:
    """(start, end) character spans covered by fenced code blocks, so heading
    detection can skip a '# comment' inside Python that isn't a markdown
    heading — this was a real false positive on the first real-book test."""
    return [m.span() for m in CODE_FENCE.finditer(text)]


def in_any_span(pos: int, spans: list) -> bool:
    return any(start <= pos < end for start, end in spans)


def check_file(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    findings = []
    code_spans = code_fence_spans(text)

    for pattern, label in STUB_MARKERS:
        for m in pattern.finditer(text):
            if in_any_span(m.start(), code_spans):
                continue  # a TODO inside a code sample isn't the book's own stub
            line = text.count("\n", 0, m.start()) + 1
            findings.append({"line": line, "kind": label})

    for code_match in CODE_FENCE.finditer(text):
        block = code_match.group(1)
        block_start_line = text.count("\n", 0, code_match.start()) + 1
        for ell_match in BARE_ELLIPSIS_IN_CODE.finditer(block):
            line = block_start_line + block[:ell_match.start()].count("\n")
            findings.append({
                "line": line,
                "kind": "bare '...' inside a code fence — confirm this is intentional shorthand "
                        "(e.g. illustrating a signature before the full body), not truncated content",
            })

    fence_count = text.count("```")
    if fence_count % 2 != 0:
        findings.append({"line": None, "kind": f"unmatched code fence markers ({fence_count} occurrences of ```)"})

    # A heading immediately followed by a DEEPER heading (parent -> its own
    # first subsection) is normal nesting, not an empty section — only flag
    # when the next heading is a sibling or shallower with nothing between.
    headings = [m for m in HEADING.finditer(text) if not in_any_span(m.start(), code_spans)]
    for i, h in enumerate(headings):
        level = len(h.group(1))
        body_start = h.end()
        if i + 1 < len(headings):
            next_h = headings[i + 1]
            next_level = len(next_h.group(1))
            if next_level > level:
                continue  # next heading is a child subsection — fine
            body_end = next_h.start()
        else:
            body_end = len(text)
        body = text[body_start:body_end].strip()
        if not body:
            line = text.count("\n", 0, h.start()) + 1
            findings.append({"line": line, "kind": f"empty section: heading '{h.group(2).strip()}' has no content before the next same-or-higher-level heading"})

    source_needed_count = len(SOURCE_NEEDED.findall(text))

    return {"findings": findings, "source_needed_count": source_needed_count}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("book_dir", type=Path, help="Directory of chapter markdown files")
    ap.add_argument("--json", action="store_true", help="Emit machine-readable JSON instead of text")
    args = ap.parse_args()

    if not args.book_dir.is_dir():
        print(f"error: not a directory: {args.book_dir}", file=sys.stderr)
        sys.exit(2)

    files = sorted(args.book_dir.glob("*.md"))
    if not files:
        print(f"error: no .md files found in {args.book_dir}", file=sys.stderr)
        sys.exit(2)

    results = {}
    total_findings = 0
    total_source_needed = 0
    for f in files:
        r = check_file(f)
        results[f.name] = r
        total_findings += len(r["findings"])
        total_source_needed += r["source_needed_count"]

    if args.json:
        print(json.dumps({"files": results, "total_findings": total_findings, "total_source_needed": total_source_needed}, indent=2))
    else:
        print(f"Structure check: {len(files)} files, {total_findings} finding(s), {total_source_needed} declared [source needed] gap(s) (informational, not a failure)\n")
        for name, r in results.items():
            if not r["findings"]:
                continue
            print(f"{name}:")
            for finding in r["findings"]:
                where = f"line {finding['line']}" if finding["line"] else "file-level"
                print(f"  {where}: {finding['kind']}")
        if total_findings == 0:
            print("Clean — no truncation markers, empty sections, or malformed fences.")

    sys.exit(1 if total_findings > 0 else 0)


if __name__ == "__main__":
    main()
