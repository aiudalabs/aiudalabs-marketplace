---
name: spec-guard
description: "Checks a product spec and its sprint backlog with code instead of trusting the model to check them, and guards the build: verifies docs/ISSUES.md (dependency cycles, waves, files_touched inside each agent's lane, every locked decision and requirement implemented by an issue), assigns waves deterministically, reports sprint progress, traces a decision or requirement to the issues, files and commits it reaches (impact) and a file back to the decisions behind it (why), and installs git hooks, a CI check and an optional Claude Code hook that refuse changes outside the active issue. Use for \"revisa el backlog\", \"check ISSUES.md\", \"asigna las waves\", \"¿en qué sprint vamos?\", \"qué toca si cambio la decisión D-03\", \"por qué existe este archivo\", \"instala los guardrails\" or exporting the backlog to GitHub, Jira or Linear. It checks structure, not judgment: writing the backlog is multi-agent-governance, reviewing an issue's code is issue-review."
license: MIT
compatibility: Node.js 18 or later and git. No dependencies and no network access; the GitHub export writes a script for the gh CLI that a person runs.
metadata:
  version: "1.2.0"
  author: aiudalabs
  requires-tools: "node git"
---

# Spec Guard

A spec that only the model checks drifts: a 1000-line backlog cannot be held consistent by reading it. This skill moves every check that has one right answer into code, and puts the same checks in the way of the build, in the git hooks and in CI. The model keeps the judgment calls; the scripts keep the bookkeeping.

The documents it reads, and their exact shapes, are in [formats](references/formats.md). The skills that write them follow that page.

## Commands

Run from the project root. Before installing, call the scripts in this skill's folder (`<this skill's folder>/scripts/spec.mjs`); once installed, the project has its own copy at `tools/spec-guard/`.

| Command | Does | When |
| --- | --- | --- |
| `node tools/spec-guard/spec.mjs check [--strict]` | Every structural check; exit 1 on errors. `--strict` also fails on decisions and requirements no issue implements | After writing or editing the backlog; CI runs `--strict` |
| `node tools/spec-guard/spec.mjs waves [--write]` | Computes waves per sprint; `--write` sets `wave:` in ISSUES.md and writes `docs/WAVE_DAG.md` | After adding, removing or re-planning issues |
| `node tools/spec-guard/spec.mjs status` | Spec phases done, issues merged per sprint, the next wave and which of its issues are ready | Resuming work, starting a wave |
| `node tools/spec-guard/spec.mjs impact <D-03\|FR-ORDER-1\|S3-07>` | The issues, dependents, files and commits a decision, requirement or issue reaches | Before changing a decision or a requirement |
| `node tools/spec-guard/spec.mjs why <path>` | The issues that planned a file, the decisions and requirements behind them, its commits, and commits that touched it unplanned | Before changing code you did not write |
| `node tools/spec-guard/spec.mjs verify <S3-07> [--base develop] [--worktree]` | The branch's commits since the base stay inside the issue's `files_touched` and the owner's lane | Before an executor says done; qa-tester runs it again |
| `node tools/spec-guard/spec.mjs amend <S3-07> --add-file <p> --remove-file <p> --add-dep <id> --remove-dep <id> --add-read <r> --remove-read <r>` | Edits only that issue's frontmatter, recomputes the waves, rewrites `docs/WAVE_DAG.md` and syncs `docs/SPRINT_PROMPTS.md`; refuses an amendment that adds errors | Every amendment to an issue's files, dependencies or reads; never edit them by hand |
| `node tools/spec-guard/spec.mjs prompts [--write]` | Each executor prompt's copy of its issue and read list, and each orchestrator prompt's wave list, match `docs/ISSUES.md`; `--write` fixes them | After editing an issue's criteria; `check` reports the drift as `prompt-drift` |
| `node tools/spec-guard/spec.mjs export github\|csv\|json` | Writes `docs/exports/`: a reviewable `gh` script, a CSV for Jira or Linear importers, or JSON | Moving the backlog to a tracker |

Add `--json` to any command for machine-readable output, and `--root <dir>` to run it on another folder. `export` refuses a backlog with errors.

## Install the guardrails

```bash
node <this skill's folder>/scripts/install.mjs --ci           # every harness
node <this skill's folder>/scripts/install.mjs --ci --claude  # Claude Code also blocks the edit itself
```

It copies the scripts to `tools/spec-guard/`, writes `.githooks/pre-commit` and `.githooks/commit-msg`, and sets `git config core.hooksPath .githooks`. Commit `tools/spec-guard/` and `.githooks/`; every new clone runs `git config core.hooksPath .githooks` once, which the root `AGENTS.md` should say.

On a branch whose name carries an issue id (`wt/S3-07`, `S3-07-create-booking`):

- **pre-commit** refuses staged files outside the issue's `files_touched` or the owner's lane.
- **commit-msg** refuses a subject that does not start with the issue id. That id is what `impact` and `why` follow. An optional `[refs: ...]` may list only ids from the issue's `decision_refs` and `requirement_refs`; with none, omit it.
- **pre-merge-commit** refuses a merge into an issue branch of anything not already on the base branch (develop, main or master). An issue branch syncs only by merging the base.
- **pre-tool** (`--claude`) refuses an `Edit` or `Write` outside the issue before it happens, and tells the agent why.
- **CI** (`--ci`) runs `check --strict` on every push and `verify` on pull requests from issue branches.

On any branch, a commit that changes `docs/ISSUES.md` must pass `check`. Existing hook or workflow files that spec-guard did not write are left alone; the installer says so.

After the `spec-guard` skill is updated (`npx github:aiudalabs/aiudalabs-marketplace update`), run the installer again: it replaces `tools/spec-guard/` and the hooks it wrote with the new ones, adds any new hook, and keeps `.claude/settings.json` and files it did not write. Until then the project keeps checking with the old copy.

Never `git commit --no-verify` to get past a hook. When a hook blocks a change the issue needs, the orchestrator amends the issue with `spec.mjs amend`. CI runs the same checks, so a skipped hook only moves the failure to the pull request.

`verify` judges only what the branch committed since it left the base. Files a tool or a reviewer wrote locally (`pubspec_overrides.yaml`, a refreshed lockfile) are listed as `warning (uncommitted)` and do not change the exit code; `--worktree` counts them too, for an owner's pre-commit view. It also warns on a merge that brought in commits not on the base, on a `[refs: ...]` the issue does not cite, and on a `files_touched` path git ignores. `--base` takes any branch, such as `wt/S0-05` for a lockfile refresh paired with its manifest issue.

## How the other skills use it

- `multi-agent-governance` writes issues without `wave`, runs `waves --write`, then `check --strict`, and fixes every error before handing off.
- `execution-router` and `sprint-runner` start each wave from `status`.
- `issue-delivery` ends with `verify`; `issue-review` runs it again and never trusts the executor's word.
- `product-advisor` runs `impact` before agreeing to change a locked decision.

## Reading the errors

Every message names the file, the line and the issue. The ones that need a decision rather than an edit:

- **outside-lane**: an issue writes a file its owner does not own. Move the file to the right agent's issue, or split the issue. Do not widen the lane to make the error go away; lanes exist so two agents never edit the same file.
- **lanes-overlap**: two agents own the same path in the roster. Give it to one of them.
- **uncovered-decision** or **uncovered-requirement**: a locked decision or requirement has no issue. Either the backlog dropped scope silently, or it was deferred and the document should say `(deferred)`, or the code already implements it (an adopted repository) and it should say `(existing)`. Ask the user which.
- **dangling-ref** or **proposed-id**: a document cites a `D-xx` or `FR-...` id the decisions or PRD do not define. If the document proposes that id for an earlier document, it writes `(proposed)` after it and the error becomes a warning until the owning phase defines it; otherwise fix the id.
- **unresolved-read**: an issue's `reads:` names a document under `docs/` that does not exist, or an anchor its file lacks. Copy the anchor from the heading's GitHub slug or add an `<a id>` before the heading; the slug rule is in [references/formats.md](references/formats.md#reads-anchors).
- **wave-mismatch** or **no-wave**: never fix by hand; run `waves --write`.
- **prompt-drift**: an executor or orchestrator prompt in `docs/SPRINT_PROMPTS.md` no longer matches its issue. Run `prompts --write`; what it cannot fix (a copy with no `Commits:` line after it, an issue that no longer exists) is regenerated with `execution-router`.
- **criterion-path** (warning): a criterion names a file in backticks that no `files_touched` entry covers. Add it with `amend`, or, when it is outside the owner's lane, give it to an issue whose owner has it.
- **criterion-read** (warning): a criterion cites `ARCHITECTURE §3` or `docs/X.md#anchor` and `reads` leaves it out. Add it with `amend --add-read`.
- **human-criterion**: a criterion starts with `human:` (a person performs it) in an issue that is not `autonomous: false`.
- **ignored-path** (warning): git ignores a `files_touched` path, so its new files cannot be committed. Fix `.gitignore` in the issue that owns it; never `git add -f`.
- **dependency-cycle**: two issues wait for each other. One of them is really two issues.
- **unknown-screen** or **mockup-missing-screen**: `docs/UI_SCREENS.md` (or a link into it or into a mockup) names a screen id that does not exist, or a mockup lacks a key screen. Renumbering a screen means updating every link to it; a stale mockup is refreshed with `navegable-mockups`. The screen checks are in [references/formats.md](references/formats.md).

The overlap test between globs errs toward "overlap" and the lane test errs toward "outside". A false alarm costs a minute to look at; a missed overlap costs a merge conflict at the wave barrier.

## Limits

- It checks shapes, references and paths. Whether an acceptance criterion is the right one, or whether code meets it, is judgment: that is `issue-review`.
- An issue counts as merged when a commit on the base branch starts with its id. Squash merges must keep the id in the squashed subject.
- The pre-tool hook covers Claude Code's edit tools. Other harnesses are covered by the git hooks and CI, which see every change no matter which tool made it.

An example project that passes `check --strict` is in [assets/example](assets/example/docs/ISSUES.md).
