# Governance document templates

Skeletons for the documents `multi-agent-governance` writes. The field rules and exact shapes the checks read are in the `spec-guard` skill's `references/formats.md`; these templates follow it.

## Agent roster

`docs/AGENT_ROSTER.md` for the `flutter-firebase` profile. Lane paths come from the profile's `references/agents.md`, adjusted to this project's real folders.

```markdown
# Agent roster — {Project}

Lanes are exclusive: no path is owned by two agents. The orchestrator is a role,
not an agent, and has no entry here (see docs/ORCHESTRATOR.md).

## flutter-dev

Builds screens that match the mockups and keeps business logic out of widgets.

**Owns:** `apps/**`, `packages/ui/**`, `packages/feature_*/**`, `packages/core/**`
**Reads:** `docs/**`, `mockups/**`, `packages-ts/types/**`
**Refuses:** Cloud Functions, security rules, the admin dashboard

## firebase-dev

Paranoid about security rules, methodical about idempotency.

**Owns:** `functions/**`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules`, `packages-ts/types/**`, `firebase.json`
**Reads:** `docs/**`, `apps/**`
**Refuses:** Flutter code, the admin dashboard

## react-dev

Builds the admin dashboard on the shared types, never on guesses.

**Owns:** `admin/**`
**Reads:** `docs/**`, `mockups/**`, `packages-ts/types/**`
**Refuses:** Flutter code, Cloud Functions, security rules

## qa-tester

Reviews every deliverable against its acceptance criteria and its lane.

**Owns:** none
**Reads:** `**`
**Refuses:** editing code
```

For `fastapi-react`, the roster is `python-dev` (`src/**`, `alembic/**`, `tests/**`, `pyproject.toml`, `deploy/**`, `Dockerfile`), `react-dev` (`frontend/**`) and `qa-tester`. An API-only product drops `react-dev`.

Per-lane validation commands and the handoff to `qa-tester` go in `AGENTS.md` and `ORCHESTRATOR.md`, not in the roster, so the roster stays in the shape the checks read.

## Orchestrator

`docs/ORCHESTRATOR.md` skeleton.

````markdown
# Orchestrator — {Project}

The orchestrator is a role, not an agent. Whoever runs a sprint plays it for
that sprint: a person, a session, or any agent. It owns no file and writes no
code. When the sprint closes, the role passes on.

## The sprint loop

```
            ┌──────────────────────────────────────────────┐
            │ spec.mjs status  →  next ready wave          │
            └──────────────────────┬───────────────────────┘
                                   │  human approves the wave
            ┌──────────────────────▼───────────────────────┐
            │ one worktree per issue: wt/S{N}-{nn}         │
            │ dispatch each issue to its owner agent       │
            └──────┬───────────────┬───────────────┬───────┘
                   ▼               ▼               ▼
              owner agent     owner agent     owner agent
                   │               │               │
                   ▼               ▼               ▼
              qa-tester       qa-tester       qa-tester
         (criteria + spec.mjs verify <id>)
                   │               │               │
            ┌──────▼───────────────▼───────────────▼───────┐
            │ wave barrier: merge approved issues, id order│
            │ conflict → stop (files_touched was wrong)    │
            └──────────────────────┬───────────────────────┘
                                   │ more waves? loop
                                   ▼
                     sprint retro → docs/execution/sprint-{N}-retro.md
                                   ▼
                  execution-router prepares sprint N+1
```

## What the orchestrator does
- Reads the next ready wave from `spec.mjs status`; never picks issues by feel.
- Creates one worktree per issue off the base branch.
- Dispatches each issue to the agent named in its `owner`, with its executor prompt.
- Sends every finished issue to `qa-tester`.
- Merges approved issues at the wave barrier, in id order.
- Stops for a person on `autonomous: false` issues and before each wave.
- Closes the sprint with a retro.

## What the orchestrator does not do
- Write or fix code. A rejected issue goes back to its owner.
- Merge mid-wave or merge an issue `qa-tester` has not approved.
- Reassign an issue to another lane to "go faster".
- Edit `wave:` by hand.

## Handoff from an owner to qa-tester
The owner posts: files changed, commits, deviations from the spec, how to run its tests.

## Validation per lane
| Lane | Commands |
|---|---|
| flutter-dev | `melos run analyze && melos run test` |
| firebase-dev | `pnpm --filter functions test && pnpm rules:test` |
| react-dev | `pnpm --filter admin test` |

## Anti-patterns
- The orchestrator writing code instead of routing.
- The orchestrator as a permanent agent.
- Skipping qa for "simple" changes.
- Closing a sprint without a retro.
````

## Issue

```markdown
# Sprint 3 — Core domain functions

## S3-07 — Implement `createBooking` callable
---
id: S3-07
sprint: 3
owner: firebase-dev
files_touched:
  - functions/src/callable/createBooking.ts
  - functions/src/_lib/bookingState.ts
  - functions/test/createBooking.test.ts
depends_on:
  - S1-04   # bookings collection schema
  - S3-02   # shared booking types
decision_refs: [D-03, D-07]
requirement_refs: [FR-BOOKING-2]
commit_strategy: atomic
autonomous: true
reads:
  - docs/FIREBASE_SCHEMA.md#bookings
  - docs/ARCHITECTURE.md#cf-inventory
---
**Objetivo:** El cliente confirma su reserva y el cobro ocurre en ese mismo paso, sin pasos extra.

### Acceptance criteria
1. Rejects unauthenticated calls with `unauthenticated`.
2. Rejects malformed input with `invalid-argument`.
3. Moves the booking from `requested` to `confirmed` in one transaction.
4. A retry with the same `clientRequestId` returns the first result.
5. Unit tests cover the happy path, auth failure, validation failure and the retry.
```

No `wave:` line: `spec.mjs waves --write` adds it.

## Sprint prompts

### Orchestrator prompt (one per sprint)

```
You are playing the orchestrator role for Sprint {N}: {theme}.

Read first: AGENTS.md, docs/AGENT_ROSTER.md, docs/ORCHESTRATOR.md,
docs/ISSUES.md (Sprint {N}), docs/WAVE_DAG.md (Sprint {N}).
Run `node tools/spec-guard/spec.mjs status` and confirm the scope in one paragraph.

Current state: Sprints 0..{N-1} are merged. {Key facts about the repo.}
This sprint has {W} waves:
- Wave 1: S{N}-01 (owner, wt/S{N}-01), S{N}-02 (...), ...
- Wave 2: ...
Within each wave files_touched are disjoint (computed by spec.mjs waves).

For each wave: one worktree per issue off {base branch}; dispatch the owner
with its executor prompt from docs/SPRINT_PROMPTS.md; send each finished issue
to qa-tester, who runs `spec.mjs verify <id>`; merge approved issues at the
barrier, in id order. A merge conflict stops the sprint.

Issues that need a person mid-way: {ids with autonomous: false}.

Output the wave execution plan FIRST: which agent gets which issue in which
worktree. Do NOT spawn any agent until I approve. Wait for my response.
```

### Executor prompt (one per issue)

```
You are {owner}. You will deliver issue {S{N}-nn} in worktree wt/{S{N}-nn}.
Your lane is docs/AGENT_ROSTER.md § {owner}. Refuse anything outside it.
Follow the `issue-delivery` skill if it is installed.

Read these files first, in order, and nothing else:
{issue.reads}

The issue:
{full issue: heading, frontmatter, Objetivo, acceptance criteria — verbatim}

Commits: one task, one commit:
  {S{N}-nn} task-{k}: {summary} [refs: {decision_refs}, {requirement_refs}]
Never commit with red tests. Touch only files_touched.

Validate with: {lane commands from AGENTS.md}
and `node tools/spec-guard/spec.mjs verify {S{N}-nn}`.

Done signal: post a SUMMARY with files changed, commits, deviations from the
spec and how qa-tester should check it. Do not merge; the orchestrator merges
at the wave barrier.
```
