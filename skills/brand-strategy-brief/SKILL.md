---
name: brand-strategy-brief
description: Turns a company or product idea into a brand brief that visual work can be built on, covering audience, positioning, three brand attributes with what each rules out, a visual audit of competitors, and the visual direction that follows. Use when the user is starting a brand or rebrand, asks for a brand brief, brand strategy, brand attributes or brand personality, or wants colors, fonts or a logo and has no written brief yet.
license: MIT
metadata:
  version: "0.2.0"
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

If the user cannot name the audience, stop and help them decide that first. A brief built on a guessed audience produces an identity for nobody.

If the user cannot name competitors, research them: search for companies with the same offer for the same buyer, propose a list of about five with the source of each, and ask the user to confirm or correct it. Record in the brief that the list came from research and whether it was confirmed.

## Workflow

### 1. Fill in the facts

Start [assets/brand-brief-template.md](assets/brand-brief-template.md) with what the user has confirmed. Mark every unknown as "Open". Do not fill gaps with plausible text.

### 2. Audit the competitors visually

Follow [references/visual-competitor-audit.md](references/visual-competitor-audit.md). Look at each competitor's real site or product when a web tool is available. A screenshot of the homepage is the best evidence, because a text summary of a page says nothing about its colors or type; save the screenshots beside the brief. Record what you observed and the URL. If you cannot look, say so and label the audit as based on the user's description.

The audit ends with two lists: the conventions of the category, and the territory nobody has claimed.

### 3. Choose three brand attributes

Propose three attributes, such as "precise, warm, direct". For each one write:

- what it means for this company, in one sentence
- what it leans away from, concretely

An attribute that points nowhere is decoration. "Innovative", "modern" and "trustworthy" almost always fail this test. Replace them.

Two checks on the set:

- **At least one attribute is about how the brand feels**, such as warm, bold, playful, calm or generous. A set made only of virtues, such as rigorous, direct and practical, describes a good supplier and produces an identity with no appeal. People choose with feeling first.
- **The "leans away from" lines are a direction, not a ban list.** Three attributes that each forbid several things add up to forbidding almost everything expressive. If the combined list rules out color, emphasis, contrast and warmth, rewrite it.

If the brand already has an identity, start from it: write the attributes that the current identity expresses, then ask whether they are still the right ones. Do not design attributes in a vacuum and then discover that they contradict what the owner likes.

### 4. Translate attributes into visual direction

Follow [references/attributes-to-visual-decisions.md](references/attributes-to-visual-decisions.md). For each attribute, state the direction it implies for color, typography, shape and imagery, and what it excludes. This is direction, not final choices: "low-saturation, warm neutrals; no pure black" and not a hex value.

### 5. Decide: follow or break the category

For each convention found in the audit, record one decision: follow it, or break it, with the reason.

Differentiation is a tool, not the goal. Break a convention when it is the weakest part of the category or when the brand is being confused with a competitor. Keep a trait that suits the brand even when competitors share it. "Most competitors use a warm accent" is a fact about the category; it is not a reason to give up a warm accent that the brand wears well. The cost of a wrong "break" is an identity that is unlike its competitors and also unlike itself.

### 6. Confirm with the user

Present the attributes and the follow-or-break decisions and get explicit confirmation before closing the brief. These two sections are the user's decisions, not yours.

When you offer options, do not steer. Describe each fairly, include at least one option that keeps what the brand already does, and say so when your recommendation would make the identity plainer.

## Output

The completed brief, as one Markdown file named `brand-brief.md`. One to two pages.

## Quality checks

- [ ] Every fact in the brief was stated by the user or observed at a recorded URL
- [ ] Each attribute has a "leans away from" line that points somewhere real
- [ ] At least one attribute is about feeling, and the combined list still leaves room for color, contrast and warmth
- [ ] For an existing brand, the attributes were checked against what the current identity already expresses
- [ ] Every "break" decision has a reason beyond "competitors do it"
- [ ] The competitor audit says how it was done: observed, or from the user's description
- [ ] Open questions are listed, not hidden
- [ ] The user confirmed the attributes

## Common mistakes

- Choosing colors or fonts in the brief. The brief sets direction; the look is chosen later, by comparing whole pages.
- Writing attributes the founder likes instead of attributes the audience needs to perceive.
- Describing competitors from memory. Their sites change; look, or say you did not.
- Treating "color psychology" lists as evidence. What a color signals depends on the category and the culture, which is why the audit comes first.
