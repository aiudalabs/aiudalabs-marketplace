---
name: execution-router
description: "Prepares the next sprint just in time, from the repository's real state: reads spec-guard status, the previous sprint's retro and the code that actually got merged, corrects the sprint's issues when reality moved, classifies each issue by size, scope and risk to choose its execution mode (parallel worktree or sequential, autonomous or with a human checkpoint) and its validation rigor, and rewrites that sprint's orchestrator and executor prompts in docs/SPRINT_PROMPTS.md. Use between sprints: \"prepara el sprint 3\", \"cerramos el sprint, ¿qué sigue?\", \"regenera los prompts del próximo sprint\", \"route the next sprint\". It does not plan the whole backlog (multi-agent-governance) and does not run the sprint (sprint-runner)."
license: MIT
metadata:
  version: "1.0.0"
  author: aiudalabs
  requires: spec-guard issue-delivery
---

# Execution Router

`multi-agent-governance` plans the whole backlog once and writes prompts for Sprint 0 and Sprint 1 only. Everything after that is prepared here, one sprint at a time, when the previous one has closed. A prompt written months ahead describes a repository that never existed; a prompt written today from the merged code and the last retro does not.

This skill prepares. It does not write application code and does not run the sprint: `sprint-runner` (or a person playing the orchestrator role) does that with the prompts this skill writes.

## When to use it

- "prepara el sprint {N}" / "cerramos el sprint, ¿qué sigue?"
- "regenera los prompts del próximo sprint" / "route the next sprint"
- After `sprint-runner` ends a sprint and points here
- Before Sprint 0 or 1 when their prompts are stale (the kickstart or the spec changed after governance)

Do not use it when:

- There is no `docs/ISSUES.md`: run `multi-agent-governance` first (or `project-adopt` for an existing codebase).
- The user wants the sprint executed: `sprint-runner`.
- The user wants one ad-hoc prompt for a task outside the backlog: write it in chat.

## Inputs

- `node tools/spec-guard/spec.mjs status`: merged issues, the sprint in progress, the next ready wave
- `docs/execution/sprint-<N-1>-retro.md`: the previous sprint's retro (what slipped, what broke, what the team learned)
- The real repository: `git log` on the base branch, the files that exist, the commands that work
- `AGENTS.md`, `docs/AGENT_ROSTER.md`, `docs/ISSUES.md`, `docs/WAVE_DAG.md`, `docs/ARCHITECTURE.md`, the schema document

If `spec-guard` is not installed in the project, ask the user to install it (see the `spec-guard` skill) before going on: the status and the checks are the inputs this skill trusts. If the retro is missing, say so and ask for the three facts it would have given: what was not finished, what broke, what to change.

## Step 1: Establish where the project really is

1. Run `spec.mjs status`. Name the target sprint: the lowest sprint with unmerged issues.
2. Unmerged issues from earlier sprints are carried over, not forgotten: list them and ask whether they move into the target sprint or stay where they are.
3. Read the retro. Extract every point that changes the plan: an underestimated area, a flaky command, a lane that was too wide, a dependency nobody declared.
4. Look at the code the target sprint builds on. For each issue, check that what its `reads` and acceptance criteria assume exists (the collection, the endpoint, the shared type, the package) and that its `files_touched` still match the real layout.

## Step 2: Correct the sprint's issues

Reality moves; the backlog follows. Typical corrections:

- A path changed: update `files_touched` (still inside the owner's lane).
- A hidden dependency surfaced in the retro: add it to `depends_on`.
- An issue is too big for one agent session (Step 3 says "large + cross-package"): split it into two issues with new ids at the end of the sprint.
- A risky issue was marked autonomous: set `autonomous: false`.
- Something an earlier sprint should have built is missing: add an issue for it here and say so; do not hide it inside another issue.

Never change `decision_refs` or `requirement_refs` to make an issue fit, and never drop an issue silently: dropping scope is the user's decision.

Show the corrections as a list and **wait for approval** before writing. Then update `docs/ISSUES.md` and run:

```bash
node tools/spec-guard/spec.mjs waves --write
node tools/spec-guard/spec.mjs check --strict
```

Fix every error before writing prompts.

## Step 3: Classify each issue

| Axis | Values | Read from |
|---|---|---|
| **Size** | small (< 200 lines changed), medium (200-1000), large (> 1000) | acceptance criteria, number of `files_touched` |
| **Scope** | single file, single package, cross-package, repo-wide | `files_touched` against the folder layout |
| **Risk** | low (UI, docs), medium (server units, schema), high (authorization, money, migrations, deletes) | `decision_refs`, the criteria, the retro |

When an issue is ambiguous, call it medium on all three.

The classification decides three things:

**Execution mode.**
- **Parallel worktree** (default): the issue runs in its own worktree alongside the rest of its wave. Right for small and medium issues with a single-package scope.
- **Sequential**: the issue runs alone, after the other issues of its wave merge, in one session. Right for repo-wide changes, `commit_strategy: squash` refactors, and large cross-package issues that would make a wave barrier painful to review.

**Autonomy.**
- **Autonomous**: the executor plans, implements and hands to `qa-tester` without stopping.
- **Human checkpoint**: the executor posts its plan and stops for approval before writing code, and again before the final commit. Required for high risk, and for anything the retro flagged. Mirror it in the issue as `autonomous: false`.

**Validation rigor.**
- **Low risk**: the lane's test command and `spec.mjs verify <id>`.
- **Medium risk**: plus integration tests (emulators or a test database), and the state machine transitions the issue touches.
- **High risk**: plus authorization tests (rules tests, permission tests on endpoints), a rollback note, and a human check listed explicitly ("the refund amount matches the provider's dashboard").

Some checks only a person can do: the screen does not overflow at 375 px, the Spanish error text reads naturally, the behavior matches `D-07` as the user meant it. List them as a human handoff in the issue's plan; never pretend a script covers them.

## Step 4: Write the sprint's prompts

Replace the target sprint's section in `docs/SPRINT_PROMPTS.md` (add it if it does not exist). Leave other sprints' sections alone, except to mark a stale one: "Stale: regenerate with `execution-router` before running."

The section has three parts.

**1. Execution plan table**

| Issue | Owner | Wave | Size | Scope | Risk | Mode | Autonomy | Validation |
|---|---|---|---|---|---|---|---|---|

**2. Orchestrator prompt** (60-90 lines), paste-ready:

1. *Anchor*: "You are playing the orchestrator role for Sprint {N}: {theme}. Read AGENTS.md, docs/AGENT_ROSTER.md, docs/ORCHESTRATOR.md, docs/ISSUES.md (Sprint {N}), docs/WAVE_DAG.md (Sprint {N}). Run `spec.mjs status` and confirm scope."
2. *Current state*: facts from Step 1, written today: what is merged, what exists, what the retro changed. Never copied from an earlier sprint.
3. *Wave plan*: per wave, the issues, owners, worktrees and modes; sequential issues after the barrier; checkpoints named.
4. *Approval gate*: "Output the wave plan FIRST. Spawn nothing until I approve."

**3. Executor prompt per issue** (25-40 lines), paste-ready:

1. *Identity*: "You are {owner}, delivering {id} in worktree `wt/{id}`. Your lane is docs/AGENT_ROSTER.md § {owner}. Follow the `issue-delivery` skill."
2. *Context*: the `reads` list in order, and nothing else.
3. *Current state*: the two or three repo facts this issue depends on.
4. *Task*: the issue inlined verbatim, with `files_touched` and the lanes not to touch.
5. *Validation*: the exact commands for its rigor level, and `spec.mjs verify {id}`.
6. *Autonomy*: autonomous, "post your plan, then proceed"; human checkpoint, "post your plan and wait for approval before writing code".
7. *Done signal*: summary, commits, deviations, the human checks, handoff to `qa-tester`. No self-merge.

## Step 5: Check and hand off

1. Every unmerged issue of the target sprint has a row in the plan and an executor prompt; no merged issue has one.
2. Every prompt cites documents and sections that exist, and commands that exist in `AGENTS.md`.
3. Every executor prompt matches its issue's frontmatter after the corrections.
4. `spec.mjs check --strict` exits 0.

Close in Spanish:

> Sprint {N} listo. {M} issues en {W} olas; {S} secuenciales, {C} con checkpoint humano. Cambios al backlog: {list or "ninguno"}. Siguiente: corre el sprint con `sprint-runner`, o pega el prompt de orquestador de `docs/SPRINT_PROMPTS.md` § Sprint {N}.

## Anti-patterns

- **"Adapt this prompt to your situation."** Paste-ready means verbatim; write the adaptation into the prompt.
- **Stale current state.** Copying Sprint 2's facts into Sprint 5.
- **Prompts for merged issues.** This skill looks forward only.
- **Ignoring the retro.** It is the best input the next sprint has.
- **Rewriting scope.** Corrections fix paths, dependencies and size; dropping or changing requirements is the user's call.
- **Waves by hand.** Re-run `waves --write` after any backlog change.
- **Validation without commands.** "Run the tests" is not a gate; `pnpm --filter functions test` is.
- **Meta-narrative inside the prompt block.** Explanations go around the fenced prompt, not in it.

## Communication style

- **Spanish** with the user, **English** in the prompts and documents.
- Cite issue ids, never "the next issue".
- Tables for the plan, fenced blocks for prompts and commands.

## What this skill does not do

- Write application code or run the sprint (`sprint-runner`)
- Plan the whole backlog or add agents (`multi-agent-governance`)
- Drop scope or change requirements without the user's approval
- Recommend third-party coding tools: the prompts are written for whichever coding agent the team uses
