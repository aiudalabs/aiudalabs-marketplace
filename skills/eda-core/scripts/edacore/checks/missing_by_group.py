"""Does missingness depend on an observed group? Every (column with gaps) x (group column) pair is tested, then BH-corrected."""
from __future__ import annotations
import numpy as np
import pandas as pd
from scipy import stats
from .. import evidence as E, roles
from ..validate import bh

MIN_GAP = 0.15


def run(df, ctx):
    gcols = roles.groups(df, ctx["meta"].get("group_columns", []))
    mcols = [c for c in df.columns if 0 < df[c].isna().sum() < len(df)]
    tests = []
    for c in mcols:
        miss = df[c].isna()
        for g in gcols:
            if g == c:
                continue
            tab = pd.crosstab(df[g], miss)
            if tab.shape[1] < 2 or tab.shape[0] < 2:
                continue
            exp = stats.contingency.expected_freq(tab.to_numpy())
            if exp.min() < 5:
                p = float(stats.fisher_exact(tab.to_numpy())[1]) if tab.shape == (2, 2) else None
            else:
                p = float(stats.chi2_contingency(tab.to_numpy(), correction=False)[1])
            if p is None:
                continue
            rates = miss.groupby(df[g]).mean()
            sizes = df[g].value_counts()
            rates = rates[sizes[rates.index] >= 20]
            if len(rates) < 2:
                continue
            tests.append((c, g, p, float(rates.max() - rates.min()), {str(k): round(float(v), 6) for k, v in rates.items()}))
    ctx["coverage"]["missing_by_group"] = {"columns_with_gaps": len(mcols), "group_columns": len(gcols), "tests_run": len(tests)}
    if not tests:
        return []
    adj, _ = bh([t[2] for t in tests])
    out = []
    for (c, g, p, gap, rates), pa in zip(tests, adj):
        if pa < ctx["alpha"] and gap >= MIN_GAP:
            out.append(E.make("missing_by_group", [c, g], "chi2_or_fisher+BH", len(df), estimate=gap, p_raw=p, p_adj=float(pa),
                              detail={"missing_rate_by_group": rates},
                              limitations=["shows missingness depends on an observed group; it does not tell MAR from MNAR"]))
    return out
