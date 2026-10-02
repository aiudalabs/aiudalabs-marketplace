---
name: color-system
description: Builds a complete brand color system from one or two chosen colors, covering perceptually even tonal ramps, tinted neutrals, semantic and role colors, dark mode, and a WCAG 2.2 contrast check of every text and background pairing. Use when the user asks for a color palette, brand colors, color scheme, shades or tints of a color, dark mode colors, or wants to check the contrast or accessibility of colors.
license: MIT
compatibility: The bundled scripts need Node.js 18 or later. They have no dependencies and need no network access.
metadata:
  version: "0.1.0"
  author: aiudalabs
---

# Color System

Deliver a palette where every color has a job and every text pairing is proven readable. The ramps and the contrast numbers come from the scripts, not from estimation.

## Inputs

- The brand attributes and visual direction, ideally from a brand brief. If there is no brief, ask what the brand should feel like and which competitors' colors to stay away from.
- Any color that must stay.
- Whether dark mode is in scope.

## Workflow

### 1. Choose the primary

Pick one hue for the primary and say which brand attribute it serves. If the brief has a competitor audit, check the choice against it: a primary that matches the category leader makes the brand harder to tell apart, unless following the category was a recorded decision.

Offer the user two or three candidates with the reasoning, and let them choose. This is their decision.

### 2. Generate the ramps

Run the ramp script for the primary and for a neutral tinted toward the same hue:

```bash
node scripts/color-ramp.mjs "#2563eb" --name primary
node scripts/color-ramp.mjs "#2563eb" --name neutral --neutral
```

Each ramp has 11 steps, 50 to 950, evenly spaced in OKLCH lightness. The step nearest the base color is replaced with the exact base, so the brand color itself is in the ramp. Add `--tokens` to print the ramp as design tokens.

If the brand needs an accent, generate a third ramp. Stop at one accent unless the brief gives a reason for more.

### 3. Assign roles

Follow [references/color-roles.md](references/color-roles.md). Map ramp steps to roles: text, muted text, background, surface, borders, action, action hover, and the semantic colors for success, warning and error. Colors are used through their roles, never by picking a step ad hoc.

### 4. Check every pairing

Fill in [assets/palette.template.json](assets/palette.template.json) with the colors and list every pairing the system allows, each with its use. Then run:

```bash
node scripts/contrast.mjs --palette palette.json
```

The script exits with code 1 if any pairing fails its requirement. Fix failures by moving to a darker or lighter ramp step, then run it again. Do not ship a palette with a failing pairing, and do not describe a palette as accessible without this output.

Requirements, from WCAG 2.2, are in [references/accessibility.md](references/accessibility.md).

For a single pair: `node scripts/contrast.mjs "#1a1a1a" "#faf8f4"`.

### 5. Derive dark mode

If dark mode is in scope, follow the dark mode section of [references/color-roles.md](references/color-roles.md): remap the roles onto the other end of the same ramps, then run the contrast check again on the dark pairings. Dark mode is a second mapping of the same ramps, not a second palette.

### 6. Write the usage rules

State, in a few lines:

- which color is for text and on which backgrounds
- whether the primary may be used as text, and from what size
- how much of a layout the accent may occupy
- the pairings that are forbidden because they fail contrast

## Output

1. The ramps, as hex values per step
2. The role mapping for light mode, and for dark mode if in scope
3. The contrast script output, pasted in full
4. The usage rules
5. `palette.json`, so the check can be repeated

## Quality checks

- [ ] The primary cites a brand attribute
- [ ] Every allowed text and background pairing is listed in `palette.json` and passes
- [ ] Semantic colors are not reused for decoration
- [ ] No meaning is carried by color alone; states also have an icon, label or shape
- [ ] Dark mode pairings were checked separately
- [ ] Hex values were copied from script output, not typed from memory
