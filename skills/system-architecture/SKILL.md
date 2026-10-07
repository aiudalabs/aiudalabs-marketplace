---
name: system-architecture
description: "Designs the technical architecture of a product as Phase 5 of the product-spec workflow: repo layout and package boundaries with one-way dependency rules, an inventory of every server-side unit (Cloud Functions, endpoints, workers, scheduled jobs), state-machine enforcement, transactional consistency, permissions and service identity, performance budgets per layer, local-first dev workflow, CI/CD, observability with alert thresholds, and the deferred-complexity list. Writes ARCHITECTURE.md, plus IAM_REQUIREMENTS.md when the stack profile is managed cloud. Use when the user says 'diseñemos la arquitectura', 'cómo estructuro el monorepo', 'qué Cloud Functions necesito', 'CI/CD', 'qué defiero para v1.1', or after the UI screens are approved. It needs the brief, the locked stack profile, the schema and UI_SCREENS.md. Entities, fields, state machines and indexes are schema-design; this skill takes them as given."
license: MIT
metadata:
  version: "1.0.0"
  author: aiudalabs
  requires: stack-profile-flutter-firebase stack-profile-fastapi-react
---

# System Architecture

Design the technical architecture of the product. Phase 5 of the product-spec workflow (1 discovery, 2 requirements, 3 schema, 4 UI, 5 architecture, 6 governance, 7 mockups). It turns the brief, the schema and the screens into a technical shape that is buildable, deployable and operable.

This is where ambition meets reality. Half the value of the phase is the **deferred-complexity list**: explicit decisions about what is not in the MVP, which keep scope from creeping across the build sprints.

## The method is stack-agnostic; the stack knowledge comes from the profile

Read the profile line in `docs/OPINIONATED_DEFAULTS.md`: `**Stack profile:** flutter-firebase` or `**Stack profile:** fastapi-react` (the older ids `aiuda-flutter-firebase` and `python-fastapi-react` mean the same profiles). Load the `stack-profile-<id>` skill and read its `references/architecture.md` before starting. It gives the outputs for that profile, the repo layout, the dependency rules, the execution-unit patterns and their block format, the consistency menu, the permissions and identity model, dev commands, CI shape, observability stack, deferral candidates and anti-patterns. Read its `references/agents.md` too: every unit's owner must be an agent of that roster.

- **No profile locked:** stop and ask. Never produce generic multi-stack architecture advice.
- **Older project without a profile line** but with `docs/FIREBASE_SCHEMA.md` or a Melos and pnpm monorepo: assume `flutter-firebase`, say so, and add the profile as the next numbered decision in `OPINIONATED_DEFAULTS.md` (with the `**Stack profile:**` line) before continuing.

## When to use it, and when not

Use it for "diseñemos la arquitectura", "system architecture", "monorepo", "cómo estructuro el código", "CI/CD", "deployment pipeline", "performance budgets", "qué defiero para v1.1", stack phrasings such as "cloud functions" or "Melos", and as Phase 5 after the screens are approved.

Do not use it when:

- Phases 1-4 are not done. Ask for them first.
- The user wants to design entities, fields, state machines or indexes. That is `schema-design`; this skill consumes its output.
- The user wants generic architecture advice with no committed stack. Lock the profile first.
- `docs/ARCHITECTURE.md` exists and the user wants to evolve it. Edit the affected sections with them, and record each change of direction as a decision in `OPINIONATED_DEFAULTS.md`.

## Inputs

- `docs/PRODUCT_BRIEF.md`: apps and value loop.
- `docs/OPINIONATED_DEFAULTS.md`: decisions `D-xx`, performance budgets, deferral list, stack profile.
- `docs/PRD.md` when it exists: FR ids and non-functional requirements.
- The schema document: containers, state machines, denormalizations.
- `docs/UI_SCREENS.md`: client data needs, realtime listeners, screen ids.
- The profile's `references/architecture.md` and `references/agents.md`.

If one of the first five (PRD aside) is missing, ask and stop.

## What it produces

| File | Purpose | When |
|---|---|---|
| `docs/ARCHITECTURE.md` | The technical shape, 600-1000 lines | Always |
| Profile-mandated extras | For example `docs/IAM_REQUIREMENTS.md`, the cloud identity model | When the profile's architecture file lists it |

`ARCHITECTURE.md` sections:

1. **Stack confirmation**: profile, versions, pinned tools.
2. **Repo layout**: folder tree with package boundaries.
3. **Dependency rules**: who depends on whom, one way, no cycles.
4. **Execution-unit inventory**: every server-side unit, in the profile's block format.
5. **State-machine enforcement**: every transition pinned to a named unit.
6. **Transactional consistency**: when transactions, when batches, when neither.
7. **Permissions model**: Phase 3's philosophy turned into the profile's mechanism.
8. **Service identity and secrets.**
9. **Performance budgets**: reconciled with the architecture, per layer.
10. **Dev workflow**: concrete local-first commands.
11. **CI/CD**: environments and gates per trigger.
12. **Observability**: logging, error reporting, product metrics, numeric alert thresholds.
13. **Deferred complexity**: the v1.1 / v2 / v∞ technical list.

Write it in English; the conversation stays in Spanish. Cite decisions (`D-04`) and requirements (`FR-ORDER-1`) by their exact ids where a unit or a choice serves them.

## The method

### Step 1: Repo layout and package boundaries

Start from the profile's layout. Adapt only what the product demands: the apps named in the brief, domain packages. Every boundary exists for a reason; if the product does not need one, delete it rather than leave it empty. Keep the top-level paths of the layout aligned with the lanes in the profile's roster, so every file the build will create has exactly one owning agent.

### Step 2: Durable-workflow guard

Before adding any workflow orchestration engine (Temporal, Inngest, Trigger.dev, Step Functions, Celery with a broker), decide whether the product needs one. Default: **no**. Answer from the schema and the decisions:

1. Does any process take more than 5 minutes end to end?
2. Does any process wait for human input across hours or days?
3. Does any process need durable retries across days, not minutes?
4. Does any process span several external services with compensating actions?

If all four are no, do not introduce an engine: the profile's default units plus a state machine in the primary store are enough. Write the decision in `ARCHITECTURE.md`. If at least one is yes, justify the engine: which workflow (cite the schema), estimated cost (the profile carries reference numbers), and why the profile's default chaining falls short. This guard stops overengineering by reflex.

### Step 3: Dependency rules

Write the dependency graph, starting from the profile's. **No cycles, ever.** If the profile shares contracts across languages or packages, apply its sync mechanism and make drift a build-failing CI check.

### Step 4: Execution-unit inventory

For every server-side unit (client-invoked function or endpoint, trigger, worker task, scheduled job, webhook; the patterns come from the profile), write one block in the profile's format. Required fields on every stack: pattern, owner (an agent from the roster), trigger or fires-when, validates, side effects, **idempotency**, performance budget, failure modes, tests, plus the profile's extra fields (service account, IAM permissions and secrets for managed cloud; auth and secrets for self-hosted). A field with nothing to say reads `(none)`; a missing field is an error.

Be complete: every unit named in the schema, the screens or anywhere in the spec has its block. A unit referenced elsewhere but missing here gets surfaced.

### Step 5: State-machine enforcement

Pin every transition from the schema to exactly one unit from Step 4, in a table: transition → unit → who may call it. No client-side transitions. The profile defines the denial mechanism (security rules; endpoint auth plus DB constraints).

### Step 6: Transactional consistency

With the profile's consistency menu, declare for each unit that writes several records: the strategy (transaction, batch, eventual via trigger or outbox) and the recovery plan (retry, compensating action, alert). Single-record writes need no ceremony; say so.

### Step 7: Permissions model

Refine the Phase 3 philosophy into the profile's mechanism: how roles are assigned and verified, how ownership is checked, which fields only the server writes, the privileged update path, and the propagation delay users will notice. Keep end-user permissions separate from service identity: confusing them produces vulnerabilities.

### Step 8: Service identity and secrets

When the profile mandates a cloud identity output (`IAM_REQUIREMENTS.md` for `flutter-firebase`), write it to the profile's specification: projects per environment, APIs to enable, service accounts with least-privilege roles, the per-unit identity table, storage buckets and their policy, the secrets registry with readers and rotation, topics, public endpoints. For self-hosted profiles this reduces to a section inside `ARCHITECTURE.md`: deploy identity, where secrets live and who reads them, rotation, exposed ingress.

Rules on every stack: every privilege traces to a specific unit's need; secrets never live in code or committed env files; anything public is default-deny.

### Step 9: Performance budgets

For each budget in `OPINIONATED_DEFAULTS.md` and each numeric non-functional requirement in the PRD, show how the architecture meets it, using the profile's implication table. When a budget is unreachable with this architecture, say so: either the budget changes (a Phase 1 revisit, with the user) or the architecture does. Never miss a budget silently.

### Step 10: Dev workflow, local-first

Document the commands every developer, human or agent, runs locally, from the profile (emulator suite, compose stack, editable install with a local DB), with environment setup. The dev loop never touches production resources. Non-negotiable.

### Step 11: CI/CD

Two environments at least, staging and production; a preview per pull request if the budget allows. Use the profile's pipeline shape. Pin tool versions identically in CI and dev. Secrets come from the CI provider's store. Production deploys only from a tagged main with manual approval, never from a feature branch.

### Step 12: Observability

With the profile's stack: what is logged (structured, with request or correlation ids), where errors and crashes report, which product metrics matter (from the Phase 1 value loop), and **numeric alert thresholds** with a destination (P0 to the production alerts channel, P1 to staging). "We use observability" says nothing; named tools and thresholds are actionable.

### Step 13: Deferred complexity

Defer the technical complexity the MVP does not need, seeding from the profile's deferral candidates plus anything product-specific, in v1.1 / v2 / v∞ buckets. A concern that is neither in the MVP nor in a bucket is hidden scope creep: "no mencionaste {X}: ¿v1.1 o v∞?".

### Step 14: Cross-check before closing

- Every unit mentioned in the schema or the screens has a block.
- Every transition has one owning unit.
- Every unit's owner is an agent in the profile's roster with a write lane.
- Every performance budget is reconciled.
- No dependency cycle.
- Every "deferred to vN" in earlier documents matches the deferred section here.
- The permissions model covers every role in the screens.
- The dev commands work as written.
- The workflow-engine decision is explicit (Step 2).
- Every unit block has every required field.
- Profile-mandated outputs are complete and consistent: every secret a unit reads exists in the registry with at least one reader, no orphan secrets, every service identity referenced exists.
- Every platform service a unit uses is in the enabled-services list, and nothing unused is enabled.

When a check fails, show it and ask.

## Anti-patterns

- Client-side state transitions.
- Optimistic UI without rollback.
- No idempotency on client-invoked units: networks fail, retries happen.
- One unit doing everything (a 500-line handler covering six actions).
- No deferred-complexity section.
- Deploying to production from a feature branch.
- Cyclic dependencies.
- Hardcoded environment values: no project ids or keys in code.
- Secrets in code or committed env files.
- A workflow engine by default (Step 2 is a hard guard).
- Confusing end-user permissions with service identity.

Add the stack-specific anti-patterns from the profile's architecture file.

## Communication

Spanish in the conversation, English in the documents. Be specific, not aspirational: named tools, numeric budgets, concrete commands. Tables for inventories, prose for philosophy.

## Gate and handoff

Overwrite the phase table in `docs/SESSION.md`: Phase 5 (`system-architecture`) complete, next `multi-agent-governance`, with 3-5 bullets on what was locked.

Close with:

> Fase 5 cerrada. {N} unidades de ejecución especificadas, {M} transiciones con dueño, {K} budgets reconciliados{, más IAM_REQUIREMENTS.md}. La siguiente fase (`multi-agent-governance`) convierte esto en el roster de agentes, el backlog por sprints y los prompts de ejecución.

Wait for explicit approval. `multi-agent-governance` consumes the unit inventory (it becomes issues), the package boundaries (agent lanes in `docs/AGENT_ROSTER.md`), the dev workflow (the "how to work in this repo" part of the root `AGENTS.md`), the observability plan, the deferred list (it filters the backlog) and the identity output (Sprint 0 bootstrap issues). The identity output also feeds the cloud provisioning checklist of the `operational-readiness` skill, which can run in parallel with Phase 6.

## What this skill does not do

- Write server, app or admin code, security rules or middleware (sprints).
- Design entities, fields or indexes (`schema-design`).
- Provision infrastructure. It writes specs, not applied configuration.
- Benchmark or load-test.
- Design ML or analytics pipelines; those become deferrals when needed.
