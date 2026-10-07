# Defaults that usually surface, by business model

Conversation starters for Steps 3 and 4. Apply only what fits the product's business model (D-02). The user decides; these only make sure the question gets asked.

## LATAM B2C transactional (marketplaces, e-commerce)

- **Payments**: a local wallet beats card-only (Yappy in Panamá, PIX in Brasil, Nequi in Colombia). When no processor is integrated yet, a transfer receipt plus admin verification is the MVP fallback.
- **Verification**: national ID or tax id capture for providers; selfie plus document for buyers in higher-trust categories.
- **Communication**: WhatsApp deep links for support and notifications; push for in-app.
- **Currency**: USD (Panamá, Ecuador, El Salvador) or local currency display; say which.
- **Language**: es-PA, es-CO, es-MX. Spanish by default; English only when the product also serves expats.
- **Onboarding**: phone number first (more reliable than email in LATAM); email optional.
- **Prices**: say whether taxes are included (ITBMS 7% in Panamá, IVA elsewhere). "Tax included" vs "+ taxes" is a decision.

## B2B SaaS

- **Auth**: SSO (SAML or OIDC) is table stakes for enterprise; email plus 2FA for the self-serve tier.
- **Pricing**: per seat, per organization or usage-based; 14-30 day trial; 15-20% annual discount.
- **Compliance**: SOC 2 Type II is the usual enterprise ask; HIPAA or ISO 27001 when the vertical demands it.
- **Onboarding**: time to first value under 30 minutes for self-serve; a dedicated success manager for enterprise.
- **Data residency**: where data lives can decide the deal.
- **Audit logs**: 7+ years retention for enterprise, immutable and queryable.

## B2B2C (EdTech, HealthTech, HR tech)

- **Institution auth**: SSO into the school, hospital or employer identity provider; the user account is linked to the institution.
- **End-user auth**: phone OTP for parents or patients; the institution provides the student or employee id.
- **Compliance**: COPPA (under 13, US), FERPA (education, US), HIPAA (health, US), Ley 81 (Panamá data protection), GDPR when EU residents are involved.
- **Data ownership**: the institution owns aggregate data; the user owns personal data.
- **Notifications**: who controls them; parents may opt out, the institution may override for safety.

## Internal (employee-only, warehouse, ops)

- **Auth**: corporate SSO, non-negotiable.
- **Distribution**: MDM enterprise distribution (Apple Business Manager, Android Enterprise), not the public stores.
- **Offline**: mandatory for field workers, with a sync queue.
- **Audit logs**: immutable, retained per company policy (7-10 years is typical).
- **Data residency**: matches the company's existing infrastructure.
- **Tenancy**: usually single-tenant.
