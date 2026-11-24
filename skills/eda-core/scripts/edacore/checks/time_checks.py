"""Mean changepoint and periodicity on EVERY continuous column, in time order. Permutation null for both (assumes values are exchangeable under the null)."""
from __future__ import annotations
import numpy as np
import pandas as pd
from .. import evidence as E, roles
from ..validate import bh

MIN_EFFECT_SD = 1.0
MIN_POWER_SHARE = 0.2


def _order(df, tc):
    s = df[tc]
    if roles.is_numeric(s):
        key = s.astype(float)
    else:
        parsed = pd.to_datetime(s, errors="coerce")
        if parsed.notna().mean() < 0.9:
            return None
        key = parsed.astype("int64").astype(float).where(parsed.notna())
    if key.isna().any():
        return None
    return np.argsort(key.to_numpy(), kind="stable"), key.to_numpy()


def _max_t(y, min_seg):
    n = len(y); cs = np.cumsum(y); cs2 = np.cumsum(y ** 2)
    k = np.arange(min_seg, n - min_seg + 1)
    m1 = cs[k - 1] / k; m2 = (cs[-1] - cs[k - 1]) / (n - k)
    v1 = cs2[k - 1] / k - m1 ** 2; v2 = (cs2[-1] - cs2[k - 1]) / (n - k) - m2 ** 2
    se = np.sqrt(np.maximum(v1, 1e-12) / k + np.maximum(v2, 1e-12) / (n - k))
    t = np.abs(m2 - m1) / se
    i = int(np.argmax(t))
    return float(t[i]), int(k[i]), float(m2[i] - m1[i])


def _power_share(y):
    z = y - np.polyval(np.polyfit(np.arange(len(y)), y, 1), np.arange(len(y)))
    pw = np.abs(np.fft.rfft(z)[1:]) ** 2
    tot = pw.sum()
    n = len(y); freqs = np.arange(1, len(pw) + 1)
    ok = (n / freqs >= 2) & (n / freqs <= n / 3)
    if tot <= 0 or not ok.any():
        return 0.0, None
    pw = np.where(ok, pw, 0.0); i = int(np.argmax(pw))
    return float(pw[i] / tot), float(n / freqs[i])


def run(df, ctx):
    tc = ctx["meta"].get("time_column")
    if not tc or tc not in df.columns:
        ctx["coverage"]["not_applicable"].append({"check": "changepoint+seasonality", "reason": "no time column named in metadata"})
        return []
    o = _order(df, tc)
    if o is None:
        ctx["coverage"]["not_applicable"].append({"check": "changepoint+seasonality", "reason": "time column is missing values or not numeric/date-like"})
        return []
    idx, key = o
    d = np.diff(key[idx])
    regular = bool(len(d) > 0 and np.allclose(d, d[0]))
    cols = roles.continuous(df, {tc})
    rng = np.random.default_rng(ctx["seed"] + 1)
    cp, se = [], []
    used = 0
    for c in cols:
        y = df[c].iloc[idx].to_numpy(float)
        if np.isnan(y).any() or len(y) < 60 or np.std(y) == 0:
            continue
        used += 1
        ms = max(20, len(y) // 20)
        t_obs, k, shift = _max_t(y, ms)
        null = [_max_t(rng.permutation(y), ms)[0] for _ in range(ctx["perms"])]
        cp.append((c, len(y), t_obs, k, shift, float((1 + sum(v >= t_obs for v in null)) / (ctx["perms"] + 1)), shift / float(np.std(y))))
        f, per = _power_share(y)
        nullf = [_power_share(rng.permutation(y))[0] for _ in range(ctx["perms"])]
        se.append((c, len(y), f, per, float((1 + sum(v >= f for v in nullf)) / (ctx["perms"] + 1))))
    ctx["coverage"]["time"] = {"time_column": tc, "continuous_columns_scanned": used, "rows_evenly_spaced": regular, "tests": len(cp) + len(se)}
    out = []
    lim_cp = ["permutation null treats observations as exchangeable; strong autocorrelation makes the p-value optimistic", "reports one split, the strongest; further changepoints are not searched"]
    lim_se = ["period is in rows" + ("" if regular else " and rows are NOT evenly spaced in time"), "needs at least 3 full cycles"]
    if cp:
        adj, _ = bh([t[5] for t in cp])
        for (c, n, tt, k, shift, p, eff), pa in zip(cp, adj):
            if pa < ctx["alpha"] and abs(eff) >= MIN_EFFECT_SD:
                out.append(E.make("changepoint", [c], "max_t_permutation", n, estimate=shift, p_raw=p, p_adj=float(pa),
                                  detail={"index": k, "shift": shift, "shift_in_sd": eff, "max_t": tt}, limitations=lim_cp))
    if se:
        adj, _ = bh([t[4] for t in se])
        for (c, n, f, per, p), pa in zip(se, adj):
            if pa < ctx["alpha"] and f >= MIN_POWER_SHARE and per is not None:
                out.append(E.make("seasonality", [c], "fft_peak_permutation", n, estimate=per, p_raw=p, p_adj=float(pa),
                                  detail={"period": per, "power_share": f}, limitations=lim_se))
    return out
