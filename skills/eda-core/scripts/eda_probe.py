#!/usr/bin/env python3
"""eda_probe.py CHECK DATA.csv --columns A B [...]  : run ONE check on chosen columns, for follow-ups after eda_scan.
CHECK is one of: quality missing_by_group association stratified time relational leakage.
p-values are corrected only over the columns you pass, so a probe is a follow-up, not a new discovery scan.
Needs --metadata for: time (time_column), leakage (target, measured_after_outcome). Same JSON format as eda_scan.py."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import eda_scan

if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] in ("-h", "--help"):
        print(__doc__); sys.exit(0 if len(sys.argv) > 1 else 2)
    check, rest = sys.argv[1], sys.argv[2:]
    sys.exit(eda_scan.main(rest + ["--check", check]))
