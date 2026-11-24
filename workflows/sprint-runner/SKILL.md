---
name: sprint-runner
description: "Runs one sprint of docs/ISSUES.md with coding agents, wave by wave: one git worktree per issue, the issue's owner agent dispatched with its executor prompt, qa-tester reviewing each result with spec.mjs verify, approved issues merged at the wave barrier in id order, and a sprint retro at the end. Stops for human approval before every wave and on issues marked autonomous: false. Use when the backlog exists and the user wants it built: \"corre el sprint 2\", \"ejecuta la ola 1 con los agentes\", \"arranca el build\", \"run sprint 0\". Preparing the next sprint's prompts from the repo's state is execution-router; writing the backlog is multi-agent-governance; implementing one single issue is issue-delivery."
license: MIT
compatibility: Dispatches developer agents and qa-tester as subagents in separate git worktrees, so it needs a harness with subagents, git 2.5 or later and Node.js 20 or later. Without subagents, run the same loop sequentially in one session, one issue at a time.
metadata:
  version: "1.2.2"
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

If the tools are missing, stop and ask the user to install them with the `spec-guard` skill: lane checks and waves are what make parallel work safe. After a `spec-guard` update, ask the user to run its installer again before the sprint (`node <spec-guard skill folder>/scripts/install.mjs`; safe to repeat, it replaces `tools/spec-guard/` and the hooks it wrote, adds new hooks and keeps settings). If `check` then reports `prompt-drift` in a `docs/SPRINT_PROMPTS.md` written before the update, run `spec.mjs prompts --write` once and commit it on the base. If this sprint's prompts are missing or marked stale, run `execution-router` for this sprint first.

## Phase 0: Preflight

1. Run `node tools/spec-guard/spec.mjs check --strict`. Any error stops the sprint.
2. Run `node tools/spec-guard/spec.mjs status`. Note the sprint, its waves, what is already merged and the next ready wave. Issues already merged are never re-run.
3. Check the base branch is clean: `git status --short`. When it has an upstream (`git rev-parse --abbrev-ref @{u}` succeeds), `git fetch` and check it matches it. Without a remote, skip the comparison and say so in the plan.
4. Check no emulator or dev server is already running (`lsof -iTCP -sTCP:LISTEN -P` on the ports in `firebase.json`). One you did not start is not yours to stop: report it and ask the person.
5. Run the full test gate from `AGENTS.md` on the base branch, then stop every emulator it started. A red base means every issue would start red: stop and report. A command counts as green only when its output shows it ran: pnpm exits 0 on "No projects matched the filters" and "None of the selected packages has a ... script", so treat those as failures and report the command as broken.

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

Files are disjoint; ports are not. Give the k-th worktree of the wave a port offset of k×100 (the base keeps 0) and put it in the owner's and the reviewer's dispatch. When the project ships `tools/emulator-config.mjs` (the flutter-firebase scaffold does), every emulator gate in that worktree runs with `FIREBASE_CONFIG="$(node tools/emulator-config.mjs <k×100>)"` (for example `FIREBASE_CONFIG="$(node tools/emulator-config.mjs 100)" pnpm rules:test`). The script writes `firebase.emulators-<offset>.json` in the worktree root, ignored by git, with the offset ports, host 127.0.0.1 and the UI off, and prints its path. It sits in the worktree root, not outside it, because firebase-tools treats the config's folder as the project directory and resolves the rules and `functions/.deploy` against it. The project's emulator scripts (`rules:test`, `emulators:test`, `emulators:check`) pass it through as `--config`. The file is deleted after the gate. Without such a script, run emulator gates one worktree at a time: the orchestrator hands the turn over and waits for it back. Never let an agent hand-edit a copy of `firebase.json` inside the worktree.

Every gate stops what it starts. An agent that starts an emulator or a server stops it before it reports, and confirms nothing it started from its worktree still listens. It never stops another agent's process.

### 3. Dispatch the owners

For each issue, dispatch the agent named in its `owner` field as a subagent working inside that issue's worktree. Its prompt is the issue's executor prompt from `docs/SPRINT_PROMPTS.md`, verbatim, and it tells the agent to follow the `issue-delivery` skill. Issues of one wave run in parallel; issues the sprint plan marks sequential wait until the wave's parallel issues have merged.

For an issue with `autonomous: false`, the owner posts its plan and stops. **Gate: show that plan to the person and wait for approval before the owner writes code.** Relay the answer; do not answer for them.

If an owner reports it cannot finish (the spec contradicts itself, a dependency is missing, the change needs a file outside its lane), do not reassign it and do not fix it yourself. Mark the issue blocked, let the rest of the wave continue, and bring the blocker to the person at the barrier. A change in another lane (a lockfile refresh, a shared type, a CI workflow) becomes, with the person's approval, an issue for the lane that owns the file, added to `docs/ISSUES.md` with the blocked issue depending on it, then `spec.mjs waves --write`; never a commit across lanes.

#### Amendments mid-wave

When the person approves a change to a running issue (a missing file in `files_touched`, a new read, a split criterion):

1. Commit the amendment on the base branch, outside every issue branch. Change `files_touched`, `depends_on` or `reads` only with `spec.mjs amend <id> --add-file <p> ...`; it recomputes the waves, syncs `docs/SPRINT_PROMPTS.md` and refuses an amendment that adds errors. A criterion edited by hand is followed by `spec.mjs prompts --write` and `check`. If the new waves move a running issue to a later wave (its `files_touched` now overlaps another running issue's), stop and bring it to the person.
2. The executor prompt follows the issue through `amend` or `prompts --write`; only drift they cannot fix goes to `execution-router` for that issue. Never patch the prompt and the issue separately.
3. Tell the owner to `git merge <base>` into `wt/<id>`; never rebase. A running worktree syncs only this way: the pre-merge-commit hook refuses any other merge into an issue branch, and a merge from the base is the only commit on `wt/<id>` that is not a task commit. Then send it the regenerated prompt, and the reviewer too if the review has started.

An amendment that arrives after the owner's done SUMMARY reopens the issue: the owner merges the base, meets the new criteria and posts a new SUMMARY.

### 4. Review each finished issue

When an owner posts its done SUMMARY, dispatch `qa-tester` on that worktree, telling it to follow the `issue-review` skill. Pass it the owner's SUMMARY verbatim, the worktree's port offset and, when the project has no tracker, the file its verdict goes to: `../<repo>-wt/reviews/<id>.md`, outside every worktree. The retro reads the verdicts from there. It checks every acceptance criterion with evidence, reruns the test gate and runs:

```bash
node tools/spec-guard/spec.mjs verify S3-07 --base develop
```

- **Approved**: the issue is ready for the barrier.
- **Changes requested**: send the verdict back to the same owner in the same worktree, then review again. After three rounds on one issue, stop and bring it to the person.

`qa-tester` never edits code, and neither does the orchestrator.

### 5. Merge at the wave barrier

When every issue of the wave is approved or blocked:

1. Merge the approved issues into the base branch **in id order**, one at a time, keeping their atomic commits (`git merge --no-ff wt/S3-05`, then `wt/S3-07`, ...). Squash only issues with `commit_strategy: squash`.
   An issue marked `merge_with: <refresh id>` (a manifest change paired with its lockfile refresh) is held: approved, worktree kept, not merged. Create the refresh's worktree off `wt/<manifest id>` (`git worktree add -b wt/<refresh id> ../<repo>-wt/<refresh id> wt/<manifest id>`), never by merging it in, which the hook refuses, and verify the refresh with `spec.mjs verify <refresh id> --base wt/<manifest id>`. At the refresh's barrier, merge the manifest issue, then the refresh. The base never holds a manifest its lockfile does not match.
2. **A merge conflict stops the sprint.** Two issues of one wave touched the same file, so a `files_touched` list was wrong. Abort the merge (`git merge --abort`), report which issues and files collided, and wait for the person. The fix is in `docs/ISSUES.md` (the correct `files_touched`, then `spec.mjs waves --write`), not in a hand-resolved conflict.
3. After the merges, run the full test gate on the base branch. Red stops the sprint.
4. Before removing a worktree, stop every process whose cwd is inside it (`lsof +D ../<repo>-wt/S3-07 -t`, or each emulator PID's `/proc/<pid>/cwd`); those are the wave's leftovers. Then remove the merged worktrees (`git worktree remove ../<repo>-wt/S3-07`) and delete their branches. Blocked and held issues keep theirs.
5. An issue that added a command reports it in its SUMMARY. If `AGENTS.md` does not list it yet, or lists it marked `from <id>`, update the line on the base branch (`docs: ...`); `AGENTS.md` is outside every lane.
6. Run `spec.mjs status` to confirm the merged issues count as merged and to read the next wave.

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
- Never skip a spec-guard hook. A block the issue cannot avoid is an amendment (`spec.mjs amend`), approved by the person.
- Never skip a gate because the previous waves went well.
- Never leave an emulator or server running after a gate, and never stop one you did not start.

## Communication style

Spanish with the user, short reports at each gate: a table of issues with their state, then what needs a decision. English in commits, verdicts and the retro.
