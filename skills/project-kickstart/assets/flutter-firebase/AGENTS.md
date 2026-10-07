# {{project_title}}

> One-sentence description of what this product does. `product-discovery` replaces this line with the brief's tagline at the end of Phase 1.

**Spec page style:** Aiuda Labs look {{aiuda_look}}.

This file is the repository constitution. Every coding agent reads it first: Codex, Copilot, Cursor and OpenCode read `AGENTS.md` natively, and the root `CLAUDE.md` imports it for Claude Code. `multi-agent-governance` (Phase 6) rewrites it with the final roster and rules; until then it holds the scaffold defaults.

## Stack

- **Stack profile:** flutter-firebase
- **Flutter** mobile (Dart 3.6+, Flutter {{flutter_version}}+)
- **Firebase** (Firestore, RTDB, Storage, Auth, Functions, Cloud Messaging)
- **Node {{node_version}}** + TypeScript Cloud Functions (2nd gen)
- **React + Vite + TypeScript** admin dashboard, from the Vite `react-ts` template plus Vitest. Tailwind or shadcn/ui are added by an issue when `docs/ARCHITECTURE.md` chooses them.
- **Monorepo** via Melos 6 (Flutter) + pnpm workspaces (TypeScript)

Apps included: {{apps_included}}

## How to work on this repo

Every command below exists in the scaffold. An issue that adds a command (a type-parity check, an end-to-end runner) adds it here too. Package scripts run with `pnpm --dir <folder> run <script>`, which fails when the script is missing; `pnpm --filter` exits 0 when nothing matches, so it can pass without running anything.

```bash
# One-time setup
dart pub global activate melos '>=6.3.0 <7.0.0'
melos bootstrap                            # install Flutter deps
pnpm install                               # install TS deps
firebase use {{project_name}}-dev          # set Firebase project
git config core.hooksPath .githooks        # enable the spec-guard hooks in this clone

# Daily dev, emulator-first (the emulator serves the functions; do not start a second one)
pnpm emulators                             # terminal 1: firebase emulators:start --import=./emulator-data --export-on-exit
pnpm --dir functions run build:watch        # terminal 2: recompile functions; the emulator reloads them
cd apps/<app-name> && flutter run          # terminal 3: one of the apps named in Phase 1
pnpm --dir admin run dev                    # terminal 4: the admin (Vite dev server)

# Validation (run before declaring an issue done; CI runs the same per lane)
melos run analyze
melos run format-check
melos run test
pnpm --dir functions run typecheck
pnpm --dir functions run lint
pnpm --dir functions run test               # unit tests: functions/src/**/*.test.ts, functions/test/unit/**
pnpm rules:test                            # security rules tests (functions/test/rules/**) in the Firestore emulator
pnpm emulators:test                        # integration tests (functions/test/integration/**) against the emulators
pnpm --dir admin run lint
pnpm --dir admin run typecheck              # tsc -b
pnpm --dir admin run test
pnpm --dir admin run build                  # tsc -b && vite build

# Spec guardrails
node tools/spec-guard/spec.mjs status
node tools/spec-guard/spec.mjs check
```

The test scripts run with `--passWithNoTests` only so the empty scaffold passes CI: until a package has its first test, "No test files found" verifies nothing. The Sprint 0 issue that adds a package's first test removes the flag. A test file outside the globs above never runs.

CI is one workflow per lane, each owned by that lane: `.github/workflows/flutter.yml` (flutter-dev), `firebase.yml` (firebase-dev), `admin.yml` (react-dev), plus `spec-guard.yml` written by the spec-guard installer (firebase-dev).

## Agents

Default roster of the `flutter-firebase` profile. The final roster and lanes live in `docs/AGENT_ROSTER.md` (written in Phase 6), which wins over this list.

- **`flutter-dev`**: owns `apps/**`, `packages/core/**`, `packages/data/**`, `packages/ui/**`, `packages/feature_*/**`, `melos.yaml`, `pubspec.yaml`, `pubspec.lock`, `.github/workflows/flutter.yml`
- **`firebase-dev`**: owns `functions/**`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules`, `firebase.json`, `.firebaserc`, `emulator-data/**`, `packages-ts/types/**`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/workflows/firebase.yml`, `.github/workflows/deploy-*.yml`, `.github/workflows/spec-guard.yml`, `.gitignore`, `.tool-versions`, `.env.example`, `README.md`
- **`react-dev`**: owns `admin/**`, `.github/workflows/admin.yml`
- **`qa-tester`**: reviews everything, owns no file, never edits code

File ownership is exclusive. An issue that needs two lanes is split into two issues.

Outside every lane, never in an issue's `files_touched`: the spec workflow's `docs/**`, `mockups/**`, `AGENTS.md` and `CLAUDE.md`; installed tooling (`tools/spec-guard/**`, `.githooks/**`, `.claude/**`, `.aiudalabs-marketplace.json`); and `STATUS.md`, written by `sprint-runner`.

Shared and generated files have one owner too:

- **Lockfiles** follow the workspace file that produces them. `react-dev` adds a dependency in `admin/package.json`; the `pnpm-lock.yaml` refresh is a `firebase-dev` issue. Dart lockfiles are `flutter-dev`'s.
- **`functions/src/index.ts` is generated, never edited.** `functions/scripts/gen-index.mjs` writes it before every build, typecheck, lint and test, from the files in `functions/src/callable/`, `triggers/`, `scheduled/` and `https/`. Each function is one file that exports itself by name; no issue lists `index.ts` in `files_touched`, and git ignores it. Restart `build:watch` after adding a function file.

The orchestrator is a role, not an agent: whoever runs a sprint routes work to the owners, merges at the wave barrier and never writes code. See `docs/ORCHESTRATOR.md`.

## Sprint discipline

Issues live in `docs/ISSUES.md`. Each issue has an owner, `files_touched`, `depends_on`, `decision_refs`, `requirement_refs`, a one-line goal and numbered acceptance criteria. Its `reads:` list names the documents to open before writing code: **open every one of them first**.

**UI issues** (screens, widgets, admin pages): open the screen section in `docs/UI_SCREENS.md#s-<screen-id>` and, for a key screen, the mockup in `mockups/<app-id>.html#s-<screen-id>`. Where a mockup exists it is the visual source of truth; build to match it.

Paste-ready prompts live in `docs/SPRINT_PROMPTS.md`. Waves are computed, never chosen by hand: `node tools/spec-guard/spec.mjs waves --write`.

## Hard rules (override anything else)

1. **Never commit if tests are red.** All validation commands pass before push.
2. **Never bypass security rules.** Clients never write a `status` field directly.
3. **Every state machine transition runs in a Cloud Function**, never in the client.
4. **Atomic commits.** One task, one commit: `S3-07 task-1: <summary> [refs: D-03, FR-BOOKING-2]`.
5. **Stay in your lane.** Edit only the files in your issue's `files_touched`, inside your lane in `docs/AGENT_ROSTER.md`. The git hooks of spec-guard block the rest.
6. **One worktree per issue** (`wt/<issue-id>`); merges happen at the wave barrier, never mid-wave.
7. **Every callable function accepts `clientRequestId` for idempotency** (24 h dedup minimum).
8. **Canonical types live in `packages-ts/types/`** and are mirrored to Dart; no other coupling between Flutter and TypeScript.
9. **No hardcoded environment values, no secrets in env files.** Non-secret config comes from Firebase config or `.env`; secrets come from Secret Manager (`defineSecret`).
10. **Production deploys come from tagged `main`**, never from feature branches.
11. **Every deliverable goes through `qa-tester` before merge.** No exceptions.

## Where things live

```
{{project_name}}/
├── AGENTS.md                    # this file, the constitution
├── CLAUDE.md                    # imports this file for Claude Code
├── STATUS.md                    # sprint outcomes, written by sprint-runner
├── docs/                        # design docs, written by the spec skills (progress: spec.mjs status)
│   ├── SESSION.md               # narrative for the next session
│   ├── PRODUCT_BRIEF.md
│   ├── OPINIONATED_DEFAULTS.md
│   ├── PRD.md
│   ├── FIREBASE_SCHEMA.md
│   ├── UI_SCREENS.md
│   ├── ARCHITECTURE.md
│   ├── AGENT_ROSTER.md
│   ├── ORCHESTRATOR.md
│   ├── ISSUES.md
│   ├── WAVE_DAG.md
│   ├── SPRINT_PROMPTS.md
│   └── OPERATIONAL_READINESS.md
├── mockups/                     # HTML mockups (navegable-mockups)
├── apps/                        # Flutter apps, named in Phase 1
├── packages/                    # Flutter packages
├── packages-ts/types/           # canonical TS types (firebase-dev)
├── functions/                   # Cloud Functions (firebase-dev)
├── admin/                       # React admin (react-dev), only with a web dashboard
├── .github/workflows/           # one CI workflow per lane
├── tools/spec-guard/            # spec checks and git hooks
└── emulator-data/               # seeded emulator data
```

## What this repo does NOT do

- Billing or subscription management outside the product's own flows
- Analytics beyond Firebase Analytics (BigQuery export deferred, see `docs/ARCHITECTURE.md`)
- The marketing site, which is a separate repo
- Marketing email; only transactional email lives here
