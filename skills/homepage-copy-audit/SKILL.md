---
name: homepage-copy-audit
description: Audits a homepage or landing page for clarity and conversion, covering the 5-second test, hero, CTA, message hierarchy, proof, jargon, trust signals and friction, and delivers replacement copy with at least three hero variants. Use when the user asks to review, critique, roast or rewrite a homepage, landing page, hero section, headline or CTA, or asks why a page does not convert.
license: MIT
compatibility: The optional extraction script needs Python 3.9+ and network access. It gives cleaner output when the requests and beautifulsoup4 packages are installed, and falls back to the standard library without them.
metadata:
  version: "0.1.0"
  author: aiudalabs
---

# Homepage Copy Audit

Find where a visitor gets confused or stops believing, and replace the copy that causes it. Every criticism ships with the words that should be there instead.

## Inputs

Required: a URL or the page copy.

Helpful: who the page is for, the offer and price, the stage of the company.

If there is no URL and no copy, ask once: "Please share the page URL or paste the copy." Then proceed with what you get.

## Workflow

### 1. Get the page content

Use the first option that works:

1. The user pasted the copy. Use it as it is.
2. Python is available. Run the bundled script:

   ```bash
   python scripts/extract_site_text.py https://example.com -o page.md
   ```

   It also accepts a local HTML file. If it warns that the extracted text is empty, the page is probably rendered with JavaScript; move to the next option.
3. A web fetch tool is available. Fetch the page with it.
4. None of these work. Ask the user to paste the copy.

### 2. Run the audit

Apply every section of [references/homepage-audit-framework.md](references/homepage-audit-framework.md), in order. Start with the 5-second test: after five seconds, can a visitor say what this is, who it is for and why it matters?

Quote the page exactly when you criticize it.

### 3. Label what you know

- `[FACT]`: stated on the page
- `[ASSUMPTION]`: inferred, and could be wrong
- `[FLAG]`: a claim on the page that needs evidence to be believed

### 4. Write the replacement copy

Fill in [assets/homepage-rewrite-template.md](assets/homepage-rewrite-template.md). Deliver at least three hero variants, each with a headline, a subheadline and a CTA.

Do not invent proof. If the rewrite needs a metric, a client name or a testimonial the user has not given you, leave a clearly marked placeholder and say what is needed.

## Output

1. 5-second test result, pass or fail, with the reason
2. Findings by framework section, each with the quoted copy, the problem and the fix
3. Jargon table: phrase, risk, plain replacement
4. Claims that need evidence, labeled `[FLAG]`
5. The completed rewrite template
6. The three changes that matter most, in priority order

## Rules

- No criticism without a replacement. "The CTA is weak" must be followed by the CTA you would use and why.
- No opening praise. Start with the diagnosis.
- Judge the message, not the visual design, unless the user asks about design.
- This skill is for B2B and service pages. Consumer e-commerce product pages convert on different mechanics; say so if you are given one.

## Quality checks

- [ ] Every finding quotes the page
- [ ] Every finding has replacement copy
- [ ] At least three hero variants are written out in full
- [ ] No invented metrics, clients or testimonials in the rewrite
