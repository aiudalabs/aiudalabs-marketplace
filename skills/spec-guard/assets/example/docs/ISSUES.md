# Issues — Court booking marketplace

# Sprint 1 — Schema and rules

## S1-01 — Booking types and security rules
---
id: S1-01
sprint: 1
wave: 1
owner: firebase-dev
files_touched:
  - packages-ts/types/booking.ts
  - firestore.rules
depends_on: []
decision_refs: [D-03]
requirement_refs: [FR-BOOKING-1]
commit_strategy: atomic
autonomous: true
---
**Objetivo:** Las reservas tienen una forma única y nadie las escribe desde la app.

### Acceptance criteria
1. `Booking` type has `status` in `requested | confirmed | cancelled`.
2. Rules deny every client write to `bookings`.

## S1-02 — Court list screen
---
id: S1-02
sprint: 1
wave: 1
owner: flutter-dev
files_touched:
  - apps/player/lib/courts/court_list.dart
depends_on: []
decision_refs: []
requirement_refs: [FR-BOOKING-1]
---
**Objetivo:** El jugador ve las canchas disponibles.

### Acceptance criteria
1. Shows the courts with their free slots for today.

# Sprint 2 — Booking flow

## S2-01 — requestBooking callable
---
id: S2-01
sprint: 2
wave: 1
owner: firebase-dev
files_touched:
  - functions/src/callable/requestBooking.ts
  - functions/test/requestBooking.test.ts
depends_on: [S1-01]
decision_refs: [D-03]
requirement_refs: [FR-BOOKING-1]
---
**Objetivo:** El jugador pide una cancha y la reserva queda pendiente.

### Acceptance criteria
1. Creates a `requested` booking for a free slot.
2. Rejects a slot that is already taken.

## S2-02 — confirmBooking callable with payment
---
id: S2-02
sprint: 2
wave: 2
owner: firebase-dev
files_touched:
  - functions/src/callable/confirmBooking.ts
  - functions/test/confirmBooking.test.ts
depends_on: [S2-01]
decision_refs: [D-01, D-03]
requirement_refs: [FR-BOOKING-2]
autonomous: false
---
**Objetivo:** El dueño confirma y el cobro ocurre en ese mismo paso.

### Acceptance criteria
1. Moves `requested` to `confirmed` in one transaction.
2. Charges the card exactly once, even when retried.

## S2-03 — cancelBooking callable
---
id: S2-03
sprint: 2
wave: 2
owner: firebase-dev
files_touched:
  - functions/src/callable/cancelBooking.ts
  - functions/test/cancelBooking.test.ts
depends_on: [S2-01]
decision_refs: [D-02, D-03]
requirement_refs: [FR-BOOKING-3]
---
**Objetivo:** El jugador cancela con reembolso si faltan más de 24 horas.

### Acceptance criteria
1. Refunds in full more than 24 hours ahead, nothing later.

## S2-04 — Booking screen
---
id: S2-04
sprint: 2
wave: 2
owner: flutter-dev
files_touched:
  - apps/player/lib/booking/**
depends_on: [S1-02, S2-01]
decision_refs: []
requirement_refs: [FR-BOOKING-1, FR-BOOKING-3]
---
**Objetivo:** El jugador reserva y cancela desde la app.

### Acceptance criteria
1. Requests a slot through `requestBooking` and shows the pending state.
2. Cancels through `cancelBooking`.
