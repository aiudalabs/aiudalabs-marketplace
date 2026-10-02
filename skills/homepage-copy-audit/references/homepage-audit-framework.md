# Homepage Audit Framework

The homepage is a sequence of micro-decisions by the visitor. At each step they're asking: "Is this for me?" and "Do I believe it?" This framework evaluates each critical decision point.

---

## 1. The 5-second test

**What it tests:** A new visitor who knows nothing about this company should be able to answer in 5 seconds: What is this? Who is it for? Why should I care?

**How to evaluate:**
- Cover everything below the fold. Read only the hero section (headline + subheadline + CTA + any nearby visual).
- Can you answer: (a) what does this company do, (b) who is it for, (c) what do I get?
- If you need to read more than 2 sentences to understand, the 5-second test fails.

**Common failures:**
- Headline is a tagline, not a description ("The Future of Work Is Intelligent")
- Company name is the headline with no context
- Hero relies on a visual that doesn't load in text form
- Subheadline is where the actual explanation lives (too low in hierarchy)

**Flag:** `[5-SECOND FAIL]` — visitor cannot answer what/who/why from hero alone.

---

## 2. Hero clarity

**What it tests:** Does the hero (headline + subheadline + optional hook) communicate positioning unambiguously?

**Evaluation checklist:**
- [ ] Headline names the category or outcome (not a vague aspiration)
- [ ] Subheadline identifies the ICP or explains the mechanism
- [ ] No jargon that the target buyer would need defined
- [ ] No placeholder corporate language ("synergies", "solutions", "leverage")
- [ ] Headline is buyer-centric (about their outcome), not founder-centric (about our technology)
- [ ] Headline can stand alone without subheadline and still be directionally clear

**Common failures:**
- "Empowering businesses with AI" — meaningless
- Headline is a question ("Ready to transform your operations?") — avoids making a claim
- Two headlines competing (company tagline + product description)
- Founder-language: "We build LLM-powered workflow automation" — buyers don't say this

---

## 3. CTA quality

**What it tests:** Does the call-to-action tell the buyer exactly what happens when they click? Is the friction appropriate for the buyer's stage of awareness?

**Evaluation checklist:**
- [ ] CTA uses a verb that names the action ("Book a Call", "See a Demo", "Get the Audit")
- [ ] CTA sets expectations for what happens next (will they get a 30-min call? a report? a free trial?)
- [ ] CTA matches the buyer's current awareness level (low-awareness buyer should not be asked to "Buy Now")
- [ ] CTA is not generic ("Get Started", "Learn More", "Contact Us")
- [ ] If multiple CTAs exist, primary and secondary are visually distinct
- [ ] CTA is visible without scrolling on both desktop and mobile

**CTA types and when to use:**
- "Book a Free AI Audit" — good for service companies; names the offer, low friction
- "See How It Works" — good for products needing demonstration
- "Download the Guide" — lead magnet; works for awareness-stage buyers
- "Start Free Trial" — product-led; requires a product that works without handholding
- "Talk to an Expert" — works when buyers need consultation before deciding

**Common failures:**
- "Get Started" with no context for what starts
- Two equally prominent CTAs creating decision paralysis
- CTA that sounds like work ("Fill Out the Form to Begin Your Journey")
- No CTA above the fold

---

## 4. Message hierarchy

**What it tests:** Do sections of the homepage appear in the right order to walk a buyer from awareness to conviction?

**Optimal sequence for B2B services/consulting:**
1. Hero: What it is, who it's for, why care
2. Problem: Agitate the pain — make the buyer feel their current situation
3. Solution: What you do and how it works (mechanism)
4. Social proof: Logos, case studies, testimonials (specific outcomes)
5. Offer: What the first step looks like (free audit, discovery call, pilot)
6. Differentiation: Why you vs. alternatives
7. FAQ: Answer the 3–5 objections that prevent conversion
8. Final CTA: One more ask

**Common failures:**
- Services listed before pain is established — buyer has no context for why they'd want them
- Testimonials placed below the fold where most visitors never reach
- "About Us" section appearing high on the page — visitors don't care about you yet
- FAQ absent when buyer objections are obvious and unanswered

---

## 5. Proof above the fold

**What it tests:** Is there any credibility signal visible before the buyer scrolls?

**Proof types ranked by impact:**
1. Specific case study result ("Cut onboarding time 60% at [Company]")
2. Named client logos (especially recognizable names)
3. Quantified outcomes ("50+ implementations across LATAM")
4. Media mentions / press logos
5. Social proof count ("Trusted by 200+ companies")
6. Testimonial snippet with name + title + company

**Common failures:**
- Zero proof above the fold
- Generic stock-photo team photo as the hero image
- "Years of experience" without any specifics
- Logos present but no named clients or outcomes

---

## 6. Jargon risk

**What it tests:** Does the copy use language that the target buyer doesn't actually use, creating confusion or distrust?

**High-risk jargon for B2B AI/tech companies:**
- "LLMs", "RAG", "embeddings", "vector databases" — wrong unless ICPs are technical teams
- "Agentic AI", "autonomous workflows" — emerging, not universally understood
- "Digital transformation" — overused, means nothing to buyers
- "AI-native", "AI-first", "AI-powered" — commoditized, meaningless signals
- "Leverage synergies", "unlock value" — consultant filler
- "Scalable solutions", "robust platform" — SaaS boilerplate

**How to identify jargon risk:**
- Ask: Would my ICP use this phrase in a Slack message to a colleague?
- Ask: If I removed this phrase, would the sentence still communicate something?
- Ask: Is this word on the buyer's ICP job description or in their industry publications?

---

## 7. Trust signals

**What it tests:** Would a skeptical buyer trust this company enough to give them their email address, let alone their budget?

**Trust signal checklist:**
- [ ] Company/team is identified with real names (not just a brand)
- [ ] Social proof is specific and attributed (name + title + company)
- [ ] Contact information is visible (email, LinkedIn, phone if appropriate)
- [ ] Privacy/security signals visible if data is involved
- [ ] Physical location or legal entity visible if targeting trust-sensitive markets (LATAM buyers often want this)
- [ ] No obvious red flags: stock photos of fake teams, no dates, recent domain registration

**Common failures:**
- No team photos or names anywhere on the site
- Testimonials without identifying information
- No "About" page or it's completely empty
- Domain registered 2 months ago with no history

---

## 8. Conversion friction

**What it tests:** How many steps, clicks, or decisions stand between interest and the first conversion action?

**Friction sources to identify:**
- Long contact forms (more than 3 fields for a discovery call = too much)
- Form that asks for company size, budget, timeline before a single value exchange
- "We'll get back to you" without a stated timeframe
- Requiring account creation before seeing value
- No calendar link (instead: "we'll email you to schedule")
- CTA that leads to a dead email inbox

**Low-friction conversion patterns:**
- Calendly / calendar link embedded directly on homepage
- Single-field email capture with a specific lead magnet
- WhatsApp / direct messaging link (especially effective in LATAM markets)
- Free diagnostic / audit offer that gives value first

---

## 9. Product/service clarity

**What it tests:** After reading the homepage, does the buyer know what they're actually buying?

**Questions to answer:**
- Is the deliverable named? ("You get a 4-week implementation sprint with 3 custom AI agents")
- Is the process described? ("We audit, design, build, and train your team")
- Is the format clear? ("Workshops", "Ongoing retainer", "Fixed-scope project")
- Is the time commitment clear? ("90 days", "1 day per week", "Indefinite")
- Is pricing or pricing signal visible?

**Common failures:**
- "We offer AI solutions tailored to your needs" — says nothing
- Service names that are internal labels, not buyer-meaningful ("AI Enablement Program")
- No deliverables, timeline, or format stated
- Pricing completely absent when the buyer expects a ballpark

---

## 10. Visual credibility

**What it tests:** Does the visual design support or undermine the claimed positioning?

**Check:**
- Does the visual quality match the price point? (Premium consulting should not look like a $49 template)
- Are images real (team, clients, work product) or generic stock?
- Does the color/typography feel appropriate for the industry and ICP?
- Are there obvious visual inconsistencies (mixed fonts, clashing colors, misaligned elements)?
- Mobile responsiveness (test if possible)

---

## 11. Section sequencing

**What it tests:** Does the page tell a story that builds conviction, or does it dump information?

**Sequence anti-patterns to flag:**
- Services listed before pain is established
- About Us before Why You Should Care
- Team bios before social proof
- Pricing (if present) before value is established
- Case studies at the bottom where no one scrolls
- FAQ missing entirely despite obvious objections
