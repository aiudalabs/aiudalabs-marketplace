---
name: product-discovery
description: "Takes a product idea that is about to be built from vague to locked: a one-page PRODUCT_BRIEF.md and an OPINIONATED_DEFAULTS.md with 10-12 numbered decisions (D-01, D-02...), each with rationale, rejected alternatives and a re-decide trigger, including the business model and the locked stack profile. Forces commitments, rejects 'it depends', and runs a pre-mortem before locking anything. Use when the user says 'tengo una idea para una app', 'nuevo proyecto', 'qué incluyo en el MVP', 'help me scope the MVP' or describes a marketplace, SaaS or app concept with no written brief. Phase 1 of the product-spec workflow. It does not decide whether the idea is worth building or how to position it: for brand attributes and visual direction use brand-strategy-brief, for an adversarial audit of positioning, ICP and launch readiness use startup-positioning-audit. Once a brief exists, use product-requirements for the PRD."
license: MIT
metadata:
  version: "1.0.0"
  author: aiudalabs
  requires: stack-profile-flutter-firebase stack-profile-fastapi-react
  argument-hint: "<product idea>"
---

# Product Discovery

Turn a vague product idea into a locked product brief with opinionated defaults. This is Phase 1 of the product-spec workflow and the most consequential one: every later phase takes its outputs as ground truth.

The job is not to brainstorm. It is to **force decisions** on the 10-12 questions that, once answered, determine almost everything else: schema shape, screens, architecture, sprint plan. A weak Phase 1 produces a weak everything.

The seven phases of the workflow, for reference: 1 discovery (this skill), 2 requirements (`product-requirements`), 3 schema (`schema-design`), 4 UI (`ui-screens-spec`), 5 architecture (`system-architecture`), 6 governance (`multi-agent-governance`), 7 mockups (`navegable-mockups`).

## When to use it, and when not

Use it when the user describes something they intend to build and there is no written brief: "tengo una idea para...", "quiero hacer una app que...", "nuevo proyecto", "scope MVP", "opinionated defaults", or a long message describing a marketplace, social app, vertical SaaS or internal tool.

Do not use it when:

- `docs/PRODUCT_BRIEF.md` already exists. If there is no `docs/PRD.md`, go to `product-requirements`; if there is, go to `schema-design`.
- The user is iterating on a live product. This skill starts products; it does not spec features of a running one.
- The user is still deciding whether to build at all, or wants positioning, ICP or messaging work. That is `startup-positioning-audit`. Brand personality and visual direction are `brand-strategy-brief`.
- The user has not said what the product does. Ask first.

## What it produces

Two documents in `./docs/`, written in **English** because they travel to the coding agents. The conversation with the user is in **Spanish**.

| File | Length | Purpose |
|---|---|---|
| `PRODUCT_BRIEF.md` | 80-150 lines | What, who, where, the value loop, scope boundaries |
| `OPINIONATED_DEFAULTS.md` | 200-400 lines | 10-12 numbered decisions, performance budgets, deferral list |

### `PRODUCT_BRIEF.md`

1. **Tagline**: one sentence, 15 words at most. What the product does.
2. **Apps**: the apps to build (customer-app, provider-app, admin-dashboard...) with the platform of each.
3. **Market**: country or region, primary language, the cultural facts that matter (cash-heavy economy, low banking penetration, dominant messaging app).
4. **Core value loop**: 4-6 numbered steps through which a user reaches their goal end to end. A loop longer than 6 steps means the MVP is too broad.
5. **Personas**: 3-5 concrete people with name, age, situation and need. No archetypes ("the busy professional").
6. **Adversarial analysis**: 3-5 plausible failure modes in order of likelihood, each with the early signal that would warn the team.
7. **Do-not-build list**: 5-10 features the user explicitly chose not to build. This is what makes the brief opinionated.

### `OPINIONATED_DEFAULTS.md`

One `##` heading per decision, numbered `D-01`, `D-02`... in order. This exact shape is what the `spec-guard` scripts and every later phase read:

```markdown
## D-04 — Payment at booking confirmation

**Lock:** The customer pays when the provider confirms the booking, never before.

**Rationale:** Two to four sentences on why this and not the alternatives.

**Alternatives rejected:**
- Pay at request time — refunds on every provider rejection erode trust.
- Pay after the service — no-shows leave providers unpaid.

**Re-decide trigger:** Provider rejection rate above 30% for two consecutive weeks.
```

Rules:

- The id is `D-` plus two digits, followed by ` — ` and a short title.
- **D-01 is always the stack profile.** Its lock line is followed by the profile line, exactly: `**Stack profile:** flutter-firebase` (or `fastapi-react`). Every later phase reads this line.
- **D-02 is always the business model** (Step 2).
- A decision the user consciously postpones out of this release carries `(deferred)` in its heading: `## D-11 — Loyalty points (deferred)`. It keeps its id, still has a lock ("No loyalty program in this release"), and needs no implementation issue.
- Once a decision is numbered, its id never changes. A reversed decision is edited in place, not renumbered.

After the decisions, two closing sections that are not numbered decisions:

- `## Performance budgets`: numeric targets (cold start, time to first action, notification latency, sync delay). Milliseconds and seconds, never adjectives.
- `## Deferral list`: `### v1.1`, `### v2`, `### v∞` with every feature the user mentioned that is not in the MVP. A feature that is neither in the MVP nor in a bucket does not exist.

## The method

### Step 1: Intake, four questions in one message

1. **¿Qué hace el producto?** En una frase, sin features: el verbo y el objeto. ("Conecta clientes con proveedores de servicios": sí. "Una app con chat, pagos, calendario y reseñas": no, eso es una lista de features.)
2. **¿Quién lo usa?** Identifica los tipos de usuario reales. No asumas un marketplace bilateral: hay productos con estudiante/profesor/padre, autor/lector, courier/restaurante/cliente, operador/supervisor/auditor, o un único tipo de usuario. Para cada uno: ¿qué hace en el producto y desde qué app (móvil, tablet, web)? El número y nombre de apps es un resultado de esta fase, no un dato de entrada.
3. **¿En qué mercado?** País, idioma, contexto cultural relevante.
4. **¿Qué stack profile?** Ofrece los dos perfiles del catálogo. Para presentarlos, carga el skill `stack-profile-flutter-firebase` y el skill `stack-profile-fastapi-react` y resume la sección "Identity" de cada uno (cuándo usarlo y cuándo no):
   - `flutter-firebase` (default): Flutter apps + Firebase + React admin. Mobile-first, realtime, serverless.
   - `fastapi-react`: Python FastAPI + Postgres + React, self-hosted. B2B tools, internal platforms, workers and queues.

   Si el producto necesita un stack que no tiene perfil, para aquí: se escribe ese perfil primero (un skill `stack-profile-<id>` que responda los 9 puntos del contrato) y luego se continúa. Nunca se avanza con un stack "genérico".

If the user cannot answer (1) without listing features, that is itself the discovery problem. Push back ("no me describas las pantallas, dime el verbo del producto") until you have one sentence.

### Step 2: Identify the business model

This decision is load-bearing: steps 3-6 bend on it. Ask explicitly; do not infer, and never default silently to B2C transactional.

> ¿Cuál de estos modelos describe mejor tu producto? B2C transaccional, B2C no transaccional, B2B SaaS, B2B2C o Interno. Si dudas entre dos, dime cuáles y lo discutimos.

| Business model | Definition | Typical products |
|---|---|---|
| **B2C transactional** | The consumer pays for goods or services | E-commerce, marketplaces, paid subscriptions |
| **B2C non-transactional** | Free to the consumer, monetized indirectly | Social, free content, freemium, ad-supported |
| **B2B SaaS** | A business pays a subscription or license | CRM, vertical SaaS, admin tools sold to companies |
| **B2B2C** | A business pays, end users use it | EdTech (school pays, parents use), HealthTech, benefits |
| **Internal** | No external customers | Warehouse management, ops dashboards, employee apps |

The choice decides whether the Money category applies, whether app stores are needed (Internal often uses MDM distribution), which variant of the `operational-readiness` skill applies later, and which failure modes to probe in Step 5. Lock it as `D-02`.

### Step 3: Pick the decision categories that apply

| Category | Applies to |
|---|---|
| **Money** | B2C transactional, B2B SaaS, B2B2C with payments. Skip for B2C non-transactional and Internal. |
| **Identity** | All. Rigor varies: Internal uses corporate SSO, B2C uses phone or email OTP, B2B SaaS uses email plus SSO. |
| **Scope** | All. Geography matters even for Internal (multi-country deployments). |
| **Operations** | All. Channels differ: B2C uses WhatsApp and push, B2B uses email and Slack or Teams, Internal uses email and in-org push. |
| **Trust** | All, with different emphasis: B2C on fraud and moderation, B2B on privacy and audit, B2B2C on compliance (COPPA, HIPAA, FERPA). |

Walk through the categories that apply, 1-3 questions each. Aim for 10-12 decisions in total, D-01 and D-02 included. Fewer than 8 means the product is under-specified. More than 12 means you are doing schema or architecture work in Phase 1: stop and move it to those phases.

[references/defaults-by-model.md](references/defaults-by-model.md) has the defaults that usually surface for each business model (LATAM payments, SSO, compliance, MDM). Use them as conversation starters, never as automatic locks.

### Step 4: Force opinionated answers

Every decision gets one option. "It depends" is not an answer. "Both" is allowed only when the product genuinely needs both and the user can say when each applies.

When the user hesitates, recommend with a reason and ask them to accept or counter-propose:

> Por defecto recomiendo: **comisión 0% en el MVP, activada en v1.1**.
> Razón: en LATAM los marketplaces fracasan por falta de oferta, no por falta de ingresos. Subsidiar a los proveedores en el MVP acelera la masa crítica.
> ¿Aceptas, o lo cambiamos?

The skill is an opinionated negotiator, not a passive interviewer. The user owns every call.

### Step 5: Adversarial analysis, the five-minute pre-mortem

Before locking any decision, ask:

> Imagina que pasaron 6 meses, lanzaste el producto y fracasó. **¿Por qué fracasó?** Dame los 3-5 escenarios más probables, en orden.

[references/failure-modes.md](references/failure-modes.md) lists the common failure modes per business model, to prompt the conversation, not to fill the section for the user.

For every failure mode, always ask: "¿qué señal temprana lo detectaría?" A failure mode without a signal is also a measurement problem. Write them into the brief's "Adversarial analysis".

### Step 6: Performance budgets as numbers

| Metric | Example budget | Why |
|---|---|---|
| Cold start | < 2 s on a mid-range Android | LATAM device fleets are older |
| Time to first action | < 30 s from app open | Users churn when nothing happens in 30 s |
| Notification latency | < 5 s end to end | In on-demand marketplaces a 30 s delay loses the transaction |
| Search results | < 1 s after typing | Below this users perceive "instant" |
| Offline mode | Read-only for 24 h, writes queue | Connectivity is intermittent |

If the user does not know the right number, take the industry default for comparable products and lock it. The number can be revisited; its absence cannot.

### Step 7: Explicit deferral list

Put everything the user mentioned that is not in the MVP into a bucket:

- **v1.1** (1-3 months after MVP): features that need MVP data first (recommendations; ratings need completed bookings).
- **v2** (3-12 months): features that need v1.1 maturity (group bookings, subscriptions).
- **v∞**: out of scope until a strategic shift.

Surface hidden features: "no mencionaste reseñas en el MVP: ¿v1.1 o v∞?". When the user postpones a whole *decision* (not just a feature), record it as a `(deferred)` decision so later phases see it was considered.

### Step 8: Coherence check

Before writing the documents, verify:

1. The value loop runs on MVP features only, with no dependency on a deferred feature.
2. Every persona can complete the loop under the locked decisions (a persona without a card cannot pay if card-only is locked).
3. Every failure mode has a mitigation in a decision or the deferral list.
4. The budgets are achievable with what the decisions imply ("search < 100 ms" implies a cache that may not be in scope).

When a check fails, show it and ask the user to change a decision, add a feature to the MVP, or accept the risk explicitly.

### Step 9: Write the documents and stop at the gate

Write `docs/PRODUCT_BRIEF.md` and `docs/OPINIONATED_DEFAULTS.md`. If the `spec-guard` skill is installed in the project, run `node tools/spec-guard/spec.mjs check` and fix every error it reports on the decisions file (ids, headings, stack profile line).

Then overwrite `docs/SESSION.md` so the next session can resume:

```markdown
# Session state — {product name}

| Phase | Skill | Status |
|---|---|---|
| 1 | product-discovery | Complete |
| 2 | product-requirements | Pending |
| 3 | schema-design | Pending |
| 4 | ui-screens-spec | Pending |
| 5 | system-architecture | Pending |
| 6 | multi-agent-governance | Pending |
| 7 | navegable-mockups | Pending |

## Last completed: Phase 1 — product-discovery
## Key decisions this phase
{3-5 concrete bullets, citing D-xx ids}
## Open questions
{or "None"}
## Next recommended action
"Escribamos el PRD de {product name}."
```

**Gate.** Close with:

> Fase 1 cerrada. {N} decisiones locked (D-01 a D-{N}), {M} features diferidas, stack profile `{id}`. La siguiente fase es el PRD (`product-requirements`), que lee estos dos documentos como ground truth. Si quieres revisar una decisión, este es el momento más barato. ¿Avanzamos?

Wait for explicit approval before treating the phase as complete. For a critical second look before approving, the user can ask the `product-advisor` agent to review the brief for gaps.

## Anti-patterns

- **"It depends" as an answer.** Push back; the point is commitment.
- **Boiling the ocean.** 30 personas and 50 features is brainstorming. Cap personas at 5 and features at the value loop.
- **Defaults as wishes.** "Users will love this" is a wish. A default has a rationale and a re-decide trigger.
- **Performance as adjectives.** "Snappy", "fast" mean nothing. Force milliseconds.
- **Skipping the pre-mortem.** A decision locked without one is faith, not engineering.
- **Single-persona thinking.** At least three personas, one outside the founder's bubble (rural, older, cheap data plan).
- **Feature-first thinking.** The brief asks for the value loop, not the inventory.
- **Ignoring LATAM context.** Always-online, always-card, always-new-phone defaults break in LATAM: cash, intermittent connectivity, older devices, WhatsApp as the default channel.
- **Producing a strategy document.** This skill assumes the build is decided. Market sizing and competitive analysis come before it.
- **Renumbering decisions.** Later phases, issues and commits cite D-xx ids; renumbering breaks every link.

## What this skill does not do

- Design the data model (Phase 3, `schema-design`), screens (Phase 4) or sprints (Phase 6).
- Write requirements with acceptance criteria (Phase 2, `product-requirements`).
- Validate whether the idea is worth building, size the market or audit positioning.
- Invent decisions for the user. It surfaces options and forces a choice; the user decides.
- Lock more than 12 numbered decisions.
