# Evidence for eda-core, and its limits

Two separate things were measured. Only the first describes the code that ships.

## 1. The deterministic scan (version 0.1.0 checks)

The numbers in this section were measured on version 0.1.0 and cover its nine planted kinds of finding. Version 0.2.0 adds the per-column checks listed in `checks.md`. Each new finding type has a unit test that it stays silent on several noise datasets, and the multimodality check was tightened after it fired on uniform data. The noise calibration below was **not** repeated for 0.2.0, so the false-claim rate with the new checks is not measured at the same scale.

Synthetic datasets with planted findings and a hidden ground truth, scored without any model. Each dataset has the same 13 columns, so column presence gives nothing away. Nine kinds of finding were planted (duplicates, missingness that depends on a group, a sentinel value, leakage, Simpson's reversal, a non-linear relation, a changepoint, seasonality, a join that multiplies rows).

| Split | Datasets | Recall of planted findings | False findings | Noise datasets with a claim | Same bytes on a second run | Time per dataset |
| --- | --- | --- | --- | --- | --- | --- |
| Development (12: 9 planted, 3 noise) | 12 | 1.00 | 0 | 0 of 3 | yes, 12 of 12 | 1.5 s |
| Test (24: 18 planted, 6 noise), one pass, no changes afterwards | 24 | 1.00 | 0 | 0 of 6 | yes, 24 of 24 | 1.6 s |

Calibration beyond the benchmark:

| Check | Result |
| --- | --- |
| 100 independent pure-noise datasets, standard schema | 0 with any false claim |
| 40 independent pure-noise datasets, 40 numeric columns, 500 rows | 0 with any false claim |

Power at weaker effects, 20 datasets per level (share where the finding was reported):

| Planted effect | Level | Found |
| --- | --- | --- |
| Changepoint, shift in sd of the column | 0.3 / 0.6 / 1.0 / 2.0 | 0.00 / 0.00 / 0.05 / 1.00 |
| Seasonality, amplitude against unit noise | 0.2 / 0.4 / 0.7 / 1.0 | 0.00 / 0.00 / 0.00 / 0.90 |
| Non-linear, noise sd added to y = x squared | 0.25 / 0.5 / 1.0 / 2.0 | 1.00 / 1.00 / 0.95 / 0.75 |
| Missingness, gap between group rates | 0.1 / 0.2 / 0.4 / 0.7 | 0.00 / 0.95 / 1.00 / 1.00 |

The thresholds trade power for zero false positives: a changepoint under about 1 sd and a seasonal cycle under about 0.7 sd are not reported. A missed weak effect is silent, so an empty findings list does not prove a clean dataset.

Unit tests (`test/eda-core/`) check each detector against an independent recomputation, byte-identical output on repeated runs, an untouched input file, typed errors for malformed input, and no crash on constant, all-missing and extreme columns.

## 2. An earlier markdown-only version, measured with a model

Before the scan existed, a markdown-only version of this skill (instructions, no scripts) was compared with Claude alone. Model: `sonnet` alias (claude-sonnet-5-5), 24 test datasets, 3 repetitions per arm, the decision rule written beforehand.

| Arm | Recall | Noise datasets where something was claimed | False findings per run |
| --- | --- | --- | --- |
| Claude alone | 0.71 | 0.78 | 1.15 |
| + markdown skill | 1.00 | 0.00 | 0.04 |
| + helper functions only | 0.75 | 0.22 | 0.18 |
| + helper functions and markdown skill | 1.00 | 0.00 | 0.11 |
| + generic placebo skill | 0.70 | 0.78 | 0.90 |

That test measured detection quality, not determinism: in it the model wrote its own code each time. It does not test the `SKILL.md` that ships now.

## Limits

- Everything above is synthetic. Real datasets contain problems these do not.
- The benchmark generator, the planted effects and the thresholds were designed by the same person. The test split shares the generator with the development split, so the recall of 1.00 shows the scan does what it was built to do, and says little about unseen kinds of problems. Three bugs were fixed while looking at development data before the test pass.
- The model-based result is for one model and one earlier skill text. The shipped `SKILL.md` (a short router over the scan) was never run with a model.
- The placebo skill was loaded in only 2 of 72 runs, so it controls the effect of extra prompt text only weakly.
- Associations, changepoints and seasonality assume exchangeable values; strongly autocorrelated series make those p-values optimistic. See `checks.md`.
- `agent-eda` is an alpha package with one release (0.1.0), pinned here. Its sentinel and key detection were only smoke-tested.
