---
name: visual-identity
description: Builds a complete visual identity for a company, startup or product from start to finish, running strategy brief, color system, typography system, logo, design tokens, asset kit and brand guidelines in order with an approval gate after each. Use when the user asks for a full brand identity, visual identity, branding for a new company or product, or a rebrand, and wants the whole thing and not one piece.
license: MIT
metadata:
  version: "0.2.1"
  author: aiudalabs
  requires: brand-strategy-brief color-system typography-system logo-direction design-tokens brand-asset-kit brand-guidelines
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
| 4 | Logo | `logo-direction` | Logo brief, tested concepts, variant files, usage rules | User chooses the mark |
| 5 | Tokens | `design-tokens` | `brand.tokens.json`, `brand.css` | Validator reports zero errors |
| 6 | Assets | `brand-asset-kit` | Icons and share image, with the manifest | Every file verified by the script |
| 7 | Guidelines | `brand-guidelines` | `brand-guidelines.md` | User approves the guide |

Stages 4 and 6 depend on scope. If the user already has a logo, stage 4 records its variants and checks them against the new palette instead of designing a new one. If no screen assets are needed yet, skip stage 6 and say so.

## How to run it

### Before starting

1. Ask where the files should go. Default to a `brand/` folder in the current project.
2. Check for existing material: a brief, a logo, colors or fonts already in use. Existing decisions are inputs, not things to redo. Skip a stage whose output already exists and is approved, after confirming with the user.
3. Tell the user the seven stages and that you will stop after each one.

### For each stage

1. Follow the stage's skill completely. Do not improvise a shorter version of it.
2. Pass forward what earlier stages decided. Stages 2, 3 and 4 take the attributes and visual direction from the brief. Stage 4 also takes the colors and typefaces. Stage 5 takes the values from stages 2 and 3. Stage 6 takes the logo and the colors. Stage 7 takes everything.
3. Save the stage's output to the brand folder.
4. Show the user the result and the decision you need from them. Where the stage's skill has a preview or review script (color, typography, logo), build it and give the user the file, so they choose by looking. Wait for the decision. Do not start the next stage on an assumed yes.

If the user changes an earlier decision later, go back: redo that stage and every stage that used its output. A new primary color means new ramps, a new contrast check, new tokens and an updated guide.

## Final delivery

When every gate has passed, confirm the brand folder contains:

```
brand/
├── brand-brief.md
├── brand-guidelines.md
├── palette.json
├── tokens/
│   ├── brand.tokens.json
│   └── brand.css
├── logo/
│   └── svg/
└── exports/
```

Then give a short summary: the three attributes, the primary color, the typefaces, and the open questions that remain. List what was not done or remains: a trademark check of the name and mark, any designer refinement of the logo, print specifications, and any stage that was skipped.

## Rules

- Do not skip the brief, even when the user asks to "just pick colors". Without attributes there is nothing to judge a color against. If they insist, use `color-system` directly and say what is missing.
- Do not invent facts about the company, its audience or its competitors.
- Every value in the tokens and the guide traces back to a stage output. Nothing is typed from memory.
- Each gate is the user's decision. Recommend, then wait.

## Quality checks

- [ ] Every stage in scope has a saved output, and skipped stages are named
- [ ] The user approved each gate explicitly
- [ ] The contrast check passes for every allowed pairing
- [ ] Every font has a verified license
- [ ] The tokens validator reports zero errors
- [ ] Values in the guide match the tokens file
- [ ] What was not delivered is stated plainly
