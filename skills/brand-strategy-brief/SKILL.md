---
name: brand-strategy-brief
description: Turns a company or product idea into a brand brief that visual work can be built on, covering audience, positioning, three brand attributes with what each rules out, a visual audit of competitors, and the visual direction that follows. Use when the user is starting a brand or rebrand, asks for a brand brief, brand strategy, brand attributes or brand personality, or wants colors, fonts or a logo and has no written brief yet.
license: MIT
metadata:
  version: "0.1.0"
  author: aiudalabs
---

# Brand Strategy Brief

Produce the brief that every later identity decision is checked against. A color or a typeface is right or wrong only in relation to this document, so it comes first and it stays short.

## Inputs

Ask for what is missing, in one message. Do not invent any of it.

1. What the company or product does, in one sentence
2. Who it is for, as specifically as the user can say
3. Two to five competitors or alternatives, including "doing nothing" if that is the real competitor
4. Fixed constraints: an existing name, logo, color or font that must stay
5. Where the brand will appear first: website, mobile app, pitch deck, packaging, print

If the user cannot name the audience or the competitors, stop and help them decide that first. A brief built on a guessed audience produces an identity for nobody.

## Workflow

### 1. Fill in the facts

Start [assets/brand-brief-template.md](assets/brand-brief-template.md) with what the user has confirmed. Mark every unknown as "Open". Do not fill gaps with plausible text.

### 2. Audit the competitors visually

Follow [references/visual-competitor-audit.md](references/visual-competitor-audit.md). Look at each competitor's real site or product when a web tool is available. Record what you observed and the URL. If you cannot look, say so and label the audit as based on the user's description.

The audit ends with two lists: the conventions of the category, and the territory nobody has claimed.

### 3. Choose three brand attributes

Propose three attributes, such as "precise, warm, direct". For each one write:

- what it means for this company, in one sentence
- what it rules out, concretely

An attribute that rules nothing out is decoration. "Innovative", "modern" and "trustworthy" almost always fail this test. Replace them.

Check the set against the audit. If all three attributes also describe the category leader, the brand will not be told apart. At least one attribute should pull away from the category.

### 4. Translate attributes into visual direction

Follow [references/attributes-to-visual-decisions.md](references/attributes-to-visual-decisions.md). For each attribute, state the direction it implies for color, typography, shape and imagery, and what it excludes. This is direction, not final choices: "low-saturation, warm neutrals; no pure black" and not a hex value.

### 5. Decide: follow or break the category

For each convention found in the audit, record one decision: follow it, because buyers need the reassurance, or break it, because standing out matters more here. Give the reason. This section stops later arguments about whether the brand "looks like a fintech".

### 6. Confirm with the user

Present the attributes and the follow-or-break decisions and get explicit confirmation before closing the brief. These two sections are the user's decisions, not yours.

## Output

The completed brief, as one Markdown file named `brand-brief.md`. One to two pages.

## Quality checks

- [ ] Every fact in the brief was stated by the user or observed at a recorded URL
- [ ] Each attribute has a "rules out" line that would reject a real design option
- [ ] At least one attribute separates the brand from the category leader
- [ ] The competitor audit says how it was done: observed, or from the user's description
- [ ] Open questions are listed, not hidden
- [ ] The user confirmed the attributes

## Common mistakes

- Choosing colors or fonts in the brief. The brief sets direction and limits.
- Writing attributes the founder likes instead of attributes the audience needs to perceive.
- Describing competitors from memory. Their sites change; look, or say you did not.
- Treating "color psychology" lists as evidence. What a color signals depends on the category and the culture, which is why the audit comes first.
