---
name: stack-profile-flutter-firebase
description: "Stack profile for Flutter apps on Firebase with a React admin, the default profile of the product-spec workflow: Firestore and RTDB placement, TypeScript types as the contract mirrored to Dart, status transitions only through callable Cloud Functions, custom claims and security rules, per-function IAM and Secret Manager, Melos plus pnpm monorepo, emulator-first dev, and the agent roster with its lanes (flutter-dev, firebase-dev, react-dev, qa-tester). Loaded by product-discovery, schema-design, system-architecture, multi-agent-governance and project-kickstart when the locked profile is flutter-firebase. Use directly for questions about this stack's conventions, such as '¿cómo modelamos estados en Firestore en este stack?', 'qué va en RTDB y qué en Firestore', 'qué campos lleva el bloque de una Cloud Function' or 'quién es dueño de firestore.rules'. For a Python FastAPI and Postgres stack, use stack-profile-fastapi-react."
license: MIT
metadata:
  version: "1.0.0"
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

- **Stack:** Flutter for mobile and tablet apps; Firebase (Firestore, Realtime Database, Auth, Storage, Cloud Functions on Node 20 with TypeScript, Cloud Messaging); React with Vite for the admin dashboard. Monorepo with Melos (Dart) and pnpm (TypeScript).
- **Use when:** consumer or B2B products with mobile-first apps, realtime needs, LATAM markets, a small team that benefits from serverless ($0 idle cost, no infrastructure to operate).
- **Do not use when:** the product needs Kubernetes, microservices or long-running backends; heavy relational reporting is the core feature; or the team is Python-native with no mobile apps (use `fastapi-react`, the `stack-profile-fastapi-react` skill).

## 2. Data stores and placement

Firestore is the source of truth (queryable, security rules, indexes). The Realtime Database holds only ephemeral realtime data: presence, typing indicators, live counters. Analytics events go to Firebase Analytics. Full-text search is external (Algolia or Typesense). When in doubt, Firestore. Never two stores for the same purpose. The full placement table is in [references/data-layer.md](references/data-layer.md).

## 3. Contracts

TypeScript types are the contract. They live in `packages-ts/types/` and are mirrored to Dart in `packages/core/types/`; a CI script checks parity against the schema document. `Timestamp`, never `Date`; literal unions, never bare strings; no `any` or `unknown`. Details in [references/data-layer.md](references/data-layer.md).

## 4. State-machine enforcement

Clients never write `status`. Every transition goes through one **callable Cloud Function** running with Admin SDK privileges. Security rules deny client writes to `status`, `total`, `commission` and other computed fields regardless of role. The schema document names the function that owns each transition.

## 5. Execution units

Cloud Functions in four patterns: **callable** (client to server), **trigger** (Firestore, Auth, Storage), **scheduled** (cron) and **https** (webhooks). Each function gets one block in `ARCHITECTURE.md` with pattern, owner, trigger, validates, side effects, idempotency (`clientRequestId`), performance, failure modes, tests, service account, IAM permissions and secrets accessed. Format in [references/architecture.md](references/architecture.md).

## 6. Tooling and gates

- **Monorepo:** `melos.yaml` for Flutter packages, `pnpm-workspace.yaml` for TypeScript.
- **Dev loop:** emulator-first (`firebase emulators:start --import=./emulator-data --export-on-exit`), never against production Firestore.
- **Test gate:** `flutter analyze`, `melos run test`, `pnpm --filter functions test`, `pnpm --filter admin lint` and `pnpm --filter admin typecheck`. All green before a merge.
- **CI:** GitHub Actions or Bitbucket Pipelines. Pull request: lint, types, tests, build. Merge to `develop`: deploy to staging. Tag `v*` on `main`: manual approval, then production.
- **Extra Phase 5 output:** `docs/IAM_REQUIREMENTS.md` (service accounts, APIs, secrets, per-function IAM) is required for this profile because it runs on managed cloud.

## 7. Permissions model

Two independent layers; never confuse them.

- **End-user authorization:** Firebase Auth with custom claims (`role`, optional `verificationTier`, `tenantId`), owner-based rules (`request.auth.uid == resource.data.ownerId`) and role-based rules in `firestore.rules`. Claims are set only by a callable Cloud Function.
- **Cloud IAM:** one service account per workload (`cf-runtime-sa`, `deploy-sa`, optional `eventarc-sa`), least privilege, secrets only in Secret Manager.

## 8. Agent roster

`flutter-dev` (apps and Flutter packages), `firebase-dev` (functions, rules, indexes, shared TypeScript types), `react-dev` (admin dashboard), `qa-tester` (review only) and the stack-agnostic `product-advisor` (review only). Exact lanes, in the `docs/AGENT_ROSTER.md` format, in [references/agents.md](references/agents.md).

## 9. Kickstart

The `project-kickstart` skill scaffolds the Melos and pnpm monorepo, the Firebase configuration files, the design-docs folder and the repository constitution. What it must produce for this profile is in [references/kickstart.md](references/kickstart.md).
