# Contributing

Thanks for helping build the catalog. Contributions of agents, skills, workflows, stacks, externals and harness adapters are welcome.

This guide is the step-by-step. Every field and rule is in [docs/component-formats.md](docs/component-formats.md), and `npm run validate` enforces them.

## Setup

You need Node.js 20 or later. There are no dependencies to install.

```bash
git clone https://github.com/aiudalabs/aiudalabs-marketplace.git
cd aiudalabs-marketplace
npm run validate
npm test
```

## Decide what you are adding

| You have | Add | Lives in |
| --- | --- | --- |
| A repeatable procedure, with or without scripts and templates | A [skill](#add-a-skill) | `skills/<name>/` |
| A specialist identity: how someone thinks, communicates and judges quality | An [agent](#add-an-agent) | `agents/<category>/<name>.md` |
| A process in phases that coordinates several skills or agents, with points where a person approves | A [workflow](#add-a-workflow) | `workflows/<name>/` |
| A set of pieces that serve one job and should install together | A [stack](#add-a-stack) | `stacks/<name>/stack.json` |
| A skill from another repository whose license does not let you copy it | An [external](#add-an-external) | `externals/<name>/external.json` |
| Support for another AI tool | An [adapter](#add-a-harness-adapter) | `adapters/<id>.mjs` |

Three checks settle most doubts:

- If it can be written as steps anyone would follow, it is a skill.
- If what matters is judgment or an independent look, such as a reviewer that did not see the text being written, it is an agent. When an agent's text starts to read like a list of steps, those steps belong in a skill.
- If it calls several skills or agents in order and stops for approval along the way, it is a workflow. An agent that dispatches other agents through phases is a workflow.

If your idea is both a persona and a procedure, submit both: a short agent that names the skill, and the skill that holds the steps.

Names are lowercase with hyphens, at most 64 characters. Skills, workflows and externals share one namespace, so a name can be used once across the three.

## Start from a template

`new` writes the skeleton of a component in the right place, from the files in [templates/](templates/README.md). Run it from your clone:

```bash
node bin/cli.mjs new skill <name>
node bin/cli.mjs new agent <name> --category <category>
node bin/cli.mjs new workflow <name>
node bin/cli.mjs new stack <name>
node bin/cli.mjs new external <name>
```

It refuses a name that breaks the naming rule or is already in use. Every part you have to write is marked `TODO`, and `npm run validate` fails until the description and, for a skill or workflow, the trigger evals in `evals/triggers.json` are written. The sections below say what goes in each one.

## Add a skill

1. Run `node bin/cli.mjs new skill <name>`, or create `skills/<name>/SKILL.md` yourself. The folder name and the `name` field must match.
2. Write a `description` that says what the skill does and when to use it, in the third person. A harness sees only the name and this text until the skill is triggered.
3. Set `metadata.version` to `"0.1.0"`.
4. Keep `SKILL.md` under 500 lines. Put long material in `references/`, templates in `assets/` and runnable code in `scripts/`, and link to them with relative paths.
5. If the skill hands work to another skill, list it in `metadata.requires` and refer to it by name in the instructions. Never link to a file inside another skill's folder: each skill is installed as its own folder.
6. Scripts run with the Node.js or Python standard library alone. If one needs a program on the machine, list it in `metadata.requires-tools` and explain versions in `compatibility`.
7. Never locate a skill through a harness folder such as `~/.claude/skills/<name>`: each harness installs skills somewhere else. Say "this skill's folder", and the validator enforces it.
8. Write `evals/triggers.json`: at least three requests that should load the skill and two near misses that a neighboring skill owns, with `use_instead` naming it. If a near miss would load your skill, sharpen the description to say where it stops. The format is in [docs/component-formats.md](docs/component-formats.md#evals).

```markdown
---
name: meeting-notes
description: Turns a meeting transcript into decisions, owners and next steps. Use when the user shares a transcript or asks for meeting notes or a summary of a call.
metadata:
  version: "0.1.0"
---

# Meeting notes

1. Read the transcript...
```

The optional fields, with a skill that uses each:

| Field | Purpose | Example |
| --- | --- | --- |
| `metadata.requires` | Other skills, space-delimited | [`startup-positioning-audit`](skills/startup-positioning-audit/SKILL.md) |
| `metadata.requires-tools` | Programs that must be on the PATH | [`citation-audit`](skills/citation-audit/SKILL.md) |
| `metadata.argument-hint` | Hint shown when run as a slash command in Claude Code | [`paper-author`](workflows/paper-author/SKILL.md) |
| `compatibility` | Environment requirements, up to 500 characters | [`citation-audit`](skills/citation-audit/SKILL.md) |
| `license` | Only when it differs from the repository's MIT, see [Port from another repository](#port-from-another-repository) | [`sciwrite`](skills/sciwrite/SKILL.md) |

No other top-level field is allowed. Extras go under `metadata`.

## Add an agent

1. Run `node bin/cli.mjs new agent <name> --category <category>`, or create `agents/<category>/<name>.md` yourself. Reuse an existing category when one fits: `book`, `design`, `latex`, `research`, `strategy`, `writing`. The name is unique across all categories.
2. Fill in `name`, `description` (who the agent is and when to delegate to it) and `version`.
3. If the agent uses skills, list them in `requires`, and name each one in the body's "Skills" section with when to load it. The frontmatter list is for the installer; the body is what the agent reads. Use `requires`, never `skills`: Claude Code reads a `skills` field as "load these in full at startup".
4. Write the persona using the sections in [docs/component-formats.md](docs/component-formats.md#body-1): identity, expertise, how you work, communication style, preferred tools, skills, success metrics, boundaries.
5. Describe tools by capability ("file search", "script execution"), not by one harness's tool names.
6. Keep it a persona. The validator warns past 150 lines, which usually means a procedure is hiding in it.

```markdown
---
name: meeting-facilitator
description: Runs and reviews meetings for small teams. Use when preparing an agenda, or when notes need a second look for missing decisions and owners.
version: "0.1.0"
requires: [meeting-notes]
tags: [operations]
---

## Identity

You are a meeting facilitator who...

## Skills

- `meeting-notes`: load it when the user shares a transcript.
```

A full example: [`brand-guardian`](agents/design/brand-guardian.md).

## Add a workflow

A workflow has the skill format and installs like a skill. What makes it a workflow is that it declares the skills it follows and the agents it dispatches, so installing it brings all of them.

1. Run `node bin/cli.mjs new workflow <name>`, or create `workflows/<name>/SKILL.md` yourself, with the same rules as a skill.
2. List the skills, workflows or externals it uses in `metadata.requires`, and the agents it dispatches in `metadata.agents`, both space-delimited. At least one of the two is required.
3. Name each agent in the body in backticks, at the step where it is dispatched. The validator fails when a declared agent is not named.
4. Write the process as phases. Mark each gate, the point where it stops for the person's approval, and say what is presented there.
5. If it dispatches agents, say in `compatibility` that it needs a harness with subagents.
6. Keep identities out of it. How a reviewer thinks belongs in the agent; when the reviewer is called and what happens with the result belongs here.

```markdown
---
name: meeting-follow-up
description: Takes a meeting from transcript to sent follow-up. Use when the user wants notes, a review and a follow-up message from one meeting.
compatibility: Dispatches a review agent, so it needs a harness with subagents.
metadata:
  version: "0.1.0"
  requires: meeting-notes
  agents: meeting-facilitator
---

# Meeting follow-up

## Phase 1: Notes

Follow the `meeting-notes` skill.

## Phase 2: Review

Dispatch `meeting-facilitator` on the notes, in a fresh context.

**Gate: show the notes and the review. Wait for approval before drafting the message.**
```

Full examples: [`article-author`](workflows/article-author/SKILL.md), which uses skills only, and [`scientific-book-editor`](workflows/scientific-book-editor/SKILL.md), which runs a panel of agents. Notes on running a workflow without a person present are in [workflows/README.md](workflows/README.md).

## Add a stack

A stack is a list of pieces that install together. It contains no instructions and does nothing at run time.

1. Run `node bin/cli.mjs new stack <name>`, or create `stacks/<name>/stack.json` yourself. The folder name and `name` must match.
2. List pieces that already exist, under `agents`, `skills` (skills or externals) and `workflows`. At least one is required.
3. List only the entry points. Whatever a listed workflow, agent or skill requires is installed automatically.
4. Write the `description` for someone choosing what to install: the job it does, start to finish.

```json
{
  "name": "meetings",
  "description": "Run a meeting from agenda to follow-up: notes with decisions and owners, a review and the message to send.",
  "version": "0.1.0",
  "workflows": ["meeting-follow-up"]
}
```

Add a stack when a new job needs its own set of pieces. When a new piece serves a job an existing stack already covers, add it to that stack and bump the stack's version.

Each stack is also published as a plugin for Claude Code in the generated `.claude-plugin/marketplace.json`. Externals are left out of the plugin, because they have no files in this repository; the CLI installs them.

## Add an external

Use an external only when a skill cannot be copied here: its license does not allow it, or it has no license. If the license allows copying, port it instead, as described below.

1. Run `node bin/cli.mjs new external <name>`, or create `externals/<name>/external.json` yourself.
2. Set `repo` to the https URL, `commit` to the full 40-character hash you reviewed, and `path` to the folder inside the repository that contains `SKILL.md` (`""` for the root).
3. Set `license` to what the repository actually states: an SPDX identifier, or `none` when there is no license file.
4. Use `notes` to say why it is external and anything the user should know before installing.

A full example: [`kindle-cover`](externals/kindle-cover/external.json).

The installer clones the repository at that commit with the system's `git`. To update an external, read what changed upstream, then change `commit` and bump `version`.

## Port from another repository

Check the source's LICENSE file first. It decides which route applies.

| The license | Route |
| --- | --- |
| Allows copying and adapting (MIT, BSD, Apache-2.0, CC BY and similar) | Copy it here and keep the attribution |
| Does not allow it, or there is no license file | [Add an external](#add-an-external), or do not port it |

When you copy:

- **A skill or workflow.** Set its `license` field to the source's license. Add `THIRD_PARTY_NOTICES.md` inside its folder with the source repository, the commit, what you changed and the full license text. It goes in the folder because skills are installed one folder at a time. Note the origin at the top of each file you adapted.
- **An agent.** An agent is one file and cannot carry a notice next to it. Set `source` to the project's URL and `license` to its license; every adapter appends that attribution to the installed agent.
- **Convert it to this repository's formats.** Move harness-specific frontmatter under `metadata`, replace absolute paths and plugin-scoped names, and split a file that mixes a persona with a procedure into an agent and a skill.

Components that come from [aimprenta](https://github.com/aiudalabs/aimprenta) are written by a script, not by hand:

```bash
node scripts/import-aimprenta.mjs <path-to-aimprenta> [--live <dir>] [--only name,name]
```

It rewrites every component it owns, so an edit made directly to one of those files is lost on the next import. To change one, change the import: add a rewrite to its entry in the script, or a text in `scripts/patches/` that the entry inserts. [`paper-author`](workflows/paper-author/SKILL.md) is an example.

## Add a harness adapter

Follow [adapters/README.md](adapters/README.md). Take every path and config field from the vendor's documentation and link the page you used.

## Check your change

See what the installer would write, with every dependency resolved:

```bash
node bin/cli.mjs add <name> --harness claude-code --dir /tmp/try-it --dry-run
```

Then, before you open a pull request:

```bash
npm run catalog    # regenerate the catalog and plugin manifest
npm run validate   # must report 0 errors
npm test           # must pass
```

Commit the regenerated files along with your change. Never edit `catalog/catalog.json` or `.claude-plugin/marketplace.json` by hand.

If you added a skill or changed a description, check routing against its neighbors. This calls the Claude API, one request per case, so it needs `ANTHROPIC_API_KEY`:

```bash
node scripts/eval-triggers.mjs <name> --dry-run   # how many requests it would make
node scripts/eval-triggers.mjs <name>             # the cases of one component, routed among the whole catalog
```

Install the component in at least one harness and use it once. Say which harness in the pull request.

Every change reaches `main` through a pull request. Nobody pushes to `main` directly, the `validate` check has to pass, and a maintainer approves before it merges.

## Versioning

Components use semver.

- Patch: wording fixes that do not change behavior
- Minor: new capability, backward compatible
- Major: a change that alters what the component does or requires

Bump the version of every component you change, including a stack whose list changed. `update` compares installed versions with the catalog, so a change without a bump never reaches people who already installed the component. The repository version in `package.json` is bumped by maintainers at release time.

## Quality bar

- Your own work, or work whose license allows it to be here, with the attribution described above
- No secrets, private data or references to internal systems
- Facts you can back up: do not invent tool names, API fields or paths
- No new dependencies: the tooling and the skills' scripts run on the standard library

## License

The repository is licensed under the [MIT License](LICENSE). By contributing your own work, you agree that it is licensed under MIT.

Ported content keeps the license of its source. That license is named in the component's `license` field, and its text is in the component's `THIRD_PARTY_NOTICES.md`.
