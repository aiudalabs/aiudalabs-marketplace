---
name: "manuscript-checks"
description: "Deterministic checks for a book or paper manuscript that an LLM reviewer can be talked out of: stub and truncation markers, empty sections and broken markdown; readability outliers between chapters; and re-running each chapter's tests to confirm the numbers in its claim ledger still hold. Use before an editorial review, before production, or when a workflow asks for the manuscript checks."
license: "MIT"
compatibility: "Needs Python 3. check_claims.py also needs pytest and pyyaml in the Python environment that runs the book's code."
metadata:
  version: "0.1.0"
  author: "aiudalabs"
  source: "https://github.com/aiudalabs/aimprenta"
  requires-tools: "python3"
---

# Manuscript checks

Three scripts that check a manuscript mechanically. They catch a different class of defect from reviewers: things that are wrong whatever anyone thinks of the prose. Run them, read the output, and report it as it is.

Run each script from this skill's folder. Each one takes the folder that directly contains the chapter files (`*.md`), such as `book/chapters`; it does not search subfolders.

## Structure

```bash
python3 scripts/check_structure.py <book-dir> [--json]
```

Finds truncation and stub markers, empty sections and malformed markdown in each chapter. Exit code 1 if any file has a finding. `[source needed]` markers are reported, never failed on: they mark a real gap on purpose.

## Readability

```bash
python3 scripts/check_readability.py <book-dir> [--outlier-threshold 15] [--json] [--strict]
```

Computes Flesch Reading Ease per chapter and flags chapters that are outliers against the book's own average. It is advisory and exits 0 unless `--strict` is passed. It is a blunt measure; use it beside a human or model clarity review, never instead of one.

## Claims

```bash
python3 scripts/check_claims.py <book-dir> [--python /path/to/python3]
```

For books with executable chapters: looks for `code/*/passport.yaml` claim ledgers, re-runs each chapter's test suite, and reports whether the claims still hold. Exit code 0 when every chapter passes. Use `--python` to point at the environment where the book's code runs.

## Reporting

Paste each script's output into the review or production report. Do not summarize a failing check as passing, and do not skip a check because the manuscript looks fine.
