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
├── functions/                  # Cloud Functions (2nd gen, Node 22 + TypeScript)
│   └── src/                    # index.ts is generated at build time from the folders below
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

Each top-level path, root file, lockfile and CI workflow belongs to one agent lane; see `agents.md` in this folder. CI is split per lane (`flutter.yml`, `firebase.yml`, `admin.yml`), so a workflow belongs to the lane it validates.

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

Dart and TypeScript share types through mirrored definitions (`packages/core/types/` and `packages-ts/types/`), both checked against the schema document. No parity script ships with the profile: `qa-tester` checks parity on every change that touches either side, and a project that wants the check automated adds a parity script as a Sprint 0 issue (then drift fails CI). Never share types by copy-paste: drift is the first cause of "works on the emulator, fails in production".

## Workflow-engine guard: defaults for this stack

Default: **no workflow engine** (Temporal, Inngest, Step Functions). Cloud Functions plus Pub/Sub plus Firestore as the state machine cost about $0/month at MVP scale. Justify an engine only with the skill's four questions. Reference cost when justified: Temporal Cloud from $200/month plus $30-50/month for a worker on Cloud Run. Known calls: AI generation pipelines with human review, justified; audio or video processing over 5 minutes, justified; simple marketplace, social or internal B2B, functions are enough.

## Execution-unit block (Cloud Function inventory)

One block per function. Patterns: callable, trigger, scheduled, https.

- **Every transition has one owner.** The schema names one owning function per transition (from-state, to-state and cause; see `data-layer.md` in this folder). The architecture copies that owner into the block's side effects; any other function only reads `status`. When a block would transition a status the schema gives to another function, the architecture raises it for the coherence check instead of adding a second owner.
- **Auth triggers.** 2nd gen has no Auth user-created or user-deleted trigger; it has blocking functions (`beforeUserCreated`, `beforeUserSignedIn`), which run inside sign-up and can reject it (check the current Firebase docs for their requirements). A non-blocking on-create (create the profile document, send a welcome) is either a 1st-gen function (`firebase-functions/v1`, `auth.user().onCreate`), written as `Pattern: trigger (Auth, 1st gen)`, or a callable the app calls after the first sign-in. Both generations can live in one functions codebase.
- **Idempotency** names the container from the schema (`idempotencyKeys`) and the dedup window. If the schema has no such container, raise it for the coherence check; do not invent one here.

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

## End-user permissions: claims or membership documents

Two models; the schema (Phase 3) picks one per role, and most products combine them.

| | Custom claims | Membership documents |
|---|---|---|
| Use for | Global roles that rarely change: `admin`, `verificationTier`, a single-tenant `role` | Roles scoped to a tenant, venue or team; users in several of them; roles that must change at once (staff added or removed) |
| Lives in | The ID token (`request.auth.token.role`) | A document per membership, for example `venueMembers/{venueId}_{uid}` with `role` |
| Rule check | `request.auth.token.role == 'admin'`, no read cost | `get(/databases/$(database)/documents/venueMembers/$(venueId + '_' + request.auth.uid)).data.role == 'owner'`, one document read per evaluation |
| A change applies | After the client refreshes its token | On the next request |
| Limits | Small payload (check the current Firebase docs for the size limit); not a list of tenants | Rules can read only a limited number of documents per evaluation (check the current docs) |

- Claims are written only by a Cloud Function (for example `updateUserClaims`, called by an admin) or an admin script, never by the client. Clients refresh their token after a claim changes. Only a project that uses claims for roles has such a function.
- Membership documents are written only by Cloud Functions; rules deny client writes to them.
- `role` values derive from the personas: marketplace customer/provider/admin; content reader/author/admin; education student/teacher/parent/school_admin; B2B SaaS member/admin/owner per tenant; internal employee/manager/admin. Per-tenant roles are memberships, not a `tenantId` claim, unless a user can belong to exactly one tenant for life.
- Owner-based: `request.auth.uid == resource.data.ownerId`.
- `status`, `total`, `commission`, `verificationTier` are function-only writes regardless of role.
- Collection-group queries are listed explicitly.

## Cloud IAM: `IAM_REQUIREMENTS.md`

End-user claims and service identity are independent layers. Mixing them is a privilege escalation waiting to happen.

**Projects:** one Google Cloud project per environment, `{product}-dev`, `{product}-staging`, `{product}-prod`, never sharing resources. **Region:** `us-central1` by default; choose another for data residency or for latency to where the users are (for example `us-east1` for users in Panama or the Caribbean). Write the reason. The Firestore location cannot be changed after the database is created, so the region is decided before Sprint 0, and functions run in the same region as Firestore.

**APIs to enable** (`<name>.googleapis.com`), each listed with the units that need it; every one is a future quota and deprecation concern, so nothing "just in case". Check the current Firebase and Google Cloud docs for exact service names.

| API | When |
|---|---|
| `firebase`, `firestore`, `identitytoolkit` (Auth), `secretmanager`, `logging`, `monitoring`, `clouderrorreporting` | Always |
| `cloudfunctions`, `run`, `cloudbuild`, `artifactregistry` | Always: 2nd gen functions build with Cloud Build, store images in Artifact Registry and run on Cloud Run |
| `eventarc`, `pubsub` | Any 2nd gen event trigger, Firestore triggers included (Pub/Sub is Eventarc's transport), and any topic |
| `cloudscheduler` | Any scheduled function |
| `iamcredentials`, `sts` | CI deploys through OIDC (Workload Identity Federation) |
| `firebaserules` | Deploying Firestore and Storage rules |
| `fcm` | Push notifications |
| `firebaseappcheck` | App Check |
| `firebasestorage`, `storage` | Cloud Storage |
| `firebasedatabase` | Realtime Database |
| `cloudtasks` | Task-queue functions only |

**Service accounts.** Grant each role at the narrowest resource that works (one bucket, one secret), not the project. Role names below are the usual ones; check the current IAM docs for the exact role before provisioning.

```
cf-runtime-sa       default runtime identity
  roles: datastore.user (Firestore), logging.logWriter
  only when a function on it needs it, scoped to the resource:
    storage.objectUser or objectViewer on the one bucket
    monitoring.metricWriter (custom metrics)
    firebasecloudmessaging.admin or the current FCM send role (push)
    pubsub.publisher on the topic, cloudtasks.enqueuer on the queue
  no secret access at project level
<name>-runtime-sa   a dedicated account per function group with sensitive
                    permissions, for example:
  auth-admin-sa       firebaseauth.admin, only for functions that set claims
                      or manage users
  payments-runtime-sa secretmanager.secretAccessor on the payment secrets only
deploy-sa           CI deploys through OIDC; a JSON key only as a last resort
  roles: cloudfunctions.developer, iam.serviceAccountUser on each runtime
         account (not project-wide), firebaserules.admin (rules),
         datastore.indexAdmin (indexes), cloudscheduler.admin (scheduled
         functions), eventarc.admin (2nd gen triggers),
         secretmanager.viewer (binding secrets to functions),
         artifactregistry.reader if the build needs it
  bound to the CI identity through Workload Identity Federation
  (iam.workloadIdentityUser for the repository's principal)
```

- **Secrets:** `secretmanager.secretAccessor` is granted on each secret to the one account that reads it, never at project level. Otherwise a dedicated account isolates nothing.
- **Eventarc:** 2nd gen event triggers need an identity that can receive events and invoke the function (`eventarc.eventReceiver`, `run.invoker`); the Firebase CLI usually sets this up on deploy. Check the current docs, and list what it granted.
- Every role on a runtime account traces to a specific function's `IAM permissions` field: never `roles/owner`, `roles/editor` or `roles/firebase.admin` "to be safe". Drop a role that no function needs.

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
firebase emulators:start --import=./emulator-data --export-on-exit   # the one emulator suite, functions included
pnpm --filter <functions-package> build:watch   # tsc --watch; the functions emulator reloads the compiled output
cd apps/{app} && flutter run      # connects to the emulator through env
pnpm --filter <admin-package> dev # Vite dev server
```

Only one command starts emulators. The functions package has `build` and `build:watch` scripts and no script that starts a second functions emulator (two of them clash on port 5001).

Apps detect the emulator through environment flags (`FIREBASE_EMULATOR_HOST` and similar); document the setup. Running functions against production Firestore "for speed" corrupts data and burns quota.

## CI/CD

| Trigger | What runs |
|---|---|
| Pull request | Lint, types, unit tests and build, one workflow per lane (`flutter.yml`, `firebase.yml`, `admin.yml`), each limited to its lane's paths |
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
- Callable functions without idempotency (`clientRequestId` mandatory, stored in the schema's `idempotencyKeys` container, dedup window of at least 1 h).
- Two functions owning the same transition.
- Skipping emulator-first development.
- One function doing everything (a 500-line callable handling six actions).
- Cyclic package dependencies (`core → ui → core`).
- Temporal by default.
- Confusing custom claims with cloud IAM.
- Per-tenant roles in custom claims for users who belong to several tenants.
- Inflating the runtime account, project-wide secret access, or `roles/owner` "to be safe".
- Secrets in env vars or code.
- Public buckets or `allUsers` IAM bindings.
