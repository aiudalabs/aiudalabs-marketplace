# Common failure modes by business model

Conversation starters for the pre-mortem in Step 5. Ask the user for their own scenarios first; offer these only to widen the search. Every failure mode the brief keeps needs an early signal.

## B2C transactional and marketplaces

- **Chicken and egg**: multi-sided, neither side reaches critical mass.
- **Payment friction**: drop-off at the payment screen (local wallet not integrated, bank transfer not trusted).
- **Supply churn before revenue**: providers or sellers leave before they earn.
- **Trust collapse**: the first bad incident has no recovery mechanism.
- **CAC above LTV**: paid acquisition needed before organic loops start.

## B2C non-transactional (social, content)

- **Cold start**: no content so nobody posts, or no audience so nobody reads.
- **Moderation collapse**: toxic users drive healthy users away.
- **Engagement decay**: an initial spike with no retention loop.
- **Monetization mismatch**: ads alienate the base; subscriptions never convert.
- **Data trust collapse**: a privacy breach or surveillance fears.

## B2B SaaS

- **Sales cycle longer than runway**: enterprise sales take 6-12 months.
- **Buyer is not the user**: the product wins users and loses procurement.
- **Integration debt**: every customer wants their stack integrated; engineering drowns in custom work.
- **Onboarding cliff**: bought but never deployed; time to value above 30 days kills adoption.
- **Compliance roadblock**: SOC 2 or ISO 27001 demanded by enterprise and not in the MVP.

## B2B2C (EdTech, HealthTech, HR tech)

- **Adoption asymmetry**: the institution deploys, end users do not engage (the school adopts, parents never open the app).
- **Compliance is slow**: COPPA, HIPAA, FERPA are non-negotiable and take time.
- **One incident ends the contract**: a badly handled incident with minors or patients.
- **Procurement pace vs user urgency**: the institution moves slowly while users need it now.
- **Channel conflict**: parents distrust a school-mandated app.

## Internal (employee tools, warehouse, ops)

- **Adoption resistance**: employees prefer paper, Excel or the old system.
- **Integration drag**: connecting to the existing ERP or CRM eats the timeline.
- **Data quality**: field inputs are noisy; nothing reliable can be computed.
- **Audit gaps**: when something goes wrong, nobody can reconstruct what happened.
- **Sponsor turnover**: the internal champion leaves and the project loses cover.
