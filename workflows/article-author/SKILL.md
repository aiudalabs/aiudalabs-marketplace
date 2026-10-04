---
name: "article-author"
description: "Idea to a published-ready short-form piece — a LinkedIn article, a Medium post, a newsletter piece, or plain markdown for any blog. The lightest of the three authoring orchestrators in this repo: one command, internal phases, a single gate, reusing the same editorial skills as book-author and paper-author at a fraction of the ceremony. Use when the user says \"/article-author\", \"write a LinkedIn post about X\", \"draft a blog post\", \"write an article for Medium\", or wants a short technical/opinion piece (roughly 600–2000 words) taken from an angle to a publish-ready, platform- formatted draft. Do NOT use for a multi-chapter book (book-author) or an academic manuscript headed to a journal/conference (paper-author)."
license: "MIT"
metadata:
  version: "0.1.0"
  author: "aiudalabs"
  source: "https://github.com/aiudalabs/aimprenta"
  argument-hint: "[angle-or-idea] [platform]"
  requires: "citation-audit sciwrite humanizer"
---

# Article Author — Angle to Publish-Ready Short-Form Piece

Input: an angle, thesis, or rough idea, and (optionally) a target platform.
Output: `article.md` (the canonical draft) plus one formatted file per
requested platform under `formatted/` (e.g. `formatted/linkedin.md`,
`formatted/medium.md`), and `validation/platform-checklist.md`.

**Why this is one command, not three:** a 600–2000 word piece is short
enough that framing, drafting, and editing don't need separate gated
hand-offs the way a book's stages do — forcing that ceremony here would be
the same mismatch this repo's design already rejects (see
`docs/community-validation.md` in the aimprenta repository and the README's design principles: match
process weight to the actual risk and length of the piece).

## Phase 1 — Angle

Get the angle and thesis in one exchange: what's the one claim or insight
the piece exists to land, who's the audience, what should they do or think
differently after reading. No formal `BRIEF.md` — write the angle as the
first two lines of `article.md` as a working note, replaced by the actual
opening once drafted.

## Phase 2 — Fact-check (conditional, not a fixed phase)

**Only if the piece makes a verifiable claim** (a statistic, a benchmark
number, "X was the first to do Y", a specific attributed quote): invoke
`citation-audit` targeted at just those claims — not a full bibliography
sweep, this piece doesn't have one. A pure opinion/perspective piece with no
factual claims skips this phase entirely; don't force it, that's the same
proportionality mistake as running a book's full citation audit on a single
paragraph.

If the piece reports a specific computed number the author is asserting
(a benchmark result, a measured latency, a percentage), verify it against
real output before it ships — same "never fabricate" rule as everywhere else
in this repo, just without a `passport.yaml` ledger at this length; a
one-line note in `article.md`'s source comments naming what was verified and
how is enough.

## Phase 3 — Draft (single pass)

Write the piece in one continuous pass. Register: platform voice differs —
a LinkedIn article tolerates a more direct, personal register than a
technical blog post; ask which register the user wants if the platform
doesn't make it obvious. Keep the piece to one thesis; a short-form piece
that tries to cover three ideas reads as three unfinished ones.

## Phase 4 — Editorial pass

Invoke `sciwrite` (targeted mode is enough at this length — clutter and
voice passes matter most; skip the citation-consistency pass if Phase 2 was
skipped) and `humanizer` (AI vocabulary, em-dash overuse, uniform paragraph
rhythm — this is the pass most likely to matter for a short piece meant to
sound like one person's voice, not a synthesized one).

**Gate: user approves the piece for publishing.** This is the only gate in
the pipeline — proportionate to a single short-form piece, not a substitute
for judgment on higher-stakes claims (Phase 2 already caught those).

## Phase 5 — Platform formatting

For each requested platform, WebSearch the platform's *current* formatting
constraints before formatting — character/word limits, title-length
guidance, hashtag conventions, and image specs change over time and vary by
platform; do not rely on a remembered number that may be stale. Common
targets:

- **LinkedIn article** — long-form, own formatting quirks (no arbitrary
  external embeds render reliably, hashtags at the end).
- **Medium** — supports richer embeds; subtitle field is separate from the
  title.
- **Plain markdown** — for a personal blog, dev.to, or any Markdown-native
  platform; no platform-specific reformatting needed beyond frontmatter.
- **Newsletter** (Substack-style) — shorter paragraphs read better in email
  clients; a preview/teaser line matters more than on a web-native platform.

Write `validation/platform-checklist.md`: per platform, what was verified
(with the date checked, since these rules move) and any format-specific
change made (e.g. hashtags added, embeds swapped for links).

## Final report

Word count, whether a fact-check ran and what it covered, gate status, and
the formatted-file list with platform checklist status. Actual publishing
(the upload/post itself) stays manual, same as book-author's ISBN purchase
and paper-publisher's submission upload.
