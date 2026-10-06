# AGENTS.md

Guidance for AI coding agents working on this repository.

## What this repository is

A marketplace of canonical agents, skills and stacks, plus the tooling that installs them into several AI harnesses. The components are the product. The Node tooling exists to validate and install them.

## The rule that matters most

Agents and skills are different things, and they stay separate.

- An **agent** (`agents/<category>/<name>.md`) is a persona: identity, expertise, working principles, communication style, success metrics. It names the skills it uses.
- A **skill** (`skills/<name>/`) is a procedure that follows the [Agent Skills specification](https://agentskills.io/specification): `SKILL.md` plus optional `scripts/`, `references/`, `assets/`.
- A **workflow** (`workflows/<name>/`) has the skill format and coordinates skills and agents in phases. An agent that dispatches other agents through phases is a workflow.
- An **external** (`externals/<name>/external.json`) points to a skill in another repository at a pinned commit.

Do not put step-by-step procedures in an agent. Do not put personality in a skill. When asked to add "an agent that does X", the usual answer is a short persona plus a skill that holds the steps.

Formats and field rules are in [docs/component-formats.md](docs/component-formats.md). Read it before creating or editing a component.

## Commands

```bash
npm run validate   # validate all components and check generated files are current
npm run catalog    # regenerate catalog/catalog.json and .claude-plugin/marketplace.json
npm test           # run the test suite
npm run site       # build the website into _site/ (open _site/index.html to preview)
node bin/cli.mjs list
node bin/cli.mjs add <name> --harness <id> --dir <project> --dry-run
node bin/cli.mjs new <kind> <name>   # skeleton of a skill, agent, workflow, stack or external
```

There is nothing to install. The repository has zero dependencies.

## Before you finish any change

1. Run `npm run catalog` if you added, removed or edited a component.
2. Run `npm run validate` and fix every error.
3. Run `npm test`.

CI runs the last two and fails when generated files are stale.

## Hard rules

- **Do not add dependencies.** The tooling is dependency-free on purpose so `npx` installs are fast and auditable. Ask the maintainers first if you believe one is needed.
- **Do not edit generated files by hand**: `catalog/catalog.json` and `.claude-plugin/marketplace.json`.
- **The website has no component data of its own.** Cards, counts and install commands come from `lib/site.mjs` at build time. Only the "How it works" text and diagrams in `site/index.html` are written by hand; update them when a kind of component or a harness changes.
- **Do not invent harness paths or config fields.** Adapter paths come from vendor documentation, with the link recorded in the adapter file and in `adapters/README.md`.
- **Do not add top-level frontmatter fields to skills.** The specification allows only `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools`. Put extras under `metadata`.
- **Skills are self-contained.** Never link to files in another skill's folder. If a skill needs another one, declare it in `metadata.requires` and refer to it by name.
- **Agents declare skills with `requires`, never `skills`.** Claude Code reads a `skills` field as "preload the full content of these skills", which defeats progressive disclosure.
- **Port only what the license allows.** Check the source's LICENSE file, keep its copyright notice in a `THIRD_PARTY_NOTICES.md` inside the skill, and note the origin at the top of each adapted file. No license means no porting.
- **Skill scripts are dependency-free.** A script in a skill runs with the Node.js or Python standard library alone, or the skill states what it needs in `compatibility`.
- **Stay inside the frontmatter subset** described in `docs/component-formats.md`. Quote any value that contains `: ` or ` #`.
- **Names are lowercase-hyphenated** and must match the folder name (skills, stacks) or file name (agents).

## Where things live

| Path | Purpose |
| --- | --- |
| `agents/`, `skills/`, `stacks/` | Canonical components |
| `adapters/` | One module per harness, registered in `adapters/index.mjs` |
| `lib/frontmatter.mjs` | Strict frontmatter reader and writer |
| `lib/components.mjs` | Loads components from disk |
| `lib/validate.mjs` | Validation rules |
| `lib/catalog.mjs` | Builds the generated files |
| `lib/install.mjs` | Resolves names, expands dependencies, plans and applies installs |
| `lib/scaffold.mjs` | Plans the skeleton of a new component from `templates/` |
| `templates/` | One skeleton per kind of component, filled in by `new` |
| `site/` | The website: static HTML, CSS and JavaScript, no build tools |
| `lib/site.mjs` | Builds the data the website reads, from the components |
| `scripts/build-site.mjs` | Writes `_site/`, which `.github/workflows/site.yml` deploys to GitHub Pages |
| `bin/cli.mjs` | CLI entry point |
| `test/` | Tests, run with `node --test` |
| `workflows/` | Workflows: skills that coordinate other skills and agents |
| `externals/` | Skills cloned from other repositories at a pinned commit |
| `mcps/` | Reserved. No format yet, ignored by tooling |

## Code style

- ES modules, Node.js 20 or later, standard library only.
- Early returns, at most two levels of nesting.
- Small pure functions in `lib/`; side effects in `bin/` and `scripts/`.
- Errors a user can cause are `InstallError` or validation issues with a clear message. Anything else should throw.
- Add a test in `test/` for every new validation rule or adapter behavior.

## Common tasks

Start any new component with `node bin/cli.mjs new <kind> <name>` (agents also take `--category`). It writes the skeleton in the right place and marks what to fill in with `TODO`.

**Add a skill**: create `skills/<name>/SKILL.md`, keep the body under 500 lines, move detail to `references/`, then run the three commands above.

**Add an agent**: create `agents/<category>/<name>.md`, list its skills in `requires` and name them in the body's "Skills" section, keep the body a persona.

**Add a stack**: create `stacks/<name>/stack.json` listing existing agents, skills and workflows.

**Add a workflow**: create `workflows/<name>/SKILL.md`, list the skills in `metadata.requires` and the agents in `metadata.agents`, and name each agent in the body.

**Add an external**: only when the skill cannot be copied here. Create `externals/<name>/external.json` with the repository, the full commit hash and the license as it actually is.

**Add a harness**: follow "Adding a harness" in [adapters/README.md](adapters/README.md).
