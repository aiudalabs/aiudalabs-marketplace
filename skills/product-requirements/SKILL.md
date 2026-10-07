---
name: product-requirements
description: "Turns an approved PRODUCT_BRIEF.md and OPINIONATED_DEFAULTS.md into PRD.md: functional requirements with stable ids (### FR-ORDER-1 — Title) and Given/When/Then acceptance criteria, traceability to persona jobs and D-xx decisions, explicit out of scope, numeric non-functional requirements, user stories and success metrics. Use when the user asks for a PRD, requisitos, criterios de aceptación, user stories or 'qué entra y qué no en el MVP', or for Phase 2 of the product-spec workflow once the brief is approved. It needs the brief: with only an idea and no locked decisions, use product-discovery first. It specifies what the product must do, not the data model (schema-design) or the screens (ui-screens-spec)."
license: MIT
metadata:
  version: "1.0.0"
  author: aiudalabs
---

# Product Requirements (PRD)

Turn the approved brief into a **verifiable requirements contract**. It sits between `product-discovery` (why: vision, personas, locked decisions) and `schema-design` (how: data). Every later phase derives from this PRD: the schema serves its requirements, the screens realize its user stories, and the backlog issues cite its ids. So requirements are written to be **testable**, not aspirational.

For each thing the product must do, answer: *what is the observable behavior, and how do we know it works?* A requirement that cannot be phrased as a Given/When/Then someone could check is not ready.

This is Phase 2 of seven: 1 discovery, 2 requirements, 3 schema, 4 UI, 5 architecture, 6 governance, 7 mockups.

## When to use it, and when not

Use it for "PRD", "requisitos", "requirements", "criterios de aceptación", "user stories", "qué tiene que hacer el producto", "alcance del MVP", or as Phase 2 after `product-discovery` is approved.

Do not use it when:

- There is no approved `docs/PRODUCT_BRIEF.md` with `docs/OPINIONATED_DEFAULTS.md`. Run `product-discovery` first.
- The user wants the data model (`schema-design`) or the screens (`ui-screens-spec`).
- The user wants the sprint backlog and agent lanes. That is `multi-agent-governance`, which consumes this PRD.

## Inputs (stop and ask if one is missing)

- `docs/PRODUCT_BRIEF.md`: personas, the core value loop, the do-not-build list.
- `docs/OPINIONATED_DEFAULTS.md`: the locked decisions `D-01`, `D-02`... including the stack profile (D-01) and the business model (D-02), the performance budgets and the deferral list. A requirement never contradicts a locked decision; if one would, flag it.

## What it produces: `docs/PRD.md`

Written in English; the conversation stays in Spanish.

1. **Overview**: one paragraph, what the product does and for whom (from the brief).
2. **Personas and top jobs**: per persona from the brief, the 2-4 jobs this release serves. No new personas.
3. **In scope (this release)**: bulleted capabilities, each one a group of requirements below.
4. **Out of scope**: what is deliberately not done, one-line reason each. Inherit and extend the brief's do-not-build list and the defaults' deferral list.
5. **Functional requirements**, grouped by capability under `##` headings, one `###` heading per requirement (format below).
6. **Non-functional requirements**: performance, security and permissions, availability, localization, each with a number or a yes/no check. Reuse the budgets from `OPINIONATED_DEFAULTS.md` verbatim.
7. **User stories**: per persona, `As a <persona>, I want <goal>, so that <value>`, each listing the FR ids it covers.
8. **Success metrics**: 3-5 measurable outcomes (activation, conversion, latency, error rate), each with a target and how it is measured. This is the release's definition of "working".
9. **Open questions and assumptions**: each tagged `[SUPUESTO]` so the person validates it at the gate.

### Requirement format

The `spec-guard` scripts and the backlog read this exact shape:

```markdown
### FR-ORDER-1 — A customer places an order from a table

- Given a customer scanned a valid table QR and has items in the cart
- When they confirm the order
- Then the order is created with status `placed`, the kitchen dashboard shows it within 3 s, and the customer sees an order-received confirmation

**Traces:** Job "order without waiting for staff" (Ana, diner) · D-04, D-07
```

- The id is `FR-`, an uppercase area, `-`, a number: `FR-ORDER-1`, `FR-AUTH-3`. Areas are short nouns from the capability (ORDER, BOOKING, AUTH, PAYOUT). Numbers start at 1 per area.
- The heading is `### `, the id, ` — `, and a one-line statement of the behavior.
- One or more Given/When/Then groups follow. A requirement with several outcomes may have several groups.
- `**Traces:**` names the persona job and the D-xx ids the requirement depends on. Cite decision ids exactly as they appear in `OPINIONATED_DEFAULTS.md`.
- A requirement taken out of this release keeps its id and gets `(deferred)` in its heading: `### FR-LOYALTY-1 — Customer earns points per order (deferred)`. It needs no implementation issue. Ids are never reused or renumbered: issues and commits cite them.

## The method

### Step 1: Read the brief, do not restate it

Extract personas, the value loop, the business model (D-02) and the out-of-scope seed. The PRD assumes the vision; it does not re-derive it.

### Step 2: Capabilities from jobs

For each persona job, list the capabilities the product must offer to satisfy it. Keep the MVP honest: a capability that serves no stated job goes to Out of scope with a reason.

### Step 3: Write each requirement as Given/When/Then

Forbid vague verbs ("manage", "handle", "support") without an observable outcome. If the Then cannot be checked, the requirement is underspecified: split it, or mark the gap `[SUPUESTO]`.

### Step 4: Trace every requirement

Each FR cites the persona job it serves and any decision it depends on. A requirement with no traceable purpose is scope creep: drop it or move it to Out of scope. A requirement that contradicts a locked decision is a **blocker**: show it to the user, do not override the decision. Changing a decision means editing it in `OPINIONATED_DEFAULTS.md` with the user's approval.

### Step 5: Make non-functional requirements numeric

"Fast", "secure", "scalable" are not requirements. Convert to p95 latency budgets, permission matrix rows (who can do what), supported locales, an uptime target.

### Step 6: Derive success metrics

3-5 outcomes that prove the release works, each with a target and a measurement method. QA later checks the build against them.

### Step 7: Coherence check and gate

Check that:

- Every persona job has at least one FR.
- Every FR has acceptance criteria and a `**Traces:**` line.
- Every D-xx cited exists and is not contradicted.
- Every non-deferred decision that implies behavior is served by at least one FR.
- Out of scope is explicit.

Mark anything unresolved `[SUPUESTO]`. If the `spec-guard` skill is installed in the project, run `node tools/spec-guard/spec.mjs check` and fix every error on `docs/PRD.md`. For a critical second look, the user can ask the `product-advisor` agent to review the PRD.

Overwrite the phase table in `docs/SESSION.md`: Phase 2 (`product-requirements`) complete, next `schema-design`, with 3-5 bullets on what was decided and the open `[SUPUESTO]` items.

**Gate.** Close with:

> Fase 2 cerrada. {N} requisitos funcionales en {M} áreas, {K} diferidos, {J} supuestos abiertos. La siguiente fase es el modelo de datos (`schema-design`). ¿Validamos los supuestos y avanzamos?

Wait for explicit approval.

## Anti-patterns

- Acceptance criteria that restate the title instead of an observable Then.
- Requirements without ids: later phases cannot reference them.
- Inventing personas or features not traceable to the brief.
- Silently disagreeing with a locked decision.
- Non-functional "requirements" made of adjectives.
- Designing tables or screens here.

## Handoff

`schema-design`, `ui-screens-spec`, `system-architecture` and `multi-agent-governance` all read `PRD.md`. The data model serves the FRs' state, the screens realize the user stories, and the FR ids become the spine of the backlog: each issue lists the FRs it implements in `requirement_refs`.

## What this skill does not do

- Pick data stores, tables or screens.
- Write code, the backlog or agent lanes.
- Reopen the vision or the decisions locked in Phase 1. It builds on them and flags conflicts.
