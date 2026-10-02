# Color systems

How to build the palette in step 2 of the workflow.

## Structure

| Role | Count | Purpose |
| --- | --- | --- |
| Primary | 1 | The color people remember. Used for the logo and key surfaces. |
| Accent | 1 | Emphasis and calls to action. Used sparingly. |
| Neutrals | 5 to 9 steps | Text, borders, backgrounds. Does most of the work. |
| Semantic | 3 | Success, warning, error. Never reused for decoration. |

## Choosing the primary

1. List the primary colors of the competitors from the brief. A primary that matches the category leader makes the brand harder to tell apart.
2. Pick a hue that expresses one brand attribute and write down which one.
3. Test it at small sizes and as a full-bleed background. A color that only works in one of those is a poor primary.

## Building neutrals

Pure grey often looks lifeless beside a saturated primary. Tint the neutral scale slightly toward the primary hue, or toward warm or cool depending on the attributes.

Define the steps by lightness, from near-white to near-black. Name them by number (`neutral-50` to `neutral-900`), not by use, so the scale survives a redesign.

## Accent

The accent should contrast with the primary in hue or in lightness. If it competes with the primary for attention, reduce its saturation or its use, not the primary's.

## Contrast requirements

These thresholds come from WCAG 2.x success criteria 1.4.3 and 1.4.6:

| Level | Normal text | Large text |
| --- | --- | --- |
| AA | 4.5:1 | 3:1 |
| AAA | 7:1 | 4.5:1 |

Large text means at least 18pt, or 14pt bold.

Check each pairing with `scripts/contrast-check.mjs`. Record the ratio next to the pairing in the brand guide.

## Usage rules to write down

- Which color is allowed for body text, and on which backgrounds
- Whether the primary may be used for text, and at what minimum size
- The pairings that are forbidden because they fail contrast
- How dark mode maps to the same scale, if dark mode is in scope
