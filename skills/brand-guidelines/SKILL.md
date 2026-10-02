---
name: brand-guidelines
description: Assembles decided brand elements into a brand guidelines document that a team can apply without asking questions, covering attributes, color, typography, logo rules, imagery, do and do not examples, asset naming, versioning and an exceptions log. Use when the user asks for brand guidelines, a brand book, a style guide, brand rules or a brand manual, or wants to document or update an existing brand.
license: MIT
metadata:
  version: "0.1.0"
  author: aiudalabs
---

# Brand Guidelines

Write the document people open when they are about to make something with the brand. It records decisions that were already made; it does not make new ones.

## Inputs

Gather what exists. Typical sources are a brand brief, a color system, a type system, a tokens file and logo files.

For each section of the guide, the content is either decided, or it is not. If it is not, do one of two things: stop and get it decided, or mark the section "Not defined yet" with what is needed. Never fill a gap with a plausible default. A guide that invents a rule is worse than a guide with a visible hole.

## Workflow

### 1. Inventory

List each element and its status: decided, partly decided, or missing. Show the list to the user before writing, so they can choose to fill gaps first.

### 2. Draft from the template

Fill in [assets/brand-guidelines-template.md](assets/brand-guidelines-template.md). Rules for writing it:

- **Give the reason with the rule.** "Body text is neutral 900, not black, because the brand is warm" survives a redesign. "Body text is #23272c" does not.
- **Copy values, do not retype them.** Take hex values, sizes and contrast results from the tokens file and the script output.
- **Write rules that can be checked.** "Use the accent sparingly" cannot be checked. "The accent covers at most one element per screen" can.
- **Show wrong beside right.** Each do and do not entry names a concrete case.

### 3. Logo section

Record only what exists: the variants there are files for, their file names, and the rules the designer set for clear space and minimum size. If those rules were never set, say so in the section and list them as open. Clear space and minimum size depend on the actual mark; they cannot be copied from another brand.

### 4. Assets and naming

List where the files live and how they are named, following [references/asset-naming.md](references/asset-naming.md).

### 5. Governance

Follow [references/governance.md](references/governance.md) to fill in the last sections: version, owner, how to request a change, and the exceptions log. A guide with no owner goes stale within a year.

### 6. Review

Read the guide as a new teammate with a concrete task, such as making a slide or a social post. Every question they would have to ask someone is a gap. Fix it or list it under open questions.

## Output

`brand-guidelines.md`, versioned, with:

1. Quick reference: the values needed nine times out of ten
2. Brand attributes and what each rules out
3. Color: ramps, roles, allowed pairings with contrast results, forbidden pairings
4. Typography: families, scale, weights, fallbacks, licenses
5. Logo: variants, files, usage rules, misuse
6. Imagery and iconography direction
7. Do and do not
8. Assets and naming
9. Governance: version, owner, change process, exceptions log
10. Open questions

## Quality checks

- [ ] Every value matches the tokens file or the source it was copied from
- [ ] Every rule has a reason, and can be checked
- [ ] Nothing in the guide was invented to fill a gap; gaps are marked "Not defined yet"
- [ ] The contrast results are the pasted script output, with the date
- [ ] There is a named owner and a version number
- [ ] A new teammate could make a simple piece using only this document
