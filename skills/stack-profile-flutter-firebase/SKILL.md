---
name: stack-profile-flutter-firebase
description: "Stack profile for Flutter apps on Firebase with a React admin, the default profile of the product-spec workflow: Firestore and RTDB placement, TypeScript types as the contract mirrored to Dart, status transitions only through Cloud Functions with one owner per cause, custom claims or membership documents with security rules, least-privilege IAM and Secret Manager, Melos plus pnpm monorepo, emulator-first dev, and the agent roster with its lanes (flutter-dev, firebase-dev, react-dev, qa-tester). Loaded by product-discovery, schema-design, system-architecture, multi-agent-governance and project-kickstart when the locked profile is flutter-firebase. Use directly for questions about this stack's conventions, such as '¿cómo modelamos estados en Firestore en este stack?', 'qué va en RTDB y qué en Firestore', 'qué campos lleva el bloque de una Cloud Function' or 'quién es dueño de firestore.rules'. For a Python FastAPI and Postgres stack, use stack-profile-fastapi-react."
license: MIT
metadata:
  version: "1.1.0"
  author: aiudalabs
---

# Stack profile: flutter-firebase

Flutter apps, Firebase backend, React admin dashboard. The default profile of the product-spec workflow.

A stack profile carries the **stack knowledge**; the workflow skills carry the **method**. The method changes with every project and lives once in each skill; the stack knowledge changes rarely and lives here. A profile states decisions ("Firestore is the source of truth"), it does not offer menus.

## How this profile is used

- `product-discovery` offers it at intake question 4 and locks it as decision `D-01` with the line `**Stack profile:** flutter-firebase` in `docs/OPINIONATED_DEFAULTS.md`. The older id `aiuda-flutter-firebase` means the same profile.
- `schema-design` reads [references/data-layer.md](references/data-layer.md).
- `system-architecture` reads [references/architecture.md](references/architecture.md).
- `multi-agent-governance` copies the roster in [references/agents.md](references/agents.md) into the project's `docs/AGENT_ROSTER.md`.
- `project-kickstart` scaffolds the repository described in [references/kickstart.md](references/kickstart.md).

When answering a direct question about the stack, read the reference file that covers it and answer from there.

The nine sections below are the profile contract. Every profile answers all nine.

## 1. Identity

- **Stack:** Flutter for mobile and tablet apps; Firebase (Firestore, Realtime Database, Auth, Storage, Cloud Functions (2nd gen) on Node 22 with TypeScript, Cloud Messaging); React with Vite for the admin dashboard. Monorepo with Melos (Dart) and pnpm (TypeScript).
- **Use when:** consumer or B2B products with mobile-first apps, realtime needs, LATAM markets, a small team that benefits from serverless ($0 idle cost, no infrastructure to operate).
- **Do not use when:** the product needs Kubernetes, microservices or long-running backends; heavy relational reporting is the core feature; or the team is Python-native with no mobile apps (use `fastapi-react`, the `stack-profile-fastapi-react` skill).

## 2. Data stores and placement

Firestore is the source of truth (queryable, security rules, indexes). The Realtime Database holds only ephemeral realtime data: presence, typing indicators, live counters. Analytics events go to Firebase Analytics. Full-text search is external (Algolia or Typesense). When in doubt, Firestore. Never two stores for the same purpose. The full placement table is in [references/data-layer.md](references/data-layer.md).

## 3. Contracts

TypeScript types are the contract. They live in `packages-ts/types/` and are mirrored to Dart in `packages/core/types/`. No parity tool ships with this profile: `qa-tester` checks both sides against the schema document on every change that touches either, and a project that wants it automated adds a parity script as its own Sprint 0 issue. `Timestamp`, never `Date`; literal unions, never bare strings; no `any` or `unknown`. Details in [references/data-layer.md](references/data-layer.md).

## 4. State-machine enforcement

Clients never write `status`. Every transition goes through a **Cloud Function** (callable, trigger, scheduled or HTTPS) running with Admin SDK privileges: a user action is a callable, an expiry or no-show is scheduled, a payment confirmation is an HTTPS webhook. Security rules deny client writes to `status`, `total`, `commission` and other computed fields regardless of role. Each cause of a transition has exactly **one owning function**, named in the schema document (one owner per cause); one cause that arrives by two routes (a payment webhook and a status poll) goes through one shared handler; other functions only read the status. Offline apps queue callable calls on the device instead of writing status. Details in [references/data-layer.md](references/data-layer.md).

## 5. Execution units

Cloud Functions (2nd gen) in four patterns: **callable** (client to server), **trigger** (Firestore, Storage, Pub/Sub; for Auth see below), **scheduled** (cron) and **https** (webhooks). 2nd gen has no Auth user-created trigger, only blocking functions: a non-blocking on-create is a 1st-gen function (`firebase-functions/v1`) and its block says so. Triggers are at-least-once: a trigger with a non-deterministic effect dedupes on the event id. Each function gets one block in `ARCHITECTURE.md` with pattern, owner, trigger, validates, side effects, idempotency (`clientRequestId`, the provider's event id, or the trigger's event id), performance, failure modes, tests, service account, IAM permissions and secrets accessed. Format in [references/architecture.md](references/architecture.md).

## 6. Tooling and gates

- **Monorepo:** `melos.yaml` for Flutter packages, `pnpm-workspace.yaml` for TypeScript.
- **Dev loop:** emulator-first: one `firebase emulators:start --import=./emulator-data --export-on-exit` (functions included) plus the functions package's `build:watch`, which recompiles while the emulator reloads. Never a second functions emulator, never production Firestore.
- **Test gate:** `flutter analyze`, `melos run test`, `pnpm --dir functions run test`, `pnpm --dir admin run lint` and `pnpm --dir admin run build` (`--dir … run` fails when a script is missing; `--filter` exits 0 when nothing matches). All green before a merge.
- **CI:** GitHub Actions or Bitbucket Pipelines. Pull request: lint, types, tests, build, in one workflow per lane (`flutter.yml`, `firebase.yml`, `admin.yml`). Merge to `develop`: deploy to staging. Tag `v*` on `main`: manual approval, then production.
- **App settings:** non-secret settings (ops contact, minimum app version, kill switches) live in Remote Config, defaults bundled in the apps; a single settings document only when Remote Config is not an option.
- **Back to the app from a web page** (hosted payment page, email link): App Links and Universal Links served from Hosting under `/.well-known/`; Firebase Dynamic Links is shut down.
- **Extra Phase 5 output:** `docs/IAM_REQUIREMENTS.md` (service accounts, APIs, secrets, per-function IAM) is required for this profile because it runs on managed cloud.

## 7. Permissions model

Two independent layers; never confuse them.

- **End-user authorization:** Firebase Auth plus `firestore.rules`, with owner-based rules (`request.auth.uid == resource.data.ownerId`) and one of two role models, chosen in Phase 3: **custom claims** for global roles that rarely change (`admin`, `verificationTier`), or **membership documents** for roles scoped to a tenant, venue or team (a user in several, changes that must apply at once). Most products combine them. Claims and memberships are written only by Cloud Functions or an admin script, never by clients.
- **Cloud IAM:** one runtime service account by default (`cf-runtime-sa`), a dedicated one for any function with sensitive permissions, and `deploy-sa` for CI through OIDC. Roles trace to functions, secret access is granted per secret, never project-wide. Secrets only in Secret Manager. Defaults in [references/architecture.md](references/architecture.md).

## 8. Agent roster

`flutter-dev` (apps, Flutter packages, Dart lockfiles), `firebase-dev` (functions, rules, indexes, shared TypeScript types, the root TypeScript workspace and its lockfile, deploys), `react-dev` (admin dashboard) and `qa-tester` (review only). Each CI workflow belongs to the lane it validates. Every root and generated file has one owner; a lane asks the owner for changes to files outside it. Exact lanes, in the `docs/AGENT_ROSTER.md` format, in [references/agents.md](references/agents.md).

`product-advisor` is not in the roster: it owns no issue, so it is consulted outside the roster (spec reviews between phases, scope questions), never dispatched as a build agent.

## 9. Kickstart

The `project-kickstart` skill scaffolds the Melos and pnpm monorepo, the Firebase configuration files, the design-docs folder and the repository constitution. What it must produce for this profile is in [references/kickstart.md](references/kickstart.md).
