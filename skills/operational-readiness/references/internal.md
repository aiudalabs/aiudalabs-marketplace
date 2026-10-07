# Playbook: Internal

> **Estimate accuracy: low.** This playbook follows standard enterprise IT practice, not Aiuda Labs' verified experience, and assumes the organization already has corporate IT (SSO, identity management, MDM). For a small company without it, costs and timelines are significantly higher. State this caveat in the document.

## 1. Confirm context

Ask:
- Organization size: SMB (under 100 employees), mid-size (100-1,000), enterprise (1,000+).
- Corporate SSO in place? (Google Workspace, Microsoft Entra ID, Okta.)
- MDM in place? (Jamf, Intune, Kandji.)
- Number of employees using the app at launch.
- Sensitivity of the data: public, internal, confidential, restricted.
- Compliance regime: none, the organization's SOC2 or ISO 27001, HIPAA, another regulated industry.

These answers decide whether this is a small lift or an enterprise IT project.

## 2. Items by category (4 categories)

**IAM and SSO (3 items)**
- SSO with the corporate identity provider, over SAML 2.0 or OpenID Connect.
- Group-to-role mapping: directory groups become app roles.
- Service accounts and API keys for service-to-service calls, rotated quarterly.

**MDM and distribution (3 items, only for mobile apps)**
- iOS: Apple Business Manager with custom apps, published through the standard Apple Developer Program ($99 a year). The Apple Developer Enterprise Program ($299 a year) is only for organizations that qualify and need in-house distribution outside Apple Business Manager.
- Android: Android Enterprise with managed Google Play (Google Play Console, $25 once).
- MDM rollout (Jamf, Intune, Kandji) to push, configure and revoke the app on employee devices.

**IT compliance (3-5 items, by regime)**
- Data classification: document the tier of data the app handles.
- Acceptable use: confirm the app complies with company policy; get sign-off.
- Security review by the internal IT or security team before launch, typically 2-4 weeks.
- SOC2 or ISO 27001 evidence, only if the organization is certified: the app contributes evidence and needs no separate audit.
- HIPAA or other regulated-industry requirements, only if they apply.

**Audit logs and data retention (2 items)**
- Immutable audit log: every privileged action with user, timestamp and action, kept per the company's retention policy (7 years is typical for finance, 6 for general business records).
- Data retention and offboarding: what happens to a user's data and access when they leave, documented and automated.

## 3. Dependency graph

```
IT / security review request (1-2w)
    ↓
Data classification + acceptable use approval (1-2w)
    │
    ├─→ SSO integration (1-3w, depends on IT availability)
    │       ↓
    │   Role mapping (1w)
    │       ↓
    │   Pilot with a small group (1-2w)
    │
    ├─→ MDM rollout (2-4w, owned by IT)
    │       ↓
    │   Distribution to all employees (1w)
    │
    └─→ Audit logging (1-2w, developers)
        Retention policy + automation (1-2w)
```

## 4. Worked item examples

**SSO with the corporate identity provider**
- What: the app signs users in through the company's identity provider over SAML 2.0 or OpenID Connect.
- Why: one set of credentials, access revoked automatically at offboarding, required by most corporate policies.
- Owner: corporate IT plus the developer who owns authentication.
- Timeline: 1-3 weeks when SSO exists and IT responds; 4-8 weeks when SSO has to be set up first.
- Cost: $0 marginal with SSO in place; $5-10 per user per month for Google Workspace or Microsoft 365 business plans otherwise.
- MVP cut: a small pilot may use email or one-time codes; general availability requires SSO.
- References: the stack's auth provider documentation for SAML and OIDC (Firebase needs Identity Platform for SAML; FastAPI apps typically use an OIDC library against the provider).

**MDM rollout**
- What: corporate MDM pushes the app to employee devices, configures it and revokes it at offboarding.
- Why: compliant distribution, no leakage to personal devices, managed updates.
- Owner: corporate IT (Jamf or Intune admin) plus developers (the IPA or AAB and the configuration schema).
- Timeline: 2-4 weeks for the first rollout with MDM in place; 4-8 weeks if MDM must be deployed company-wide first.
- Cost: MDM licenses about $3-7 per device per month; rollout services often $5-30K depending on size.
- MVP cut: pilot through TestFlight or internal app sharing; MDM for general availability.
- References: Apple Business Manager, Android Enterprise, Jamf and Intune documentation.

Detail every other item the same way.

## 5. Usual owners

- Internal IT and security: SSO, MDM, compliance review (lead).
- Developers: SSO integration, audit logging, retention automation.
- Compliance officer, if regulated.
- Business sponsor or PM: business case, stakeholder relationships.

## 6. Cost summary

```
One-time (MVP launch, corporate IT exists)
  SSO integration                               $0 (internal developer time)
  MDM rollout coordination                      $0–5,000
  Security review                               $0 (in-house) or $2,000–10,000 (external)
  Apple Developer + Google Play (if not held)   $99/year + $25
  TOTAL ONE-TIME                                $124–15,124

Recurring (monthly, on top of existing IT)
  MDM licenses                                  $3–7 per device
  Audit log storage with retention              $50–200
  TOTAL RECURRING                               depends on device count
```

## 7. Critical path

> **4-8 weeks** when corporate SSO and MDM exist and IT responds.
>
> **No corporate IT yet** (a small company's first internal app): add 4-8 weeks for SSO and MDM themselves; 8-16 weeks in total.
>
> **Regulated industry** (health, finance): add 4-8 weeks of compliance review; 8-16 weeks in total.

## 8. MVP cuts and blockers

Can be deferred:
- Full MDM rollout → TestFlight or internal sharing for the pilot.
- External security audit → internal IT review first; external audit later if regulated.
- Audit logs to a data warehouse → start with the cloud provider's logging; pipe to BigQuery or Snowflake later.

Hard blockers:
- SSO, or a formal written exception from IT and security.
- Data classification and acceptable use approval; without them IT blocks the rollout.
- Basic audit logging, even a thin logger to the cloud provider's logging.

## 9. Anti-patterns specific to this playbook

- **Skipping the security review for speed.** IT blocks the app when it finds it; engage them early, even if it is slow.
- **Building in-app passwords instead of SSO.** It breaks corporate identity policy and usually dies at security review.
- **Forgetting offboarding.** Plan what happens to data and access from day one.
- **Treating internal as low-compliance.** Even unregulated internal apps need an audit trail; without one, the first incident is the last.
