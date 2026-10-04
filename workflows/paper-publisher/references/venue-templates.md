# Venue templates — fetch live, don't vendor

Unlike this repo's book dependencies (see `vendor/NOTICE.md`), venue-specific
LaTeX classes are **not vendored into this repo**, for the same license-
caution reason `sciwrite` and `kindle-cover` are live-cloned instead of
vendored: the redistribution terms vary per venue and several restrict use to
"preparing a submission to this venue," which is not the same grant as
"redistribute inside a third-party repo." Fetch the specific class the paper
needs at production time instead.

## The default: `assets/templates/arxiv-article.tex.tmpl`

arXiv does not require a special document class for most categories (cs.\*,
math.\*, stat.\*, and physics sub-areas without a society-mandated format) —
a standard `article`-class paper is accepted as-is. This template is
aimprenta's own content (MIT, same as the rest of `skills/`), not a vendored
venue class, so it needs no fetch step. Use it whenever the user has not
named a venue with its own required class.

## Named venues — what's known, fetch don't guess

Checked 2026-09-02. Re-verify before relying on any of these — license terms
and CTAN paths change.

- **IEEEtran** (IEEE transactions/conferences) — distributed under the LaTeX
  Project Public License (LPPL) v1.3, which permits redistribution and
  modification. Still fetch fresh via `tlmgr` (`tlmgr install ieeetran`) or
  CTAN (`https://ctan.org/pkg/ieeetran`) at production time rather than
  vendoring a pinned copy — the class is actively maintained and a stale
  vendored copy risks failing a venue's current requirements silently.
- **acmart** (ACM conferences/journals — SIGMOD, KDD, SIGCOMM, etc.) —
  hosted on CTAN (`https://ctan.org/pkg/acmart`); fetch via `tlmgr install
  acmart` or CTAN directly. Confirm the exact `\documentclass` options
  (`sigconf`, `acmsmall`, ...) from the venue's own author-instructions page
  — these change per venue even within ACM.
- **llncs** (Springer LNCS) — Springer's own license text historically
  restricts use of `llncs.cls` to preparing a submission for a Springer LNCS
  volume, which is narrower than a redistribution grant. Do not vendor.
  Direct the user to Springer's own template page
  (`https://www.springer.com/gp/computer-science/lncs/conference-proceedings-guidelines`)
  and fetch from there per paper.
- **Anything else** (a specific journal's own `.cls`/`.sty`, a workshop
  template, a preprint server other than arXiv) — the venue's own
  author-instructions page is the source of truth. WebFetch it, don't guess
  a filename or option set from memory.

## Procedure

1. Ask the user for the target venue (Stage 1 of `paper-author` should
   already have this from `BRIEF.md`).
2. If no venue was named, or the venue accepts plain arXiv-style
   submissions: use `assets/templates/arxiv-article.tex.tmpl`.
3. If a venue with its own class was named: WebFetch the venue's current
   author-instructions page, confirm the exact class/package and any
   venue-specific options (page limit, anonymization requirement,
   supplementary-material format), then fetch the class itself via `tlmgr`
   or the venue's own download link — never reconstruct a class file from
   memory.
4. Record what was fetched (venue, class name, version/date fetched) in
   `validation/venue-template.md` so a later rebuild knows what was used.
