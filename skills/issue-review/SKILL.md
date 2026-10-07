---
name: issue-review
description: "Reviews one implemented backlog issue as the gate before merge: checks the diff against every acceptance criterion in docs/ISSUES.md with file:line evidence and a test that actually ran, reruns the project's test gate, runs spec.mjs verify for lane discipline, checks the hard rules of the root AGENTS.md, and writes an approved or changes-requested verdict without editing code. Also closes a sprint with goal-backward verification and a retro in docs/execution/. Use when qa-tester is asked to review or approve an issue, after a developer posts its SUMMARY, or when a user says 'revisa S3-07', 'qa de este PR', 'valida contra los criterios de aceptación', 'cerrar sprint 3'. It never implements fixes: issue-delivery does that. It does not review academic papers (paper-review) or brand work (brand-review), and running a whole sprint is the sprint-runner workflow."
license: MIT
compatibility: Needs git and Node.js 20 or later for the spec-guard commands, plus the toolchain of the project's test gate.
metadata:
  version: "1.1.0"
  author: aiudalabs
  requires: spec-guard
---

# Issue Review

Decide whether one issue is ready to merge, with evidence for every claim. The question is not "do the tests pass" but "is the spec met": most bugs ship in the gap between the two.

A review never edits code. Every finding goes back to the implementing agent, who fixes it in its own lane.

## Inputs

- The issue id, such as `S3-07`, and its block in `docs/ISSUES.md` (format defined by the `spec-guard` skill).
- The implementing agent's SUMMARY block, if posted.
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

Note which files changed and whether the change matches the issue's intent, not something adjacent to it. Every commit subject must start with the issue id and carry `[refs: ...]` when the issue has refs (format: `S3-07 task-1: validate input [refs: D-03, FR-BOOKING-2]`).

## Step 3: Read the cited spec

Open each section the issue cites and read it whole. If the issue implements "ARCHITECTURE.md §3 createBooking", read the full block: failure modes and idempotency are where reviews find things. For a UI issue, the screen's `docs/UI_SCREENS.md#s-<screen-id>` section is the spec; a mockup anchor (`mockups/<app-id>.html#s-<screen-id>`) is cited only for key screens, and when it is, the screen must match it.

## Step 4: Run the lane check

```bash
node tools/spec-guard/spec.mjs verify S3-07 --base <base>
```

A failure is a blocker: a file outside `files_touched` or outside the owner's lane is a violation even when the change looks right. That includes a lockfile, a CI workflow or a generated barrel owned by another lane, any change to `tools/spec-guard/**` or `.githooks/**`, which only the `spec-guard` installer writes, and a change to `.github/workflows/spec-guard.yml` outside its owner's lane (the roster names it). The fix is an amended issue or a new issue for the right owner, never a quiet approval. If `tools/spec-guard/` is missing, say so; compare the diff with `files_touched` by hand and mark the verdict "lane check: manual".

## Step 5: Evidence for every acceptance criterion

For each numbered criterion, find two things:

1. **Where it is met**: `file:line` in the diff.
2. **A test that proves it, and that ran**: the test's name, and its passing output from your own run in Step 6. A test that exists but was not run, or a test that does not exercise the criterion, is not evidence.

Then mark it: met, partially met, or not met. A criterion without both pieces of evidence is not met. The SUMMARY's mapping is a starting point; verify every line of it yourself.

Ask, for each criterion: what user action was this supposed to enable, did the code do that, and what could go wrong in production that the tests do not cover?

## Step 6: Run the gate yourself

Run every validation command in the root `AGENTS.md`, plus:

```bash
git diff --check <base>...HEAD     # whitespace errors
```

and, depending on what changed:

- shared types changed: compile both sides (for example `pnpm tsc --noEmit` and `melos run analyze`);
- security rules changed: the rules tests on the emulator;
- a migration is included: upgrade, downgrade, upgrade.

Never trust "all pass" from the SUMMARY. A red test, a lint warning or a format error makes the verdict changes-requested. There are no flakes at the gate; a flaky test is a finding.

A command is green only when it ran: its output shows the script and, for tests, a count of tests run. pnpm exits 0 on "No projects matched the filters" and "None of the selected packages has a ... script"; that ran nothing. Rerun it as `pnpm --dir <package folder> run <script>`, which fails on a missing script; if the script truly does not exist, the gate is broken: report it as a blocker when the issue should have created the script, and as a finding for the orchestrator otherwise.

## Step 7: Check the hard rules

Walk through every hard rule in the root `AGENTS.md` and check the diff against each. Common ones and how to check them:

- No client-side state transitions: grep the client code for writes to `status` or other server-only fields.
- Security rules intact or stronger: read the rules diff line by line.
- No hardcoded environment values: grep for project ids, URLs and keys.
- No commit with red tests: Step 6 settles it.

## Step 8: Write the verdict

Use the formats in [references/verdicts.md](references/verdicts.md). The rules:

- Every blocker cites `file:line` and the criterion, rule or spec section it breaks, and suggests where the fix belongs.
- Blockers and suggestions are separate. Suggestions never block.
- Approval lists the evidence for every criterion. An approval with no findings at all deserves a second look before posting.
- No softening: a broken hard rule is stated as broken.

Post the verdict in the issue or PR thread. Do not commit, push or merge. On re-review, check only what changed since the last verdict plus the gate and the lane check, which always run again.

## Spec gaps

When the spec contradicts itself (the screen spec expects a field the schema lacks), note it in the verdict without failing the implementing agent for it, as in the template in [references/verdicts.md](references/verdicts.md). Say which interpretation the implementation chose and whether it is reasonable, and ask the user which document to fix before the gap spreads. The fix comes from rerunning the skill that owns the document.

## Sprint close

When the user says "cerrar sprint N", "cierra el sprint N" or "sprint N está completo":

1. **Goal.** Read the sprint's `#` heading in `docs/ISSUES.md` and its prompt in `docs/SPRINT_PROMPTS.md` if it exists. Write down the theme and the two or three outcomes that define done.
2. **Issues.** List every `S{N}-*` issue. For each: merged (a commit on the base branch starts with its id, or `node tools/spec-guard/spec.mjs status`) and approved (an approved verdict in its thread).
3. **Goal-backward verification.** Ask whether a real user can now do what the sprint was meant to enable, end to end. Completed tasks are not the same as a working result; walk the user action through the merged code.
4. **Cross-sprint gate.** Run the full test gate from the root `AGENTS.md` on the base branch, and `node tools/spec-guard/spec.mjs check`.
5. **Debt.** Read the sprint's diffs for shortcuts taken under pressure that the next sprint must clean up.
6. **Retro.** Write `docs/execution/sprint-{N}-retro.md` with the template in [references/verdicts.md](references/verdicts.md). This retro is the only file a review writes.
7. Show the retro and ask: "Sprint N cerrado. ¿Avanzamos a Sprint N+1?"

## What a review refuses

- Writing or changing code, even one line.
- Approving with a red test, a lint warning or a failed lane check.
- Counting a command that ran nothing (no package matched, no such script) as a pass.
- Approving a criterion without `file:line` and a test that ran.
- Skipping the gate because the change is small.
- Approving because the agent says it works, or because the sprint is late.
- Approving an out-of-lane change because it looks fine.
- Vague findings ("this is wrong") with no location and no rule.
- Renegotiating acceptance criteria, re-prioritizing the sprint, or editing spec documents.
- Auditing new attack surface in depth: flag it for a security review instead.
