# Aiuda Labs — Design System

> Canonical design tokens for HTML outputs in the Aiuda Labs house style. Verified against the live website source at `aiudalabs.com`. When generating HTML, apply these patterns exactly.

## Font Loading (exact, from layout.tsx)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Always load all three. Satoshi is the primary font. Never substitute with DM Sans, Inter, or any other sans-serif.

## CSS Variables (exact, from globals.css)

```css
:root {
  /* Backgrounds */
  --bg: #FAF8F4;      /* main background — warm cream, NOT white */
  --bg2: #F3F0EA;     /* cards, secondary surfaces */
  --bg3: #EBE7DE;     /* borders, dividers */

  /* Text */
  --ink: #0D0D0F;     /* primary text */
  --ink2: #2A2A2F;    /* secondary text */
  --ink3: #52525A;    /* body, descriptions */
  --ink4: #8A8A92;    /* muted, labels */

  /* Accent */
  --accent: #E8440A;
  --accent-h: #D13A06;
  --accent-soft: rgba(232, 68, 10, 0.06);

  /* Secondary accents */
  --emerald: #0A7B5A;
  --emerald-soft: rgba(10, 123, 90, 0.06);
  --navy: #142850;
  --navy-soft: rgba(20, 40, 80, 0.06);

  /* Typography */
  --display: "Satoshi", system-ui, sans-serif;
  --serif: "Instrument Serif", Georgia, serif;
  --mono: "JetBrains Mono", monospace;

  /* Motion */
  --ease: cubic-bezier(0.16, 1, 0.3, 1);

  /* Layout */
  --max: 1120px;
  --r: 12px;
}
```

## Body Base (from globals.css)

```css
body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--display);
  font-size: 16px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  margin: 0;
}

/* Subtle noise texture — always include in HTML outputs */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

## Logo (from logo.tsx)

### Standard (light background) — size md
```html
<span style="display:inline-flex; align-items:baseline; gap:4px; line-height:1;">
  <span style="font-size:28px; font-weight:900; letter-spacing:-0.04em; font-family:'Satoshi',system-ui,sans-serif;">
    <span style="color:#E8440A; font-weight:400;">&lt;</span><span style="color:#E8440A;">ai</span><span style="color:#0D0D0F;">uda</span><span style="color:#E8440A; font-weight:400;">/&gt;</span>
  </span>
  <span style="font-size:20px; font-weight:500; color:#8A8A92; font-family:'Satoshi',system-ui,sans-serif;">labs</span>
</span>
```

### Dark background variant
Replace `color:#0D0D0F` → `color:#FAF8F4` and `color:#8A8A92` → `color:rgba(255,255,255,0.4)`.

### Size variants
| Size | main font-size | labs font-size | gap |
|------|---------------|----------------|-----|
| sm | 20px | 15px | 3px |
| md | 28px | 20px | 4px |
| lg | 36px | 26px | 5px |

### Logo icon (favicon)
```html
<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="6" fill="#E8440A"/>
  <text x="16" y="22" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="14" fill="#fff">
    <tspan font-weight="400">&lt;</tspan><tspan font-weight="900">ai</tspan><tspan font-weight="400">/&gt;</tspan>
  </text>
</svg>
```

## Typography (from hero.tsx, pricing.tsx)

```css
h1 {
  font-family: 'Satoshi', system-ui, sans-serif;
  font-weight: 900;
  font-size: clamp(40px, 5.5vw, 64px);
  line-height: 1.02;
  letter-spacing: -0.035em;
  color: var(--ink);
  margin: 8px 0 16px;
}

h2 {
  font-family: 'Satoshi', system-ui, sans-serif;
  font-weight: 900;
  font-size: clamp(28px, 3.8vw, 44px);
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: var(--ink);
  margin: 0 0 16px;
}

h3 {
  font-family: 'Satoshi', system-ui, sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 24px 0 12px;
}

p { color: var(--ink3); margin: 0 0 16px; line-height: 1.65; }

/* Italic accent text — used inside headings */
em {
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-weight: 400;
  color: var(--accent);
}
```

## Eyebrow Pattern (from hero.tsx, pricing.tsx)

Every section starts with this pattern:

```html
<div class="eyebrow">
  <span class="eyebrow-line"></span>
  <span class="eyebrow-text">Section label here</span>
</div>
```

```css
.eyebrow { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.eyebrow-line { width: 20px; height: 1.5px; background: var(--accent); flex-shrink: 0; }
.eyebrow-text {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}
```

## Navigation (from nav.tsx)

```css
nav.site-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(250, 248, 244, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}
nav.site-nav a {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink3);
  text-decoration: none;
  transition: color 200ms;
}
nav.site-nav a:hover { color: var(--ink); }
```

## Footer (from footer.tsx)

```css
footer.site-footer {
  background: var(--ink);  /* dark — #0D0D0F */
  color: rgba(255, 255, 255, 0.4);
  padding: 40px 24px;
  margin-top: 80px;
}
footer.site-footer a {
  color: rgba(255,255,255,0.4);
  text-decoration: none;
  font-size: 13px;
  transition: color 200ms;
}
footer.site-footer a:hover { color: white; }
footer.site-footer .copy {
  font-family: var(--mono);
  font-size: 11px;
}
```

## Cards

```css
.card {
  background: var(--bg);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  padding: 28px;
  transition: all 250ms var(--ease);
}
.card:hover {
  border-color: rgba(0, 0, 0, 0.10);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
  transform: translateY(-3px);
}
.card.highlighted {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
```

## Callouts

```css
.callout {
  background: var(--bg2);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  padding: 16px 20px;
  margin: 24px 0;
}
.callout-emerald { border-left-color: var(--emerald); }
.callout-navy { border-left-color: var(--navy); }
.tldr {
  background: var(--accent-soft);
  border-left: 4px solid var(--accent);
  border-radius: 8px;
  padding: 20px 24px;
  margin: 32px 0;
}
```

## Badges

```css
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.badge-accent  { background: var(--accent-soft);  color: var(--accent); }
.badge-emerald { background: var(--emerald-soft); color: var(--emerald); }
.badge-navy    { background: var(--navy-soft);    color: var(--navy); }
.badge-neutral { background: var(--bg3);          color: var(--ink3); }
```

## Buttons (from nav.tsx CTA)

```css
.btn {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 200ms var(--ease);
  text-decoration: none;
  display: inline-block;
  border: none;
}
.btn-primary { background: var(--accent); color: white; }
.btn-primary:hover { background: var(--accent-h); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(232,68,10,0.2); }
.btn-dark { background: var(--ink); color: var(--bg); }
.btn-dark:hover { background: var(--accent); }
```

## Tables

```css
.table-wrap { border: 1px solid var(--bg3); border-radius: 12px; overflow: hidden; margin: 24px 0; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
thead { background: var(--bg2); }
th { padding: 12px 16px; text-align: left; font-family: var(--mono); font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink3); }
td { padding: 12px 16px; border-bottom: 1px solid var(--bg3); color: var(--ink3); vertical-align: top; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--bg2); }
```

## Diagram Cards (for Mermaid)

```css
.diagram-card {
  background: var(--bg2);
  border: 1px solid var(--bg3);
  border-radius: 16px;
  padding: 28px;
  margin: 24px 0;
  overflow-x: auto;
}
.diagram-label {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink4);
  margin-bottom: 12px;
}
```

Mermaid initialize config:
```js
mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  themeVariables: {
    primaryColor: '#F3F0EA',
    primaryBorderColor: '#E8440A',
    primaryTextColor: '#0D0D0F',
    lineColor: '#52525A',
    secondaryColor: '#EBE7DE',
    tertiaryColor: '#FAF8F4',
    noteBkgColor: '#F3F0EA',
    noteTextColor: '#0D0D0F',
    fontFamily: 'Satoshi, system-ui, sans-serif'
  }
});
```

## Layout

```css
.container { max-width: var(--max); margin: 0 auto; padding: 40px 24px 100px; }
.section { margin-bottom: 80px; }

@media (max-width: 640px) {
  h1 { font-size: 32px; }
  h2 { font-size: 24px; }
  .container { padding: 24px 16px 80px; }
  nav.site-nav { padding: 0 16px; }
}
```

## Rules for HTML-generating skills

1. **Always load all three fonts.** Satoshi via Fontshare + Instrument Serif + JetBrains Mono via Google Fonts.
2. **Use CSS variables**, never hardcoded hex values in component styles.
3. **No Tailwind, no React, no frameworks** — all HTML outputs are self-contained with inline `<style>`.
4. **No external JS** except Mermaid CDN when diagrams are needed.
5. **Background is `--bg` (#FAF8F4)** — never white (#FFFFFF), never --bg2 for the page background.
6. **Include the noise texture** (`body::before`) — it's subtle but part of the brand feel.
7. **Always include the logo** in a sticky nav at the top. Use the dark-bg variant in the footer.
8. **Eyebrow before every section heading** — line + mono uppercase + accent color.
9. **H1 and H2 are weight 900** (font-black), not 700.
10. **Italic text in headings** uses Instrument Serif via `<em>` with `color: var(--accent)`.
11. **Footer is dark** (`background: var(--ink)`). Always.
12. **Realistic LATAM placeholder data** (Panama addresses, B/. or $ prices, Spanish names).
