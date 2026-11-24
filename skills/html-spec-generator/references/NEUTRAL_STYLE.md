# Neutral style (spec page without the Aiuda Labs look)

Used when the project did not choose the Aiuda Labs look. Same page as the house style: same layout, components, class names, nav, footer, diagram cards and rules from [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), with these differences only:

- **Tokens**: the `:root` block below replaces the design system's. Variable names are the same, so every component style applies unchanged.
- **Fonts**: system stacks. No font links, nothing to load.
- **No noise texture** (`body::before`), **no Aiuda Labs logo, no favicon.** The nav's left side and the footer show the project's name from the brief, as plain text in `var(--display)`, weight 900.
- **Mermaid**: the `themeVariables` below instead of the design system's.
- It is not the product's identity either: the product's tokens (docs/UI_SCREENS.md) never style this page.

```css
:root {
  --bg: #F7F7F5;  --bg2: #EEEEEB;  --bg3: #E1E1DD;
  --ink: #16161A; --ink2: #2E2E34; --ink3: #52525A; --ink4: #85858C;
  --accent: #2F55C8; --accent-h: #2446AA; --accent-soft: rgba(47, 85, 200, 0.07);
  --emerald: #0A7B5A; --emerald-soft: rgba(10, 123, 90, 0.07);
  --navy: #2E3A4F;    --navy-soft: rgba(46, 58, 79, 0.07);
  --display: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --serif: Georgia, serif;
  --mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --max: 1120px;
  --r: 12px;
}
```

The design system's nav background `rgba(250, 248, 244, 0.88)` becomes `rgba(247, 247, 245, 0.9)`; keep its other translucencies.

```js
themeVariables: {
  primaryColor: '#EEEEEB',
  primaryBorderColor: '#2F55C8',
  primaryTextColor: '#16161A',
  lineColor: '#52525A',
  secondaryColor: '#E1E1DD',
  tertiaryColor: '#F7F7F5',
  noteBkgColor: '#EEEEEB',
  noteTextColor: '#16161A',
  fontFamily: 'system-ui, sans-serif'
}
```

Checks: the page background is `rgb(247, 247, 245)`, and the font check does not apply.
