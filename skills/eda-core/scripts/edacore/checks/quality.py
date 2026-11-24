"""Structure and data quality. Delegates the first-look analyses to the `agent-eda` package (pinned), adapts its results to evidence."""
from __future__ import annotations
import json
import numpy as np
from scipy import stats
from .. import evidence as E, roles


def run(df, ctx):
    import agent_eda as ae
    findings, profile = [], {}
    n = len(df)
    dup = json.loads(ae.find_duplicate_rows(df).to_json())
    if dup.get("excess_copy_count", 0) > 0:
        findings.append(E.make("duplicates", [], "agent_eda.find_duplicate_rows", n, estimate=dup["excess_copy_count"],
                               detail={"duplicate_groups": dup["duplicate_group_count"], "rows_in_groups": dup["duplicate_group_row_count"],
                                       "share": dup["duplicate_share"]}))
    sen = ae.detect_missing_sentinels(df).to_frame()
    for _, r in sen.iterrows():
        findings.append(E.make("sentinel", [str(r["column"])], "agent_eda.detect_missing_sentinels", n, estimate=int(r["count"]),
                               status="exploratory", detail={"value": r["value"] if isinstance(r["value"], (int, float, str)) else str(r["value"]),
                                                              "share": float(r["share"])},
                               limitations=["heuristic: a repeated extreme value that may stand in for missing; confirm with the data dictionary"]))
    mv = ae.profile_missing_values(df).to_frame()
    profile["missing"] = {str(r["column"]): {"missing": int(r["missing_count"]), "share": float(r["missing_share"])} for _, r in mv.iterrows() if r["missing_count"] > 0}
    sn = ae.summarize_numeric(df).to_frame()
    cols = {}
    for _, r in sn.iterrows():
        cols[str(r["column"])] = {k: (None if k not in r or r[k] is None else float(r[k])) for k in ("mean", "std", "min", "max") if k in r.index}
    profile["numeric"] = cols
    keys = ae.find_candidate_keys(df).to_frame()
    profile["candidate_keys"] = [str(r["columns"]) for _, r in keys.iterrows() if bool(r.get("is_minimal")) and float(r["uniqueness_share"]) == 1.0][:5]
    # robustness: mean vs trimmed mean and IQR-fence outliers, reported only when they move the picture
    for c in roles.continuous(df, min_distinct=10):
        x = df[c].dropna().to_numpy(float)
        if len(x) < 30 or np.std(x) == 0:
            continue
        q1, q3 = np.percentile(x, [25, 75])
        iqr = q3 - q1
        out_share = float(np.mean((x < q1 - 1.5 * iqr) | (x > q3 + 1.5 * iqr))) if iqr > 0 else 0.0
        gap = abs(float(x.mean()) - float(stats.trim_mean(x, 0.1))) / float(np.std(x, ddof=1))
        if out_share > 0.01 and gap > 0.1:
            findings.append(E.make("outlier_sensitivity", [c], "iqr_fence+trimmed_mean", len(x), estimate=out_share,
                                   detail={"mean": float(x.mean()), "trimmed_mean_10pct": float(stats.trim_mean(x, 0.1)), "gap_in_sd": gap},
                                   limitations=["descriptive; outliers are flagged, never removed"]))
    ctx["coverage"]["quality"] = {"columns": df.shape[1], "numeric_columns_checked_for_outliers": len(roles.continuous(df))}
    return findings, profile
