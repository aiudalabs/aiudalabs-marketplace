---
name: component-author
description: "Creates a new component for the aiudalabs marketplace, a skill, an agent, a workflow, a stack or an external, through a short interview: checks the catalog for duplicates, decides which kind the idea is, writes it from the repository's template, validates it, tries it in a harness, has it reviewed by an independent reviewer and prepares the pull request. Use when the user wants to add, create, write or port a skill, agent, workflow, stack or external to this marketplace, or asks which kind of component an idea should be. It writes a component; checking one that already exists is the component-review skill. Only works inside a clone of the marketplace repository."
license: MIT
compatibility: Runs inside a clone of the aiudalabs-marketplace repository, with Node.js 20 or later and git. The independent review needs a harness with subagents; without them the review runs in the same context and says so. Opening the pull request needs the GitHub CLI.
metadata:
  version: "0.1.0"
  author: aiudalabs
  requires: component-review
  agents: component-reviewer
  requires-tools: node git
  argument-hint: "[idea or name of the component]"
---

# Component Author

Takes an idea to a component that passes validation, has been tried once, has been read by a reviewer who did not write it, and is ready for the maintainers. The repository holds the rules. This workflow holds the order of the work and the judgment calls.

## Before you start

1. Check that the working directory is a clone of the marketplace: it has `bin/cli.mjs`, `CONTRIBUTING.md` and `docs/component-formats.md`. If it does not, stop and say that this workflow only works there.
2. Read `CONTRIBUTING.md`, and the sections of `docs/component-formats.md` for the kinds you expect to create. Those files and `npm run validate` are the authority. Do not work from memory for field names, limits or folder layouts, and where this workflow and those files differ, follow the files.
3. Work on a branch made for this contribution. Nothing goes to `main` directly. If the working tree already has uncommitted changes that are not part of it, say so and ask whether to carry on beside them or start from a clean branch.

## Phase 1: Understand the idea

Ask only for what the user has not already said, a few questions at a time:

- What should it do, and for whom?
- When should it start? Ask for the words a person would actually type, since those go in the description.
- What does it produce: a file, a report, a decision, changes to code?
- Does it need a script or a program on the machine?
- Does it only work in a particular kind of project?
- Does it start from existing material: a prompt they already use, a document, another repository? If it comes from another repository, Phase 3 applies before anything is planned or copied.

## Phase 2: Check the catalog

For two or three words that describe the idea, run:

```bash
node bin/cli.mjs list --search <word> --full
```

Read anything close. What you find shapes the plan: a component that already does this is extended, not copied, and a near neighbor has to be told apart.

## Phase 3: Material from another repository

Only when the idea starts from another repository. It comes before the plan because the license decides the route.

Follow "Port from another repository" in `CONTRIBUTING.md`.

- Read the source's license file yourself. Do not assume a license from the repository's description or from memory.
- No license file, or a license that does not allow copying: the component is an external, or it is not added. Say which, and why.
- Take the repository URL, the commit hash and the license name from the source itself. Never write one you have not read.

## Phase 4: Decide the kind

Apply "Decide what you are adding" in `CONTRIBUTING.md`. The cases that go wrong most often:

- **"An agent that does X."** Usually two components: a short agent that holds the judgment and the voice, and a skill that holds the steps. If you can write it as numbered steps, those steps are a skill.
- **A procedure that needs an independent look.** Two components: the steps in a skill, and a short agent that runs them in its own context and names that skill. The agent did not see the work being made, which is the point.
- **A process that calls several skills or agents and stops for approval.** A workflow, plus any piece it needs that does not exist yet.
- **"A pack for doing X."** A stack, and only after its pieces exist. A stack is a list.
- **Something close to an existing component.** Often the answer is to extend that one and bump its version. If `scripts/import-aimprenta.mjs` writes that component, the change goes into the script or `scripts/patches/`, not into the component's files.

Write the plan as a list: each component to create or change, its kind, its name, one line on why it is that kind, for each near neighbor from Phase 2, one sentence on how this one differs, and for material from another repository, the license as read at the source and the route it gives: port or external. Names are lowercase with hyphens and say what the component does.

**Gate: show the plan and wait.** On yes, go on. On no, change the plan with what the user said and show it again. Create nothing before a yes.

## Phase 5: Write the components

Create them in dependency order: skills, then agents, then workflows, then stacks.

For each one:

1. Create the skeleton:

   ```bash
   node bin/cli.mjs new <kind> <name>
   ```

   Agents also take `--category`. Reuse an existing folder under `agents/` when one fits. When none does, use a new one-word category and add it to the list in "Add an agent" in `CONTRIBUTING.md`.
2. Replace every `TODO`, following the section for that kind in `CONTRIBUTING.md`. Before writing, read two components of the same kind from the catalog that are close in subject, and match their level of detail.
3. Show the user the file path and the description. **Gate: wait for their answer.** On yes, go to the next component. On changes, make them and show the description again.

What to get right, by kind:

- **Every description.** It is all a model sees when choosing what to load. Say what the component does, then when to use it, with the user's own words from Phase 1. Write it in the third person. Say what sets it apart from each near neighbor.
- **Trigger evals, for a skill or a workflow.** `new` also writes `evals/triggers.json`. Fill it as "Evals" in `docs/component-formats.md` says: requests in the user's own words from Phase 1 that should load it, and near misses that a neighbor from Phase 2 owns, with `use_instead` naming that neighbor. A near miss you cannot tell apart from a real request means the description has to say where this component stops.
- **An agent and its skill.** They answer the same requests, so each description says which one handles what: the skill does the work in the current conversation, the agent does it in a fresh context.
- **Skill.** Steps that someone with no context could follow, in order, with the name of every file the skill writes. Say what to do when an input is missing. When the body grows long, move detail into `references/` and point to it at the step that needs it. Scripts run on the standard library alone. A skill cannot depend on an agent: if it has to dispatch one, it is a workflow.
- **Agent.** Who they are, what they know, how they judge, how they speak, what they refuse. No procedures. Name each skill the agent uses and when to load it.
- **Workflow.** Phases in order, and the gates: where it stops, what it shows the user, and what happens on yes and on no. Put a gate before anything that is hard to undo or seen outside, and before a long phase built on a choice the model made. Name each agent at the step where it is dispatched and say what it is given.
- **Stack.** Only entry points; dependencies come along on their own.

## Phase 6: Validate

```bash
npm run catalog
npm run validate
npm test
```

Fix every error, and read the warnings.

Check what an install would bring, and show the list to the user next to the plan from Phase 4:

```bash
node bin/cli.mjs add <name> --harness claude-code --dir /tmp/component-check --dry-run
```

If `ANTHROPIC_API_KEY` is set, the trigger evals of the new skills and workflows can be run. Each case is one paid request:

```bash
node scripts/eval-triggers.mjs <name> --dry-run
node scripts/eval-triggers.mjs <name>
```

**Gate: show the number of requests from the dry run and ask.** On yes, run it and fix the description of any component it routes wrongly. On no, skip it and say in Phase 9 that routing was not checked.

## Phase 7: Try it once

Validation checks the form. Only a run shows whether the component works.

1. Install it for the harness you are running in, into a project where it can do its job. For most components an empty scratch folder will do. One that only works in a particular kind of project, such as a clone of this repository, needs a second copy of that project, such as `git worktree add ../<name>-trial`, so that the install record and the harness folder do not land in the clone you will commit from.

   ```bash
   node bin/cli.mjs add <name> --harness <id> --dir <project>
   ```

2. In a fresh session in that project, make a request the way a user would, without naming the component. Check that it is picked up, and that each step can be followed without guessing.
3. Fix what was unclear, in the component's own folder, and run Phase 6 again. The installed copy is a copy: install again with `--force` after every change, or the old text is what loads.

If you cannot run a fresh session from here, say so. Do not report the component as tested.

## Phase 8: Independent review

You wrote these components, so you will read what you meant and not what the files say.

1. Dispatch `component-reviewer` in a fresh context. Give it the names or paths of the components from the plan, and nothing else: not the conversation, not the reasons behind a choice, not what Phase 7 found. If the harness has no subagents, follow the `component-review` skill yourself and tell the user that this review was not independent.
2. Show the user the report as it came back, without softening it.

**Gate: ask which findings to apply.** Recommend the blockers and the majors, and say which findings labeled "judgment" you disagree with and why. Questions in the report are for the user to answer. On yes, apply the chosen fixes and run Phase 6 again. On no, leave the components as they are and carry the open findings into Phase 9.

If a blocker was fixed by moving text between components, dispatch `component-reviewer` once more, on the same terms. One more round is the limit: what is still open after it goes to the user.

## Phase 9: Hand over

Tell the user:

- each component created or changed, with its path and version
- what was tried in Phase 7, in which harness, and what happened
- the reviewer's verdict, which findings were applied and which were left, with the reason
- anything not tested, and any open question

**Gate: ask before committing.** On no, leave the changes uncommitted and say where they are. On yes:

1. Stage only the component folders, `catalog/catalog.json`, `.claude-plugin/marketplace.json` and any document you changed. Run `git status` and leave everything else out, such as an install record or a harness folder.
2. Commit on the branch, and push it to the user's fork, or to `origin` if they can write to it.
3. Write the pull request body from the sections of `.github/PULL_REQUEST_TEMPLATE.md`, answering each item truthfully, including which harness it was tested in. Do not edit the template file.
4. Open the pull request with `gh pr create` if the GitHub CLI is installed. Otherwise give the user the link to open it from the pushed branch.

The maintainers approve and merge it.
