# Spec formats

The exact shapes `scripts/spec.mjs` reads. Every skill that writes these
documents follows this page; anything outside it is reported, never guessed.
All paths are relative to the project root.

## Brief: `docs/PRODUCT_BRIEF.md`

Eight numbered headings, in this order: `## 1. Tagline`, `## 2. Apps`,
`## 3. Market`, `## 4. User groups`, `## 5. Core value loop`,
`## 6. Personas and jobs`, `## 7. Adversarial analysis`,
`## 8. Do-not-build list`. Under "Personas and jobs", every job has an id
`J-<PERSONA>-<n>` (`J-CARLOS-1`). The PRD traces requirements to those ids;
a job no requirement serves is a coverage gap, like an uncovered decision.

## Decisions: `docs/OPINIONATED_DEFAULTS.md`

One heading per decision, numbered `D-01`, `D-02`, ... in order:

```markdown
## D-03 — Payment at booking confirmation

**Lock:** The customer pays when the provider confirms the booking, never before.
```

- The id is `D-` plus two or more digits. The text after the dash is the title.
- `## Decision 3: Payment at booking confirmation` is read as `D-03`, for
  documents written before this format. New documents use `D-03`.
- A decision deferred out of this release carries `(deferred)` in its heading:
  `## D-11 — Loyalty points (deferred)`. Deferred decisions need no issue.
- A decision the code already implements, recorded when an existing repository
  is adopted, carries `(existing)`: `## D-05 — Money is integer cents (existing)`.
  It needs no issue either, and an issue may still cite it when it applies it.
- The stack profile is locked by a line inside one decision's section:
  `**Stack profile:** flutter-firebase` (or `fastapi-react`). The older ids
  `aiuda-flutter-firebase` and `python-fastapi-react` are accepted. That
  decision is implemented by the scaffold, so it needs no issue.

## Requirements: `docs/PRD.md`

One heading per functional requirement:

```markdown
### FR-ORDER-1 — A customer places an order from a table

- Given a customer scanned a valid table QR and has items in the cart
- When they confirm the order
- Then the order is created with status `placed` within 3 s
```

- The id is `FR-`, an uppercase area, `-`, a number: `FR-ORDER-1`. The area
  may have hyphens (`FR-CHECK-IN-2`). `FR-12` (no area) is also accepted.
- Only headings define requirements. Mention ids anywhere else in plain text,
  never in another heading, or they count as definitions.
- `(deferred)` in the heading takes the requirement out of this release;
  `(existing)` marks one the code already meets.
- `**Traces:**` names the brief's job ids the requirement serves. A requirement
  imposed from outside (a store policy, a law) traces to its source instead:
  `**Traces:** compliance: Apple App Store Review Guideline 5.1.1(v)`. A traced
  job id that is not in the brief is an error; a compliance trace is not checked.

## Citations in other documents

Every other document in `docs/` (the schema, the screens, the architecture) may
cite `D-xx` and `FR-...` ids in plain text; fenced code is skipped. Each cited id
must exist in the decisions or the PRD, or it is a `dangling-ref` error.

- A document that proposes a new id for an earlier document (the architecture's
  "Changes to earlier documents") writes `(proposed)` right after it, on the
  same line: `FR-AUTH-3 (proposed)`, `D-13 (proposed)`. While the id is not
  defined, that is a `proposed-id` warning listing where it is proposed, not an
  error. Once the owning phase adds the heading, the warning goes away.
- Other lines may cite a proposed id without the marker. That is part of the
  same warning; under `check --strict` it is an error, because a document then
  relies on an id that does not exist yet.

## Agent roster: `docs/AGENT_ROSTER.md`

One `##` heading per agent, named exactly like its agent file, followed by its
lane. Globs are in backticks, comma-separated:

```markdown
## firebase-dev

Paranoid about security rules, methodical about idempotency.

**Owns:** `functions/**`, `firestore.rules`, `firestore.indexes.json`, `packages-ts/types/**`
**Reads:** `docs/**`, `apps/**`
**Refuses:** Flutter code, the admin dashboard
```

- `**Owns:** none` marks a review-only agent such as `qa-tester`. It may own no
  issue.
- Two agents may not own the same path. Shared files are a design smell: give
  them to one agent, and let the others ask for changes.
- Projects from before this format kept the roster in `docs/AGENTS.md`; it is
  read when `docs/AGENT_ROSTER.md` does not exist. The project's root
  `AGENTS.md` is the repository constitution, a different document.

## Screens: `docs/UI_SCREENS.md`

Written by `ui-screens-spec`; checked whenever it exists. One `## App X — app-id`
section per app, with a `### Navigation graph — app-id` and then one section per
screen, its anchor on the line before its heading:

```markdown
<a id="s-1.2.3"></a>
### 1.2.3 — Search results

**Header**
- Title: [COPY: "Resultados"]; filter icon opens 1.2.4

**Body** ...
**Primary CTA** ...
**Navigation**
- Back: 1.2.2. Card tap → 1.3.1

**Data**
- Reads: providers. Serves: FR-SEARCH-1

**Permissions**
- Auth required: yes. Role: customer
```

- A screen id is `X.Y.Z` or `X.Y` (`1.0`, the splash). A heading
  `### X.Y.Z — Title` without the anchor before it is a warning: links to
  `docs/UI_SCREENS.md#s-1.2.3` would be dead. An anchor whose id differs from the
  heading after it, or a screen defined twice, is an error.
- Every screen has the six blocks **Header**, **Body**, **Primary CTA**,
  **Navigation**, **Data** and **Permissions**, written `**Header**`,
  `- **Data:** ...`, `#### Body` or `Header` alone on its line. A screen missing a
  block is a warning; an empty block says "None", it is never dropped.
- Navigation targets must be screens of this document. Every id in a navigation
  graph and in a **Navigation** block counts, and elsewhere every id after an
  arrow (`→ 1.3.1`, `-> 1.3.1`). `1.1.x` stands for any screen of section 1.1.
  Ids inside `[COPY: ...]` and backticks are ignored. A target that is not a
  screen is an error.
- Any document in `docs/` that links `UI_SCREENS.md#s-<id>` or
  `mockups/<app-id>.html#s-<id>` (the key screens' back-links, an issue's
  `reads:`) must name a screen that exists: an error otherwise. A mockup link
  under the wrong app is a warning. Once `mockups/<app-id>.html` exists, a linked
  screen with no element `id="s-<id>"` in it is a warning: the mockup is missing
  or stale. Only linked screens are checked, because only key screens have mockups.
- `FR-...` and `D-xx` ids cited in it are checked like in any other document:
  each must exist in the PRD or the decisions.

## Backlog: `docs/ISSUES.md`

Sprints are `#` headings, issues are `##` headings followed by frontmatter:

```markdown
# Sprint 3 — Core domain functions

## S3-07 — Implement `createBooking` callable
---
id: S3-07
sprint: 3
wave: 2
owner: firebase-dev
files_touched:
  - functions/src/callable/createBooking.ts
  - functions/test/unit/createBooking.test.ts
depends_on:
  - S1-04   # bookings collection schema
decision_refs: [D-03, D-07]
requirement_refs: [FR-BOOKING-2]
commit_strategy: atomic
autonomous: true
reads:
  - docs/FIREBASE_SCHEMA.md#bookings
---
**Objetivo:** El cliente confirma su reserva y el cobro ocurre en ese mismo paso.

### Acceptance criteria
1. Rejects unauthenticated calls with `unauthenticated`.
2. Moves the booking from `requested` to `confirmed` in one transaction.
```

| Field | Rule |
| --- | --- |
| `id` | `S{sprint}-{nn}`, equal to the heading's id |
| `sprint` | The sprint number; equal to the number in `id` |
| `wave` | Written by `spec.mjs waves --write`; never chosen by hand |
| `owner` | An agent in the roster that owns a lane |
| `files_touched` | Paths or globs the issue writes. Every one must sit inside the owner's lane |
| `depends_on` | Issue ids merged before this one starts. Same or earlier sprint only |
| `decision_refs` | `D-xx` ids this issue implements. May be empty for setup work |
| `requirement_refs` | `FR-...` ids this issue implements. May be empty for setup work |
| `commit_strategy` | `atomic` (default) or `squash` |
| `autonomous` | `false` when a person must approve or act mid-way: migrations, money, deletes, permissions, creating or deploying cloud resources, a device or native build, credentials or a vendor account. Default `true` |
| `reads` | Documents the executor reads first, `path` or `path#anchor`. Include every section a criterion cites. Optional; see below |
| `gate` | Optional list of commands delivery and review run first, before the lane's commands: the checks that exercise this issue's deliverables. A list of non-empty strings; a command may not contain ` #` |
| `merge_with` | Optional id of another issue merged at the same barrier, such as the lockfile refresh paired with an issue that changes a manifest. Must exist |

The frontmatter is a small YAML subset: `key: value`, `key: [a, b]`, or `key:`
followed by `  - item` lines. `#` starts a comment.

After the frontmatter: a one-line `**Objetivo:**` (or `**Goal:**`) in plain
language, then `### Acceptance criteria` with a list numbered 1..n in order
(otherwise a `criteria-order` warning).

- A criterion a person performs (create a cloud project, approve a payment
  account, test on a device) starts with `human:`: `3. human: A person creates
  the three projects.` The issue must be `autonomous: false`, or `check` errors.
- Every file a criterion names in backticks is covered by `files_touched`, or
  `check` warns `criterion-path`. A name with a `/` is read from the root when
  its first folder exists or is in a lane, otherwise as a suffix (`src/index.ts`).
  Paths under `docs/`, packages, URLs and commands are not checked.
- Every section a criterion cites (`ARCHITECTURE §3`, `IAM §2.1` naming a
  `docs/` file by the start of its name, or `docs/X.md#anchor`) is in `reads`,
  as that anchor or the whole document, or `check` warns `criterion-read`.

Change an existing issue's `files_touched`, `depends_on` or `reads` with
`spec.mjs amend`, never by hand: it edits only that issue, recomputes waves and
syncs the prompts.

### `reads` anchors

A `reads` entry into a Markdown file must resolve, or it is an
`unresolved-read` error: a file under `docs/` must exist, and the part after
`#` must be one of that file's anchors. A Markdown file outside `docs/` is
checked only once it exists. The anchors are:

- **Heading slugs**, as GitHub renders them: take the heading's text with code
  spans, emphasis, links and HTML tags unwrapped; lowercase it; drop every
  character that is not a letter, a digit, a space, `-` or `_`; turn each space
  into `-`. `## 5.3 Checkout and payment` is `#53-checkout-and-payment`,
  `# Architecture — Canchas Pa` is `#architecture--canchas-pa` (the dash goes,
  both spaces stay). A repeated heading gets `-1`, `-2`, ... in document order.
- **Explicit anchors**: `<a id="cf-inventory"></a>` (or `name=`) anywhere in
  the file. Use one when the heading text may change or is long.

Screen links (`docs/UI_SCREENS.md#s-1.2.3`, `mockups/<app-id>.html#s-1.2.3`)
follow the screen rules above; a mockup file may not exist yet.

## Globs

`**` matches any number of folders, `*` anything inside one name, a path ending
in `/` matches everything under it, and any other path matches itself.

## Waves

`spec.mjs waves` assigns waves inside each sprint, deterministically:

1. Earlier sprints count as merged. A dependency on a later sprint is an error.
2. Wave 1 takes every issue whose dependencies are all merged or in earlier
   waves, in id order, as long as its `files_touched` do not overlap an issue
   already in the wave. An overlapping issue waits for the next wave.
3. Repeat until every issue has a wave. A cycle is an error.

Two issues in the same wave never touch the same file, so their worktrees merge
without conflicts.

## Sprint prompts: `docs/SPRINT_PROMPTS.md`

Written by multi-agent-governance and execution-router; checked whenever it
exists. Each prompt is a fenced block.

- An executor prompt inlines its issue verbatim: the `## S3-07 — Title`
  heading, the frontmatter and the body, ending before the `Commits:` line. Its
  `Read these ...` line is followed by the issue's `reads`, one indented line
  each. Without a `Commits:` line only the heading and frontmatter are checked.
- An orchestrator prompt says `orchestrator role for Sprint N` and lists
  `- Wave N: S3-01 (owner, wt/S3-01), ...` on consecutive lines, after
  `This sprint has N issues in W waves`.
- Any difference from `docs/ISSUES.md` is a `prompt-drift` error.
  `spec.mjs prompts --write`, `waves --write` and `amend` rewrite those parts.
- A `##` section with a `Stale:` line outside its fences is not checked.

## Commits and branches

- Branch or worktree per issue, with the issue id in its name: `wt/S3-07`,
  `S3-07-create-booking`.
- Commit subject: `S3-07 task-1: validate input [refs: D-03, FR-BOOKING-2]`.
  The issue id first: it is the trace key `impact`, `why` and `status` follow.
  `[refs: ...]` is optional and may list only the issue's own `decision_refs`
  and `requirement_refs`; with none, omit it. The commit-msg hook enforces both.
- An issue branch syncs with the base only by merging the base branch. The
  pre-merge-commit hook refuses any other merge, and `verify` warns on one.
- An issue counts as merged when a commit on the base branch starts with its id.
