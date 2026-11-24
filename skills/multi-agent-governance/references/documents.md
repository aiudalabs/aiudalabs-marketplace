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
| CI workflows | A workflow that validates one lane belongs to it; one that spans lanes, and every deploy, belongs to the pipeline lane of the profile | The owning lane's issue edits it. The flutter-firebase scaffold already ships one workflow per lane (`flutter.yml`, `firebase.yml`, `admin.yml`). A deploy workflow calls them (`uses: ./.github/workflows/firebase.yml`) instead of copying their jobs; a lane workflow without `on: workflow_call` gets it from its lane's issue, and the deploy issue depends on that issue |
| `.github/workflows/spec-guard.yml` | The pipeline lane (`firebase-dev` for flutter-firebase). The installer writes it, and `install.mjs --ci` rewrites it while it keeps the spec-guard marker comment | An owner issue that customizes it removes the marker line, so a reinstall leaves it alone |
| `tools/spec-guard/**`, `.githooks/**`, `.claude/**`, `.aiudalabs-marketplace.json`, `STATUS.md` | No lane: installers write the tooling, `sprint-runner` writes `STATUS.md` | Re-run the installer; no issue edits them |
| Lockfiles (`pnpm-lock.yaml`, `pubspec.lock`, `uv.lock`, `poetry.lock`, `package-lock.json`) | The lane that owns the workspace manifest they belong to (root `package.json` and `pnpm-workspace.yaml`; `melos.yaml` and the root `pubspec.yaml`) | Put every dependency the plan already knows into the first-wave Sprint 0 setup issues, and one refresh in the wave right after them. A later need: the requesting issue declares the dependency in its own package manifest and carries `merge_with: <refresh id>`; the lockfile owner's refresh depends on it, and both merge at the same barrier |
| Aggregators: a functions barrel `src/index.ts`, a route or DI registry, a Dart library barrel | The lane that owns the folder | Make it generated at build time (a Sprint 0 issue writes the generator) or discovered by convention, so unit issues never list it. If it must be hand-edited, one wiring issue per sprint edits it after the units; never put it in every unit issue's `files_touched`, which turns the sprint into one serial chain of waves |
| Generated code (`*.g.dart`, `*.freezed.dart`, generated API clients, the Dart mirror of shared types) | The lane that owns the source it is generated from, unless the consumer generates it in its own folder | The issue that changes the source lists the generated paths too, or a follow-up issue of the consuming lane regenerates them |
| Root dotfiles (`.gitignore`, `.env.example`, `.tool-versions`, `.editorconfig`, root `README.md`) | Assign each one explicitly, usually to the pipeline lane | Asked for like any other file |

An issue that needs two lanes is two issues, wired with `depends_on`. When an executor finds mid-issue that it needs a file outside its lane, it stops and asks the orchestrator; the orchestrator adds or amends an issue for the owner (`execution-router` between sprints), and the original issue waits for it. An amendment to the running issue itself is committed on the base with `spec.mjs amend`, which syncs its executor prompt; the owner merges the base into `wt/<id>`.

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
- Gives each worktree its emulator port offset; stops what the wave left running before removing a worktree.
- Merges approved issues at the wave barrier, in id order; a manifest issue with `merge_with` merges together with its lockfile refresh.
- Commits approved amendments on the base with `spec.mjs amend` (never a hand edit of files, dependencies or reads; it syncs the prompts), and has the owner merge the base into `wt/<id>`.
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
| flutter-dev | `CI=true melos bootstrap && CI=true melos run deps-check && CI=true melos run analyze && CI=true melos run format-check && CI=true melos run tests-present && CI=true melos run test` |
| firebase-dev | `pnpm --dir functions run typecheck && pnpm --dir functions run lint && pnpm --dir functions run test && pnpm run functions:stage && pnpm rules:test && pnpm emulators:test && pnpm emulators:check && pnpm --dir packages-ts/types run typecheck` |
| react-dev | `pnpm --dir admin run lint && pnpm --dir admin run typecheck && pnpm --dir admin run test && pnpm --dir admin run build` |

Use the scripts the packages actually define (read each `package.json` and `melos.yaml`); these are the flutter-firebase scaffold's. Melos runs with `CI=true`: without a TTY its first-run prompt crashes it. `melos run test` skips a package without `test/`, so `tests-present` runs first. A command is green only when its output shows the script ran: pnpm exits 0 on "No projects matched the filters" and "None of the selected packages has a ... script", which is why the commands use `--dir <folder> run`, which fails on a missing script, instead of `--filter <name>`. A test command that reports "No test files found" verified nothing: it is pending until the package's first test exists. The functions suites go through `functions/scripts/vitest-suite.mjs`: a suite with no test file prints `NOT RUN (0 test files)` and exits 0, which is reported as not run, never as a pass; from its first test file on it runs strict by itself. The admin's `test` keeps `--passWithNoTests` until its first test: the issue that adds the admin's first test lists `admin/package.json` in `files_touched` and drops `--passWithNoTests` from its `test` script in the same issue.

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

An issue whose deliverable the lane gate never runs adds `gate:`, which the executor prompt puts ahead of the lane commands:

```yaml
gate:
  - bash -n tools/bootstrap-iam.sh
  - shellcheck tools/bootstrap-iam.sh
  - tools/bootstrap-iam.sh --dry-run dev | diff - tools/test/bootstrap-iam.dev.txt
```

A manifest issue paired with its lockfile refresh:

```yaml
files_touched:
  - admin/package.json
merge_with: S0-09   # firebase-dev refreshes pnpm-lock.yaml; S0-09 depends_on this issue
```

A UI issue's `reads`, for one key screen (`1.2.1`, picked for mockups) and one screen without a mockup (`1.2.4`):

```yaml
reads:
  - docs/UI_SCREENS.md#s-1.2.1
  - mockups/player-app.html#s-1.2.1    # key screen: copied from the UI_SCREENS back-link
  - docs/UI_SCREENS.md#s-1.2.4         # no mockup anchor: not a key screen
  - docs/FIREBASE_SCHEMA.md#bookings
```

## Spike issue

The criteria of a spike that compares options:

```markdown
### Acceptance criteria
1. `functions/src/adapters/payments/SPIKE.md` scores each candidate on the table below. Each cell has a result and an evidence tag: `docs` (first-party docs), `sandbox` (run on a test account), `quote` (written vendor answer), `3p` (third-party source), `unverified`.
2. A cell scores **pass** only on `docs`, `sandbox` or `quote`; `3p` caps it at **partial**, `unverified` at **unknown**.
3. Gates (any fail or unknown rules the candidate out): split payments, sandbox available, settles in the brief's currency.
4. Weighted (1-3 each): fees, SDK quality, payout delay. The winner passes every gate with the highest weighted total.
5. The done SUMMARY names the winner and the spec change it feeds: "record the chosen gateway as decision D-13".
```

Merchant onboarding with the winner runs on the vendor's timeline: it is a separate issue for a person, so it never blocks the spike's barrier.

## Sprint prompts

### Orchestrator prompt (one per sprint)

```
You are playing the orchestrator role for Sprint {N}: {theme}.

Read first: AGENTS.md, docs/AGENT_ROSTER.md, docs/ORCHESTRATOR.md,
docs/ISSUES.md (Sprint {N}), docs/WAVE_DAG.md (Sprint {N}).
Run `node tools/spec-guard/spec.mjs status` and confirm the scope in one paragraph.

Current state: Sprints 0..{N-1} are merged. {Key facts about the repo.}
This sprint has {M} issues in {W} waves:
- Wave 1: S{N}-01 (owner, wt/S{N}-01), S{N}-02 (...), ...
- Wave 2: ...
Within each wave files_touched are disjoint (computed by spec.mjs waves).

For each wave: one worktree per issue off {base branch}; dispatch the owner
with its executor prompt from docs/SPRINT_PROMPTS.md; send each finished issue
to qa-tester, who runs `spec.mjs verify <id>`; merge approved issues at the
barrier, in id order. A merge conflict stops the sprint.
Give the k-th worktree of a wave emulator port offset k*100; its emulator
gates run with FIREBASE_CONFIG="$(node tools/emulator-config.mjs <offset>)",
a git-ignored firebase.emulators-<offset>.json in the worktree root, deleted
after the gate. Every gate stops what it starts, and you stop what is left
before removing a worktree.
Merge a `merge_with` issue together with its lockfile refresh: {pairs or "none"}.
An approved amendment: commit it on {base branch} with `spec.mjs amend`
(it syncs the prompts), and have the owner merge {base branch} into wt/<id>;
the hooks allow no other merge into an issue branch.

Issues that need a person mid-way: {ids with autonomous: false}.

Output the wave execution plan FIRST: which agent gets which issue in which
worktree. Do NOT spawn any agent until I approve. Wait for my response.
```

### Executor prompt (one per issue)

```
You are {owner}. You will deliver issue {S{N}-nn} in worktree wt/{S{N}-nn}.
Your lane is docs/AGENT_ROSTER.md § {owner}. Refuse anything outside it.
Follow the `issue-delivery` skill if it is installed.

Read these first, in order:
  {issue.reads, one per line}
Then the decisions and requirements your issue cites, and nothing else.

The issue:
{full issue: heading, frontmatter, Objetivo, acceptance criteria — verbatim}

Commits: one task, one commit:
  {S{N}-nn} task-{k}: {summary} [refs: {decision_refs}, {requirement_refs}]
Never commit with red tests. Touch only files_touched.

Validate with: {issue.gate, if any}, then {lane commands from AGENTS.md},
and `node tools/spec-guard/spec.mjs verify {S{N}-nn}`.
Emulator gates use port offset {offset}:
  FIREBASE_CONFIG="$(node tools/emulator-config.mjs {offset})" pnpm rules:test
(same for emulators:test and emulators:check). Delete the
firebase.emulators-{offset}.json it writes and stop everything you start
before you report.

Done signal: post a SUMMARY with files changed, commits, deviations from the
spec and how qa-tester should check it. Do not merge; the orchestrator merges
at the wave barrier.
```

Rendering notes:
- Omit ` [refs: ...]` from the commit line when both `decision_refs` and `requirement_refs` are empty; never write `[refs: setup]`.
- Omit the `{issue.gate}` part when the issue has no `gate:`.
- Keep the parts `spec.mjs prompts --write` syncs in this shape: the `Read these ...` line with the reads indented under it, the issue copy followed by the `Commits:` line, and one `- Wave N:` line per wave after `This sprint has ...`.
- `{offset}` is the worktree's emulator port offset (`sprint-runner`); omit the lines for a lane without emulators, and keep only the last sentence when the project has no `tools/emulator-config.mjs` (its emulator gates then run one worktree at a time). The config file sits in the worktree root, not outside it: firebase-tools treats the config's folder as the project directory.
