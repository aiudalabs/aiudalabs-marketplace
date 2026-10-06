## Depth: preprint or venue

Every run has a depth, set in Stage 1 and recorded in `BRIEF.md`. Take it
from `--depth preprint|venue` when given; otherwise use `venue` when the
brief names a peer-reviewed journal or conference as the target and
`preprint` for everything else (arXiv, internal report, working paper), and
confirm it at the first gate. The honesty rules and the gates are the same
at both depths; depth only sets how much checking each stage does.

| Step | `preprint` | `venue` |
| --- | --- | --- |
| Sources (Stage 2) | 25 to 40 references. Full paper cards only for load-bearing sources; background sources get a `references.bib` entry with a one-line `note` | Full `lit-review` |
| Full-text reading | Only load-bearing sources, about ten at most; abstracts are enough for the rest | Every source cited for a specific finding |
| Style (Stages 4 and 5) | `humanizer` only | `humanizer`, then `sciwrite` in full-review mode in Stage 5 |
| Review (Stage 5) | `paper-review` in single mode | `paper-review` in panel mode |
| Citation audit (Stage 5) | Full audit of load-bearing citations; existence and metadata check for background citations | Full audit of every cited entry |

A **load-bearing** source is one the paper relies on for a specific claim,
number, finding or method. A **background** source is cited for context or
attribution, such as the paper that introduced a well-known technique.

Do not add checking steps the depth does not call for. If one seems needed,
propose it at the next gate with the reason and what it costs.
