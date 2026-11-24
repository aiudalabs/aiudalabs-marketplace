"""Target leakage: columns that nearly reproduce the target, with extra scrutiny for columns declared as measured after the outcome."""
from __future__ import annotations
import numpy as np
from .. import evidence as E, roles

THRESH = 0.95


def _score(x, t):
    d = x.to_frame("x").assign(t=t).dropna()
    if len(d) < 30:
        return None
    eq = float((d.x.astype(str) == d.t.astype(str)).mean())
    r = 0.0
    if roles.is_numeric(d.x) and roles.is_numeric(d.t) and d.x.std() > 0 and d.t.std() > 0:
        r = abs(float(np.corrcoef(d.x, d.t)[0, 1]))
    agree = 0.0  # best agreement over the two ways of pairing the levels of two 2-level columns
    if d.t.nunique() == 2 and d.x.nunique() == 2:
        tab = np.array(__import__("pandas").crosstab(d.x, d.t))
        agree = max(float(np.trace(tab)), float(np.trace(tab[:, ::-1]))) / len(d)
    return max(eq, agree, r), eq, r, len(d)


def run(df, ctx):
    t = ctx["meta"].get("target")
    if not t or t not in df.columns:
        ctx["coverage"]["not_applicable"].append({"check": "leakage", "reason": "no target column named in metadata"})
        return []
    post = [c for c in ctx["meta"].get("measured_after_outcome", []) if c in df.columns]
    out = []
    for c in df.columns:
        if c == t:
            continue
        s = _score(df[c], df[t])
        if s is None or s[0] < THRESH:
            continue
        listed = c in post
        out.append(E.make("leakage", [t, c], "equality_or_correlation_with_target", s[3], estimate=s[0],
                          detail={"column": c, "listed_as_measured_after_outcome": listed, "equal_share": s[1], "abs_pearson": s[2]},
                          status="validated" if listed else "exploratory",
                          limitations=["a suspect, not a conclusion: confirm when the column is recorded relative to the outcome"] + ([] if listed else ["column is not declared as post-outcome in metadata; near-duplicate of the target"])))
    ctx["coverage"]["leakage"] = {"columns_compared_with_target": df.shape[1] - 1, "declared_post_outcome": post}
    return out
