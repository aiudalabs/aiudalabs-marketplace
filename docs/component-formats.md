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

A skill may include `evals/evals.json` with test prompts and expected outputs. The folder is optional and the validator does not check its contents yet.

### Body

- Required and non-empty.
- Keep it under 500 lines. The validator warns above that. Move detail into `references/`.
- Link to bundled files with relative paths, such as `[palette guide](references/color-systems.md)`. The validator fails on links to files that do not exist.
- Keep references one level deep: `SKILL.md` links to a reference file, and that file does not link onward to another.

### Writing a good description

Write it in the third person. State the outcome, then the triggers:

```yaml
description: Builds a first visual identity for a startup. Use when the user asks for a brand identity, color palette, font pairing or logo direction.
```

## Agents

An agent is one Markdown file at `agents/<category>/<name>.md`. It describes a persona. It does not contain procedures.

### Frontmatter

| Field | Required | Rule |
| --- | --- | --- |
| `name` | Yes | Same naming rule as skills. Must equal the file name without `.md`. Unique across all categories. |
| `description` | Yes | 1 to 1024 characters. Who the agent is and when to delegate to it. |
| `version` | Yes | Semver. |
| `requires` | No | List of skill names from this repository that the agent uses. The installer copies them with the agent. |
| `tags` | No | List of free-form tags for the catalog. |

Any other field is an error.

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
| `skills` | No | Names of skills in this repository. |

A stack needs at least one agent or skill. Skills used by a listed agent are installed automatically, so listing them again is optional.

Each stack is also published as a plugin in the generated `.claude-plugin/marketplace.json`.

## Workflows and MCPs

`workflows/` and `mcps/` are reserved. Their formats are not defined yet, and the validator and CLI ignore them. See the README in each folder.

## Generated files

Never edit these by hand. Run `npm run catalog`.

| File | Purpose |
| --- | --- |
| `catalog/catalog.json` | Index of every agent, skill and stack, for tools and a future web listing |
| `.claude-plugin/marketplace.json` | Plugin marketplace manifest, one plugin per stack |
