---
name: schema-design
description: "Designs a product's data model as Phase 3 of the product-spec workflow: stores and collections or tables, typed shapes, state machines with the server-side unit that owns each transition, placement per store, permissions philosophy, anticipated indexes and query costs, scaling risks, denormalization and the migration story. Writes FIREBASE_SCHEMA.md or DATA_SCHEMA.md according to the locked stack profile. Use when the user says 'diseñemos el schema', 'modelo de datos', 'qué colecciones necesito en Firestore', 'diseño de tablas' or 'Firestore vs RTDB', or after the PRD is approved. It needs PRODUCT_BRIEF.md and OPINIONATED_DEFAULTS.md with the stack profile locked. It stops at data: repo layout, Cloud Functions or endpoints inventory, CI/CD, IAM and observability belong to system-architecture."
license: MIT
metadata:
  version: "1.1.0"
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

One document in `./docs/`, named by the profile (`FIREBASE_SCHEMA.md` for `flutter-firebase`, `DATA_SCHEMA.md` for `fastapi-react`), in English, typically 400-700 lines. That size is guidance: completeness wins over the budget, and no required section, shape or query is dropped to fit it. The profile's data-layer file refines the section names:

1. **Stack confirmation**: profile, services and stores in use, versions.
2. **Stores and containers**: every collection, subcollection or table, one heading each with a one-line purpose.
3. **Shapes**: every entity in the profile's contract idiom (TypeScript types; SQLAlchemy models plus Pydantic schemas).
4. **State machines and server writes**: for every lifecycle entity, states, transitions and the server-side owner of each transition, one owner per cause; then the table of every server-side unit that writes, and the table of direct client writes (Step 4).
5. **Placement decisions**: which data lives in which store, and why.
6. **Permissions philosophy**: tenancy, ownership, roles. Philosophy, not literal rules or middleware.
7. **Query-cost anticipation**: composite indexes, DB indexes, N+1 risks, each tied to the query that needs it.
8. **Scaling concerns**: unbounded growth, hot records, size limits, write fan-out.
9. **Denormalization decisions**: every duplicated field, with rationale and consistency owner.
10. **Migration story**: how the schema evolves, with the profile's mechanism.

Cite the decisions (`D-04`) and requirements (`FR-ORDER-1`) each section serves, using their exact ids. Issues later point at sections of this document with anchors (`docs/FIREBASE_SCHEMA.md#bookings`), so give each container its own heading, once, in section 2, subcollections included (`### bookings`, `### bookings/{id}/messages`). Other sections that go container by container use different heading text (`### Booking shape`, `### Booking lifecycle`): two headings with the same text get the anchors `#bookings` and `#bookings-1`, and the issues would link to the wrong one.

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
- A long closed list (more than about six values, or one shared by several fields or containers: sports, reason codes, amenities) is enumerated once, as a named constant in the profile's idiom (`export const SPORTS = [...] as const` with `type Sport = typeof SPORTS[number]`; a Python `Enum` plus its CHECK constraint), and every other shape and section cites it by name. When the PRD already enumerates it in a table, the constant matches that table value for value.
- No PII in identifiers: ids end up in logs and URLs.
- Server-only data is structurally separated from client-readable data.

### Step 4: State machines and server writes

For every entity with a status, write the machine: states, allowed transitions (who triggers each one and the **server-side unit that owns it**: a named unit of the kind the trigger needs, per the profile: a client-invoked function or endpoint, a trigger on a write, a scheduled job, an HTTPS webhook, a worker task), forbidden transitions, terminal states. Expiry and no-show are scheduled jobs and payment confirmations are webhooks; not every owner is client-invoked.

The invariant on every stack: **clients never write the status field directly; every transition goes through a server-authoritative unit**, and the schema names it. An undocumented status field is a bug factory.

One owner per cause: a transition caused in one way has exactly one unit. When the same from → to has several causes (the customer releases a hold; a scheduled job expires it), list one unit per cause and write in one line why they cannot race, usually that each runs in a transaction that re-reads the status and moves it only from the expected state. Phase 5 pins the same units and keeps the proof.

```
Booking
- requested → confirmed: provider (confirmBooking)
- requested → cancelled: customer (cancelBooking)
- confirmed → completed: scheduled job (completeElapsedBookings)
Forbidden: completed → anything (terminal); any client write to status
```

After the machines, list **every server-side unit that writes**, not only the ones that change a status: starting a payment, sending a statement by email, sending a push notification, writing a counter. Screens in Phase 4 name their writes against this table, and Phase 5 writes one block per row.

| Unit | Kind | Writes (containers and fields) | Serves |
|---|---|---|---|
| `confirmBooking` | callable | `bookings.status`, `bookings.confirmedAt` | FR-BOOKING-2 |
| `startPayment` | callable | `checkouts.method`, `checkouts.gatewayPaymentId` | FR-PAYMENT-1 |
| `paymentWebhook` | HTTPS | `checkouts.status`, `payments/*` | FR-PAYMENT-3 |

Then list **every write a client makes directly**, without a server unit: a device token, a `readAt` on its own notification, its own listing's description. Each row names who may write and the rule that bounds it; status, totals and denormalized copies are never here. They go in section 4 under their own heading, `### Direct client writes`:

| Container and field | Who | Rule |
|---|---|---|
| `users/{uid}/devices/{token}` | the signed-in user | own uid only; create and delete |
| `notifications.readAt` | the recipient | only `readAt`, only from null to server time |
| `venues.description`, `venues.photos` | the venue owner | own venue only; no other field |

Screens in Phase 4 cite these writes as `direct (schema: Direct client writes)`, for example `Writes: notifications.readAt direct (schema: Direct client writes)`. A write in neither table is a gap. When the profile allows no direct client writes (every write is an endpoint, as in `fastapi-react`), keep the heading with "None: every write goes through a unit in the server-writes table".

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
- Every transition has a named server-side owner, one per cause, with a no-race line when there are several.
- Every write the PRD implies has a row: in the server-writes table (a client through a unit, or the server on its own) or in Direct client writes.
- Every query-cost entry names its query.
- Every denormalized field has a consistency owner.
- The document uses the profile's idiom throughout, with no artifacts from another stack.

When a check fails, show the gap and ask.

This phase never edits `PRD.md`. When the cross-check finds a contradiction inside the PRD (one FR frees a slot on a declined payment, another lets the customer retry while the hold lasts) or between the PRD and a decision, write the schema on the reading you propose, mark it `[SUPUESTO]`, and raise it at the gate and in `SESSION.md` under Open questions. `product-requirements` fixes the PRD once the user decides, and the schema follows.

A decision in `OPINIONATED_DEFAULTS.md` follows the rule every later phase shares: it is amended only with the user's explicit approval at this phase's gate, by editing the decision in place (same `D-xx` id, never renumbered) and adding under its `**Lock:**` line `**Amended (Phase 3, schema-design):** {what changed and why}.` Never silently: until the user approves, the schema follows the proposed reading marked `[SUPUESTO]`.

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

Run the `spec-guard` check from the project root: `node tools/spec-guard/spec.mjs check`, or the same `scripts/spec.mjs` from the `spec-guard` skill's folder when the project has no `tools/spec-guard/` yet. It works before a backlog exists and checks the decisions, the PRD and the roster on disk; fix any error it reports there before closing, since this phase cites those ids. If it stops with "no backlog at docs/ISSUES.md", the project's copy is older than the `spec-guard` skill: re-run its installer (`node <spec-guard skill folder>/scripts/install.mjs`, safe to repeat) and check again.

Overwrite the whole of `docs/SESSION.md` with the shape every phase skill writes (skip it when `product-spec-orchestrator` re-runs this skill to apply a coherence fix or a build result: the orchestrator updates `docs/SESSION.md` itself, so it never rewinds to this phase):

```markdown
# Session — {project title}

_Narrative for the next session. What is done is decided by `node tools/spec-guard/spec.mjs status`, which reads the documents; when they disagree, status wins._

## Phases

| Phase | Skill | State |
| --- | --- | --- |
| 1 | product-discovery | done |
| 2 | product-requirements | done |
| 3 | schema-design | done |
| 4 | ui-screens-spec | pending |
| 5 | system-architecture | pending |
| 6 | multi-agent-governance | pending |
| 7 | navegable-mockups | pending |

## Last phase: 3 — schema-design

- 3 to 5 bullets: what was decided that the next phase must know.

## Open questions

- Items marked [SUPUESTO] or deferred to a later phase, or "None".

## Next

Phase 4 — ui-screens-spec.
```

Write each phase's State as it really is (Phase 2 stays pending if it was skipped).

Close with:

> Fase 3 cerrada. {N} contenedores, {M} máquinas de estado, {U} unidades del servidor que escriben, {K} índices o costos de query anticipados. La siguiente fase (`ui-screens-spec`) usa este schema como ground truth: cada estado necesita al menos una pantalla. Si quieres revisar algo, hazlo ahora; aquí es más barato que en la arquitectura.

Under `product-spec-orchestrator`, its phase gate replaces this closing message: one gate that carries these counts plus its "Decisiones tomadas en Fase 3 que vale la pena verificar" bullets.

Wait for explicit approval. `ui-screens-spec` then consumes the state machines (each state needs a screen), the shapes (each entity shapes its screens) and the denormalized fields (screens read them to avoid N+1).

## What this skill does not do

- Write security rules or middleware (sprints).
- Specify server-side units beyond naming them and what they write (Phase 5, `system-architecture`).
- Edit the PRD; it raises contradictions at the gate. It amends a decision only with the user's approval at the gate, in place and noted (Step 10).
- Write migration scripts; only the migration story.
- Predict scale beyond an order of magnitude.
