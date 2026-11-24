"""Column roles inferred from the data, so every check loops over all candidates instead of the first interesting column."""
from __future__ import annotations
import pandas as pd
from pandas.api.types import is_bool_dtype, is_numeric_dtype


def is_numeric(s: pd.Series) -> bool:
    return is_numeric_dtype(s) and not is_bool_dtype(s)


def id_like(s: pd.Series) -> bool:
    """All-unique integers or strings look like row ids or indexes. All-unique floats are just continuous values."""
    nn = s.dropna()
    if len(nn) <= 5 or nn.nunique() != len(nn):
        return False
    return not pd.api.types.is_float_dtype(nn)


def continuous(df: pd.DataFrame, exclude: set[str] = frozenset(), min_distinct: int = 10) -> list[str]:
    return [c for c in df.columns if c not in exclude and is_numeric(df[c]) and df[c].dropna().nunique() >= min_distinct and not id_like(df[c])]


def binary(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if df[c].dropna().nunique() == 2]


def groups(df: pd.DataFrame, extra: list[str] = (), max_levels: int = 20) -> list[str]:
    out = [c for c in df.columns if not is_numeric(df[c]) and 2 <= df[c].dropna().nunique() <= max_levels]
    for c in extra:
        if c in df.columns and c not in out and 2 <= df[c].dropna().nunique() <= max_levels:
            out.append(c)
    return out
