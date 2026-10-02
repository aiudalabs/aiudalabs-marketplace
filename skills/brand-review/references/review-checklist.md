# Brand review checklist

Adapted from the `brand` skill in ui-ux-pro-max (MIT, Next Level Builder). See `THIRD_PARTY_NOTICES.md` in this skill.

Work through the sections in order. For each item, the guidelines are the authority: a "no" is a finding only if the guidelines state the rule.

## 1. Attributes

- [ ] The piece reads as the brand's attributes. Name which ones, and where.
- [ ] Nothing in it is something an attribute explicitly rules out.
- [ ] It suits the audience and the place it will appear.

## 2. Color

- [ ] Every color comes from the palette. For code, run `scripts/scan-colors.mjs`.
- [ ] Colors are used in their roles: text colors for text, action color for actions.
- [ ] The accent is used as sparingly as the guidelines require.
- [ ] Semantic colors (success, warning, error) are not used for decoration.
- [ ] Each text and background pairing is an approved pairing, or passes contrast when measured.
- [ ] In dark mode, the dark role map is used, not inverted light colors.

## 3. Typography

- [ ] Only the brand typefaces are used, each in its assigned role.
- [ ] Weights are among the approved weights.
- [ ] Sizes come from the type scale.
- [ ] Line height and line length follow the guidelines.
- [ ] All caps and letterspacing appear only where allowed.
- [ ] Fallback fonts are declared for web and product pieces.

## 4. Logo

- [ ] It is the current version, from the official files, not redrawn or typed out.
- [ ] The right variant is used for the background.
- [ ] Clear space is respected.
- [ ] It is at or above the minimum size.
- [ ] It is not stretched, rotated, recolored or given effects.
- [ ] It is clearly visible on its background.
- [ ] Co-branding follows the partner rules.

## 5. Imagery and icons

- [ ] Photos and illustrations match the described style and subjects.
- [ ] Icons come from the approved set, at one consistent style and weight.
- [ ] Images are sharp at the size shown, with no visible upscaling.
- [ ] Every image is licensed for this use, and credited where required.

## 6. Layout and shape

- [ ] Spacing values come from the spacing scale.
- [ ] Corner radius and shadows follow the guidelines.
- [ ] The hierarchy is clear: one primary element per view.
- [ ] The piece looks like a sibling of the brand's other material.

## 7. Accessibility

Requirements from WCAG 2.2, <https://www.w3.org/TR/WCAG22/>.

- [ ] Normal text has a contrast ratio of at least 4.5:1 (1.4.3).
- [ ] Large text, at least 18 point or 14 point bold, has at least 3:1 (1.4.3).
- [ ] UI components and meaningful graphics have at least 3:1 against what surrounds them (1.4.11).
- [ ] Nothing is conveyed by color alone (1.4.1).
- [ ] Meaningful images have a text alternative (1.1.1).

## 8. Files and delivery

- [ ] File names follow the naming convention.
- [ ] Formats suit the use: SVG for logos, no JPG logos.
- [ ] Pixel sizes match what the platform asks for.

## Common findings and fixes

| Finding | Fix |
| --- | --- |
| Hex color close to a palette color but not equal | Replace with the token for the nearest role |
| Pure black text or pure white background where the brand uses tinted neutrals | Replace with the text and background tokens |
| Logo typed in the brand font | Replace with the official logo file |
| Logo crowded by text | Restore clear space |
| A weight that is not in the approved list | Use the nearest approved weight |
| Muted text that fails contrast | Use the muted text token on an approved background, or a darker step |
| Old logo or old color | Replace from the current files; check where else the old one is used |

## Channel audit

For a review of the whole brand, not one piece, check each place it appears:

| Channel | Check |
| --- | --- |
| Website | Homepage, product pages, footer, favicon, share image |
| Product | Logo, colors and type in the interface; app icon |
| Social profiles | Avatar, cover image, bio |
| Email | Signature, templates, automated messages |
| Documents and decks | Templates, cover pages |
| Printed material | Cards, signage, packaging |

Record the guideline version each channel currently matches. Channels left on an old version are the usual source of inconsistency.
