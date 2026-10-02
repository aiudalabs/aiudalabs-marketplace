---
name: startup-positioning-audit
description: Runs a full adversarial positioning and launch-readiness audit of a startup, covering category, ICP, offer, claims, credibility, buyer objections, competitive risk and traction, and delivers a 21-section report with a 12-dimension score out of 60. Use when the user asks to audit, red team or pressure-test their startup positioning, messaging, value proposition, ICP or offer, or asks whether they are ready to launch. Built for B2B AI, SaaS, consulting and services companies.
license: MIT
metadata:
  version: "0.1.0"
  author: aiudalabs
  requires: homepage-copy-audit competitor-research
---

# Startup Positioning Audit

Surface every confusion, weakness, overclaim and missed opportunity in a startup's positioning before a real buyer or competitor does. The deliverable is a scored report with exact replacement copy.

This skill uses two other skills: `homepage-copy-audit` for the page analysis and rewrite, and `competitor-research` for the competitive landscape. If one of them is not installed, do that part from the report template alone and say so in the report.

## When not to use

- Consumer e-commerce product pages
- Grammar or copyediting requests with no strategic question behind them
- A request for a quick look at one page: use `homepage-copy-audit` on its own

## Inputs

Required: a website URL, pasted copy, or a description of what the company builds and for whom. A company with no website yet is a valid input.

Helpful: target ICP, known competitors, pricing, traction, geography, stage, earlier positioning attempts. [references/sample-input.md](references/sample-input.md) shows inputs at different levels of detail.

If there is nothing to audit, ask once: "Please share the website URL, paste the homepage copy, or describe what you're building and who it's for." After that, do not ask further questions. Make assumptions, label them `[ASSUMPTION]`, and proceed.

## Labels

Use these throughout the report:

- `[FACT]`: stated in the company's copy or by the user
- `[ASSUMPTION]`: inferred, and could be wrong
- `[RESEARCH: <source>]`: found through external research
- `[FLAG]`: a claim in the company's copy that needs evidence to be believed

## Workflow

### 1. Gather the content

For a URL, get the page text by following step 1 of the `homepage-copy-audit` skill. For pasted copy or a description, use it as it is.

### 2. Research the competition

Follow the `competitor-research` skill and keep the brief it produces. Record the research mode it used. If no external research was possible, every competitive claim in the report is an `[ASSUMPTION]`.

### 3. Apply the six lenses

Read the reference for each lens before applying it. Do not skip a lens because the input is thin; say what is missing instead.

| Lens | Question | Reference |
| --- | --- | --- |
| Skeptical buyer | What would the target buyer object to after reading this? | [references/red-team-objections.md](references/red-team-objections.md) |
| Positioning strategist | Is the category clear? Is the ICP specific? What is the enemy, and why now? | [references/positioning-framework.md](references/positioning-framework.md), [references/icp-framework.md](references/icp-framework.md) |
| Growth advisor | Which channels and offers will produce leads at this stage, and which will not? | [references/traction-hypotheses-framework.md](references/traction-hypotheses-framework.md), [references/offer-design-framework.md](references/offer-design-framework.md) |
| Conversion copywriter | Does the page pass the 5-second test? Is the CTA specific? | The `homepage-copy-audit` skill |
| Competitive analyst | Who are the real alternatives, including doing nothing? Where is the gap? | The `competitor-research` skill |
| Investor or operator | Are the claims substantiated? Is there a believable path to traction? | [references/scoring-rubric.md](references/scoring-rubric.md) |

### 4. Score

Score all 12 dimensions from 1 to 5 using [references/scoring-rubric.md](references/scoring-rubric.md). Fill in [assets/scoring-matrix-template.md](assets/scoring-matrix-template.md). A score needs a one-sentence finding that justifies it.

### 5. Write the report

Use [assets/audit-report-template.md](assets/audit-report-template.md) as the exact structure and fill in all 21 sections. Where information is missing, say what you would need and give your best inference, labeled.

- Open with [assets/executive-summary-template.md](assets/executive-summary-template.md).
- Sections 10 and 18 come from the `homepage-copy-audit` output, including at least three hero variants.
- Section 13 comes from the competitor brief.
- Close with [assets/launch-readiness-template.md](assets/launch-readiness-template.md).

[references/sample-output.md](references/sample-output.md) shows the expected depth and tone.

## Rules

1. No generic advice. "Improve your messaging" is forbidden. Write the new headline.
2. No overpraise. Start with the diagnosis.
3. No false balance. If something is weak, say so without padding it with positives.
4. Every criticism comes with a concrete alternative.
5. Facts, assumptions, research and flagged claims stay labeled from start to finish.

Length: 2,000 to 4,000 words. Cut anything a strategic advisor would not say in a paid session.

## Quality checks

- [ ] All 21 report sections are filled in
- [ ] All 12 dimensions are scored, each with a finding, and the total matches the verdict band
- [ ] The research mode is stated, and competitive claims are labeled to match it
- [ ] The report contains a positioning statement, at least three hero variants and an entry-point offer, all as exact copy
- [ ] No invented clients, metrics, competitors or prices
