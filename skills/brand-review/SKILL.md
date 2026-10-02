---
name: brand-review
description: Reviews a design, web page, stylesheet, document or asset against a brand's guidelines and reports each problem with the rule it breaks, its severity and the fix, including a scan for off-palette colors and a contrast check. Use when the user asks whether something is on-brand, wants a brand audit, brand consistency check or brand QA, or wants a piece reviewed before it is published.
license: MIT
compatibility: The bundled script needs Node.js 18 or later. It has no dependencies and needs no network access.
metadata:
  version: "0.1.0"
  author: aiudalabs
  requires: color-system
---

# Brand Review

Tell the author exactly what is off-brand, why it matters, and what to change. A review that says "this feels off" is not a review.

## Inputs

- The piece to review: files, a URL, a screenshot, or pasted content
- The brand guidelines, and the tokens or palette file if one exists

If there are no written guidelines, say so first. Without them you can only compare the piece against itself and against the brand's other material, and the report must be labeled as that. Do not invent rules and then enforce them.

## Workflow

### 1. Read the rules

Read the guidelines fully before looking at the piece. Note the version. Check the exceptions log: something that looks like a violation may be an approved exception.

### 2. Run the objective checks

For code and markup, scan for colors outside the palette:

```bash
node scripts/scan-colors.mjs --allowed brand.tokens.json src/
```

It lists each hex color that is not in the allowed file, with every file and line where it appears, and exits with code 1 if it finds any. `--allowed` accepts a tokens file or any JSON containing the approved hex values. Color functions such as `rgb()` are counted but not compared; check those by hand.

Pure white and pure black are reported unless the palette includes them. That is often a real finding: the brand's neutrals exist so those are not used.

For any text and background pairing that is not one of the approved pairings in the guidelines, measure the contrast with the contrast script of the `color-system` skill. WCAG 2.2 requires 4.5:1 for normal text and 3:1 for large text and for UI components.

### 3. Review section by section

Work through [references/review-checklist.md](references/review-checklist.md) in its order: attributes, color, typography, logo, imagery, layout, accessibility. The order matters. A piece that contradicts a brand attribute has a bigger problem than a wrong font weight, and fixing the big problem may remove the small ones.

For screenshots and images you cannot scan, read colors and type by eye and say that you did. Give the measured value when you have one and "appears to be" when you do not.

### 4. Classify each finding

| Severity | Meaning | Examples |
| --- | --- | --- |
| Blocker | Must be fixed before publishing | Wrong or altered logo; text that fails contrast; an old brand version; a font used without a license |
| Major | Clearly off-brand; fix in this round | Off-palette color; wrong typeface; logo inside its clear space |
| Minor | Small inconsistency | A spacing value off the scale; a slightly wrong weight |
| Taste | Not a rule; your opinion | "The accent would work better on the button than the heading" |

Keep taste separate and labeled. The author may ignore taste. They may not ignore a blocker.

### 5. Write the report

Fill in [assets/review-report-template.md](assets/review-report-template.md). For every finding give:

- **where**: file and line, or the element
- **what**: what you observed, with the measured value
- **rule**: the guideline section it breaks, quoted or cited
- **fix**: the smallest change that resolves it, with the exact value to use

Lead with the verdict and the count by severity.

### 6. Report gaps in the guidelines

If the piece raises a question the guidelines do not answer, that is a gap in the guidelines and not a fault in the piece. List it separately, for the brand owner.

## Output

The review report: verdict, findings by severity, taste notes, and gaps in the guidelines.

## Rules

- Cite a rule for every finding above "taste". If you cannot, it is taste.
- Do not fail a piece for breaking a rule the guidelines never stated.
- Report what is right as well, briefly, so the author knows what to keep.
- Be direct about the work and neutral about the person.

## Quality checks

- [ ] The guidelines version reviewed against is stated
- [ ] Every finding has a location, a cited rule and a concrete fix
- [ ] Measured values are given where measurement was possible, and estimates are labeled
- [ ] The exceptions log was checked
- [ ] Taste is separated from rule violations
- [ ] Gaps in the guidelines are listed for the owner
