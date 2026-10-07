---
name: navegable-mockups
description: "Builds clickable HTML mockups of a product's key app screens: one standalone file per app, with a phone frame (or a desktop web frame with sidebar for web apps such as an admin dashboard), a neutral review toolbar with a screen selector, deep links to each screen, working navigation between screens, the product's own locked design tokens and realistic market data, openable by double-click with no server or dependencies. Use for 'mockups navegables', 'prototipo HTML', 'hagamos los mockups', 'quiero enseñar las pantallas al equipo o a inversores', or as Phase 7 of the product-spec workflow, which can run as soon as the key screens are picked in docs/UI_SCREENS.md. Not for specifying screens (use `ui-screens-spec`), exploring brand looks or style options (use `visual-directions`), or app code."
license: MIT
metadata:
  version: "1.1.0"
  author: aiudalabs
  requires: ui-screens-spec
---

# Navegable Mockups

Turn the key screens of `docs/UI_SCREENS.md` into HTML a founder can email. No server, no framework, no install: the recipient double-clicks the file and clicks through the app. That portability is the point of this phase.

The mockups show **the client's product**, in the product's own design tokens. They are a visual contract for stakeholder validation and pilot feedback before code is written, not the code of the app and not a place to explore new looks.

## When to use it

- The user asks for clickable mockups, an HTML prototype, a demo of the screens for the team, investors or pilot users.
- Phase 7 of the product-spec workflow, **only if the user opts in**. Not every project needs mockups.

It depends only on an approved `docs/UI_SCREENS.md` with key screens and locked tokens. It may run right after Phase 4, in parallel with Phases 5 and 6, when the user wants to see the screens early. `spec.mjs status` reports Phase 7 on its own, so an early run does not close the phases between. When a later phase changes `UI_SCREENS.md` (a coherence fix, a renamed screen), run this skill again for the affected screens.

Stop and redirect when:

- `docs/UI_SCREENS.md` does not exist, is not approved, or has no key screens picked per app: go back to the `ui-screens-spec` skill.
- The screens spec has no locked tokens (color seed, type system, radius, spacing): go back to `ui-screens-spec` to lock them. Do not invent a palette here.
- The user wants several visual options to choose from: that is the `visual-directions` skill if installed; otherwise say that choosing a look belongs in `ui-screens-spec` Step 2. This skill applies one locked set of tokens.
- The user wants high-fidelity Figma or production app code: out of scope.

## Inputs

| File | What it gives |
| --- | --- |
| `docs/UI_SCREENS.md` | Apps, key screens per app (ids, titles, the reason each was picked), screen specs, navigation graph, locked tokens, per-app adjustments, component vocabulary, display formats (money, dates, times), microcopy placeholders |
| `docs/OPINIONATED_DEFAULTS.md` | Market, language, currency, any locked brand color |
| `docs/PRODUCT_BRIEF.md` | Product name, app ids, personas (used in the example data) |

If the product has its own design system or token file (for example a `tokens.json` from the `design-tokens` skill, if installed), it wins over anything restated in prose.

## Output

One HTML file per app: `mockups/<app-id>.html`, where `<app-id>` is the app id exactly as the brief and `UI_SCREENS.md` name it (`player-app` → `mockups/player-app.html`, `admin-dashboard` → `mockups/admin-dashboard.html`). Nothing is added to or removed from the id. Each screen is a `<div class="screen" id="s-<screen-id>">`, and the file opens the screen named in the URL hash, so `mockups/player-app.html#s-1.3.1` lands on screen 1.3.1. That is the link `UI_SCREENS.md` and the backlog issues cite for key screens. When more than one app is mocked, `mockups/STORY.md` holds the story they share (Step 7).

Each file holds all the key screens of its app and works offline except for the web fonts. Start every file from [references/skeleton.md](references/skeleton.md): the shared head and toolbar, a phone frame and a web frame, and the one script that handles the hash, the tab bar, inner scrolling, in-screen tabs and choices, overflow menus and links to screens outside the key set.

## Method

### 1. Fix the scope

From `UI_SCREENS.md`, list the apps with their ids, the key screens of each with id, title and the reason it was picked, the tokens, the components those screens use, and the formats the spec locks for money, dates, times and phone numbers. Decide the frame per app: phone for a mobile app, web for a web app. Confirm the count with the user: key screens × apps. The selection is the contract; do not add screens.

When several apps are mocked, sequentially or in parallel (one agent per app), they share one story in `mockups/STORY.md` (Step 7): the caller writes it before starting the agents; when it does not exist, the first agent writes it and the others read it. Each agent builds its own file, and one of them, or the caller, writes `docs/SESSION.md` once at the end (Step 13).

### 2. Write the token block

Copy the product's tokens into `:root` as CSS variables: color roles, font families, type scale, radius, spacing, elevation, tap target. Use the exact values. Do not approximate, do not add tokens the spec does not have, and do not replace them with a house style. Every color in a screen goes through a variable; no hex value appears outside `:root`.

Three kinds of variable are allowed besides the tokens, each with a comment saying where it comes from:

- **Per-app adjustments the spec gives.** When `UI_SCREENS.md` says one app renders text larger or uses a larger tap target (an owner app used at arm's length), express it the way the spec gives it: a multiplier (`--type-scale: 1.125` applied to the base sizes) when it gives a factor, or the overridden type tokens themselves (`--type-body: 400 18px/24px …`) when it gives per-token values, plus `--tap-target`. These are not new tokens; they are the spec's own numbers.
- **Literals the spec names.** When the spec itself gives a hex value instead of a role (a QR code "on `#FFFFFF`"), hold it in a variable named after its use (`--qr-background`), never a generic name like `--white`.
- **Review meta-UI.** The toolbar and page greys as `--review-*` variables. They are not product tokens and never appear inside the frame.

If a token the screens need is genuinely missing (for example no error color), use a neutral placeholder, mark it in a comment, and list it in the handoff so it gets locked in `UI_SCREENS.md`.

### 3. Load the product's fonts

Load exactly the families and weights the locked type system names: no more (no weights "for later"), no fewer (a missing weight renders faux bold). Use the source the spec names when it is a web source (Google Fonts, Fontshare). When the spec says the app bundles its fonts (common for mobile), load the same families and weights from Google Fonts when they are there, and say so in a comment; otherwise use the spec's fallback stack and list it in the handoff.

Request the fonts with `display=block` (for Google Fonts, `&display=block` in the URL), not `swap`: a reviewer's first impression must not be the fallback font. List every face in the script's `fonts` array so all of them load at start, not when a screen first uses one.

### 4. Build the review toolbar

The toolbar sits outside the frame and is meta-UI for the reviewer, so it stays visually neutral: a system font, greys, no product colors. Three parts:

1. `{Product} · {app-id}` on the left.
2. A `<select>` with one option per key screen, in id order.
3. A label on the right with the current screen id and title, which also names the target when the reviewer taps a link outside the key set.

The page around the frame is a neutral grey too, so the app's own background reads as the app's.

### 5. Build the frame

- **Phone** (mobile apps): 375 × 812 px, 1 px subtle border, 32 px outer radius, centered under the toolbar, background equal to the app's surface token, a decorative status bar (`9:41 · LTE · 100%`; use the story's time instead when the story happens at a stated hour, such as `7:20`). The frame does not grow: each screen scrolls inside it, and sticky bars stay inside the screen.
- **Web** (web apps such as an admin dashboard): a 1280 px canvas with the app's sidebar and top bar from the spec. The sidebar stays put; the main area scrolls.

Both are in [references/skeleton.md](references/skeleton.md). Use the class names given there, so the script and the checks work unchanged.

### 6. Build each key screen

One `<div class="screen" id="s-{id}">` per key screen, following its spec: header with title and actions, body (cards, lists, forms), primary call to action where the spec puts it.

**Which state to mock.** One state per screen:

- The state the key-screen reason in `UI_SCREENS.md` names, when it names one ("picked for its offline banner" → mock the offline banner).
- Otherwise the happy path with data. Empty, loading and error states are validated during implementation, not here; an empty state that is the signature of a screen (a first-launch inbox) counts as its happy path.

If the reason names more than one state, check whether they can be on screen at the same moment:

- **Alternatives** (waiting for payment or declined; more or less than 24 h ahead): mock the first and list the others in the handoff as not mocked.
- **Things that coexist** (the slot states of one calendar, a multi-selection, a "pending to send" mark): combine them in one view, with story data that makes them plausible together, and say so in the handoff.

**Controls that act within a screen** work, without leaving it:

- **In-screen tabs and segmented controls that switch content**: each panel is a `.tab-panel`, switched with the script's `tab()`. The tab and panel shown first carry the class `on` in the HTML. A screen may have several tab groups; the panels of each group share a parent element.
- **Choices that only change what is selected** (chips, filters, a payment method, slot cells): `choose()` moves `aria-pressed` within the parent element, or toggles one control with `choose(this, true)` for a multi-selection. The story's selection is pressed in the HTML. Nothing recomputes: totals and summaries stay as the story says.
- **Overflow menus**: a native `<details class="menu">`, whose items follow Step 10 like any other control.

Dialogs, bottom sheets and other overlays the spec defines inside a key screen are not mocked unless the key-screen reason names them, in which case the dialog open over the screen is the state mocked. The controls that open them follow Step 10.

### 7. Use realistic data that tells one story

Names, prices, dates, addresses and phone numbers must look real for the product's market and language, taken from `OPINIONATED_DEFAULTS.md` and the personas. Never Lorem ipsum, never "John Doe": placeholder text makes viewers judge the mockup as fake instead of imagining themselves using it.

- **Formats come from the spec.** Render money, dates, times and phone numbers exactly as `UI_SCREENS.md` locks them (for example `$45.50` and 24 h `19:00` when it says so), and the market's conventions only where the spec is silent.
- **One story per app, and across apps when they share entities.** Pick one persona, one venue or provider, one order or booking, and keep them consistent on every screen: the same code, the same amount, the same date, totals that add up. When the navigation graph reaches a screen from different entities (a queue row for a pending item, a detail link for an approved one), mock the entity of the story and list the state that is therefore not shown in the handoff. Rows of other entities (other bookings in a list, other disputes in a queue) are shown but do not open the story's detail: they carry `data-off` (Step 10).
- **One story file when there is more than one app.** Read `mockups/STORY.md` before choosing any data; when it does not exist, write it first. Every app uses its names, codes, dates and amounts exactly; an app that needs something it lacks adds it to the file without changing what is there. When the spec's example data contradicts the story (one example code used for different states in different apps), the story wins and the change goes in the handoff.
- **Real calendar.** Weekday names match the dates for the year shown, and recurring dates follow the spec's rules (a payout week that starts Monday starts on a Monday).

`mockups/STORY.md` is short, in the product's language for names and in the spec's formats:

```markdown
# Story — {product}

Now: {weekday date, time} ({timezone if it matters})

## People
- {persona}: {full name}, {role}, {phone or email if shown}

## Entities
- {venue/provider}: {name}, {area}, {what it has: courts, prices, hours}
- {booking/order} {code}: {who}, {where}, {date and time}, {amount}, {method}, {state now}

## Per app
- {app-id}: {which records it shows and in which state: "K7P2QX confirmed, tonight"; "a past booking D4M8TR, no-show in dispute"}
```

Each record has one state at the "Now" of the story. When an app needs the same kind of record in another state (a disputed past booking), it is a different record with its own code.

### 8. Copy

Use the `[COPY: ...]` drafts from `UI_SCREENS.md` as the text; this skill does not write final copy. Fix only what the spec cannot have meant, such as a weekday that does not match its date, and list the change in the handoff.

Structural labels the spec leaves without a `[COPY]` (field labels in a summary, a section title, the button of a prompt card, a badge) may be drafted: the shortest wording in the product's language, marked in the HTML with a `data-draft` attribute, and listed in the handoff so they get added to `UI_SCREENS.md`.

### 9. Avatars and images

No photos and no image services: photos make viewers judge the photo instead of the design. Avatars are gradient circles with initials, built only from color tokens the spec defines (no tonal steps it does not list), one distinct pair of roles per person shown:

```html
<div class="avatar" style="background: linear-gradient(135deg, var(--primary), var(--tertiary)); color: var(--on-primary);">MG</div>
```

Illustrations, photos and maps are gradient rectangles with a label such as `[FOTO: cancha 1]` or `[MAPA]`. Charts are static inline SVG. A QR code is a static decorative SVG. SVG presentation attributes do not resolve `var()` (`fill="var(--primary)"` renders black): use `style="fill: var(--primary)"`, or `fill="currentColor"` with the color set in CSS.

### 10. Wire navigation

Use the script from [references/skeleton.md](references/skeleton.md) unchanged apart from its `titles` and `fonts` lists. It opens the screen in the URL hash, resets the scroll of the screen it shows, shows the tab bar only on the screens that declare it, marks the current tab or sidebar entry, switches in-screen tabs, and makes links outside the key set inert with a tooltip naming their target.

Follow the navigation graph of the spec, edge by edge:

- **Target is a key screen**: the control calls `show('{id}')`.
- **Target is not a key screen** (a tab, a sidebar entry, a breadcrumb, a row action, a CTA, a back button): the control keeps its designed look and gets `data-off="{id} {title}"`. It does nothing, its tooltip names the screen, and tapping it names the screen in the toolbar label. Do not invent the screen and do not hide the control.
- **The spec's path to a key screen passes through a non-key screen or a dialog** (Pay → card form → Confirmed; Save decision → confirm dialog → queue; Close → "¿Cancelar apartado?" → venue detail): the control jumps to the key screen that is the path's outcome when the user confirms; list each shortcut in the handoff.
- **The control does something that is not navigation to a key screen** (copy, share, open a dialog whose outcome stays on this screen or leads to a non-key screen, open in a new tab, call or message): `data-off="{label} (acción)"`, for example `data-off="Copiar código (acción)"`.
- **The target is outside the product** (a maps app, WhatsApp, a bank site): `data-off="{label} (externo)"`.
- **The row or card is another entity than the story's** (another venue's card, another dispute in the queue): `data-off="{code or name} (otro {entity})"`, for example `data-off="M3Q8ZD (otra disputa)"`, even when the spec would open a key screen from it.
- **The control changes state within the screen**: `tab()` or `choose()` (Step 6); no `data-off`.

### 11. Tab bar and sidebar

**Phone.** If the app has bottom navigation, it sits once inside the frame, below the screens. Each screen that shows it in the spec carries `data-tabs="{tab}"`, naming the tab shown as current; screens without it hide the bar. Tabs whose root screen is not a key screen carry `data-off`, so they look disabled and name their target; the current tab stays at full opacity even when it carries `data-off` (the skeleton's CSS does this). A bar where every tab but the current one is off is fine; it is honest about the selection.

**Web.** The sidebar is always shown. Each entry carries `data-nav="{id}"`; an entry whose screen is not a key screen also carries `data-off`. A key screen that belongs to a section whose root is not a key screen marks that entry with `data-nav` on the screen div.

### 12. Check before handing off

Open each file in a browser, or headless (for example Playwright with Chromium), and check:

- No console errors on a cold open.
- Every key screen is reachable from the select, and from in-app navigation where the spec has an edge between key screens.
- Opening `mockups/<app-id>.html#s-<id>` shows screen `<id>` for every key screen, and choosing a screen updates the hash. Screen ids contain dots, so a check selects a screen with `[id="s-1.2.3"]` or `getElementById('s-1.2.3')`, never `#s-1.2.3`.
- The frame renders at its size: 375 × 812 for a phone, 1280 px wide for a web app. A screen taller than the frame scrolls inside it, and showing another screen starts it at the top.
- The tab bar appears exactly on the screens that declare `data-tabs`; the sidebar marks the right entry, at full opacity.
- Every `data-off` control has a tooltip and does nothing else; every `tab()` and `choose()` control changes only its own screen.
- Every locked font face is loaded: after `document.fonts.ready`, each entry of `fonts` has a face in `document.fonts` with `status === 'loaded'` (not `document.fonts.check`, which answers true when the stylesheet never arrived). No text renders in a fallback font on a cold open.
- No hex value outside `:root`; every color and font in the frame comes from the product's tokens.
- Realistic data, in the spec's formats, telling one consistent story; no Lorem ipsum.
- No external JavaScript or CSS libraries, no `fetch()`.

Fix what fails. The mockup is the outside world's first look at the spec.

### 13. Close the phase

Save the files and close in Spanish, briefly, with the counts and the decisions worth checking, then ask for approval:

> Mockups listos: {N} pantallas en `mockups/{app-id}.html`, {M} en `mockups/{app-id}.html`. Ábrelos en el navegador y navega con el selector de arriba o tocando dentro del teléfono; cada pantalla tiene su enlace (`#s-{id}`).
>
> Decisiones que vale la pena verificar:
> - {the story chosen (and `mockups/STORY.md` when there are several apps), and states not shown because of it}
> - {shortcuts through non-key screens}
> - {drafted labels, placeholder tokens, font source when the spec bundles fonts}
>
> ¿Los apruebas, o ajustamos algo en `ui-screens-spec` antes?

When this skill runs under `product-spec-orchestrator`, the orchestrator's phase gate replaces this closing message and includes its counts and bullets.

After approval, overwrite `docs/SESSION.md` with the session template below. Fill the phase table from `node tools/spec-guard/spec.mjs status`. When Phase 7 ran early, the phases still pending stay pending and **Next** names the next pending one; otherwise **Next** is the build.

```markdown
# Session — {project title}

_Narrative for the next session. What is done is decided by `node tools/spec-guard/spec.mjs status`, which reads the documents; when they disagree, status wins._

## Phases

| Phase | Skill | State |
| --- | --- | --- |
| 1 | product-discovery | done / pending |
| 2 | product-requirements | ... |
| 3 | schema-design | ... |
| 4 | ui-screens-spec | ... |
| 5 | system-architecture | ... |
| 6 | multi-agent-governance | ... |
| 7 | navegable-mockups | ... |

## Last phase: 7 — navegable-mockups

- 3 to 5 bullets: the files written, the story chosen, states and screens not shown, drafted labels and placeholder tokens to lock in UI_SCREENS.md.

## Open questions

- Items marked [SUPUESTO] or deferred to a later phase, or "None".

## Next

{the next pending phase and its skill, or the build}
```

## Anti-patterns

- **Imposing a house style.** The screens use the product's tokens and fonts, not the agency's or the agent's taste.
- **Frameworks, Tailwind, UI kits, jQuery.** Plain HTML, one inline `<style>`, the skeleton's script.
- **Data fetching.** No `fetch()`, no SDKs. Everything is hardcoded.
- **Photo placeholders** from image services or stock sites.
- **Lorem ipsum**, generic Anglo names in a LATAM product, or formats the spec does not use.
- **Mocking screens outside the key selection.** If a sixth screen is needed, change the selection in `UI_SCREENS.md` first.
- **Dead links that look alive.** A control to a non-key screen carries `data-off`; it never silently does nothing.
- **A themed toolbar.** Product colors in the meta-UI compete with the app.
- **Pixel-perfecting.** About 80 % visual fidelity is the goal. Pixel-perfect work belongs to a designer.

## Communication

- Spanish with the user; English in HTML comments, where comments are needed at all.
- Cite tokens when explaining a choice ("el botón usa `var(--primary)`, el seed de UI_SCREENS.md").
- Do not sell the result. The user judges it by opening the file.
- Be honest about fidelity: these are clickable mockups, not a design file.

## What this skill does not do

- Produce Flutter, React or any app code.
- Choose or change colors, fonts or tokens.
- Write final microcopy, design illustrations or icon sets.
- Integrate a backend, authentication or a maps provider.
- Audit accessibility beyond basic semantic HTML.
