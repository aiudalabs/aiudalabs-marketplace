# flutter-firebase: kickstart

The scaffold is done by the `project-kickstart` skill, which reads the locked profile and builds the repository. This file is the profile's half of that contract: what the scaffold must contain for `flutter-firebase`. It does not repeat the procedure.

## Repository after the scaffold

```
{project-name}/
├── AGENTS.md                 # repository constitution (stack, commands, lanes, rules)
├── CLAUDE.md                 # one line: @AGENTS.md
├── README.md
├── .gitignore, .tool-versions, .env.example
├── melos.yaml                # Flutter packages
├── pubspec.yaml              # root Flutter workspace
├── package.json              # root TypeScript workspace
├── pnpm-workspace.yaml
├── firebase.json, .firebaserc
├── firestore.rules           # default-deny
├── firestore.indexes.json    # empty, filled from the schema in Sprint 0
├── database.rules.json       # default-deny
├── storage.rules             # default-deny
├── packages/core/, packages/data/, packages/ui/
├── packages-ts/types/
├── apps/{app}/               # one per mobile or tablet app named in the brief
├── functions/                # package.json (engines node 22; build, build:watch), tsconfig.json,
│   └── src/callable/, src/triggers/, src/scheduled/, src/https/   # src/index.ts generated at build time
├── admin/                    # only when the brief has an admin dashboard (Vite + React + TS)
├── .github/workflows/        # one workflow per lane: flutter.yml, firebase.yml, admin.yml (only with admin/)
├── emulator-data/
├── mockups/
└── docs/                     # the spec documents of the product-spec workflow
```

## Rules for this profile

- **App folders** come from the apps in `docs/PRODUCT_BRIEF.md`: a mobile app `customer-app` becomes `apps/customer/`, a tablet app `supervisor-tablet` becomes `apps/supervisor_tablet/`, and any web dashboard becomes the single `admin/`. When the brief does not exist yet, create no app folders; they are added once Phase 1 names them.
- **Every rules file starts default-deny.** The real rules come from the schema in Sprint 1.
- **Versions:** Node 22 everywhere: `"engines": { "node": "22" }` in `functions/package.json`, `"runtime": "nodejs22"` in `firebase.json`, `nodejs 22.x` in `.tool-versions` and `node-version: 22` in every CI workflow. The Flutter stable version pinned in `.tool-versions`, the same in CI.
- **CI per lane:** each workflow runs only its lane's checks and is limited to its lane's paths, so it belongs to one agent (`agents.md` in this folder). `spec-guard.yml` is added by the `spec-guard` installer, not by the scaffold.
- **Functions scripts:** `build` (generate `src/index.ts`, then `tsc`) and `build:watch` (`tsc --watch`). No `dev` script that starts an emulator: the dev loop starts emulators once from the root (`architecture.md` in this folder).
- **Generated entry point:** `functions/src/index.ts` re-exports every function file and is written by the build from the folders under `src/`; no issue edits it. The scaffold ships a placeholder; the Sprint 0 issue that adds the generator removes the placeholder from git and ignores the file.
- **Lockfiles are committed** (`pnpm-lock.yaml`, `pubspec.lock`) with the scaffold, because CI installs with a frozen lockfile.
- **Substitutions:** project name in kebab-case for folders and package names, and as the suggested Firebase project id prefix (`{project-name}-dev`, `-staging`, `-prod`).
- **The root `AGENTS.md`** states the stack, the dev commands from `architecture.md` in this folder (emulator-first), the test gate, and points to `docs/AGENT_ROSTER.md` for lanes. The root `CLAUDE.md` contains only `@AGENTS.md`, so Claude Code imports the same constitution that Codex, Copilot, Cursor and OpenCode read natively.
- **Green from the first commit:** `melos bootstrap`, `pnpm install` and the functions package's `build` succeed on the empty scaffold, and git is initialized with that state committed, lockfiles included.
