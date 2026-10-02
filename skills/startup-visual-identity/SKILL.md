---
name: startup-visual-identity
description: Builds a first visual identity for a startup or new product, covering brand attributes, color palette, typography, logo direction and design tokens, and delivers a short brand guide. Use when the user asks for a brand identity, visual identity, brand guide, color palette, font pairing or logo direction for a new company, product or side project.
license: MIT
metadata:
  version: "0.1.0"
  author: aiudalabs
---

# Startup Visual Identity

Produce a small, coherent visual identity that a founder can apply the same day. The output is a brand guide plus a design-token file, not final logo artwork.

## Before you start

You need four facts. If any is missing, ask for it. Do not invent it.

1. What the product does, in one sentence.
2. Who it is for.
3. Two or three competitors or alternatives.
4. Any fixed constraints: an existing logo, color or font that must stay.

Capture the answers in [assets/brand-brief-template.md](assets/brand-brief-template.md).

## Workflow

### 1. Define brand attributes

Pick three attributes that describe how the brand should feel, such as "precise, warm, direct". For each one, write what it means and what it rules out. Attributes that rule nothing out are too vague, so replace them.

Every later decision must cite one of these attributes.

### 2. Build the color palette

Follow [references/color-systems.md](references/color-systems.md). Deliver:

- One primary color, with the attribute it expresses
- One accent color, used sparingly for emphasis and calls to action
- A neutral scale for text, borders and backgrounds
- Semantic colors: success, warning, error

Then check every text and background pairing you intend to allow:

```bash
node scripts/contrast-check.mjs "#1A1A1A" "#FAF8F4"
```

The script prints the contrast ratio and the WCAG levels it passes, and exits with code 1 when the pair fails AA for normal text. Replace any failing pair before continuing.

### 3. Choose typography

Follow [references/typography-pairing.md](references/typography-pairing.md). Deliver one family for headings and one for body text (they may be the same family), a type scale, and the weights in use. Confirm each font's license allows the intended use before recommending it.

### 4. Give logo direction

Describe the logo instead of drawing it:

- Type of mark: wordmark, lettermark, symbol plus wordmark
- The idea it should carry, tied to a brand attribute
- Constraints: minimum size, clear space, single-color version, what to avoid

### 5. Write the design tokens

Fill in [assets/design-tokens.template.json](assets/design-tokens.template.json) with the chosen colors, fonts and scale. Leave no placeholder value in the delivered file.

### 6. Assemble the brand guide

Write a single Markdown document with these sections, in order:

1. Brand attributes, with what each rules out
2. Color palette, with hex values, usage rules and the contrast results
3. Typography, with families, scale, weights and licenses
4. Logo direction
5. Do and do not: three concrete examples of each
6. Open questions for the founder

## Quality checks

Before delivering, confirm:

- [ ] Each color and font choice cites a brand attribute
- [ ] All allowed text and background pairings pass WCAG AA
- [ ] The token file has no placeholder values left
- [ ] Nothing in the guide was assumed without the user confirming it
- [ ] The guide fits on roughly two pages; cut anything a founder will not use this month

## Common mistakes

- Starting with colors before the attributes exist
- Shipping more than one accent color
- Recommending a font without checking its license
- Describing a palette as accessible without running the contrast check
