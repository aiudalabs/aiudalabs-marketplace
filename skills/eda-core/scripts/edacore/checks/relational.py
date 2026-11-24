"""Join fan-out: does merging a second table multiply rows and inflate sums?"""
from __future__ import annotations
from .. import evidence as E, roles
from ..io_safe import EdaInputError, load_table


def run(df, ctx):
    out = []
    if not ctx["joins"]:
        ctx["coverage"]["not_applicable"].append({"check": "join_fanout", "reason": "no join given (use --join FILE:KEY)"})
        return out
    done = 0
    for spec in ctx["joins"]:
        file, _, key = spec.rpartition(":")
        try:
            right, _ = load_table(file, root=ctx.get("root"), **ctx["limits"])
        except EdaInputError as exc:
            ctx["coverage"]["not_applicable"].append({"check": "join_fanout", "reason": f"{file}: {exc.code}"})
            continue
        if key not in df.columns or key not in right.columns:
            ctx["coverage"]["not_applicable"].append({"check": "join_fanout", "reason": f"key {key!r} missing in one table"})
            continue
        done += 1
        merged = df.merge(right, on=key, how="left")
        mult = right[key].value_counts()
        if len(merged) > len(df):
            nums = [c for c in roles.continuous(df, {key}, min_distinct=2)][:3]
            sums = {c: {"before": float(df[c].sum()), "after": float(merged[c].sum())} for c in nums}
            out.append(E.make("join_fanout", [key], "left_merge_row_count", len(df), estimate=len(merged) - len(df),
                              detail={"rows_before": len(df), "rows_after": len(merged), "right_key_unique": bool(right[key].is_unique),
                                      "max_rows_per_key_in_right": int(mult.max()), "keys_duplicated_in_right": int((mult > 1).sum()), "sums": sums},
                              limitations=["aggregating after this join over-counts; join on a unique key or aggregate the right table first"]))
    ctx["coverage"]["join"] = {"joins_checked": done}
    return out
