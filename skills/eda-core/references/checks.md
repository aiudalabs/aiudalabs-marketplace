# What each check does

All checks run over every candidate, not only the first interesting column. Thresholds are constants in `scripts/edacore/checks/`. `alpha` is 0.05 and the seed is 7 unless set on the command line.

| Check (type) | Method | Reported when | Known limits |
| --- | --- | --- | --- |
| `duplicates` | agent-eda `find_duplicate_rows` | at least one excess copy of an exact row | exact match only |
| `sentinel` | agent-eda `detect_missing_sentinels` | a repeated value that may stand in for missing | heuristic, status `exploratory` |
| `outlier_sensitivity` | IQR fences and 10% trimmed mean | more than 1% of values outside the fences and the trimmed mean differs from the mean by over 0.1 sd | descriptive; nothing is removed |
| `missing_by_group` | chi-square (Fisher when counts are small) for every column with gaps by every group column, Benjamini-Hochberg | adjusted p below alpha and a gap of at least 0.15 between group rates | does not separate MAR from MNAR; group columns are non-numeric columns with 2 to 20 levels plus `group_columns` |
| `linear_association` | Pearson and Spearman on every pair of continuous columns, Benjamini-Hochberg | adjusted p below alpha and an absolute coefficient of at least 0.2 | continuous = numeric, at least 10 distinct values, not an all-unique integer id |
| `nonlinear` | cheap polynomial screen of all pairs, then distance correlation with a permutation p-value on the 20 best; confirmed on held-out rows when there are at least 300 | adjusted p below alpha, dcor at least 0.2 and at least 0.15 above the best linear coefficient | with fewer than 300 rows there is no hold-out and a Bonferroni correction over all pairs is used; at most 60 columns and 300 rows per test |
| `simpson` | pooled treated-minus-control difference against the difference in every stratum, for every ordered pair of binary columns and every stratum column | every stratum has the opposite sign to the pooled difference, the pooled difference is at least 0.05 and its p is below 0.01 | descriptive; treatment and outcome roles come from column order, confirm them |
| `changepoint` | strongest single mean shift by a max-t statistic with a permutation null, on every continuous column in time order, Benjamini-Hochberg | adjusted p below alpha and a shift of at least 1 sd | permutation null assumes exchangeable values, so strong autocorrelation makes p optimistic; one split only |
| `seasonality` | strongest period in the detrended FFT with a permutation null, same columns | adjusted p below alpha, at least 20% of the power, and a period of 2 to n/3 rows | period is in rows; assumes even spacing, reported in `coverage.time.rows_evenly_spaced` |
| `rule_violation` | `min`, `max`, `allowed`, `not_null`, `unique` rules from the metadata, counted exactly | at least one violating row; reports the count, the share and up to 5 row numbers (not values) | the rule is only as good as the metadata; the scan does not check it against the world |
| `label_variants` | labels that become equal after trimming and lower-casing | a column where two or more labels collapse together | merging them is a decision for the data owner |
| `type_mismatch` | agent-eda `infer_column_semantics` | numbers or dates stored as text | inferred from the values, status `exploratory` |
| `constant_column`, `all_missing_column`, `near_constant_column` | distinct-value counts | one distinct value; all values missing; one value holds at least 99% of at least 100 rows | |
| `class_imbalance` | agent-eda `profile_target` | smallest class under 10% of the target (classes only, not continuous targets) | needs `target` in the metadata |
| `multimodal` | Sarle's bimodality coefficient above 5/9, and a kernel density with two peaks whose valley is under 60% of the lower peak and with at least 10% of the rows on each side | all three agree | the coefficient alone also fires on uniform data; overlapping modes closer than about 2 sd are not reported |
| `join_fanout` | row count and sums of a left merge | the merge produces more rows than the main table | needs `--join FILE:KEY` |
| `leakage` | equality, 2-level agreement and correlation of each column with the target | score of at least 0.95; `validated` when the column is declared in `measured_after_outcome` | a suspect, not a conclusion |

Checks that need a column that was not given (`time_column`, `target`, a join) are listed under `coverage.not_applicable` with the reason.

## Not covered yet

Categorical against categorical or numeric columns, ranking features against the target, comparing a numeric outcome across groups, multivariate outliers and PCA, trend, autocorrelation, drift between periods or between train and test, referential integrity, repeated-measures structure, figures, and a generated report or notebook. Phase 1 added the per-column profile, domain rules and target balance.
