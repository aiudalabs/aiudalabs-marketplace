---
name: "paper-publisher"
description: "Venue formatting and submission preparation for a reviewed, revised paper manuscript. Applies the target venue's LaTeX template (arXiv-style default, or a named venue's own class fetched live — never vendored, see references/venue-templates.md), builds the submission PDF, and runs a submission-readiness checklist (page limit, anonymization if double-blind, bibliography style, supplementary materials, reproducibility). Use when the user says \"/paper-publisher\", \"format this for submission\", \"prepare my paper for arXiv/a conference/a journal\", or after paper-author has produced an approved, revised manuscript. Editorial review is NOT this skill — use paper-author for that."
license: "MIT"
compatibility: "Builds the submission PDF with LaTeX (latexmk and a TeX distribution with tlmgr); named venue classes are fetched from the venue at build time."
metadata:
  version: "0.1.0"
  author: "aiudalabs"
  source: "https://github.com/aiudalabs/aimprenta"
  argument-hint: "[paper-dir] [venue]"
  requires: "manuscript-checks"
  requires-tools: "latexmk python3"
---

# Paper Publisher — Venue Formatting and Submission Prep

Input: a reviewed, revised paper (`manuscript.md` or `sections/` +
`references.bib`, optionally `passport.yaml`) and a target venue (arXiv,
a named journal/conference, or "no venue yet" for a preprint-only draft).
Output:

```
submission/
├── paper.tex
├── paper.pdf
├── references.bib
└── validation/
    ├── venue-template.md
    └── submission-checklist.md
```

**Metadata rule (hard):** title, authors, affiliations, and venue come from
`BRIEF.md` / the manuscript's own front matter or the user — never invented.
An author list without confirmed order/affiliations is a stop, not a guess.

## Step 1 — Venue template

Follow `references/venue-templates.md`: the arXiv-style default template in
`assets/templates/arxiv-article.tex.tmpl` needs no fetch; a named venue's own
class is fetched live (`tlmgr`/CTAN/the venue's page) at this step, never
reconstructed from memory. Record what was fetched in
`validation/venue-template.md`.

Populate the template from the manuscript's sections. If the source is
`manuscript.md`, split it into the template's sections by heading; preserve
every citation key and cross-reference exactly — this step formats, it does
not rewrite prose (that was `paper-author`'s job, already gated).

## Step 2 — Build

Compile with `latexmk` (or the venue's specified toolchain) to `paper.pdf`.
If the source ships `passport.yaml`, re-run
`python3 <manuscript-checks skill folder>/scripts/check_claims.py <paper-dir>` before
treating the build as final — a FAIL/STALE entry at this point means the
manuscript changed after its last verification and the claim needs
re-checking, not silent trust.

## Step 3 — Submission checklist

Build `validation/submission-checklist.md` covering, per the named venue
(WebFetch its current author-instructions page — these change, don't rely on
memory):

- **Page/word limit** — measured against the actual built PDF, not a guess.
- **Anonymization**, if the venue is double-blind: no author names,
  affiliations, identifying acknowledgments, or self-citations phrased as
  "our prior work."
- **Bibliography style** matches the venue's required one (not just
  "compiles without error").
- **Supplementary materials** — what the venue accepts (code, data, extended
  proofs) and in what format; if `passport.yaml` claims point at code the
  paper doesn't ship, flag it.
- **Reproducibility statement**, if the venue requires one — must describe
  what's actually shipped, not aspirational availability.

Findings are Criticals if they'd cause a desk rejection (over length,
non-anonymized submission to a blind venue), Warnings otherwise.

**Gate: Critical findings must be fixed and rebuilt, or explicitly accepted
by the user, before calling the paper submission-ready.**

## Final report

Output tree, page count vs. the venue's limit, checklist status
(Criticals/Warnings), and what remains for the user (the actual upload,
cover letter, reviewer suggestions if the venue asks for them — those stay
manual).

This workflow also uses `manuscript-checks`.
