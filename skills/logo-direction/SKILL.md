---
name: logo-direction
description: Develops a logo from brief to a tested concept, covering the choice of mark type, several simple SVG concepts to compare, a review sheet that tests each one small, in one color and reversed, and the usage rules for the chosen mark. Use when the user asks for a logo, logo ideas or concepts, a wordmark, monogram or symbol, a logo brief for a designer, or rules for how a logo may be used.
license: MIT
compatibility: The bundled script needs Node.js 18 or later and has no dependencies. Viewing the review sheet needs a web browser.
metadata:
  version: "0.2.0"
  author: aiudalabs
---

# Logo Direction

Take a logo from an idea to a concept that has been tested under real conditions, and write the rules for using it. Be clear about the limit: this skill produces simple geometric and typographic marks as SVG, and a brief for anything more elaborate. It does not replace a logo designer for illustrative marks, custom lettering or fine optical adjustment.

## Inputs

- The brand attributes and visual direction, ideally from a brand brief
- The exact name as it should be written, including capitalization
- Where the logo will appear first and smallest: browser tab, app icon, product, packaging, signage
- The brand colors and typefaces, if already decided
- Competitors' logos, or the visual audit from the brief

If there is no brief, ask what the brand should be known for and who it is for before drawing anything.

## Workflow

### 1. Choose the type of mark

Follow [references/mark-types.md](references/mark-types.md). Recommend one type with the reason, based on the length of the name, where the logo appears smallest, and what competitors use. [references/logo-styles.csv](references/logo-styles.csv) lists 55 style directions with what each suits and does not suit; use it as vocabulary when describing options, not as a menu to pick from at random.

### 2. Write the idea in one sentence

Before any drawing, state what the mark should express and which brand attribute that serves. "A bracket that turns a name into code, because the brand is technical and direct." If the idea cannot be said in a sentence, it will not survive at 16 pixels.

Record it in [assets/logo-brief-template.md](assets/logo-brief-template.md).

### 3. Draw three to five concepts

Write each concept as its own SVG file. Rules for the files:

- Use a `viewBox` and no fixed `width` or `height`, so the mark scales.
- Build from simple shapes and paths. Aim for a mark that could be described over the phone.
- Use at most two colors, taken from the brand palette.
- Make the concepts genuinely different ideas, not one idea in five colors.
- For text, use `<text>` with the brand typeface only if its license allows use in a logo, and say that the final file needs the text converted to outlines so it renders without the font installed.
- Draw a cut-out as a real hole, with a `mask` or an even-odd path, not as a light shape painted over a dark one. In one-color printing a painted light shape is ink too, and the review sheet shows it that way.
- Make a square symbol file and a full logo file for each concept. Small-size behavior is judged on the symbol.

Avoid the clichés of the category found in the competitor audit, and generic symbols that say nothing about this company: globes, light bulbs, abstract swooshes, generic gradients.

### 4. Test them

```bash
node scripts/logo-sheet.mjs concepts/*.svg --out logo-review.html
```

The sheet shows each concept in color on light and dark, as a one-color silhouette in dark and reversed, and at 64, 32 and 16 pixels high. Pass `--light` and `--dark` to use the brand's own background colors. If a concept uses a web font in `<text>`, pass the font's stylesheet with `--font-css <url>` so the sheet loads it.

Two results are expected and are not failures of the concept: a color version with dark parts disappears on the dark background, which tells you a reversed variant is required; and a wide logo is unreadable at 16 pixels high, which is why the symbol exists.

Look at the sheet yourself before showing it, and judge each concept:

- Does the silhouette alone still carry the idea?
- Is it recognizable at 16 pixels, or does it need a simplified small variant?
- Does it work reversed without a redraw?
- Could it be confused with a competitor's mark?

Drop or fix concepts that fail. Do not present a concept you already know fails.

### 5. Let the user choose

Show the sheet and your assessment of each concept: what it expresses, where it is strong, where it is weak. Recommend one. The choice is the user's. Expect a second round; refine the chosen concept and run the sheet again.

### 6. Produce the variants

For the chosen mark, deliver the variants the brand needs, one file each, named as described in [references/usage-rules.md](references/usage-rules.md):

- primary, in color
- reversed, for dark backgrounds
- one color dark, and one color light
- symbol only, if the mark has a symbol
- a simplified small-size version, if the test showed the primary fails when small

### 7. Write the usage rules

Follow [references/usage-rules.md](references/usage-rules.md). Set clear space and minimum size from this mark, by testing: find the size where it stops being legible on the review sheet and set the minimum above that.

### 8. State what remains

Before the logo is used as a trademark, the name and mark should be checked for conflicts with existing trademarks in the countries where the company operates. This skill does not do that check. Say so, and recommend a trademark search or a lawyer.

If the mark needs craft beyond simple shapes, hand the completed brief to a designer.

## Output

1. The completed logo brief
2. The concept SVG files and the review sheet
3. The chosen mark's variant files
4. The usage rules, ready to paste into the brand guidelines
5. What remains: trademark check, outlining text, any designer work

## Quality checks

- [ ] The idea is stated in one sentence and cites a brand attribute
- [ ] At least three different ideas were tested, not variations of one
- [ ] Every presented concept was checked on the review sheet first
- [ ] The chosen mark works in one color and reversed
- [ ] Small-size behavior was tested, and a simplified variant exists if needed
- [ ] Clear space and minimum size come from testing this mark
- [ ] The font license was checked if the mark uses a typeface
- [ ] The user was told that a trademark check is still needed
