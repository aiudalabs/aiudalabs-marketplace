# Playbook: B2C-Panamá

The most verified playbook, drawn from Aiuda Labs' own consumer launches in Panamá. Costs in USD (Panamá uses the dollar; B/. is at par).

## 1. Confirm jurisdiction and product

Defaults: Panamá, USD, B2C, takes payments, no employees (contractors only). Override whatever the user says differs.

If the company already has an S.A. and a bank account, for example from a sister product, mark those items done; what remains is usually the product-specific part: app store accounts, Yappy if not integrated yet, insurance riders.

## 2. Items by category (8 categories)

Mark each item applies, does not apply or already done.

**Legal entity and tax registration (4 items; the entity blocks everything else)**
- Sociedad Anónima (S.A.): required for consumer transactions and for a bank account.
- RUC with the DGI (Dirección General de Ingresos): the company's tax id.
- Aviso de Operaciones: the operating notice, filed through Panamá Emprende (MICI). Required to sell legally and separate from the RUC; confirm the municipal tax registration that goes with it.
- ITBMS registration: only when projected revenue exceeds B/. 36,000 a year.

**Banking (3 items)**
- Corporate bank account: usually Banco General, Banistmo or BAC.
- Business credit or debit card: ad spend, store fees, subscriptions.
- USD account: Panamá uses the dollar, but some banks distinguish account types.

**Payments (3-5 items, product-dependent)**
- Yappy: Banco General's mobile payment, the default way Panamanian consumers pay from their phone. Expected by consumers, though it can be cut from the MVP (see section 7).
- ACH: for higher-value transactions.
- Card merchant: Stripe (international), Tilopay (local), PagoPop, Mercado Pago.
- Cash or transfer-receipt fallback: manual review by an admin in the MVP.

**App stores (3 items)**
- Apple Developer Program: $99 a year, required for iOS.
- Google Play Console: $25 once, required for Android.
- Store assets: icon, screenshots, Spanish copy, privacy policy URL.

**Insurance (1-3 items)**
- General liability: basic protection.
- Cyber insurance: optional, recommended when processing personal data.
- D&O: for funded companies, optional otherwise.

**Compliance (3 items)**
- Privacy policy and terms of service: Spanish, compliant with Ley 81 de 2019 on personal data protection.
- Data protection registration with ANTAI: Ley 81 requires it for many uses of personal data; confirm whether the product's use is covered.
- ITBMS price display: prices include or explicitly exclude the 7 % ITBMS; never ambiguous.

**Accounting (2 items)**
- Monthly accounting service: typically $150-300 a month, needed for tax filings.
- Annual fiscal review: required for an S.A.

**Customer support (2 items)**
- Support channel: email, phone or WhatsApp Business.
- Help center or FAQ: minimum 5-10 articles in Spanish.

## 3. Dependency graph

```
S.A. constitution (2-3w)
    ↓
RUC + Aviso de Operaciones (1-2w)
    ↓
Corporate bank account (4-8w) ←── slowest single step
    ↓
Business credit card (1w)
    │
    ├─→ Apple Developer + Google Play (1-2w)
    │       ↓
    │   Store assets + privacy policy (1-2w, in parallel with the build)
    │       ↓
    │   Store review (1-7 days)
    │
    ├─→ Card merchant: Tilopay / Stripe (2-4w)
    │       ↓
    │   Yappy (2-4w)
    │       ↓
    │   ACH (2-4w, optional in MVP)
    │
    └─→ Insurance (2-4w, in parallel)
```

## 4. Worked item example

```
## Yappy

What it is: Banco General's mobile payment system, dominant for consumer
            payments in Panamá. The user pays from the Yappy app linked
            to their bank account.

Why needed: Most Panamanian consumers expect to pay with Yappy; a consumer
            product without it sees high checkout abandonment.

Owner: founder + bank account manager + developer (integration)

Timeline:
  - Low: 2 weeks — bank account already open, fast integration
  - Expected: 3-4 weeks
  - High: 6 weeks — extra bank documentation or KYC delays

Cost:
  - One-time: $0
  - Recurring: ~1.5 % per transaction (negotiable on volume)

MVP cut: Yes — accept manual transfers verified by an admin in the MVP.
         Adds operational work, does not block launch.

References: Yappy for businesses through the Banco General account
            manager; there is no public self-service signup.
```

## 5. Usual owners

- Founder: signatures, decisions, brand.
- Lawyer and accountant: incorporation, tax registrations.
- Developer (the backend owner): Yappy, ACH and card integrations, store assets.

## 6. Cost summary

```
One-time (MVP launch)
  S.A. constitution + Aviso de Operaciones      $500–1,200
  Apple Developer Program                       $99
  Google Play Console                           $25
  Legal docs (privacy, terms, contracts)        $500–2,000 (templates)
                                                or $2,000–5,000 (custom)
  Bank account opening                          $0–200
  Insurance setup                               $0–500
  TOTAL ONE-TIME                                $1,124–7,024

Recurring (monthly)
  Accounting service                            $150–300
  Apple Developer (annual / 12)                 $8.25
  Insurance (annual / 12)                       $40–125
  Virtual office address                        $30–80
  TOTAL RECURRING (excl. payment fees)          $228–513
  Yappy fees                                    ~1.5 % of revenue
  Card processing fees                          ~3 % of revenue
```

## 7. Critical path

> **12-18 weeks from start to first transaction, typically.**
> S.A. (2-3w) → RUC + Aviso (1-2w) → bank (4-8w) → merchant (2-4w) → Yappy (2-4w).
> The step ranges add up to 11-21 weeks; most launches land in 12-18.
>
> If launch is less than 12 weeks away, Yappy cannot be in the MVP: defer it, or start from an existing S.A. and bank account.

## 8. MVP cuts and blockers

Can be deferred:
- Yappy → manual transfer verified by an admin.
- ACH → almost always a later release.
- Cyber insurance → unless processing more than about 1,000 user records.
- D&O → unless the company has raised money.
- Help center → email-only support at first.
- ITBMS registration → only above B/. 36,000 a year projected.

Hard blockers:
- S.A. constitution.
- RUC and Aviso de Operaciones.
- Corporate bank account.
- Privacy policy and terms (the stores reject apps without them).
- Apple Developer and Google Play accounts.
- Basic insurance, when the bank requires it for the merchant account. Ask the bank.

## 9. Anti-patterns specific to this playbook

- **Forgetting the Aviso de Operaciones.** It is separate from the RUC and often skipped; operating without it invites a fine.
- **Leaving privacy policy and terms for submission day.** Apple and Google reject without them; discovering it then costs 1-2 weeks.
- **Assuming insurance is optional.** Banks often require it for merchant accounts.
- **Promising a bank account in under 4 weeks.** Panamá corporate accounts take 4-8 weeks.
