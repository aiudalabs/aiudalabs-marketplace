# flutter-firebase: architecture

Read by the `system-architecture` skill (Phase 5). This file carries the Flutter, Firebase and Google Cloud knowledge; the skill carries the method.

## Outputs for this profile

| File | Purpose | Notes |
|---|---|---|
| `docs/ARCHITECTURE.md` | Technical shape of the product | Always |
| `docs/IAM_REQUIREMENTS.md` | Cloud identity model: service accounts, APIs, secrets, per-function IAM | **Required** for this profile (managed cloud). It is the manual provisioning checklist for the `operational-readiness` skill and the input contract for any later infrastructure-as-code. |

## Monorepo layout

```
{repo-root}/
├── melos.yaml                  # Melos config for Flutter packages
├── pnpm-workspace.yaml         # pnpm config for TypeScript packages
├── package.json                # root TypeScript workspace
├── pubspec.yaml                # root Flutter workspace
├── firebase.json, .firebaserc  # Firebase project config
├── firestore.rules, firestore.indexes.json, database.rules.json, storage.rules
│
├── packages/                   # shared Flutter code
│   ├── core/                   # entities, value objects, business rules; no Firebase
│   ├── data/                   # Firebase wrappers (Firestore, RTDB, Storage, Auth)
│   ├── ui/                     # shared widgets, design tokens, theming
│   └── feature_auth/           # vertical feature slices (auth, booking, chat...)
│
├── apps/                       # Flutter applications, names from the brief
│   └── {app-name}/
│
├── functions/                  # Cloud Functions (Node 20 + TypeScript)
│   └── src/
│       ├── callable/           # client → server
│       ├── triggers/           # Firestore, Auth, Storage triggers
│       ├── scheduled/          # cron-like jobs
│       └── https/              # webhooks (payments, third parties)
│
├── packages-ts/
│   └── types/                  # types shared by functions and admin
│
├── admin/                      # React + Vite admin dashboard
└── docs/                       # the spec documents
```

Each top-level path belongs to one agent lane; see `agents.md` in this folder.

## Dependency rules

```
core      depends on: nothing (pure Dart)
data      depends on: core
ui        depends on: core (entity types, not business rules)
feature_* depends on: core, data, ui
apps/*    depends on: feature_*, core, data, ui

functions         depends on: packages-ts/types
admin             depends on: packages-ts/types
packages-ts/types depends on: nothing
```

Dart and TypeScript share types through mirrored definitions (`packages/core/types/` and `packages-ts/types/`), kept in sync by a script that validates both against the schema document. Drift fails the build. Never share types by copy-paste: drift is the first cause of "works on the emulator, fails in production".

## Workflow-engine guard: defaults for this stack

Default: **no workflow engine** (Temporal, Inngest, Step Functions). Cloud Functions plus Pub/Sub plus Firestore as the state machine cost about $0/month at MVP scale. Justify an engine only with the skill's four questions. Reference cost when justified: Temporal Cloud from $200/month plus $30-50/month for a worker on Cloud Run. Known calls: AI generation pipelines with human review, justified; audio or video processing over 5 minutes, justified; simple marketplace, social or internal B2B, functions are enough.

## Execution-unit block (Cloud Function inventory)

One block per function. Patterns: callable, trigger, scheduled, https.

```
acceptBooking
  Pattern: callable (client → server)
  Owner: firebase-dev
  Trigger: provider-app, booking detail screen (2.3.2)
  Validates:
    - Caller is the provider of this booking
    - Booking is in 'submitted' state
  Side effects:
    - Transitions status: submitted → accepted (atomic)
    - Denormalizes provider.acceptedCount += 1
    - Schedules a push notification to the customer
  Idempotency: clientRequestId required (24 h dedup window)
  Performance: p50 < 200 ms, p95 < 500 ms
  Failure modes:
    - Race on accept → `failed-precondition` (no longer submitted), client refreshes
  Tests:
    - Unit: state-machine validator
    - Integration: emulator with seeded data
  Service account: cf-runtime-sa
  IAM permissions: (none beyond default)
  Secrets accessed: (none)
  Serves: FR-BOOKING-2, D-04
```

Required fields: pattern, owner, trigger (or fires-when, or schedule), validates, side effects, idempotency, performance, failure modes, tests, service account, IAM permissions, secrets accessed. `Service account` defaults to `cf-runtime-sa`; a dedicated account only for isolated permissions (for example `payments-runtime-sa`). Every secret named must exist in the secrets section of `IAM_REQUIREMENTS.md`.

## Transactional consistency menu

| Pattern | Use | Example |
|---|---|---|
| Firestore transaction | Multi-document atomic read-modify-write | Decrement availability and create the booking |
| Firestore batch | Multi-document atomic, write-only | Create booking and first message |
| Distributed counter | High-concurrency counter | Bookings per day |
| Function transaction plus idempotency key | Cross-collection writes that must all succeed | acceptBooking |
| Eventual consistency via trigger | Denormalization that tolerates lag | provider.acceptedCount |
| No transaction | Single-document write | A user updates their own profile |

## End-user permissions: custom claims

- Claims are set at signup by a callable function (`updateUserClaims`), never by the client. Clients refresh their token after privileged actions (about 1 s of lag is fine).
- `role` is an enum derived from the personas: marketplace customer/provider/admin; content reader/author/admin; education student/teacher/parent/school_admin; B2B SaaS member/admin/owner per tenant; internal employee/manager/admin. Add `verificationTier` when needed (not for B2B or internal) and `tenantId` for multi-tenant products.
- Owner-based: `request.auth.uid == resource.data.ownerId`. Role-based: `request.auth.token.role == 'admin'`.
- `status`, `total`, `commission`, `verificationTier` are function-only writes regardless of role.
- Collection-group queries are listed explicitly.

## Cloud IAM: `IAM_REQUIREMENTS.md`

End-user claims and service identity are independent layers. Mixing them is a privilege escalation waiting to happen.

**Projects:** one Google Cloud project per environment, `{product}-dev`, `{product}-staging`, `{product}-prod`, never sharing resources. Region `us-central1` unless data residency says otherwise.

**APIs to enable**, only what the architecture uses (each one is a future quota and deprecation concern): firestore, cloudfunctions, run (gen2 functions), firebase, identitytoolkit, firebasestorage, secretmanager (always), cloudbuild, logging and monitoring (always); eventarc and pubsub only when used.

**Service accounts**, three at minimum:

```
cf-runtime-sa  runtime identity for all functions (default)
  roles: datastore.user, firebaseauth.admin, storage.objectAdmin,
         cloudtasks.enqueuer, secretmanager.secretAccessor, logging.logWriter
deploy-sa      CI/CD deploys through OIDC (a JSON key only as a last resort)
  roles: cloudfunctions.developer, firebase.admin, iam.serviceAccountUser,
         run.admin, cloudbuild.builds.editor
eventarc-sa    only with Eventarc: run.invoker, eventarc.eventReceiver
```

Custom accounts only where isolation is justified. Every role on the runtime account traces to a specific function's `IAM permissions` field: never `roles/owner` or `roles/editor` "to be safe". Drop a listed role that no function needs.

**Sections of the document:**

- **Project setup**: projects, region, billing alerts.
- **APIs to enable**: each with the units that need it.
- **Service accounts**: each with roles and the units that run as it.
- **Per-function IAM**: a table aggregating the inventory fields; the source of truth for provisioning.
- **Storage buckets**: default-deny, no `allUsers`, no CORS wildcards, signed URLs from functions for anything public-facing, lifecycle rules per prefix.
- **Secrets**: Secret Manager only, never env vars or code. Each with purpose, readers and rotation policy. Orphan secrets are flagged.
- **Eventarc and Pub/Sub topics**: publishers and subscribers, all present in the inventory.
- **HTTPS endpoints**: ingress and auth strategy for each. A webhook bypasses IAM auth only with a signature check on the body and an in-body rate limit.

## Performance budget implications

| Budget | Architecture implication |
|---|---|
| Cold start < 2 s on mid-range Android | Smaller APK, lazy-load features beyond home, defer heavy SDKs |
| First action < 30 s | Skip the splash when authenticated, prefetch home data at cold start |
| Notification end to end < 5 s | High-priority FCM, not data-only messages |
| Search < 1 s | Client cache; Algolia or Typesense when Firestore latency exceeds the budget |
| Function p95 < 500 ms | `minInstances: 1` on hot functions; cold ones can stay at 0 |
| Offline read 24 h | Firestore offline persistence; the UI warns about stale data |

## Dev workflow: emulator-first, non-negotiable

```bash
melos bootstrap && pnpm install && firebase use {project-id}
firebase emulators:start --import=./emulator-data --export-on-exit
cd functions && pnpm dev          # tsc --watch with reload
cd apps/{app} && flutter run      # connects to the emulator through env
cd admin && pnpm dev
```

Apps detect the emulator through environment flags (`FIREBASE_EMULATOR_HOST` and similar); document the setup. Running functions against production Firestore "for speed" corrupts data and burns quota.

## CI/CD

| Trigger | What runs |
|---|---|
| Pull request | Lint, types, unit tests, build of every package |
| Merge to `develop` | The above, then deploy to the staging project |
| Tag `v*` on `main` | The above, manual approval, deploy to production |
| Daily | Integration tests of scheduled functions against staging |

Tool versions pinned in `.tool-versions` or `mise.toml`, identical in CI and dev. Secrets in the CI provider's store; deploys authenticate through OIDC as `deploy-sa`, and any service-account key that must exist rotates quarterly. Never deploy to production from a feature branch.

## Observability stack

| Layer | Tool |
|---|---|
| Flutter crashes | Crashlytics |
| Flutter performance | Firebase Performance Monitoring |
| Functions | Cloud Logging, structured, with `clientRequestId`, duration and outcome |
| Function errors | Cloud Error Reporting, Sentry optional |
| Admin dashboard | Sentry |
| Custom metrics | Cloud Monitoring |
| Firestore | Firebase console: read and write QPS, p95 latency, reads per day |

P0 alerts to `#alerts-prod` or PagerDuty: critical function error rate above 1% over 5 min; Firestore quota at 80%; spikes in auth failures; payment function errors above 0.5%. P1 to `#alerts-staging`: cold start regression above 20% (7-day rolling); function p95 regression.

## Deferral candidates

- **v1.1:** BigQuery export, Algolia or Typesense, multi-region reads, A/B testing framework.
- **v2:** offline conflict resolution beyond Firestore's default, more languages, granular feature flags, a WebSocket layer.
- **v∞:** multi-region failover, end-to-end encryption, splitting functions into microservices, event sourcing or CQRS, a custom auth provider.

## Stack-specific anti-patterns

- Clients writing `status` directly.
- Clients writing denormalized copies (clients write the source of truth; functions fan out).
- Callable functions without idempotency (`clientRequestId` mandatory, dedup window of at least 1 h).
- Skipping emulator-first development.
- One function doing everything (a 500-line callable handling six actions).
- Cyclic package dependencies (`core → ui → core`).
- Temporal by default.
- Confusing custom claims with cloud IAM.
- Inflating the runtime account, or `roles/owner` "to be safe".
- Secrets in env vars or code.
- Public buckets or `allUsers` IAM bindings.
