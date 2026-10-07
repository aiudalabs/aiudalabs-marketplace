# flutter-firebase: data layer

Read by the `schema-design` skill (Phase 3). This file carries the Firebase knowledge; the skill carries the method.

## Output document

Phase 3 writes `docs/FIREBASE_SCHEMA.md` (400-700 lines). Profile-specific section names:

1. **Stack confirmation**: Firebase services in use (Firestore, RTDB, Auth, Storage, Functions, Cloud Messaging) and versions.
2. **Top-level collections**: one-line purpose each, one heading per collection so issues can link to `docs/FIREBASE_SCHEMA.md#bookings`.
3. **Document shapes**: TypeScript types for every collection and subcollection.
4. **State machines**: states, transitions and the Cloud Function that owns each.
5. **RTDB usage**: what lives in RTDB and why it is not in Firestore.
6. **Security rules philosophy**: tenancy, owner model, role model, custom claims approach. Not literal rules.
7. **Composite indexes**: every where-plus-orderBy-on-different-fields combination, with the query that needs it.
8. **Scaling concerns**: hot documents, unbounded subcollections, document size risks, write fan-out.
9. **Denormalization decisions**: every duplicated field with rationale.
10. **Migration story**: versioning, backfills, breaking changes.

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
- Server-only fields (private data, internal flags) go in a `private` subcollection, not the public document.
- Subcollections only for data accessed exclusively through the parent. Anything queried across parents ("all bookings of provider X") is a top-level collection with a reference field.

## State-machine enforcement

Clients never write `status`; security rules deny it regardless of role. Every transition goes through a Cloud Function, and the schema names it:

```
- draft → submitted: customer (createBooking)
- submitted → accepted: provider (acceptBooking)
- disputed → resolved: admin only (resolveDispute)
Forbidden: completed → anything (terminal); any client write to status
```

## Permissions philosophy checklist

Phase 3 documents the philosophy; `firebase-dev` writes the literal `firestore.rules` in Sprint 1.

- **Tenancy:** single-tenant, multi-tenant (organizations with members) or hybrid.
- **Ownership:** which collections are owned by `request.auth.uid`.
- **Roles:** how custom claims are populated, who reads admin-only data.
- **Public data:** what is readable without auth (usually nothing in the MVP).
- **Field-level security:** write-restricted fields (status, computed totals, ratings).
- **Cross-document constraints:** what rules cannot enforce ("max 5 active bookings") goes to Cloud Functions.
- **Denormalization integrity:** denormalized fields are written by functions, never by clients.

## Query costs: composite indexes

Firestore needs a composite index for every query with `where` on one field and `orderBy` on another. Anticipate all of them in Phase 3; a missing index in production makes functions throw `failed-precondition`.

| Query | Where | OrderBy | Index |
|---|---|---|---|
| Customer's recent bookings | `customerId == uid` | `createdAt desc` | `customerId asc, createdAt desc` |
| Provider's pending bookings | `providerId == uid AND status == 'submitted'` | `createdAt asc` | `providerId asc, status asc, createdAt asc` |

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

## What Phase 3 does not do here

- Write `firestore.rules` (Sprint 1, `firebase-dev`).
- Write or specify Cloud Functions beyond naming transition owners (Phase 5, then sprints).
- Choose the external search provider (Phase 5).
