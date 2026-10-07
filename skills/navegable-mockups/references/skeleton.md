# Mockup skeleton

The two frames and the one script every mockup file starts from. Copy the frame
that matches the app, fill the screens, and keep the script as it is apart from
the `titles` and `fonts` lists. SKILL.md says when each part applies.

## Shared head and toolbar

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{Product} · {app-id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- exactly the families and weights of the locked type system; display=block -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=block">
  <style>
    :root {
      /* Product tokens, exactly as locked in docs/UI_SCREENS.md */
      --primary: #0F7B4F;
      /* ... every role, family, type step, radius, spacing, elevation ... */

      /* Per-app adjustments given by the spec, derived from the tokens */
      --type-scale: 1;          /* e.g. 1.125 when the spec says this app's text is 12.5% larger */
      /* or, when the spec gives per-token values for this app, override those tokens here:
         --type-body: 400 18px/24px var(--font-body); */
      --tap-target: 48px;       /* the tap target the spec gives this app */

      /* Literals the spec itself names, as a variable named after their use */
      --qr-background: #FFFFFF; /* UI_SCREENS.md QrCodeBlock: "on-surface on #FFFFFF" */

      /* Review meta-UI only: neutral greys, not product tokens */
      --review-page: #E4E4E7;
      --review-bar: #FAFAFA;
      --review-text: #3F3F46;
      --review-muted: #71717A;
      --review-border: #D4D4D8;
    }
    * { box-sizing: border-box; }
    button, input, select, textarea { font: inherit; }   /* form controls use the product's fonts, not the UA's */
    body { margin: 0; background: var(--review-page); font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .review-toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      padding: 10px 20px; background: var(--review-bar); color: var(--review-text); border-bottom: 1px solid var(--review-border); font-size: 14px; }
    .review-toolbar #screen-label { margin-left: auto; color: var(--review-muted); }
    [data-off] { cursor: not-allowed; }               /* links to screens outside the key set */
    .bottom-tabs [data-off], .sidebar [data-off] { opacity: .5; }   /* tabs and menu entries look disabled */
    .bottom-tabs [data-off].current, .sidebar [data-off].current { opacity: 1; }   /* ...except the current one */
    .tab-panel { display: none; }                    /* in-screen tabs; the first tab and panel carry class="on" */
    .tab-panel.on { display: block; }
    /* choose(): style the selected look with [aria-pressed="true"] in the product's tokens */
    .menu { position: relative; }                    /* overflow menu: <details class="menu"> */
    .menu > summary { list-style: none; cursor: pointer; }
    .menu > summary::-webkit-details-marker { display: none; }
    .menu-items { position: absolute; right: 0; z-index: 5; }
    /* ... frame CSS from one of the two sections below ... */
  </style>
</head>
<body>
  <header class="review-toolbar">
    <strong>{Product} · {app-id}</strong>
    <select onchange="show(this.value)" aria-label="Pantalla">
      <option value="1.2.3">1.2.3 — Results</option>
      <!-- one option per key screen, in id order -->
    </select>
    <span id="screen-label"></span>
  </header>
  <!-- the frame -->
  <script>/* the script below */</script>
</body>
</html>
```

## Phone frame

Screens scroll inside the frame, not the page: the frame has a fixed height, the
`.screens` box takes what the status bar and tab bar leave, and each screen is
its own scroll container. A sticky bottom bar inside a screen (a "Reservar"
button) uses `position: sticky; bottom: 0` within that screen. The children of a
screen keep their content height (`flex: none`), so a long list never shrinks
to zero inside the flex column; a body that should fill the space left above a
bottom bar gets class `grow`.

```css
.phone-frame { width: 375px; height: 812px; margin: 24px auto 40px; border: 1px solid var(--review-border);
  border-radius: 32px; overflow: hidden; background: var(--surface); color: var(--on-surface);
  display: flex; flex-direction: column; }
.status-bar { flex: none; height: 32px; padding: 8px 24px 0; display: flex; justify-content: space-between; }
.screens { flex: 1; min-height: 0; position: relative; }
.screen { display: none; height: 100%; overflow-y: auto; }
.screen.active { display: flex; flex-direction: column; }
.screen > * { flex: none; }
.screen > .grow { flex: 1 0 auto; }   /* fills the space, never shrinks below its content */
.bottom-tabs { flex: none; display: flex; border-top: 1px solid var(--outline-variant); }
.bottom-tabs[hidden] { display: none; }
.bottom-tabs [data-tab].current { color: var(--primary); }
```

```html
<div class="phone-frame">
  <div class="status-bar"><span>9:41</span><span>LTE · 100%</span></div>  <!-- the story's time when it has one -->
  <div class="screens">
    <!-- data-tabs names the tab shown as current; leave it out where the spec hides the bar -->
    <div id="s-1.2.3" class="screen" data-tabs="buscar">…</div>
    <div id="s-1.3.1" class="screen">…</div>
  </div>
  <nav class="bottom-tabs" aria-label="Navegación">
    <button data-tab="buscar" onclick="show('1.2.3')">Buscar</button>
    <button data-tab="reservas" data-off="1.5.1 Mis reservas">Reservas</button>
  </nav>
</div>
```

Inside a screen, the controls that are not navigation to a key screen:

```html
<div class="chips"><!-- choose(): one selected per parent; choose(this, true) toggles for a multi-selection -->
  <button aria-pressed="true" onclick="choose(this)">Yappy</button>
  <button aria-pressed="false" onclick="choose(this)">Tarjeta</button>
</div>
<details class="menu">
  <summary aria-label="Más opciones">⋮</summary>
  <div class="menu-items">
    <button onclick="show('2.2.5')">Cancelar por lluvia</button>
    <button data-off="2.2.3 Bloquear horario">Bloquear</button>
  </div>
</details>
<button data-off="Copiar código (acción)">Copiar</button>
<a data-off="Google Maps (externo)">Cómo llegar</a>
<div class="card" data-off="Cancha La Bombonera (otro local)">…</div>
```

## Web frame

For a web app (an admin dashboard): a 1280 px canvas with the app's sidebar and
top bar from the spec. The main area scrolls; the sidebar stays.

```css
.web-frame { width: 1280px; height: 820px; margin: 24px auto 48px; display: grid;
  grid-template-columns: 240px 1fr; grid-template-rows: 56px 1fr; border: 1px solid var(--review-border);
  border-radius: 10px; overflow: hidden; background: var(--surface); color: var(--on-surface); }
.sidebar { grid-row: 1 / 3; overflow-y: auto; }
.topbar { display: flex; align-items: center; justify-content: flex-end; }
.web-main { overflow-y: auto; min-height: 0; }
.screen { display: none; padding: var(--space-lg); }
.screen.active { display: block; }
.sidebar [data-nav].current { background: var(--primary-container); }
```

```html
<div class="web-frame">
  <nav class="sidebar" aria-label="Menú">
    <button data-nav="3.2.2" onclick="show('3.2.2')">Verificación</button>
    <button data-nav="3.2.1" data-off="3.2.1 Locales">Locales</button>
  </nav>
  <div class="topbar">…</div>
  <main class="web-main">
    <!-- data-nav names the sidebar entry shown as current when it is not the screen itself -->
    <div id="s-3.2.2" class="screen">…</div>
    <div id="s-3.2.3" class="screen" data-nav="3.2.2">…</div>
  </main>
</div>
```

## The script

The same script for both frames. Fill `titles` with the key screens (the first
one opens when the URL has no screen hash) and `fonts` with one entry per
locked family and weight.

```javascript
const titles = { '1.2.3': 'Results', '1.3.1': 'Venue detail', '1.4.1': 'Checkout' };
const fonts = ['600 16px "Barlow Condensed"', '700 16px "Barlow Condensed"', '400 16px Barlow', '500 16px Barlow', '600 16px Barlow'];
const label = document.getElementById('screen-label');

// Load every locked face up front, so no screen waits for a font on first show.
fonts.forEach((face) => document.fonts.load(face));

function show(id) {
  const target = document.getElementById('s-' + id);
  if (!titles[id] || !target) return;
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s === target));
  target.scrollTop = 0;                                   // screens scroll inside the frame
  const main = document.querySelector('.web-main');
  if (main) main.scrollTop = 0;
  label.textContent = id + ' — ' + titles[id];
  const select = document.querySelector('.review-toolbar select');
  if (select) select.value = id;
  const tabs = document.querySelector('.bottom-tabs');    // tab bar only where the spec shows it
  if (tabs) tabs.hidden = !target.dataset.tabs;
  document.querySelectorAll('[data-tab]').forEach((t) => t.classList.toggle('current', t.dataset.tab === target.dataset.tabs));
  document.querySelectorAll('[data-nav]:not(.screen)').forEach((n) => n.classList.toggle('current', n.dataset.nav === (target.dataset.nav || id)));
  document.querySelectorAll('details.menu[open]').forEach((d) => { d.open = false; });   // close overflow menus
  if (location.hash !== '#s-' + id) history.replaceState(null, '', '#s-' + id);
}

// Controls not mocked (other screens, actions, external targets, other entities)
// keep their look, do nothing, and name their target.
document.querySelectorAll('[data-off]').forEach((el) => {
  el.title = el.dataset.off + ' — no está en los mockups';
  el.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    label.textContent = '→ ' + el.title;
  });
});

// In-screen tabs: <button class="tab" onclick="tab(this, 'panel-id')">, panels with class="tab-panel".
// One group = the tabs sharing a parent and the panels sharing a parent, so a screen may have several.
function tab(button, panelId) {
  button.parentElement.querySelectorAll(':scope > .tab').forEach((t) => t.classList.toggle('on', t === button));
  const panel = document.getElementById(panelId);
  panel.parentElement.querySelectorAll(':scope > .tab-panel').forEach((p) => p.classList.toggle('on', p === panel));
}

// In-screen choices (chips, a payment method, slot cells): aria-pressed, nothing else changes.
// choose(this) keeps one pressed among its siblings; choose(this, true) toggles it alone.
function choose(button, multi) {
  if (multi) return button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
  button.parentElement.querySelectorAll(':scope > [aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
}

// Open the screen named in the URL (#s-1.3.1): the anchor UI_SCREENS.md and the issues cite.
const fromHash = () => decodeURIComponent(location.hash.replace(/^#s-/, ''));
window.addEventListener('hashchange', () => show(fromHash()));
show(titles[fromHash()] ? fromHash() : Object.keys(titles)[0]);
```

Call `show()` from the toolbar select, the tabs or sidebar, and the in-app
controls whose target is a key screen. Give every control that is not mocked a
`data-off` and no `onclick`: `"{id} {title}"` for a non-key screen,
`"{label} (acción)"` for an action, `"{label} (externo)"` for a target outside
the product, `"{code or name} (otro {entity})"` for another entity's row. A key
screen with its own tabs or segmented control uses `tab()`; a choice that only
changes the selection uses `choose()`; an overflow menu is a `<details
class="menu">`. Nothing else goes in the script: no timers, no state machines,
no fetching.
