---
name: ui-screens-spec
description: "Specifies every screen of every app in text before anything is built, writing UI_SCREENS.md: numbered screen ids (X.Y.Z), six fixed blocks per screen (header, body, primary CTA, navigation, data, permissions) with empty, loading and error states, a navigation graph per app, locked design tokens and tap targets per app context, a reusable component inventory, [COPY] placeholders, and the five key screens per app chosen for mockups. Use when the user says 'diseñemos las pantallas', 'qué pantallas necesito', 'wireframes en texto', 'screen spec' or 'componentes reutilizables', or as Phase 4 after the schema is approved. It needs the brief, the decisions and the schema document. It writes specs, not visuals: clickable HTML mockups of the key screens are navegable-mockups, which reads this document."
license: MIT
metadata:
  version: "1.1.0"
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
- The user wants a brand palette or a token file for its own sake. That is `color-system` or `design-tokens`, if installed; when their output already exists, this skill uses its values instead of inventing new ones. Neither is needed here: Step 2 locks the tokens this spec needs.
- The user is iterating on screens of a live product. Edit the existing `UI_SCREENS.md` section by section instead.

## Inputs

- `docs/PRODUCT_BRIEF.md`: apps (their ids are used verbatim), user groups, personas, value loop.
- `docs/OPINIONATED_DEFAULTS.md`: platforms, languages, market context, the stack profile (`**Stack profile:**` line).
- `docs/PRD.md` when it exists: user stories (`US-<n>`) and FR ids. Every user story is realized by at least one screen.
- The schema document (`docs/FIREBASE_SCHEMA.md` or `docs/DATA_SCHEMA.md`, per the profile): state machines, shapes, the data available, and the table of server-side units that write.
- Any palette, token file or design-system document **for this product** already in the project (a tokens file, the output of `visual-directions` or `design-tokens`, if installed). Not `docs/AIUDA_HOUSE_STYLE.md` or any other copy of the Aiuda Labs house style: it styles the generated spec page only (`html-spec-generator`), never the product.
- `mockups/STORY.md` when it exists: the example story (people, places, codes, dates, amounts) the mockups use.

If the brief, the decisions or the schema is missing, ask and stop.

## What it produces: `docs/UI_SCREENS.md`

In English; the conversation stays in Spanish. Typically 35-45 lines per screen plus 300-400 lines of tokens, components and navigation graphs: about 2,000 lines for three apps with 50 screens. The size is guidance: completeness wins over the budget. To keep it readable, a block may be one bullet (`- **Data:** reads ..., writes ...`), but no screen loses a block or a state to fit.

The headings are fixed:

```markdown
# UI Screens — {project title}

## 1. Apps inventory
## 2. Design tokens
## 3. Component vocabulary
## App 1 — {app-id}
### Navigation graph — {app-id}
<a id="s-1.0"></a>
### 1.0 — Splash
<a id="s-1.1.1"></a>
### 1.1.1 — Phone sign-in
...
## App 2 — {app-id}
...
## Key screens
## Cross-check
## Open questions
```

1. **Apps inventory**: each app with platform, primary user and tap-target convention, then the example story (Step 8).
2. **Design tokens**: color seed and roles (status roles included), the status-to-color map, neutrals, type system, spacing, radius, elevation, tap targets per app (Step 2).
3. **Component vocabulary**: reusable components with variants.
4. **One `## App X — {app-id}` section per app**: its navigation graph (with its global navigation), then its screen specs in numbered order. `X` is the app's number in the screen ids, and `{app-id}` is the app id exactly as the brief writes it.
5. **Key screens**: five per app, picked for the mockups, with a reason and a mockup back-link each.
6. **Cross-check**: the Step 10 tables, including user story → screens.
7. **Open questions**: `[SUPUESTO]` items, and writes or data that need a unit from Phase 5.

Microcopy is not a section: every user-facing string is marked inline with `[COPY: ...]` (Step 8).

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

Every screen references tokens, never raw values. If the project already has a palette, token file or design-system document for this product, take its values.

The Aiuda Labs house style is not the product's identity. `docs/AIUDA_HOUSE_STYLE.md` (the kickstart's "Aiuda Labs look") and any other copy of it style the generated spec page only: ignore them here, and use them for the product only when the user names the Aiuda Labs brand as the product's identity in answer to the question below.

**When none exists, ask; never invent the identity silently.** It is the user's product. In one message, offer:

- running `visual-directions`, if installed, to explore two or three directions first;
- or giving their brand colors and fonts, if they have them;
- or approving one direction you propose: the seed color and two supporting colors with a one-line reason each, the fonts, light or dark, and the feel in plain words ("deportivo y cálido, verde cancha").

Wait for the answer, then lock the tokens below and list the identity first in the gate.

- **Color seed and roles**: one hex value that generates the role palette (Material 3 `fromSeed` for Flutter apps; the same roles mapped to CSS variables for web). Document the seed and every role the screens use: primary, on-primary, secondary, surface, surface variants, on-surface, outline, and the status roles **success, warning, error and info**, each with its `on-` pair. Say which roles come from the seed and which are set by hand as overrides.
- **Status-to-color map**: a table from every status of every state machine in the schema (`held`, `confirmed`, `cancelled`, `refunded`...) to a role and a label. Badges and banners use it; no screen picks a status color on its own.
- **Type system**: three fonts at most, by role. For example Display and Headline: Fraunces 400-700; Body and Label: DM Sans 400, 500; Mono (timers, codes): DM Mono 400. The scale is shared; only the rendering size shifts per app (the kitchen display renders larger). **One token per role**: each kind of content (the countdown, booking codes, prices in tables) names exactly one type token and one color role, in the type table and in every component; never "display or mono".
- **Spacing**: 4-point grid, `xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48`. No off-grid values.
- **Radius**: `small=8, medium=12, large=16, full=999`. Nothing in between.
- **Elevation**: a named scale (`e0` flat, `e1` cards, `e2` sheets and menus, `e3` dialogs) with the shadow or Material elevation value of each. Screens name the level, never a shadow.
- **Tap targets**: per app, from Step 1.

### Step 3: Component vocabulary

For each reusable component: **name** in PascalCase (matching the eventual widget or component), **purpose** in one sentence, **variants**, and the **tokens** it consumes, one per role (a variant that needs another token is its own variant, named).

```
ResultsCard
  Purpose: shows a search result with image, title, subtitle, badge and CTA
  Variants: compact (list), expanded (detail), with-image / no-image
  Tokens: surface-secondary fill, on-surface text, primary CTA, radius-medium
```

Aim for 10-20 components. More than 20 means a fragmented system; fewer than 10 means screens will reinvent patterns.

### Step 4: Number screens hierarchically

`X.Y.Z`: **X** is the app (1 customer, 2 provider, 3 admin...), **Y** the section or flow, **Z** the screen.

A bottom sheet, dialog or picker is a screen when it has its own content or more than a confirm and a cancel (a cancellation sheet with the refund terms, a zone picker): it gets an id and the six blocks, and issues and mockups can cite it. A bare "¿Seguro? Sí / No" confirmation is described inside its parent screen's Primary CTA block instead.

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
<a id="s-1.2.3"></a>
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
  - Bottom tab bar (global, see the navigation graph): visible, active = "Buscar"

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

Every screen has the six blocks. When one is empty, say so; never drop the heading. Data names containers and fields exactly as the schema document does, and lists the FR ids the screen serves. Every write names the server-side unit that performs it, from the schema's server-writes table (`Writes: checkouts.method via startPayment`); a client never writes a status directly. A write the schema lets the client make itself names that table instead: `Writes: users.fcmTokens direct (schema: Direct client writes)`. Nothing else is written `direct`.

**Anchors.** Every screen heading is preceded by `<a id="s-<screen-id>"></a>`, as in the example. Markdown renderers slug `### 1.2.3 — Search results` into something like `#123--search-results`, so without the explicit anchor every link from the backlog is dead. With it, `docs/UI_SCREENS.md#s-1.2.3` works on GitHub, and the id matches the mockup's `#s-1.2.3`.

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

**Global navigation, once per app.** A tab bar, sidebar or top nav that persists across screens is specified once, at the top of the app's graph: each entry's label, target screen and the screens that show it. Its edges are part of the graph (they count as inbound edges for the check below); a screen's Navigation block only says whether it shows the bar and which entry is active.

```
Tab bar — shown on 1.2.1, 1.5.1, 1.6.1
  Buscar   → Home (1.2.1)
  Reservas → Bookings (1.5.1)
  Perfil   → Profile (1.6.1)
```

Every screen except the app's entry points has an inbound edge; every screen except terminal ones (a post-booking "thank you") has an outbound edge. Entry points are listed at the top of the graph: the splash of a mobile app; for a web app, the sign-in page and any page reached by a link from outside (an email, a notification).

### Step 7: Empty, loading and error states

Mandatory for every screen with data:

- **Empty**: nothing exists or a filter excluded everything. A friendly message and a CTA to recover.
- **Loading**: skeletons that match the loaded layout (6 skeletons if 6 cards are expected), not a generic spinner.
- **Error**: an ErrorBanner with retry when recoverable; a support contact when not.

A missing state is a Phase 4 bug: the UI agents will invent it, differently on each screen.

### Step 8: Microcopy placeholders

Mark all user-facing text `[COPY: "draft"]`. Final copy depends on tone, voice and tests that have not happened; drafts are enough for mockups and development. Each draft reads right in every state the screen shows it in (a payment label shown during the match does not say "not played yet").

**Example data is one story.** Every example value in a screen (people, places, codes, dates, amounts) comes from one story shared by all apps, written as a short table at the end of section 1: the same booking has the same code, venue, date and amount in the customer, provider and admin screens, and its amounts add up (price, commission, net). Distinct records get distinct values: a cancelled booking, a refund adjustment and tonight's booking each have their own code, never one code reused across states. When `mockups/STORY.md` exists, take its values; `navegable-mockups` builds every app from the same story.

### Step 9: Five key screens per app

Pick the five screens per app that become clickable mockups in Phase 7:

1. Together they cover the core loop end to end: a stakeholder can walk the value proposition without explanation.
2. They include the signature screen, the one that shows the app's personality.
3. They include at least one hard screen: data-dense, unusual, or the most likely to be misunderstood.
4. They include one list view and one detail view.
5. They exclude auth and settings, which rarely need visual validation.

List the picks with one sentence of rationale each, and give each its **mockup back-link**: `mockup: mockups/<app-id>.html#s-<screen-id>`, where `<app-id>` is the app id exactly as the brief writes it. Screen `1.2.1` of `player-app` → `mockup: mockups/player-app.html#s-1.2.1`; screen `3.1.2` of `admin-dashboard` → `mockup: mockups/admin-dashboard.html#s-3.1.2`. `navegable-mockups` uses this convention (one file per app, an element with `id="s-<screen-id>"` per screen, opened from the URL hash), and governance copies the link into each UI issue's `reads:`, so the build agent opens the mockup instead of building blind. Only key screens have mockups: an issue cites a mockup anchor only for a key screen, and cites the `docs/UI_SCREENS.md#s-<screen-id>` anchor for every screen.

### Step 10: Cross-check before closing

- Every state machine in the schema has a screen that drives or displays each transition (system-only transitions are displayed, not driven).
- Every container in the schema is read by at least one screen, or is server-internal.
- Every PRD user story is realized by at least one screen: a table `US-<n>` → screen ids, with no story left without one.
- **Every write a screen makes has an owner**: a unit in the schema's server-writes table, or a row of its Direct client writes table (`direct (schema: Direct client writes)`). A write with no owner (starting a payment, emailing a statement) is marked `[SUPUESTO] needs a server unit (Phase 5)`, listed under Open questions and raised at the gate; never invent the unit's contract here.
- Every screen has all six blocks and its `<a id="s-<screen-id>">` anchor; every screen with data has empty, loading and error.
- Every app has exactly five key screens, each with a mockup back-link.
- The navigation graph is connected, and each app's global navigation (tab bar, sidebar) is specified once in its graph.
- The example data follows the one story: the same record has the same values in every app, and distinct records have distinct codes.
- All copy is marked `[COPY: ...]`; no hex value or raw size appears in a screen spec.

Write the tables in the Cross-check section. When a check fails, show it and ask.

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

Run the `spec-guard` check from the project root: `node tools/spec-guard/spec.mjs check`, or the same `scripts/spec.mjs` from the `spec-guard` skill's folder when the project has no `tools/spec-guard/` yet. It works before a backlog exists and checks the decisions, the PRD and the roster on disk; fix any error before closing. If it stops with "no backlog at docs/ISSUES.md", the project's copy is older than the `spec-guard` skill: re-run its installer (`node <spec-guard skill folder>/scripts/install.mjs`, safe to repeat) and check again.

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
| 4 | ui-screens-spec | done |
| 5 | system-architecture | pending |
| 6 | multi-agent-governance | pending |
| 7 | navegable-mockups | pending |

## Last phase: 4 — ui-screens-spec

- 3 to 5 bullets: what was decided that the next phase must know.

## Open questions

- Items marked [SUPUESTO] or deferred to a later phase, or "None".

## Next

Phase 5 — system-architecture.
```

Write each phase's State as it really is.

Close with:

> Fase 4 cerrada. {N} pantallas en {M} apps, {K} componentes reutilizables, identidad visual y tokens locked, cinco pantallas clave por app elegidas para los mockups, {W} escrituras sin unidad pendientes para la Fase 5. La siguiente fase (`system-architecture`) usa este spec para decidir qué unidades del servidor existen. Si quieres revisar una pantalla, hazlo ahora.

Under `product-spec-orchestrator`, its phase gate replaces this closing message: one gate that carries these counts plus its "Decisiones tomadas en Fase 4 que vale la pena verificar" bullets, with the visual identity first.

Wait for explicit approval. `system-architecture` consumes the component vocabulary (the shared UI package boundary), the data blocks (which server units are client-invoked and which are triggered), the writes flagged for Phase 5, pagination conventions (query patterns) and realtime listeners. `navegable-mockups` needs only this document, so the mockups may be built right after this phase if the user wants to see screens before locking the architecture; if this document changes later, the mockups are refreshed.

## What this skill does not do

- Write Flutter or React code (sprints).
- Produce HTML mockups (`navegable-mockups`).
- Pick an icon library, a maps provider or a geocoding provider (`system-architecture`).
- Design illustrations or brand assets.
- Write final copy.
- Run a full WCAG audit. Tap targets and basic contrast are covered; a full accessibility audit is separate.
