# flutter-firebase: agent roster

The default roster for this profile. `multi-agent-governance` copies the agent sections below into the project's `docs/AGENT_ROSTER.md`, adapting the lanes only when the architecture changed the repo layout. The format is the one the `spec-guard` scripts read: one `##` heading per agent, named exactly like its agent, then `**Owns:**`, `**Reads:**` and `**Refuses:**`, with globs in backticks.

Each agent is a separate component of the catalog (`engineering/flutter-dev`, `engineering/firebase-dev`, `engineering/react-dev`, `engineering/qa-tester`). This file decides which of them form the roster and what each one owns. Every agent here except `qa-tester` owns issues; an agent that would own none does not belong in the roster. `product/product-advisor` is therefore not in it: it is consulted outside the roster, for spec reviews and scope questions.

Lane rules:

- No path is owned by two agents. Shared files are a design smell: one agent owns them, the others ask for changes.
- Every path an issue will write sits in exactly one lane, and so does every root and generated file. The ones that are easy to miss are assigned here:
  - **Lockfiles** go with the workspace file that produces them: `pnpm-lock.yaml` to `firebase-dev` (owner of the root `package.json` and `pnpm-workspace.yaml`), `pubspec.lock` and every Dart lockfile to `flutter-dev`.
  - **CI workflows** belong to the lane they validate, one file per lane: `.github/workflows/flutter.yml` (`flutter-dev`), `.github/workflows/firebase.yml` (`firebase-dev`), `.github/workflows/admin.yml` (`react-dev`). Deploy workflows and `.github/workflows/spec-guard.yml` belong to `firebase-dev`; the `spec-guard` installer writes `spec-guard.yml`, and a reinstall may rewrite it.
  - **Root configuration** (`.gitignore`, `.tool-versions`, `.env.example`, `README.md`) belongs to `firebase-dev`.
  - **Generated barrels** are generated, not edited. The functions entry point `functions/src/index.ts` is written at build time from the files in `functions/src/callable/`, `triggers/`, `scheduled/` and `https/` (a Sprint 0 issue adds the generator). No issue lists it in `files_touched`, so function issues do not serialize on one file.
  - **Installed tooling** (`tools/spec-guard/**`, `.githooks/**`, `.claude/**`, `.aiudalabs-marketplace.json`) is written by its installer, never by an issue.
- **A change to a file outside the lane is requested, not made.** The issue that needs it declares a dependency on an issue in the owning lane (a new type in `packages-ts/types/`, a CI step, a rules change). For dependencies: `react-dev` edits `admin/package.json` in its own issue, and the `pnpm-lock.yaml` refresh is a `firebase-dev` issue in the same or the next wave; governance plans the known additions in one Sprint 0 lockfile issue so later refreshes stay rare.
- The spec documents (`docs/**`, `mockups/**`) and the root `AGENTS.md` and `CLAUDE.md` belong to the spec workflow, not to a build lane. Build issues read them and never write them.
- Domain-driven agents (a payments agent, an ML agent) are added per project by governance when the domain demands one, each with its own carved-out lane.

---

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

Reviews every change against its acceptance criteria and the spec; writes findings, not code.

**Owns:** none
**Reads:** `**`
**Refuses:** editing code
