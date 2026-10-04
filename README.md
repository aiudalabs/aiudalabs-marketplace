# aiudalabs-marketplace

An open-source marketplace of AI agents, skills and stacks that installs into Claude Code, Cursor, OpenAI Codex CLI, Gemini CLI, OpenCode, GitHub Copilot and Osaurus from one canonical source.

> Status: v0.1.0, not yet released. Eight stacks are available. MCP definitions are a reserved folder with no installer support yet.

## The idea: agents are the "who", skills are the "how"

Most collections mix personas and procedures in the same file. This repository keeps them apart, and the validator enforces it.

| | Agent | Skill |
| --- | --- | --- |
| What it is | A persona: role, expertise, working style, success metrics | A reusable procedure with its supporting files |
| Shape | One Markdown file in `agents/<category>/` | A folder in `skills/` with `SKILL.md` plus optional `scripts/`, `references/`, `assets/` |
| Standard | Lightweight format defined in this repo | The [Agent Skills](https://agentskills.io) specification, unmodified |
| Answers | "Who is doing the work, and how do they think?" | "What are the steps, and what files do they need?" |

An agent lists the skills it uses. It does not contain their steps. If an agent file starts to read like a checklist, that checklist belongs in a skill.

Skills follow progressive disclosure: a harness loads only `name` and `description` at discovery time, reads `SKILL.md` when the skill is triggered, and opens files in `references/` only when the instructions point to them.

## What is in the catalog

Install a whole stack, or any single piece in it. Run `npx github:aiudalabs/aiudalabs-marketplace list` for every agent, skill, workflow and external with its description.

| Stack | For | Main pieces |
| --- | --- | --- |
| [`brand-identity`](stacks/brand-identity/stack.json) | Building a visual identity, from brief to guidelines | Agent `brand-guardian`; skills `visual-identity`, `visual-directions`, `color-system`, `typography-system`, `logo-direction`, `design-tokens`, `brand-asset-kit`, `brand-guidelines`, `brand-review` |
| [`launch-readiness`](stacks/launch-readiness/stack.json) | Pressure-testing a startup's positioning before launch | Agent `positioning-red-team`; skills `startup-positioning-audit`, `homepage-copy-audit`, `competitor-research` |
| [`research-and-citations`](stacks/research-and-citations/stack.json) | Literature reviews and checking that every reference is real and correctly used | Agents `bibliography-auditor`, `paper-crawler`, `research-analyst`; skills `lit-review`, `citation-audit` |
| [`write-article`](stacks/write-article/stack.json) | A publish-ready piece for LinkedIn, Medium, a newsletter or a blog | Workflow `article-author`; skills `sciwrite`, `humanizer`, `line-and-copy-editor` |
| [`academic-paper`](stacks/academic-paper/stack.json) | A paper for a journal, a conference or a preprint server | Workflows `paper-author`, `paper-publisher`, `paper-review`; skills `lit-review`, `citation-audit`, `sciwrite`; agents `research-analyst`, `paper-crawler` |
| [`write-book`](stacks/write-book/stack.json) | A technical or scientific nonfiction book, from idea to review-ready manuscript | Workflows `book-author`, `bookwright-writer`, `bookwright-iterator`; drafting and audit agents |
| [`edit-book`](stacks/edit-book/stack.json) | Editorial and scientific review of a finished manuscript | Workflow `scientific-book-editor`; a panel of review agents; skills `citation-audit`, `manuscript-checks`, `line-and-copy-editor` |
| [`publish-book`](stacks/publish-book/stack.json) | Print interiors, a Kindle EPUB, a cover and the KDP listing | Workflow `production-book-publisher`; skills `book-typesetting`, `kindle-book`, `ebook-publishing`, `kdp-audit`, `kdp-listing`; external `kindle-cover` |

The writing and research pieces come from [aimprenta](https://github.com/aiudalabs/aimprenta), which bundles open-source work from several authors. Each adapted skill carries a `THIRD_PARTY_NOTICES.md`, and each adapted agent names its source and license.

The machine-readable index is [`catalog/catalog.json`](catalog/catalog.json). It is generated, and CI fails when it is stale.

## Install

The CLI has no dependencies and needs Node.js 20 or later. Run it from the root of the project you want to install into.

```bash
# See what is available and which harnesses are supported
npx github:aiudalabs/aiudalabs-marketplace list
npx github:aiudalabs/aiudalabs-marketplace harnesses

# Install a stack, an agent or a skill
npx github:aiudalabs/aiudalabs-marketplace add brand-identity --harness claude-code
```

`list` takes a kind (`agents`, `skills`, `workflows`, `externals`, `stacks`), `--search <text>` to filter and `--full` for whole descriptions. Output is colored in a terminal; `--plain` or `NO_COLOR` turns colors off, and `--json` prints it for scripts.

Useful flags for `add`: `--global` installs for your user instead of the project, `--dry-run` prints what would be written, `--force` overwrites components that are already installed. Installing an agent also installs the skills it uses, and installing a skill also installs the skills it requires.

### Claude Code

```bash
npx github:aiudalabs/aiudalabs-marketplace add brand-identity --harness claude-code
```

This writes the ten skills to `.claude/skills/` and the agent to `.claude/agents/brand-guardian.md`. The agent loads each skill on demand, by name.

You can also add the repository as a plugin marketplace, where each stack is a plugin:

```
/plugin marketplace add aiudalabs/aiudalabs-marketplace
/plugin install brand-identity@aiudalabs-marketplace
```

### Cursor

```bash
npx github:aiudalabs/aiudalabs-marketplace add brand-identity --harness cursor
```

This writes the skills to `.cursor/skills/` and the agent to `.cursor/agents/brand-guardian.md`.

### GitHub Copilot

```bash
npx github:aiudalabs/aiudalabs-marketplace add brand-identity --harness copilot
```

This writes the skills to `.github/skills/` and the agent to `.github/agents/brand-guardian.agent.md`, which VS Code, Copilot CLI and the coding agent read.

### OpenAI Codex CLI

```bash
npx github:aiudalabs/aiudalabs-marketplace add brand-identity --harness codex
```

This writes the skills to `.agents/skills/` and converts the agent to `.codex/agents/brand-guardian.toml`.

### Other harnesses

| Harness | `--harness` | Skills | Agents |
| --- | --- | --- | --- |
| Gemini CLI | `gemini-cli` | `.gemini/skills/` | `.gemini/agents/` |
| OpenCode | `opencode` | `.opencode/skills/` | `.opencode/agents/` |
| Osaurus | `osaurus` | `~/.osaurus/skills/` (needs `--global`) | Not supported: Osaurus agents are created in the app |

Full path table and the adapter contract: [adapters/README.md](adapters/README.md).

### From a local clone

```bash
git clone https://github.com/aiudalabs/aiudalabs-marketplace.git
cd aiudalabs-marketplace
node bin/cli.mjs add brand-identity --harness cursor --dir /path/to/your/project
```

## Repository layout

```
agents/            Personas, one Markdown file each, grouped by category
skills/            Agent Skills folders (SKILL.md + scripts/ references/ assets/)
stacks/            Curated bundles of agents and skills
workflows/         Multi-step processes that coordinate skills and agents
externals/         Skills cloned from other repositories at a pinned commit
mcps/              Reserved: MCP server definitions (format not defined yet)
adapters/          One module per harness: where files go and how agents are rendered
catalog/           Generated machine-readable index
.claude-plugin/    Generated plugin marketplace manifest
bin/               The CLI
lib/               Loaders, validator, catalog builder, installer
scripts/           validate and build-catalog entry points
test/              Tests (node --test)
docs/              Component format reference
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/component-formats.md](docs/component-formats.md). The short version:

```bash
npm run catalog    # regenerate catalog/catalog.json and the plugin manifest
npm run validate   # check every component against the rules
npm test           # run the test suite
```

No `npm install` is needed. The repository has no dependencies.

AI coding agents working on this repository should start with [AGENTS.md](AGENTS.md).

## Inspiration

This project learned from [github/awesome-copilot](https://github.com/github/awesome-copilot), [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents), [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills), [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates), BMAD-METHOD and the [Agent Skills](https://agentskills.io) standard.

## License

[MIT](LICENSE)
