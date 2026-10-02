---
name: competitor-research
description: Maps the competitive landscape for a startup or B2B offer, covering direct, indirect and status-quo competitors, their messaging, pricing signals, vulnerabilities and white space, and delivers a sourced competitor brief. Use when the user asks who their competitors are, wants a competitor analysis, competitive intelligence, alternatives research, a pricing benchmark or a differentiation map.
license: MIT
compatibility: The optional research script needs Python 3.9+, the requests package, network access and a PERPLEXITY_API_KEY environment variable. The skill works without it.
metadata:
  version: "0.1.0"
  author: aiudalabs
---

# Competitor Research

Produce a competitor brief that separates what was found from what was inferred. A brief that mixes the two is worse than no brief, because the reader cannot tell which claims to trust.

## Inputs

Required: what the company sells and who it sells to. A URL, pasted copy or a short description all work.

Helpful: a list of competitors the user already knows, the geography, and the price range.

If the category or the buyer is unknown, ask once. Then proceed with what you have and label the gaps.

## Workflow

### 1. Pick a research mode

Use the first mode that is available and record which one you used in the brief.

**Mode A: a web search tool is available.** Use it to run the queries in step 2. Label findings `[RESEARCH: <source>]` and keep the URL for each one.

**Mode B: `PERPLEXITY_API_KEY` is set and Python is available.** Run the bundled script:

```bash
python scripts/perplexity_research.py "query 1" "query 2" -o research.md
```

It prints Markdown with citations. Use `--format json` for structured output. Label findings `[RESEARCH: Perplexity API]`.

**Mode C: no external research.** Continue from the user's input and your own knowledge. Label every competitive claim `[ASSUMPTION — unverified]`, and open the brief with: "No external research was run. Competitive claims are based on inference and should be verified."

### 2. Run the queries

Adapt these to the company. The full list is in section 7 of [references/competitor-analysis-framework.md](references/competitor-analysis-framework.md).

- `"[category] competitors"`
- `"[company name] alternatives"`
- `"[buyer role] [problem] pain points [industry]"`
- `"[service] pricing benchmarks B2B"`
- `"best [service type] providers [geography]"`

### 3. Map the landscape

Follow [references/competitor-analysis-framework.md](references/competitor-analysis-framework.md). Cover all three competitor types. The status quo, meaning the buyer doing nothing or doing it in-house, is always a competitor and is often the strongest one.

For each competitor capture: category claim, target buyer, differentiation, pricing signal, type of proof, and the source.

### 4. Find vulnerabilities and white space

- Where does the company's message overlap with a competitor's almost word for word?
- Where could a competitor undercut it on price, proof or specificity?
- Which positioning angle, vertical or geography is nobody claiming?

### 5. Write the brief

Fill in [assets/competitor-research-brief.md](assets/competitor-research-brief.md). List the queries you ran.

## Rules

- Never present an inferred competitor, price or claim as a finding. Use the labels.
- Name real companies only when a source supports it. In Mode C, describe competitor types instead of inventing names.
- Do not invent prices. If no pricing signal was found, write "not found".
- Quote competitor messaging exactly and link the page it came from.

## Quality checks

- [ ] The research mode is stated at the top of the brief
- [ ] Every competitive claim carries a `[RESEARCH: …]` or `[ASSUMPTION — unverified]` label
- [ ] The status quo is analyzed as a competitor
- [ ] At least one vulnerability and one white-space opportunity are specific enough to act on
