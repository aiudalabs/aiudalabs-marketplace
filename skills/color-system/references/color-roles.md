# Color roles

A ramp gives you eleven steps of one hue. Roles say which step does which job. People working with the brand use roles; only the person maintaining the system touches ramp steps.

## The palette structure

| Part | Count | Purpose |
| --- | --- | --- |
| Primary ramp | 1 | The color people remember. Logo, key actions, key surfaces. |
| Neutral ramp | 1 | Text, borders, backgrounds. Does most of the work. Tinted slightly toward the primary so it does not look lifeless beside it. |
| Accent ramp | 0 or 1 | Emphasis only. Should contrast with the primary in hue or lightness. |
| Semantic colors | 3 or 4 | Success, warning, error, and optionally info. Never used for decoration. |

## Starting role map, light mode

These step numbers are a starting point. Confirm each pairing with the contrast script and move a step when one fails.

| Role | Starting step | Used for |
| --- | --- | --- |
| `background` | neutral 50 | Page background |
| `surface` | neutral 100, or white | Cards, panels |
| `border` | neutral 200 | Dividers and card outlines. Decorative, so it has no contrast requirement. |
| `border-strong` | neutral 500 | Borders that are the only thing marking a control, such as an input outline |
| `text` | neutral 900 | Body text and headings |
| `text-muted` | neutral 600 | Secondary text, captions |
| `action` | primary 600 | Buttons, links |
| `action-hover` | primary 700 | Hover and pressed states |
| `on-action` | neutral 50, or white | Text on an action background |
| `focus-ring` | primary 500 | Keyboard focus indicator |

Pairings to check, at minimum:

- `text` on `background` and on `surface`
- `text-muted` on `background` and on `surface`
- `on-action` on `action` and on `action-hover`
- `action` on `background`, when the primary is used for link text
- `border-strong` and `focus-ring` on `background`, as UI components
- each semantic color in the way it is used: as text, or as a background with text on it

## Semantic colors

Choose success, warning and error so they are clearly different from the primary and from each other. If the primary is red or green, shift the semantic color's hue or pair it with a neutral background so an error does not look like a brand moment.

Generate a ramp for each semantic color too. A single hex is rarely enough: you need a light step for backgrounds and a dark step for text.

Because some people cannot tell red from green, a state must never depend on color alone. Pair it with an icon, a label or a position.

## Dark mode

Dark mode reuses the same ramps with a different role map. It does not need new colors.

| Role | Starting step, dark | Note |
| --- | --- | --- |
| `background` | neutral 950 | Avoid pure black unless the brief asks for it; it makes text edges harsh |
| `surface` | neutral 900 | Surfaces get lighter as they rise, the reverse of light mode shadows |
| `border` | neutral 800 |  |
| `border-strong` | neutral 500 |  |
| `text` | neutral 50 |  |
| `text-muted` | neutral 400 |  |
| `action` | primary 400 or 500 | A step that passed on a light background usually fails on a dark one. Go lighter. |
| `action-hover` | primary 300 |  |
| `on-action` | neutral 950 | Dark text on a light action color is common in dark mode |

Saturated colors look more intense on dark backgrounds. If the primary vibrates against the dark surface, use a lighter, less saturated step for large areas and keep the base color for small elements.

Run the contrast check on the dark pairings as a separate palette file.

## Proportion

A common starting split is a large majority of neutral, a smaller share of primary, and a small share of accent. Treat the split as a habit to tune, not a rule. What matters is that the accent stays rare enough to mean something.

## Print

Screens and print do not share a color space. If the brand will be printed, the printer or a designer with a calibrated workflow must choose CMYK and spot color equivalents and approve a physical proof. Do not convert hex values to CMYK or Pantone by formula and present the result as a specification.
