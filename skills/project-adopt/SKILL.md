---
name: project-adopt
description: "Brings an EXISTING code base into the spec-driven multi-agent method so spec-guard and the developer agents can work in it: inventories the repo (stack, folders, commands, tests, CI), proposes a stack profile or says none fits, reconstructs docs/OPINIONATED_DEFAULTS.md from decisions visible in code with the evidence file for each, maps agent lanes onto the real folders in docs/AGENT_ROSTER.md, writes a minimal AGENTS.md constitution with the commands that really work, and plans the user's next feature as one sprint in docs/ISSUES.md. Use when the repo already has code: \"adopta este repo\", \"quiero usar los agentes en mi proyecto existente\", \"onboard this codebase\", \"add the method to our app\". For an empty folder, use project-kickstart; for a new product from an idea, product-spec-orchestrator."
license: MIT
compatibility: Needs git and Node.js 20 or later for the spec-guard commands, plus the project's own toolchain to confirm its commands run.
metadata:
  version: "1.0.0"
  author: aiudalabs
  requires: spec-guard stack-profile-flutter-firebase stack-profile-fastapi-react
---

# Project Adopt

Brings a repository that already has code into the method: decisions written down, lanes drawn on the real folders, a constitution with commands that work, and the next feature planned as a sprint that `spec-guard` can check and `sprint-runner` can run.

Adoption documents what **is**, and plans only what the user is about to build. It never invents a PRD for the whole product: requirements exist only for the feature being built. Every claim about the existing code cites the file it comes from.

## When to use it

- "adopta este repo" / "quiero usar los agentes en mi proyecto existente"
- "onboard this codebase" / "add the method to our app"
- "quiero que spec-guard funcione en este repo"
- The user wants to build a feature in a code base that was not built with this method

Do not use it when:

- The folder is empty or has only a README: `project-kickstart`.
- There is no product yet, only an idea: `product-spec-orchestrator`.
- The repo already has `docs/ISSUES.md` and `docs/AGENT_ROSTER.md` in the formats of `spec-guard`: it is already adopted; use `execution-router` for the next sprint.

## Outputs

| File | Content |
|---|---|
| `docs/ADOPTION_INVENTORY.md` | What the repo is today: stack, folders, commands, tests, CI |
| `docs/OPINIONATED_DEFAULTS.md` | Decisions reconstructed from code, each citing its evidence |
| `docs/AGENT_ROSTER.md` | Lanes mapped onto real folders, no overlaps |
| `AGENTS.md` + `CLAUDE.md` (root) | Minimal constitution; `CLAUDE.md` is the line `@AGENTS.md` |
| `docs/PRD.md` | Requirements for the next feature only |
| `docs/ISSUES.md`, `docs/WAVE_DAG.md` | The feature as one sprint, waves computed |

All of them follow the `spec-guard` skill's `references/formats.md`. Read it before writing.

Never overwrite an existing file without asking. If the repo already has a root `AGENTS.md` or `CLAUDE.md`, show the user how you would merge, keep what they wrote, and add only what is missing.

## Step 1: Inventory the repository

Read before asking. Collect, with the file that shows each fact:

- **Stack**: languages, frameworks and versions (`pubspec.yaml`, `package.json`, `pyproject.toml`, `firebase.json`, `Dockerfile`, lock files).
- **Layout**: top-level folders and what each holds; monorepo tooling (Melos, pnpm workspaces, Nx, Turborepo, uv workspaces).
- **Commands**: install, run, test, lint, build, as declared in scripts, Makefiles and READMEs.
- **Tests**: where they live, the framework, roughly how many.
- **CI**: workflows, what they run, on which branches.
- **Branches**: the default branch and whether a `develop` exists.
- **Existing docs**: architecture notes, ADRs, an existing `AGENTS.md` or `CLAUDE.md`.

Run the commands you found (install, then test) and record which pass, which fail and which do not exist. A command that does not run is a finding, not something to copy into the constitution.

Write `docs/ADOPTION_INVENTORY.md` with these sections and the evidence paths.

## Step 2: Propose a stack profile

Compare the inventory with the two profiles. Load the `stack-profile-flutter-firebase` and `stack-profile-fastapi-react` skills to compare.

- **Fits**: say which profile and why, citing files. Note where the repo deviates (a different folder name, a missing service); the repo's reality wins over the profile's defaults.
- **Fits partly** (React frontend with a Node backend; FastAPI with a Vue frontend): name the closest profile, list what does not apply, and use its method without its paths.
- **Fits neither** (Rails, Go, Next.js with Supabase): say so plainly. The method still works: decisions, lanes, issues and waves do not depend on the stack. Agents will be the generic developer agents with lanes drawn from this repo.

**Gate 1: show the inventory and the profile proposal. Wait for explicit approval.**

## Step 3: Reconstruct the decisions

Write `docs/OPINIONATED_DEFAULTS.md` with the decisions the code already made, numbered `D-01`, `D-02`, ... in the format of `formats.md`. Each decision:

```markdown
## D-04 — Money is stored as integer cents

**Lock:** Every amount is an integer number of cents; floats are never used for money.

**Evidence:** `src/billing/models.py:12` (`amount_cents: int`), `src/billing/totals.py:30`.
```

Rules:

- **Every decision cites at least one evidence file**, with a line when it helps.
- **Uncertain decisions are marked `[SUPUESTO]`** in the title (`## D-07 — [SUPUESTO] Soft delete for users`), with what you saw and what would confirm it. The user confirms or rejects each one; confirmed ones lose the mark, rejected ones are deleted.
- Include the stack profile line when one fits: `**Stack profile:** flutter-firebase`.
- Cover what an agent must not break: the data store, authentication and authorization, where state transitions happen, money and time handling, error and logging conventions, the deploy path.
- Do not invent product decisions the code does not show. Fewer true decisions beat many guessed ones.

**Gate 2: walk the user through every `[SUPUESTO]`. Wait for explicit confirmation of each.**

## Step 4: Draw the lanes

Write `docs/AGENT_ROSTER.md` in the exact roster format of `formats.md`: one `## <agent-name>` per agent, a one-line identity, `**Owns:**`, `**Reads:**`, `**Refuses:**`, globs in backticks.

- Start from the profile's roster (the profile skill's `references/agents.md`) when one fits, and replace its paths with this repo's real folders.
- **No overlaps.** Every path belongs to at most one agent. A shared root file (`package.json`, `pyproject.toml`) goes to one agent; the others ask for changes.
- Folders nobody owns are fine (vendored code, generated files); list them in the constitution as "not edited by agents".
- `qa-tester` is always present with `**Owns:** none`.
- Agent names must match agent definitions the harness can load: `flutter-dev`, `firebase-dev`, `react-dev`, `python-dev`, `qa-tester` from the marketplace (`npx github:aiudalabs/aiudalabs-marketplace add <name> --harness <id>`), or a custom one the user approves.

## Step 5: Write a minimal constitution

Write the root `AGENTS.md`, under 120 lines, and a root `CLAUDE.md` with the single line `@AGENTS.md`:

1. **Project identity**: one sentence on what it does, from the README or the user.
2. **Stack**: from the inventory; the profile line if one fits.
3. **Commands**: only the ones that ran in Step 1, per lane, plus `git config core.hooksPath .githooks` once per clone. Failing commands are listed under "Known broken" with what fails.
4. **Agents and lanes**: one line each, pointing to `docs/AGENT_ROSTER.md`.
5. **Hard rules**: never commit with red tests; stay inside `files_touched` and the lane; one worktree per issue (`wt/<issue-id>`), merges at the wave barrier; atomic commits `S1-03 task-1: <summary> [refs: D-04, FR-EXPORT-1]`; every deliverable goes through `qa-tester`; plus the rules the decisions imply (where state transitions live, how money is stored).
6. **Not edited by agents**: vendored, generated or out-of-scope folders.

**Gate 3: show the roster and the constitution. Wait for explicit approval before writing them.**

## Step 6: Plan the next feature as a sprint

Ask what the user wants to build next. Then:

1. Write `docs/PRD.md` with requirements **for this feature only**, `### FR-AREA-N — Title` with Given/When/Then, in the format of `formats.md`. No requirements for the existing product.
2. Add any new decisions the feature forces to `OPINIONATED_DEFAULTS.md`, continuing the numbering.
3. Write `docs/ISSUES.md` with one sprint, numbered after what the team calls it (`# Sprint 1 — CSV export`), each issue in the exact shape of `formats.md`: owner from the roster, `files_touched` inside the owner's lane and matching real paths, `depends_on`, `decision_refs`, `requirement_refs`, `autonomous: false` for migrations, money, deletes and permission changes, `reads` pointing at the inventory, the decisions and the existing code the issue builds on, a one-line `**Objetivo:**` and numbered acceptance criteria. **Do not write `wave`.**

Size the sprint to the feature: usually 4-15 issues. A feature that needs more is two sprints.

## Step 7: Compute waves and check

From the project root, using `tools/spec-guard/spec.mjs` once installed, or the `spec-guard` skill's `scripts/spec.mjs` before that:

```bash
node tools/spec-guard/spec.mjs waves --write
node tools/spec-guard/spec.mjs check --strict
```

Fix every error until it is gone. Reconstructed decisions describe code that already exists, so each one carries `(existing)` in its heading (`## D-05 — Money is integer cents (existing)`): spec-guard then needs no issue for it. Handle them honestly:

- Cite a reconstructed decision in `decision_refs` only when the issue really applies it (an export issue that formats amounts applies "money is integer cents").
- Never add an empty issue to cover a decision, and never mark an existing one `(deferred)`: that would say it is out of this release, which is false.
- The decisions and requirements of the new feature are not `(existing)`: each needs an issue, or `(deferred)` with the user's agreement.

Then the judgment checks: the constitution contradicts nothing in `docs/`; every command in it ran in Step 1; every `files_touched` path exists or is a new file inside its lane.

**Gate 4: show the sprint, the waves and a clean `check --strict`. Wait for explicit approval.**

## Step 8: Install the guardrails

Ask the user to run, from the project root:

```bash
node <spec-guard skill folder>/scripts/install.mjs --ci           # every harness
node <spec-guard skill folder>/scripts/install.mjs --ci --claude  # when they use Claude Code
```

It copies the tools into `tools/spec-guard/`, sets the git hooks (staged files must sit inside the active issue's `files_touched` and lane; commit messages carry the issue id) and adds the CI check. Explain what changes for the team: on a branch named after an issue, commits must stay inside that issue and start with its id; other branches, such as a hotfix branch, are not restricted, but the CI check still runs on every push.

## Handoff

In Spanish:

> Repo adoptado. {K} agentes con carriles en carpetas reales, {D} decisiones reconstruidas ({S} confirmadas de supuestos), sprint "{feature}" con {M} issues en {W} olas. `spec.mjs check` limpio salvo {U} decisiones reconstruidas sin issue (esperado).
>
> Siguiente: corre el sprint con `sprint-runner`, o pide a `execution-router` los prompts del sprint.

## Anti-patterns

- **A full PRD for the existing product.** It takes days, is wrong in places, and nobody maintains it. Requirements cover the feature being built.
- **Decisions without evidence.** A decision that cites no file is a guess; mark it `[SUPUESTO]` or drop it.
- **Lanes from the profile instead of the repo.** If the frontend lives in `web/`, the lane is `web/**`, not `frontend/**`.
- **Overlapping lanes "for flexibility".** Overlaps are what make parallel work conflict.
- **Copying commands that do not run** into the constitution.
- **Restructuring the repo to fit a profile.** Adoption documents; refactors are issues the user chooses.
- **Overwriting an existing `AGENTS.md`** without showing the merge.

## Communication style

- **Spanish** with the user, **English** in the documents.
- Evidence first: every statement about the code carries a path.
- Gates are explicit: "¿Apruebas el roster y la constitución, o cambiamos algo?"
