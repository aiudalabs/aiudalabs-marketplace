---
name: visual-directions
description: Finds the look of a brand, new or existing, by collecting the owner's taste, building two or three complete visual directions as full-page mockups with real content, comparing them side by side against the best alternatives, and choosing one by eye before any system is built. Use when the user wants to see options for a brand's look, asks for a redesign, refresh, moodboard or stylescape, says a design looks bland, ugly or generic, or before fixing colors, fonts or tokens for a new identity.
license: MIT
compatibility: The bundled script needs Node.js 18 or later and has no dependencies. Viewing the board needs a web browser.
metadata:
  version: "0.1.0"
  author: aiudalabs
---

# Visual Directions

Find the look first. A brand is chosen by people looking at it, so this skill produces things to look at: whole pages, in the brand's own words, each with a different character. The color system, the type scale and the tokens come afterward and are derived from the direction that wins.

Do not start from a palette or a font list. A set of correct parts does not add up to an identity anyone wants.

## Inputs

- The brand brief, or at least what the company does, for whom, and how it should feel
- Real content: the actual headline, offer and proof from the user's site or documents. Ask for it, or take it from their existing material. Do not write filler copy to design around.
- The owner's taste: brands or sites whose look they like, and what they like about them
- The existing identity, if there is one: the live site, the logo, the stylesheet

## Workflow

### 1. Collect what the look can be built from

**Starting from zero**, which is the usual case. There is nothing to evolve, so collect taste first. Follow [references/starting-from-zero.md](references/starting-from-zero.md): get three references the owner likes and one they dislike, look at each one yourself, and name the qualities behind them. Decide what each direction will draw its character from: the company's activity, its audience's world, a material, a type voice, a color, a motif.

**An identity already exists.** Capture it and study it before proposing anything. Follow [references/reading-an-existing-identity.md](references/reading-an-existing-identity.md) and write down what gives it its character, what the owner likes, and what is measurably wrong. What already works is equity, kept unless there is a reason to lose it.

In both cases, pick the benchmark: the pages each direction must hold up against. For a new brand that is the strongest competitor's page and the owner's references. For an existing brand it is the current site.

### 2. Define the directions

Write two or three directions, each as one sentence about the feeling plus the moves that create it. Follow [references/making-directions-different.md](references/making-directions-different.md). Rules:

- **Each direction has its own source of character.** Three directions drawn from the same idea are one direction.
- **When an identity exists, one direction evolves it.** That is the baseline the others have to beat.
- **Directions differ in character, not in hue.** The same layout in three colors is one direction.
- **Each direction takes one clear risk.** A direction with no opinion is the bland one.
- **Every direction must be something you would be glad to ship.** Do not include a weak option to make another look good.

Record each in a copy of [assets/direction.template.json](assets/direction.template.json).

### 3. Build each direction as a full page

One self-contained HTML file per direction, with the same real content in all of them, so the comparison is about the look. Each page includes at least:

- header with the logo
- hero with the real headline and call to action
- one content section, such as services or how it works
- one piece of proof or data
- a contrasting section, such as a dark band or a color block
- footer

Put effort into craft: type hierarchy, spacing, rhythm, one memorable element. A direction that is only a recolored template tells the user nothing. If a design skill is available in the environment, use it for this step.

### 4. Look at them yourself

Render each page to an image if any screenshot or rendering tool is available, and look. Fix what is broken or dull before anyone else sees it. Then be honest: if a direction is not better than the current identity, say so in its notes. Do not present a direction you would not choose.

### 5. Build the comparison board

```bash
node scripts/direction-board.mjs \
  --reference "Strongest competitor=audit/competitor.png" \
  --direction "A. Workshop=directions/a-workshop.html" \
  --direction "B. Editorial=directions/b-editorial.html" \
  --out direction-board.html
```

The board shows the benchmark and every direction side by side at the same scale, each with a link to open it full size. Paths are relative to the board file.

### 6. Choose

Give the user the board and a recommendation with its reason, stated as an opinion about what looks and works best, not as a rule that was satisfied. The choice is theirs. Expect "the first one, but with the heading from the third": merge and rebuild.

If no direction holds up against the benchmark, do not ship the least bad one. For a new brand, go back to step 1 with what the board taught you and build new directions. For an existing brand, the right outcome may be to keep the current identity and fix its measurable problems. Say which plainly.

### 7. Record the chosen direction

Complete the chosen direction's `direction.json` with its final colors, fonts and the list of what was kept and changed. Later steps (color system, typography, tokens, guidelines) take their values from this file and do not reopen the look.

## Output

1. The taste notes: the owner's references and the qualities drawn from them; for an existing brand, its equity and its measurable problems
2. One HTML page per direction, with its `direction.json`
3. `direction-board.html`
4. The chosen direction, with the reason, and what was kept and changed from before

## Quality checks

- [ ] Every direction uses the brand's real content, with no filler copy
- [ ] The owner's references were collected and looked at, or it is stated that they were your own choice
- [ ] The directions differ in character, each from a different source
- [ ] Each direction has warmth, a moment of contrast and something to remember
- [ ] When an identity existed, one direction evolves it, and its equity is listed
- [ ] Each direction was rendered and looked at before being shown
- [ ] The benchmark is on the board next to the directions
- [ ] The recommendation says which one looks best and why, in plain words
- [ ] No direction was presented that does not hold up against the benchmark
