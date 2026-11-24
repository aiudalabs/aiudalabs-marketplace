"""Seeded fixtures with planted findings. Independent of the code under test: the facts are checked with pandas/numpy only."""
import numpy as np
import pandas as pd


def make(planted=(), seed=0, n=500):
    r = np.random.default_rng(seed); t = np.arange(n)
    region = r.choice(["north", "south"], n); churned = r.integers(0, 2, n)
    treated = r.integers(0, 2, n); outcome = r.integers(0, 2, n); refund = r.integers(0, 2, n)
    m = {k: r.standard_normal(n) for k in ("m1", "m2", "m3", "m4", "m5")}
    amount = r.lognormal(3, .6, n); amount[r.random(n) < .03] = np.nan
    cust = r.integers(1, n // 3, n); truth = {}
    if "simpson" in planted:
        north = region == "north"; treated = (r.random(n) < np.where(north, .09, .91)).astype(int)
        outcome = (r.random(n) < np.where(north, .8, .2) + .1 * treated).astype(int)
    if "leakage" in planted: refund = np.where(r.random(n) < .01, 1 - churned, churned)
    if "missing_by_group" in planted: amount[(region == "south") & (r.random(n) < .7)] = np.nan
    if "sentinel" in planted:
        hit = r.random(n) < .03; m["m1"][hit] = -999; truth["sentinel_count"] = int(hit.sum())
    if "nonlinear" in planted: m["m3"] = m["m2"] ** 2 + .05 * r.standard_normal(n)
    if "changepoint" in planted: truth["changepoint_index"] = 300; m["m4"] = m["m4"] + 4 * (t >= 300)
    if "seasonality" in planted: truth["period"] = 12; m["m5"] = np.sin(2 * np.pi * t / 12) + .3 * r.standard_normal(n)
    df = pd.DataFrame({"t": t, "cust_id": cust, "region": region, "churned": churned, "treated": treated, "outcome": outcome,
                       "refund_issued": refund, **m, "amount": amount})
    ids = np.unique(cust)
    lk = pd.DataFrame({"cust_id": ids, "segment": r.choice(list("abc"), len(ids))})
    if "join_fanout" in planted:
        lk = pd.concat([lk, lk.iloc[::2].assign(segment="z")]).sort_values("cust_id").reset_index(drop=True)
        truth["join_rows_after"] = int(len(df.merge(lk, on="cust_id", how="left")))
    if "duplicates" in planted:
        df = pd.concat([df, df.sample(30, random_state=seed)]).sort_values("t", kind="stable").reset_index(drop=True)
        truth["excess_copies"] = int(df.duplicated().sum())
    return df, lk, truth


META = {"target": "churned", "time_column": "t", "group_columns": ["region"], "measured_after_outcome": ["refund_issued"]}
VOCAB = {"duplicates", "missing_by_group", "sentinel", "leakage", "simpson", "nonlinear", "changepoint", "seasonality", "join_fanout"}

NEW_TYPES = {"constant_column", "near_constant_column", "all_missing_column", "label_variants", "rule_violation", "class_imbalance", "multimodal", "type_mismatch"}
