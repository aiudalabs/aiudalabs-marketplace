---
name: component-review
description: "Reviews a new or changed component of the aiudalabs marketplace, a skill, agent, workflow, stack or external, for what the validator cannot catch: the wrong kind, such as a procedure hiding in an agent or a persona in a skill, a description that will not trigger or that collides with a neighboring component, steps that cannot be followed without guessing, missing gates in a workflow, and license or attribution problems. Gives a short report with a verdict, ready or needs changes, then findings by severity with file, line and fix. It reports and never edits files. Use when the user asks to review a component, to check a new skill, agent or workflow, or whether a component is ready for a pull request. It checks a component that already exists; writing one is the component-author workflow. For a read by a reviewer that did not see the component being written, delegate to the component-reviewer agent, which follows this skill. Only works inside a clone of the marketplace repository."
license: MIT
compatibility: Runs inside a clone of the aiudalabs-marketplace repository, with Node.js 20 or later. Uses git to find what changed, to tell a new component from a changed one and to compare versions with main; without git, name the component, and the report says what was not checked. Reading the license of an external or a ported source needs network access.
metadata:
  version: "0.1.0"
  author: aiudalabs
  requires-tools: node
  argument-hint: "[name or path of the component]"
---

# Component Review

Reads a new or changed component the way a maintainer does on a first pass, and says what would get it sent back. `npm run validate` checks the form: fields, names, limits and links. This skill checks what the validator cannot: whether the component is the right kind, whether it will be picked up, and whether it can be followed.

The review changes nothing. The report is the reply. No file is written, edited, moved or deleted.

## Before you start

1. Check that the working directory is a clone of the marketplace: it has `bin/cli.mjs`, `CONTRIBUTING.md` and `docs/component-formats.md`. If it does not, stop and say that this skill only works there.
2. Read `CONTRIBUTING.md` and `docs/component-formats.md` in full. They are the rules that findings cite. Do not work from memory, and where this skill and those files differ, follow the files.
3. Settle how independent the read is, for the report's basis line.
   - You did not write or help write the component in this conversation: the basis is `read cold`. If you have read the author's notes on why it was written, add that in a few words.
   - You did: you will read what you meant and not what the file says. When the harness has subagents, hand the review to one that starts with a fresh context. Give it the name or path of the component and nothing about how it was made, and pass on its report as it is. `component-reviewer` is the agent for this, if it is installed.
   - You did, and the harness has no subagents: carry on, and the basis is `not independent`.

## Step 1: Find what to review

- If the user named a component or a path, that is the scope.
- If they did not ("review this component", "check my new agent"), find what changed against `main`:

  ```bash
  git status --short
  git diff --name-only origin/main...HEAD
  ```

  Compare with `origin/main`, the base CI uses, since a local `main` can be behind it. If `origin/main` does not exist, use `main` and say so on the checks line. Use the same base for every diff below.

  The scope is every component with a changed file under `agents/`, `skills/`, `workflows/`, `stacks/` or `externals/`. The generated files, `catalog/catalog.json` and `.claude-plugin/marketplace.json`, are not reviewed; the validator checks them in Step 2.
- If nothing changed, or git is not available and no component was named, ask which component to review. If nobody can answer, stop and say that there was nothing to review. Do not pick one.

Mark each component in scope:

- `new`: none of its files is on `main`. Git lists them as untracked or added.
- `changed`: it is on `main` and differs. Read what changed with `git diff origin/main -- <path>`. Review it whole, since a change can break a part it did not touch, and say which findings were already there before the change.
- `existing`: the user named it and it does not differ from `main`.
- `not checked`: git is not available. The comparison of versions in check 7 is then not checked either.

Everything in scope goes into one report with one numbered list. Read components that depend on each other, such as an agent and the skill it requires, before judging either. Every other component is read only as a neighbor, in check 2.

## Step 2: Run the mechanical checks

```bash
npm run validate
npm test
node bin/cli.mjs add <name> --harness claude-code --dir /tmp/component-review --dry-run
```

- A validator error on a component in scope is a blocker. Quote the message and move on: the review adds nothing to what the validator already says about form.
- A failing test is a blocker when a component in scope causes it. Quote the name of the test. The tests write only to the system's temporary folder.
- Read the warnings. An agent over 150 lines or a `SKILL.md` over 500 is evidence for check 1. Count the warnings on other components on the checks line and say that they are outside the scope.
- When any component has an error, the validator skips its check of the generated files. Say so on the report's checks line, since they may also be out of date.
- Run the dry run once for each component in scope. It prints what an install would write and changes nothing. Keep the list: check 3 compares it with the skills the component tells its reader to follow.
- Do not run `npm run catalog`. It rewrites the generated files. If the validator says they are out of date, that is a finding, and running it is the author's fix.

## Step 3: Read it cold

Read every file of each component in scope from start to end, with line numbers: the `SKILL.md` or the agent file, everything in `references/`, `assets/` and `scripts/`, `THIRD_PARTY_NOTICES.md`, the `stack.json` or `external.json`.

Judge only what an install delivers. After an install the files are all a model has. Do not use the conversation that produced the component, the author's explanation of a step, or the text of the pull request to fill a gap in a file. If a step is clear only with that explanation, that is a finding.

## Step 4: Check the component

Work through the checks in this order. A wrong kind is fixed by moving text between files, so do not list wording problems in text that is about to move. Carry on with the checks that will still apply after the move.

### 1. Kind

Rule: "Decide what you are adding" in `CONTRIBUTING.md`.

- **Procedure in an agent.** Numbered steps, phases, commands to run in sequence or a report template in an agent's body. The steps belong in a skill that the agent lists in `requires` and names in its "Skills" section.
- **Persona in a skill or workflow.** An identity ("You are a senior..."), a voice, opinions on how to speak. That belongs in an agent, or goes.
- **Workflow written as an agent or a skill.** An agent that dispatches other agents through phases, or a skill that calls several skills or agents and stops for approval, is a workflow and lives in `workflows/`.
- **Skill written as a workflow.** One skill, no agents and no gate.
- **External that could be a port.** Its license allows copying. Check 6 covers how to tell.
- **Stack with a job of its own.** A stack is a list. If it needs instructions to be useful, the instructions are a workflow.
- **A second copy.** It does what an existing component does. The fix is to extend that one and bump its version.

### 2. Description

Rule: "Writing a good description" in `docs/component-formats.md`. The validator checks only that the description exists, is not a `TODO` and fits in 1024 characters.

- It says what the component does, then when to use it, in the third person. An agent's says who the agent is and when to delegate to it.
- **Will it trigger?** For each component, write three requests a person would type for this job without naming the component. For each request, decide from the name and description alone whether a model would choose it. A description that summarizes a topic and contains no request a person would make does not trigger. Skip this test for a component that is only called by another one, and check that its description says so.
- **Will it trigger too often?** A description wide enough to claim requests the component cannot serve ("use for any writing task") is a finding.
- **Does it collide?** Take the two or three words that carry the description and run this for each:

  ```bash
  node bin/cli.mjs list --search <word> --full
  ```

  A result is close when it could serve one of your three requests. The descriptions that the search prints are enough to decide; open a neighbor's file only to cite its line. If a request fits a neighbor as well, and neither description says which of the two handles it, that is a collision. Cite both files and give the sentence that would tell them apart. The written rule covers triggers and says nothing of neighbors, so a collision is a judgment. Components in the same scope can collide with each other: an agent and its skill often share their triggers, and one of them has to say how they differ.
- **Do its trigger evals hold?** A skill or workflow has `evals/triggers.json`; the validator checks its form. Read the cases: the requests should sound like a person, not like the description reworded, and each near miss should name in `use_instead` the real neighbor that owns it. A collision you found above with no near miss for it is a minor finding.
- **Does it match the body?** Everything the description promises is in the body, and the body does nothing large that the description leaves out.

### 3. Steps

Rules: "Add a skill" and "Quality bar" in `CONTRIBUTING.md`, and "Body" under "Skills" in `docs/component-formats.md`, for the points they state. No written rule says that a step must be clear. A step nobody can follow is a blocker because the component does not work as installed; a step that can be followed with some guessing is a judgment.

For skills and workflows, and for steps found inside an agent in check 1. Walk through the body as someone with no context, one step at a time, asking: do I know what to read, what to run, what to produce and where to put it? Each of these is a finding:

- A step that depends on something only the author knew: a term never defined, a file never introduced, "as appropriate", "handle errors", "the usual format".
- An input with no word on where it comes from, or no instruction for when it is missing. A file in the user's project that the steps read is an input.
- An output with no name or location, or one that silently replaces an earlier output.
- A command, script, path or tool that is not there. Check each one. A path that the component places in the marketplace or in its own folder must exist. A script named in a code block must be in the component's `scripts/`; the validator checks Markdown links and skips code. A tool named the way one harness names it, where a capability would do.
- A script that imports something outside the Node.js or Python standard library, or runs a program that is not listed in `metadata.requires-tools` and explained in `compatibility`. Open each script and read its imports.
- A link or path into another skill's folder. `../other-skill/file.md` passes the validator while that file exists, and breaks when the skill is installed alone.
- A skill that the body tells the reader to follow and `metadata.requires` does not list. The dry run from Step 2 shows whether it would be installed.
- A reference file that links onward to another reference.
- A fact nobody can back up: an API field, a version, a URL, a limit. Verify the ones you can and report the rest as questions.
- A secret, private data, an internal system, or a path from the author's machine.

### 4. Agent body

Rule: "Body" under "Agents" in `docs/component-formats.md`.

- A recommended section is missing where the agent needs it. Identity and boundaries always matter. When check 1 found the agent to be a procedure, the missing sections are part of that finding and are not listed again.
- A skill in `requires` is named in the body without saying when to load it. The validator checks only that the name appears.
- The body tells the agent to use a skill that `requires` does not list.
- Tools are named the way one harness names them, not by capability.
- A success metric nobody could observe.

### 5. Workflow phases and gates

Rule: "Add a workflow" in `CONTRIBUTING.md`.

- Each phase says what is done and which skill or agent does it.
- Each agent is named at the step where it is dispatched, with what it is given. The validator checks only that the name appears somewhere.
- A gate has three parts: where the workflow stops, what it shows the person, and what happens on yes and on no. Any sentence that makes the workflow wait for the person is a gate, marked as one or not. A gate that is not marked, or that is missing a part, is a finding.
- **Missing gates.** Look for every point where the workflow goes on to something the person would want to stop: writing over existing work; publishing, sending, committing or anything else seen outside or hard to undo; a long phase built on a choice the model made, such as a plan, an outline or a verdict; applying the fixes a review proposed. The written rule says to mark each gate and does not say where one is needed, so a point like that with no gate is a major, labeled judgment. Cite the line where the phase begins.
- A workflow that dispatches agents says in `compatibility` that it needs a harness with subagents.
- How a reviewer thinks is in the agent, and not repeated here.

### 6. License and attribution

Rules: "Port from another repository" and "Quality bar" in `CONTRIBUTING.md`; "Third-party content" in `docs/component-formats.md`.

1. Look for signs that the content came from somewhere else: a `license` other than MIT, a `source` field, an origin note, the name of another project or author, plugin-scoped names such as `plugin:skill`, variables or absolute paths that belong to another tool, a voice or layout unlike the rest of the catalog.
2. A ported skill or workflow needs all three: the `license` field set to the source's license; a `THIRD_PARTY_NOTICES.md` inside its folder with the source repository, the commit, what was changed and the full license text; and a note of the origin at the top of each adapted file. In a file with frontmatter, a `metadata.source` field counts as that note, which is how the repository's importer writes it. A ported agent needs `source` and `license`. Anything missing is a blocker.
3. For an external, and for a port whenever you can reach the source, read the license file in the source repository at the pinned commit. An agent pins no commit, so read the license its `source` shows today and say so. The `license` field must say what is there, and `none` when there is no license file. If the license allows copying, the external should be a port. Never state a license from memory. If you cannot reach the repository, write "license not verified" on the checks line. That alone does not change the verdict.
4. Signs of other origin with no attribution are a question for the author, and that question holds the verdict at needs changes until it is answered.
5. With no signs, write "no sign of ported content" on the checks line. A review cannot confirm that work is original.
6. Check whether `scripts/import-aimprenta.mjs` owns the component. Read its list of entries under "What to import" and do not rely on a search for the name, since some names are built there with a prefix: `bookwright-reviewer` is listed as `reviewer`. The script rewrites every file it owns, so an edit made directly to one is lost on the next import. When a component in scope is owned by it, say in each fix that the change belongs in the script or in `scripts/patches/`. A direct edit that is already in the diff is a major.

### 7. Version and placement

Rule: "Versioning" in `CONTRIBUTING.md`.

- A new component starts at `0.1.0`.
- A changed component has a higher version than on `origin/main`, and so does a stack whose list changed. The size of the bump matches the change. `npm run check-versions` reports every changed component that kept its version.
- An agent sits in an existing category when one fits.
- A stack lists entry points only. A listed piece that would be installed anyway is a minor finding.
- A new piece that serves the job of an existing stack and was not added to it is a question for the author.

## Step 5: Classify the findings

| Severity | Meaning | Examples |
| --- | --- | --- |
| Blocker | A maintainer would send it back: it breaks a rule the two documents state, or it does not work as installed | Wrong kind; a validator error; a description that cannot trigger; a step nobody can follow; ported content without its notice |
| Major | It works, and it will misfire or confuse. Fix before merging | A collision with a neighbor; a workflow that publishes without a gate; a missing input not handled; a version not bumped; a skill the installer would not bring |
| Minor | Small, and safe to merge as it is | Loose wording; a gate that is not marked; a dependency listed twice in a stack |
| Question | Something the files cannot answer. It has a place and no fix | "Is this adapted from another project?" |

- A blocker cites a written rule, as the file and the section heading, or names the step at which the component fails as installed.
- A major cites a written rule or carries the label "judgment".
- A problem with no written rule behind it that leaves the component working is your judgment. Label it, and never rank it above major. A major labeled judgment still holds the verdict.

The verdict is `ready` when there are no blockers, no majors and no open question about origin with no attribution. Otherwise it is `needs changes`.

## Step 6: Write the report

Give the report as the reply, in this shape. Leave out a heading that has nothing under it.

```
Verdict: needs changes

Reviewed: skills/meeting-notes (new), agents/operations/meeting-facilitator.md (changed, 0.1.0 to 0.2.0)
Basis: read cold
Checks: validate 0 errors, 1 warning outside the scope. Tests pass. An install of meeting-facilitator brings meeting-notes; an install of meeting-notes brings it alone. No sign of ported content.

Blockers

1. agents/operations/meeting-facilitator.md:21-38. Wrong kind: "How you work" is nine numbered steps that end in a file to write.
   Rule: CONTRIBUTING.md, "Decide what you are adding".
   Fix: move lines 21-38 into the meeting-notes skill and keep the principles here.

Major

2. ...

Minor

3. ...

Questions

4. skills/meeting-notes/SKILL.md:31. Is the summary format taken from another project?
```

- Each finding gives where (file and line, or a range), what you observed with the words quoted, the rule or the label "judgment", and the fix. A question gives where and what is asked.
- A finding about something missing cites the line where it should be: the frontmatter line, or the heading of the phase that needs a gate.
- The fix is the smallest change that resolves the finding. When the fix is wording, write the replacement text.
- With no findings, give the verdict and the three header lines, then "No findings."
- Keep it short. Do not list what passed, apart from the checks line, and do not add praise.

## Rules

- Never edit, create, move or delete a file, and never run a command that does: no `npm run catalog`, no install without `--dry-run`, no commit. Replacement text goes in the report, for the author to apply.
- Do not present a rule that nobody wrote down as a rule. Label it judgment, and keep it at major or below.
- Do not repeat the validator. Quote its message once and spend the review on what it cannot see.
- Review what is in scope. A flaw in a neighbor gets one line under "Questions" at most.
- When you could not check something, such as a license with no network or a diff with no git, say so on the checks line. Do not report it as passed.
