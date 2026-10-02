---
name: typography-system
description: Chooses brand typefaces and builds the type system around them, covering selection against brand attributes, pairing, a modular type scale, weights, fallback stacks, language coverage and a license check for every font. Use when the user asks for brand fonts, a font pairing, a typeface recommendation, a type scale, heading and body sizes, or whether a font is licensed for their use.
license: MIT
compatibility: The bundled script needs Node.js 18 or later. It has no dependencies and needs no network access.
metadata:
  version: "0.1.1"
  author: aiudalabs
---

# Typography System

Deliver a type system a team can apply without asking questions: which family for what, at which sizes and weights, with which fallback, and proof that each font may be used the way the brand intends.

## Inputs

- The brand attributes and visual direction, ideally from a brand brief
- Languages and scripts the brand must support
- Where type will be used: website, app, documents, print, the logo
- Whether paid fonts are allowed

## Workflow

### 1. Decide the structure

Start from one family. Add a second only when a brand attribute asks for a contrast the first cannot provide. Follow [references/selection-and-pairing.md](references/selection-and-pairing.md).

### 2. Shortlist candidates

Start from the brief, not from a list. Take the typeface structure the visual direction asks for, using the table in [references/selection-and-pairing.md](references/selection-and-pairing.md), and name families with that structure that are available under the user's budget.

[references/font-pairings.csv](references/font-pairings.csv) lists 74 pairings of freely available fonts by mood and typical industry. Use it to widen the shortlist, for example with `grep -i "editorial" references/font-pairings.csv`. It is organized by what each pairing is commonly used for, so it mostly tells you what a category already looks like. If the brief says to break a category convention, a pairing listed as typical for that category is the wrong pick.

Show the candidates set in the brand's own words and colors, at heading, body and table sizes, with accented characters from every language in the brief. A rendered comparison is worth more than a description.

Present two or three candidates, each tied to a brand attribute, and let the user choose.

### 3. Verify each chosen font

For every font, confirm and record:

- **License.** Follow [references/font-licensing.md](references/font-licensing.md). Read the font's actual license at its source and record the license name and the URL where you read it. Do not rely on the pairing table or on memory.
- **Languages.** The font covers every language and script in the brief, including accented characters.
- **Weights.** At least regular and bold exist for body text, and the weights the scale needs for headings.
- **Numerals.** Tabular figures are available if the brand shows prices, tables or dashboards.

If you cannot verify one of these, say which, and do not present the font as cleared.

### 4. Build the scale

```bash
node scripts/type-scale.mjs --base 16 --ratio 1.25
```

Choose the ratio from the brand direction: a gentle ratio (1.125 to 1.2) for dense, product-like interfaces, a steeper one (1.333 or more) for editorial or expressive brands. Add `--json` for structured output.

Keep five to seven steps. Assign each step to a job: caption, body, lead, and the heading levels.

### 5. Set the details

For each step define the family, weight, size, line height and letterspacing. The line heights the script prints are starting values: long text needs more leading, large display text needs less. Adjust by eye and record the final numbers.

Define the fallback stack for each family, ending in a generic family such as `sans-serif`, so text stays readable before the web font loads and where it cannot load.

### 6. Write the usage rules

- Which family and weight for headings, body text, captions, numbers and code
- Maximum line length for body text
- Whether all caps is allowed, and where
- What not to do: the two or three mistakes most likely with these particular fonts

## Output

1. The chosen families, each with the attribute it serves
2. The verification table: license and source URL, language coverage, weights, numerals
3. The type scale with family, weight, size, line height and letterspacing per step
4. Fallback stacks
5. Usage rules

## Quality checks

- [ ] Every font has a recorded license and the URL where it was read
- [ ] Every language in the brief is covered
- [ ] No more than two families, plus a monospace if code is shown
- [ ] Every step of the scale has a named job
- [ ] Scale values were copied from the script output
- [ ] Each family has a fallback stack ending in a generic family
