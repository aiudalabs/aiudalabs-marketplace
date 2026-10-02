# Sample Input

This file shows what a good audit input looks like. The richer the input, the deeper the audit.

---

## Example 1: URL only (minimal input)

```
Use the startup-positioning-audit skill to audit example.com as a LATAM B2B AI adoption 
and implementation company. Be adversarial and focus on launch readiness.
```

The skill will:
1. Fetch the page text by following the `homepage-copy-audit` skill
2. Run competitive research with the `competitor-research` skill
3. Apply all 6 audit lenses
4. Produce the full report using the audit-report-template

---

## Example 2: Pasted copy (rich input)

```
Please do a full adversarial positioning audit of my AI consulting company. Here's the homepage copy:

---
HEADLINE: Scale your business with AI

SUBHEADLINE: We help companies implement AI solutions that automate processes and improve efficiency.

SERVICES:
- AI Consulting
- Process Automation
- AI Training for Teams
- Custom AI Development

CTA: Contact Us

ABOUT: We are a team of AI experts with years of experience helping businesses transform with technology. 
Our clients include companies from multiple industries across Latin America.

TESTIMONIAL: "Great team, highly recommended." — Juan P.
---

Company info: We're a 4-person team based in Mexico City. Pre-launch stage. 
Target: Operations directors at mid-size companies (100–500 employees) in Mexico and Colombia.
Services cost $5,000–$30,000 per project.
We have 3 past clients but haven't documented them as case studies yet.
Main competitor: Accenture at enterprise level, but mostly the client's IT team doing it themselves.
```

This input gives the skill everything it needs for a thorough audit with no assumptions required.

---

## Example 3: Asking for a specific angle

```
I want you to red team my AI startup's positioning from the perspective of a skeptical B2B buyer.
The site is example-ai-company.com. Focus on:
1. Whether the ICP is clear enough
2. Whether the offer will convert for cold traffic
3. What objections are completely unaddressed
Don't worry about visual design — focus entirely on message and offer strategy.
```

---

## Example 4: Pre-copy / pre-website stage

```
I haven't built my website yet. Here's what I'm planning:

Company name: DataMente
What we do: Help retail companies in Brazil automate their inventory reporting using AI
Who we serve: Operations directors at retail chains with 10–50 stores
Our main offer: 6-week implementation sprint to build an automated inventory report system
Price: R$35,000 (~$7,000 USD) per engagement
Competitors: Nobody doing this specifically for Brazilian retail; closest is general BI consulting
Proof: 2 clients so far, good results but no documented case studies

Audit my positioning before I write a single word of copy.
```

This is a valid input. The skill will analyze the positioning strategy and recommend copy before the site exists.

---

## What makes a good input

| Element | Optional? | Impact on audit quality |
|---------|-----------|------------------------|
| URL or pasted copy | Required (one of these) | Enables direct copy analysis |
| Target ICP description | Optional | Removes assumptions about who they're targeting |
| Competitor list | Optional | Speeds up competitive analysis |
| Pricing info | Optional | Enables offer design evaluation |
| Stage (pre-launch/launched) | Optional | Adjusts recommendations to stage |
| Geography/market | Optional | Important for LATAM-specific recommendations |
| Past client info | Optional | Informs credibility and proof recommendations |
| Specific concerns or questions | Optional | Focuses the audit on what matters most to the user |
