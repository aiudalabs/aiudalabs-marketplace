---
name: stack-profile-fastapi-react
description: "Stack profile for a self-hosted Python backend (FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, Postgres, SQLite in dev) with React frontends and worker processes, deployed with Docker Compose: Postgres-first placement, separate Create/Update/Read schemas, LEGAL_TRANSITIONS and DB constraints for state machines, Postgres queues with FOR UPDATE SKIP LOCKED, default-deny auth dependencies, and the agent roster with its lanes (python-dev, react-dev, qa-tester). Loaded by product-discovery, schema-design, system-architecture, multi-agent-governance and project-kickstart when the locked profile is fastapi-react. Use directly for questions about this stack's conventions, such as '¿cómo modelamos estados en Postgres en este stack?', 'necesitamos Celery o basta la cola en Postgres', 'cómo evito que el cliente mande status' or 'qué carpetas son de python-dev'. For Flutter and Firebase, use stack-profile-flutter-firebase."
license: MIT
metadata:
  version: "1.2.0"
  author: aiudalabs
---

# Stack profile: fastapi-react

A Python backend with React frontends, self-hosted. Conventions distilled from production systems built this way: a src-layout package, FastAPI with SQLAlchemy 2 and Alembic, an append-only audit trail, server-authoritative state machines, Docker Compose deploys.

A stack profile carries the **stack knowledge**; the workflow skills carry the **method**. A profile states decisions ("Postgres for everything until measured otherwise"), it does not offer menus.

## How this profile is used

- `product-discovery` offers it at intake question 4 and locks it as decision `D-01` with the line `**Stack profile:** fastapi-react` in `docs/OPINIONATED_DEFAULTS.md`. The older id `python-fastapi-react` means the same profile.
- `schema-design` reads [references/data-layer.md](references/data-layer.md).
- `system-architecture` reads [references/architecture.md](references/architecture.md).
- `multi-agent-governance` copies the roster in [references/agents.md](references/agents.md) into the project's `docs/AGENT_ROSTER.md`.
- `project-kickstart` scaffolds the repository described in [references/kickstart.md](references/kickstart.md).

When answering a direct question about the stack, read the reference file that covers it and answer from there.

The nine sections below are the profile contract. Every profile answers all nine.

## 1. Identity

- **Stack:** Python 3.11+ with FastAPI, Pydantic v2, SQLAlchemy 2.x and Alembic; Postgres in production, SQLite in development; React with Vite for the frontends; background workers as plain Python processes that claim work from the database. Self-hosted with Docker Compose, one image whose role is chosen by command.
- **Use when:** B2B tools, internal platforms, API-first products, systems with workers, queues or AI agents, products where self-hosting and data control are requirements, Python-native teams.
- **Do not use when:** the product is a mobile-first consumer app with realtime sync (use `flutter-firebase`, the `stack-profile-flutter-firebase` skill), or the organization mandates a managed serverless platform.

## 2. Data stores and placement

**Postgres is the source of truth for everything**: entities, queues, events, text artifacts. SQLite runs the same schema in development (one implementation, two backends selected by URL; never two parallel store implementations). Blobs go to object storage or a volume with the path in Postgres. Redis only when a measurement demands it (a deferral by default). External full-text search only when Postgres full-text demonstrably falls short. The placement table is in [references/data-layer.md](references/data-layer.md).

## 3. Contracts

Pydantic v2 models are the API contract, SQLAlchemy 2 declarative models are the persistence shape, Alembic migrations are the schema history (every schema change ships its migration). Enums are `StrEnum` or `Literal`, mirrored in TypeScript for the React side. No parity tool ships with this profile: `qa-tester` checks both sides on every change that touches either, and a project that wants it automated adds a parity check as its own Sprint 0 issue.

## 4. State-machine enforcement

Legal transitions live in one shared module (`shared/contracts.py: LEGAL_TRANSITIONS`) and are validated in the store layer on every status write. Clients never PATCH `status`: every transition is a dedicated endpoint or worker action that validates before writing, and each cause of a transition has exactly one owning unit (one owner per cause); one cause that arrives by two routes (a payment webhook and a status poll) goes through one shared handler; other units only read the status. Database constraints back the invariants (CHECK on valid statuses, partial UNIQUE indexes for "only one active X").

## 5. Execution units

Four patterns: **endpoint** (FastAPI route, client to server), **webhook** (HMAC-validated ingress), **worker task** (claimed from a database queue with `FOR UPDATE SKIP LOCKED`, `BEGIN IMMEDIATE` on SQLite) and **scheduled job** (cron or a loop in the worker). Each unit gets a block with pattern, owner, trigger, validates, side effects, idempotency, performance, failure modes, tests, auth and secrets accessed. Format in [references/architecture.md](references/architecture.md).

## 6. Tooling and gates

- **Package:** src-layout, `pyproject.toml`, pinned dependencies, console-script entry points; pnpm for the React apps. No `PYTHONPATH` or `sys.path` hacks, ever.
- **Test gate:** `python -m pytest -q`, plus `pnpm --dir frontend/<app> run lint` and `pnpm --dir frontend/<app> run build` for each frontend (`--dir … run` fails when a script is missing).
- **Dev loop:** editable install, SQLite by default (zero infrastructure), Compose for the full stack; end-to-end Compose tests opt-in through an environment variable.
- **CI:** pull request runs lint, typecheck, pytest on SQLite and a pytest job against a Postgres service; a tag on main builds the image and deploys.
- **No `IAM_REQUIREMENTS.md`:** deploy identity, secrets and ingress are a section of `ARCHITECTURE.md` for this self-hosted profile.

## 7. Permissions model

Auth dependencies in FastAPI: tokens compared in constant time for services, sessions or JWT for people, HMAC signatures for webhooks. Role checks as dependencies (`Depends(require_role("admin"))`). Server-only fields enforced structurally by separate Create, Update and Read schemas: clients literally cannot send `status`. Default-deny: every router requires auth unless it is deliberately public and listed.

## 8. Agent roster

`python-dev` (backend, migrations, tests, Python lockfile, deploy), `react-dev` (frontends, the pnpm workspace and its lockfile) and `qa-tester` (review only). Each CI workflow belongs to the lane it validates. Every root and generated file has one owner; a lane asks the owner for changes to files outside it. Exact lanes, in the `docs/AGENT_ROSTER.md` format, in [references/agents.md](references/agents.md).

`product-advisor` is not in the roster: it owns no issue, so it is consulted outside the roster (spec reviews between phases, scope questions), never dispatched as a build agent.

## 9. Kickstart

The `project-kickstart` skill scaffolds the src-layout package with a FastAPI app, Alembic, a pytest seed, a worker stub, Compose files and the React app. What it must produce for this profile is in [references/kickstart.md](references/kickstart.md).
