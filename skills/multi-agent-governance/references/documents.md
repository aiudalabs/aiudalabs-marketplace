# Governance document templates

Skeletons for the documents `multi-agent-governance` writes. The field rules and exact shapes the checks read are in the `spec-guard` skill's `references/formats.md`; these templates follow it.

## Agent roster

`docs/AGENT_ROSTER.md` for the `flutter-firebase` profile: the lanes of the profile's `references/agents.md`, which wins where this example and it differ. A project adjusts them only to its real folders (an architecture-added Hosting folder, a nightly workflow) and lists each workflow file by name.

```markdown
# Agent roster — {Project}

Lanes are exclusive: no path is owned by two agents. The orchestrator is a role,
not an agent, and has no entry here (see docs/ORCHESTRATOR.md).

## flutter-dev

Builds the Flutter apps and shared Dart packages; obsessive about tap targets, empty states and offline behavior.

**Owns:** `apps/**`, `packages/core/**`, `packages/data/**`, `packages/ui/**`, `packages/feature_*/**`, `melos.yaml`, `pubspec.yaml`, `pubspec.lock`, `.github/workflows/flutter.yml`
**Reads:** `docs/**`, `mockups/**`, `packages-ts/types/**`, `firestore.rules`
**Refuses:** Cloud Functions, security rules and indexes, the admin dashboard, the TypeScript workspace and its lockfile

## firebase-dev

Paranoid about security rules, methodical about idempotency; owns everything that runs on the server, the TypeScript workspace and the deploy pipeline.

**Owns:** `functions/**`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules`, `firebase.json`, `.firebaserc`, `emulator-data/**`, `packages-ts/types/**`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/workflows/firebase.yml`, `.github/workflows/deploy-*.yml`, `.github/workflows/spec-guard.yml`, `.gitignore`, `.tool-versions`, `.env.example`, `README.md`
**Reads:** `docs/**`, `apps/**`, `packages/**`, `admin/**`
**Refuses:** Flutter code, the admin dashboard

## react-dev

Builds the admin dashboard; data-dense tables, keyboard-first, typed end to end against the shared types.

**Owns:** `admin/**`, `.github/workflows/admin.yml`
**Reads:** `docs/**`, `mockups/**`, `packages-ts/types/**`
**Refuses:** Flutter code, Cloud Functions, security rules, changes to `packages-ts/types/` or `pnpm-lock.yaml` (asks `firebase-dev`)

## qa-tester

Reviews every deliverable against its acceptance criteria and its lane.

**Owns:** none
**Reads:** `**`
**Refuses:** editing code

## Paths outside every lane

- Spec workflow: `docs/**`, `mockups/**`, `AGENTS.md`, `CLAUDE.md`. A build result that changes a spec document goes back through the spec workflow.
- Installed tooling, rewritten by its installer: `tools/spec-guard/**`, `.githooks/**`, `.claude/**`, `.aiudalabs-marketplace.json`.
- `STATUS.md`: sprint outcomes, written by `sprint-runner` when a sprint closes.

Build issues read them and never list them in `files_touched`.
```

The heading `## Paths outside every lane` is not an agent name, so the checks do not read it as one. A heading in agent-name form (`## shared-files`) would be read as an agent with no lane.

For `fastapi-react`, the roster is `python-dev` (`src/**`, `alembic/**`, `alembic.ini`, `tests/**`, `pyproject.toml`, its lockfile, `deploy/**`, `Dockerfile`, `scripts/**`, the workflows), `react-dev` (`frontend/**`, including its own lockfile) and `qa-tester`. An API-only product drops `react-dev`.

`product-advisor` reviews the spec documents and owns no lane: it is a consultant outside the roster, not an entry in it.

Per-lane validation commands and the handoff to `qa-tester` go in `AGENTS.md` and `ORCHESTRATOR.md`, not in the roster, so the roster stays in the shape the checks read.

## Shared and generated files

Every path an issue will write sits in exactly one lane. These files are the ones that slip through:

| File | Owner | How the other lanes get a change |
|---|---|---|
| CI workflows | A workflow that validates one lane belongs to it; one that spans lanes, and every deploy, belongs to the pipeline lane of the profile | The owning lane's issue edits it. The flutter-firebase scaffold already ships one workflow per lane (`flutter.yml`, `firebase.yml`, `admin.yml`) |
| `.github/workflows/spec-guard.yml` | The pipeline lane (`firebase-dev` for flutter-firebase). The installer writes it, and `install.mjs --ci` rewrites it while it keeps the spec-guard marker comment | An owner issue that customizes it removes the marker line, so a reinstall leaves it alone |
| `tools/spec-guard/**`, `.githooks/**`, `.claude/**`, `.aiudalabs-marketplace.json`, `STATUS.md` | No lane: installers write the tooling, `sprint-runner` writes `STATUS.md` | Re-run the installer; no issue edits them |
| Lockfiles (`pnpm-lock.yaml`, `pubspec.lock`, `uv.lock`, `poetry.lock`, `package-lock.json`) | The lane that owns the workspace manifest they belong to (root `package.json` and `pnpm-workspace.yaml`; `melos.yaml` and the root `pubspec.yaml`) | Put every dependency the plan already knows into the Sprint 0 setup issues of the lockfile owner. A later need: the requesting issue declares the dependency in its own package manifest, and an issue of the lockfile owner that depends on it refreshes the lockfile |
| Aggregators: a functions barrel `src/index.ts`, a route or DI registry, a Dart library barrel | The lane that owns the folder | Make it generated at build time (a Sprint 0 issue writes the generator) or discovered by convention, so unit issues never list it. If it must be hand-edited, one wiring issue per sprint edits it after the units; never put it in every unit issue's `files_touched`, which turns the sprint into one serial chain of waves |
| Generated code (`*.g.dart`, `*.freezed.dart`, generated API clients, the Dart mirror of shared types) | The lane that owns the source it is generated from, unless the consumer generates it in its own folder | The issue that changes the source lists the generated paths too, or a follow-up issue of the consuming lane regenerates them |
| Root dotfiles (`.gitignore`, `.env.example`, `.tool-versions`, `.editorconfig`, root `README.md`) | Assign each one explicitly, usually to the pipeline lane | Asked for like any other file |

An issue that needs two lanes is two issues, wired with `depends_on`. When an executor finds mid-issue that it needs a file outside its lane, it stops and asks the orchestrator; the orchestrator adds or amends an issue for the owner (`execution-router` between sprints), and the original issue waits for it.

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
| flutter-dev | `melos run analyze && melos run format-check && melos run test` |
| firebase-dev | `pnpm --dir functions run typecheck && pnpm --dir functions run lint && pnpm --dir functions run test && pnpm rules:test` |
| react-dev | `pnpm --dir admin run lint && pnpm --dir admin run typecheck && pnpm --dir admin run test && pnpm --dir admin run build` |

Use the scripts the packages actually define (read each `package.json` and `melos.yaml`); these are the flutter-firebase scaffold's. A command is green only when its output shows the script ran: pnpm exits 0 on "No projects matched the filters" and "None of the selected packages has a ... script", which is why the commands use `--dir <folder> run`, which fails on a missing script, instead of `--filter <name>`. A test command that reports "No test files found" verified nothing: it is pending until the package's first test exists.

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
  - functions/test/unit/createBooking.test.ts   # where the unit-test config looks
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

A UI issue's `reads`, for one key screen (`1.2.1`, picked for mockups) and one screen without a mockup (`1.2.4`):

```yaml
reads:
  - docs/UI_SCREENS.md#s-1.2.1
  - mockups/player-app.html#s-1.2.1    # key screen: copied from the UI_SCREENS back-link
  - docs/UI_SCREENS.md#s-1.2.4         # no mockup anchor: not a key screen
  - docs/FIREBASE_SCHEMA.md#bookings
```

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
