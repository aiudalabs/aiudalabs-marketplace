# fastapi-react: architecture

Read by the `system-architecture` skill (Phase 5). This file carries the Python, FastAPI and Compose knowledge; the skill carries the method.

## Outputs for this profile

| File | Purpose | Notes |
|---|---|---|
| `docs/ARCHITECTURE.md` | Technical shape of the product | Always |
| `docs/IAM_REQUIREMENTS.md` | | **Not produced.** For this self-hosted profile, deploy identity, secrets and ingress are a section of `ARCHITECTURE.md` (the reduced form of the skill's service-identity step). |

## Repo layout

```
{repo-root}/
├── pyproject.toml              # one installable package, src-layout, pinned deps
├── alembic.ini
├── alembic/versions/           # one migration per schema change
│
├── src/{package}/
│   ├── shared/                 # contracts: Pydantic models, enums, LEGAL_TRANSITIONS; no IO
│   ├── {service_a}/            # for example control/: the FastAPI app
│   │   ├── main.py             # routers, kept thin (no inline frontends)
│   │   ├── core/               # config (env-driven), security (auth, HMAC)
│   │   ├── db/                 # models.py (SQLAlchemy), store.py (queries and transitions)
│   │   └── api/                # parsers and serializers for external payloads
│   └── {service_b}/            # for example worker/: the queue consumer
│       ├── runner.py           # claim → route by task type → report
│       └── engine/             # pluggable adapters behind a Protocol
│
├── frontend/{app}/             # React + Vite (pnpm), talks to the API only
├── tests/                      # pytest; imports the installed package
├── deploy/                     # docker-compose.yaml, .env.example, runbook
├── Dockerfile                  # multi-stage, ONE image, role by command, non-root
├── scripts/                    # demo.sh and dev utilities
└── docs/                       # the spec documents
```

One installable package with one console-script entry point per service: services differ by entry point, not by repository. One Docker image for every role until size or divergence demands otherwise. Each top-level path belongs to one agent lane; see `agents.md` in this folder.

## Dependency rules

```
shared      depends on: nothing with IO (pure contracts)
{service}/* depends on: shared
frontend    depends on: the HTTP API only (TS types mirrored from shared enums)
tests       depend on:  the installed package (never sys.path or PYTHONPATH hacks)
```

No service imports another service's internals; services talk over HTTP or through the database queue. Enum and type parity between `shared` and the frontend's TypeScript types is checked by `qa-tester` on every change that touches either side; no parity tool ships with the profile, and a project that wants one adds it as a Sprint 0 issue.

## Workflow-engine guard: defaults for this stack

Default: **no workflow engine** (Temporal, Celery with Redis, RabbitMQ). A Postgres queue (`FOR UPDATE SKIP LOCKED`), plain worker processes and the state machine in the database cost no extra infrastructure and are debuggable with SQL. Justify an engine only with the skill's four questions. Reference costs: Temporal Cloud from $200/month; a self-hosted broker is one more stateful service to operate. Known call: multi-step pipelines with human gates are modeled first as task types and states in the same queue, before reaching for an engine.

## Execution-unit block

Patterns: **endpoint** (FastAPI route), **webhook** (HMAC ingress), **worker task** (claimed from the queue), **scheduled job** (cron or loop).

```
POST /bookings/{id}/accept
  Pattern: endpoint (role: provider)
  Owner: python-dev
  Trigger: provider app, booking detail screen (2.3.2)
  Validates:
    - Caller is the provider of this booking (authz dependency)
    - Booking is in 'submitted' state (LEGAL_TRANSITIONS)
  Side effects:
    - Transition submitted → accepted (single transaction)
    - provider.accepted_count += 1 (same transaction)
    - Notification row enqueued (outbox)
  Idempotency: client_request_id column, partial UNIQUE index (24 h window)
  Performance: p50 < 100 ms, p95 < 300 ms
  Failure modes:
    - Race on accept → 409 (transition validation), client refreshes
  Tests:
    - Unit: transition validator
    - Integration: TestClient with in-memory SQLite
  Auth: session or bearer token (dependency)
  Secrets accessed: (none)
  Serves: FR-BOOKING-2, D-04
```

Required fields: pattern, owner, trigger or fires-when, validates, side effects, idempotency, performance, failure modes, tests, **auth**, **secrets accessed**. Worker tasks add claim semantics, the retry and zombie policy (stale timeout and maximum attempts) and cost reporting when the task spends money (LLM calls).

The side effects copy each transition's single owner from the schema (`data-layer.md` in this folder); a unit that would transition a status the schema gives to another unit is raised for the coherence check instead of becoming a second owner. `Idempotency` names where the key lives, as the schema records it (a UNIQUE column or the `idempotency_keys` table); if the schema has no place for it, raise it for the coherence check.

## Transactional consistency menu

| Pattern | Use | Example |
|---|---|---|
| Single DB transaction | Multi-row atomic within one service | Transition, counter and event row together |
| Partial UNIQUE or CHECK constraint | Invariants under concurrency | One active task per key; valid statuses |
| `FOR UPDATE SKIP LOCKED` claim | Queue consumption without double claims | Worker claim (`BEGIN IMMEDIATE` on SQLite) |
| Outbox row plus worker | Side effects across a service or network boundary | Send the notification after commit |
| Idempotency key | Client retries on endpoints with side effects | `client_request_id` UNIQUE |
| Eventual via scheduled job | Cleanup, zombie recovery, aggregates | Stale RUNNING → requeue, with an attempt cap |

If the database can express the invariant, the database enforces it. Python validation is for the user experience; constraints are the truth.

## End-user permissions

- Authentication dependencies per router: tokens compared in constant time (`hmac.compare_digest`, `secrets.compare_digest`), sessions or JWT for people, HMAC over the raw body for webhooks.
- Authorization as composable dependencies (`require_role("admin")`).
- Server-only fields enforced by separate Create, Update and Read schemas.
- **Default-deny:** every router authenticated unless deliberately public and listed in `ARCHITECTURE.md`. Read endpoints are not exempt; read-only leaks are leaks.
- Secrets with insecure development defaults **fail hard** when a production signal is present (a Postgres `DATABASE_URL` with `dev-secret` refuses to boot).

## Service identity and secrets (a section of `ARCHITECTURE.md`)

- **Deploy identity:** CI deploys with an SSH key or registry token scoped to the target host, with documented rotation.
- **Secrets:** runtime secrets come from `deploy/.env` (gitignored; `.env.example` committed with empty values); Compose checks presence with `${VAR:?}`. Never in code, never committed, never logged.
- **Ingress:** a reverse proxy (Traefik or Caddy) terminates TLS. Internal services (Postgres, workers) are not exposed: no port mappings for them in Compose.
- **Containers:** non-root user, multi-stage build, chained healthchecks (db → api → workers). Migrations run before the new code starts.

## Performance budget implications

| Budget | Architecture implication |
|---|---|
| API p95 < 300 ms | Indexes from Phase 3; `selectinload` over lazy N+1; keyset pagination |
| Dashboard first paint < 2 s | Vite code splitting; list endpoints capped and paginated |
| Worker pickup latency < N s | Poll interval ≤ N/2, or LISTEN/NOTIFY when polling shows in metrics |
| Realtime-ish updates | Polling or SSE first; WebSockets are a deferral with a measured trigger |
| Job throughput | More worker replicas of the same image; SKIP LOCKED already solves claim contention |

## Dev workflow: local-first, non-negotiable

```bash
pip install -e ".[dev]"            # editable install with dev dependencies
python -m pytest -q                # the gate: green before and after every change
{package}-api                      # console script: the FastAPI service (uvicorn)
{package}-worker --once            # console script: process one task and exit
./scripts/demo.sh                  # end-to-end local demo
cd frontend/{app} && pnpm dev      # the React app against the local API
```

SQLite by default (zero infrastructure); `DATABASE_URL` switches to Postgres; the full stack runs with `docker compose up` in `deploy/`; end-to-end Compose tests are opt-in through an environment variable (they are slow and stay out of the default suite).

## CI/CD

| Trigger | What runs |
|---|---|
| Pull request, `backend.yml` | ruff, typecheck, `pytest -q` on SQLite, and a second job with pytest against a Postgres service container |
| Pull request, `frontend.yml` | Frontend lint, typecheck and build |
| Merge to main | The above, build the image, deploy to staging (pull, migrate, up) |
| Tag `v*` | Manual approval, production deploy (migrate, then up) |

One workflow per lane, each limited to its lane's paths, so a workflow belongs to the lane it validates (`agents.md` in this folder). Versions pinned in `pyproject.toml` and the lockfiles; CI mirrors dev. Secrets in the CI provider's store.

## Observability stack

| Layer | Tool |
|---|---|
| API | Structured JSON logging with a request id; uvicorn access logs |
| Workers | The same logger; every task logs claim, outcome, duration and cost |
| Errors | Sentry (API, workers, React) |
| Audit | Append-only event table (a product feature, not only ops) |
| Metrics | A `/metrics` endpoint (counts, rates, cost per unit of work); Prometheus and Grafana only when someone will read the dashboard |
| Uptime | `/healthz` healthchecks plus an external ping service |

P0 alerts: API error rate above 1% over 5 min; a worker with zero claims for N minutes while the queue is not empty; database disk above 80%. P1: p95 regression; queue depth growing.

## Deferral candidates

- **v1.1:** Redis cache (with the measurement that justifies it), LISTEN/NOTIFY instead of polling, pgvector for semantic search, Prometheus and Grafana.
- **v2:** WebSockets, read replicas, multi-region, SSO with SAML.
- **v∞:** splitting into microservices, a message broker, Kubernetes, event sourcing or CQRS.

## Stack-specific anti-patterns

- `PYTHONPATH` or `sys.path` hacks instead of an installable package.
- Two store implementations, one per database backend.
- Inline HTML and JavaScript frontends inside FastAPI route files; they grow without limit. Move them to the React app or static files.
- Check-then-act for invariants the database can express.
- Schema changes without an Alembic migration; deploying code before migrating.
- Long transactions or open sessions across network calls.
- Secrets in code or committed env files; development defaults that boot in production.
- Postgres or workers exposed through Compose port mappings.
- Celery, Redis or a broker before a Postgres queue is measured insufficient.
- Containers running as root.
