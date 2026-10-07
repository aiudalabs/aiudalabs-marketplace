---
name: product-spec-orchestrator
description: "Takes a product idea to a buildable spec through seven gated phases: discovery, requirements (PRD), data schema, UI screens, architecture, multi-agent governance and optional navigable mockups, for the flutter-firebase or fastapi-react stack profile. It sequences the phase skills, stops for explicit approval after each one, surfaces the decisions worth checking, checks cross-phase coherence and resumes a half-finished spec from the files on disk. Use when the user wants the full treatment for a new product: \"quiero diseñar un producto de cero\", \"tengo una idea de app\", \"espec completa\", \"lleva esto hasta que sea buildable\". For one phase only, use that phase's skill (product-discovery for just the idea and the decisions); for an existing codebase, use project-adopt; to build, use sprint-runner."
license: MIT
metadata:
  version: "1.0.0"
  author: aiudalabs
  requires: product-discovery product-requirements schema-design ui-screens-spec system-architecture multi-agent-governance navegable-mockups spec-guard operational-readiness
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
| 7 | `navegable-mockups` | `mockups/<app>-app.html` per app (optional) |

Phase 2 may be folded into discovery for a very thin MVP whose brief already pins the scope, but the default is to run it: the PRD is what the schema traces entities to and what governance turns into acceptance criteria.

This workflow produces no document of its own: only gate summaries, coherence reports and the closing handoff. If you catch yourself writing a `WORKFLOW_SUMMARY.md` to tie things together, stop. The documents in `docs/` are the spec; a meta-document is one more source of truth to drift.

## Running spec-guard

The `spec-guard` skill reads the documents with code. From the project root, run `node tools/spec-guard/spec.mjs <command>` when the tools are installed in the project, or the same `scripts/spec.mjs` from the `spec-guard` skill's folder before that. If `spec-guard` is not installed, say so and fall back to `docs/SESSION.md` and reading the files.

## Step 0: Resume or start

Run `spec.mjs status`. It reports which phases have their documents on disk and, once there is a backlog, sprint progress.

- **Phases are done:** read `docs/SESSION.md` too for the narrative (decisions, open questions), but trust `status` for what exists. When they disagree, say so ("SESSION.md dice Fase 4, pero no hay `UI_SCREENS.md`"). Then:

  > 📍 Proyecto en progreso. Fases completas según los archivos: **1-{N}**. Última: **{skill}**.
  >
  > Decisiones locked: {3-5 bullets}
  >
  > ¿Continuamos desde la Fase {N+1} o empezamos de cero?

  Wait for the answer. Never auto-advance.

- **Nothing exists, or the user says "de cero":** go to the intake.

## Step 1: Intake

Ask in one message:

1. **What does the product do?** (one sentence)
2. **Who uses it?** (customer, provider, admin: which apps are needed?)
3. **Which market?** (Panamá, LATAM in general, elsewhere)
4. **Which stack profile?** `flutter-firebase` (default: mobile-first, realtime, managed backend) or `fastapi-react` (Python API, Postgres, self-hosted, workers). Phase 1 locks it as a decision.

If the user says "es como X pero para Y", ask which decisions transfer and which do not. If they cannot say what the product does in one sentence, that is a Phase 1 problem, not a blocker: `product-discovery` forces the decisions.

## Step 2: Phases 1 to 5

Run each phase skill in order, passing it every document produced so far, and close each with the phase gate below before starting the next.

1. **Discovery.** Follow `product-discovery`. It writes the brief and the numbered defaults, including `**Stack profile:** <id>`.
2. **Requirements.** Follow `product-requirements`. It is conversational and may ask before writing. This is where scope gets pinned before any data modeling.
3. **Schema.** Follow `schema-design`.
4. **UI screens.** Follow `ui-screens-spec`. At the gate, verify that every state machine in the schema has at least one screen that drives or displays its transitions.
5. **Architecture.** Follow `system-architecture`.

## Step 3: Coherence check (before Phase 6)

First run `spec.mjs check` (without `--strict`; there is no backlog yet) and fix malformed decision and requirement ids. Then walk the documents for what code cannot judge:

1. **PRD → schema:** every non-deferred `FR-...` has an entity, field or state machine to hold its data.
2. **Defaults → schema:** every locked `D-xx` is reflected (a "0% commission in the MVP" does not get a `commissions` table unless flagged for later).
3. **Schema → UI:** every state machine has a screen that drives or shows a transition.
4. **UI → architecture:** every screen with live data has an explicit mechanism (listener, polling, SSE, per the profile).
5. **Architecture → defaults:** every execution unit fits the performance budgets and the deferral list.

Common contradictions: a screen needing a container the schema lacks; an execution unit with no input or output in the schema; a requirement with no screen, container or unit; something "deferred to v1.1" in one document and built in the MVP in another; budgets the architecture cannot meet.

If there are contradictions, list them numbered and stop. Ask which document is right. Never reconcile silently.

## Step 4: Phase 6, governance

Follow `multi-agent-governance`. It writes the constitution, roster, orchestrator, backlog and the Sprint 0 and 1 prompts, installs the `spec-guard` guardrails and does not hand off until `spec.mjs check --strict` passes. Phase gate.

## Step 5: Phase 7, mockups (optional)

Ask: **"¿Quieres mockups HTML navegables antes del build, o vamos directo a construir?"**

If yes, follow `navegable-mockups`. UI issues already point at `mockups/<app>-app.html#s-<screen-id>`, so the mockups stop being orphans. If no, go to the handoff.

## Step 6: Handoff

Close with:

- Every document and mockup produced, as a file tree
- Counts: N sprints, M issues, K agents
- The next action: run Sprint 0 with the `sprint-runner` workflow, or paste the Sprint 0 prompt from `docs/SPRINT_PROMPTS.md` into the coding agent
- If there is no repository yet: `project-kickstart` scaffolds it from the locked profile, then installs the guardrails
- After each sprint: `execution-router` prepares the next one from the repo's real state
- In parallel: `operational-readiness` for the non-build track (company, banking, app stores, legal)

Stop. The spec is done. Building is not this workflow's job.

## Phase gates

After every phase:

### 1. Surface the decisions worth checking

List 5-10 things the skill decided that the user did not ask for. Implicit choices compound across phases.

> **Decisiones tomadas en Fase {N} que vale la pena verificar:**
> - {decision, in plain Spanish}
> - ...
>
> Si alguna está mal, dilo ahora: es más fácil corregir aquí que en la Fase {N+2}.

"Vale la pena verificar" matters: not imperious, not dismissible. The goal is that the user actually reads them.

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

**Exit early.** Accept "me quedo aquí" after any phase, and say which phases ran and which did not. Not every project needs all seven:

- Phase 3 only: a schema for an existing app
- Phases 1-3: MVP scoping for a pitch (idea, requirements, data model)
- Phases 1-5: a spec without governance, for design review with a client
- Phases 1-6: fast track to building, no mockups

**Skip ahead.** "Ya tengo el schema, salta la Fase 3": check the existing document against the defaults before skipping. Without `OPINIONATED_DEFAULTS.md` that check is a guess; say so. Skipping because a sister project has a real document is fine; skipping to save time when nothing exists is not.

## Output layout

```
{project-root}/
├── AGENTS.md                    ← Phase 6 (constitution)
├── CLAUDE.md                    ← Phase 6 (@AGENTS.md)
├── docs/
│   ├── SESSION.md               ← updated after every phase
│   ├── PRODUCT_BRIEF.md         ← Phase 1
│   ├── OPINIONATED_DEFAULTS.md  ← Phase 1
│   ├── PRD.md                   ← Phase 2
│   ├── {SCHEMA_DOC}.md          ← Phase 3
│   ├── UI_SCREENS.md            ← Phase 4
│   ├── ARCHITECTURE.md          ← Phase 5
│   ├── AGENT_ROSTER.md          ← Phase 6
│   ├── ORCHESTRATOR.md          ← Phase 6
│   ├── ISSUES.md                ← Phase 6
│   ├── WAVE_DAG.md              ← Phase 6 (computed)
│   └── SPRINT_PROMPTS.md        ← Phase 6 (Sprints 0 and 1)
├── tools/spec-guard/            ← Phase 6 (guardrails)
└── mockups/
    └── {app}-app.html           ← Phase 7
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
