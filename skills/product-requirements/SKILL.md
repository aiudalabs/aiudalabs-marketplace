---
name: product-requirements
description: "Turns an approved PRODUCT_BRIEF.md and OPINIONATED_DEFAULTS.md into PRD.md: functional requirements with stable ids (### FR-ORDER-1 — Title) and Given/When/Then acceptance criteria, traceability to persona jobs and D-xx decisions, explicit out of scope, numeric non-functional requirements, user stories and success metrics. Use when the user asks for a PRD, requisitos, criterios de aceptación, user stories or 'qué entra y qué no en el MVP', or for Phase 2 of the product-spec workflow once the brief is approved. It needs the brief: with only an idea and no locked decisions, use product-discovery first. It specifies what the product must do, not the data model (schema-design) or the screens (ui-screens-spec)."
license: MIT
metadata:
  version: "1.1.0"
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

- `docs/PRODUCT_BRIEF.md`: user groups, personas with their job ids (`J-CARLOS-1`), the core value loop, the do-not-build list.
- `docs/OPINIONATED_DEFAULTS.md`: the locked decisions `D-01`, `D-02`... including the stack profile (D-01) and the business model (D-02), the performance budgets and the deferral list. A requirement never contradicts a locked decision; if one would, flag it.

## What it produces: `docs/PRD.md`

Written in English; the conversation stays in Spanish. The headings are fixed, so the levels never clash:

```markdown
# PRD — {project title}

## 1. Overview
## 2. Personas and jobs
## 3. In scope
## 4. Out of scope
## 5.1 {Capability}           one `##` per capability group, numbered 5.1, 5.2...
### FR-BOOKING-1 — ...        one `###` per requirement, inside its group
## 5.2 {Capability}
### FR-PAYMENT-1 — ...
## 6. Non-functional requirements
## 7. User stories
## 8. Success metrics
## 9. Open questions and assumptions
```

Section 5 has no heading of its own: its capability groups are the `## 5.x` headings.

1. **Overview**: one paragraph, what the product does and for whom (from the brief).
2. **Personas and jobs**: per persona from the brief, the jobs this release serves, by their brief ids (`J-CARLOS-1`). No new personas. The operator groups (admins, support, finance) appear here through their personas in the brief.
3. **In scope**: bulleted capabilities, each one a `## 5.x` group below.
4. **Out of scope**: what is deliberately not done, one-line reason each. Inherit and extend the brief's do-not-build list and the defaults' deferral list.
5. **Functional requirements**: the `## 5.x` capability groups, one `###` heading per requirement (format below).
6. **Non-functional requirements**: performance, security and permissions, availability, localization, each with a number or a yes/no check. Reuse the budgets from `OPINIONATED_DEFAULTS.md` verbatim.
7. **User stories**: a list, not headings. Each has an id `US-<n>`, numbered from 1 across the document, and lists the FR ids it covers: `- **US-4** — As Carlos (organizer), I want to book a court in under a minute, so that the Thursday game happens. Covers FR-BOOKING-1, FR-PAYMENT-1.` `ui-screens-spec` maps every `US-<n>` to a screen.
8. **Success metrics**: 3-5 measurable outcomes (activation, conversion, latency, error rate), each with a target and how it is measured. This is the release's definition of "working".
9. **Open questions and assumptions**: each tagged `[SUPUESTO]` so the person validates it at the gate.

### Requirement format

The `spec-guard` scripts and the backlog read this exact shape:

```markdown
### FR-ORDER-1 — A customer places an order from a table

- Given a customer scanned a valid table QR and has items in the cart
- When they confirm the order
- Then the order is created with status `placed`, the kitchen dashboard shows it within 3 s, and the customer sees an order-received confirmation

**Traces:** J-ANA-1 · D-04, D-07
```

- The id is `FR-`, an uppercase area, `-`, a number: `FR-ORDER-1`, `FR-AUTH-3`. Areas are short nouns from the capability (ORDER, BOOKING, AUTH, PAYOUT); an area may contain hyphens (`FR-CHECK-IN-2`). Numbers start at 1 per area.
- The heading is `### `, the id, ` — `, and a one-line statement of the behavior.
- **FR ids appear in a heading only where the requirement is defined.** Everywhere else (user stories, traces, out of scope, open questions) mention them in plain text, never in a heading of any level: the `spec-guard` scripts read every heading that starts with an FR id as a definition, so a second one is reported as a duplicate.
- One or more Given/When/Then groups follow. A requirement with several outcomes may have several groups.
- `**Traces:**` names the job ids from the brief and the D-xx ids the requirement depends on. Cite both exactly as they appear in the source documents.
- A requirement imposed from outside the product (a store policy, a law, a payment network rule) that serves no persona's job traces to its source instead of a job: `**Traces:** compliance: Apple App Store Review Guideline 5.1.1(v) · D-07`. Name the policy or law precisely; never attach a nominal job id to it.
- `(deferred)` in the heading takes a requirement that was written for this release out of it: `### FR-LOYALTY-1 — Customer earns points per order (deferred)`. It keeps its id, because issues and commits may already cite it, and needs no implementation issue. Ids are never reused or renumbered.
- **In a first PRD, deferred features are not deferred FRs.** A feature from the defaults' deferral list or the do-not-build list goes to Out of scope with its bucket, not to a `(deferred)` requirement. Write a deferred FR only when the behavior was specified for this release and then postponed, or when the user wants a deferred decision's behavior specified now so it is ready later. A first PRD usually has none.

## The method

### Step 1: Read the brief, do not restate it

Extract personas, the value loop, the business model (D-02) and the out-of-scope seed. The PRD assumes the vision; it does not re-derive it.

### Step 2: Capabilities from jobs

For each persona job (by its `J-` id), list the capabilities the product must offer to satisfy it. Keep the MVP honest: a capability that serves no stated job goes to Out of scope with a reason.

If the brief predates job ids, or the decisions give work to a group the brief does not list (admins approving venues, support issuing refunds), do not invent a persona inside the PRD. Show the gap and propose the addition to `PRODUCT_BRIEF.md` (the user group, a persona, its job ids); apply it to the brief once the user agrees, then trace to it.

### Step 3: Write each requirement as Given/When/Then

Forbid vague verbs ("manage", "handle", "support") without an observable outcome. If the Then cannot be checked, the requirement is underspecified: split it, or mark the gap `[SUPUESTO]`.

A long closed list that several requirements depend on (sports, cancellation reasons, document types, amenities) is enumerated once, in one table in the FR that introduces it or under In scope, and every other FR cites it by name ("one of the cancellation reasons in FR-BOOKING-4"). Never re-list the values in several places: copies drift. `schema-design` turns that table into one closed set.

### Step 4: Trace every requirement

Each FR cites the job id it serves (or, for a store policy or a law, `compliance: <source>`) and any decision it depends on. A requirement with no traceable purpose is scope creep: drop it or move it to Out of scope. A requirement that contradicts a locked decision is a **blocker**: show it to the user, do not override the decision.

Amending a decision follows the rule every later phase shares: only with the user's explicit approval at this phase's gate, by editing the decision in place in `OPINIONATED_DEFAULTS.md` (same `D-xx` id, never renumbered) and adding under its `**Lock:**` line `**Amended (Phase 2, product-requirements):** {what changed and why}.` Never silently: an amendment the user did not approve at the gate is not made.

### Step 5: Make non-functional requirements numeric

"Fast", "secure", "scalable" are not requirements. Convert to p95 latency budgets, permission matrix rows (who can do what), supported locales, an uptime target.

### Step 6: Derive success metrics

3-5 outcomes that prove the release works, each with a target and a measurement method. QA later checks the build against them.

### Step 7: Coherence check and gate

Check that:

- Every job id in the brief has at least one FR, and every FR traces to a job id that exists or to `compliance: <source>`.
- Every FR has acceptance criteria and a `**Traces:**` line.
- Every D-xx cited exists and is not contradicted.
- Every non-deferred decision that changes what a user or operator can do or see is served by at least one FR. The stack-profile decision (D-01) and purely technical decisions need none; list them in the gate on one line, `Decisiones sin FR (no son comportamiento): D-01 (perfil de stack), ...`, so the gap is visible rather than silent. D-01 is always on it.
- Every user story has a `US-<n>` id and lists the FRs it covers.
- Out of scope is explicit.

Mark anything unresolved `[SUPUESTO]`.

Run the `spec-guard` check from the project root: `node tools/spec-guard/spec.mjs check`, or the same `scripts/spec.mjs` from the `spec-guard` skill's folder when the project has no `tools/spec-guard/` yet. It works before a backlog exists: it checks the decisions, the PRD and the roster that are on disk (FR ids, duplicates, decisions cited that do not exist) and ends with "No backlog yet". Fix every error on `docs/PRD.md`. If it stops with "no backlog at docs/ISSUES.md", the project's copy is older than the `spec-guard` skill: re-run its installer (`node <spec-guard skill folder>/scripts/install.mjs`, safe to repeat) and check again. Without `spec-guard`, check the ids against the format above by reading them, and say so.

For a critical second look, the user can ask the `product-advisor` agent, if installed, to review the PRD.

Overwrite the whole of `docs/SESSION.md` with the shape every phase skill writes (skip it when `product-spec-orchestrator` re-runs this skill to apply a coherence fix or a build result: the orchestrator updates `docs/SESSION.md` itself, so it never rewinds to this phase):

```markdown
# Session — {project title}

_Narrative for the next session. What is done is decided by `node tools/spec-guard/spec.mjs status`, which reads the documents; when they disagree, status wins._

## Phases

| Phase | Skill | State |
| --- | --- | --- |
| 1 | product-discovery | done |
| 2 | product-requirements | done |
| 3 | schema-design | pending |
| 4 | ui-screens-spec | pending |
| 5 | system-architecture | pending |
| 6 | multi-agent-governance | pending |
| 7 | navegable-mockups | pending |

## Last phase: 2 — product-requirements

- 3 to 5 bullets: what was decided that the next phase must know.

## Open questions

- Items marked [SUPUESTO] or deferred to a later phase, or "None".

## Next

Phase 3 — schema-design.
```

Keep the State of every other phase as it really is (a phase done out of order stays done).

**Gate.** Close with:

> Fase 2 cerrada. {N} requisitos funcionales en {M} áreas, {K} diferidos, {J} supuestos abiertos, {S} user stories. La siguiente fase es el modelo de datos (`schema-design`). ¿Validamos los supuestos y avanzamos?

Under `product-spec-orchestrator`, its phase gate replaces this closing message: one gate that carries these counts plus its "Decisiones tomadas en Fase 2 que vale la pena verificar" bullets.

Wait for explicit approval.

## Anti-patterns

- Acceptance criteria that restate the title instead of an observable Then.
- Requirements or user stories without ids: later phases cannot reference them.
- An FR id in a heading where it is not defined (a user story or section heading): it counts as a second definition.
- Inventing personas or features not traceable to the brief.
- Silently disagreeing with a locked decision, or silently editing one.
- Non-functional "requirements" made of adjectives.
- Designing tables or screens here.

## Handoff

`schema-design`, `ui-screens-spec`, `system-architecture` and `multi-agent-governance` all read `PRD.md`. The data model serves the FRs' state, the screens realize the user stories, and the FR ids become the spine of the backlog: each issue lists the FRs it implements in `requirement_refs`.

## What this skill does not do

- Pick data stores, tables or screens.
- Write code, the backlog or agent lanes.
- Reopen the vision, or change a decision locked in Phase 1 on its own. It builds on them and flags conflicts; a decision changes only by an amendment the user approves at the gate (Step 4).
