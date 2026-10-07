# Playbook: B2B-LATAM

> **Estimate accuracy: medium-low.** This playbook follows industry patterns and standard B2B SaaS practice, not Aiuda Labs' verified experience. Costs and timelines are market estimates from published pricing. State this caveat in the document and ask the user to refine it for their country, vertical and customers.

## 1. Confirm jurisdiction and customer profile

Ask:
- Country of incorporation (Panamá, México, Colombia, Costa Rica...).
- Customer size: SMB (under 50 employees), mid-market (50-500), enterprise (500+).
- Annual contract value: under $5K (self-serve), $5K-50K (sales-assisted), over $50K (enterprise sales).
- Vertical: horizontal SaaS, or FinTech, HealthTech, EdTech, LegalTech...
- Where customers are: same country, several LATAM countries, also US or EU.
- Data residency: do customers require data to stay in-country or in Latin America?

These answers change which items apply more than anything else.

For B2B2C products, add a B2C-light section for the end users: privacy policy and terms, support channel, app store accounts if mobile.

## 2. Items by category (5 categories)

**Legal entity and contracts (4 items)**
- Legal entity: S.A. or the local equivalent.
- Master Services Agreement (MSA) template: vetted by a lawyer, signed at the first contract.
- Data Processing Agreement (DPA): needed by any customer whose data includes personal data, which is most; GDPR-aligned if there are EU customers.
- NDA template: for sales conversations and trials.

**Sales infrastructure (4 items)**
- CRM: HubSpot, Salesforce or a local equivalent.
- Contract signing: DocuSign, Dropbox Sign, PandaDoc.
- Demo environment: separate from production, with seeded data.
- Sales collateral: one-pager, security overview, pricing sheet, in Spanish and English.

**Compliance certifications (3-4 items, by vertical)**
- SOC2 Type I: $15-30K and 6-9 months; table stakes for enterprise buyers.
- SOC2 Type II: after Type I; $20-40K a year and a 6-12 month observation period; required by most enterprise procurement.
- ISO 27001: alternative or complement to SOC2, more common with EU customers.
- Vertical regimes: HIPAA (US health), FERPA (US education), PCI-DSS (card data); typically $20-50K and months of preparation.

**Financial operations (3 items)**
- B2B invoicing: usually an extension of the accounting service ($200-400 a month more than B2C).
- Multi-currency: when customers are in several countries; Stripe plus local processors.
- Subscription billing: Stripe Billing, Chargebee or similar ($50-200 a month base).

**Customer success operations (3 items)**
- Onboarding playbook and a named CSM for enterprise; first customers typically reach value in 30-60 days.
- Support tiers: self-serve, email or tickets, dedicated CSM with SLA.
- Status page: Atlassian Statuspage, Better Stack or similar; enterprise customers expect uptime transparency.

## 3. Dependency graph

```
Legal entity (2-3w)
    ↓
MSA + DPA + NDA templates (3-6w with a lawyer)
    │
    ├─→ CRM + contract signing setup (1-2w, in parallel)
    │       ↓
    │   First sales conversations (ongoing, depends on lead generation)
    │       ↓
    │   First contract signed (1-12 months after the first conversation)
    │
    ├─→ SOC2 Type I preparation (12-18w with an auditor)
    │       ↓
    │   SOC2 Type I report (about 6-9 months from kickoff)
    │       ↓
    │   SOC2 Type II observation period (6-12 months)
    │       ↓
    │   SOC2 Type II report (12-18 months from kickoff)
    │
    └─→ Demo environment + sales collateral (3-5w)
        Status page (1-2w)
```

## 4. Worked item examples

**SOC2 Type I**
- What: an independent audit attesting to security controls at a point in time.
- Why: most US and EU enterprise procurement requires it, often as a hard gate.
- Owner: founder (decision), lawyer (review), developers or DevOps (controls), audit firm.
- Timeline: 6-9 months from kickoff to report (3-4 months preparation, 1-2 months audit, 1-2 months report).
- Cost: $15-30K for the first Type I. Compliance automation (Vanta, Drata, Secureframe) adds $4-15K a year; traditional firms (PwC, EY, local BDO) are the alternative.
- MVP cut: yes when no enterprise customer is in the pipeline; if asked, answer "in progress, expected by Q{N}".
- References: AICPA defines the standard; Vanta and Drata publish preparation guides.

**Master Services Agreement**
- What: the contract template for every B2B sale.
- Why: without a template, every contract is weeks of legal back-and-forth.
- Owner: founder plus a B2B contracts lawyer (a specialist, not general counsel).
- Timeline: 3-6 weeks for the first version; refine over the first 3-5 customers.
- Cost: $3-8K with a specialist lawyer. A public template costs nothing and is not recommended unreviewed.
- MVP cut: no; something must be signed before the first revenue.
- References: Common Paper standard agreements, Practical Law (Thomson Reuters).

Detail every other item the same way, and mark which costs are estimates.

## 5. Usual owners

- Founder: strategy, first sales calls, negotiations.
- B2B contracts lawyer: MSA, DPA, NDA.
- Compliance lead or contracted firm: SOC2 preparation, auditor liaison.
- Sales or CS lead (often the founder early on): CRM, demo, onboarding playbook.
- Developers: demo environment, security controls, status page.

## 6. Cost summary

```
One-time (MVP launch)
  Legal entity                                  $500–1,200
  MSA + DPA + NDA templates                     $3,000–8,000
  Sales collateral (design + writing)           $2,000–5,000
  Demo environment                              $0 (internal developer time)
  CRM + contract tool setup                     $0–500
  TOTAL ONE-TIME (excl. SOC2)                   $5,500–14,700

Recurring
  Accounting with B2B invoicing                 $250–500/month
  CRM                                           $50–500/month per user
  Contract signing                              $25–100/month
  Status page                                   $0–100/month
  SOC2 Type II (after Type I)                   $20,000–40,000/year
  Compliance automation                         $4,000–15,000/year
```

## 7. Critical path by customer profile

> **SMB only:** 8-12 weeks. Entity → MSA → sales infrastructure → first close. No SOC2 unless a customer asks.
>
> **Mid-market:** 16-26 weeks, adding SOC2 Type I preparation (12-18 weeks). Without SOC2 some buyers accept "we will have it by {date}"; expect to lose a share of deals.
>
> **Enterprise:** 12-18 months from incorporation to first enterprise close. SOC2 Type II is non-negotiable for most procurement teams. Bootstrapped startups often run out of money on this path; plan for it.

## 8. MVP cuts and blockers

Can be deferred, with limits:
- SOC2 → while no enterprise customer is in the immediate pipeline.
- Full DPA → a mutual NDA plus a one-page DPA for the first customers; the full DPA before customer five.
- Status page → a basic "all systems operational" page; uptime history later.
- CRM → a spreadsheet for the first 5-10 customers.

Hard blockers:
- Legal entity.
- MSA template.
- Demo environment (no enterprise deal closes without one).
- A contract signing process (verbal commitments do not bind).

## 9. Anti-patterns specific to this playbook

- **Promising SOC2 for the MVP** without having done it before. Type II takes 12-18 months from kickoff.
- **No MSA template.** Writing each contract from scratch adds weeks per deal.
- **Treating SMB and enterprise alike.** SMB closes in days or weeks, enterprise in months or a year; staff accordingly.
- **Ignoring data residency.** Some LATAM enterprises require data in-country or in the region. Settle it before choosing hosting.
