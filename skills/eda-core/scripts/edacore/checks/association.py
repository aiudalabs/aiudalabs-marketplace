"""Pairwise association over ALL continuous column pairs. Linear (Pearson/Spearman, BH-corrected) and non-linear
(distance correlation with a permutation p-value). Non-linear discovery is confirmed on held-out rows when there are enough."""
from __future__ import annotations
from itertools import combinations
import numpy as np
from scipy import stats
from .. import evidence as E, roles
from ..validate import bh, bonferroni, split_halves

MAX_COLS = 60
TOP_K = 20
MIN_LINEAR = 0.2
MIN_DCOR = 0.2
MIN_NONLIN_GAIN = 0.15
HOLDOUT_MIN_N = 300


def _centered(a):
    d = np.abs(a[:, None] - a[None, :])
    return d - d.mean(0) - d.mean(1)[:, None] + d.mean()


def dcor_perm(x, y, perms: int, rng, max_n: int = 300):
    """Distance correlation and a permutation p-value. Subsamples to max_n rows (seeded) to bound the O(n^2) cost."""
    x = np.asarray(x, float); y = np.asarray(y, float)
    if len(x) > max_n:
        i = np.sort(rng.choice(len(x), max_n, replace=False)); x, y = x[i], y[i]
    A, B = _centered(x), _centered(y)
    vx, vy = (A * A).mean(), (B * B).mean()
    if vx <= 0 or vy <= 0:
        return 0.0, 1.0, len(x)
    obs = (A * B).mean()
    count = 0
    for _ in range(perms):
        p = rng.permutation(len(x))
        count += (A * B[np.ix_(p, p)]).mean() >= obs
    return float(np.sqrt(max(obs, 0) / np.sqrt(vx * vy))), float((1 + count) / (perms + 1)), len(x)


def _r2_poly(x, y, deg=3):
    c = np.polyfit(x, y, deg)
    res = y - np.polyval(c, x)
    tot = ((y - y.mean()) ** 2).sum()
    return 0.0 if tot == 0 else 1 - float((res ** 2).sum() / tot)


def _screen(x, y):
    xs = (x - x.mean()) / (x.std() or 1); ys = (y - y.mean()) / (y.std() or 1)
    r2 = float(np.corrcoef(xs, ys)[0, 1] ** 2)
    return max(_r2_poly(xs, ys) - r2, _r2_poly(ys, xs) - r2)


def run(df, ctx):
    tc = ctx["meta"].get("time_column")
    cols = roles.continuous(df, {tc} if tc else set())
    capped = len(cols) > MAX_COLS
    cols = cols[:MAX_COLS]
    pairs = list(combinations(cols, 2))
    cov = {"continuous_columns": len(cols), "pairs": len(pairs), "columns_capped": capped}
    ctx["coverage"]["association"] = cov
    if len(pairs) == 0:
        ctx["coverage"]["not_applicable"].append({"check": "association", "reason": "fewer than 2 continuous columns"})
        return []
    out, lin = [], []
    for a, b in pairs:
        d = df[[a, b]].dropna()
        if len(d) < 30:
            continue
        r, pr = stats.pearsonr(d[a], d[b]); rho, ps = stats.spearmanr(d[a], d[b])
        lin.append((a, b, len(d), float(r), float(rho), min(1.0, 2 * min(pr, ps))))
    if lin:
        adj, _ = bh([t[5] for t in lin])
        for (a, b, n, r, rho, p), pa in zip(lin, adj):
            if pa < ctx["alpha"] and max(abs(r), abs(rho)) >= MIN_LINEAR:
                out.append(E.make("linear_association", [a, b], "pearson+spearman+BH", n, estimate=r, p_raw=p, p_adj=float(pa),
                                  detail={"pearson": r, "spearman": rho}, limitations=["association is not causation"]))
    cov["linear_tests"] = len(lin)
    # non-linear: screen all pairs cheaply, test the top K with a permutation test
    rng = np.random.default_rng(ctx["seed"])
    explore, confirm = split_halves(len(df), ctx["seed"])
    holdout = len(df) >= HOLDOUT_MIN_N
    cand = []
    for a, b in pairs:
        d = df[[a, b]].iloc[explore] if holdout else df[[a, b]]
        d = d.dropna()
        if len(d) < (100 if holdout else 30):
            continue
        cand.append((_screen(d[a].to_numpy(float), d[b].to_numpy(float)), a, b))
    cand.sort(key=lambda t: (-t[0], t[1], t[2]))
    top = [t for t in cand if t[0] > 0.05][:TOP_K]
    cov.update({"nonlinear_design": "holdout_confirmation" if holdout else "single_sample_bonferroni", "nonlinear_pairs_screened": len(cand), "nonlinear_pairs_tested": len(top)})
    res = []
    for s, a, b in top:
        d = (df[[a, b]].iloc[confirm] if holdout else df[[a, b]]).dropna()
        if len(d) < (100 if holdout else 30):
            continue
        x, y = d[a].to_numpy(float), d[b].to_numpy(float)
        dc, p, n_used = dcor_perm(x, y, ctx["perms"], rng, ctx["max_n"])
        lin_strength = max(abs(float(np.corrcoef(x, y)[0, 1])), abs(float(stats.spearmanr(x, y)[0])))
        res.append((a, b, dc, p, lin_strength, n_used, s))
    if res:
        pv = [t[3] for t in res]
        adj = bh(pv)[0] if holdout else bonferroni(pv, max(len(cand), 1))
        for (a, b, dc, p, ls, n_used, s), pa in zip(res, adj):
            if pa < ctx["alpha"] and dc >= MIN_DCOR and dc - ls >= MIN_NONLIN_GAIN:
                out.append(E.make("nonlinear", [a, b], "distance_correlation_permutation", n_used, estimate=dc, p_raw=p, p_adj=float(pa),
                                  detail={"dcor": dc, "max_abs_pearson_spearman": ls, "design": cov["nonlinear_design"], "screen_score": s},
                                  limitations=["dependence is not causation", "p-value from a permutation test on up to %d rows" % ctx["max_n"]]))
    return out
