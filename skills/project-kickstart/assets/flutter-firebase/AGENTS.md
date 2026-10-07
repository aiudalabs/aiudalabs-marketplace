# {{project_title}}

> One-sentence description of what this product does. Filled in after Phase 1 (`product-discovery`).

This file is the repository constitution. Every coding agent reads it first: Codex, Copilot, Cursor and OpenCode read `AGENTS.md` natively, and the root `CLAUDE.md` imports it for Claude Code. `multi-agent-governance` (Phase 6) rewrites it with the final roster and rules; until then it holds the scaffold defaults.

## Stack

- **Stack profile:** flutter-firebase
- **Flutter** mobile (Dart 3.6+, Flutter {{flutter_version}}+)
- **Firebase** (Firestore, RTDB, Storage, Auth, Functions, Cloud Messaging)
- **Node {{node_version}}** + TypeScript Cloud Functions
- **React + Vite + Tailwind + shadcn/ui** admin dashboard
- **Monorepo** via Melos (Flutter) + pnpm workspaces (TypeScript)

Apps included: {{apps_included}}

## How to work on this repo

```bash
# One-time setup
melos bootstrap                            # install Flutter deps
pnpm install                               # install TS deps
firebase use {{project_name}}-dev          # set Firebase project
git config core.hooksPath .githooks        # enable the spec-guard hooks in this clone

# Daily dev, emulator-first
firebase emulators:start --import=./emulator-data --export-on-exit  # terminal 1
cd functions && pnpm dev                                            # terminal 2 (functions watch mode)
cd apps/<app-name> && flutter run                                   # terminal 3, one of the apps defined in Phase 1
cd admin && pnpm dev                                                # terminal 4 (admin)

# Validation (run before declaring an issue done)
melos run analyze
melos run test
pnpm --filter functions test
pnpm --filter admin test

# Spec guardrails (after the spec-guard tools are installed)
node tools/spec-guard/spec.mjs status
node tools/spec-guard/spec.mjs check
```

## Agents

Default roster of the `flutter-firebase` profile. The final roster and lanes live in `docs/AGENT_ROSTER.md` (written in Phase 6).

- **`flutter-dev`**: owns `apps/**`, `packages/ui/**`, `packages/feature_*/**`, `packages/core/**`
- **`firebase-dev`**: owns `functions/**`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules`, `packages-ts/types/**`, `firebase.json`
- **`react-dev`**: owns `admin/**`
- **`qa-tester`**: reviews everything, owns no file, never edits code

File ownership is exclusive. An issue that needs two lanes is split into two issues.

The orchestrator is a role, not an agent: whoever runs a sprint routes work to the owners, merges at the wave barrier and never writes code. See `docs/ORCHESTRATOR.md`.

## Sprint discipline

Issues live in `docs/ISSUES.md`. Each issue has an owner, `files_touched`, `depends_on`, `decision_refs`, `requirement_refs`, a one-line goal and numbered acceptance criteria. Its `reads:` list names the documents to open before writing code: **open every one of them first**.

**UI issues** (screens, widgets, admin pages): open both the screen section in `docs/UI_SCREENS.md` and the matching mockup in `mockups/<app>-app.html#s-<screen-id>`. The mockup is the visual source of truth; build to match it.

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
9. **No hardcoded environment values.** Use Firebase config or env files.
10. **Production deploys come from tagged `main`**, never from feature branches.
11. **Every deliverable goes through `qa-tester` before merge.** No exceptions.

## Where things live

```
{{project_name}}/
├── AGENTS.md                    # this file, the constitution
├── CLAUDE.md                    # imports this file for Claude Code
├── STATUS.md                    # current sprint status
├── docs/                        # design docs, written by the spec skills
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
├── admin/                       # React admin (react-dev)
├── tools/spec-guard/            # spec checks and git hooks
└── emulator-data/               # seeded emulator data
```

## What this repo does NOT do

- Billing or subscription management outside the product's own flows
- Analytics beyond Firebase Analytics (BigQuery export deferred, see `docs/ARCHITECTURE.md`)
- The marketing site, which is a separate repo
- Marketing email; only transactional email lives here
