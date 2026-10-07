---
name: issue-delivery
description: "Implements one backlog issue from docs/ISSUES.md end to end as its owning developer agent: reads the issue and its reads, works in the issue's branch or worktree, writes only inside files_touched, commits one task at a time with the issue id and the decisions it serves, keeps the test gate green, runs spec.mjs verify, and posts the SUMMARY handoff for qa-tester. Use when a developer agent (flutter-dev, firebase-dev, react-dev, python-dev or a custom one) is told to implement, build or execute an issue such as S3-07, or when a user says 'implementa S3-07', 'ejecuta el issue S2-04', 'arranca con S4-01 en su worktree'. It covers a single issue. Reviewing the result belongs to issue-review, running a whole sprint or wave belongs to the sprint-runner workflow, and checking the backlog structure belongs to spec-guard."
license: MIT
compatibility: Needs git and Node.js 20 or later for the spec-guard commands, plus whatever toolchain the project's test gate uses (Flutter and melos, pnpm, Python and pytest).
metadata:
  version: "1.2.1"
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
3. Read every document in `reads`, in order, at the anchors given. Then read the decisions in `decision_refs` (`docs/OPINIONATED_DEFAULTS.md`) and the requirements in `requirement_refs` (`docs/PRD.md`). Do not read the rest of the spec to explore; your context is for the implementation. If a criterion cites or depends on a section that is not in `reads` (a `§N`, a `DOC.md#anchor`), read that section too and report the missing read under "Deviations from spec".
4. Check that every issue in `depends_on` is merged: a commit on the base branch starts with its id (`git log --oneline <base> | grep '^[0-9a-f]* S1-04'`). If one is not merged, stop and tell the orchestrator.

## Step 2: Confirm where you are working

- The branch or worktree name must carry the issue id: `wt/S3-07`, `S3-07-create-booking`. Check with `git branch --show-current`. If you are on the base branch or on another issue's branch, stop and ask; never implement on `develop` or `main`.
- The working tree must be clean before the first change (`git status --short`). Unknown changes belong to someone; ask before touching them.
- If the spec-guard git hooks are installed, they read the active issue from the branch name and block staged files outside `files_touched`. Treat a block as information: stop and ask the orchestrator to amend the issue (`spec.mjs amend`). Never skip a hook; CI runs the same checks.

## Step 3: Plan the tasks

Split the work into tasks, each one small enough to be one commit that passes the gate on its own. Map every acceptance criterion to the task that meets it and the test that proves it.

- `autonomous: true`: the approved issue is the plan. Post the task list in a few lines and start.
- `autonomous: false` (migrations, money, deletes, anything a person must approve mid-way): post the plan and wait for an explicit yes. Silence is not approval. Ask again before the step the issue marks for approval. If you run as a one-shot subagent and cannot wait, return the plan and the questions as your final report and stop; the orchestrator relays the answer in a new run.
- A criterion that starts with `human:` is one a person completes (a console setting, a vendor account, a device run). Name in the plan who acts and what they attach as proof (a screenshot, a log, a URL), and get it approved with the plan.
- Copy every answer given at the plan gate (a deviation, a deferred criterion, a changed approach) into the SUMMARY under `Deviations approved at the plan gate`, with who approved it. The orchestrator then amends the criteria; you never edit the issue.
- Tasks may be added after approval only when they stay inside the approved `files_touched` and criteria. Report each one in the SUMMARY. Anything wider goes back to the orchestrator.
- Any ambiguity or contradiction in the spec stops the plan, whatever `autonomous` says (see "Spec gaps" below).

## Step 4: Write only inside files_touched

Every file you create or modify must match a path or glob in the issue's `files_touched`, and those already sit inside your lane.

When the work needs a file outside that list (a type in another package, an extra test helper, a rule file, a lockfile, a CI workflow, a barrel `index.ts`), stop. Tell the orchestrator which file, why, and whose lane it is in, and ask for the issue to be amended or for a new issue. Never widen the scope silently, never "just fix it" in another lane, and never move code into your lane to avoid asking.

A new dependency is declared in your own package manifest only. If installing it rewrites a lockfile your lane does not own, do not commit that lockfile: list the refresh under "Cross-lane follow-ups" in the SUMMARY so the lockfile's owner gets an issue. To run the gate meanwhile: install with `--no-frozen-lockfile` (pnpm's frozen install also rewrites the importer list when a workspace package appears), run the gate, then `git checkout -- pnpm-lock.yaml` and confirm `git status --short` is empty before `spec.mjs verify`. Say in the SUMMARY that CI stays red until the refresh issue merges. Never edit `tools/spec-guard/**` or `.githooks/**`; the `spec-guard` installer writes them. `.github/workflows/spec-guard.yml` is edited only by its owner in the roster, and an issue that customizes it removes the spec-guard marker line so a reinstall leaves it alone.

Implement with the conventions of your stack: [references/stack-conventions.md](references/stack-conventions.md) has the patterns, test expectations and gate commands for each default developer agent.

## Step 5: Commit one task at a time

Each finished task is its own commit, with this subject:

```
S3-07 task-1: validate booking input [refs: D-03, FR-BOOKING-2]
```

- The issue id first, then `task-<k>`, then an imperative summary in English.
- The issue id is the trace key: `spec.mjs impact` and `spec.mjs why` follow it to the issue's frontmatter. `[refs: ...]` is optional and lists only the issue's own `decision_refs` and `requirement_refs` that this task serves; the commit-msg hook refuses any other id. With no refs, omit the brackets; never write a placeholder such as `[refs: setup]`.
- Run the gate before each commit. Never commit red. A failing test is fixed in the code or in the test when the test is wrong, never skipped, deleted or marked flaky to get past the gate.
- Do not squash or amend published commits. `commit_strategy: squash` tells the orchestrator how to merge, not you how to commit.
- Do not push to the base branch, merge, tag or deploy. The orchestrator merges at the wave barrier; deploys go through CI.
- One exception: when the orchestrator tells you an amendment landed on the base, run `git merge <base>` into your branch (never rebase). A merge from the base is the only allowed commit without a task subject, and the only merge the pre-merge-commit hook allows; it brings the amended issue, and you reread the issue block before going on.

## Step 6: Run the gate and the lane check

Before declaring done, run, from the project root:

1. The issue's `gate:` list first, when it has one, then every validation command listed in the root `AGENTS.md` (the profile's test gate), plus the agent-specific checks in [references/stack-conventions.md](references/stack-conventions.md), which also names the gates for scripts, workflows, docs and static sites. All must pass, and each must have run something: its output shows the script ran and, for tests, a count of tests. pnpm exits 0 on "No projects matched the filters" and "None of the selected packages has a ... script"; that is a broken command, not a pass. Use `pnpm --dir <package folder> run <script>`, which fails on a missing script, and report a broken `AGENTS.md` command to the orchestrator instead of counting it.
   "No test files found" (or "No tests found") with exit 0, as Vitest's `--passWithNoTests` and similar flags allow, is a run of 0 tests, not a pass. Report it as `ran, 0 tests`. It is acceptable only when the issue adds no code that suite could test; otherwise write the tests.
   If the gate started emulators, confirm none started from this worktree is still running (`ps -o pid,args` plus the process cwd); stop only your own, never another agent's process. Use the emulator port offset or config the orchestrator assigned, if any.
2. Commit or discard everything first: `git status --short` must be empty. `verify` judges only what the branch committed and lists anything left uncommitted as `warning (uncommitted)`; `--worktree` counts it too. Generated files are never committed (`pubspec_overrides.yaml`, `.dart_tool/`, `build/`, `dist/`); if one is untracked and not ignored, report the missing ignore line instead of committing it. Then run `node tools/spec-guard/spec.mjs verify S3-07` (add `--base <branch>` when the base is not the default). It fails when the diff leaves `files_touched` or the lane. Fix the cause; do not edit the issue to make it pass.
3. `git diff --check <base>...HEAD` for whitespace errors.
4. Walk the acceptance criteria once more. For each, find the line that meets it and the evidence that proves it, and run that test by name. A test counts only if it fails without the behavior: break the code for each criterion once (comment out the check, flip the comparison), show the test goes red, then revert with `git checkout -- <file>`. A test that compares a constant with itself proves nothing. A criterion with no natural test takes other evidence:
   - config, ignore or env criterion: a command whose output line shows the setting in effect, plus a negative check that fails without it;
   - research or docs criterion: the document's location, plus the sources it cites that you checked, with unreachable ones listed as unchecked;
   - a guard whose real input is still empty (a lint rule, a CI filter): a mutation run that feeds it a bad input, with its output in the SUMMARY;
   - a `human:` criterion: the person who acts and the proof they will attach.

If a criterion cannot be met within the issue, do not mark the issue done. Report it as a deviation and ask.

## Step 7: Post the SUMMARY handoff

Post this block in the issue thread, and stop. qa-tester takes it from here. Without a tracker or PR, put it in the repository as well, so it travels with the branch: as the body of the last task commit, or with `git notes add -F <file> HEAD` (the file outside the repository). When you run as a subagent, return it as your final report too.

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
**Lane check:** `spec.mjs verify S3-07` pass (clean tree, no warnings)
**Deviations from spec:** none
**Deviations approved at the plan gate:** none
**Tasks added after approval:** none
**Pending human action:** none
**Cross-lane follow-ups:** new dependency `zod` in functions/package.json; pnpm-lock.yaml (firebase-dev) needs a refresh
**Open questions for qa-tester:** none
```

Every acceptance criterion gets a `file:line` and a test name, or the other evidence Step 6.4 allows for its kind. A criterion with no evidence is reported as such, not hidden. A test suite that ran 0 tests is reported as `ran, 0 tests`, never `pass`.

A `human:` criterion goes under `Pending human action` with who acts and what they attach; a criterion deferred by an approved amendment is listed as `deferred by amendment <commit>` with the issue that now owns it. The issue stays open until the human attachments exist; say so in the last line of the SUMMARY. Stack-specific extras (bundle size delta for the admin app, migrations included, enum changes to mirror) go under the agent's notes in [references/stack-conventions.md](references/stack-conventions.md).

When qa-tester requests changes, apply them in the same branch as new task commits (`S3-07 task-4: ...`), rerun Step 6, and post a short SUMMARY update listing only what changed.

## Spec gaps

When the spec is incomplete, ambiguous, or two documents disagree (the screen spec expects a field the schema does not have; the architecture assigns a transition the state machine does not list; a needed type does not exist):

1. Stop coding.
2. State the gap with both sources: "UI_SCREENS.md §1.2.3 shows `priceWithTax`; FIREBASE_SCHEMA.md §bookings has no such field."
3. Wait for a person to decide. The fix usually comes from rerunning the skill that owns that document, not from you.
4. Never pick a side silently, never invent a screen, type or transition, and never edit a spec document.
5. When only part of the issue is blocked, commit the tasks the gap does not touch (each passes the gate on its own), keep the blocked work as a patch outside the repository (`git diff > <path>.patch`), name its path in the SUMMARY under "Deviations from spec", and mark the issue not done. The orchestrator hands the patch over when the gap is closed.

Spec gaps are governance bugs, not implementation problems.

## Anti-patterns

- Implementing before reading the `reads`, or reading the whole repository instead of them.
- Touching a file outside `files_touched` "because it was a one-line fix".
- One commit for the whole issue, or commits without the issue id and refs.
- Committing with a red or skipped test, or calling the gate green without running it.
- Counting a command that matched no package or found no script as green, or a run of 0 tests as a pass.
- A test that still passes when the behavior it cites is removed.
- Running `spec.mjs verify` on a dirty tree, or committing generated files.
- Declaring done without `spec.mjs verify`.
- A SUMMARY that says "all criteria met" without a `file:line` and test for each.
- Merging your own branch.
