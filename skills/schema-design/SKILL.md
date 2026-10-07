---
name: schema-design
description: "Designs a product's data model as Phase 3 of the product-spec workflow: stores and collections or tables, typed shapes, state machines with the server-side unit that owns each transition, placement per store, permissions philosophy, anticipated indexes and query costs, scaling risks, denormalization and the migration story. Writes FIREBASE_SCHEMA.md or DATA_SCHEMA.md according to the locked stack profile. Use when the user says 'diseñemos el schema', 'modelo de datos', 'qué colecciones necesito en Firestore', 'diseño de tablas' or 'Firestore vs RTDB', or after the PRD is approved. It needs PRODUCT_BRIEF.md and OPINIONATED_DEFAULTS.md with the stack profile locked. It stops at data: repo layout, Cloud Functions or endpoints inventory, CI/CD, IAM and observability belong to system-architecture."
license: MIT
metadata:
  version: "1.0.0"
  author: aiudalabs
  requires: stack-profile-flutter-firebase stack-profile-fastapi-react
---

# Schema Design

Design the product's data model. Phase 3 of the product-spec workflow (1 discovery, 2 requirements, 3 schema, 4 UI, 5 architecture, 6 governance, 7 mockups). It turns the locked decisions and requirements into stores, shapes, state machines and the data contract every later phase consumes.

A weak schema taxes every later sprint. This is where the team pays its closest attention to detail.

## The method is stack-agnostic; the stack knowledge comes from the profile

Read the stack profile line in `docs/OPINIONATED_DEFAULTS.md`: `**Stack profile:** flutter-firebase` or `**Stack profile:** fastapi-react` (the older ids `aiuda-flutter-firebase` and `python-fastapi-react` mean the same profiles). Then load the `stack-profile-<id>` skill and read its `references/data-layer.md` before starting. That file gives the output filename, the stores and their placement heuristic, the contract idiom, the enforcement mechanism, the query-cost rules and the stack's own anti-patterns. Apply it throughout.

- **No profile locked:** stop and ask the user to pick one (the `product-discovery` intake question 4). Do not proceed generically: a schema not grounded in a concrete stack is "it depends" in disguise.
- **Older project without a profile line** but with a `docs/FIREBASE_SCHEMA.md` already present: assume `flutter-firebase`, say so, and add the profile as the next numbered decision in `OPINIONATED_DEFAULTS.md` (with the `**Stack profile:**` line) before continuing.

## When to use it, and when not

Use it for "diseñemos el schema", "modelo de datos", "estructura de datos", "data model", "diseño de tablas", stack phrasings such as "Firestore collections" or "modelo relacional", and as Phase 3 after the PRD is approved.

Do not use it when:

- There is no `docs/PRODUCT_BRIEF.md`: run `product-discovery` first.
- A schema document already exists and the user wants to extend it: review the existing document with them and edit it section by section rather than redesigning.
- The user wants the repo layout, the server-side unit inventory, CI/CD or the cloud identity model: that is `system-architecture`.

## Inputs

- `docs/PRODUCT_BRIEF.md`: entities, personas, value loop.
- `docs/OPINIONATED_DEFAULTS.md`: locked decisions `D-xx`, including the stack profile.
- `docs/PRD.md` when it exists: every entity and state machine must support the functional requirements (`FR-ORDER-1`...). Trace the schema to them. Without a PRD, work from the brief and the decisions and say so.
- The profile's `references/data-layer.md`.

If the brief or the decisions are missing, ask and stop.

## What it produces

One document in `./docs/`, named by the profile (`FIREBASE_SCHEMA.md` for `flutter-firebase`, `DATA_SCHEMA.md` for `fastapi-react`), 400-700 lines, in English. The profile's data-layer file refines the section names:

1. **Stack confirmation**: profile, services and stores in use, versions.
2. **Stores and top-level containers**: collections or tables, one-line purpose each.
3. **Shapes**: every entity in the profile's contract idiom (TypeScript types; SQLAlchemy models plus Pydantic schemas).
4. **State machines**: for every lifecycle entity, states, transitions and the server-side owner of each transition.
5. **Placement decisions**: which data lives in which store, and why.
6. **Permissions philosophy**: tenancy, ownership, roles. Philosophy, not literal rules or middleware.
7. **Query-cost anticipation**: composite indexes, DB indexes, N+1 risks, each tied to the query that needs it.
8. **Scaling concerns**: unbounded growth, hot records, size limits, write fan-out.
9. **Denormalization decisions**: every duplicated field, with rationale and consistency owner.
10. **Migration story**: how the schema evolves, with the profile's mechanism.

Cite the decisions (`D-04`) and requirements (`FR-ORDER-1`) each section serves, using their exact ids. Issues later point at sections of this document with anchors (`docs/FIREBASE_SCHEMA.md#bookings`), so give each container its own heading.

## The method

### Step 1: Extract entities

From the brief, the decisions and the PRD, list:

- **Entities**: every noun in the value loop and the requirements (user, provider, service, booking, message, payment, review, notification).
- **Relationships**: who owns what (a booking belongs to a customer and a provider).
- **Multiplicity**: one-to-one, one-to-many, many-to-many.
- **Lifecycle entities**: anything with a status (booking: requested → confirmed → completed; payment: initiated → captured → settled).

### Step 2: Placement per data category

For each category of data, decide which of the profile's stores holds it, with the profile's placement heuristic and tie-breaker. Record the rationale per category. Never use two stores for the same purpose.

### Step 3: Shapes in the profile's contract idiom

Write every container's shape with the profile's conventions (where types live in the repo, id conventions, optionality, enums, timestamp type, server-only data). Rules on every stack:

- The shape is the contract. A schema in prose only is not a schema.
- Every field typed; no untyped blobs without a written reason.
- Enum-like fields are closed sets, never free strings.
- No PII in identifiers: ids end up in logs and URLs.
- Server-only data is structurally separated from client-readable data.

### Step 4: State machines

For every entity with a status, write the machine: states, allowed transitions (who triggers each one and the **server-side unit that owns it**: a named Cloud Function, endpoint or worker task, per the profile), forbidden transitions, terminal states.

The invariant on every stack: **clients never write the status field directly; every transition goes through exactly one server-authoritative unit**, and the schema names it. An undocumented status field is a bug factory.

```
Booking
- requested → confirmed: provider (confirmBooking)
- requested → cancelled: customer (cancelBooking)
- confirmed → completed: scheduled job (completeElapsedBookings)
Forbidden: completed → anything (terminal); any client write to status
```

### Step 5: Permissions philosophy

Document the philosophy with the profile's permissions model; the literal rules or middleware are written in the sprints. Cover:

- **Tenancy**: single-tenant, multi-tenant (organizations with members) or hybrid.
- **Ownership**: which data belongs to the requesting user.
- **Roles**: how they are assigned and verified.
- **Public data**: what is readable without auth (usually nothing in the MVP).
- **Server-only fields**: status, computed totals, ratings.
- **Cross-entity constraints** the store's rules cannot express ("max 5 active bookings"), and where they are enforced instead.
- **Denormalization integrity**: duplicated fields are server-owned, never client-owned.

### Step 6: Anticipate query costs

List every query the app will run and derive the artifact the profile cares about: composite indexes for document stores, DB indexes and access paths for relational ones, N+1 risks for both. Each entry names its query. Finding these in production is a self-inflicted wound.

### Step 7: Flag scaling concerns

For each container:

- **Unbounded?** It grows forever with no archival: plan archival.
- **Hot records?** One record, many concurrent writers: plan per the profile (distributed counters, sharding, lock strategy).
- **Unbounded child sets?** A chat with a million messages: plan pagination and archival.
- **Size limits?** Records at risk of exceeding the store's limit: plan separation.
- **Write fan-out?** One action causing more than 5 writes: plan batching or transactions.

### Step 8: Denormalization

Every duplicated field records **what** is duplicated, **why** (the query it speeds up), **who** keeps it consistent (a named server-side unit) and **how stale** is acceptable. If you cannot name the query, do not duplicate: every copy is a consistency liability.

### Step 9: Migration story

With the profile's mechanism (a `schemaVersion` field plus backfill jobs; Alembic with one migration per change): versioning, backfills, breaking changes (dual-write period, cutover gate), how long old clients keep working. For an MVP one paragraph is enough.

### Step 10: Cross-check before closing

- Every entity from the brief and the PRD has a container, or is explicitly out of the MVP.
- Every non-deferred decision with data implications has a schema counterpart.
- Every FR's state is representable.
- Every transition has a named server-side owner.
- Every query-cost entry names its query.
- Every denormalized field has a consistency owner.
- The document uses the profile's idiom throughout, with no artifacts from another stack.

When a check fails, show the gap and ask.

## Anti-patterns

- Denormalization without a named query.
- Hot records without a contention plan.
- Unbounded growth without archival.
- Implicit state machines: a status with no documented transitions and owners.
- Permissions as an afterthought: schemas designed without them end up unenforceable.
- No query-cost anticipation.
- Shapes in prose only.
- Identifiers containing PII.

Add the stack-specific anti-patterns from the profile's data-layer file.

## Communication

Spanish in the conversation, English in the document, code blocks in the profile's idiom. Tie every decision to a query or a business rule. State machines as ASCII, relationships as lists. Name the alternatives of every trade-off.

## Gate and handoff

Overwrite the phase table in `docs/SESSION.md`: Phase 3 (`schema-design`) complete, next `ui-screens-spec`, with 3-5 bullets on what was locked and any open cross-check flags.

Close with:

> Fase 3 cerrada. {N} contenedores, {M} máquinas de estado, {K} índices o costos de query anticipados. La siguiente fase (`ui-screens-spec`) usa este schema como ground truth: cada estado necesita al menos una pantalla. Si quieres revisar algo, hazlo ahora; aquí es más barato que en la arquitectura.

Wait for explicit approval. `ui-screens-spec` then consumes the state machines (each state needs a screen), the shapes (each entity shapes its screens) and the denormalized fields (screens read them to avoid N+1).

## What this skill does not do

- Write security rules or middleware (sprints).
- Specify server-side units beyond naming transition owners (Phase 5, `system-architecture`).
- Write migration scripts; only the migration story.
- Predict scale beyond an order of magnitude.
