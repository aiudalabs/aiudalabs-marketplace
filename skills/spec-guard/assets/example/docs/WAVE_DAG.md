# Wave DAG

_Written by `spec.mjs waves --write` from docs/ISSUES.md. Do not edit by hand._

## Sprint 1 — Schema and rules

### Wave 1

| Issue | Owner | Depends on | Files |
| --- | --- | --- | --- |
| S1-01 Booking types and security rules | firebase-dev | - | `packages-ts/types/booking.ts`, `firestore.rules` |
| S1-02 Court list screen | flutter-dev | - | `apps/player/lib/courts/court_list.dart` |

## Sprint 2 — Booking flow

### Wave 1

| Issue | Owner | Depends on | Files |
| --- | --- | --- | --- |
| S2-01 requestBooking callable | firebase-dev | S1-01 | `functions/src/callable/requestBooking.ts`, `functions/test/requestBooking.test.ts` |

### Wave 2

| Issue | Owner | Depends on | Files |
| --- | --- | --- | --- |
| S2-02 confirmBooking callable with payment | firebase-dev | S2-01 | `functions/src/callable/confirmBooking.ts`, `functions/test/confirmBooking.test.ts` |
| S2-03 cancelBooking callable | firebase-dev | S2-01 | `functions/src/callable/cancelBooking.ts`, `functions/test/cancelBooking.test.ts` |
| S2-04 Booking screen | flutter-dev | S1-02, S2-01 | `apps/player/lib/booking/**` |
