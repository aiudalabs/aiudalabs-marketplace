# fastapi-react: data layer

Read by the `schema-design` skill (Phase 3). This file carries the Postgres and SQLAlchemy knowledge; the skill carries the method.

## Output document

Phase 3 writes `docs/DATA_SCHEMA.md` (typically 400-700 lines; completeness wins over the budget). Profile-specific section names:

1. **Stack confirmation**: Python and Postgres versions, SQLAlchemy 2.x, Alembic.
2. **Tables**: one-line purpose each, one heading per table so issues can link to `docs/DATA_SCHEMA.md#bookings`. Include where idempotency keys live (see below).
3. **Shapes**: SQLAlchemy models plus the Pydantic Create, Update and Read schemas per entity.
4. **State machines and server writes**: states, transitions and the one endpoint or worker task that owns each, one owner per cause (see below); then the table of every endpoint or task that writes. Clients write only through endpoints, so `### Direct client writes` says "None".
5. **Placement decisions**: Postgres vs object storage vs a justified Redis.
6. **Permissions philosophy**: auth model, roles, server-only fields per schema.
7. **Query-cost anticipation**: index per query, N+1 risks, pagination strategy.
8. **Scaling concerns**: unbounded tables, hot rows, lock contention, fan-out.
9. **Denormalization decisions**: duplicated columns with rationale.
10. **Migration story**: Alembic conventions.

**Table headings appear once.** The heading named after a table (`### bookings`) exists only in section 2; that is the anchor issues link to. Other sections use different heading text for the same table (`### Booking models`, `### Booking states`) or link back to it (`[bookings](#bookings)`). Two headings with the same text give the second the anchor `#bookings-1`, and links go to the wrong one.

## Placement heuristic

| Data | Default location | Why |
|---|---|---|
| Source-of-truth entities | Postgres | ACID, constraints, queryable |
| Work queues and tasks | Postgres (`FOR UPDATE SKIP LOCKED`) | One store; no broker until a measured need |
| Audit and event log | Postgres, append-only table | Auditability is a product feature |
| Text documents and artifacts | Postgres TEXT, append-only with revision and parent | The history is the knowledge base |
| Blobs (files, images) | Object storage or a volume; the path in Postgres | Blobs do not belong in the database |
| Cache and ephemeral data | In-process, or Redis **only when measured** | Redis is a deferral by default |
| Full-text search | Postgres full-text (tsvector), then pgvector for semantic search | External engines only when Postgres demonstrably falls short |
| Analytics events | A Postgres table, exported later | No analytics infrastructure in the MVP |

Tie-breaker: **when in doubt, Postgres.** One store, one backup story, one migration tool. Development runs the same schema on SQLite through SQLAlchemy: one implementation, two backends by URL, never a parallel store per backend.

## Contract conventions

Three layers per entity, each with a job:

```python
# SQLAlchemy model: persistence shape (db/models.py)
class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[str] = mapped_column(primary_key=True)        # uuid4 hex; no PII in ids
    status: Mapped[str] = mapped_column(index=True)           # checked against LEGAL_TRANSITIONS, never free
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

# Pydantic schemas: API contract, separate Create / Update / Read
class BookingCreate(BaseModel):   # what clients may send: no status, no computed fields
    service_id: str
    starts_at: datetime
class BookingRead(BaseModel):     # what clients receive
    id: str
    status: BookingStatus         # StrEnum, mirrored in TypeScript for the React app
```

- **Separate Create, Update and Read schemas.** Server-only fields (status, totals, costs) do not exist on Create or Update; that is the field-level security.
- Enums as `StrEnum` or `Literal`, mirrored in the React app's TypeScript types; drift fails CI.
- One timestamp convention repo-wide: `TIMESTAMPTZ` in UTC preferred; ISO-8601 TEXT acceptable only if locked early. Document it.
- No PII in primary keys: ids end up in logs and URLs.
- JSON columns only for genuinely schemaless data, with a documented shape; never as an escape from migrations.

## State-machine enforcement

- Legal transitions in one shared module (`LEGAL_TRANSITIONS` dict), validated in the store layer on every status write. An illegal transition raises, whichever endpoint attempted it.
- Each transition is a dedicated endpoint or worker action. Clients never PATCH `status`.
- **One owner per cause.** A transition is identified by from-state, to-state and cause; each has exactly one owning unit, and every other unit only reads `status`. When two causes lead to the same states (a user cancels a hold, a job expires it), list them as separate transitions with their own owners. Each owner writes with a conditional update (`UPDATE ... SET status=:to WHERE id=:id AND status=:from`, checking the row count) or under `SELECT ... FOR UPDATE`, so two owners can never both apply a change to the same row. One cause that reaches the server by two routes (the payment provider's webhook and a status poll) stays one transition with one owner: the other route calls the owner's shared handler, never a second implementation.
- The database backs the invariants: CHECK constraints for valid statuses, partial UNIQUE indexes for "only one active booking per slot". Check-then-act in Python is a race; the constraint is the truth.
- Terminal states have no outgoing transitions in the shared dict.

## Idempotency

Endpoints with side effects take a `client_request_id`; webhooks use the provider's event id. Worker tasks can run twice (a zombie requeued after its stale timeout), so a task with an external effect (an email, a provider call) records its task id in the same place before reporting done, or makes the effect deterministic. The schema says where the key is stored, so Phase 5 does not have to invent it:

- **On the row the call creates**, when the call creates exactly one row: a `client_request_id` column with a UNIQUE index on `(caller_id, client_request_id)`; a retry hits the constraint and returns the existing row.
- **In an `idempotency_keys` table** otherwise (transitions, calls that touch several rows): `(caller_id, key)` primary key, `endpoint`, `outcome`, `result_ref`, `created_at`, written in the same transaction as the change. A scheduled job deletes rows older than the dedup window (at least 1 h, typically 24 h).

## Permissions philosophy checklist

- **Tenancy:** single-tenant by default; multi-tenant means a `tenant_id` column filtered in one query helper, never ad-hoc WHERE clauses.
- **Authentication:** a dependency per router. Tokens compared in constant time for services, sessions or JWT for people, HMAC over the raw body for webhooks.
- **Authorization:** role checks as FastAPI dependencies; roles in the user record or token claims.
- **Public surface:** default-deny. Every router authenticated unless deliberately public, and then listed.
- **Server-only fields:** enforced structurally by the Create and Update schemas.
- **Cross-entity constraints:** database constraints first, endpoint validation second; document which is which.

## Query costs: indexes

For every query the app runs, derive its index:

| Query | Access path | Index |
|---|---|---|
| Claim the next queued task by priority | `WHERE status='QUEUED' ORDER BY priority, created_at FOR UPDATE SKIP LOCKED` | `(status, priority, created_at)` |
| Latest artifact revision of a task | `WHERE task_id=? AND kind=? ORDER BY revision DESC LIMIT 1` | `(task_id, kind, revision)` |
| One active task per external key | partial UNIQUE `ON (task_key) WHERE status IN (...)` | Doubles as the idempotency constraint |

Also anticipate N+1 on list endpoints (`selectinload` or joins), the pagination strategy per list (keyset over OFFSET for unbounded tables) and which endpoints need `LIMIT` caps.

## Scaling red flags

- Unbounded tables (events, messages, logs): a retention or archival policy from day one.
- Hot rows (one row, many writers: counters, singleton state): row-lock contention; plan sharded counters or `UPDATE ... RETURNING`.
- Long transactions holding locks. The SQLite dev backend serializes writers; keep transactions short.
- Write fan-out above 5 per user action: one transaction, or accept eventual consistency explicitly.
- TEXT or JSON columns growing without bound (LLM transcripts): size caps and rolling summaries.

## Denormalization

The method's rule applies: what, why (the query), who keeps it consistent (a named endpoint hook, trigger or worker job) and acceptable staleness. In SQL, prefer a JOIN until there is measured pain; denormalize only with a named query that justifies it.

## Migration story

- Alembic from day 0. **Every schema change ships its migration** in the same pull request.
- Migrations are reversible (downgrade implemented) and include their backfills.
- Deploy order: migrate, then roll out the new code. Write it in the deploy runbook.
- First install may use `create_all` plus `alembic stamp head`; every update migrates.
- Breaking changes: a dual-write and dual-read period, a cutover gate, documented.

## Stack-specific anti-patterns

- Two store implementations, one per database backend.
- Check-then-act in Python for invariants the database can express.
- `status` writable through a generic update endpoint.
- Schema changes without an Alembic migration.
- JSON columns instead of designing the schema.
- OFFSET pagination on unbounded tables.
- Mixing naive and aware datetimes.
- A transition with two owners, or with none.
- A per-table heading repeated in several sections.

## What Phase 3 does not do here

- Write the Alembic migrations (Sprint 0 onward).
- Specify endpoints or workers beyond naming transition owners (Phase 5, then sprints).
- Choose Redis or an external search engine. Those are Phase 5 deferral decisions with measured triggers.
