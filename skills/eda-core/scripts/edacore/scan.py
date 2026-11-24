"""Orchestrator: load -> run every applicable check over all candidates -> evidence report. Deterministic given file, metadata and seed."""
from __future__ import annotations
import json, sys
from importlib import metadata as md
from pathlib import Path
from . import __version__, evidence as E
from .checks import association, leakage, missing_by_group, quality, relational, stratified, time_checks
from .io_safe import load_table

CHECKS = {"quality": quality, "missing_by_group": missing_by_group, "association": association, "stratified": stratified,
          "time": time_checks, "relational": relational, "leakage": leakage}


def _versions():
    out = {"python": sys.version.split()[0]}
    for pkg in ("numpy", "pandas", "scipy", "agent-eda"):
        try:
            out[pkg] = md.version(pkg)
        except md.PackageNotFoundError:
            out[pkg] = None
    return out


def load_meta(path: str | None) -> dict:
    if not path:
        return {}
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    meta = {k: raw.get(k) for k in ("target", "time_column")}
    meta["group_columns"] = list(raw.get("group_columns") or raw.get("group_column_candidates") or [])
    meta["measured_after_outcome"] = list(raw.get("measured_after_outcome") or [])
    return {k: v for k, v in meta.items() if v not in (None, [])}


def scan_df(df, info: dict, meta: dict | None = None, joins=(), root=None, seed: int = 7, alpha: float = 0.05, perms: int = 499,
            max_n: int = 300, checks=None, limits=None):
    ctx = {"meta": meta or {}, "alpha": alpha, "seed": seed, "perms": perms, "max_n": max_n, "joins": list(joins), "root": root,
           "limits": limits or {}, "coverage": {"not_applicable": []}}
    findings, profile = [], {}
    for name, mod in CHECKS.items():
        if checks and name not in checks:
            continue
        res = mod.run(df, ctx)
        if name == "quality":
            res, profile = res
        findings += res
    ctx["coverage"]["checks_run"] = [n for n in CHECKS if not checks or n in checks]
    params = {"seed": seed, "alpha": alpha, "permutations": perms, "dcor_max_rows": max_n, "metadata": ctx["meta"], "joins": list(joins)}
    return E.report(info, params, _versions() | {"edacore": __version__}, ctx["coverage"], profile, findings)


def scan(path: str, metadata: str | None = None, root: str | None = None, delimiter: str | None = None, tokenize: bool = False,
         max_bytes=None, max_rows=None, max_cols=None, columns=None, **kw):
    df, info = load_table(path, root=root, delimiter=delimiter, max_bytes=max_bytes, max_rows=max_rows, max_cols=max_cols)
    info["name"] = Path(path).name
    if columns:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            from .io_safe import EdaInputError
            raise EdaInputError("unknown_column", f"not in the table: {missing[:5]}")
        df = df[list(dict.fromkeys(columns))]
        info["restricted_to_columns"] = list(df.columns)
    rep = scan_df(df, info, load_meta(metadata), root=root, limits={k: v for k, v in (("max_bytes", max_bytes), ("max_rows", max_rows), ("max_cols", max_cols)) if v}, **kw)
    return tokenize_report(rep, list(df.columns)) if tokenize else (rep, None)


def tokenize_report(rep: dict, cols: list[str]):
    """Replace column names by c001... in the report; return (report, mapping). The mapping stays out of the report."""
    mp = {c: f"c{i + 1:03d}" for i, c in enumerate(cols)}

    def sub(v, key=None):
        if isinstance(v, str):
            return mp.get(v, v)
        if isinstance(v, list):
            return [sub(x) for x in v]
        if isinstance(v, dict):
            return {(mp.get(k, k) if key in ("numeric", "missing") else k): sub(x, k) for k, x in v.items()}
        return v
    out = sub(rep)
    out["dataset"]["tokenized"] = True
    out["params"]["metadata"] = "names tokenized"
    return out, {v: k for k, v in mp.items()}
