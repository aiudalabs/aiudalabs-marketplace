"""Multiplicity control and honest splits."""
from __future__ import annotations
import numpy as np


def bh(pvals, q: float = 0.05):
    """Benjamini-Hochberg adjusted p-values (monotone). Returns (adjusted, rejected)."""
    p = np.asarray(pvals, dtype=float)
    n = len(p)
    if n == 0:
        return p, np.zeros(0, dtype=bool)
    order = np.argsort(p, kind="stable")
    ranked = p[order] * n / (np.arange(n) + 1)
    ranked = np.minimum.accumulate(ranked[::-1])[::-1]
    adj = np.empty(n)
    adj[order] = np.minimum(ranked, 1.0)
    return adj, adj <= q


def bonferroni(pvals, m: int | None = None):
    p = np.asarray(pvals, dtype=float)
    return np.minimum(p * (m if m is not None else len(p)), 1.0)


def split_halves(n: int, seed: int):
    """Deterministic 50/50 row split: (explore_idx, confirm_idx)."""
    perm = np.random.default_rng(seed).permutation(n)
    h = n // 2
    return np.sort(perm[:h]), np.sort(perm[h:])
