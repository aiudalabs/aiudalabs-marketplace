# {{project_title}}

> One-sentence description of what this product does. `product-discovery` replaces this line with the brief's tagline at the end of Phase 1.

**Spec page style:** Aiuda Labs look {{aiuda_look}}.

This file is the repository constitution. Every coding agent reads it first: Codex, Copilot, Cursor and OpenCode read `AGENTS.md` natively, and the root `CLAUDE.md` imports it for Claude Code. `multi-agent-governance` (Phase 6) rewrites it with the final roster and rules; until then it holds the scaffold defaults.

## Stack

- **Stack profile:** flutter-firebase
- **Flutter** {{flutter_version}} mobile, pinned in `.tool-versions` and CI
- **Firebase** (Firestore, Storage, Auth, Functions, Cloud Messaging). Realtime Database only when `docs/ARCHITECTURE.md` adopts it; the issue that does adds its rules file, `firebase.json` block and emulator
- **Node {{node_version}}** + TypeScript Cloud Functions (2nd gen), region `{{functions_region}}` (set once, in `functions/src/init.ts`), bundled with esbuild and deployed from `functions/.deploy`
- **React + Vite + TypeScript** admin dashboard, from the Vite `react-ts` template plus Vitest. Tailwind or shadcn/ui are added by an issue when `docs/ARCHITECTURE.md` chooses them.
- **Monorepo** via Melos 6 (Flutter) + pnpm workspaces (TypeScript)

Apps included: {{apps_included}}

## How to work on this repo

Every command below exists in the scaffold, unless marked `(from <issue-id>)`. `AGENTS.md` is outside every lane: a command an issue will add is written here beforehand with that mark, or the orchestrator adds it at the wave barrier; an acceptance criterion never says "adds the command to AGENTS.md". Package scripts run with `pnpm --dir <folder> run <script>`, which fails when the script is missing; `pnpm --filter` exits 0 when nothing matches, so it can pass without running anything.

```bash
# One-time setup (Melos runs with CI=true: without a TTY its first-run prompt crashes it)
dart pub global activate melos '>=6.3.0 <7.0.0'
CI=true melos bootstrap                    # install Flutter deps
pnpm install                               # install TS deps
cp functions/.env.local.example functions/.env.local   # emulator-only values, never committed
pnpm --dir admin run build                  # the Hosting emulator serves admin/dist
node links/scripts/stage-links.mjs default # the dev App Links files, for the Hosting emulator
firebase use {{project_name}}-dev          # set Firebase project
git config core.hooksPath .githooks        # enable the spec-guard hooks in this clone

# Daily dev, emulator-first (the emulator serves the functions; do not start a second one)
pnpm emulators                             # terminal 1: stages functions/.deploy, then emulators:start (exports emulator-data/ on exit)
pnpm --dir functions run build:watch        # terminal 2: rebundles and restages functions/.deploy; the emulator reloads it
cd apps/<app-name> && flutter run --dart-define=USE_EMULATORS=true   # terminal 3; EMULATOR_HOST=10.0.2.2 on Android
pnpm --dir admin run dev                    # terminal 4: the admin (Vite dev server)
pnpm emulators:check                       # non-interactive check that the emulators and functions start, then stop

# Validation (run before declaring an issue done; CI runs the same per lane)
# flutter-dev
CI=true melos bootstrap && CI=true melos run deps-check && CI=true melos run analyze && CI=true melos run format-check && CI=true melos run tests-present && CI=true melos run test
# firebase-dev
pnpm --dir functions run typecheck          # src/ and test/
pnpm --dir functions run lint               # src/ and test/
pnpm --dir functions run test               # unit tests: functions/src/**/*.test.ts, functions/test/unit/**
pnpm run functions:stage                    # build and stage functions/.deploy; fails on a function without a region
pnpm rules:test                            # security rules tests (functions/test/rules/**) in the Firestore emulator
pnpm emulators:test                        # builds and stages, then integration tests (functions/test/integration/**)
pnpm --dir packages-ts/types run typecheck
# react-dev
pnpm --dir admin run lint                   # oxlint --deny-warnings -f default: prints its counts
pnpm --dir admin run typecheck              # tsc -b
pnpm --dir admin run test
pnpm --dir admin run build                  # tsc -b && vite build

# Spec guardrails
node tools/spec-guard/spec.mjs status
node tools/spec-guard/spec.mjs check
```

A command passes only when its output shows it ran. The functions test scripts go through `functions/scripts/vitest-suite.mjs`: a suite with no test file prints `NOT RUN (0 test files)` and exits 0, which is reported as not run, never as a pass; from its first test file on, Vitest runs without `--passWithNoTests`. A `*.test.ts` under `functions/test/` outside `unit/`, `rules/` and `integration/` fails the unit run, and `emulators:test` fails when the Functions emulator loaded no function. `melos run test` skips a package without `test/`, so the gate runs `tests-present` first. The admin's `test` keeps `--passWithNoTests`: count the tests it ran.

Parallel worktrees run their emulator gates on shifted ports: `FIREBASE_CONFIG="$(node tools/emulator-config.mjs <offset>)" pnpm rules:test` (same for `emulators:test` and `emulators:check`); the offset is the worktree's (100, 200, ...). Stop only the emulators you started.

CI is one workflow per lane, each owned by that lane: `.github/workflows/flutter.yml` (flutter-dev), `firebase.yml` (firebase-dev), `admin.yml` (react-dev), plus `spec-guard.yml` written by the spec-guard installer (firebase-dev).

## Agents

Default roster of the `flutter-firebase` profile. The final roster and lanes live in `docs/AGENT_ROSTER.md` (written in Phase 6), which wins over this list.

- **`flutter-dev`**: owns `apps/**`, `packages/core/**`, `packages/data/**`, `packages/ui/**`, `packages/feature_*/**`, `melos.yaml`, `pubspec.yaml`, `pubspec.lock`, `tools/deps-check.mjs`, `.github/workflows/flutter.yml`
- **`firebase-dev`**: owns `functions/**`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `firebase.json`, `.firebaserc`, `emulator-data/**`, `packages-ts/types/**`, `links/**`, `tools/emulator-config.mjs`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/workflows/firebase.yml`, `.github/workflows/deploy-*.yml`, `.github/workflows/spec-guard.yml`, `.gitignore`, `.tool-versions`, `.env.example`, `README.md`
- **`react-dev`**: owns `admin/**`, `.github/workflows/admin.yml`
- **`qa-tester`**: reviews everything, owns no file, never edits code

File ownership is exclusive. An issue that needs two lanes is split into two issues.

Outside every lane, never in an issue's `files_touched`: the spec workflow's `docs/**`, `mockups/**`, `AGENTS.md` and `CLAUDE.md`; installed tooling (`tools/spec-guard/**`, `.githooks/**`, `.claude/**`, `.aiudalabs-marketplace.json`); and `STATUS.md`, written by `sprint-runner`.

Shared and generated files have one owner too:

- **Lockfiles** follow the workspace file that produces them. `react-dev` adds a dependency in `admin/package.json`; the `pnpm-lock.yaml` refresh is a `firebase-dev` issue. Dart lockfiles are `flutter-dev`'s.
- **`functions/src/index.ts` is generated, never edited.** `functions/scripts/gen-index.mjs` writes it before every build, typecheck, lint and test, from the files in `functions/src/callable/`, `triggers/`, `scheduled/` and `https/`. Each function is one file that exports itself by name; no issue lists `index.ts` in `files_touched`, and git ignores it. Restart `build:watch` after adding a function file. `functions/lib/` (the esbuild bundle) and `functions/.deploy/` (the staged deploy source) are build output, ignored by git; `functions/src/lib/` is source.

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
├── functions/                   # Cloud Functions (firebase-dev): src/, scripts/ (gen-index, bundle, stage-deploy)
├── links/                       # Hosting site for App Links: env/<alias>/.well-known/, public/open.html
├── admin/                       # React admin (react-dev), only with a web dashboard
├── .github/workflows/           # one CI workflow per lane
├── tools/                       # spec-guard/ (spec checks, git hooks), deps-check.mjs, emulator-config.mjs
└── emulator-data/               # seeded emulator data
```

## What this repo does NOT do

- Billing or subscription management outside the product's own flows
- Analytics beyond Firebase Analytics (BigQuery export deferred, see `docs/ARCHITECTURE.md`)
- The marketing site, which is a separate repo
- Marketing email; only transactional email lives here
