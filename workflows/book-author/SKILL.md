---
name: "book-author"
description: "Phase 0 of the book pipeline: take a book from idea to a review-ready manuscript. Orchestrates ideation, literature gathering, outline design, chapter drafting (with optional executable-chapter methodology), AI-tell removal, cross-reference discipline, and the metadata/ISBN checklist. Use when the user says \"/book-author\", \"start a new book\", \"draft my book\", \"write a book about X\", or \"new book project\". Hands off to scientific-book-editor (editorial QA) and then production-book-publisher (formats/publishing). Do NOT use for reviewing or producing an existing manuscript — those are the other two orchestrators."
license: "MIT"
compatibility: "Dispatches drafting and audit agents, so it needs a harness with subagents."
metadata:
  version: "0.1.0"
  author: "aiudalabs"
  source: "https://github.com/aiudalabs/aimprenta"
  argument-hint: "[book-dir-or-idea]"
  requires: "bookwright-iterator bookwright-writer cross-reference-discipline humanizer lit-review manuscript-drafting notebook-paired-with-prose textbook-methodology"
  agents: "brainstormer math-auditor paper-crawler quality-auditor research-analyst section-writer"
---

# Book Author — Phase 0 Orchestrator

Takes an idea (or a partial draft) to a manuscript ready for
`/scientific-book-editor`. Output: `<book-dir>/book/` chapter markdown +
`METADATA.md` + (optional) `code/` per-chapter modules + a syllabus/outline
file that later phases treat as canonical.

**Honesty rules apply from the first word:** no invented citations, data,
statistics, or numbers anywhere. A claim without a source is flagged
`[source needed]`, never dressed up. Real facts come from lit-review /
WebSearch, or from code the chapter actually runs.

## Stage 1 — Frame the book

Interview the user briefly (subject, audience, what the reader can do after
reading, scope boundaries), then spawn `brainstormer` and `research-analyst`
agents to pressure-test the concept: what exists already, what's the gap, what
would make this book distinctive. Produce `BRIEF.md` (one page).

**State a rough time/cost expectation before the gate, honestly, even
without a precise number yet** — chapter count isn't known until Stage 3, so
this is order-of-magnitude, not a quote: a book-length manuscript with
executable-chapter discipline typically means dozens of agent dispatches
across drafting, review, and production, and multiple hours of wall-clock
time end to end — more if the reviewer panel or a production issue (LaTeX,
EPUB validation, a chapter-numbering bug) needs debugging along the way, as
has happened on real runs of this pipeline. Say this plainly, don't bury
it — the point is that the user commits to the outline knowing roughly what
they're committing to, not finding out from silence partway through.

**Gate: user approves the brief.**

## Stage 2 — Sources

For a book making factual/technical claims, invoke `lit-review` (multi-phase,
citation-traceable; `paper-crawler` agent for DBLP/OpenAlex sweeps when the
domain is academic). Output: `sources/` with paper cards + a BibTeX or
reference list the later citation-audit can verify. Books that are pure
practitioner experience may skip with a note in BRIEF.md.

## Stage 3 — Outline

Invoke `textbook-methodology` (bookwright): atom-outward design, deferral
discipline, running threads, page budgets. Output: `SYLLABUS.md` mapping
modules → chapters → sections, with per-chapter page budgets and dependency
order. This file is canonical downstream — later phases (module references,
build order) read it, so keep it updated when scope changes.

**Now that chapter count is known, sharpen the Stage 1 estimate into a real
one before the gate:** roughly 1 drafting agent per chapter plus its module
self-review, then a 7-reviewer panel + peer review + citation audit +
sciwrite + a coherence read in `scientific-book-editor` (mostly independent
of chapter count), then production. For an N-chapter book, expect on the
order of N to 2N agent dispatches in drafting alone, another ~15–20 across
editorial, and several hours of wall-clock time overall — say the actual
number, not a hedge, so the user is approving a real commitment.

**Gate: user approves the outline.**

## Stage 4 — Draft chapters

Per chapter (parallel agents, but respect the syllabus dependency order for
running threads):

- Prose: `manuscript-drafting` conventions + the `bookwright-writer`/`section-writer`
  agents, following `cross-reference-discipline` for labels and forward
  references from the first draft (retrofitting cross-refs is the expensive
  path).
- **Executable chapters (strongly recommended for technical books):** invoke
  `notebook-paired-with-prose` — every table/figure in the prose is produced
  by a runnable module in `code/chNN/`, with a test suite pinning the printed
  numbers. This is what makes the later review phases verify instead of
  trust. Fresh-kernel execution before a chapter is called done.
- **Two different kinds of figure, two different tools.** A figure that
  plots computed values (loss curves, decision boundaries, a scatter of real
  data) MUST stay code-generated per the rule above — that's the whole point
  of `notebook-paired-with-prose`, and a templated diagram tool would break
  the "every number comes from executed code" guarantee. A figure that's
  purely conceptual — an architecture map, a flowchart of the algorithm's
  five stages, a pipeline diagram, anything with no data behind it — use the
  `diagram-design` plugin instead of hand-rolling it in matplotlib; it
  produces editorial-quality static HTML/SVG (39 layout types) with no
  numbers to get wrong. See `docs/diagrams.md`.
- **The claim ledger (`passport.yaml`)** — pytest pins protect tables; the
  errors that survive live in PROSE claims about numbers ("more than a
  third", "nearly certain"). So every prose sentence asserting a specific
  quantitative fact that is NOT a verbatim table paste gets an entry in
  `passport.yaml` at the book root (pattern from
  pedrohcgs/claude-code-my-workflow):

  ```yaml
  claims:
    - id: ch03-truncation-59bit          # kebab, stable across edits
      file: book/ch03-identifier-safety.md
      claim: "at 59 bits kept, a billion IDs collide with p = 5.8e-01"
      check: "code/ch03/identifiers.py::truncated_collision_p(59, 10**9)"
      expected: "0.57994 → prints 5.8e-01"
      status: PASS        # PASS | FAIL | STALE | UNVERIFIED
      verified: 2026-09-01
      by: math-auditor
  ```

  Lifecycle: drafters register claims as UNVERIFIED with a runnable `check`;
  the math-auditor pass runs every check and sets PASS/FAIL; ANY later edit
  to a claim's file flips its entries to STALE (the editing agent's duty);
  a stage does not close with FAIL/STALE/UNVERIFIED entries. Downstream
  phases consult the ledger before re-deriving — a PASS claim over unchanged
  text needs a spot-check, not a fresh derivation.
- After each module of chapters: `bookwright-iterator` + `quality-auditor` +
  `math-auditor` agents for a self-review pass before moving on (cheaper than
  finding structural problems at Phase 1). The math-auditor pass is also the
  ledger verification run.

## Stage 5 — De-AI pass

Invoke `humanizer` over every chapter: AI vocabulary, em-dash and
rule-of-three overuse, uniform paragraph rhythm. Run BEFORE Phase 1 —
line-and-copy-editor at the end of Phase 1 also hunts AI artifacts, and two
independent passes catch more than one.

## Stage 6 — Metadata and the ISBN gate

Write `METADATA.md`: title, subtitle, author (legal name as it should appear),
description (back-cover length), language, category intentions. Then tell the
user plainly: **buy ISBNs now** (owned ISBNs, one per format — see the
distribution checklist rationale) so the copyright page is correct before
Phase 2 builds interiors. Record the decision either way.

## Handoff

Final report: chapter word counts, executable-chapter coverage, source count,
claim-ledger totals (N claims, all PASS — or list the exceptions),
open `[source needed]` flags, and the exact next command:
`/scientific-book-editor <book-dir>/book/`.
