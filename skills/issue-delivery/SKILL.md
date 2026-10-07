---
name: issue-delivery
description: "Implements one backlog issue from docs/ISSUES.md end to end as its owning developer agent: reads the issue and its reads, works in the issue's branch or worktree, writes only inside files_touched, commits one task at a time with the issue id and the decisions it serves, keeps the test gate green, runs spec.mjs verify, and posts the SUMMARY handoff for qa-tester. Use when a developer agent (flutter-dev, firebase-dev, react-dev, python-dev or a custom one) is told to implement, build or execute an issue such as S3-07, or when a user says 'implementa S3-07', 'ejecuta el issue S2-04', 'arranca con S4-01 en su worktree'. It covers a single issue. Reviewing the result belongs to issue-review, running a whole sprint or wave belongs to the sprint-runner workflow, and checking the backlog structure belongs to spec-guard."
license: MIT
compatibility: Needs git and Node.js 20 or later for the spec-guard commands, plus whatever toolchain the project's test gate uses (Flutter and melos, pnpm, Python and pytest).
metadata:
  version: "1.1.0"
  author: aiudalabs
  requires: spec-guard
---

# Issue Delivery

Turn one issue into commits that meet every acceptance criterion, stay inside the issue's files, trace back to the decisions they implement, and arrive at review with the evidence already laid out.

The issue is the contract. It was written and approved before you started; your job is to fulfil it exactly, and to stop and ask when it cannot be fulfilled as written.

## Inputs

- The issue id, such as `S3-07`, and its block in `docs/ISSUES.md`. The format is the one the `spec-guard` skill defines: frontmatter with `owner`, `files_touched`, `depends_on`, `decision_refs`, `requirement_refs`, `commit_strategy`, `autonomous`, `reads`, then `**Objetivo:**` and `### Acceptance criteria`.
- `docs/AGENT_ROSTER.md`, for your lane (`**Owns:**`) and what you refuse.
- The root `AGENTS.md`, the repository constitution: hard rules and the validation commands (the stack profile's test gate).
- The installed spec-guard tools at `tools/spec-guard/`. If they are missing, say so and ask whether to install them with the `spec-guard` skill before going on.

Talk to the user in Spanish. Code, comments, commit messages and the SUMMARY are in English.

## Step 1: Read the issue and what it points to

1. Open the issue block and read it whole. Note the owner, `files_touched`, `depends_on`, the refs, `autonomous` and every acceptance criterion.
2. Confirm the owner is you. If it names another agent, stop: the issue is not yours.
3. Read every document in `reads`, in order, at the anchors given. Then read the decisions in `decision_refs` (`docs/OPINIONATED_DEFAULTS.md`) and the requirements in `requirement_refs` (`docs/PRD.md`). Do not read the rest of the spec to explore; your context is for the implementation.
4. Check that every issue in `depends_on` is merged: a commit on the base branch starts with its id (`git log --oneline <base> | grep '^[0-9a-f]* S1-04'`). If one is not merged, stop and tell the orchestrator.

## Step 2: Confirm where you are working

- The branch or worktree name must carry the issue id: `wt/S3-07`, `S3-07-create-booking`. Check with `git branch --show-current`. If you are on the base branch or on another issue's branch, stop and ask; never implement on `develop` or `main`.
- The working tree must be clean before the first change (`git status --short`). Unknown changes belong to someone; ask before touching them.
- If the spec-guard git hooks are installed, they read the active issue from the branch name and block staged files outside `files_touched`. Treat a block as information, never something to bypass with `--no-verify`.

## Step 3: Plan the tasks

Split the work into tasks, each one small enough to be one commit that passes the gate on its own. Map every acceptance criterion to the task that meets it and the test that proves it.

- `autonomous: true`: the approved issue is the plan. Post the task list in a few lines and start.
- `autonomous: false` (migrations, money, deletes, anything a person must approve mid-way): post the plan and wait for an explicit yes. Silence is not approval. Ask again before the step the issue marks for approval.
- Any ambiguity or contradiction in the spec stops the plan, whatever `autonomous` says (see "Spec gaps" below).

## Step 4: Write only inside files_touched

Every file you create or modify must match a path or glob in the issue's `files_touched`, and those already sit inside your lane.

When the work needs a file outside that list (a type in another package, an extra test helper, a rule file, a lockfile, a CI workflow, a barrel `index.ts`), stop. Tell the orchestrator which file, why, and whose lane it is in, and ask for the issue to be amended or for a new issue. Never widen the scope silently, never "just fix it" in another lane, and never move code into your lane to avoid asking.

A new dependency is declared in your own package manifest only. If installing it rewrites a lockfile your lane does not own, do not commit that lockfile: list the refresh under "Cross-lane follow-ups" in the SUMMARY so the lockfile's owner gets an issue. Never edit `tools/spec-guard/**` or `.githooks/**`; the `spec-guard` installer writes them. `.github/workflows/spec-guard.yml` is edited only by its owner in the roster, and an issue that customizes it removes the spec-guard marker line so a reinstall leaves it alone.

Implement with the conventions of your stack: [references/stack-conventions.md](references/stack-conventions.md) has the patterns, test expectations and gate commands for each default developer agent.

## Step 5: Commit one task at a time

Each finished task is its own commit, with this subject:

```
S3-07 task-1: validate booking input [refs: D-03, FR-BOOKING-2]
```

- The issue id first, then `task-<k>`, then an imperative summary in English.
- `[refs: ...]` lists the `decision_refs` and `requirement_refs` that this task serves. Setup work with no refs omits the brackets. This line is what `spec.mjs impact` and `spec.mjs why` follow from code back to decisions, so do not drop it.
- Run the gate before each commit. Never commit red. A failing test is fixed in the code or in the test when the test is wrong, never skipped, deleted or marked flaky to get past the gate.
- Do not squash or amend published commits. `commit_strategy: squash` tells the orchestrator how to merge, not you how to commit.
- Do not push to the base branch, merge, tag or deploy. The orchestrator merges at the wave barrier; deploys go through CI.

## Step 6: Run the gate and the lane check

Before declaring done, run, from the project root:

1. Every validation command listed in the root `AGENTS.md` (the profile's test gate), plus the agent-specific checks in [references/stack-conventions.md](references/stack-conventions.md). All must pass, and each must have run something: its output shows the script ran and, for tests, a count of tests. pnpm exits 0 on "No projects matched the filters" and "None of the selected packages has a ... script"; that is a broken command, not a pass. Use `pnpm --dir <package folder> run <script>`, which fails on a missing script, and report a broken `AGENTS.md` command to the orchestrator instead of counting it.
2. `node tools/spec-guard/spec.mjs verify S3-07` (add `--base <branch>` when the base is not the default). It fails when the diff leaves `files_touched` or the lane. Fix the cause; do not edit the issue to make it pass.
3. `git diff --check <base>...HEAD` for whitespace errors.
4. Walk the acceptance criteria once more. For each, find the line that meets it and the test that proves it, and run that test by name.

If a criterion cannot be met within the issue, do not mark the issue done. Report it as a deviation and ask.

## Step 7: Post the SUMMARY handoff

Post this block in the issue thread or in chat, and stop. qa-tester takes it from here.

```markdown
## SUMMARY — S3-07 Implement `createBooking` callable

**Branch:** S3-07-create-booking (base: develop)
**Files changed:**
- functions/src/callable/createBooking.ts (new)
- functions/test/createBooking.test.ts (new)

**Commits:**
- a1b2c3d S3-07 task-1: validate booking input [refs: D-03, FR-BOOKING-2]
- d4e5f6a S3-07 task-2: confirm booking in one transaction [refs: D-03, D-07]

**Acceptance criteria:**
1. Rejects unauthenticated calls — functions/src/callable/createBooking.ts:18; test `createBooking rejects unauthenticated`
2. Moves requested to confirmed in one transaction — createBooking.ts:41-67; test `createBooking confirms atomically`

**Gate:** `pnpm --dir functions run lint` pass, `... run typecheck` pass, `... run test` pass (24 tests), emulator integration pass
**Lane check:** `spec.mjs verify S3-07` pass
**Deviations from spec:** none
**Cross-lane follow-ups:** new dependency `zod` in functions/package.json; pnpm-lock.yaml (firebase-dev) needs a refresh
**Open questions for qa-tester:** none
```

Every acceptance criterion gets a `file:line` and a test name. A criterion with no test is reported as such, not hidden. Stack-specific extras (bundle size delta for the admin app, migrations included, enum changes to mirror) go under the agent's notes in [references/stack-conventions.md](references/stack-conventions.md).

When qa-tester requests changes, apply them in the same branch as new task commits (`S3-07 task-4: ...`), rerun Step 6, and post a short SUMMARY update listing only what changed.

## Spec gaps

When the spec is incomplete, ambiguous, or two documents disagree (the screen spec expects a field the schema does not have; the architecture assigns a transition the state machine does not list; a needed type does not exist):

1. Stop coding.
2. State the gap with both sources: "UI_SCREENS.md §1.2.3 shows `priceWithTax`; FIREBASE_SCHEMA.md §bookings has no such field."
3. Wait for a person to decide. The fix usually comes from rerunning the skill that owns that document, not from you.
4. Never pick a side silently, never invent a screen, type or transition, and never edit a spec document.

Spec gaps are governance bugs, not implementation problems.

## Anti-patterns

- Implementing before reading the `reads`, or reading the whole repository instead of them.
- Touching a file outside `files_touched` "because it was a one-line fix".
- One commit for the whole issue, or commits without the issue id and refs.
- Committing with a red or skipped test, or calling the gate green without running it.
- Counting a command that matched no package or found no script as green.
- Declaring done without `spec.mjs verify`.
- A SUMMARY that says "all criteria met" without a `file:line` and test for each.
- Merging your own branch.
