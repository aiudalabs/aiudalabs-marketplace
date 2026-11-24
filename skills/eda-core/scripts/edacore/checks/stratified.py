"""Simpson's paradox: pooled treated-minus-control difference against the same difference inside every stratum."""
from __future__ import annotations
import numpy as np
from scipy import stats
from .. import evidence as E, roles

MIN_ARM = 15
MIN_EFFECT = 0.05


def _to01(s):
    vals = sorted(s.dropna().unique())
    return (s == vals[1]).astype(float).where(s.notna()), vals


def _diff(a, b):
    t, c = b[a == 1], b[a == 0]
    return (None, 0, 0) if len(t) < MIN_ARM or len(c) < MIN_ARM else (float(t.mean() - c.mean()), len(t), len(c))


def run(df, ctx):
    bins = roles.binary(df)
    gcols = roles.groups(df, ctx["meta"].get("group_columns", []), max_levels=10)
    ctx["coverage"]["stratified"] = {"binary_columns": len(bins), "stratum_columns": len(gcols)}
    if len(bins) < 2 or not gcols:
        ctx["coverage"]["not_applicable"].append({"check": "simpson", "reason": "needs two binary columns and a stratum column"})
        return []
    out, tested = [], 0
    for a in bins:
        for b in bins:
            if a == b:
                continue
            A, _ = _to01(df[a]); B, _ = _to01(df[b])
            for g in gcols:
                if g in (a, b):
                    continue
                tested += 1
                d = df[[g]].assign(A=A, B=B).dropna()
                pooled, nt, nc = _diff(d.A, d.B)
                if pooled is None or abs(pooled) < MIN_EFFECT:
                    continue
                within = {}
                for k, grp in d.groupby(g):
                    w, wt, wc = _diff(grp.A, grp.B)
                    if w is not None:
                        within[str(k)] = round(w, 6)
                if len(within) < 2 or not all(v != 0 and np.sign(v) == -np.sign(pooled) for v in within.values()):
                    continue
                p1, p0 = d.B[d.A == 1].mean(), d.B[d.A == 0].mean()
                pp = (d.B[d.A == 1].sum() + d.B[d.A == 0].sum()) / len(d)
                se = np.sqrt(max(pp * (1 - pp), 1e-12) * (1 / nt + 1 / nc))
                p = float(2 * stats.norm.sf(abs((p1 - p0) / se)))
                if p < 0.01:
                    out.append(E.make("simpson", [a, b, g], "pooled_vs_within_strata", len(d), estimate=pooled, p_raw=p,
                                      detail={"treatment_col": a, "outcome_col": b, "pooled_diff": pooled, "within_diff": within},
                                      limitations=["descriptive reversal of sign; it does not say which sign is causal", "treatment/outcome roles are assumed from column order, confirm with the data owner"]))
    ctx["coverage"]["stratified"]["combinations_tested"] = tested
    return out
