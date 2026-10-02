---
name: visual-identity
description: Builds a complete visual identity for a company, startup or product from start to finish, from zero or as a refresh. It settles the look first, by collecting the owner's taste and comparing whole-page directions by eye, then builds the system behind the chosen look, covering color, typography, logo, design tokens, asset kit and brand guidelines. Use when the user asks for a full brand identity, visual identity, branding for a new company or product, a rebrand or a brand refresh, and wants the whole thing and not one piece.
license: MIT
metadata:
  version: "0.3.0"
  author: aiudalabs
  requires: brand-strategy-brief visual-directions color-system typography-system logo-direction design-tokens brand-asset-kit brand-guidelines
---

# Visual Identity

Run the whole identity process. It has two halves, in this order:

1. **Find the look.** Understand the brand and the owner's taste, then compare complete directions by eye and choose one.
2. **Build the system behind it.** Turn the chosen look into colors, type, tokens, assets and guidelines, repairing what is measurably wrong without changing how it looks.

The order matters. A system built before the look is chosen produces parts that each pass their checks and a whole that nobody wants. The checks in the second half are quality control for something that is already liked. They never choose the look.

If the user wants only one piece, such as a palette or a font pairing, use that skill directly.

## Stages

| # | Stage | Skill | Produces | Gate |
| --- | --- | --- | --- | --- |
| 1 | Brief | `brand-strategy-brief` | `brand-brief.md` | Audience and attributes confirmed |
| 2 | Directions | `visual-directions` | Taste notes, two or three full-page directions, a comparison board | A direction is chosen by looking at it |
| 3 | Color | `color-system` | Ramps, roles and `palette.json` from the chosen direction | Every allowed pairing passes, with the look intact |
| 4 | Typography | `typography-system` | Scale, weights, fallbacks and license table for the chosen faces | Licenses verified |
| 5 | Logo | `logo-direction` | The mark, its variants and usage rules | The mark is chosen on the chosen direction's page |
| 6 | Tokens | `design-tokens` | `brand.tokens.json`, `brand.css` | Validator reports zero errors |
| 7 | Assets | `brand-asset-kit` | Icons and share image | Every file verified |
| 8 | Guidelines | `brand-guidelines` | `brand-guidelines.md` | Owner approves |

Stage 2 is where the identity is decided. Stages 3 to 8 serve it.

## Before starting

1. Ask where the files should go. Default to a `brand/` folder in the current project.
2. Find out whether this is a new identity or a refresh.
   - **New.** There is nothing to evolve. The look will come from the owner's taste and from the directions, so plan to collect references in stage 2.
   - **Refresh.** The existing identity is an input. What works in it is kept unless there is a reason to lose it. Ask whether the logo is in scope.
3. Tell the user the stages and where their decisions are needed: the attributes in stage 1, the direction in stage 2, and approval at the end.

## Running each stage

1. Follow the stage's skill completely.
2. Pass decisions forward. Stage 2 takes the brief. Stages 3 and 4 take their colors and typefaces from the chosen direction's `direction.json`; they do not propose new ones. Stage 5 designs the mark to live on the chosen direction's page. Stage 6 takes the values from stages 3 and 4. Stage 8 takes everything.
3. Save the stage's output to the brand folder.
4. Show the user the result and the decision needed, with something to look at wherever the stage's skill has a preview or review script. Wait for the decision.

### Stages 3 and 4 protect the look

When a check fails after the direction is chosen, repair with the smallest change and compare before and after:

- A color pair that fails contrast is moved to the nearest color that passes, in the same hue. Use the `color-system` repair script.
- If a repair would visibly change the direction, show both versions and let the user decide. A color that fails as body text may stay for large text or decoration, recorded as a usage rule.
- Never replace a chosen color or typeface because a different one scores better.

### If the look is not good enough

Judge the result as a whole page beside the benchmark from stage 2. If it does not hold up, the fault is in stage 2, not in the tokens. Go back, change the directions, and choose again. Do not polish a system built on a look nobody wants.

### When the user changes an earlier decision

Go back to that stage and redo every stage that used its output.

## Running without the user

Sometimes the user asks for the whole process with no questions. Then:

1. Write `brand/owner-decisions.md` from [assets/owner-decisions.template.md](assets/owner-decisions.template.md) before stage 1. Fill it only with what the user has actually said or what their material shows, and give the source of each line. Leave the rest as "Not stated".
2. At each gate, decide from that file. Where it is silent, choose what best matches the taste the owner has shown, not what you would find most interesting or easiest to justify.
3. Log every decision in `brand/decision-log.md`: the gate, what was chosen, what it was based on, and how confident you are.
4. Never fill a factual gap by invention. Unknown facts about the company stay "Open" in the brief.
5. At the end, list the decisions made on the user's behalf, most uncertain first, so they can overrule them.

## Final delivery

Confirm the brand folder contains:

```
brand/
├── brand-brief.md
├── directions/            the pages, their direction.json and the board
├── palette.json
├── brand-guidelines.md
├── tokens/
├── logo/
└── exports/
```

Then show the result the way it will be judged: a full page in the final identity, next to the benchmark. Summarize the look in one sentence, what was repaired, and what remains open.

## Rules

- The look is chosen by looking. No direction, palette or typeface is selected because it satisfied a rule.
- Attributes guide the directions. They do not generate the look by deduction.
- Being different from competitors is not a goal in itself.
- In a refresh, what already works is kept unless there is a stated reason to lose it.
- Do not invent facts about the company, its audience or its competitors.
- Every value in the tokens and the guide traces back to the chosen direction or a recorded repair.

## Quality checks

- [ ] The owner's taste was collected, or it is stated that the references were your own
- [ ] A direction was chosen from rendered pages, with the benchmark on the same board
- [ ] The final page was compared side by side with the benchmark and holds up
- [ ] Repairs changed as little as possible, and each is listed with before and after
- [ ] Every allowed text and background pairing passes contrast
- [ ] Every font has a verified license
- [ ] The tokens validator reports zero errors, and the guide matches the tokens
- [ ] In an unattended run, every decision made for the user is logged with its basis
