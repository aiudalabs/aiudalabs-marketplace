---
name: "scientific-book-editor"
description: "End-to-end editorial and scientific QA pipeline for book-length manuscripts (scientific, technical, nonfiction). Orchestrates seven phases: global editorial assessment with a publishability verdict, scientific peer review, citation and evidence audit, scientific-writing improvement (sciwrite), manuscript revision, a final line/copy edit, and a mandatory whole-manuscript coherence read that no chapter-sharded phase can substitute for. Use when the user says \"/scientific-book-editor\", \"edit my book\", \"editorial pipeline\", \"review this book for publication\", \"run the editorial QA\", or wants a publish / major-revision / don't-publish verdict on a full manuscript. Report-only until the user approves revisions. For production (PDF/EPUB/covers/KDP) use production-book-publisher instead."
license: "MIT"
compatibility: "Runs a panel of review agents in parallel, so it needs a harness with subagents. The manuscript checks need Python 3."
metadata:
  version: "0.1.1"
  author: "aiudalabs"
  source: "https://github.com/aiudalabs/aimprenta"
  argument-hint: "[book-source-dir]"
  requires: "citation-audit line-and-copy-editor manuscript-checks manuscript-revision paper-review sciwrite"
  agents: "bibliography-auditor consistency-checker logic-reviewer technical-reviewer writing-reviewer"
---

# Scientific Book Editor — Editorial QA Orchestrator

Orchestrates the editorial half (steps 1–7) of the book pipeline. Input: a
directory of markdown chapter files (optionally BibTeX / a references section).
Output: five review reports, a publishability verdict, and — only after user
approval — a revised copy of the book.

**Never edit the input manuscript in place.** Reviews are report-only; revision
happens on a copy. Never fabricate citations, data, or numbers anywhere in the
pipeline.

## Inputs and outputs

- Input: `<book-dir>` — chapter markdown files (`ch*.md` or similar). If the
  argument is missing, ask for it; do not guess.
- Reports go to `<book-dir>/../editorial/` (or `./editorial/` next to the book):
  `editorial-report.md`, `scientific-review.md`, `citation-audit.md`,
  `writing-review.md`, `style-sheet.md`, `coherence-report.md`.
- Revised manuscript goes to `<book-dir>/../revised-book/` (a full copy, then
  edited).

## The claim ledger (`passport.yaml`)

If the book ships a `passport.yaml` (see book-author Stage 4), every phase
uses it: reviewers CONSULT it before re-deriving (a PASS claim over unchanged
text gets a spot-check, not a fresh derivation — record disagreements as
findings against the ledger itself); Phase 2's reviewer re-runs the `check`
commands as its reproducibility pass; Phase 5 appliers flip entries whose
files they edit to STALE and re-verify them before the phase closes; new
quantitative prose claims introduced during revision get NEW entries. If the
book has no ledger, Phase 5 creates one for the claims the reviews litigated,
so the next cycle doesn't re-litigate them. No phase closes with
FAIL/STALE/UNVERIFIED entries.

## Phase 0 — Deterministic gates (before spending any review budget)

Run these two before Phase 1, not instead of it — they catch a different
class of defect (mechanical) than LLM reviewers catch (judgment), and they
cannot be talked into a favorable read the way a confident chapter
occasionally talks a reviewer into one:

```bash
python3 <manuscript-checks skill folder>/scripts/check_structure.py <book-dir>
python3 <manuscript-checks skill folder>/scripts/check_readability.py <book-dir>
```

`check_structure.py` catches truncation markers, empty sections, and
malformed code fences — zero-cost, zero-ambiguity findings a chapter
shouldn't reach Phase 1 with. `check_readability.py` reports Flesch Reading
Ease per chapter and flags chapters that read very differently from the
book's own average — not a verdict (a technical book's "right" score is
audience-dependent), just a pointer to look closer, either at a deliberate
register shift or a drafting agent that drifted. Fold both scripts' output
into `editorial-report.md`'s findings; don't create a separate report file
for them.

## Scale rule (books are not papers)

Every phase below was designed for papers; a book is 10–20× longer. For any
manuscript over ~15k words, shard by chapter: spawn parallel subagents (2
chapters each is a good grain), have each write its full report to a file
(message transit truncates long reports), then compile one combined report
with an executive summary, severity totals (CRITICAL/MAJOR/MINOR), and
cross-book patterns. This mirrors how each underlying skill is applied.

**Phase 7 is the deliberate exception to this rule** — it exists precisely
because sharding by chapter cannot see a defect that only exists
accumulated across the whole book. Do not shard it by chapter; see Phase 7.

## Phase 1 — Global editorial assessment → `editorial-report.md`

Uses the academic-writing-agents reviewer roster (installed in
the installed agents folder): spawn in parallel, each over the whole manuscript or
chapter shards:

- `logic-reviewer` — argument structure, non-sequiturs, unsupported leaps
- `technical-reviewer` — technical correctness of claims and examples
- `consistency-checker` — terminology, notation, cross-references
- `writing-reviewer` — prose quality at the structural level
- `bibliography-auditor` — reference list hygiene (existence checked in Phase 3)

Plus the **adversarial pair** (community pattern from
claesbackman/AI-research-feedback; spawn as two general-purpose agents):

- **skeptic** — its ONLY job is to attack the manuscript's theses: hunt
  overclaims, unfalsifiable statements ("no system has ever…"),
  unsupported superlatives ("the most common way…"), evidence cited for a
  different claim than it supports, and genre party tricks. It does not
  review dimensions the five above own; it prosecutes the argument.
- **advocate** — the symmetric role nobody else has: build the strongest
  case FOR the book's deliberate choices (voice, structure, framing,
  conventions), and flag any reviewer finding whose "fix" would damage an
  intentional design. The advocate's defenses are the first input when two
  reviewers conflict.

Synthesize into `editorial-report.md` ending with a **verdict**, exactly one of:
`PUBLISH` · `MINOR REVISION` · `MAJOR REVISION` · `DO NOT PUBLISH`, each with
the blocking findings that justify it. The synthesis carries an adversarial
section: skeptic charges with the advocate's answer to each, and which side
the verdict took.

**Gate:** on `DO NOT PUBLISH`, stop the pipeline and report to the user. On any
other verdict, continue.

## Phase 2 — Scientific peer review → `scientific-review.md`

Invoke the `paper-review` skill (Panel mode). For a book, run the panel per
module or chapter-pair: methodology soundness, statistical/numerical validity,
reproducibility of any executable claims, unsupported assertions. If the book
ships executable code that generates its tables/figures, RUN it and compare
against the printed values — never assume.

## Phase 3 — Citation & evidence audit → `citation-audit.md`

Invoke the `citation-audit` skill (note its LOCAL ADAPTATION header: reviewer
calls use fresh Claude subagents, not Codex). For every reference: does it
exist, is the bibliographic data correct, and does the cited source actually
support the claim at the citation site (the telephone-game check). Verify via
WebSearch/WebFetch against primary sources. Flag secondary-source-only
statistics.

## Phase 4 — Scientific writing improvement → `writing-review.md`

Invoke the `sciwrite` skill in full-review mode (five passes: clutter, voice,
sentence architecture, terminology consistency, numerical/citation
consistency), sharded per the scale rule. Recompute every table from its stated
assumptions in Pass 5.

## Phase 5 — Manuscript revision → `revised-book/` (GATED)

**Gate: present the consolidated findings to the user first** — totals by
severity, the CRITICAL list in full, and the recommended application policy
(default: apply CRITICAL + MAJOR + mechanical MINORs; skip taste-level items
like verbal tics, voice policy, spelling register — those are author
decisions). Wait for approval.

Then copy the book to `revised-book/` and invoke `manuscript-revision` in
revision mode to apply the approved changes there, sharded by chapter. Rules
for appliers: locate edits by the report's exact ORIGINAL text; where a finding
contradicts program output, run the program first and fix the wrong side; where
a claim quotes shipped code verbatim, never silently change either side. After
edits, re-run the book's own test suites / build if it has them — if the book
ships `passport.yaml` ledgers, run
`python3 <manuscript-checks skill folder>/scripts/check_claims.py <book-dir>` rather than
spot-checking a few chapters by hand: it re-runs every chapter's suite and
reports exactly which recorded claims no longer verify, cross-referenced
against `KNOWN-ISSUES.md` so a documented environment-version pin doesn't
get mistaken for a real regression. This has caught a real one before: a
prose-edit pass changed a pasted table's wording without updating the code
that generates it, breaking the verbatim-pin contract in a way a spot-check
of 1–2 sample chapters did not happen to hit.

## Phase 6 — Final line/copy edit → `style-sheet.md`

Invoke `line-and-copy-editor` on `revised-book/`: grammar, consistency,
Chicago-style cleanup, AI-artifact removal. It maintains a running style sheet
— save it as `editorial/style-sheet.md`.

## Phase 7 — Whole-manuscript coherence read → `coherence-report.md` (MANDATORY, GATED)

**Why this phase exists, stated plainly so it never gets skipped as
redundant with Phase 1:** every phase above shards by chapter or chapter-pair
(the Scale rule). That is correct for everything those phases check — but it
structurally cannot see a defect that only exists *accumulated* across the
whole book, because no single reviewer ever reads more than 1–2 chapters.
This happened for real: a 14-chapter manuscript passed a 7-reviewer panel,
independent peer review, a citation audit, and a 5-pass sciwrite review with
no chapter-sharded finding raised — then the author read it cover to cover
and found the same invented pedagogical terminology, repeated verbatim, in
13 of 14 chapters, making the book read like marketing for its own framing
device rather than a book on its subject. No prior phase's shard boundary
could have caught that; this phase's only job is to be the one pass whose
scope is the whole book, on purpose.

**Method — one continuous read, not a shard:**

1. Read `revised-book/` start to finish in as few context windows as
   possible — one pass if the manuscript fits, otherwise split into the
   *fewest* large contiguous chunks that do (front half / back half, or
   thirds), never chapter-by-chapter. Each chunk's job is still to read
   for cross-book patterns, not to re-review chapter content Phase 1
   already covers.
2. Hunt specifically for what per-chapter review cannot see:
   - **Repeated house terminology or structural devices** used identically,
     word-for-word, across many chapters (named boxes, ritual phrasing,
     invented jargon) — quantify with a count (grep is fine for this part:
     "appears in N of M chapters") before judging it a problem.
   - **Template fatigue** — a pedagogical structure that reads as clever
     once and gimmicky by the fifth repetition.
   - **Voice drift or voice sameness** across chapters that should differ
     (uniform paragraph rhythm the whole book, or an authorial voice that
     changes noticeably partway through).
   - Whether the book reads as **one continuous work** or as N
     independently-drafted chapters stitched together — cross-chapter
     callbacks that don't actually land, front matter promises the body
     doesn't keep, a front-loaded wall of framing apparatus before any
     real content.
3. If a chunked read was necessary, synthesize across chunks before writing
   the report — a pattern spanning the chunk boundary must not be missed
   because no single chunk saw the whole count.

**Report:** `coherence-report.md` — each finding quotes the exact repeated
text/pattern, a real count (files/occurrences), and a concrete fix
direction. This phase does not re-litigate Phase 1–6 findings; if it
notices one, cross-reference it instead of duplicating it.

**Gate:** present findings to the user before touching anything — this
mirrors Phase 5. Most findings here are voice/structure, not correctness,
so the default recommendation is narrower than Phase 5's: fix only what the
user confirms reads badly, never impose a "should" on deliberate authorial
choices (the advocate's defenses from Phase 1 still apply here).

**Apply (only after approval):** chapter-sharded parallel agents are fine
for *applying* an approved fix — the blind spot was in diagnosis, not
repair. Give every applier explicit preservation rules (label IDs, code
fences, numeric values, `passport.yaml` claims untouched) and the exact
before/after pattern from the report.

**Verify (mandatory, done by the orchestrator, not trusted from agent
self-report):** an independent grep sweep confirming the pattern is
actually gone outside protected zones (label IDs, code, comments), plus
`python3 <manuscript-checks skill folder>/scripts/check_claims.py <book-dir>` if the book ships
`passport.yaml` ledgers. Only after this verification does the manuscript
become the canonical source for `production-book-publisher`.

## Failure and honesty rules

- A phase that cannot run (missing tool, missing input) is reported as skipped
  with the reason — never silently dropped, never simulated.
- Findings must quote ORIGINAL text and give a concrete revision. No "consider
  improving clarity".
- Verdicts and severity counts in the final summary must match the report files
  exactly.

This workflow also uses `manuscript-checks`.
