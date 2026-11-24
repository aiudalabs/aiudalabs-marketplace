#!/usr/bin/env python3
"""eda_scan.py DATA.csv [--metadata meta.json] [--join other.csv:KEY ...] [--seed 7] [--out evidence.json]
Runs every applicable check over all columns and pairs, writes one deterministic evidence JSON. See SKILL.md."""
import argparse, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from edacore import evidence as E
from edacore.io_safe import EdaInputError
from edacore.scan import scan


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("data"); ap.add_argument("--metadata"); ap.add_argument("--join", action="append", default=[], metavar="FILE:KEY")
    ap.add_argument("--root", help="only read files inside this directory"); ap.add_argument("--delimiter")
    ap.add_argument("--seed", type=int, default=7); ap.add_argument("--alpha", type=float, default=0.05)
    ap.add_argument("--permutations", type=int, default=499); ap.add_argument("--dcor-max-rows", type=int, default=300)
    ap.add_argument("--max-bytes", type=int); ap.add_argument("--max-rows", type=int); ap.add_argument("--max-cols", type=int)
    ap.add_argument("--tokenize", action="store_true", help="replace column names by c001... in the report (mapping goes to --map-out)")
    ap.add_argument("--map-out"); ap.add_argument("--out"); ap.add_argument("--force", action="store_true")
    ap.add_argument("--check", action="append", help="run only this check (repeatable); see eda_probe.py"); ap.add_argument("--columns", nargs="+")
    a = ap.parse_args(argv)
    try:
        rep, mapping = scan(a.data, metadata=a.metadata, root=a.root, delimiter=a.delimiter, tokenize=a.tokenize, max_bytes=a.max_bytes, max_rows=a.max_rows,
                            max_cols=a.max_cols, columns=a.columns, joins=a.join, seed=a.seed, alpha=a.alpha, perms=a.permutations, max_n=a.dcor_max_rows, checks=a.check)
    except EdaInputError as exc:
        print(json.dumps({"tool": "eda-core", "error": {"code": exc.code, "message": exc.message}}, indent=1))
        return 2
    except ModuleNotFoundError as exc:
        print(json.dumps({"tool": "eda-core", "error": {"code": "missing_dependency", "message": str(exc)}}, indent=1))
        return 3
    text = E.dumps(rep)
    if a.out:
        out = Path(a.out)
        if out.exists() and not a.force:
            print(json.dumps({"tool": "eda-core", "error": {"code": "output_exists", "message": "use --force to overwrite"}}))
            return 2
        out.write_text(text, encoding="utf-8")
        print(f"wrote {out} ({len(rep['findings'])} findings)")
    else:
        sys.stdout.write(text)
    if a.map_out and mapping:
        Path(a.map_out).write_text(json.dumps(mapping, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
