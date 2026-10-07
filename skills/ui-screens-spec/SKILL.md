---
name: ui-screens-spec
description: "Specifies every screen of every app in text before anything is built, writing UI_SCREENS.md: numbered screen ids (X.Y.Z), six fixed blocks per screen (header, body, primary CTA, navigation, data, permissions) with empty, loading and error states, a navigation graph per app, locked design tokens and tap targets per app context, a reusable component inventory, [COPY] placeholders, and the five key screens per app chosen for mockups. Use when the user says 'diseñemos las pantallas', 'qué pantallas necesito', 'wireframes en texto', 'screen spec' or 'componentes reutilizables', or as Phase 4 after the schema is approved. It needs the brief, the decisions and the schema document. It writes specs, not visuals: clickable HTML mockups of the key screens are navegable-mockups, which reads this document."
license: MIT
metadata:
  version: "1.0.0"
  author: aiudalabs
---

# UI Screens Spec

Specify every screen of every app in text, precisely enough that a developer, human or agent, can build the UI without asking. Phase 4 of the product-spec workflow (1 discovery, 2 requirements, 3 schema, 4 UI, 5 architecture, 6 governance, 7 mockups).

This is not where pixels are designed. It locks the **screen inventory, navigation graph, design tokens and component vocabulary**, so the mockups (Phase 7) and the UI sprints share one source of truth.

## When to use it, and when not

Use it for "diseñemos las pantallas", "qué pantallas necesito", "UI screens", "screen spec", "wireframes en texto", "componentes reutilizables", "design tokens" in the context of a product spec, and as Phase 4 after the schema is approved.

Do not use it when:

- Phases 1-3 are not done (no brief, decisions or schema document). Ask for them first.
- The user wants clickable HTML mockups. That is `navegable-mockups`, Phase 7, which reads this document.
- The user wants high-fidelity visual design, illustrations or icon design. That is a designer's job.
- The user wants a brand palette or a token file for its own sake. Use `color-system` or `design-tokens`; when they already exist, this skill uses their values instead of inventing new ones.
- The user is iterating on screens of a live product. Edit the existing `UI_SCREENS.md` section by section instead.

## Inputs

- `docs/PRODUCT_BRIEF.md`: apps, personas, value loop.
- `docs/OPINIONATED_DEFAULTS.md`: platforms, languages, market context, the stack profile (`**Stack profile:**` line).
- `docs/PRD.md` when it exists: user stories and FR ids. Every user story is realized by at least one screen.
- The schema document (`docs/FIREBASE_SCHEMA.md` or `docs/DATA_SCHEMA.md`, per the profile): state machines, shapes, the data available.

If the brief, the decisions or the schema is missing, ask and stop.

## What it produces: `docs/UI_SCREENS.md`

500-900 lines depending on app count, in English; the conversation stays in Spanish.

1. **Apps inventory**: each app with platform, primary user and tap-target convention.
2. **Design tokens**: color seed, neutrals, type system, spacing, radius, shadows, tap targets per app.
3. **Component vocabulary**: reusable components with variants.
4. **Per app**: the navigation graph and the screen specs, in numbered hierarchy.
5. **Five key screens per app**, picked for the mockups, with a reason and a mockup back-link each.
6. **Microcopy placeholders**, marked `[COPY: ...]` for a later copy pass.

## The method

### Step 1: Apps inventory and context

| App | Platform | Primary user | Context | Tap target |
|---|---|---|---|---|
| customer-app | iOS + Android | Customer at home or commuting | One-handed mobile use | 48dp |
| provider-app | iOS + Android | Provider on the job | Often gloved or distracted | 56dp |
| kitchen-display | Android tablet, fixed | Kitchen worker, gloved | Big buttons, glanceable | 64dp |
| admin-dashboard | Web | Admin at a desk | Mouse and keyboard | 44px |

Tap targets are **non-negotiable per context**. Gloved kitchen staff cannot hit 48dp; desk admins do not need 64dp. The token set is per app, not global. Platforms come from the brief and the stack profile (with `flutter-firebase`, mobile apps are Flutter and the admin is React; with `fastapi-react`, apps are React on the web).

### Step 2: Design tokens, locked once

Every screen references tokens, never raw values. If the project already has a palette or token file, take its values.

- **Color seed**: one hex value that generates the role palette (Material 3 for Flutter apps; the same roles mapped to CSS variables for web). Document the seed and the roles: primary, on-primary, surface, on-surface, error...
- **Type system**: three fonts at most, by role. For example Display and Headline: Fraunces 400-700; Body and Label: DM Sans 400, 500; Mono (timers, codes): DM Mono 400. The scale is shared; only the rendering size shifts per app (the kitchen display renders larger).
- **Spacing**: 4-point grid, `xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48`. No off-grid values.
- **Radius**: `small=8, medium=12, large=16, full=999`. Nothing in between.
- **Tap targets**: per app, from Step 1.

### Step 3: Component vocabulary

For each reusable component: **name** in PascalCase (matching the eventual widget or component), **purpose** in one sentence, **variants**, and the **tokens** it consumes.

```
ResultsCard
  Purpose: shows a search result with image, title, subtitle, badge and CTA
  Variants: compact (list), expanded (detail), with-image / no-image
  Tokens: surface-secondary fill, on-surface text, primary CTA, radius-medium
```

Aim for 10-20 components. More than 20 means a fragmented system; fewer than 10 means screens will reinvent patterns.

### Step 4: Number screens hierarchically

`X.Y.Z`: **X** is the app (1 customer, 2 provider, 3 admin...), **Y** the section or flow, **Z** the screen.

```
1.0   Splash
1.1.x Auth (1.1.1 phone, 1.1.2 OTP, 1.1.3 profile setup)
1.2.x Home and discovery (1.2.1 home, 1.2.2 search, 1.2.3 results, 1.2.4 filters)
1.3.x Provider detail and booking (1.3.1 detail, 1.3.2 reviews, 1.3.3 quote, 1.3.4 confirm)
1.4.x Inbox and chat
1.5.x Bookings (1.5.1 list, 1.5.2 detail, 1.5.3 in progress, 1.5.4 completed)
1.6.x Profile and settings
```

The numbering is load-bearing: backlog issues cite screens by id, and the mockups use the id as the anchor.

### Step 5: Per-screen spec, six fixed blocks

```
### 1.2.3 — Search results

Header
  - Title: [COPY: "Resultados"]
  - Trailing action: filter icon (opens 1.2.4)

Body
  - List of ResultsCard (compact)
  - Empty: [COPY: "No encontramos proveedores cerca"] + CTA "Cambiar zona" → 1.2.2
  - Loading: 6 ResultsCard skeletons
  - Error: ErrorBanner with retry

Primary CTA
  - None at screen level; each ResultsCard has "Ver detalle" → 1.3.1

Navigation
  - Back: 1.2.2
  - Bottom tab bar: visible, active = "Buscar"

Data
  - Reads: providers (filtered by zone and category), denormalized rating fields
  - Listens to: nothing (one-shot query)
  - Writes: none
  - Pagination: 20 per page, infinite scroll
  - Serves: FR-SEARCH-1, FR-SEARCH-2

Permissions
  - Auth required: yes (phone verified)
  - Role: customer
```

Every screen has the six blocks. When one is empty, say so; never drop the heading. Data names containers and fields exactly as the schema document does, and lists the FR ids the screen serves.

### Step 6: Navigation graph per app

```
Splash (1.0)
  → Auth (1.1.x) [not authenticated]
  → Home (1.2.1) [authenticated]
Home (1.2.1)
  → Search (1.2.2) — search action
  → Bookings (1.5.1) — tab
Results (1.2.3)
  → Provider detail (1.3.1) — card tap
  → Filters (1.2.4) — filter icon
```

Every screen except the splash has an inbound edge; every screen except terminal ones (a post-booking "thank you") has an outbound edge.

### Step 7: Empty, loading and error states

Mandatory for every screen with data:

- **Empty**: nothing exists or a filter excluded everything. A friendly message and a CTA to recover.
- **Loading**: skeletons that match the loaded layout (6 skeletons if 6 cards are expected), not a generic spinner.
- **Error**: an ErrorBanner with retry when recoverable; a support contact when not.

A missing state is a Phase 4 bug: the UI agents will invent it, differently on each screen.

### Step 8: Microcopy placeholders

Mark all user-facing text `[COPY: "draft"]`. Final copy depends on tone, voice and tests that have not happened; drafts are enough for mockups and development.

### Step 9: Five key screens per app

Pick the five screens per app that become clickable mockups in Phase 7:

1. Together they cover the core loop end to end: a stakeholder can walk the value proposition without explanation.
2. They include the signature screen, the one that shows the app's personality.
3. They include at least one hard screen: data-dense, unusual, or the most likely to be misunderstood.
4. They include one list view and one detail view.
5. They exclude auth and settings, which rarely need visual validation.

List the picks with one sentence of rationale each, and give each its **mockup back-link**: `mockup: mockups/{app}-app.html#s-{id}` (screen `1.2.1` of customer-app → `mockup: mockups/customer-app.html#s-1.2.1`). `navegable-mockups` uses this convention (one file per app, a `<div id="s-{id}">` per screen), and governance copies the link into each UI issue's `reads:`, so the build agent opens the mockup instead of building blind. Without the back-link the mockups are generated and never consulted.

### Step 10: Cross-check before closing

- Every state machine in the schema has a screen that drives or displays each transition.
- Every container in the schema is read by at least one screen, or is server-internal.
- Every PRD user story is realized by at least one screen.
- Every screen has all six blocks; every screen with data has empty, loading and error.
- Every app has exactly five key screens, each with a mockup back-link.
- The navigation graph is connected.
- All copy is marked `[COPY: ...]`.

When a check fails, show it and ask.

## Anti-patterns

- **Pixel coordinates.** "12px from the top" is not Phase 4's job. Use tokens (`md`, `lg`) and layout intent.
- **Hardcoded colors or sizes.** A hex value in a screen spec is a leak. Reference `primary`.
- **Missing states.** A screen without empty, loading and error is incomplete.
- **Final copy now.** It changes after research and tests. Use placeholders.
- **Reinventing components.** Two screens that need a card with image and CTA use one component twice.
- **One tap-target size for every app.**
- **Missing data block.** Without it, schema and screens drift apart.
- **Five easy key screens.** The hard screen must be in the five, or the mockups reveal nothing.
- **Mixing platforms in one block.** A Flutter app for iOS and Android shares one spec; a web admin has its own. Do not mix Material and Cupertino in one screen.

## Communication

Spanish in the conversation, English in the document. Be pictorial when words fail ("a dark card with a gradient avatar on the left and the price on the right"). Always use tokens. Avoid praise words ("clean", "modern", "intuitive"): they mean nothing to the agent that builds it. Cite the brief and the schema in rationales ("the `disputed` booking state needs 1.5.4 for the customer side").

## Gate and handoff

Overwrite the phase table in `docs/SESSION.md`: Phase 4 (`ui-screens-spec`) complete, next `system-architecture`, with 3-5 bullets on what was locked.

Close with:

> Fase 4 cerrada. {N} pantallas en {M} apps, {K} componentes reutilizables, tokens locked y cinco pantallas clave por app elegidas para los mockups. La siguiente fase (`system-architecture`) usa este spec para decidir qué unidades del servidor existen. Si quieres revisar una pantalla, hazlo ahora.

Wait for explicit approval. `system-architecture` consumes the component vocabulary (the shared UI package boundary), the data blocks (which server units are client-invoked and which are triggered), pagination conventions (query patterns) and realtime listeners. Mockups can be produced early with `navegable-mockups` if the user wants to see screens before locking the architecture; they are still Phase 7 of the workflow.

## What this skill does not do

- Write Flutter or React code (sprints).
- Produce HTML mockups (`navegable-mockups`).
- Pick an icon library, a maps provider or a geocoding provider (`system-architecture`).
- Design illustrations or brand assets.
- Write final copy.
- Run a full WCAG audit. Tap targets and basic contrast are covered; a full accessibility audit is separate.
