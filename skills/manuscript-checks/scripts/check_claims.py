#!/usr/bin/env python3
"""Automated STALE detection for passport.yaml claim ledgers.

The rule in scientific-book-editor/book-author has always been "the editing
agent flips STALE entries" — but that's a convention an agent can forget,
not something enforced. This script makes it a real gate: it RE-RUNS each
chapter's test suite and reports whether the claims still hold, instead of
trusting whatever `estado`/`status` was last written to the YAML.

Deliberately per-chapter, not per-claim: real passport.yaml files in the
wild use inconsistent claim-schemas (some `test:`, some `check:`; some
claims reference more than one test in prose, e.g. "test_x (y también
test_y, test_z)") — trying to map every claim 1:1 to a single pytest node
id is fragile against that. Running the whole chapter's suite and reporting
which specific tests failed is coarser but honest: it never claims false
precision it can't back up, and a human/reviewer can still match a failing
test name back to the claim that names it.

Usage:
    python3 check_claims.py <book-dir> [--python /path/to/venv/python3]

Looks for code/*/passport.yaml under <book-dir>. Exit 0 if every chapter's
suite passes in full, 1 otherwise.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("error: PyYAML is required (pip install pyyaml)", file=sys.stderr)
    sys.exit(2)

# Matches the KNOWN-ISSUES.md convention used across this pipeline's books:
# a markdown table with a `code/chNN` cell and a `file.py::test_name` cell.
KNOWN_ISSUE_ROW = re.compile(r"\|\s*`(code/[\w-]+)`\s*\|\s*`([\w./:]+\.py::[\w:\[\]<>,. -]+)`\s*\|")


def find_passports(book_dir: Path):
    return sorted(book_dir.glob("code/*/passport.yaml"))


def load_known_issues(book_dir: Path):
    """Parse KNOWN-ISSUES.md's own table of documented, environment-sensitive
    pins (see e.g. Fundamentos de Machine Learning's §1) so this script
    doesn't cry wolf on a failure the book's own authors already investigated
    and attributed to a numpy/scikit-learn version mismatch, not staleness."""
    path = book_dir / "KNOWN-ISSUES.md"
    known = set()
    if not path.exists():
        return known
    for m in KNOWN_ISSUE_ROW.finditer(path.read_text(encoding="utf-8")):
        suite, test = m.group(1), m.group(2).strip()
        known.add((suite, test))
    return known


def load_claims(passport_path: Path):
    data = yaml.safe_load(passport_path.read_text(encoding="utf-8")) or {}
    claims = data.get("claims", [])
    return data, claims


FAILED_LINE = re.compile(r"^FAILED\s+(?:.*/)?([\w./-]+\.py::[\w:\[\]<>,. -]+?)(?:\s+-.*)?$", re.MULTILINE)


def run_pytest(python_bin: str, chapter_dir: Path):
    proc = subprocess.run(
        [python_bin, "-m", "pytest", str(chapter_dir), "-q", "--tb=no", "--no-header"],
        capture_output=True, text=True,
    )
    failed_tests = FAILED_LINE.findall(proc.stdout)
    return proc.returncode, proc.stdout, proc.stderr, failed_tests


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("book_dir", type=Path, help="Book root (contains code/chNN/passport.yaml)")
    ap.add_argument("--python", default=sys.executable, help="Python interpreter to run pytest with (use the book's own venv)")
    args = ap.parse_args()

    passports = find_passports(args.book_dir)
    if not passports:
        print(f"error: no code/*/passport.yaml found under {args.book_dir}", file=sys.stderr)
        sys.exit(2)

    known_issues = load_known_issues(args.book_dir)
    if known_issues:
        print(f"Loaded {len(known_issues)} documented environment-sensitive pin(s) from KNOWN-ISSUES.md — "
              "failures matching those are reported separately, not flagged STALE.\n")

    any_stale = False
    total_claims = 0
    total_known_hit = 0
    print(f"Claim ledger re-verification: {len(passports)} chapter passport(s)\n")

    for passport_path in passports:
        chapter_dir = passport_path.parent
        chapter_name = chapter_dir.name
        data, claims = load_claims(passport_path)
        claimed_pass = sum(1 for c in claims if str(c.get("estado", c.get("status", ""))).upper() == "PASS")
        total_claims += len(claims)

        code, out, err, failed_tests = run_pytest(args.python, chapter_dir)
        last_line = [l for l in out.strip().splitlines() if l.strip()][-1] if out.strip() else "(no output)"

        suite_key = f"code/{chapter_name}"
        unexpected = [t for t in failed_tests if (suite_key, t) not in known_issues]
        expected = [t for t in failed_tests if (suite_key, t) in known_issues]
        total_known_hit += len(expected)

        if code == 0:
            print(f"  OK       {chapter_name}: {len(claims)} claim(s), {claimed_pass} recorded PASS — {last_line}")
        elif not unexpected:
            print(f"  OK*      {chapter_name}: {len(claims)} claim(s), {claimed_pass} recorded PASS — "
                  f"{len(expected)} known environment-sensitive pin(s) failed (documented, not staleness)")
        else:
            any_stale = True
            print(f"  STALE    {chapter_name}: {len(claims)} claim(s), {claimed_pass} recorded PASS — {last_line}")
            print(f"           passport says these claims hold; re-running code/{chapter_name} disagrees.")
            print(f"           UNEXPLAINED failing test(s): {', '.join(unexpected)}")
            if expected:
                print(f"           (plus {len(expected)} known environment-sensitive pin(s), not counted above)")
            print(f"           claim ids in this passport: {', '.join(str(c.get('id', '?')) for c in claims)}")
            if err.strip():
                print(f"           stderr: {err.strip().splitlines()[-1]}")

    print()
    if any_stale:
        print("Result: one or more chapters have UNEXPLAINED failing tests — not accounted for by "
              "KNOWN-ISSUES.md. Flip the affected passport.yaml entries to STALE and re-run the "
              "phase's revision step before closing it — do not hand-wave a re-run as \"probably fine\".")
    else:
        note = f" ({total_known_hit} documented environment-sensitive pin failure(s), expected)" if total_known_hit else ""
        print(f"Result: all {total_claims} claims across {len(passports)} chapters re-verify{note}. No STALE entries.")

    sys.exit(1 if any_stale else 0)


if __name__ == "__main__":
    main()
