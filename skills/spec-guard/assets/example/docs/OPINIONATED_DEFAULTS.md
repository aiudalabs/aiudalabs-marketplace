# Opinionated defaults — Court booking marketplace

**Stack profile:** flutter-firebase

## D-01 — Players pay when the court owner confirms

**Lock:** The card is charged at confirmation, never at request time.

## D-02 — Free cancellation up to 24 hours before

**Lock:** Cancelling earlier than 24 hours refunds in full; later refunds nothing.

## D-03 — Booking states change only on the server

**Lock:** Every booking state transition runs in a Cloud Function, never in the app.

## D-04 — Loyalty points (deferred)

**Lock:** No loyalty program in the MVP.
