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
│   ├── scripts/                # gen-index.mjs, bundle.mjs, stage-deploy.mjs
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

**How functions consume `packages-ts/types`.** The types package ships TypeScript source, which Node cannot load and Cloud Build cannot install (`workspace:` protocol). So `@<project>/types` is a `workspace:*` devDependency of functions, and `functions/scripts/bundle.mjs` inlines it with esbuild into `lib/index.js`; every npm package stays external and must be in `dependencies`. Functions deploy from a staged folder, `functions/.deploy` (`firebase.json` `functions.source`), written by `functions/scripts/stage-deploy.mjs` as the last predeploy step: a manifest with registry-only `dependencies` and no scripts, the bundle, the parameter env files, and a link to `functions/node_modules` (the CLI runs the SDK from the source folder to discover functions; the deploy ignores `node_modules`). `build` is gen-index, `tsc --noEmit`, bundle; `build:watch` runs the bundler's watch mode and restages, so the emulator, which also loads `functions/.deploy`, reloads. `/lib/` and `/.deploy/` are build output, ignored with anchored patterns (`src/lib/` is source). The admin consumes the source directly through Vite.

**A guard enforces the Dart graph.** A melos `deps-check` script reads every `pubspec.yaml` against the graph above (allowed path dependencies per package) and fails on any other; `flutter.yml` runs it. Changing the allowed sets is an architecture change, never a side edit in a feature issue.

Dart and TypeScript share types through mirrored definitions (`packages/core/types/` and `packages-ts/types/`), both checked against the schema document. No parity script ships with the profile: `qa-tester` checks parity on every change that touches either side, and a project that wants the check automated adds a parity script as a Sprint 0 issue (then drift fails CI). Never share types by copy-paste: drift is the first cause of "works on the emulator, fails in production".

## Identifiers table (section 2 of `ARCHITECTURE.md`)

Required. Every identifier the build needs, decided here so no issue guesses one:

| Identifier | Rule |
|---|---|
| Pub package name of each Dart package | Snake case, `{project}_core` style; locks in at the first import |
| applicationId and bundle id per app and flavor | One per environment (`com.example.player.dev`, `.staging`, no suffix for prod), so the three install side by side and each App Link file names its own |
| Firebase project id per alias | `default` (dev), `staging`, `prod` in `.firebaserc` |
| Hosting site id per target and environment | For example `admin` → `{project}-dev`, `links` → `{project}-dev-links` |
| Domain | Custom domain, or the `web.app` default until one exists |
| Env parameters | Each by name, with its value per alias; base URLs in full, with scheme |
| Admin build variables | Each `VITE_*` by name, with its value per environment |
| Generated codes | Exact alphabet as a literal string, and length (a booking code: `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, 6); exported as a const from `packages-ts/types` and mirrored in Dart |

## Functions configuration and region

- **Region:** set once, in `functions/src/init.ts`, which the generated `index.ts` imports first: `setGlobalOptions({ region: '<region>' })`. Callables, triggers, scheduled and https functions all inherit it; a function that only sets the region on a callable wrapper sends every other type to `us-central1`. A 1st-gen function (`firebase-functions/v1`) sets `.region()` itself. The deploy stage fails when an exported function has no region.
- **Env files** (non-secret parameters, `defineString` and similar), in `functions/`, copied by the deploy stage:
  - `.env`: shared by every project;
  - `.env.<alias>`: one project (`.env.staging`, `.env.prod`); `.env.default` serves only the `default` alias, which is the real dev project, so it deploys too;
  - `.env.local`: emulator only, over the others; never committed. A committed `.env.local.example` lists its keys, and the dev setup copies it.
- **Secrets:** Secret Manager through `defineSecret`; in the emulator, `functions/.secret.local`, never committed and never staged for deploy.
- **Fakes stay in the emulator.** No deployed file selects a fake adapter or sets an `*_EMULATOR*` variable; the fake adapter refuses to load unless `FUNCTIONS_EMULATOR` is `true` and `FIRESTORE_EMULATOR_HOST` is set.

## Workflow-engine guard: defaults for this stack

Default: **no workflow engine** (Temporal, Inngest, Step Functions). Cloud Functions plus Pub/Sub plus Firestore as the state machine cost about $0/month at MVP scale. Justify an engine only with the skill's four questions. Reference cost when justified: Temporal Cloud from $200/month plus $30-50/month for a worker on Cloud Run. Known calls: AI generation pipelines with human review, justified; audio or video processing over 5 minutes, justified; simple marketplace, social or internal B2B, functions are enough. A wait held as a status plus an admin queue screen (a venue awaiting review, a refund awaiting approval) is not a workflow-engine case, even when a person acts days later: Firestore holds the wait, a callable resumes it, a scheduled function handles its timeout, so question 2 reads no. It counts only for a multi-step process that must resume mid-flight with its context, timers and compensations.

## Execution-unit block (Cloud Function inventory)

One block per function. Patterns: callable, trigger, scheduled, https.

- **One owner per cause.** The schema names one owning function per transition cause (from-state, to-state and cause; see `data-layer.md` in this folder). The architecture copies that owner into the block's side effects; any other function only reads `status`. When a block would transition a status the schema gives to another function, the architecture raises it for the coherence check instead of adding a second owner.
- **One cause, two routes, one handler.** The same fact can arrive twice: the payment provider's webhook (push) and a status poll or the return-page check (pull). That is one cause, not two: both routes call one shared handler (for example `functions/src/lib/payments/applyPaymentResult.ts`), keyed by the provider's payment or event id, which re-reads the status in a transaction, so whichever arrives first applies and the other is a no-op. The schema's owner stays the primary route; the block of the other route says it calls the shared handler.
- **Auth triggers.** 2nd gen has no Auth user-created or user-deleted trigger; it has blocking functions (`beforeUserCreated`, `beforeUserSignedIn`), which run inside sign-up and can reject it (check the current Firebase docs for their requirements). A non-blocking on-create (create the profile document, send a welcome) is either a 1st-gen function (`firebase-functions/v1`, `auth.user().onCreate`), written as `Pattern: trigger (Auth, 1st gen)`, or a callable the app calls after the first sign-in. Both generations can live in one functions codebase.
- **Idempotency** names the container from the schema (`idempotencyKeys`) and the dedup window. If the schema has no such container, raise it for the coherence check; do not invent one here.
- **Triggers are at-least-once.** Firestore, Storage, Pub/Sub and Eventarc triggers can fire more than once for one event, so every trigger block has an idempotency line too: a deterministic write (set a field to a value computed from the event, a document id derived from the source) needs nothing more, say so; anything else (an increment, a push, an email, a call to a provider) records the event id (`event.id`) in the dedup container (`idempotencyKeys`, id `trigger_${eventId}`, or a `processedEvents` collection) in the same transaction as the effect, and skips an event it has seen. Scheduled functions re-read state, so a re-run finds nothing left to do.

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

**APIs** (service id `<name>.googleapis.com`, exactly as written), in three lists. Every required one is listed with the units that need it; each is a future quota and deprecation concern, so nothing "just in case". APIs a new project has on by default (`bigquery`, `cloudtrace`, `datastore`, `storage-component` and others) are reviewed and listed, not disabled.

**Provisioning prerequisites**, enabled first by the bootstrap script, because the other steps call them: `serviceusage`, `cloudresourcemanager`, `iam`.

**Required:**

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
| `firebasehosting` | Firebase Hosting: the admin dashboard (the scaffold's `firebase.json` deploys `admin/dist`), App Links and Universal Links files |
| `firebaseremoteconfig` (plus `firebaseremoteconfigrealtime` for realtime updates) | App settings and kill switches in Remote Config |
| `cloudtasks` | Task-queue functions only |

**Must not be used:** `firebasedynamiclinks` (shut down), `containerregistry` (replaced by Artifact Registry), and any API no unit needs.

**Service accounts.** Grant each role at the narrowest resource that works (one bucket, one secret), not the project. Role names below are the usual ones; check the current IAM docs for the exact role before provisioning.

```
cf-runtime-sa       default runtime identity
  roles: datastore.user (Firestore), logging.logWriter
  only when a function on it needs it, scoped to the resource:
    storage.objectUser or objectViewer on the one bucket
    monitoring.metricWriter (custom metrics)
    firebasecloudmessaging.admin or the current FCM send role (push)
    pubsub.publisher on the topic, cloudtasks.enqueuer on the queue
    firebaseremoteconfig.viewer (a function reads app settings)
  no secret access at project level
<name>-runtime-sa   a dedicated account per function group with sensitive
                    permissions, for example:
  auth-admin-sa       firebaseauth.admin, only for functions that set claims
                      or manage users
  payments-runtime-sa secretmanager.secretAccessor on the payment secrets only
deploy-sa           CI deploys through OIDC; a JSON key only as a last resort
  roles: cloudfunctions.developer, run.admin (see the invoker note below),
         iam.serviceAccountUser on each runtime
         account (not project-wide), firebaserules.admin (rules),
         datastore.indexAdmin (indexes), cloudscheduler.admin (scheduled
         functions), eventarc.admin (2nd gen triggers),
         secretmanager.viewer (binding secrets to functions),
         firebasehosting.admin (Hosting: the admin dashboard, the
         .well-known link files),
         artifactregistry.reader if the build needs it
  bound to the CI identity through Workload Identity Federation
  (iam.workloadIdentityUser for the repository's principal)
```

- **Public invoker:** callable and https functions need `allUsers` on `run.invoker` (the function checks auth or the signature itself). The CLI sets it on deploy, which `cloudfunctions.developer` cannot do: grant deploy-sa `run.admin`, or keep it off and write an explicit binding step a person runs after each new public function's first deploy (`gcloud functions add-invoker-policy-binding <fn> --region=<region> --member=allUsers`). `IAM_REQUIREMENTS.md` names the choice.
- **Workload Identity Federation:** one provider per environment. Its `attribute-condition` in CEL pins the repository by id, not only by name, the GitHub environment and the ref: staging `assertion.repository_id == '<id>' && assertion.environment == 'staging' && assertion.ref == 'refs/heads/develop'`; prod `assertion.repository_id == '<id>' && assertion.environment == 'production' && assertion.ref.matches('^refs/tags/v[0-9]+\\.[0-9]+\\.[0-9]+$')`. Wildcards go in the condition: a `principalSet` attribute match is exact. A condition on repository and ref alone is bypassable: GitHub runs the workflow file from the tagged commit, so anyone who can push a matching tag can drop the workflow's guard and its `environment:` line and still get a token. So also, in the repository settings:
  - each GitHub environment (`staging`, `production`) has a deployment rule limiting refs to exactly that environment's ref (`develop`; tags matching `v[0-9]*.[0-9]*.[0-9]*`) and, for `production`, required reviewers;
  - a tag ruleset limits who can create, move or delete `v*` tags;
  - WIF cannot see that a tag is on `main`: the deploy workflow checks it;
  - every deploy job sets `timeout-minutes`.

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
- **HTTPS endpoints and Hosting sites**: ingress and auth strategy for each endpoint; what each Hosting site serves (static files only). A webhook bypasses IAM auth only with a signature check on the body and an in-body rate limit.

## App settings: Remote Config

Non-secret settings that operations changes without a release (an ops contact number, the minimum supported app version, kill switches for payments or a feature, a feature's limits) live in **Firebase Remote Config**: one template per project, defaults bundled in the apps so they start offline, realtime updates for kill switches. A function that reads a setting reads the template through the Admin SDK (`firebaseremoteconfig.viewer` on its runtime account) and caches it briefly. The architecture writes the defaults as a table (key, type, default, who changes it, readers); the apps bundle exactly that table, and the template uploaded to each project starts from it. A project that cannot use Remote Config keeps a single `config/app` document, readable by signed-in clients and written only by an admin path; never both. Secrets never go here: they are Secret Manager. The architecture lists every setting with its default, who may change it, and the units and screens that read it. Remote Config is edited in the console by the people named, not deployed by CI; their role (`firebaseremoteconfig.admin`) is a human grant in `IAM_REQUIREMENTS.md`.

## Returning to the app from a web page

A hosted payment page, an email link or an OAuth hand-off returns to the app through **App Links (Android) and Universal Links (iOS)**: an `https` URL on a domain the project controls that opens the app when installed and a fallback web page when not. Firebase Dynamic Links is shut down; do not design on it. Hosting serves the two association files, `/.well-known/assetlinks.json` (the Android package and signing-certificate fingerprints, one per environment and signing key) and `/.well-known/apple-app-site-association` (team id and bundle id, served as `application/json`, no redirect), plus the fallback page that shows the result and offers to open the app. Either the admin site's `public` folder carries them (Vite copies `admin/public/.well-known/` into `admin/dist`) or a second Hosting site does; the scaffold's `firebase.json` does not ignore dotfiles, so `.well-known` deploys.

- **Per environment:** each environment has its own app ids and signing keys, so the association files live per alias (`links/env/<alias>/.well-known/`) and a Hosting predeploy copies the deploying project's files (`$GCLOUD_PROJECT`) into the served folder, which is ignored by git; never one shared folder, which would serve dev ids to staging and prod. The check script takes the expected package, bundle id and fingerprint as arguments.
- **Fallback page:** its own file reached by a rewrite (`/r/checkout/**` → `/checkout.html`), never `404.html`: the Hosting server answers a rewrite to the error page with status 404.
- **Emulator ports:** `firebase.json` cannot pin a port per Hosting site. The emulator serves the first site on the hosting port and the site at index i (from 1) on port + 4 + i, moving up silently when that port is taken; a local env value derived from it is documented as such and checked against the hub's `/emulators` listing.

The app never trusts the return URL for the outcome: on return it reads the status the webhook wrote (or triggers the poll route above). Custom URL schemes only as a fallback; they are not verified.

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
cp functions/.env.local.example functions/.env.local   # once; emulator-only parameters
pnpm --dir functions run build:watch   # bundler watch + restage into functions/.deploy; the emulator reloads it
cd apps/{app} && flutter run      # connects to the emulator through env
pnpm --dir admin run dev           # Vite dev server
```

Only one command starts emulators. The functions package has `build` and `build:watch` scripts and no script that starts a second functions emulator (two of them clash on port 5001).

Every emulator and the hub bind `"host": "127.0.0.1"` in `firebase.json`, and env files and apps use `127.0.0.1`, never `localhost`, which can resolve to `::1` and fail on an IPv4-only machine; the Android emulator reaches the host at `10.0.2.2`. Apps select the emulator through a build-time flag (`--dart-define=USE_EMULATORS=true`), never by default in a release build.

**App startup and routing.** Side-effecting startup code (Firebase initialization, emulator wiring, Crashlytics, Remote Config fetch) takes its plugin calls through an injectable seam, so fake-driven tests cover it. Route groups are non-const `List<RouteBase>` getters or functions, so each screen issue adds its routes without touching a const list. Running functions against production Firestore "for speed" corrupts data and burns quota.

## CI/CD

| Trigger | What runs |
|---|---|
| Pull request | Lint, types, unit tests and build, one workflow per lane (`flutter.yml`, `firebase.yml`, `admin.yml`), each limited to its lane's paths |
| Merge to `develop` | The above, then deploy to the staging project |
| Tag `vMAJOR.MINOR.PATCH` on `main` (`^v[0-9]+\.[0-9]+\.[0-9]+$`) | The above, a check that the tagged commit is on `main`, manual approval, deploy to production |
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
- Triggers that assume exactly-once delivery (an increment or a push with no event-id dedup).
- Two functions owning the same cause of a transition, including a webhook and a poll that each apply the same provider result instead of sharing one handler.
- Firebase Dynamic Links for returning to the app; app settings hardcoded in the app or scattered across documents.
- Skipping emulator-first development.
- One function doing everything (a 500-line callable handling six actions).
- Cyclic package dependencies (`core → ui → core`).
- Temporal by default.
- Confusing custom claims with cloud IAM.
- Per-tenant roles in custom claims for users who belong to several tenants.
- Inflating the runtime account, project-wide secret access, or `roles/owner` "to be safe".
- Secrets in env vars or code.
- Public buckets, or `allUsers` IAM bindings beyond `run.invoker` on callable and https functions.
- A function region set per function type (only callables), env files that select a fake in a deployed project, or a committed `.env.local`.
