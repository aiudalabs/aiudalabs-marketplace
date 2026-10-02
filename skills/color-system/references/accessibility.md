# Color accessibility requirements

The numbers below come from the Web Content Accessibility Guidelines (WCAG) 2.2, a W3C Recommendation: <https://www.w3.org/TR/WCAG22/>.

## Contrast ratios

| Success criterion | Level | Applies to | Minimum ratio |
| --- | --- | --- | --- |
| 1.4.3 Contrast (Minimum) | AA | Normal text | 4.5:1 |
| 1.4.3 Contrast (Minimum) | AA | Large text | 3:1 |
| 1.4.6 Contrast (Enhanced) | AAA | Normal text | 7:1 |
| 1.4.6 Contrast (Enhanced) | AAA | Large text | 4.5:1 |
| 1.4.11 Non-text Contrast | AA | UI components and graphical objects | 3:1 |

Large text means at least 18 point, or 14 point bold.

`scripts/contrast.mjs` uses these values. Its `use` field maps to them:

| `use` | Requirement |
| --- | --- |
| `text` | 4.5:1 |
| `large-text` | 3:1 |
| `ui` | 3:1 |
| `text-aaa` | 7:1 |

Target AA for every pairing. Target AAA for body text where the brand allows it.

## Exceptions that matter for brand work

- Text that is part of a logo or brand name has no contrast requirement under 1.4.3. The logo can use the brand color even where that color would fail as body text. A logo that cannot be seen is still a bad logo, so check it anyway.
- Inactive (disabled) components and purely decorative elements are exempt.

## Color is not enough

Success criterion 1.4.1 Use of Color (Level A) requires that color is not the only way information is conveyed. Error states, required fields, chart series and links inside text need a second cue: an icon, a label, an underline, a pattern.

## What this skill does not check

- Color vision deficiency simulation. The contrast ratio catches lightness problems, which are the most common ones, but two colors can have enough contrast with the background and still be indistinguishable from each other. Check chart and status colors with a simulator.
- APCA. It is the contrast method being explored for WCAG 3, which is still a draft and has not settled on an algorithm. It is not part of WCAG 2.2, so this skill does not use it as a pass or fail test.
