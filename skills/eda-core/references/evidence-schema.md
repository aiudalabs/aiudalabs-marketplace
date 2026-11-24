# Evidence file layout

```
tool, schema_version
dataset      sha256, rows, cols, delimiter, rows_truncated, limits, na_policy, column_names_changed, name
params       seed, alpha, permutations, dcor_max_rows, metadata, joins
environment  python, numpy, pandas, scipy, agent-eda, edacore
coverage     checks_run, not_applicable[{check, reason}], one block per check with the counts it covered
profile      missing{col: {missing, share}}, numeric{col: {mean, std, min, max}}, candidate_keys
findings[]   id, type, columns, method, n, estimate, p_raw, p_adj, status, detail, limitations
reading_guide
```

- Output is sorted and has no timestamps: the same file, metadata and seed give the same bytes on the same package versions.
- `id` is a hash of type, columns and method, so it is stable across runs.
- Floats are rounded to 8 decimals. `NaN` and infinities are written as `null`.
- Column names are untrusted text: control characters are removed and they are cut to 64 characters. With `--tokenize` they are replaced by `c001`, `c002`, and the mapping is written to a separate file.
