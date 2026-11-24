---
name: eda-core
description: Use when asked to explore a tabular dataset (CSV or TSV) and report verified findings. Runs a deterministic scan over every column and pair, returns evidence with stable ids, and says how to read it and what never to claim.
license: MIT
compatibility: Python 3.12+ with numpy, pandas, scipy and agent-eda==0.1.0 (pip install numpy pandas scipy agent-eda==0.1.0). Scripts need no network access and never modify the input file.
metadata:
  version: "0.2.0"
---

# eda-core

The scan does the counting. You read its evidence, decide what to look at next, and report. Every number in your answer must come from a finding in the evidence file.

## Ask first

The scan cannot know these. Ask the user, or say you are assuming them, before you interpret anything: what question the analysis serves, what one row represents, what the columns mean and their units, and what ranges or allowed values are valid. Put the last one in `rules` below.

## Run the scan

1. Write `meta.json` from what the user told you. Include only what you know: `target`, `time_column`, `group_columns`, `measured_after_outcome` (columns recorded after the outcome), and `rules`, for example `{"age": {"min": 0, "max": 120}, "plan": {"allowed": ["basic", "pro"]}, "id": {"unique": true, "not_null": true}}`. Rules are data: only `min`, `max`, `allowed`, `not_null` and `unique` are read. Leave out unknowns; the scan reports the checks it could not apply.
2. Run, from this skill's folder:
   `python scripts/eda_scan.py DATA.csv --metadata meta.json --out evidence.json`
   Add `--join OTHER.csv:KEY` for each extra table that shares a key. Add `--tokenize --map-out map.json` when column names must not appear in your context.
3. Read `coverage` before the findings: how many columns and pairs were checked, and `not_applicable` with the reason for each skipped check. Say both in your answer.

## Read the evidence

Each finding has `id`, `type`, `columns`, `estimate`, `p_adj`, `status`, `detail` and `limitations`.

- `validated`: an exact fact (duplicates, join fan-out) or a result that survived the stated correction (Benjamini-Hochberg, or confirmation on held-out rows).
- `exploratory`: flagged but not confirmed. Say so in the report.
- Types: `duplicates`, `sentinel`, `missing_by_group`, `linear_association`, `nonlinear`, `simpson`, `changepoint`, `seasonality`, `join_fanout`, `leakage`, `outlier_sensitivity`, `rule_violation`, `label_variants`, `type_mismatch`, `constant_column`, `near_constant_column`, `all_missing_column`, `class_imbalance`, `multimodal`.
- `profile` holds the descriptive part: types, quantiles, skew, kurtosis, top levels, target balance. It is not a list of problems; use it to explain and to choose follow-ups. Details of each check and its thresholds: [references/checks.md](references/checks.md). The JSON layout: [references/evidence-schema.md](references/evidence-schema.md).
- An empty findings list means nothing passed the thresholds over the coverage shown. It does not prove the data is clean. The scan does not draw figures, compare groups on a numeric outcome, relate categorical columns, or run multivariate, trend, drift or train/test checks: say so when the question needs them.

## Follow up

To look closer at something the scan left open, run one check on chosen columns:
`python scripts/eda_probe.py CHECK DATA.csv --columns A B --metadata meta.json`
CHECK is one of `quality`, `missing_by_group`, `association`, `stratified`, `time`, `relational`, `leakage`. Its p-values are corrected only over the columns you pass, so treat a probe as a follow-up, not a new discovery.

## Report

- One sentence per finding, with its id and the number behind it.
- Separate what the evidence shows from what might explain it. Name the limitations the finding carries.
- Never claim causation. `simpson` and `leakage` are descriptive: say what flips or what duplicates the target, not which side is right.
- Do not report a number you did not read from the evidence. If you want another number, run a probe.

## When the scan refuses

The output is `{"error": {"code", "message"}}` and the exit code is not zero. Codes: `not_utf8` (convert the file to UTF-8 first, do not guess an encoding), `ragged_rows`, `empty_file`, `no_rows`, `too_many_columns`, `too_large`, `unsupported_format`, `outside_root`, `symlink_rejected`, `unknown_column`, `missing_dependency`. Tell the user the code and what to fix. Do not work around a refusal by reading the file another way.

## Sources

Built on [agent-eda](https://pypi.org/project/agent-eda/) (MIT) for the first-look profile. The input contract (bounded reads, fail closed, tokenised names, reproducible hashes) follows the approach of K-Dense's exploratory-data-analysis skill (MIT), reimplemented here; no code was copied. Evidence and limits: [references/benchmark-evidence.md](references/benchmark-evidence.md).
