---
name: color-system
description: Builds a complete brand color system from one or two chosen colors, covering perceptually even tonal ramps, tinted neutrals, semantic and role colors, dark mode, and a WCAG 2.2 contrast check of every text and background pairing. Use when the user asks for a color palette, brand colors, color scheme, shades or tints of a color, dark mode colors, or wants to check the contrast or accessibility of colors.
license: MIT
compatibility: The bundled scripts need Node.js 18 or later. They have no dependencies and need no network access.
metadata:
  version: "0.3.0"
  author: aiudalabs
---

# Color System

Deliver a palette where every color has a job and every text pairing is proven readable. The ramps and the contrast numbers come from the scripts, not from estimation.

## Inputs

- The brand attributes and visual direction, ideally from a brand brief. If there is no brief, ask what the brand should feel like and which competitors' colors to stay away from.
- Any color that must stay.
- Whether dark mode is in scope.

## Two ways in

**The look is already chosen**, from an existing identity or a chosen visual direction. Then this skill does not choose colors. Take the colors as given, build ramps around them (step 2), assign roles (step 3), check the pairings (step 4) and repair failures with the smallest change:

```bash
node scripts/contrast-fix.mjs "#8a8a92" "#faf8f4" --use text
```

It keeps the hue and moves only the lightness until the pair passes, and reports how far it moved. Use `--adjust background` to move the background instead, for example to darken a button under white text. Show the before and after side by side. If a repair would visibly change the look, show both and let the user decide; a color that fails for body text may still be allowed for large text or decoration, recorded as a usage rule.

Do not replace a chosen color with a different hue because it scores better.

**There is no look yet.** Then do not pick a palette in isolation. Colors are chosen as part of whole-page directions, compared by eye. Use this skill to build and check the palette of the direction that wins. The steps below describe the full procedure, for the cases where a palette is the only thing asked for.

## Workflow

### 1. Choose the primary

Pick one hue for the primary and say which brand attribute it serves. If the brief has a competitor audit, check the choice against it: a primary that matches the category leader makes the brand harder to tell apart, unless following the category was a recorded decision.

Offer the user two or three candidates with the reasoning, and let them choose. This is their decision.

People choose colors by looking at them, so show the candidates applied, not as a list of hex values. For each candidate, generate its ramps (step 2), map the starting roles (step 3) into a `palette.json` (step 4), and build a side-by-side preview:

```bash
node scripts/palette-preview.mjs candidate-a.palette.json candidate-b.palette.json --out palette-preview.html --heading "A real headline from the brand"
```

The page shows each candidate on the same sample, with its swatches and the contrast of its declared pairs, failures included. Give the user the file to open in a browser. To look at it yourself, render it to an image with whatever screenshot or rendering tool is available.

### 2. Generate the ramps

Run the ramp script for the primary and for the neutral:

```bash
node scripts/color-ramp.mjs "#2563eb" --name primary
node scripts/color-ramp.mjs "#2563eb" --name neutral --neutral
```

With `--neutral` the script keeps only the hue of the color you pass and builds a near-grey ramp tinted toward it. Decide the neutral's temperature from the brief, separately from the primary: pass the primary for neutrals that lean toward the brand color, or any color with the hue you want, such as a tan for warm paper-like neutrals or a slate blue for cool ones. A neutral tinted toward a saturated primary can make the page background visibly colored, so look at step 50 before accepting it.

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
6. The preview page the user chose from

## Quality checks

- [ ] The primary cites a brand attribute
- [ ] Every allowed text and background pairing is listed in `palette.json` and passes
- [ ] Semantic colors are not reused for decoration
- [ ] No meaning is carried by color alone; states also have an icon, label or shape
- [ ] Dark mode pairings were checked separately
- [ ] Hex values were copied from script output, not typed from memory
