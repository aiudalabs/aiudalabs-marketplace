"""Safe, bounded table loading. Fails closed with a typed error code; never executes or follows anything in the file."""
from __future__ import annotations
import csv, hashlib, io, re
from pathlib import Path
import pandas as pd

LIMITS = {"max_bytes": 64 * 1024 * 1024, "max_rows": 1_000_000, "max_cols": 512}
SUFFIXES = {".csv", ".tsv", ".txt"}


class EdaInputError(Exception):
    """User-causable input problem. `code` is stable and machine-readable."""
    def __init__(self, code: str, message: str):
        super().__init__(f"{code}: {message}")
        self.code, self.message = code, message


def safe_name(name: object, limit: int = 64) -> str:
    """Strip control characters and cut length. Column names are untrusted text, never instructions."""
    text = re.sub(r"[\x00-\x1f\x7f]", " ", str(name))
    return re.sub(r"\s+", " ", text).strip()[:limit] or "unnamed"


def sniff_delimiter(text: str) -> str:
    lines = [ln for ln in text.splitlines()[:20] if ln.strip()]
    if not lines:
        return ","
    best, best_score = ",", (0, 0)
    for cand in (",", ";", "\t", "|"):
        counts = [ln.count(cand) for ln in lines]
        if counts[0] == 0:
            continue
        consistent = sum(c == counts[0] for c in counts)
        score = (consistent, counts[0])
        if score > best_score:
            best, best_score = cand, score
    return best


def _resolve(path: str, root: str | None) -> Path:
    p = Path(path)
    if p.is_symlink():
        raise EdaInputError("symlink_rejected", "input path is a symbolic link")
    p = p.resolve()
    if root is not None and Path(root).resolve() not in p.parents:
        raise EdaInputError("outside_root", "input path is outside the allowed root")
    if not p.is_file():
        raise EdaInputError("not_a_file", "input is not a regular file")
    if p.suffix.lower() not in SUFFIXES:
        raise EdaInputError("unsupported_format", f"only {sorted(SUFFIXES)} are supported, got {p.suffix or 'no suffix'}")
    return p


def load_table(path: str, root: str | None = None, delimiter: str | None = None, **limits):
    """Return (DataFrame, info). `info` records everything needed to reproduce and audit the read."""
    lim = {**LIMITS, **{k: v for k, v in limits.items() if v is not None}}
    p = _resolve(path, root)
    size = p.stat().st_size
    if size > lim["max_bytes"]:
        raise EdaInputError("too_large", f"{size} bytes exceeds max_bytes={lim['max_bytes']}")
    raw = p.read_bytes()
    if not raw.strip():
        raise EdaInputError("empty_file", "file has no content")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise EdaInputError("not_utf8", "file is not valid UTF-8; convert it first (guessing an encoding could corrupt values)")
    delim = delimiter or sniff_delimiter(text)
    try:
        df = pd.read_csv(io.StringIO(text), sep=delim, nrows=lim["max_rows"] + 1, on_bad_lines="error", skip_blank_lines=True)
    except pd.errors.EmptyDataError:
        raise EdaInputError("empty_file", "no columns found")
    except (pd.errors.ParserError, ValueError) as exc:
        raise EdaInputError("ragged_rows", f"rows do not all have the same number of fields ({str(exc)[:80]})")
    truncated = len(df) > lim["max_rows"]
    if truncated:
        df = df.iloc[: lim["max_rows"]]
    if df.shape[1] > lim["max_cols"]:
        raise EdaInputError("too_many_columns", f"{df.shape[1]} columns exceeds max_cols={lim['max_cols']}")
    if len(df) == 0:
        raise EdaInputError("no_rows", "header only, no data rows")
    original = [str(c) for c in df.columns]
    names, seen = [], set()
    for i, c in enumerate(original):
        s = safe_name(c)
        while s in seen:
            s = f"{s}_{i}"
        seen.add(s)
        names.append(s)
    df.columns = names
    info = {
        "sha256": hashlib.sha256(raw).hexdigest(), "bytes": size, "rows": int(len(df)), "cols": int(df.shape[1]),
        "delimiter": {",": "comma", ";": "semicolon", "\t": "tab", "|": "pipe"}.get(delim, delim),
        "rows_truncated": bool(truncated), "limits": lim, "na_policy": "pandas default NA strings and empty cells",
        "column_names_changed": sum(a != b for a, b in zip(original, names)),
    }
    return df, info
