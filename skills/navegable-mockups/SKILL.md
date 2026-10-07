---
name: navegable-mockups
description: "Builds clickable HTML mockups of a product's key app screens: one standalone file per app, with a phone frame (or desktop layout for admin web apps), a neutral review toolbar with a screen selector, working navigation between screens, the product's own locked design tokens and realistic market data, openable by double-click with no server or dependencies. Use for 'mockups navegables', 'prototipo HTML', 'hagamos los mockups', 'quiero enseñar las pantallas al equipo o a inversores', or as Phase 7 of the product-spec workflow once the key screens are picked in docs/UI_SCREENS.md. Not for specifying screens (use `ui-screens-spec`), exploring brand looks or style options (use `visual-directions`), or app code."
license: MIT
metadata:
  version: "1.0.0"
  author: aiudalabs
  requires: ui-screens-spec
---

# Navegable Mockups

Turn the key screens of `docs/UI_SCREENS.md` into HTML a founder can email. No server, no framework, no install: the recipient double-clicks the file and clicks through the app. That portability is the point of this phase.

The mockups show **the client's product**, in the product's own design tokens. They are a visual contract for stakeholder validation and pilot feedback before code is written, not the code of the app and not a place to explore new looks.

## When to use it

- The user asks for clickable mockups, an HTML prototype, a demo of the screens for the team, investors or pilot users.
- Phase 7 of the product-spec workflow, after governance (Phase 6) is approved, **only if the user opts in**. Not every project needs mockups.

Stop and redirect when:

- `docs/UI_SCREENS.md` does not exist, is not approved, or has no key screens picked per app: go back to the `ui-screens-spec` skill.
- The screens spec has no locked tokens (color seed, type system, radius, spacing): go back to `ui-screens-spec` to lock them. Do not invent a palette here.
- The user wants several visual options to choose from: that is the `visual-directions` skill. This skill applies one locked set of tokens.
- The user wants high-fidelity Figma or production app code: out of scope.

## Inputs

| File | What it gives |
| --- | --- |
| `docs/UI_SCREENS.md` | Apps, key screens per app (ids and titles), screen specs, navigation graph, locked tokens, component vocabulary, microcopy placeholders |
| `docs/OPINIONATED_DEFAULTS.md` | Market, language, currency, any locked brand color |
| `docs/PRODUCT_BRIEF.md` | Product name, app names, personas (used in placeholder data) |

If the product already has its own design system or token file (for example a `tokens.json` from the `design-tokens` skill), it wins over anything restated in prose.

## Output

One HTML file per app in `./mockups/`, for example `customer-app.html`, `provider-app.html`, and `admin-app.html` when there is an admin. A web-only admin uses a desktop layout instead of a phone frame. Each file holds all the key screens of its app and works offline except for the web fonts.

Skeleton of each file:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{Product} · {App}</title>
  <!-- the product's fonts only, the weights actually used -->
  <style>
    :root { /* the product's tokens, exactly as locked in UI_SCREENS.md */ }
    .review-toolbar { /* neutral meta-UI, not themed */ }
    .phone-frame { /* 375 x 812, radius 32px */ }
    .screen { display: none; }
    .screen.active { display: block; }
    .bottom-tabs { /* persistent app navigation, if the app has it */ }
  </style>
</head>
<body>
  <header class="review-toolbar">
    <span>{Product} · {App}</span>
    <select onchange="show(this.value)">…one option per key screen…</select>
    <span id="screen-label">1.2.1 — Home</span>
  </header>
  <div class="phone-frame">
    <div class="status-bar">9:41 · LTE · 100%</div>
    <div id="s-1.2.1" class="screen active">…</div>
    <div id="s-1.2.3" class="screen">…</div>
    <!-- one div per key screen -->
    <nav class="bottom-tabs">…</nav>
  </div>
  <script>/* show(id), about 15 lines */</script>
</body>
</html>
```

## Method

### 1. Fix the scope

From `UI_SCREENS.md`, list the apps, the key screens of each with id and title, the tokens, and the components those screens use. Confirm the count with the user: key screens × apps. The selection is the contract; do not add screens.

### 2. Write the token block

Copy the product's tokens into `:root` as CSS variables: primary and its ramp, surfaces, text colors, semantic colors, font families, type scale, radius, spacing, tap target. Use the exact values. Do not approximate, do not add tokens the spec does not have, and do not replace them with a house style. Every color in a screen goes through a variable.

If a token the screens need is genuinely missing (for example no error color), use a neutral placeholder, mark it in a comment, and list it in the handoff so it gets locked in `UI_SCREENS.md`.

### 3. Load the product's fonts

Load the families named in the type system, from the source the spec names (Google Fonts, Fontshare, or a system stack), with only the two or three weights the screens use. People open these files on phones and old laptops; extra weights slow the first open.

### 4. Build the review toolbar

The toolbar sits outside the phone frame and is meta-UI for the reviewer, so it stays visually neutral: a system font, greys, no product colors. Three parts:

1. `{Product} · {App}` on the left.
2. A `<select>` with one option per key screen, in id order.
3. The current screen id and title on the right, updated on navigation.

The page around the phone is a neutral grey too, so the app's own background reads as the app's.

### 5. Build the frame

- Phone: 375 px wide, about 812 px tall, 1 px subtle border, 32 px outer radius, centered under the toolbar, background equal to the app's surface token.
- A decorative status bar at the top (`9:41 · LTE · 100%`).
- Admin web app: a 1280 px canvas with the app's sidebar or top bar instead of a phone.

### 6. Build each key screen

One `<div class="screen" id="s-{id}">` per key screen, following its spec: header with title and actions, body (cards, lists, forms), primary call to action where the spec puts it.

Mock the **happy path with data**. Empty, loading and error states are validated during implementation, not here. Exception: when the empty state is the signature of a screen (a first-launch inbox, for instance), mock it as that screen's state.

Only one screen carries `active` at a time.

### 7. Use realistic data

Names, prices, dates, addresses and phone numbers must look real for the product's market and language, taken from `OPINIONATED_DEFAULTS.md` and the personas. For a Panamá consumer app, for example: María González, Av. Balboa 123, B/. 45.50, "Hoy a las 3:00 PM", +507 6123-4567. Never Lorem ipsum, never "John Doe": placeholder text makes viewers judge the mockup as fake instead of imagining themselves using it.

Use the microcopy placeholders from `UI_SCREENS.md`; this skill does not write final copy.

### 8. Avatars and images

No photos and no image services: photos make viewers judge the photo instead of the design. Avatars are gradient circles with initials, built from the product's palette (five or six distinct gradients per file):

```html
<div class="avatar" style="background: linear-gradient(135deg, var(--primary-300), var(--primary-600));">MG</div>
```

Illustrations and maps are gradient rectangles with a label such as `[ILLUSTRATION: empty inbox]` or `[MAP]`. Charts are static inline SVG.

### 9. Wire navigation

```javascript
const titles = { '1.2.1': 'Home', '1.2.3': 'Results', '1.3.1': 'Provider detail' };

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('s-' + id);
  if (target) target.classList.add('active');
  document.getElementById('screen-label').textContent = id + ' — ' + (titles[id] || '');
  const select = document.querySelector('.review-toolbar select');
  if (select) select.value = id;
  window.scrollTo(0, 0);
}
```

That is the whole script. Call `show()` from three places: the toolbar select, the bottom tabs, and cross-screen links (a result card opens the detail screen), following the navigation graph in the spec.

### 10. Bottom tabs

If the app has persistent bottom navigation, put it inside the frame. Tabs whose screens are not in the key set stay visible but disabled (greyed, not clickable), so the structure is honest without inventing screens.

### 11. Check before handing off

- Opens in a clean browser window with no console errors.
- Every key screen is reachable from the select, and from in-app navigation where the spec says so.
- Fonts load; no flash of a fallback font on a cold open.
- Every color and font in the screens comes from the product's tokens; no improvised hex values.
- Realistic data everywhere; no Lorem ipsum.
- No external JavaScript or CSS libraries.
- The frame renders correctly at 375 px on a desktop browser.

Fix what fails. The mockup is the outside world's first look at the spec.

### 12. Hand off

Save the files and close in Spanish, briefly:

> Mockups listos: {N} pantallas en `mockups/customer-app.html`, {M} en `mockups/provider-app.html`. Ábrelos en el navegador y navega con el selector de arriba o con las pestañas dentro del teléfono. Siguiente paso: validarlos con stakeholders, volver a `ui-screens-spec` si algo no convence, o empezar el build.

List any placeholder tokens from step 2. This is the last phase of the spec; the next moves are iterating on `ui-screens-spec`, validating with people, or starting the build with the `execution-router` skill.

## Anti-patterns

- **Imposing a house style.** The screens use the product's tokens and fonts, not the agency's or the agent's taste.
- **Frameworks, Tailwind, UI kits, jQuery.** Plain HTML, one inline `<style>`, a few lines of script.
- **Data fetching.** No `fetch()`, no SDKs. Everything is hardcoded.
- **Photo placeholders** from image services or stock sites.
- **Lorem ipsum** or generic Anglo names in a LATAM product.
- **Mocking screens outside the key selection.** If a sixth screen is needed, change the selection in `UI_SCREENS.md` first.
- **A themed toolbar.** Product colors in the meta-UI compete with the app.
- **Pixel-perfecting.** About 80 % visual fidelity is the goal. Pixel-perfect work belongs to a designer.
- **Loading many font weights "for later".**

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
