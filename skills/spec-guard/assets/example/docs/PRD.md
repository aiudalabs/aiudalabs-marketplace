# PRD — Court booking marketplace

## Functional requirements

### FR-BOOKING-1 — A player requests a court for a time slot

- Given a free slot, when the player requests it, then the booking is `requested`.

### FR-BOOKING-2 — The owner confirms and the player is charged

- Given a `requested` booking, when the owner confirms, then it is `confirmed` and the card is charged once.

### FR-BOOKING-3 — The player cancels a booking

- Given a `confirmed` booking more than 24 hours ahead, when the player cancels, then it is refunded in full.
