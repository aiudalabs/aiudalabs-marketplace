# Component formats

The canonical formats for everything in the catalog. `npm run validate` enforces every rule marked "required" here.

## Frontmatter subset

The tooling has no dependencies, so it reads a strict subset of YAML:

```yaml
name: plain-value
description: "Quote any value that contains a colon followed by a space, or a hash"
tags: [inline, list]
requires:
  - block-list
metadata:
  version: "0.1.0"
long: >
  A folded block scalar, joined into
  one line.
```

Nested maps go one level deep. Anything outside this subset is rejected, which also keeps the files readable by every harness's own YAML parser.

## Skills

A skill is a folder in `skills/` that follows the [Agent Skills specification](https://agentskills.io/specification). This repository adds no fields of its own to the top level.

```
skills/<name>/
├── SKILL.md       required
├── scripts/       optional: code the agent runs
├── references/    optional: docs loaded only when SKILL.md points to them
└── assets/        optional: templates and other files used in the output
```

### Frontmatter

| Field | Required | Rule |
| --- | --- | --- |
| `name` | Yes | 1 to 64 characters. Lowercase letters, digits and single hyphens. No leading or trailing hyphen. Must equal the folder name. |
| `description` | Yes | 1 to 1024 characters. Say what the skill does and when to use it. This is all a harness sees at discovery time. |
| `license` | No | License name or a reference to a bundled license file. |
| `compatibility` | No | Up to 500 characters on environment requirements. |
| `metadata` | Yes (for `version`) | Map of string keys to string values. `metadata.version` is required here and must be semver, quoted: `"0.1.0"`. `metadata.requires` is optional, see below. |
| `allowed-tools` | No | Space-delimited string. Experimental in the specification. |

Any other top-level field is an error. The specification has no top-level `version`, which is why the version lives in `metadata`.

### Skill dependencies

A skill that hands part of its work to another skill declares it in `metadata.requires`, as a space-delimited list of skill names from this repository:

```yaml
metadata:
  version: "0.1.0"
  requires: homepage-copy-audit competitor-research
```

The installer adds required skills automatically, and the validator fails on names that do not exist. Each skill is installed as its own folder, so refer to a required skill by name in the instructions ("follow the `competitor-research` skill"). Do not link to files inside another skill's folder.

Use this sparingly. A skill should still say what to do when a required skill is missing.

### Third-party content

When a skill includes content adapted from another project, add a `THIRD_PARTY_NOTICES.md` file inside the skill folder with the source, what was adapted and the full license text. It must live in the skill folder, because skills are installed one folder at a time. Port only content whose license allows it, and note the origin at the top of each adapted file.

### Evals

Every skill and workflow has `evals/triggers.json`: requests that should load it, and near misses that should not. A harness picks a skill by its description alone, so two skills with overlapping descriptions compete for the same requests. These cases are how that shows up.

```json
[
  { "query": "Review the writing in my hydrology paper; the journal asked for language editing", "should_trigger": true },
  { "query": "Rewrite this abstract so it is tighter, I will paste it straight in", "should_trigger": false, "use_instead": "manuscript-revision" }
]
```

| Field | Rule |
| --- | --- |
| `query` | A request in a user's own words, with concrete details. Paraphrase; do not copy the description. |
| `should_trigger` | `true` when this component should be loaded, `false` for a near miss |
| `use_instead` | Optional, only on a near miss: the skill, workflow or external that owns the request |

The validator requires at least 3 cases that should trigger and 2 near misses, and checks every field. Write near misses from the neighbors a user could confuse with this component, and say in the description where this one stops and which neighbor to use instead.

`node scripts/eval-triggers.mjs` runs the cases: it shows a model the name and description of everything in the catalog, as a harness does at discovery time, and reports each case it routes wrongly and the pairs it confuses. Pass component names to run only theirs, `--stack <name>` to route among what one stack installs, and `--dry-run` to see the size of the run first. It needs `ANTHROPIC_API_KEY`, and every case is one paid request.

A skill may also include `evals/evals.json` with test prompts and expected outputs, in the format of Anthropic's skill-creator. It is optional and the validator does not check it.

### Body

- Required and non-empty.
- Keep it under 500 lines. The validator warns above that. Move detail into `references/`.
- Link to bundled files with relative paths, such as `[palette guide](references/color-systems.md)`. The validator fails on links to files that do not exist, in `SKILL.md` and in every other Markdown file of the skill except those under `assets/`, and on links that leave the skill folder.
- Keep references one level deep: `SKILL.md` links to a reference file, and that file does not link onward to another.

### Portable paths

Each harness installs skills into its own folder, so no file in a skill may locate itself or another skill through a fixed path. The validator fails on `~/.claude/skills`, `$HOME/.codex/agents` and the like for every harness, and on `CLAUDE_PLUGIN_ROOT`, in every text file of the skill and in agent bodies. Write "this skill's folder", run scripts with paths relative to it, and refer to other skills by name. `THIRD_PARTY_NOTICES.md`, `NOTICE.md` and `LICENSE` files are kept verbatim and not checked.

### Writing a good description

Write it in the third person. State the outcome, then the triggers:

```yaml
description: Builds a first visual identity for a startup. Use when the user asks for a brand identity, color palette, font pairing or logo direction.
```

A description that still starts with `TODO`, as the skeletons from `new` do, is an error for every kind of component.

## Agents

An agent is one Markdown file at `agents/<category>/<name>.md`. It describes a persona. It does not contain procedures.

### Frontmatter

| Field | Required | Rule |
| --- | --- | --- |
| `name` | Yes | Same naming rule as skills. Must equal the file name without `.md`. Unique across all categories, and not the name of any skill, workflow or external. |
| `description` | Yes | 1 to 1024 characters. Who the agent is and when to delegate to it. |
| `version` | Yes | Semver. |
| `requires` | No | List of skill names from this repository that the agent uses. The installer copies them with the agent. |
| `source` | With `license` | https URL of the project the agent was adapted from |
| `license` | With `source` | License of that project, such as `MIT` |
| `tags` | No | List of free-form tags for the catalog. |

Any other field is an error.

An agent is installed as one file, so an agent adapted from another project cannot carry a separate notice file. Give `source` and `license`, and every adapter appends the attribution to the installed agent.

### Body

Recommended sections, as used by [`brand-guardian`](../agents/design/brand-guardian.md):

1. **Identity**: who the agent is, in second person
2. **Expertise**: the domains it knows
3. **How you work**: principles and priorities, not steps
4. **Communication style**
5. **Preferred tools**: described by capability, such as "file search" or "script execution", so the persona stays portable across harnesses
6. **Skills**: which skills to load and when. Repeat every name from `requires` here: the frontmatter list is for the installer, and this section is what the agent reads. The validator fails when a required skill is not named in the body
7. **Success metrics**: observable outcomes
8. **Boundaries**: what the agent refuses or hands off

The validator warns when the body passes 150 lines. That usually means a procedure is hiding in the persona and should become a skill.

## Stacks

A stack is a curated bundle at `stacks/<name>/stack.json`.

```json
{
  "name": "brand-identity",
  "description": "What the bundle is for.",
  "version": "0.1.0",
  "agents": ["brand-guardian"],
  "skills": ["visual-identity", "color-system"]
}
```

| Field | Required | Rule |
| --- | --- | --- |
| `name` | Yes | Same naming rule. Must equal the folder name. |
| `description` | Yes | 1 to 1024 characters. |
| `version` | Yes | Semver. |
| `agents` | No | Names of agents in this repository. |
| `skills` | No | Names of skills or externals in this repository. |
| `workflows` | No | Names of workflows in this repository. |

A stack needs at least one agent, skill or workflow. Skills used by a listed agent are installed automatically, so listing them again is optional.

Each stack is also published as a plugin in the generated `.claude-plugin/marketplace.json`.

## Workflows

A workflow coordinates several skills and agents through phases, with gates where a person decides: "idea to published article", "manuscript to print-ready book". It lives at `workflows/<name>/` and has exactly the skill format: a `SKILL.md` that follows the Agent Skills specification, with optional `scripts/`, `references/` and `assets/`. It installs into the harness's skills folder like any skill, so every harness that supports skills can run it.

What makes it a workflow:

| Field | Required | Rule |
| --- | --- | --- |
| `metadata.requires` | One of the two | Space-delimited skills, workflows or externals it uses |
| `metadata.agents` | One of the two | Space-delimited agents it dispatches. Each must be named in the body as `` `agent-name` `` |

Installing a workflow installs everything it requires and every agent it dispatches. Workflows that dispatch agents need a harness with subagents; say so in `compatibility`.

Keep the procedure in the workflow and the identities in the agents. An agent whose body is a sequence of phases that dispatches other agents is a workflow, not an agent.

## Externals

An external is a skill kept in another repository and cloned when it is installed, because its license does not allow copying it here, or because it has no license at all. It lives at `externals/<name>/external.json`:

```json
{
  "name": "kindle-cover",
  "description": "What the skill does and when to use it.",
  "version": "0.1.0",
  "kind": "skill",
  "repo": "https://github.com/nikmcfly/kindle-cover-skill",
  "commit": "954eb8efc270397a635b92088c5a6eea815bf938",
  "path": "",
  "license": "none",
  "notes": "Why it is external, and anything the user should know."
}
```

This is [`kindle-cover`](../externals/kindle-cover/external.json), whose repository has no license file. A skill whose license allows copying is ported instead, with its notices: see "Port from another repository" in [CONTRIBUTING.md](../CONTRIBUTING.md#port-from-another-repository).

| Field | Rule |
| --- | --- |
| `name` | Same naming rule. Must equal the folder name. Shares the namespace of skills and workflows. |
| `kind` | `skill`, the only kind supported |
| `repo` | https URL of the git repository |
| `commit` | Full 40-character hash. Installs are pinned; update it deliberately, after reading what changed. |
| `path` | Folder of the skill inside the repository, `""` for the root. It must contain `SKILL.md`. |
| `license` | SPDX identifier, `none`, or a short description of a custom license. Shown to the user before installing. |

The CLI installs externals with the system's `git`. The Claude Code plugin marketplace cannot include them, because they have no files in this repository.

## Tools a skill needs

When a skill's scripts need a program on the machine, list it in `metadata.requires-tools`, space-delimited, and explain versions and installation in `compatibility`:

```yaml
compatibility: Needs Python 3.10 or later with the pypdf package, and Quarto 1.4 or later.
metadata:
  version: "0.1.0"
  requires-tools: python3 quarto
```

`add` and `doctor` report any tool that is not on the PATH, with the skills that need it. Nothing is installed automatically.

## Fields for one harness

Some harnesses read extra frontmatter fields. Canonical files keep those fields under `metadata`, and the harness's adapter moves them where the harness expects them at install time.

| Field | Harness | Purpose |
| --- | --- | --- |
| `metadata.argument-hint` | Claude Code | Hint shown when a skill is run as a slash command, such as `"<topic or idea>"` |

## MCPs

`mcps/` is reserved. The format is not defined yet, and the validator and CLI ignore it.

## Generated files

Never edit these by hand. Run `npm run catalog`.

| File | Purpose |
| --- | --- |
| `catalog/catalog.json` | Index of every agent, skill, workflow, external and stack, for tools and a future web listing |
| `.claude-plugin/marketplace.json` | Plugin marketplace manifest, one plugin per stack |
