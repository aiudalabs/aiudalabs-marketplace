# Selecting and pairing typefaces

## Start with one family

A single family with enough weights covers most needs of a new brand and is hard to get wrong. It also loads faster and costs less to license. Add a second family only when a brand attribute calls for a contrast the first cannot give.

## Choosing against the brief

Match the structure of the typeface to the visual direction in the brief, not to a mood list.

| Structure | Tends to read as | Watch for |
| --- | --- | --- |
| Geometric sans | Clean, modern, neutral | The default in many software categories, so it rarely differentiates |
| Humanist sans | Approachable, readable | Can feel soft for brands that need authority |
| Grotesque sans | Plain, confident, utilitarian | Many look alike; pick one with a detail you can point to |
| Serif | Established, editorial, considered | Thin strokes can break down at small sizes on screens |
| Slab serif | Sturdy, direct | Heavy in long text |
| Monospace | Technical, exact | Tiring as body text; use for code, data and accents |
| Script or display | Expressive, distinctive | Headlines only; check legibility at the smallest size it will appear |

These are tendencies within a culture and a category, not laws. The competitor audit in the brief tells you what is already common in this category.

## Pairing two families

- **Contrast clearly.** Serif with sans, or a display face with a plain text face. Two similar sans-serifs look like a mistake.
- **Give each a job.** One for headings, one for body text. Do not mix them inside a paragraph.
- **Match proportions.** Similar x-heights keep mixed lines from looking uneven.
- **Let one lead.** If both have strong personalities they compete. Pair a distinctive face with a quiet one.

A third family is justified only for code or numeric data, and it should be a monospace.

## Checks before committing

| Check | Why |
| --- | --- |
| Smallest size in real use | Body and caption text must stay readable at the smallest size in the scale, on a phone |
| Heaviest and lightest weight | Very light weights disappear on low-contrast backgrounds |
| Real content | Test with the brand's own words, including its longest heading and its numbers |
| Accents and special characters | Check every language in the brief; a missing glyph falls back to another font mid-word |
| The logo | If the logo is typeset in one of the families, confirm the license allows use in a logo |
| Variable font availability | One variable file can replace several static weights, which helps performance |

## Line length and spacing

- Long lines are hard to track from one line to the next. Keep body text to a comfortable measure, commonly in the range of 45 to 75 characters per line, and set a maximum width.
- Tighten letterspacing slightly on large display sizes and leave body text at the font's default.
- Add letterspacing to all-caps text, and keep all caps for short labels.

## Loading on the web

- Load only the weights the scale uses.
- Set `font-display: swap`, so text is visible while the font loads.
- Choose a fallback with similar proportions, so the layout does not jump when the web font arrives.
- Self-host when privacy rules or performance require it, after checking the license allows it.
