# Verdict and retro templates

## Approved

```markdown
## Approved — S3-07

**Acceptance criteria:** 3 / 5 met, 1 pending human action, 1 deferred to S3-09
1. Rejects unauthenticated calls — functions/src/callable/createBooking.ts:18; test `createBooking rejects unauthenticated` (ran, pass; red with the auth check removed)
2. Moves requested to confirmed in one transaction — createBooking.ts:41-67; test `createBooking confirms atomically` (ran, pass; red with each comparison mutated, 4/4)
3. Duplicate request returns the cached response — createBooking.ts:24-30; test `createBooking is idempotent on clientRequestId` (ran, pass; red with the cache lookup removed)
4. human: App Check enforced in the console — pending human action: the project owner attaches a screenshot of the enforcement page (approved at the plan gate)
5. Booking confirmation email — deferred by amendment `9f8e7d6` (on develop) to S3-09

**Gate:** the issue's `gate:` list and every command in AGENTS.md run locally, each one ran its script and counted its tests, all pass. (A suite that found no tests is written `ran, 0 tests` and is acceptable only when the issue adds nothing it could test. A command marked `from <id>` is listed as skipped while that issue is unmerged.)
**Lane check:** `spec.mjs verify S3-07` pass, no merge or refs warnings.
**Commits:** all start with the issue id; refs only from the issue's (merges from the base exempt).
**Hard rules:** no violations.

**Suggestions (non-blocking):**
- The validation block could move to a helper shared with `cancelBooking`.

Ready for merge. The issue stays open until criterion 4's attachment exists.
```

## Changes requested

```markdown
## Changes requested — S3-07

**Acceptance criteria not met:**
- Criterion 2: the spec requires denormalizing `provider.acceptedCount` (ARCHITECTURE.md §3 createBooking, side effects); the diff does not touch the provider document. Suggested place: functions/src/callable/createBooking.ts after the status transition, inside the same transaction.
- Criterion 3: met at createBooking.ts:24 but no test exercises a duplicate `clientRequestId`.

**Hard rule violations:**
- AGENTS.md rule 3 forbids client-side state writes; apps/customer/lib/features/booking/booking_repository.dart:42 writes `status: 'cancelled'`. Move it to a callable.

**Lane check:**
- `spec.mjs verify S3-07` fails: packages-ts/types/booking.ts is outside files_touched. Ask the orchestrator to amend the issue, or move the change to a new issue.

**Gate:**
- `pnpm --dir functions run test:integration` fails on `createBooking handles double confirm`.

**Suggestions (non-blocking):**
- The 200-line `processBooking` could be split into helpers for testability.

Re-request review when addressed.
```

## Where the verdict goes

In the issue or PR thread. Without a tracker or PR, in the log path the orchestrator gave (one file per issue and round, such as `../<repo>-wt/reviews/S3-07.md`, the path `sprint-runner` uses), and in the final report when the review runs as a subagent.

## Spec inconsistency note

Add to either verdict when the spec contradicts itself:

```markdown
**Spec inconsistency observed:** UI_SCREENS.md §1.2.3 expects `priceWithTax`; FIREBASE_SCHEMA.md §bookings has no such field. The implementation followed UI_SCREENS, which is reasonable and is not counted against it. This is a governance gap: decide which document changes before the gap spreads.
```

## Sprint retro: `docs/execution/sprint-{N}-retro.md`

```markdown
# Sprint {N} Retro — {theme}

## Goal
{sprint goal from the sprint heading or SPRINT_PROMPTS.md}

## Goal achieved?
{Yes / Partial / No} — {one sentence: can a real user now do what this sprint was meant to enable?}

## Issues closed: {K}/{M}
- {S{N}-01} — merged, approved
- {S{N}-04} — not closed: {reason}

## Technical debt introduced
- {shortcut, where, and which issue should clean it up} — or "None"

## Validation results
- {each gate command}: pass / fail
- spec.mjs check: pass / {errors}

## Recommendation for Sprint {N+1}
{issues to carry over, debt to address, pace changes}
```
