---
name: issue-review
description: "Reviews one implemented backlog issue as the gate before merge: checks the diff against every acceptance criterion in docs/ISSUES.md with file:line evidence and a test that actually ran, reruns the project's test gate, runs spec.mjs verify for lane discipline, checks the hard rules of the root AGENTS.md, and writes an approved or changes-requested verdict without editing code. Also closes a sprint with goal-backward verification and a retro in docs/execution/. Use when qa-tester is asked to review or approve an issue, after a developer posts its SUMMARY, or when a user says 'revisa S3-07', 'qa de este PR', 'valida contra los criterios de aceptación', 'cerrar sprint 3'. It never implements fixes: issue-delivery does that. It does not review academic papers (paper-review) or brand work (brand-review), and running a whole sprint is the sprint-runner workflow."
license: MIT
compatibility: Needs git and Node.js 20 or later for the spec-guard commands, plus the toolchain of the project's test gate.
metadata:
  version: "1.2.3"
  author: aiudalabs
  requires: spec-guard
---

# Issue Review

Decide whether one issue is ready to merge, with evidence for every claim. The question is not "do the tests pass" but "is the spec met": most bugs ship in the gap between the two.

A review never edits code. Every finding goes back to the implementing agent, who fixes it in its own lane.

## Inputs

- The issue id, such as `S3-07`, and its block in `docs/ISSUES.md` (format defined by the `spec-guard` skill).
- The implementing agent's SUMMARY block: in the issue or PR thread, in the body of the last task commit, in `git notes show HEAD`, or as handed over by the orchestrator.
- The branch or PR, and its base (usually `develop`).
- The root `AGENTS.md`: hard rules and the test gate.
- `docs/AGENT_ROSTER.md`: the owner's lane.
- The spec sections the issue cites in `reads`, `decision_refs` and `requirement_refs`.

Talk to the user in Spanish. Verdicts are in English, because they live on issues and PRs.

## Step 1: Read the issue

Extract the owner, `files_touched`, `decision_refs`, `requirement_refs` and the numbered acceptance criteria. These are fixed: you do not renegotiate them, and you do not accept "met in spirit".

## Step 2: Read the diff

```bash
git diff --stat <base>...HEAD
git diff <base>...HEAD
git log --oneline <base>..HEAD
```

Note which files changed and whether the change matches the issue's intent, not something adjacent to it. Every commit subject must start with the issue id: it is the trace key `spec.mjs` follows (format: `S3-07 task-1: validate input [refs: D-03, FR-BOOKING-2]`). `[refs: ...]` is optional and may list only the issue's `decision_refs` and `requirement_refs`; an id outside them or a placeholder such as `[refs: setup]` is a finding. The commit-msg hook enforces both.

A merge from the base is exempt from the id rule: its second parent is on the base (`git merge-base --is-ancestor <commit>^2 <base>`) and it brings only what the base already has. The pre-merge-commit hook refuses any other merge into an issue branch, and `verify` warns on one: such a merge is a blocker. A lockfile-refresh issue paired through `merge_with` does not merge its manifest issue; its branch starts from `wt/<manifest id>`, which is its base in Step 4.

## Step 3: Read the cited spec

Open each section the issue cites and read it whole. If the issue implements "ARCHITECTURE.md §3 createBooking", read the full block: failure modes and idempotency are where reviews find things. For a UI issue, the screen's `docs/UI_SCREENS.md#s-<screen-id>` section is the spec; a mockup anchor (`mockups/<app-id>.html#s-<screen-id>`) is cited only for key screens, and when it is, the screen must match it.

## Step 4: Run the lane check

`verify` judges only what the branch committed since it left the base. Files your own install or bootstrap wrote (`pnpm-lock.yaml`, `pubspec_overrides.yaml`) are not the branch's change: it lists them as `warning (uncommitted)` without failing. Restore or remove them once the gate is done (`git checkout -- <file>`, never `mv` someone's file aside). Run:

```bash
node tools/spec-guard/spec.mjs verify S3-07 --base <base>
```

`--base` takes any branch (`wt/<manifest id>` for a paired lockfile refresh). A failure is a blocker: a file outside `files_touched` or outside the owner's lane is a violation even when the change looks right. That includes a lockfile, a CI workflow or a generated barrel owned by another lane, any change to `tools/spec-guard/**` or `.githooks/**`, which only the `spec-guard` installer writes, and a change to `.github/workflows/spec-guard.yml` outside its owner's lane (the roster names it). So is a warning on a merge or on a `[refs: ...]` the issue does not cite. The fix is an amended issue (`spec.mjs amend`) or a new issue for the right owner, never a quiet approval. If `tools/spec-guard/` is missing, say so; compare the diff with `files_touched` by hand and mark the verdict "lane check: manual".

## Step 5: Evidence for every acceptance criterion

For each numbered criterion, find two things:

1. **Where it is met**: `file:line` in the diff.
2. **A test that proves it, and that ran**: the test's name, and its passing output from your own run in Step 6. A test that exists but was not run, or a test that does not exercise the criterion, is not evidence.

A test counts only if it fails when the behavior is removed. For each cited test, break the criterion on a scratch copy (`git archive HEAD | tar -x -C <tmp>`), run the test there, and confirm it goes red. A test that asserts a hard-coded constant, or compares a value with itself, is not evidence. For a security check (a signature, a confirmation, a state transition, a role check), mutate every comparison in the block, not a sample. Log each mutation and its result.

A criterion with no natural test takes other evidence of its kind:

- **Config, ignore or env criterion:** a command you ran whose output line shows the setting in effect, plus a negative check that fails without it.
- **Research or docs criterion:** the document's location, plus a spot check of N cited sources; report an unreachable source as "unchecked", never as checked.
- **A guard whose real input is still empty** (a lint rule, a CI path filter): a mutation you ran that feeds it a bad input, logged.

Then mark it with one of:

- **met**: both pieces of evidence.
- **partially met** or **not met**.
- **pending human action**: a `human:` criterion of a non-autonomous issue, approved at the plan gate, whose SUMMARY names who acts and what they attach. It does not block approval; the issue stays open until the attachment exists. A `human:` criterion in an autonomous issue is a finding for the orchestrator.
- **deferred by amendment `<commit>`**: an approved amendment moved the criterion elsewhere. Confirm the commit is on the base (`git merge-base --is-ancestor <commit> <base>`) and name the issue that now owns it. Without that commit, it is not met.

A criterion without its evidence is not met. The SUMMARY's mapping is a starting point; verify every line of it yourself.

When the issue creates an extension point a later issue depends on (a router hook, a route group, a provider override, a registry), read that issue's criteria and check that the hook can meet them without editing this issue's files. A hook that cannot is a finding.

Ask, for each criterion: what user action was this supposed to enable, did the code do that, and what could go wrong in production that the tests do not cover?

## Step 6: Run the gate yourself

Run the issue's `gate:` list, when it has one, and every validation command in the root `AGENTS.md`, plus:

```bash
git diff --check <base>...HEAD     # whitespace errors
```

and, depending on what changed:

- an exported shared type added or changed (not an empty skeleton): compile both sides (for example `pnpm tsc --noEmit` and `melos run analyze`);
- security rules changed: the rules tests on the emulator;
- a migration is included: upgrade, downgrade, upgrade;
- a CI workflow changed: `actionlint` on each changed workflow file; cite the first CI run as evidence once it exists;
- a shell script changed: `bash -n` and `shellcheck`;
- CI, a lockfile or workspace config changed (`pnpm-workspace.yaml`, the melos config, a root manifest): rerun the gate on a clean export (`git archive HEAD | tar -x -C <tmp>`, then install there with the frozen lockfile) and confirm the lockfiles are unchanged afterwards.

Skip a command that `AGENTS.md` marks `from <issue id>` while that issue is not merged, and list it in the verdict as skipped, with the reason.

When the lockfile refresh belongs to another, unmerged issue, the frozen install fails for reasons outside this branch. Install with `--no-frozen-lockfile`, run the gate, then `git checkout -- pnpm-lock.yaml` and confirm `git status --short` is empty. Say in the verdict that CI stays red until the refresh issue merges.

If the gate started emulators, confirm afterwards that none started from your checkout is still running, and stop only those. Never stop another agent's process; report a port held by one to the orchestrator.

Never trust "all pass" from the SUMMARY. A red test, a lint warning or a format error makes the verdict changes-requested. There are no flakes at the gate; a flaky test is a finding.

A command is green only when it ran: its output shows the script and, for tests, a count of tests run. A linter that prints nothing on success is rerun with a reporter or flag that prints the files checked; one that exits 0 on warnings is rerun with its deny-warnings flag. "No test files found" (or "No tests found") with exit 0 is a run of 0 tests, not a pass: report it as `ran, 0 tests` (the scaffold's suite wrapper prints `NOT RUN (0 test files)` for the same case). It is acceptable only when the issue adds no code that suite could test; otherwise it is a blocker. pnpm exits 0 on "No projects matched the filters" and "None of the selected packages has a ... script"; that ran nothing. Rerun it as `pnpm --dir <package folder> run <script>`, which fails on a missing script; if the script truly does not exist, the gate is broken: report it as a blocker when the issue should have created the script, and as a finding for the orchestrator otherwise.

## Step 7: Check the hard rules

Walk through every hard rule in the root `AGENTS.md` and check the diff against each. Common ones and how to check them:

- No client-side state transitions: grep the client code for writes to `status` or other server-only fields.
- Security rules intact or stronger: read the rules diff line by line.
- No hardcoded environment values: grep for project ids, URLs and keys.
- No commit with red tests: Step 6 settles it.
- No check-then-act race: a value read, checked and then written in two steps outside one transaction (a balance, a slot, a refund state, a counter). Tests and mutations rarely find these; read every write that depends on an earlier read.
- Architecture enforced by tests stays put: a change to an allowed-dependency set, a lane allowlist or a boundary test (melos `deps-check`, a vendor-SDK boundary test) is an architecture change. It needs an amendment of `docs/ARCHITECTURE.md` section 3, never a quiet edit of the test.

## Step 8: Write the verdict

Use the formats in [references/verdicts.md](references/verdicts.md). The rules:

- Every blocker cites `file:line` and the criterion, rule or spec section it breaks, and suggests where the fix belongs.
- Blockers and suggestions are separate. Suggestions never block.
- Approval lists the evidence for every criterion. An approval with no findings at all deserves a second look before posting.
- No softening: a broken hard rule is stated as broken.

Post the verdict in the issue or PR thread. Without a tracker or PR, write it to the log path the orchestrator gave you (`sprint-runner` uses `../<repo>-wt/reviews/<id>.md`, outside every worktree; one file per issue and round), and, when you run as a subagent, return it as your final report too; never leave it only in a chat the orchestrator cannot read. Do not commit, push or merge. On re-review, check only what changed since the last verdict plus the gate and the lane check, which always run again.

## Spec gaps

When the spec contradicts itself (the screen spec expects a field the schema lacks), note it in the verdict without failing the implementing agent for it, as in the template in [references/verdicts.md](references/verdicts.md). Say which interpretation the implementation chose and whether it is reasonable, and ask the user which document to fix before the gap spreads. The fix comes from rerunning the skill that owns the document.

## Sprint close

When the user says "cerrar sprint N", "cierra el sprint N" or "sprint N está completo":

1. **Goal.** Read the sprint's `#` heading in `docs/ISSUES.md` and its prompt in `docs/SPRINT_PROMPTS.md` if it exists. Write down the theme and the two or three outcomes that define done.
2. **Issues.** List every `S{N}-*` issue. For each: merged (a commit on the base branch starts with its id, or `node tools/spec-guard/spec.mjs status`) and approved (an approved verdict in its thread).
3. **Goal-backward verification.** Ask whether a real user can now do what the sprint was meant to enable, end to end. Completed tasks are not the same as a working result; walk the user action through the merged code.
4. **Cross-sprint gate.** Run the full test gate from the root `AGENTS.md` on the base branch, and `node tools/spec-guard/spec.mjs check`.
5. **Debt.** Read the sprint's diffs for shortcuts taken under pressure that the next sprint must clean up.
6. **Retro.** Write `docs/execution/sprint-{N}-retro.md` with the template in [references/verdicts.md](references/verdicts.md). This retro, and a verdict written to the orchestrator's log path, are the only files a review writes.
7. Show the retro and ask: "Sprint N cerrado. ¿Avanzamos a Sprint N+1?"

## What a review refuses

- Writing or changing code, even one line.
- Approving with a red test, a lint warning or a failed lane check.
- Counting a command that ran nothing (no package matched, no such script, 0 tests found) as a pass.
- Approving a criterion without `file:line` and a test that ran and goes red when the behavior is removed.
- Running `spec.mjs verify` on a tree your own install left dirty.
- Skipping the gate because the change is small.
- Approving because the agent says it works, or because the sprint is late.
- Approving an out-of-lane change because it looks fine.
- Vague findings ("this is wrong") with no location and no rule.
- Renegotiating acceptance criteria, re-prioritizing the sprint, or editing spec documents.
- Auditing new attack surface in depth: flag it for a security review instead.
