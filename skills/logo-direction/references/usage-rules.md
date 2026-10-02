# Logo usage rules

Adapted from the `brand` skill in ui-ux-pro-max (MIT, Next Level Builder). See `THIRD_PARTY_NOTICES.md` in this skill.

The numbers in a brand's logo rules come from testing that brand's mark. This guide gives the structure and how to find each value.

## Variants and file names

One file per variant. Lowercase, hyphens, no version words.

| Variant | File name | Use when |
| --- | --- | --- |
| Primary, color | `{brand}-logo-color.svg` | Default, on light backgrounds |
| Reversed | `{brand}-logo-reversed.svg` | On dark backgrounds and on the brand color |
| One color, dark | `{brand}-logo-mono-dark.svg` | Light backgrounds where color is not available |
| One color, light | `{brand}-logo-mono-light.svg` | Dark backgrounds where color is not available |
| Horizontal or stacked | `{brand}-logo-horizontal-color.svg`, `{brand}-logo-stacked-color.svg` | When both layouts exist |
| Symbol only | `{brand}-symbol-color.svg` | Avatars, app icons, small spaces |
| Small-size symbol | `{brand}-symbol-small.svg` | Browser tab icon and similar |

SVG is the master. Export PNG only where SVG is not accepted.

## Clear space

Clear space is the empty margin kept around the logo so nothing crowds it.

Define it with a unit taken from the logo, so it scales with the logo: the height of the symbol, or the height of a letter in the wordmark. A common starting point is one such unit on every side. Test it by placing the logo beside text and beside another logo, and increase it if the logo looks cramped.

Write the rule as: "Keep clear space equal to [the unit] on all sides."

## Minimum size

Find it by testing. Reduce the logo until a letter closes up or a detail disappears, then set the minimum one step above that. Test on a real screen at 1x, and on paper if the brand will be printed, because print holds less detail than a screen for thin lines.

| Variant | Screen (px wide) | Print (mm wide) |
| --- | --- | --- |
| Full logo | [tested value] | [tested value] |
| Symbol | [tested value] | [tested value] |

Below the minimum for the full logo, switch to the symbol.

## Backgrounds

| Background | Variant |
| --- | --- |
| White or light neutral | Primary color, or one color dark |
| Dark neutral | Reversed, or one color light |
| Brand color | Reversed or one color light, after checking it is clearly visible |
| Photograph or pattern | Place the logo on a quiet area, or on a solid container. Never straight onto a busy area. |

Text inside a logo is exempt from the WCAG contrast requirement, but a logo people cannot see has failed anyway. Check each variant against each approved background.

## Misuse

State these in the guidelines, with a picture of each if possible:

- Do not stretch, squash, rotate or skew the logo.
- Do not change its colors outside the approved variants.
- Do not add shadows, outlines, gradients or other effects.
- Do not rearrange, crop or remove parts of it.
- Do not rebuild it by typing the name in the brand font.
- Do not place it on a background where it is hard to see.
- Do not use an old version.

Add the misuse cases specific to this mark, such as separating a symbol that only makes sense with its wordmark.

## Co-branding

When the logo appears beside a partner's:

1. Give both logos equal visual weight. Match optical size, which is not always the same height.
2. Keep each logo's clear space.
3. Separate them with space or a thin divider.
4. Use each logo in its own approved colors.

## Formats

| Use | Format |
| --- | --- |
| Web and product | SVG |
| Where SVG is not accepted | PNG with transparency |
| Print | Vector PDF from the designer, with text converted to outlines |
| Photographs | Never save a logo as JPG: it has no transparency and blurs edges |

## Before the logo is final

- Convert text to outlines in the master files, so the logo does not depend on an installed font.
- Check the font license allows use in a logo.
- Check the name and mark against existing trademarks in the countries where the company operates. This needs a trademark search or a lawyer.
