# Spec formats

The exact shapes `scripts/spec.mjs` reads. Every skill that writes these
documents follows this page; anything outside it is reported, never guessed.
All paths are relative to the project root.

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
  - functions/test/createBooking.test.ts
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
| `autonomous` | `false` when a person must approve mid-way (migrations, money, deletes) |
| `reads` | Documents the executor reads first. Optional |

The frontmatter is a small YAML subset: `key: value`, `key: [a, b]`, or `key:`
followed by `  - item` lines. `#` starts a comment.

After the frontmatter: a one-line `**Objetivo:**` (or `**Goal:**`) in plain
language, then `### Acceptance criteria` with a numbered list.

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

## Commits and branches

- Branch or worktree per issue, with the issue id in its name: `wt/S3-07`,
  `S3-07-create-booking`.
- Commit subject: `S3-07 task-1: validate input [refs: D-03, FR-BOOKING-2]`.
  The issue id first, the decisions and requirements it serves at the end.
  This is what `impact` and `why` follow back from code to decisions.
- An issue counts as merged when a commit on the base branch starts with its id.
