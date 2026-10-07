---
name: multi-agent-governance
description: "Turns a finished product spec into the governance of a multi-agent repository: the root AGENTS.md constitution (plus a CLAUDE.md that imports it), docs/AGENT_ROSTER.md with exclusive lanes, docs/ORCHESTRATOR.md, a sprint backlog in docs/ISSUES.md whose waves are computed by spec-guard, and paste-ready prompts for Sprint 0 and Sprint 1. Use when the spec documents (brief, defaults, PRD, schema, UI screens, architecture) exist and the user wants the repo ready for coding agents: \"preparemos esto para los agentes\", \"vamos al build\", \"backlog de issues\", \"sprint planning\", \"AGENTS.md\". Phase 6 of product-spec-orchestrator. Stops when inputs are missing. It plans the whole backlog once; preparing a later sprint from the repo's real state is execution-router, running a sprint with agents is sprint-runner, and bringing an existing codebase into the method is project-adopt."
license: MIT
metadata:
  version: "1.1.0"
  author: aiudalabs
  requires: spec-guard stack-profile-flutter-firebase stack-profile-fastapi-react
---

# Multi-Agent Governance

Phase 6 of the product-spec workflow. Takes the design documents from phases 1-5 and writes the documents that turn a buildable spec into a repository where several coding agents can work in parallel without stepping on each other.

This skill writes no application code. It writes the rules, the lanes, the backlog and the first prompts. Structural correctness (ids, lanes, dependencies, waves, coverage) is checked by the `spec-guard` skill's scripts, not by reading.

## When to use it

- "preparemos esto para los agentes" / "vamos al build" / "vamos a construirlo"
- "backlog de issues" / "sprint planning" / "multi-agent setup" / "AGENTS.md"
- Invoked by `product-spec-orchestrator` after `system-architecture` is approved

Do not use it when:

- The user wants one function or a quick prototype: full governance is overkill.
- The product is under ~30 issues of work: a short `AGENTS.md` is enough.
- Phases 1-5 are not done: stop and ask for the missing documents.
- The code base already exists and was built without this method: use `project-adopt`.
- Governance exists and the user wants the next sprint prepared: use `execution-router`.

## What it produces

| File | Purpose | Typical size |
|---|---|---|
| `AGENTS.md` (root) | Repository constitution every coding agent reads first | 100-200 lines |
| `CLAUDE.md` (root) | One line, `@AGENTS.md`, so Claude Code imports the constitution | 1 line |
| `docs/AGENT_ROSTER.md` | The agents and their exclusive lanes | 40-120 lines |
| `docs/ORCHESTRATOR.md` | The orchestrator role and the sprint loop | 100-250 lines |
| `docs/ISSUES.md` | The backlog by sprint, one frontmatter block per issue | about 20-25 lines per issue: typically 2500-5000 lines for 120-200 issues |
| `docs/WAVE_DAG.md` | Waves per sprint, written by `spec.mjs waves --write` | generated |
| `docs/SPRINT_PROMPTS.md` | Orchestrator and executor prompts for Sprint 0 and Sprint 1 only | two orchestrator prompts plus about 50 lines per executor prompt: 1000-1600 lines |

Sizes are guidance: completeness wins over the budget. Never drop an issue, a criterion or the inlined issue text in a prompt to fit a line count.

`AGENTS.md` lives at the root because Codex, Copilot, Cursor and OpenCode read it natively there, and Claude Code reads it through the `CLAUDE.md` import. The roster is `docs/AGENT_ROSTER.md`, never `docs/AGENTS.md`: two files called AGENTS.md with different jobs confuse people and tools.

Prompts for Sprint 2 onward are not written now. A prompt written months ahead describes a repository that will not exist; `execution-router` writes each later sprint's prompts just in time, from the real state of the repo and the previous sprint's retro.

Every document follows the formats in the `spec-guard` skill's `references/formats.md`. Read that file before writing.

## Required inputs

- `docs/PRODUCT_BRIEF.md` and `docs/OPINIONATED_DEFAULTS.md` (from `product-discovery`)
- `docs/PRD.md` (from `product-requirements`): `FR-AREA-N` requirements with Given/When/Then criteria
- The schema document, `docs/FIREBASE_SCHEMA.md` or `docs/DATA_SCHEMA.md` per the profile (from `schema-design`)
- `docs/UI_SCREENS.md` (from `ui-screens-spec`)
- `docs/ARCHITECTURE.md` (from `system-architecture`)

If any is missing, say which and stop. Governance written from partial inputs is incoherent.

## Running spec-guard

Commands run from the project root. Once the guardrails are installed (Step 6) the tools live in `tools/spec-guard/`:

```bash
node tools/spec-guard/spec.mjs check --strict
node tools/spec-guard/spec.mjs waves --write
```

Before installation, run the same `scripts/spec.mjs` from the `spec-guard` skill's folder, still from the project root. If the `spec-guard` skill is not installed at all, tell the user that the checks below cannot run, install it with `npx github:aiudalabs/aiudalabs-marketplace add spec-guard --harness <id>`, and do not hand off until they pass.

## The method

### Step 1: Validate inputs and extract what the backlog needs

Run `spec.mjs check` (without `--strict`; there is no backlog yet). It reports malformed decision and requirement ids. Fix them in place when the fix is mechanical (renumbering `Decision 3` to `D-03`), and tell the user what you changed.

Then read the six documents and hold these lists for the rest of the skill:

- **Apps to build**: for example `customer-app` (Flutter), `provider-app` (Flutter), `admin` (React)
- **Requirements**: every `FR-...` not marked `(deferred)`, with its acceptance criteria
- **Execution units**: from ARCHITECTURE, the inventory of callables, endpoints, triggers, workers and scheduled jobs
- **Containers**: collections or tables from the schema, with who writes each
- **Screens per app**: numbered ids from UI_SCREENS with their tier (MVP / v1.1 / v2)
- **State machines**: every named machine and its transitions
- **Performance budgets**: the numeric targets from ARCHITECTURE
- **Deferred items**: everything explicitly pushed to v1.1, v2 or later, in any document
- **Locked decisions**: every `D-xx` not marked `(deferred)`. They are the contract: each one is implemented by at least one issue.

If the documents disagree (a screen that needs a container the schema lacks, a requirement nobody implements), stop and list the contradictions. Do not reconcile them silently.

### Step 2: Define the agent roster

The default roster comes from the **stack profile** locked in `OPINIONATED_DEFAULTS.md` (`**Stack profile:** flutter-firebase` or `fastapi-react`). Load the `stack-profile-<id>` skill and read its `references/agents.md`: it names the agents, their lanes and what they refuse. Write the lanes it gives, with this project's real folder names, into `docs/AGENT_ROSTER.md`.

The roster uses the exact format from `formats.md`: one `## <agent-name>` heading per agent, named exactly like the agent's file, a one-line identity, then `**Owns:**`, `**Reads:**` and `**Refuses:**` with globs in backticks. `qa-tester` has `**Owns:** none`. An example is in [references/documents.md](references/documents.md#agent-roster).

Rules that are not negotiable:

- **Exclusive ownership.** No path is owned by two agents, and globs may not overlap (`.github/**` in one lane and `.github/workflows/flutter.yml` in another fails `check`). A file two lanes want (a root `package.json`) goes to one; the other asks for changes.
- **No test agent, no docs agent.** Tests and docs belong to the agent that owns the code.
- **DevOps is split.** Platform config sits in the backend agent's lane. Each CI workflow file belongs to one lane: a workflow that validates only one lane belongs to that lane; a workflow that spans lanes, and every deploy workflow, belongs to the lane the profile gives the pipeline (the one that owns `.github/**` in the profile). When you give any workflow to another lane, list the workflow files one by one instead of `.github/**`. Production deploys run from CI on tagged `main`, never as an agent action.
- **Shared and generated files have one owner.** Lockfiles go to the lane that owns their workspace manifest; an aggregator every issue of a lane would edit (a `functions/src/index.ts` barrel, a route registry) is generated at build time or wired by one issue per sprint, so it does not serialize the waves; generated code belongs to the lane that owns its source. The rules and the root dotfiles are in [references/documents.md](references/documents.md#shared-and-generated-files).
- **Paths outside every lane.** The spec workflow's files: `docs/**`, `mockups/**`, the root `AGENTS.md` and `CLAUDE.md`. Installed tooling, rewritten by its installer: `tools/spec-guard/**`, `.githooks/**`, `.claude/**` (installed agents, skills, settings), `.aiudalabs-marketplace.json`. `STATUS.md`, written by `sprint-runner` when a sprint closes. List them under a closing `## Paths outside every lane` heading in the roster. No issue lists them in `files_touched`.
- **`.github/workflows/spec-guard.yml` is a lane's file.** It belongs to the pipeline lane the profile names (`firebase-dev` for flutter-firebase). The `spec-guard` installer writes it and `install.mjs --ci` rewrites it while it keeps the spec-guard marker comment; an issue that customizes it removes that line, and the installer then leaves it alone.
- **A change in another lane is asked for, never made.** An issue that needs two lanes is two issues, wired with `depends_on`. When a lane needs a change in a file it does not own, the owner's issue makes it.
- **Profile defaults first.** An agent reused across profiles (`react-dev`) gets its concrete lane from the profile, not from its own file.
- **The roster holds build agents and `qa-tester`.** A consultant that reviews spec documents and owns no lane (`product-advisor`) is not a roster entry, even when the profile mentions it.

#### When to add an agent beyond the profile

Only when the product needs expertise that fits no default lane, and only with the user's approval:

| Agent | When | Why |
|---|---|---|
| `dispatch-agent` | Delivery, matching or routing products | Routing logic cuts across functions, scheduled jobs and realtime data |
| `ml-agent` | Recommendations, ranking, vision, NLP | Training and serving are a discipline apart from CRUD |
| `content-mod-agent` | User-generated content at scale | Moderation has its own tooling, escalation and policy |
| `payments-agent` | Split payments, escrow, payouts, multi-currency | Refunds, disputes and chargebacks deserve isolated ownership |
| `integrations-agent` | Five or more third-party integrations | Integration code rots faster; isolating it contains the rot |
| `mobile-platform-agent` | Significant native iOS or Android code | Splits platform code from cross-platform Dart |

A custom agent needs an agent definition the harness can load (a persona with identity, lane and refusals) next to the installed ones, and a lane carved out of an existing one. For products that fit the defaults, do not invent agents.

### Step 3: Define the orchestrator role

The orchestrator is a **role, not an agent**. It has no section in the roster and owns no file. Whoever runs a sprint (a person, a session, any agent) plays it for that sprint: reads the next ready wave, dispatches each issue to its owner in its own worktree, sends finished work to `qa-tester`, merges approved issues at the wave barrier, and closes the sprint with a retro. When the sprint ends, the role passes on.

Write `docs/ORCHESTRATOR.md` with the sprint loop diagram, what the role does and does not do, and its anti-patterns (writing code instead of routing; becoming a permanent agent). The skeleton is in [references/documents.md](references/documents.md#orchestrator).

### Step 4: Write the constitution

Write the root `AGENTS.md`, at most 200 lines, and a root `CLAUDE.md` containing only `@AGENTS.md`. If the kickstart already wrote them, rewrite `AGENTS.md` in place and keep `CLAUDE.md` as the import. Structure:

1. **Project identity**: name, what it does in one sentence, who uses it
2. **The stack**: the locked profile line, versions, services, tooling
3. **How to work on this repo**: the exact commands to install, run, test and validate each lane, plus `spec.mjs status` and `check`, and `git config core.hooksPath .githooks` once per clone
4. **The agents**: one line per agent with its lane, pointing to `docs/AGENT_ROSTER.md`
5. **Orchestration**: pointer to `docs/ORCHESTRATOR.md`
6. **Sprint discipline**: pointers to `docs/ISSUES.md`, `docs/WAVE_DAG.md`, `docs/SPRINT_PROMPTS.md`
7. **Hard rules**: 6-10 numbered rules that override everything else. Always include:
   - Never commit if tests are red.
   - Never bypass the authorization layer (security rules, endpoint permissions).
   - Every state machine transition runs on the server, never in the client.
   - Atomic commits, one task per commit: `S3-07 task-1: <summary> [refs: D-03, FR-BOOKING-2]`.
   - Stay inside your issue's `files_touched` and your lane; the spec-guard hooks block the rest.
   - One worktree per issue (`wt/<issue-id>`); merges happen at the wave barrier, never mid-wave.
   - Every deliverable goes through `qa-tester` before merge.
   - A change in another agent's lane is requested from its owner (through the orchestrator), never made.
8. **What this repo does NOT do**: explicit boundaries

Project rules may be added ("amounts are integers in cents, never floats"). Code style is not the constitution's job; linters do that.

### Step 5: Decompose into sprints and issues

For an MVP, start from 13 sprints and adjust to the product:

| Sprint | Theme | Issues |
|---|---|---|
| 0 | Setup: monorepo, environments, CI, local emulators or database | 8-12 |
| 1 | Data layer: schema, authorization rules, seed data | 12-18 |
| 2 | Auth and onboarding | 10-15 |
| 3 | Core domain server units (callables, endpoints, triggers, workers) | 14-20 |
| 4 | Primary client app, core loop | 14-20 |
| 5 | Secondary client app, core loop | 14-20 |
| 6 | Notifications and realtime | 10-15 |
| 7 | Admin, read-only views | 10-15 |
| 8 | Admin, write actions | 10-15 |
| 9 | Performance budgets verified | 8-12 |
| 10 | End-to-end tests | 10-15 |
| 11 | Operational readiness, staging deploy | 8-12 |
| 12 | Polish, bug bash, production cutover | 12-18 |

Keep the order: setup, data and auth, server, clients, admin, performance, tests, deploy, polish.

Write every issue in `docs/ISSUES.md` exactly in the shape of `formats.md`: a `# Sprint N — Theme` heading, a `## S<N>-<nn> — Title` heading per issue, the frontmatter, a one-line `**Objetivo:**`, then `### Acceptance criteria` as a numbered list. A full example is in [references/documents.md](references/documents.md#issue).

**Do not write `wave`.** Waves are computed in Step 6.

**Spec questions only the build can answer** (an architecture "Changes to earlier documents" item marked deferred to build: a vendor spike, the real IAM roles) get an issue like any other work. It records the result in its own lane (a notes file such as `functions/src/adapters/payments/SPIKE.md`) and in its done summary, never in `docs/`. The issue's criteria say what spec change it feeds ("record the chosen gateway as decision D-13"); `product-spec-orchestrator` applies it through the owning phase skill before the issues that depend on it start. Docs cite such a future id with `(proposed)` until then.

Field rules beyond the format:

- **`**Objetivo:**`**: one plain-language sentence, in the user's language, saying what the issue achieves for the product or its users. No jargon, no file names. It is what a person reads on the board.
- **`owner`**: the agent's file name from the roster (`flutter-dev`, `firebase-dev`, `react-dev`, `python-dev`), never a conceptual role. The harness loads the persona by that name. One owner per issue. Never `qa-tester`.
- **`files_touched`**: every path or glob the issue writes, all inside the owner's lane. This list is what keeps parallel work conflict-free; be complete, including tests. Put each test where the package's test runner looks (read its config: the flutter-firebase scaffold's functions unit tests go in `functions/test/unit/` or next to the source, rules tests in `functions/test/rules/`, integration tests in `functions/test/integration/`); a test outside those globs never runs and its command still passes.
- **`depends_on`**: issues that must be merged first, same or earlier sprint.
- **`decision_refs`** and **`requirement_refs`**: the `D-xx` and `FR-...` ids the issue implements. Empty only for pure setup work.
- **`autonomous: false`** for destructive migrations, anything that moves money, deletes user data or changes permissions.
- **`commit_strategy: squash`** only for lockstep refactors (a rename across 30 files); atomic is the default because it keeps waves debuggable with `git bisect`.
- **`reads`**: the documents the executor opens first, as `path` or `path#anchor`. An anchor is the heading's GitHub slug or an explicit `<a id>`; the slug rule is in `formats.md`, and `check` reports each `reads` entry that does not resolve. Every UI issue lists `docs/UI_SCREENS.md#s-<screen-id>` for each screen it builds (the `<a id="s-<screen-id>"></a>` that precedes each screen heading). A **key screen** (one of the screens UI_SCREENS picks for mockups, with its mockup back-link) also lists `mockups/<app-id>.html#s-<screen-id>`, copied from that back-link, where `<app-id>` is the app id exactly as the brief names it (`player-app`, `admin-dashboard`). Other screens have no mockup anchor; they may list the app's mockup file without an anchor for its visual language. Criteria cite the screen id ("renders screen 1.2.1 per UI_SCREENS"). If UI_SCREENS has no `<a id="s-...">` anchors, add them before each screen heading as a mechanical fix and tell the user.

### Step 6: Install guardrails and compute waves

1. **Install or refresh the guardrails.** Ask the user to run the `spec-guard` installer from the project root (it needs a git repository). Run it even when `tools/spec-guard/` already exists (the kickstart installs it): it is safe to run again, replaces `tools/spec-guard/` with the scripts of the installed `spec-guard` skill and keeps the hooks and settings, so an updated `spec-guard` reaches the project only this way. Run it again after every `spec-guard` update.

   ```bash
   node <spec-guard skill folder>/scripts/install.mjs --ci           # every harness
   node <spec-guard skill folder>/scripts/install.mjs --ci --claude  # when they use Claude Code
   ```

   It copies the tools into `tools/spec-guard/`, sets the pre-commit and commit-msg hooks, adds the CI check, and with `--claude` a hook that blocks edits outside the lane. If there is no repository yet, say that `project-kickstart` creates it and run the checks from the skill's folder meanwhile.

2. **Compute waves.** Run `spec.mjs waves --write`. It writes `wave:` into each issue and `docs/WAVE_DAG.md`. Never edit a wave by hand; change `depends_on` or `files_touched` and re-run.

3. **Read the wave layout** and fix the shape, not the numbers:
   - A sprint with more than 7 waves is over-decomposed: merge issues or split the sprint.
   - A late single-issue wave usually hides an implicit dependency or a bottleneck issue to split.
   - A wave of more than 7 issues is more than one orchestrator can follow: add the real dependencies.

   After any change, run `waves --write` again.

### Step 7: Check before writing prompts

1. Run `spec.mjs check --strict` and fix every error it reports. It covers what used to be a manual checklist: owners exist and own a lane, `files_touched` inside the lane, no shared ownership, no dangling or uncovered `D-xx` and `FR-...`, an acyclic graph, disjoint waves. Re-run until it exits 0. An `uncovered-decision` or `uncovered-requirement` is a scope question, not a typo: ask the user whether an issue is missing or the item is `(deferred)`.
2. Then do the checks code cannot do, and surface anything you find to the user instead of fixing it silently:
   - `AGENTS.md` (and `CLAUDE.md`) contradict nothing in `docs/`.
   - Deferred items in `ISSUES.md` match the deferred list in `ARCHITECTURE.md`.
   - The commands in `AGENTS.md` actually work: run them if the repo is scaffolded; otherwise check each one against the profile's tooling. A command passes only when it ran something: the script exists in the package's `package.json` (or `melos.yaml`, `pyproject.toml`) and the output shows it ran. pnpm exits 0 for `pnpm --filter <name> <script>` when no package matches the name ("No projects matched the filters") and when the package lacks the script ("None of the selected packages has a ... script"), so write per-package commands as `pnpm --dir <package folder> run <script>`, which fails on a missing script, and count those two messages as a failure. A command that cannot run yet because a Sprint 0 issue creates its script is listed to the user as pending, not as passing. So is a test command that found no tests ("No test files found", "No tests found", `--passWithNoTests`): it verifies nothing until the first test exists. The scaffold keeps `--passWithNoTests` only so its empty packages pass CI; the Sprint 0 issue that adds a package's first test removes the flag in the same issue.
   - Every build agent in the roster owns at least one issue; a build agent with no issue leaves the roster. `qa-tester` owns none by design. A consultant such as `product-advisor` was never in the roster (Step 2), so it is not affected.

### Step 8: Write the Sprint 0 and Sprint 1 prompts

`docs/SPRINT_PROMPTS.md` holds one **orchestrator prompt** per sprint and one **executor prompt** per issue, for Sprint 0 and Sprint 1 only. Templates are in [references/documents.md](references/documents.md#sprint-prompts).

- **Orchestrator prompt** (typically 60-90 lines): context anchor (read `AGENTS.md`, the roster, `ORCHESTRATOR.md`, the sprint in `ISSUES.md` and `WAVE_DAG.md`); current state; the wave-by-wave plan with owners and worktrees; an approval gate ("output the wave plan first, spawn nothing until I approve").
- **Executor prompt** (typically 25-40 lines around the inlined issue): identity and worktree; the `reads` list, in order, and nothing else; the issue inlined verbatim; commit discipline; the done signal (summary, commits, deviations, handoff to `qa-tester`, no self-merge). When the `issue-delivery` skill is installed, the prompt tells the executor to follow it.

End the file with a note: "Prompts for Sprint 2 onward are generated by `execution-router` when the previous sprint closes."

Last check: every executor prompt matches its issue's frontmatter exactly. A prompt that drifts from its issue is fixed in the prompt, never in the issue.

## Anti-patterns

- **The orchestrator as an agent.** It is a role for one sprint, never a roster entry.
- **qa-tester rewriting code.** It reviews; only the owner edits.
- **Waves by hand.** The model guesses; `spec.mjs waves` computes.
- **Prompts for every sprint up front.** They go stale; Sprint 2+ comes from `execution-router`.
- **Skipping qa for "simple" changes.** Every deliverable goes through `qa-tester`, one-liners too.
- **Skipping the sprint retro.** Debt compounds invisibly, and the next sprint's prompts lose their best input.
- **Hidden coupling between sprints.** If Sprint 5 needs something Sprint 3 should have built, that is a Sprint 3 issue.
- **Inventing agents.** `docs-agent` or `test-agent` in an MVP is overengineering.
- **The constitution as a style guide.** Linters do that.
- **Decision drift.** A `decision_refs` pointing nowhere is a typo; a `D-xx` no issue cites is a silent scope drop. `check --strict` catches both; do not hand off until it passes.
- **Squash as default.** Atomic commits make waves debuggable.

## Communication style

- **Spanish** with the user, **English** in the documents (they are code-adjacent configuration).
- Prescriptive, not suggestive: these are rules.
- Tables for the roster, the issue list and the sprint summary.
- The ASCII sprint-loop diagram goes in `ORCHESTRATOR.md`.

## Handoff

Overwrite the whole `docs/SESSION.md` with exactly this shape. Mark each phase `done` or `pending` from what `spec.mjs status` reports, with Phase 6 done:

```markdown
# Session — {project title}

_Narrative for the next session. What is done is decided by `node tools/spec-guard/spec.mjs status`, which reads the documents; when they disagree, status wins._

## Phases

| Phase | Skill | State |
| --- | --- | --- |
| 1 | product-discovery | done |
| 2 | product-requirements | done |
| 3 | schema-design | done |
| 4 | ui-screens-spec | done |
| 5 | system-architecture | done |
| 6 | multi-agent-governance | done |
| 7 | navegable-mockups | {done / pending} |

## Last phase: 6 — multi-agent-governance

- {3 to 5 bullets the build must know: roster and lanes, the CI and lockfile owners, issues that need a person, scope moved between sprints}

## Open questions

- {items marked [SUPUESTO] or deferred to a later phase, or "None"}

## Next

{Phase 7 — navegable-mockups, if pending; otherwise the build: Sprint 0 with sprint-runner}
```

Then close in Spanish. Under `product-spec-orchestrator`, its phase gate replaces this closing message: give it the counts below and the decisions worth verifying.

> Governance lista. {N} sprints, {M} issues, {K} agentes. `spec.mjs check --strict` pasa. Prompts listos para Sprint 0 y 1.
>
> **Opciones:**
> 1. **Mockups antes del build:** `navegable-mockups` (Phase 7), para validar con el equipo.
> 2. **Correr Sprint 0 con agentes:** el workflow `sprint-runner`, ola por ola con worktrees y revisión de `qa-tester`.
> 3. **A mano:** pega el prompt de Sprint 0 de `docs/SPRINT_PROMPTS.md` en tu agente.
> 4. **Al tracker:** `node tools/spec-guard/spec.mjs export github|csv|json` (el CSV sirve para Jira o Linear).
>
> Cuando cierre un sprint, `execution-router` prepara el siguiente desde el estado real del repo.

Commit the phase on the base branch, outside any issue branch: `git add AGENTS.md CLAUDE.md docs/ && git commit -m "docs: phase 6 multi-agent-governance"` (under `product-spec-orchestrator`, its gate commits once the user approves). The `spec-guard` pre-commit hook runs `spec.mjs check` because `docs/ISSUES.md` is staged; a failing check blocks the commit, so fix it rather than skipping the hook.

Sprint 0 is pure setup with no business dependencies; it can start while the rest of the team reviews the spec.

## What this skill does not do

- Scaffold the repository on disk (`project-kickstart`) or create cloud projects
- Write application code or run sprints (`sprint-runner`)
- Prepare sprints after Sprint 1 (`execution-router`)
- Add agents without the user's approval
- Produce mockups (`navegable-mockups`)
