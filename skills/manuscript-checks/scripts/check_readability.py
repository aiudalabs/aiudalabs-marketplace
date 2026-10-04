#!/usr/bin/env python3
"""Deterministic readability gate. Zero network, zero LLM call, zero deps.

Computes Flesch Reading Ease per chapter using a standard vowel-group
syllable heuristic. This does NOT replace the sciwrite clarity pass —
Flesch is a blunt, mechanical proxy (it cannot tell "clear" from "simple
but wrong"), which is exactly why it belongs alongside LLM judgment rather
than instead of it: it cannot be talked into a favorable score by a
confident-sounding chapter the way a reviewer occasionally can.

Flags chapters as OUTLIERS relative to the book's own average, not against
a universal threshold — a technical book's "good" score is audience- and
subject-dependent (book-author's Stage 1 interview sets that), so this
script has no opinion on what the right absolute number is for your book.

Usage:
    python3 check_readability.py <book-dir> [--outlier-threshold 15] [--json]

Exit code 0 always (advisory, not blocking) unless --strict is passed.
"""
import argparse
import json
import re
import sys
from pathlib import Path

WORD_RE = re.compile(r"[A-Za-z']+")
SENTENCE_END_RE = re.compile(r"[.!?]+(?:\s|$)")
CODE_FENCE = re.compile(r"```.*?```", re.DOTALL)
INLINE_CODE = re.compile(r"`[^`]*`")
MATH_BLOCK = re.compile(r"\$\$.*?\$\$", re.DOTALL)
MATH_INLINE = re.compile(r"\$[^$\n]*\$")
MD_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
HEADING_OR_TABLE_ROW = re.compile(r"^(#{1,6}\s.*|\|.*\|)$", re.MULTILINE)
FRONTMATTER_COMMENT = re.compile(r"^<!--.*?-->\s*", re.DOTALL)


def strip_non_prose(text: str) -> str:
    """Remove code, math, tables, headings, and markdown link syntax — Flesch
    should score the PROSE, not source code or LaTeX, which aren't sentences."""
    text = FRONTMATTER_COMMENT.sub("", text, count=1)
    text = CODE_FENCE.sub(" ", text)
    text = MATH_BLOCK.sub(" ", text)
    text = MATH_INLINE.sub(" ", text)
    text = INLINE_CODE.sub(" ", text)
    text = HEADING_OR_TABLE_ROW.sub(" ", text)
    text = MD_LINK.sub(r"\1", text)
    return text


def count_syllables(word: str) -> int:
    word = word.lower()
    if not word:
        return 0
    vowel_groups = re.findall(r"[aeiouy]+", word)
    count = len(vowel_groups)
    if word.endswith("e") and not word.endswith("le") and count > 1:
        count -= 1
    return max(count, 1)


def flesch_reading_ease(text: str) -> dict:
    prose = strip_non_prose(text)
    words = WORD_RE.findall(prose)
    sentences = [s for s in SENTENCE_END_RE.split(prose) if s.strip()]
    n_words = len(words)
    n_sentences = max(len(sentences), 1)
    n_syllables = sum(count_syllables(w) for w in words)

    if n_words == 0:
        return {"score": None, "words": 0, "sentences": 0, "syllables": 0}

    score = 206.835 - 1.015 * (n_words / n_sentences) - 84.6 * (n_syllables / n_words)
    return {"score": round(score, 1), "words": n_words, "sentences": n_sentences, "syllables": n_syllables}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("book_dir", type=Path)
    ap.add_argument("--outlier-threshold", type=float, default=15.0,
                     help="Flag a chapter whose score differs from the book average by more than this many points (default 15)")
    ap.add_argument("--strict", action="store_true", help="Exit 1 if any outlier is found")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    files = sorted(args.book_dir.glob("*.md"))
    if not files:
        print(f"error: no .md files found in {args.book_dir}", file=sys.stderr)
        sys.exit(2)

    per_file = {}
    scores = []
    for f in files:
        r = flesch_reading_ease(f.read_text(encoding="utf-8"))
        per_file[f.name] = r
        if r["score"] is not None:
            scores.append(r["score"])

    avg = sum(scores) / len(scores) if scores else 0.0
    outliers = {name: r for name, r in per_file.items()
                if r["score"] is not None and abs(r["score"] - avg) > args.outlier_threshold}

    if args.json:
        print(json.dumps({"per_file": per_file, "average": round(avg, 1), "outliers": list(outliers.keys())}, indent=2))
    else:
        print(f"Readability check (Flesch Reading Ease, higher = easier): {len(files)} files, book average {avg:.1f}\n")
        for name, r in per_file.items():
            flag = "  <-- outlier" if name in outliers else ""
            score_str = f"{r['score']:>6.1f}" if r["score"] is not None else "   n/a"
            print(f"  {score_str}  {name} ({r['words']} words){flag}")
        if outliers:
            print(f"\n{len(outliers)} outlier(s) beyond ±{args.outlier_threshold} pts from the book average — "
                  "not necessarily wrong, but worth a look: a chapter reading very differently from its "
                  "siblings is either a deliberate register shift or a drafting agent that drifted.")
        else:
            print("\nNo outliers — chapters read at a consistent register.")

    if args.strict and outliers:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
