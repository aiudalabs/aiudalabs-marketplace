# flutter-firebase: data layer

Read by the `schema-design` skill (Phase 3). This file carries the Firebase knowledge; the skill carries the method.

## Output document

Phase 3 writes `docs/FIREBASE_SCHEMA.md` (typically 400-700 lines; completeness wins over the budget). Profile-specific section names:

1. **Stack confirmation**: Firebase services in use (Firestore, RTDB, Auth, Storage, Functions, Cloud Messaging) and versions.
2. **Top-level collections**: one-line purpose each, one heading per collection so issues can link to `docs/FIREBASE_SCHEMA.md#bookings`. Include the `idempotencyKeys` container (see below).
3. **Document shapes**: TypeScript types for every collection and subcollection.
4. **State machines**: states, transitions and the one Cloud Function that owns each.
5. **RTDB usage**: what lives in RTDB and why it is not in Firestore.
6. **Security rules philosophy**: tenancy, owner model, role model, custom claims approach. Not literal rules.
7. **Composite indexes**: every where-plus-orderBy-on-different-fields combination, with the query that needs it.
8. **Scaling concerns**: hot documents, unbounded subcollections, document size risks, write fan-out.
9. **Denormalization decisions**: every duplicated field with rationale.
10. **Migration story**: versioning, backfills, breaking changes.

**Container headings appear once.** The heading named after a container (`### bookings`) exists only in section 2; that is the anchor issues link to. Sections 3 and 4 use different heading text for the same container (`### Booking shape`, `### Booking states`) or link back to it (`[bookings](#bookings)`). Two headings with the same text give the second the anchor `#bookings-1`, and links go to the wrong one.

## Placement heuristic

| Data | Default location | Why |
|---|---|---|
| Source-of-truth entities (users, bookings, payments) | Firestore | Queryable, security rules, indexes |
| Chat messages, archived | Firestore | Long-term storage, security |
| Chat messages, live (last 50) | Firestore (RTDB only if scale demands) | Realtime listeners are enough |
| Presence (online/offline) | RTDB | Auto-disconnect on network loss |
| Typing indicators | RTDB | Ephemeral, no archive |
| Cursor positions (shared editing) | RTDB | Sub-100 ms latency |
| Live counters (concurrent users) | RTDB | Atomic increment, low latency |
| Notifications inbox | Firestore | Queryable, archived |
| Analytics events | Firebase Analytics SDK | Not in either database |
| Full-text search index | External (Algolia, Typesense) | Firestore search is weak |

When in doubt, Firestore. RTDB's rules are far weaker than Firestore's, and most products do not need its ephemeral semantics. Never mix both stores for one purpose: RTDB for presence plus Firestore for the archive is fine; both for booking status is not.

## Type and contract conventions

Document shapes are TypeScript types; the type is the contract. They live in `packages-ts/types/` and are mirrored to Dart in `packages/core/types/`.

```typescript
// Collection: users
type User = {
  id: string                    // doc id, not stored as a field
  email: string
  phoneE164: string
  displayName: string
  type: 'customer' | 'provider' | 'admin'
  verificationTier: 'basic' | 'verified' | 'premium'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

- `Timestamp` from Firestore, never `Date` or `number`: it survives time zones, serialization and sorting.
- Document the doc-id convention (auto id, uid, composite). **No PII in doc ids**: a phone number as id ends up in logs and URLs.
- Optional fields use `?:`, not `| undefined`.
- Enum-like fields are literal unions, not `string`.
- No `any`, no `unknown`.
- Two kinds of restricted field, kept apart:
  - **Read-restricted** data (PII such as a national id or tax id, internal notes) goes in a `private` subcollection whose rules allow reads only to the owner, the functions and admins.
  - **Write-restricted** fields (`status`, totals, commission, ratings, denormalized copies) stay on the main document, where clients read them; rules deny client writes to them and only functions write them.
- Subcollections only for data accessed exclusively through the parent. Anything queried across parents ("all bookings of provider X") is a top-level collection with a reference field.

## State-machine enforcement

Clients never write `status`; security rules deny it regardless of role. Every transition goes through a Cloud Function of any pattern: a **callable** for a user action, a **scheduled** function for expiry and no-show, an **https** webhook for a payment confirmation, a **trigger** for a reaction to another write. The schema names the owner of each:

```
- draft → submitted: customer (createBooking, callable)
- submitted → accepted: provider (acceptBooking, callable)
- held → free, cause checkout cancelled: customer (cancelCheckout, callable)
- held → free, cause hold expired: system (expireHolds, scheduled)
- pending_payment → confirmed: payment provider (paymentWebhook, https)
- disputed → resolved: admin only (resolveDispute, callable)
Forbidden: completed → anything (terminal); any client write to status
```

**One owner per transition.** A transition is identified by from-state, to-state and cause. Each has exactly one owning function; every other function only reads `status`. When two causes lead to the same states (the customer cancels a hold, a job expires it), list them as separate transitions, each with its owner, as above. Each owner applies its transition in a transaction that re-reads the document and aborts when the status is no longer the from-state, so two owners can never both apply a change to the same document; the schema says this once for all of them.

### Offline state changes

Firestore's offline write queue cannot carry a transition, because clients never write `status`. An app that must change state offline (check-in at a venue with poor signal, blocking a slot) keeps an **app-local ordered queue of callable calls**, persisted on the device:

- The app generates each call's `clientRequestId` when the user acts, and records the time of the action as a claimed field (`actedAt`) alongside the server time the function uses.
- On reconnect it replays the queue in order; a retried call is deduplicated through `idempotencyKeys`.
- The UI shows queued actions as pending, not as done.
- The schema says, per transition, whether it may be queued offline and what the function does when the call arrives after the state has moved on (accept with `actedAt` within a stated window, or reject with a reason the app shows).

### Idempotency container

Callable and https functions with side effects require a `clientRequestId` (or the provider's event id for a webhook). The schema includes the container where the dedup record lives, so Phase 5 does not have to invent one:

```typescript
// Collection: idempotencyKeys, doc id `${callerUid}_${clientRequestId}` (or `${provider}_${eventId}`)
type IdempotencyKey = {
  functionName: string
  callerUid: string | null      // null for webhooks
  outcome: 'applied' | 'rejected'
  resultPath: string | null    // the document the call created or changed; a retry returns it
  errorCode?: string           // the error a rejected call returned, replayed on retry
  createdAt: Timestamp
  expiresAt: Timestamp          // createdAt + the dedup window (at least 1 h, typically 24 h)
}
```

- The owning function writes it in the **same transaction** as the transition; a retry finds it and returns the same outcome without applying anything again.
- Rules deny all client reads and writes.
- A Firestore TTL policy on `expiresAt` deletes expired records. TTL deletion is not immediate, so the function also treats an expired record as absent (check the current Firebase docs for TTL behavior).

## Permissions philosophy checklist

Phase 3 documents the philosophy; `firebase-dev` writes the literal `firestore.rules` in Sprint 1.

- **Tenancy:** single-tenant, multi-tenant (organizations with members) or hybrid.
- **Ownership:** which collections are owned by `request.auth.uid`.
- **Roles:** which roles are custom claims (global, rarely changing: `admin`) and which are membership documents (per tenant or venue, changes apply at once); who writes each (a function or an admin script, never the client); who reads admin-only data. The two models are compared in `architecture.md` in this folder.
- **Public data:** what is readable without auth (usually nothing in the MVP).
- **Field-level security:** write-restricted fields (status, computed totals, ratings).
- **Cross-document constraints:** what rules cannot enforce ("max 5 active bookings") goes to Cloud Functions.
- **Denormalization integrity:** denormalized fields are written by functions, never by clients.

## Query costs: composite indexes

Firestore builds single-field indexes automatically. A query needs a **composite index** when it constrains or orders more than one field, except a query with only equality filters, which Firestore serves by merging single-field indexes. In practice:

- equality on one field plus a range or inequality (`<`, `<=`, `>`, `>=`, `!=`, `not-in`) on another, even with no `orderBy`;
- a filter on one field plus `orderBy` on another;
- `orderBy` on several fields;
- `array-contains` or `array-contains-any` combined with another filter or ordering;
- collection-group queries need their own index with collection-group scope.

Anticipate all of them in Phase 3; a missing index in production makes the query fail with `failed-precondition`. The emulator does not enforce indexes, so list them from this rule (check the current Firestore docs when a query is unusual).

| Query | Where | OrderBy | Index |
|---|---|---|---|
| Customer's recent bookings | `customerId == uid` | `createdAt desc` | `customerId asc, createdAt desc` |
| Provider's pending bookings | `providerId == uid AND status == 'submitted'` | `createdAt asc` | `providerId asc, status asc, createdAt asc` |
| Venue's slots from now on | `venueId == id AND startAt >= now` | none | `venueId asc, startAt asc` |
| Bookings of one court and day | `courtId == id AND date == d` | none | none (equality only) |

They land in `firestore.indexes.json` in Sprint 0.

## Scaling red flags

- **Unbounded growth** with no archive: plan archival (for example to BigQuery after 90 days).
- **Hot documents** (one document, many writers: counters, popular items): distributed counter with N shards.
- **Unbounded subcollections** (a chat with a million messages): pagination and archival from day one.
- **Documents near 1 MB** (large arrays, embedded blobs): split into a separate collection.
- **Write fan-out above 5** per user action: batch or transaction.

## Denormalization

Every denormalized field records what is duplicated, why (the query it speeds up), who keeps it consistent (a named trigger function) and how stale it may be. No justification, no duplication.

## Migration story

- Every document carries `schemaVersion: number`.
- Backfills are scheduled functions that lift documents from vN to vN+1.
- Breaking changes have an explicit plan: dual-write period, cutover gate.
- State how long old app versions keep working with the new schema.

## Stack-specific anti-patterns

- Security rules as an afterthought: such schemas cannot be expressed in rules later.
- A schema in prose with no TypeScript types.
- `Date` instead of `Timestamp`.
- Doc ids containing PII.
- Firestore and RTDB used for the same purpose.
- A transition with two owners, or with none.
- Required idempotency with no container to store it.
- A per-container heading repeated in several sections.

## What Phase 3 does not do here

- Write `firestore.rules` (Sprint 1, `firebase-dev`).
- Write or specify Cloud Functions beyond naming transition owners (Phase 5, then sprints).
- Choose the external search provider (Phase 5).
