---
name: product-spec-orchestrator
description: "Takes a product idea to a buildable spec through seven gated phases: discovery, requirements (PRD), data schema, UI screens, architecture, multi-agent governance and optional navigable mockups, for the flutter-firebase or fastapi-react stack profile. It sequences the phase skills, stops for explicit approval after each one, surfaces the decisions worth checking, checks cross-phase coherence and resumes a half-finished spec from the files on disk. Use when the user wants the full treatment for a new product: \"quiero diseñar un producto de cero\", \"tengo una idea de app\", \"espec completa\", \"lleva esto hasta que sea buildable\". For one phase only, use that phase's skill (product-discovery for just the idea and the decisions); for an existing codebase, use project-adopt; to build, use sprint-runner."
license: MIT
metadata:
  version: "1.1.0"
  author: aiudalabs
  requires: product-discovery product-requirements schema-design ui-screens-spec system-architecture multi-agent-governance navegable-mockups spec-guard operational-readiness html-spec-generator
---

# Product Spec Orchestrator

Sequences the seven-phase product design workflow end to end. It writes no spec itself: it makes sure the right skill runs in the right order, with an approval gate after each phase and a coherence check before governance.

It starts from a vague idea ("quiero hacer una app que…") and ends with a buildable repository specification: the governance documents of Phase 6 and, optionally, the HTML mockups of Phase 7.

## When to use it

- "quiero diseñar un producto" / "tengo una idea de producto" / "diseñemos esto de cero"
- "full product spec" / "espec completa" / "todo el proceso"
- "lleva esto hasta que sea buildable"
- A long message describing a startup idea, a marketplace or a multi-app system without a finished spec

Do not use it when:

- The user wants one phase ("ayúdame con el schema"): run that skill directly (`schema-design`, `product-discovery`, ...).
- The spec exists and the user wants to build: `multi-agent-governance` if there is no backlog yet, `sprint-runner` if there is.
- The code base already exists and the user wants to add a feature with this method: `project-adopt`. This workflow never reverse-engineers a full PRD from existing code.
- The user has 30 minutes and a sketch: recommend `product-discovery` alone and stop there. The full workflow is 4-8 hours of conversation.

## The phases

| Phase | Skill | Deliverable |
|---|---|---|
| 1 | `product-discovery` | `docs/PRODUCT_BRIEF.md` + `docs/OPINIONATED_DEFAULTS.md` (D-01..D-NN, stack profile locked) |
| 2 | `product-requirements` | `docs/PRD.md` (FR-AREA-N with Given/When/Then) |
| 3 | `schema-design` | `docs/FIREBASE_SCHEMA.md` or `docs/DATA_SCHEMA.md`, per the profile |
| 4 | `ui-screens-spec` | `docs/UI_SCREENS.md` |
| 5 | `system-architecture` | `docs/ARCHITECTURE.md` |
| 6 | `multi-agent-governance` | `AGENTS.md` + `CLAUDE.md` + `docs/AGENT_ROSTER.md`, `ORCHESTRATOR.md`, `ISSUES.md`, `WAVE_DAG.md`, `SPRINT_PROMPTS.md` |
| 7 | `navegable-mockups` | `mockups/<app-id>.html` per app, `<app-id>` as the brief names it (optional) |

Phase 7 needs only `docs/UI_SCREENS.md`, so it may run right after Phase 4 when the user wants to see screens before the architecture (Step 5). The numbering is the default order, not a dependency.

Phase 2 may be folded into discovery for a very thin MVP whose brief already pins the scope, but the default is to run it: the PRD is what the schema traces entities to and what governance turns into acceptance criteria.

This workflow produces no document of its own: only gate summaries, coherence reports and the closing handoff. If you catch yourself writing a `WORKFLOW_SUMMARY.md` to tie things together, stop. The documents in `docs/` are the spec; a meta-document is one more source of truth to drift.

## Running spec-guard

The `spec-guard` skill reads the documents with code. From the project root, run `node tools/spec-guard/spec.mjs <command>` when the tools are installed in the project, or the same `scripts/spec.mjs` from the `spec-guard` skill's folder before that. If `spec-guard` is not installed, say so and fall back to `docs/SESSION.md` and reading the files.

`check` works before a backlog exists: it validates the decisions, the PRD and the roster that are on disk and ends with "No backlog yet". If it instead stops with "no backlog at docs/ISSUES.md", the project's copy is older than the `spec-guard` skill: re-run its installer (`node <spec-guard skill folder>/scripts/install.mjs`, safe to repeat; it keeps hooks and settings) and run it again.

`status` reports each phase from its own document, independently: Phase 7 shows done once a mockup exists even if Phase 5 or 6 is still open. That is expected when the mockups ran after Phase 4.

## Step 0: Resume or start

Run `spec.mjs status`. It reports which phases have their documents on disk and, once there is a backlog, sprint progress.

- **Phases are done:** read `docs/SESSION.md` too for the narrative (decisions, open questions), but trust `status` for what exists. When they disagree, say so ("SESSION.md dice Fase 4, pero no hay `UI_SCREENS.md`"). Then:

  > 📍 Proyecto en progreso. Fases completas según los archivos: **{list, e.g. 1-4 y 7}**. Última: **{skill}**.
  >
  > Decisiones locked: {3-5 bullets}
  >
  > ¿Continuamos con la Fase {first pending phase} o empezamos de cero?

  Wait for the answer. Never auto-advance.

- **Nothing exists, or the user says "de cero":** go to the intake.

## Step 1: Intake

This is the only intake. Ask in one message:

1. **What does the product do?** (one sentence: the verb and the object, not a feature list)
2. **Who uses it?** Every kind of user and what each does, including whoever operates the product (admins, support, finance), and from which app (mobile, tablet, web).
3. **Which market?** (Panamá, LATAM in general, elsewhere)
4. **Which stack profile?** `flutter-firebase` (default: mobile-first, realtime, managed backend) or `fastapi-react` (Python API, Postgres, self-hosted, workers). Phase 1 locks it as decision D-01.

These are `product-discovery`'s intake questions. Hand the answers to it in Phase 1: it reuses them and asks only what is missing or too vague, never the four again.

If the user says "es como X pero para Y", ask which decisions transfer and which do not. If they cannot say what the product does in one sentence, that is a Phase 1 problem, not a blocker: `product-discovery` forces the decisions.

## Step 2: Phases 1 to 5

Run each phase skill in order, passing it every document produced so far (in Phase 1, the intake answers), and close each with the phase gate below before starting the next. Each phase skill writes `docs/SESSION.md` and runs `spec.mjs check` itself, except agents running in parallel (Step 5).

1. **Discovery.** Follow `product-discovery`. It writes the brief (with user groups and job ids) and the numbered defaults, with `**Stack profile:** <id>` inside D-01.
2. **Requirements.** Follow `product-requirements`. It is conversational and may ask before writing. This is where scope gets pinned before any data modeling.
3. **Schema.** Follow `schema-design`.
4. **UI screens.** Follow `ui-screens-spec`. At the gate, verify that every state machine in the schema has at least one screen that drives or displays its transitions. After approval, offer the mockups now or later (Step 5).
5. **Architecture.** Follow `system-architecture`. Its section "Changes to earlier documents" feeds the coherence check.

## Step 3: Coherence check (before Phase 6)

First run `spec.mjs check` (without `--strict`; there is no backlog yet) and fix malformed decision and requirement ids. Then take every item of the architecture's "Changes to earlier documents" section, and walk the documents for what code cannot judge:

1. **PRD → schema:** every non-deferred `FR-...` has an entity, field or state machine to hold its data.
2. **Defaults → schema:** every locked `D-xx` is reflected (a "0% commission in the MVP" does not get a `commissions` table unless flagged for later).
3. **Schema → UI:** every state machine has a screen that drives or shows a transition.
4. **UI → architecture:** every screen with live data has an explicit mechanism (listener, polling, SSE, per the profile).
5. **Architecture → defaults:** every execution unit fits the performance budgets and the deferral list.

Common contradictions: a screen needing a container the schema lacks; an execution unit with no input or output in the schema; a requirement with no screen, container or unit; something "deferred to v1.1" in one document and built in the MVP in another; budgets the architecture cannot meet.

If there are contradictions, list them numbered and stop. Ask which document is right. Never reconcile silently.

Once the user decides, apply each fix through the phase that owns the document: re-run that phase's skill on that point only (`product-requirements` for an FR, `schema-design` for a container or a transition, `ui-screens-spec` for a screen), re-reading the current documents, and close it with that phase's gate. A one-line correction (a renamed reason code, a number, a version) may be edited in place instead; show each such edit, as a before and after, at the coherence gate. Then run `check` again and mark the architecture's "Changes to earlier documents" items as applied. If `docs/UI_SCREENS.md` changed and mockups already exist, refresh the affected mockups with `navegable-mockups`.

## Step 4: Phase 6, governance

Follow `multi-agent-governance`. It writes the constitution, roster, orchestrator, backlog and the Sprint 0 and 1 prompts, installs the `spec-guard` guardrails and does not hand off until `spec.mjs check --strict` passes. Phase gate.

## Step 5: Phase 7, mockups (optional)

Phase 7 needs only `docs/UI_SCREENS.md`. Offer it after the Phase 4 gate ("¿Quieres ver mockups HTML navegables de las pantallas clave antes de la arquitectura, o seguimos?") and, if not done by then, after Phase 6: **"¿Quieres mockups HTML navegables antes del build, o vamos directo a construir?"**

If yes, follow `navegable-mockups`, then gate it like any phase, and return to the next pending phase.

**Shared story first.** Before launching one mockup agent per app, write `mockups/STORY.md` yourself (or have the caller write it): one story every app tells. It names the personas, the venues or other entities, the codes (booking codes, invoice numbers), the dates and the amounts, and which past and future records each app needs to show (the player's upcoming booking K7P2QX is the owner's booking for that same slot). Every app's mockup uses those values and invents none; an app that needs a record the story lacks gets it added to `STORY.md` first. With a single app, the story still goes in `STORY.md`.

**Phase 5 in parallel with Phase 7.** When the architecture and the mockups run at the same time (separate agents):

- The parallel agents do not write `docs/SESSION.md`; tell each one so in its prompt. Each returns its closing counts and the decisions worth checking.
- After both finish, rebuild `docs/SESSION.md` yourself in the shared shape, with each phase's State taken from `node tools/spec-guard/spec.mjs status`, Last phase naming both (`5 and 7 — system-architecture, navegable-mockups`) and Open questions merged.
- Show one combined gate: both phases' counts and one "Decisiones tomadas en Fases 5 y 7 que vale la pena verificar" list. Never two gates open at once. The mockup of each app is `mockups/<app-id>.html` with one `#s-<screen-id>` anchor per key screen; UI issues cite that anchor for key screens, so the mockups stop being orphans. If `docs/UI_SCREENS.md` changes after the mockups were built (an iteration, a coherence fix), refresh the affected mockups before the handoff. If no, go to the handoff.

## Step 6: Handoff

**Spec page.** First run `html-spec-generator`: it writes `docs/architecture.html` from the documents (also when the user exits after Phase 5). From then on, after any approved change to a source document (an iteration, an amended decision, a coherence or mockup-driven fix), run it again so the page matches.

Close with:

- Every document and mockup produced, as a file tree
- Counts: N sprints, M issues, K agents
- The next action: run Sprint 0 with the `sprint-runner` workflow, or paste the Sprint 0 prompt from `docs/SPRINT_PROMPTS.md` into the coding agent
- If there is no repository yet: `project-kickstart` scaffolds it from the locked profile, then installs the guardrails
- After each sprint: `execution-router` prepares the next one from the repo's real state
- In parallel: `operational-readiness` for the non-build track (company, banking, app stores, legal)

Stop. The spec is done. Building is not this workflow's job.

## Phase gates

After every phase. This gate **replaces** the phase skill's own closing message: show one gate, not two. It opens with the skill's closing counts (for example "Fase 2 cerrada. 51 requisitos en 9 áreas, 0 diferidos, 4 supuestos") and continues with the steps below.

### 1. Surface the decisions worth checking

List 5-10 things the skill decided that the user did not ask for. Implicit choices compound across phases.

> **Decisiones tomadas en Fase {N} que vale la pena verificar:**
> - {decision, in plain Spanish}
> - ...
>
> Si alguna está mal, dilo ahora: es más fácil corregir aquí que en la Fase {N+2}.

"Vale la pena verificar" matters: not imperious, not dismissible. The goal is that the user actually reads them.

At the Phase 2 gate, after the bullets, add the decisions no FR serves, so the gap is visible rather than silent:

> **Decisiones sin FR (no son comportamiento):** D-01 (perfil de stack){, D-xx técnicas, una por línea con su motivo}

D-01, the stack profile decision, is always on this line: it is exempt from FR coverage and never counts as a gap. Any other decision on it needs its reason; a decision that changes what a user or operator can do or see does not belong here.

A decision the phase proposes to amend appears in the bullets as "Enmienda propuesta a D-xx: {cambio}"; it is applied only after the user approves it (see "Amend a locked decision").

### 2. Wait for explicit approval

Never advance on silence.

- "ok" / "sí" / "adelante" / "siguiente" → advance
- "cambia X" / "no me gusta Y" → iterate within the phase
- "me quedo aquí" / "pausa" → stop

Without an answer, ask again: "Esperando tu visto bueno para la Fase {N+1}, o cambios en la Fase {N}." "Se ve bien" without engaging the bullets is not approval of eight specific decisions; ask about the risky ones.

### 3. Confirm the deliverable

The phase's file exists on disk (`spec.mjs status` shows it). If it does not, the phase is not closed.

## When the user deviates

**Iterate within a phase.** "La decisión 4 de la Fase 1 no me gusta": do not advance. Re-run the phase skill with the feedback, re-reading every current document (never a stale memory of them), and gate again. After three iterations on one phase, ask whether something upstream is misframed: "estamos iterando mucho en la Fase 1, ¿hay algo del producto que no está claro?".

**Amend a locked decision.** Any phase after 1 may change a decision in `docs/OPINIONATED_DEFAULTS.md` only with the user's explicit approval at that phase's gate: put the proposed change in the gate's bullets, and once approved, the phase skill edits the decision in place (same `D-xx` id, never renumbered) and adds under its `**Lock:**` line `**Amended (Phase {N}, {skill}):** {what changed and why}.` Never silently, and never from a coherence fix without showing it at the gate.

**Exit early.** Accept "me quedo aquí" after any phase, and say which phases ran and which did not. Not every project needs all seven:

- Phase 3 only: a schema for an existing app
- Phases 1-3: MVP scoping for a pitch (idea, requirements, data model)
- Phases 1-5: a spec without governance, for design review with a client
- Phases 1-6: fast track to building, no mockups

**Skip ahead.** "Ya tengo el schema, salta la Fase 3": check the existing document against the defaults before skipping. Without `OPINIONATED_DEFAULTS.md` that check is a guess; say so. Skipping because a sister project has a real document is fine; skipping to save time when nothing exists is not.

## Output layout

```
{project-root}/
├── AGENTS.md                    ← kickstart, rewritten in Phase 6 (constitution)
├── CLAUDE.md                    ← kickstart (@AGENTS.md)
├── docs/
│   ├── SESSION.md               ← rewritten by every phase skill (by the orchestrator after a parallel 5 and 7)
│   ├── PRODUCT_BRIEF.md         ← Phase 1
│   ├── OPINIONATED_DEFAULTS.md  ← Phase 1
│   ├── PRD.md                   ← Phase 2
│   ├── {SCHEMA_DOC}.md          ← Phase 3
│   ├── UI_SCREENS.md            ← Phase 4
│   ├── ARCHITECTURE.md          ← Phase 5
│   ├── architecture.html        ← html-spec-generator, at the handoff and after each approved change
│   ├── AGENT_ROSTER.md          ← Phase 6
│   ├── ORCHESTRATOR.md          ← Phase 6
│   ├── ISSUES.md                ← Phase 6
│   ├── WAVE_DAG.md              ← Phase 6 (computed)
│   └── SPRINT_PROMPTS.md        ← Phase 6 (Sprints 0 and 1)
├── tools/spec-guard/            ← kickstart, re-installed after updates (guardrails)
└── mockups/
    ├── STORY.md                 ← Phase 7, written before the per-app mockups
    └── {app-id}.html            ← Phase 7 (any time after Phase 4)
```

If there is no project folder yet, create one named after the project in the current working directory and tell the user where it is.

## Anti-patterns

- **Skipping a phase silently** because "it's like the last product". Similar is not equal.
- **Advancing without approval.**
- **A meta-summary document** duplicating `docs/`.
- **Reconciling contradictions silently.**
- **Estimating timelines in Phase 1.** Sprint count is governance's job.
- **Pushing past Phase 7 into building.** The orchestrator's job ends at the spec.
- **Resuming from memory.** Run `status` and re-read the documents.

## Communication style

- **Spanish** with the user, **English** in the documents (they travel to coding agents).
- Concise at transitions: 5-10 bullets, not paragraphs.
- Pictorial at handoffs: the file tree beats prose.
- Firm on gates, gentle on iteration: "no avanzo sin aprobación" / "claro, iteramos la Fase 1, ¿qué cambias?".

## What this workflow does not do

- Write specifications itself
- Run `execution-router`, `sprint-runner` or `operational-readiness` on its own; each is the user's call
- Estimate sprints or duration
- Choose the stack for the user: it confirms the profile (default `flutter-firebase`) and respects an explicit choice
