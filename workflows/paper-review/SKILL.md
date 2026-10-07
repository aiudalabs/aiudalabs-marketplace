---
name: "paper-review"
description: "Independent peer review of an academic manuscript's methods, statistics, logic, figures and reproducibility, run as a fresh-context reviewer in single or panel mode, returning Critical, Major and Minor issues. Use for \"review this paper\", \"peer review my manuscript\", \"critique this submission\", \"check my methods\", \"review my statistics\" or \"review as a peer reviewer\". For sentence-level writing quality use sciwrite; for checking that references are real and correctly used use citation-audit."
license: "BSD-3-Clause"
compatibility: "Dispatches the paper-reviewer agent once (single mode) or several times in parallel (panel mode), so it needs a harness with subagents."
metadata:
  version: "0.2.0"
  author: "Seyed (Yahya) Shirazi"
  source: "https://github.com/neuromechanist/research-skills"
  agents: "paper-reviewer"
---

# Academic Manuscript Review

Routes a manuscript to an **independent, fresh-context reviewer** that evaluates it for methodological soundness, statistical validity, logical consistency, and reproducibility, and returns a structured peer review. This skill is a thin dispatcher: it decides how to run the reviewer and in which mode. The review procedure, checklists, statistical and figure guides, principles, and output template all live in `references/` and are loaded by the reviewer, not duplicated here.

## When to use

Activate when the user wants peer-review feedback on a manuscript (journal article, conference paper, preprint).

## Why a fresh-context reviewer

Review validity depends on independence: a reviewer that shares the conversation that produced the manuscript is biased toward it. Run the reviewer in a separate context and pass only **framing** (manuscript path, target journal, manuscript type, revision status), never the authoring rationale. This is why the reviewer is a subagent on tools that support one, and an inline procedure where they do not.

## Modes (user decides each run)

- **Single (default):** one independent reviewer applies the full procedure end to end.
- **Panel (opt-in):** spawn independent reviewers in parallel on complementary lenses, then a synthesis pass. Trigger on "review panel", "multiple reviewers", or an explicit request. Lenses: **methods/design**, **statistics**, and **novelty/significance** (add **reproducibility** for methods-heavy or hardware papers). Each reviewer reads the whole manuscript but weights its lens and scores independently from `references/`; a final synthesis pass merges them into one Critical/Major/Minor review and surfaces genuine disagreement rather than averaging it away.

## Dispatch

Pass the reviewer only the framing: the manuscript path, the target journal or manuscript type, and the mode. In every branch the reviewer follows `references/review-procedure.md`.

- **Harness with subagents:** dispatch the `paper-reviewer` agent as a subagent. For panel mode, dispatch one per lens in parallel, each told its lens, then run one more for the synthesis.
- **Fallback** (no subagents, or the user wants an interactive in-thread review): follow `references/review-procedure.md` from this skill's folder directly in this context. Never review from memory: if the references cannot be read, stop and say so.

## The brain (do not duplicate into dispatch or agent shells)

- `references/review-procedure.md` -- step-by-step procedure: intake, read, methodology, logic, literature, reproducibility, figures, writing, output.
- `references/methodology-checklist.md`, `references/statistical-review-guide.md`, `references/figure-review-guide.md` -- the assessment checklists and guides.
- `references/review-principles.md` -- review philosophy and severity calibration.
- `references/review-output-template.md` -- the Synopsis / Critical / Major / Minor / References / Editor Note format.
- `examples/sample-manuscript-review.md` -- worked review for calibration; `examples/sample-manuscript-excerpt.md` -- sample manuscript input for testing.
- Sister skill `humanizer` -- AI-writing patterns to flag in the prose-quality pass.
