---
name: operational-readiness
description: "Produces docs/OPERATIONAL_READINESS.md, the non-code launch checklist of a product (legal entity, tax, banking, payments, app stores, insurance, contracts, compliance, IT), with an item-by-item owner, low/expected/high timelines, USD costs, a dependency graph, the critical path and MVP cuts. Classifies the product first into one of three playbooks: B2C-Panamá (S.A., RUC, Aviso de Operaciones, Yappy, Ley 81), B2B-LATAM (MSA, DPA, SOC2, sales ops) or Internal (SSO, MDM, audit logs, retention). Use for 'qué necesito para lanzar legalmente', 'checklist operacional', 'RUC y Yappy', 'necesitamos SOC2', 'distribución por MDM'. Runs in parallel to the build. Not legal or tax advice, and not a positioning or go-to-market audit (use `startup-positioning-audit`)."
license: MIT
metadata:
  version: "1.0.0"
  author: aiudalabs
---

# Operational Readiness

Produce the operational track of a launch: everything outside the code that has to exist before the first real user or customer, with how long each item really takes, what it costs, who does it, what blocks what, and what can wait.

This track runs **in parallel to the build, from Sprint 0**. Items like constituting a company or opening a corporate bank account take 4 to 8 weeks each and do not wait for the app. A founder who starts them when the code is done ships months late. This skill prevents that.

## When to use it

- "Operational readiness", "checklist operacional", "qué necesito para lanzar", "qué se necesita para vender legalmente".
- Specific items: RUC, S.A., Aviso de Operaciones, Yappy, App Store or Play setup, Ley 81; MSA, DPA, SOC2, SSO for enterprise customers; MDM distribution, corporate SSO, audit logs, data retention.
- Once the business model is decided (Phase 1 of the product-spec workflow), usually started while Phases 5 and 6 finish. It is not one of the seven spec phases and is never started automatically.

Do not use it for:

- A research prototype or hackathon project with no production launch.
- Legal counsel or tax planning: this is a checklist; a lawyer and an accountant give the advice.
- Positioning, messaging or launch-readiness of the offer: the `startup-positioning-audit` skill.
- Market sizing or competitor analysis: the `competitor-research` skill.
- Consumer products outside LATAM (US, EU): the playbooks assume the LATAM regulatory and payment landscape. Say so and adapt manually.

## Inputs

- `docs/PRODUCT_BRIEF.md`: product type, customer location, transaction volume.
- `docs/OPINIONATED_DEFAULTS.md`: the business model chosen in discovery, locked payment methods, currency, market.
- If the architecture produced a cloud identity document (for example `docs/IAM_REQUIREMENTS.md`), it feeds one extra item, "Cloud project provisioning", in every playbook.

Without discovery documents, ask directly: country (Panamá assumed), B2C or B2B or internal, takes payments or not, has employees or not.

## Output

One document, `docs/OPERATIONAL_READINESS.md`, about 350 to 700 lines depending on the playbook:

1. **Playbook declaration**: which of the three and why.
2. **Jurisdiction and assumptions**: country, currency, business model.
3. **Critical path**, up top: the founder's first read gives the launch timeline.
4. **Categories and items** of the playbook.
5. **Dependency graph** in ASCII: what blocks what.
6. **Per-item detail** with the seven fields below.
7. **Cost summary**: one-time and recurring totals in USD.
8. **MVP cuts and hard blockers.**

The three playbooks:

| Playbook | Categories | Critical path | Slowest item | Reference |
| --- | --- | --- | --- | --- |
| B2C-Panamá | 8 | 12-18 weeks | Corporate bank account, 4-8 weeks | [references/b2c-panama.md](references/b2c-panama.md) |
| B2B-LATAM | 5 | 8-12 weeks (SMB) to 12-18 months (enterprise) | SOC2, 6-9 months for Type I | [references/b2b-latam.md](references/b2b-latam.md) |
| Internal | 4 | 4-8 weeks, if corporate IT exists | MDM rollout, 2-4 weeks | [references/internal.md](references/internal.md) |

The B2C-Panamá numbers come from Aiuda Labs' own launches in Panamá. The B2B-LATAM and Internal numbers are industry patterns: the document must say so, and the user should refine them locally before relying on them.

## Method

### 1. Classify the product (always first)

Map the business model from `OPINIONATED_DEFAULTS.md`:

| Business model | Playbook |
| --- | --- |
| B2C transactional | B2C-Panamá |
| B2C non-transactional (free, ad-supported, freemium) | B2C-Panamá; payment items apply only when a paid tier exists |
| B2B SaaS | B2B-LATAM |
| B2B2C (institution pays, end users use it) | B2B-LATAM for the institution, plus a B2C-light section for end-user items: privacy, support, app stores if mobile |
| Internal | Internal |

When there is no recorded model, decide with the tree:

```
External paying users (consumers or businesses)?
├── yes → Mostly individual consumers?
│         ├── yes → B2C-Panamá (outside Panamá: use it as the template and
│         │         flag market items for local adaptation, e.g. CFDI in
│         │         México, PIX and CNPJ in Brasil)
│         └── no  → B2B-LATAM
└── no  → Internal
```

Edge cases:

- **Marketplace with business sellers**: the transactions are consumer-style, so B2C-Panamá; add the sellers' tax obligations as a separate item.
- **Genuinely spans playbooks** (rare, usually a sign of unclear positioning): pick the dominant one and record the other in the caveats. Never produce a hybrid document.

Write the declaration at the top of the document:

> **Playbook:** B2C-Panamá
> **Rationale:** {one sentence}
> **Caveats:** {items where the playbook does not fully apply}

### 2. Run the playbook

Read the reference file of the chosen playbook and follow it: confirm the context questions it lists, mark each item as applies, does not apply or already done, draw its dependency graph, detail every item, sum the costs, state the critical path and the cuts.

An item already done (the company exists from a sister product, the developer accounts are open) stays in the document as done, so the graph remains connected; only what remains carries timeline and cost.

### 3. Detail every item with seven fields

```
## {Item name}

What it is: {1-2 concrete sentences}
Why needed: {the consequence of not having it}
Owner: {founder, lawyer, accountant, IT, developer...}
Timeline:
  - Low: {N} weeks — {when this is achievable}
  - Expected: {N} weeks
  - High: {N} weeks — {what causes the delay}
Cost:
  - One-time: ${range}
  - Recurring: ${range}/month or {% of revenue}
MVP cut: {Yes / No / Conditional} — {the compromise, or why it blocks}
References: {named providers, agencies, standards; never "search online"}
```

Each playbook reference has worked examples of this block and its usual owners.

### 4. Compute the critical path and the costs

The critical path is the longest chain in the dependency graph. Sum the low and high ends of each step and state the range; if the result differs from the playbook's typical range, say why for this product. Recompute the cost totals from the line items instead of copying the playbook's totals.

### 5. Check before writing

- The playbook is declared at the top, with rationale and caveats.
- Every item has all seven fields.
- The dependency graph has no orphan items.
- The critical path is explicit and sits near the top.
- MVP cuts and hard blockers are clearly marked.
- The cost totals add up from the lines.
- References name specific providers, agencies or standards.
- B2B-LATAM and Internal carry their estimate-accuracy caveat.

## Anti-patterns (all playbooks)

Each playbook reference adds its own.

- **Single-number timelines.** "2 weeks" instead of "2-6 weeks" misrepresents reality.
- **Treating operations as the last sprint.** Lead times run from 4 weeks to 18 months; the track starts at Sprint 0.
- **"Search online" as a reference.** "Yappy through Banco General" or "Vanta for SOC2 prep" is useful.
- **Skipping the dependency graph.** Without it, sequential items look parallel.
- **Acting as legal counsel.**
- **A hybrid document across playbooks.**

## Communication

- Spanish with the user. The document in English, keeping Spanish proper names (RUC, Aviso de Operaciones, Yappy, Tilopay, ITBMS).
- Concrete and opinionated: name banks, providers and firms when possible.
- Ranges for every cost and timeline.
- Name agencies and what they do (DGI, ANTAI, MICI through Panamá Emprende, the municipality).
- Lead with the critical path.

## Handoff

The document is executed by the founder, lawyer, accountant, IT and developers alongside the build; it does not feed the next spec phase. Items that need code (payment integrations, SSO, audit logging, store assets) should become issues in `docs/ISSUES.md` through the `multi-agent-governance` skill.

Run this skill again when the product changes materially (adds B2B sales, adds payments), when the jurisdiction changes (expanding to Costa Rica means a new run for that country), or when an item closes and the graph shifts (the bank account opens and unblocks the merchant account).

Closing message:

> Operational readiness en `docs/OPERATIONAL_READINESS.md`. Ruta crítica: {N} semanas. Recomiendo arrancar {first items of the critical path} ya, mientras corre el Sprint 0. {M} items se pueden cortar del MVP, {K} son bloqueantes. Cuando cierres un item, vuelve a este skill para refrescar el grafo.

## What this skill does not do

- Legal advice or tax planning.
- Visa or labor law for foreign founders.
- Fundraising, term sheets or investor relations.
- Write the privacy policy, terms, MSA or DPA text: it flags them and points to templates.
- Negotiate with banks or payment processors.
- Track completion over time: that is the founder's project management.
- Generate playbooks for non-LATAM jurisdictions automatically.
