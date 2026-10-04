---
name: "paper-author"
description: "Idea to a review-ready single-document academic manuscript (journal article, conference paper, preprint) — the paper-length sibling of book-author, reusing the same underlying research/writing skills without book-author's multi-chapter machinery. Orchestrates framing, mandatory literature grounding, a single-pass IMRaD draft, an independent review pass (paper-review + citation-audit + sciwrite), and gated revision. Use when the user says \"/paper-author\", \"write a paper about X\", \"draft a manuscript for submission\", \"start a new paper\", or wants a paper (not a book, not a short article) taken from idea to revised, review-ready prose. Hands off to paper-publisher for venue formatting and submission prep. Do NOT use for a multi-chapter book (book-author) or a short-form piece meant for a blog/LinkedIn/newsletter (article-author)."
license: "MIT"
compatibility: "Dispatches research and review agents, so it needs a harness with subagents."
metadata:
  version: "0.1.0"
  author: "aiudalabs"
  source: "https://github.com/aiudalabs/aimprenta"
  argument-hint: "[paper-dir-or-idea]"
  requires: "citation-audit humanizer lit-review manuscript-drafting manuscript-revision paper-review sciwrite"
  agents: "paper-crawler paper-review research-analyst"
---

# Paper Author — Idea to Review-Ready Manuscript

Takes a research question (or a partial draft) to a manuscript ready for
`paper-review`. Output: `<paper-dir>/manuscript.md` (or split `sections/`),
`references.bib`, and — if the paper carries quantitative claims —
`passport.yaml`.

**Why this isn't book-author with fewer chapters:** a paper is short enough
to fit in one reviewer's context. Book-author's Scale rule (shard by
chapter, synthesize across shards) exists because a book cannot fit in one
context — a paper does not have that problem, so this orchestrator never
shards. One writer, one reviewer pass, three gates, not book-author's
per-chapter parallelism and `scientific-book-editor`'s seven phases.

**Honesty rules apply from the first word:** no invented citations, data,
statistics, or numbers anywhere. A claim without a source is flagged
`[source needed]`, never dressed up.

## Stage 1 — Frame the paper

Interview the user briefly: research question or thesis, target venue (if
known — it shapes length and structure conventions), audience, what's novel
about this over existing work. Spawn `research-analyst` to check the
positioning claim isn't already staked out. Produce `BRIEF.md` — one
paragraph: question, thesis, target venue or venue class (journal /
conference / preprint-only), rough length budget.

## Stage 2 — Sources (mandatory, not optional)

Invoke `lit-review` — for a paper, unlike a book, this step is never
skipped, because the Introduction's gap statement and the Discussion's
literature placement are load-bearing, not supplementary. Use
`paper-crawler` for DBLP/OpenAlex sweeps in academic domains. Output:
`references.bib` + paper cards the later `citation-audit` can verify against.

**Gate: user approves the brief and confirms the venue/scope.**

## Stage 3 — Draft (single pass, no sharding)

Invoke `manuscript-drafting` to structure and draft the whole paper in one
continuous pass, following the Introduction Arc (broad context → narrow
focus → explicit gap statement → hypothesis/objective) and the
per-result structure (question → approach → finding with statistics →
interpretation) from `paper-review`'s own review checklists — drafting to
the same standard the reviewer will check against avoids an obvious
mismatch between what gets written and what gets graded.

**If the paper reports a computed result** (a benchmark, a derivation, a
statistic run over real data): the code that produces it must actually run,
same discipline as book-author's executable chapters, just without the
notebook-per-chapter packaging — one script or notebook per reported result
is enough at this length. Register non-trivial quantitative claims in
`passport.yaml` at the paper root (same schema as book-author's, see its
Stage 4) — for a single paper this is usually a handful of entries, not
book-scale, so don't force one if the paper makes no specific numeric
claims outside its own results table.

## Stage 4 — De-AI pass

Invoke `humanizer` before the review pass — AI vocabulary, em-dash and
rule-of-three overuse, uniform paragraph rhythm. Same rationale as
book-author Stage 5: an independent pass here catches more than leaving it
solely to the reviewer's writing-quality lens.

## Stage 5 — Independent review

Invoke `paper-review` (panel mode for anything going to a real venue, single
mode for a fast internal check — ask the user which) alongside
`citation-audit` (every reference: exists, correctly attributed, and
actually supports the claim at the citation site — the telephone-game
check) and `sciwrite` in full-review mode (all five passes: clutter, voice,
sentence architecture, terminology consistency, numerical/citation
consistency). All three read the whole manuscript — nothing to shard.

Synthesize into one `review-report.md`: paper-review's Critical/Major/Minor
findings, citation-audit's reference-integrity findings, and sciwrite's
five-pass findings, deduplicated where they overlap.

**Gate: present the consolidated findings and a recommended application
policy (apply Critical + Major + mechanical Minors; skip taste-level
items) — wait for approval before touching the manuscript.**

## Stage 6 — Revision

Invoke `manuscript-revision` in revision mode to apply the approved
changes. Rules: locate edits by the report's exact ORIGINAL text; where a
finding contradicts a computed result, run the code first and fix whichever
side is wrong; where `passport.yaml` claims exist, re-verify every one
touched by an edit and flip it to STALE until re-checked — a revision pass
does not close with STALE or FAIL entries outstanding.

## Handoff

Final report: word count, source count, `passport.yaml` totals (if any),
open `[source needed]` flags, review verdict, and the exact next command:
`/paper-publisher <paper-dir>`.
