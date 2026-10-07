# Stack conventions for the default developer agents

The checks each default developer agent adds to the test gate in the root
`AGENTS.md`, the tests it writes, and what its SUMMARY adds. When the root
`AGENTS.md` lists different commands, the root `AGENTS.md` wins: it is the
project's own gate. Lanes come from `docs/AGENT_ROSTER.md`, never from this page.

## flutter-dev (profile `flutter-firebase`)

**Implementation patterns**
- Design tokens from the shared UI package only. A literal color, size or
  spacing in a widget is a defect.
- Riverpod for state read by more than one widget; `ConsumerWidget` over
  `StatefulWidget`. `StatefulWidget` only for self-contained UI state such as
  an animation controller. `flutter_hooks` only if the codebase already uses it.
- `go_router` for navigation.
- Widgets stay under about 150 lines; extract sub-widgets past that.
- UI and feature packages never import Firebase directly; they go through the
  data package's wrappers and take entity types from the core package, not
  document maps.
- A new dependency in `pubspec.yaml` carries a comment with the reason and the
  alternative rejected.

**Tests**
- Each branch of conditional rendering has a widget test.
- Forms: the valid path and each invalid path.
- State transitions driven through `tester.pumpWidget` and actions.
- Golden tests only for stable screens that match their spec exactly.

**Gate additions**
```bash
melos run analyze
melos run format-check
melos run test
melos exec --scope="<changed-packages>" -- flutter test --coverage
melos exec -- flutter pub deps      # no unexplained new dependencies
```
Global coverage does not go down.

**SUMMARY extras:** screen ids implemented (from `docs/UI_SCREENS.md`).

## firebase-dev (profile `flutter-firebase`)

**Implementation patterns**
- Callable skeleton: input validation, auth check, state-transition
  validation, atomic write, side effects, return.
- Every callable takes a `clientRequestId` and returns the cached response for
  a duplicate within at least 24 hours.
- Firestore transactions for cross-document writes; a function is either
  transactional or not, never half.
- Distributed counters for high-concurrency increments.
- Structured log on every invocation: `clientRequestId`, duration, outcome.
  No free-text `console.log`.
- Custom claims change only through the dedicated function.
- No `any` or `unknown`; data from outside (webhooks) is validated at the
  boundary.
- Environment values come from config or `process.env`, never literals.
- When a document or response shape changes, the shared TypeScript types change
  in the same issue (when they are in `files_touched`).
- Rules and indexes change with the transition or query that needs them.

**Tests**
- Unit tests for pure logic (transition validators, parsers).
- Emulator integration tests: happy path, each acceptance criterion, each
  documented failure mode, idempotency (same `clientRequestId`), auth
  (unauthenticated, wrong role, blocked tenant).
- Rules tests for every changed rule. A failing rules test means the rule is
  wrong; never weaken the test.

**Gate additions**
```bash
pnpm --filter functions lint
pnpm --filter functions typecheck
pnpm --filter functions test
pnpm --filter functions test:rules
firebase emulators:exec --only firestore,functions,auth \
  "pnpm --filter functions test:integration"
```

**SUMMARY extras:** functions changed, rules and index changes, whether the
shared types changed (and so flutter-dev must regenerate the Dart mirror).

## react-dev (admin app in `flutter-firebase`, frontend in `fastapi-react`)

The package filter below is the one in the roster lane: `admin` in
`flutter-firebase`, the frontend app's name in `fastapi-react`.

**Implementation patterns**
- shadcn/ui primitives instead of custom equivalents (Dialog, Table, Form...).
- Tailwind utilities; inline style only for dynamic values such as a progress
  width.
- TanStack Query for all server state, including one-off requests;
  `useState` for local state; `useContext` for auth and theme. No global state
  libraries.
- React Hook Form with Zod for any form of more than one field; types inferred
  from the schema.
- Loading, empty and error states built before the populated state.
- Environment values from `import.meta.env.VITE_*`.
- Protected routes check the role claim (`flutter-firebase`) or the role from
  the API session (`fastapi-react`); the token refreshes when the protected
  layout mounts.
- Labels on fields, accessible names on buttons.

**Tests**
- Component tests for forms with validation, filtered tables and conditional
  rendering.
- Page integration tests with the backend mocked (MSW or Vitest mocks).

**Gate additions**
```bash
pnpm --filter <app> lint
pnpm --filter <app> typecheck
pnpm --filter <app> test
pnpm --filter <app> build
```
No new console warnings in development mode.

**SUMMARY extras:** screen ids implemented, new dependencies, bundle size delta
(an increase over 50 KB needs a reason).

## python-dev (profile `fastapi-react`)

**Implementation patterns**
- Endpoint skeleton: input schema, auth dependency, state and invariant
  validation, one transaction, side effects (outbox or event row), typed
  response.
- Clients never write `status`: each transition is its own endpoint validated
  against the shared `LEGAL_TRANSITIONS`. Create and Update schemas do not
  contain server-only fields.
- An invariant the database can enforce (partial UNIQUE, CHECK) gets the
  constraint; the Python check only shapes the error message.
- Side-effecting client endpoints take a `client_request_id`; worker claims use
  `FOR UPDATE SKIP LOCKED`, with stale timeout and max attempts.
- Every model change ships a reversible Alembic migration, with backfill when
  needed. Code never depends on the old schema after migrating
  (migrate, then deploy).
- Constant-time comparison for shared secrets; secrets never in code or logs.
- A new router without an auth dependency is a defect.
- No `sys.path` or `PYTHONPATH` tricks: the package is installed.
- Dependencies pinned; a new one only when the issue or a person approved it.

**Tests**
- Unit tests for transition validators and parsers.
- Integration with `TestClient` on in-memory SQLite.
- Concurrency tests when the issue touches claims or uniqueness.

**Gate additions**
```bash
python -m pytest -q
alembic upgrade head && alembic downgrade -1 && alembic upgrade head   # when a migration is included
```

**SUMMARY extras:** transitions touched, migrations included, enum changes
react-dev must mirror in the frontend types.
