"""Per-column profile (types, distributions, frequencies) and single-column anomalies.
Descriptive output goes to `profile`; only threshold-crossing anomalies become findings, so an empty findings list keeps its meaning."""
from __future__ import annotations
import re
import numpy as np
import pandas as pd
from scipy import stats
from scipy.signal import find_peaks
from .. import evidence as E, roles
from ..io_safe import safe_name

NEAR_CONSTANT = 0.99
IMBALANCE = 0.10
MIN_BC = 5 / 9
MAX_VALLEY_RATIO = 0.6   # density in the valley must be under 60% of the lower peak
MIN_MODE_MASS = 0.10     # each side of the valley holds at least 10% of the rows
KDE_ROWS = 5000
RULE_KEYS = {"min", "max", "allowed", "not_null", "unique"}


def _numeric_stats(x: np.ndarray) -> dict:
    q = np.percentile(x, [5, 25, 50, 75, 95])
    out = {"n": int(len(x)), "distinct": int(len(np.unique(x))), "q05": q[0], "q25": q[1], "median": q[2], "q75": q[3], "q95": q[4],
           "zeros": int((x == 0).sum()), "negatives": int((x < 0).sum())}
    if len(x) > 3 and np.std(x) > 0:
        out["skew"] = float(stats.skew(x, bias=False)); out["excess_kurtosis"] = float(stats.kurtosis(x, bias=False))
    return out


def _bimodality(x: np.ndarray, rng):
    """Sarle's bimodality coefficient plus the two main modes of a Gaussian KDE and how deep the valley between them is.
    Returns (bc, mode_locations, valley_ratio, mass_split) or None. The coefficient alone also fires on uniform data."""
    n = len(x)
    if n < 30 or np.std(x) == 0:
        return None
    if n > KDE_ROWS:
        x = x[np.sort(rng.choice(n, KDE_ROWS, replace=False))]; n = len(x)
    g1, k = stats.skew(x, bias=False), stats.kurtosis(x, bias=False)
    bc = (g1 ** 2 + 1) / (k + 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)))
    grid = np.linspace(x.min(), x.max(), 256)
    dens = stats.gaussian_kde(x)(grid)
    peaks, _ = find_peaks(dens, prominence=0.1 * dens.max())
    if len(peaks) < 2:
        return float(bc), [float(grid[i]) for i in peaks], None, None
    top = sorted(sorted(peaks, key=lambda i: -dens[i])[:2])
    v = top[0] + int(np.argmin(dens[top[0]: top[1] + 1]))
    ratio = float(dens[v] / min(dens[top[0]], dens[top[1]]))
    left = float((x <= grid[v]).mean())
    return float(bc), [float(grid[i]) for i in top], ratio, (left, 1 - left)


def _norm_label(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def _rules(df, ctx, findings):
    rules = ctx["meta"].get("rules") or {}
    done = 0
    for col, spec in sorted(rules.items()):
        if col not in df.columns:
            ctx["coverage"]["not_applicable"].append({"check": "rules", "reason": f"rule column {safe_name(col)!r} is not in the table"})
            continue
        s = df[col]
        checks = []
        if ("min" in spec or "max" in spec) and not roles.is_numeric(s):
            ctx["coverage"]["not_applicable"].append({"check": "rules", "reason": f"min/max on non-numeric column {safe_name(col)!r}"})
        else:
            if "min" in spec: checks.append(("min", s < spec["min"]))
            if "max" in spec: checks.append(("max", s > spec["max"]))
        if "allowed" in spec: checks.append(("allowed", s.notna() & ~s.isin(spec["allowed"])))
        if spec.get("not_null"): checks.append(("not_null", s.isna()))
        if spec.get("unique"): checks.append(("unique", s.notna() & s.duplicated(keep=False)))
        for name, bad in checks:
            done += 1
            k = int(bad.sum())
            if k:
                findings.append(E.make("rule_violation", [col], f"metadata_rule:{name}", int(len(s)), estimate=k,
                                       detail={"rule": name, "limit": spec.get(name) if name != "allowed" else f"{len(spec['allowed'])} allowed values",
                                               "violations": k, "share": k / len(s), "example_rows": [int(i) for i in np.flatnonzero(bad.to_numpy())[:5]]},
                                       limitations=["the rule comes from the metadata supplied by the user; the scan did not verify it"]))
    return done


def _target(df, ctx, findings, profile):
    import agent_eda as ae
    t = ctx["meta"].get("target")
    if not t or t not in df.columns:
        return
    nun = df[t].dropna().nunique()
    if roles.is_numeric(df[t]) and nun > 20:
        profile["target"] = {"kind": "continuous", "distinct": int(nun)}
        return
    if nun < 2:
        ctx["coverage"]["not_applicable"].append({"check": "class_imbalance", "reason": "target has fewer than 2 classes"})
        return
    try:
        d = ae.profile_target(df, target_column=t, task="binary_classification" if nun == 2 else "multiclass_classification").to_json()
    except Exception as exc:  # agent-eda raises typed errors for unusable targets
        ctx["coverage"]["not_applicable"].append({"check": "class_imbalance", "reason": f"agent_eda.profile_target refused: {type(exc).__name__}"})
        return
    import json
    d = json.loads(d)
    profile["target"] = {"kind": "classes", "class_count": d["class_count"], "majority_share": d["majority_share"], "minority_share": d["minority_share"],
                         "imbalance_ratio": d["imbalance_ratio"]}
    if d["minority_share"] is not None and d["minority_share"] < IMBALANCE:
        findings.append(E.make("class_imbalance", [t], "agent_eda.profile_target", d["non_missing_count"], estimate=d["minority_share"],
                               detail={"classes": d["class_count"], "majority_share": d["majority_share"], "imbalance_ratio": d["imbalance_ratio"]},
                               limitations=["accuracy is misleading on this target; stratify splits and choose metrics accordingly"]))


def run(df, ctx):
    import agent_eda as ae
    rng = np.random.default_rng(ctx["seed"] + 2)
    findings, n = [], len(df)
    sem = ae.infer_column_semantics(df).to_frame().set_index("column")
    types, numeric, categorical = {}, {}, {}
    for c in df.columns:
        s = df[c]; nn = s.dropna()
        row = sem.loc[c] if c in sem.index else None
        types[c] = {"dtype": str(s.dtype), "logical_type": None if row is None else row["inferred_logical_type"], "missing": int(s.isna().sum()), "distinct": int(nn.nunique())}
        if len(nn) == 0:
            findings.append(E.make("all_missing_column", [c], "all_values_missing", n, estimate=n)); continue
        if row is not None and (bool(row["numbers_as_text"]) or bool(row["dates_as_text"])):
            findings.append(E.make("type_mismatch", [c], "agent_eda.infer_column_semantics", n, status="exploratory",
                                   detail={"numbers_as_text": bool(row["numbers_as_text"]), "dates_as_text": bool(row["dates_as_text"]), "non_iso_dates": bool(row["non_iso_date_text"])},
                                   limitations=["inferred from the text values; confirm the intended type with the data owner"]))
        top = nn.astype(str).value_counts()
        if nn.nunique() == 1:
            findings.append(E.make("constant_column", [c], "single_distinct_value", len(nn), estimate=1)); continue
        if len(nn) >= 100 and top.iloc[0] / len(nn) >= NEAR_CONSTANT:
            findings.append(E.make("near_constant_column", [c], "dominant_value_share", len(nn), estimate=float(top.iloc[0] / len(nn))))
        if roles.is_numeric(s):
            x = nn.to_numpy(float); st = _numeric_stats(x); numeric[c] = st
            if st["distinct"] >= 10 and not roles.id_like(s):
                bm = _bimodality(x, rng)
                if bm and bm[0] > MIN_BC and bm[2] is not None and bm[2] < MAX_VALLEY_RATIO and min(bm[3]) >= MIN_MODE_MASS:
                    findings.append(E.make("multimodal", [c], "bimodality_coefficient+kde_valley", len(x), estimate=bm[0],
                                           detail={"bimodality_coefficient": bm[0], "mode_locations": bm[1], "valley_to_peak_density": bm[2], "mass_each_side": list(bm[3])},
                                           limitations=["a mean or median alone hides this shape; consider modelling the groups separately"]))
        else:
            levels = nn.astype(str)
            vc = levels.value_counts()
            categorical[c] = {"distinct": int(len(vc)), "high_cardinality": bool(len(vc) > 0.5 * len(nn) and len(nn) > 20),
                              "top": [[safe_name(k, 40), float(v / len(nn))] for k, v in vc.head(5).items()],
                              "rare_levels_under_1pct": int((vc / len(nn) < 0.01).sum())}
            groups = {}
            for lab in vc.index:
                groups.setdefault(_norm_label(lab), []).append(lab)
            variants = [v for v in groups.values() if len(v) > 1]
            if variants:
                findings.append(E.make("label_variants", [c], "case_and_whitespace_normalisation", len(nn), estimate=len(variants),
                                       detail={"groups": [[safe_name(x, 40) for x in g] for g in variants[:5]], "groups_total": len(variants)},
                                       limitations=["labels that differ only by case or surrounding spaces; merging them is a decision for the data owner"]))
    profile = {"types": types, "numeric_distribution": numeric, "categorical": categorical}
    _target(df, ctx, findings, profile)
    rules_done = _rules(df, ctx, findings)
    ctx["coverage"]["univariate"] = {"columns_profiled": df.shape[1], "numeric": len(numeric), "categorical": len(categorical), "rule_checks_run": rules_done}
    return findings, profile
