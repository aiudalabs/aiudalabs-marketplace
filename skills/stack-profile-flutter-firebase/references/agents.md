# flutter-firebase: agent roster

The default roster for this profile. `multi-agent-governance` copies the agent sections below into the project's `docs/AGENT_ROSTER.md`, adapting the lanes only when the architecture changed the repo layout. The format is the one the `spec-guard` scripts read: one `##` heading per agent, named exactly like its agent, then `**Owns:**`, `**Reads:**` and `**Refuses:**`, with globs in backticks.

Each agent is a separate component of the catalog (`engineering/flutter-dev`, `engineering/firebase-dev`, `engineering/react-dev`, `engineering/qa-tester`, `product/product-advisor`). This file decides which of them form the roster and what each one owns.

Lane rules:

- No path is owned by two agents. Shared files are a design smell: one agent owns them, the others ask for changes.
- Every path an issue will write sits in exactly one lane. Root workspace files are assigned below so none is orphaned.
- The spec documents (`docs/**`, `mockups/**`) and the root `AGENTS.md` and `CLAUDE.md` belong to the spec workflow, not to a build lane. Build issues read them and never write them.
- Domain-driven agents (a payments agent, an ML agent) are added per project by governance when the domain demands one, each with its own carved-out lane.

---

## flutter-dev

Builds the Flutter apps and shared Dart packages; obsessive about tap targets, empty states and offline behavior.

**Owns:** `apps/**`, `packages/core/**`, `packages/data/**`, `packages/ui/**`, `packages/feature_*/**`, `melos.yaml`, `pubspec.yaml`
**Reads:** `docs/**`, `mockups/**`, `packages-ts/types/**`, `firestore.rules`
**Refuses:** Cloud Functions, security rules and indexes, the admin dashboard

## firebase-dev

Paranoid about security rules, methodical about idempotency; owns everything that runs on the server and the deploy pipeline.

**Owns:** `functions/**`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules`, `firebase.json`, `.firebaserc`, `emulator-data/**`, `packages-ts/types/**`, `package.json`, `pnpm-workspace.yaml`, `.github/**`
**Reads:** `docs/**`, `apps/**`, `packages/**`, `admin/**`
**Refuses:** Flutter code, the admin dashboard

## react-dev

Builds the admin dashboard; data-dense tables, keyboard-first, typed end to end against the shared types.

**Owns:** `admin/**`
**Reads:** `docs/**`, `mockups/**`, `packages-ts/types/**`
**Refuses:** Flutter code, Cloud Functions, security rules, changes to `packages-ts/types/` (asks `firebase-dev`)

## qa-tester

Reviews every change against its acceptance criteria and the spec; writes findings, not code.

**Owns:** none
**Reads:** `**`
**Refuses:** editing code

## product-advisor

Stack-agnostic reviewer of the spec documents: looks for gaps, contradictions and untraced scope between phases.

**Owns:** none
**Reads:** `docs/**`, `mockups/**`
**Refuses:** editing code or spec documents
