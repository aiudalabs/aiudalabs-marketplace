# AGENTS.md

Guidance for AI coding agents working on this repository.

## What this repository is

A marketplace of canonical agents, skills and stacks, plus the tooling that installs them into several AI harnesses. The components are the product. The Node tooling exists to validate and install them.

## The rule that matters most

Agents and skills are different things, and they stay separate.

- An **agent** (`agents/<category>/<name>.md`) is a persona: identity, expertise, working principles, communication style, success metrics. It names the skills it uses.
- A **skill** (`skills/<name>/`) is a procedure that follows the [Agent Skills specification](https://agentskills.io/specification): `SKILL.md` plus optional `scripts/`, `references/`, `assets/`.

Do not put step-by-step procedures in an agent. Do not put personality in a skill. When asked to add "an agent that does X", the usual answer is a short persona plus a skill that holds the steps.

Formats and field rules are in [docs/component-formats.md](docs/component-formats.md). Read it before creating or editing a component.

## Commands

```bash
npm run validate   # validate all components and check generated files are current
npm run catalog    # regenerate catalog/catalog.json and .claude-plugin/marketplace.json
npm test           # run the test suite
node bin/cli.mjs list
node bin/cli.mjs add <name> --harness <id> --dir <project> --dry-run
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
- **Do not invent harness paths or config fields.** Adapter paths come from vendor documentation, with the link recorded in the adapter file and in `adapters/README.md`.
- **Do not add top-level frontmatter fields to skills.** The specification allows only `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools`. Put extras under `metadata`.
- **Skills are self-contained.** Never link to files in another skill's folder. If a skill needs another one, declare it in `metadata.requires` and refer to it by name.
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
| `bin/cli.mjs` | CLI entry point |
| `test/` | Tests, run with `node --test` |
| `workflows/`, `mcps/` | Reserved. No format yet, ignored by tooling |

## Code style

- ES modules, Node.js 20 or later, standard library only.
- Early returns, at most two levels of nesting.
- Small pure functions in `lib/`; side effects in `bin/` and `scripts/`.
- Errors a user can cause are `InstallError` or validation issues with a clear message. Anything else should throw.
- Add a test in `test/` for every new validation rule or adapter behavior.

## Common tasks

**Add a skill**: create `skills/<name>/SKILL.md`, keep the body under 500 lines, move detail to `references/`, then run the three commands above.

**Add an agent**: create `agents/<category>/<name>.md`, list its skills in `skills`, keep the body a persona.

**Add a stack**: create `stacks/<name>/stack.json` listing existing agents and skills.

**Add a harness**: follow "Adding a harness" in [adapters/README.md](adapters/README.md).
