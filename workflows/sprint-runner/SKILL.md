---
name: sprint-runner
description: "Runs one sprint of docs/ISSUES.md with coding agents, wave by wave: one git worktree per issue, the issue's owner agent dispatched with its executor prompt, qa-tester reviewing each result with spec.mjs verify, approved issues merged at the wave barrier in id order, and a sprint retro at the end. Stops for human approval before every wave and on issues marked autonomous: false. Use when the backlog exists and the user wants it built: \"corre el sprint 2\", \"ejecuta la ola 1 con los agentes\", \"arranca el build\", \"run sprint 0\". Preparing the next sprint's prompts from the repo's state is execution-router; writing the backlog is multi-agent-governance; implementing one single issue is issue-delivery."
license: MIT
compatibility: Dispatches developer agents and qa-tester as subagents in separate git worktrees, so it needs a harness with subagents, git 2.5 or later and Node.js 20 or later. Without subagents, run the same loop sequentially in one session, one issue at a time.
metadata:
  version: "1.0.0"
  author: aiudalabs
  requires: spec-guard issue-delivery issue-review execution-router
  agents: qa-tester
---

# Sprint Runner

Runs one sprint of the backlog with agents. The workflow plays the **orchestrator role**: it routes, merges and stops for the person; it never writes application code. The procedure for building an issue lives in `issue-delivery`, the procedure for reviewing it in `issue-review`, and the identities in the agents.

## Inputs

- A repository with `AGENTS.md`, `docs/AGENT_ROSTER.md`, `docs/ISSUES.md` with computed waves, and the `spec-guard` tools in `tools/spec-guard/`
- `docs/SPRINT_PROMPTS.md` with this sprint's orchestrator and executor prompts
- The sprint number (default: the one `spec.mjs status` reports as in progress or next)
- The base branch (default `develop`)

If the tools are missing, stop and ask the user to install them with the `spec-guard` skill: lane checks and waves are what make parallel work safe. If this sprint's prompts are missing or marked stale, run `execution-router` for this sprint first.

## Phase 0: Preflight

1. Run `node tools/spec-guard/spec.mjs check --strict`. Any error stops the sprint.
2. Run `node tools/spec-guard/spec.mjs status`. Note the sprint, its waves, what is already merged and the next ready wave. Issues already merged are never re-run.
3. Check the base branch is clean and up to date: `git status --short`, `git fetch`, and that it matches its remote.
4. Run the full test gate from `AGENTS.md` on the base branch. A red base means every issue would start red: stop and report.

**Gate: show the sprint plan (waves, issues, owners, which issues need a human checkpoint) and wait for explicit approval.**

## Phase 1: Run each wave

Repeat for every wave of the sprint, in order. Take the wave from `spec.mjs status`, never from memory.

### 1. Approve the wave

**Gate: show the wave: each issue with its owner, `files_touched`, `autonomous` flag and worktree. Wait for explicit approval before creating anything.**

### 2. One worktree per issue

```bash
git worktree add -b wt/S3-07 ../<repo>-wt/S3-07 develop
```

One branch `wt/<id>` per issue, all off the same base commit. Issues in a wave have disjoint `files_touched` (the waves guarantee it), so they cannot see or step on each other.

### 3. Dispatch the owners

For each issue, dispatch the agent named in its `owner` field as a subagent working inside that issue's worktree. Its prompt is the issue's executor prompt from `docs/SPRINT_PROMPTS.md`, verbatim, and it tells the agent to follow the `issue-delivery` skill. Issues of one wave run in parallel; issues the sprint plan marks sequential wait until the wave's parallel issues have merged.

For an issue with `autonomous: false`, the owner posts its plan and stops. **Gate: show that plan to the person and wait for approval before the owner writes code.** Relay the answer; do not answer for them.

If an owner reports it cannot finish (the spec contradicts itself, a dependency is missing, the change needs a file outside its lane), do not reassign it and do not fix it yourself. Mark the issue blocked, let the rest of the wave continue, and bring the blocker to the person at the barrier.

### 4. Review each finished issue

When an owner posts its done SUMMARY, dispatch `qa-tester` on that worktree, telling it to follow the `issue-review` skill. It checks every acceptance criterion with evidence, reruns the test gate and runs:

```bash
node tools/spec-guard/spec.mjs verify S3-07 --base develop
```

- **Approved**: the issue is ready for the barrier.
- **Changes requested**: send the verdict back to the same owner in the same worktree, then review again. After three rounds on one issue, stop and bring it to the person.

`qa-tester` never edits code, and neither does the orchestrator.

### 5. Merge at the wave barrier

When every issue of the wave is approved or blocked:

1. Merge the approved issues into the base branch **in id order**, one at a time, keeping their atomic commits (`git merge --no-ff wt/S3-05`, then `wt/S3-07`, ...). Squash only issues with `commit_strategy: squash`.
2. **A merge conflict stops the sprint.** Two issues of one wave touched the same file, so a `files_touched` list was wrong. Abort the merge (`git merge --abort`), report which issues and files collided, and wait for the person. The fix is in `docs/ISSUES.md` (the correct `files_touched`, then `spec.mjs waves --write`), not in a hand-resolved conflict.
3. After the merges, run the full test gate on the base branch. Red stops the sprint.
4. Remove the merged worktrees: `git worktree remove ../<repo>-wt/S3-07` and delete their branches.
5. Run `spec.mjs status` to confirm the merged issues count as merged and to read the next wave.

**Gate: report the wave: merged, blocked, findings worth knowing. Wait for approval before the next wave.**

## Phase 2: Close the sprint

When the last wave is merged, or the person decides to stop:

1. Dispatch `qa-tester` to close the sprint with the `issue-review` skill: goal-backward verification ("can a real user now do what this sprint promised?"), the full gate and `spec.mjs check` on the base branch, the debt taken on, and the retro in `docs/execution/sprint-<N>-retro.md`.
2. Unmerged or blocked issues are listed in the retro, never dropped silently.
3. Update `STATUS.md` with the sprint's outcome.

**Gate: show the retro.** Then point to the next step:

> Sprint {N} cerrado: {merged}/{total} issues, {blocked} bloqueados. Retro en `docs/execution/sprint-{N}-retro.md`.
> Siguiente: `execution-router` prepara el Sprint {N+1} desde el estado real del repo y este retro.

## Without subagents

When the harness has no subagents, run the same loop in one session: for each issue of the wave, in id order, switch into its worktree, follow `issue-delivery` as its owner (adopting the owner's lane from the roster), then switch roles and follow `issue-review` as `qa-tester` on the result. The gates, the barrier and the merge rules do not change. Slower, equally safe.

## Rules the orchestrator keeps

- Never write or fix application code. Route it to the owner.
- Never merge an issue `qa-tester` has not approved, or merge mid-wave.
- Never resolve a merge conflict by hand inside the sprint.
- Never edit `wave:` by hand; change the backlog and re-run `spec.mjs waves --write`.
- Never move an issue to another agent's lane to go faster.
- Never bypass the spec-guard hooks with `--no-verify`.
- Never skip a gate because the previous waves went well.

## Communication style

Spanish with the user, short reports at each gate: a table of issues with their state, then what needs a decision. English in commits, verdicts and the retro.
