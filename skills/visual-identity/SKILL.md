---
name: visual-identity
description: Builds a complete visual identity for a company, startup or product from start to finish, running strategy brief, color system, typography system, design tokens and brand guidelines in order with an approval gate after each. Use when the user asks for a full brand identity, visual identity, branding for a new company or product, or a rebrand, and wants the whole thing and not one piece.
license: MIT
metadata:
  version: "0.1.0"
  author: aiudalabs
  requires: brand-strategy-brief color-system typography-system design-tokens brand-guidelines
---

# Visual Identity

Run the whole identity process in order. Each stage is a separate skill; this one sequences them, carries decisions from one stage to the next, and stops for the user's approval between stages.

If the user wants only one piece, such as a palette or a font pairing, use that skill directly instead of this one.

## Stages

| # | Stage | Skill | Produces | Gate |
| --- | --- | --- | --- | --- |
| 1 | Strategy | `brand-strategy-brief` | `brand-brief.md` | User confirms attributes and follow-or-break decisions |
| 2 | Color | `color-system` | Ramps, roles, `palette.json`, contrast results | User chooses the primary; all pairings pass |
| 3 | Typography | `typography-system` | Families, scale, license table | User chooses the families; licenses verified |
| 4 | Logo direction | this skill, see below | Written logo direction | User confirms the direction |
| 5 | Tokens | `design-tokens` | `brand.tokens.json`, `brand.css` | Validator reports zero errors |
| 6 | Guidelines | `brand-guidelines` | `brand-guidelines.md` | User approves the guide |

## How to run it

### Before starting

1. Ask where the files should go. Default to a `brand/` folder in the current project.
2. Check for existing material: a brief, a logo, colors or fonts already in use. Existing decisions are inputs, not things to redo. Skip a stage whose output already exists and is approved, after confirming with the user.
3. Tell the user the six stages and that you will stop after each one.

### For each stage

1. Follow the stage's skill completely. Do not improvise a shorter version of it.
2. Pass forward what earlier stages decided. Stage 2 and 3 take the attributes and visual direction from the brief. Stage 5 takes the values from stages 2 and 3. Stage 6 takes everything.
3. Save the stage's output to the brand folder.
4. Show the user the result and the decision you need from them. Wait for it. Do not start the next stage on an assumed yes.

If the user changes an earlier decision later, go back: redo that stage and every stage that used its output. A new primary color means new ramps, a new contrast check, new tokens and an updated guide.

### Stage 4: logo direction

Drawing a logo is outside this skill. Give direction that a designer or a later logo process can act on, and record it for the guide:

- **Type of mark**: wordmark, lettermark, symbol with wordmark, or emblem, and why this type suits where the brand will appear first
- **The idea**: the one thing the mark should express, tied to a brand attribute
- **Constraints**: it must work in one color, reversed on a dark background, and at small sizes such as a browser tab icon
- **Typography**: whether the wordmark uses a brand typeface, and if so, that the font license allows use in a logo
- **Avoid**: the clichés of the category found in the competitor audit

If the user already has a logo, record its variants and files instead, and check the new palette against it.

Be clear with the user that this stage produces a brief for a logo, not a logo.

## Final delivery

When all six gates have passed, confirm the brand folder contains:

```
brand/
├── brand-brief.md
├── palette.json
├── brand.tokens.json
├── brand.css
└── brand-guidelines.md
```

Then give a short summary: the three attributes, the primary color, the typefaces, and the open questions that remain. List what was not done: final logo artwork, and production assets such as icons and social images.

## Rules

- Do not skip the brief, even when the user asks to "just pick colors". Without attributes there is nothing to judge a color against. If they insist, use `color-system` directly and say what is missing.
- Do not invent facts about the company, its audience or its competitors.
- Every value in the tokens and the guide traces back to a stage output. Nothing is typed from memory.
- Each gate is the user's decision. Recommend, then wait.

## Quality checks

- [ ] All six stages have a saved output
- [ ] The user approved each gate explicitly
- [ ] The contrast check passes for every allowed pairing
- [ ] Every font has a verified license
- [ ] The tokens validator reports zero errors
- [ ] Values in the guide match the tokens file
- [ ] What was not delivered is stated plainly
