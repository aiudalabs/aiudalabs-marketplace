# aiudalabs-marketplace

An open-source marketplace of AI agents, skills and stacks that installs into Claude Code, Cursor, OpenAI Codex CLI, Gemini CLI, OpenCode, GitHub Copilot and Osaurus from one canonical source.

> Status: v0.1.0. The structure, the tooling and one example of each component type are in place. Workflows and MCP definitions are reserved folders with no installer support yet.

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

| Type | Name | Description |
| --- | --- | --- |
| Agent | [`brand-guardian`](agents/design/brand-guardian.md) | Brand strategist and identity steward |
| Agent | [`positioning-red-team`](agents/strategy/positioning-red-team.md) | Adversarial positioning advisor for startups |
| Skill | [`startup-visual-identity`](skills/startup-visual-identity/SKILL.md) | Builds a first visual identity and delivers a brand guide with design tokens |
| Skill | [`startup-positioning-audit`](skills/startup-positioning-audit/SKILL.md) | Full adversarial positioning and launch-readiness audit, scored out of 60 |
| Skill | [`homepage-copy-audit`](skills/homepage-copy-audit/SKILL.md) | Audits a homepage for clarity and conversion and delivers replacement copy |
| Skill | [`competitor-research`](skills/competitor-research/SKILL.md) | Maps the competitive landscape and delivers a sourced competitor brief |
| Stack | [`brand-starter`](stacks/brand-starter/stack.json) | `brand-guardian` with `startup-visual-identity` |
| Stack | [`launch-readiness`](stacks/launch-readiness/stack.json) | `positioning-red-team` with the three audit and research skills |

The machine-readable index is [`catalog/catalog.json`](catalog/catalog.json). It is generated, and CI fails when it is stale.

## Install

The CLI has no dependencies and needs Node.js 20 or later. Run it from the root of the project you want to install into.

```bash
# See what is available and which harnesses are supported
npx github:aiudalabs/aiudalabs-marketplace list
npx github:aiudalabs/aiudalabs-marketplace harnesses

# Install a stack, an agent or a skill
npx github:aiudalabs/aiudalabs-marketplace add brand-starter --harness claude-code
```

Useful flags: `--global` installs for your user instead of the project, `--dry-run` prints what would be written, `--force` overwrites components that are already installed. Installing an agent also installs the skills it uses, and installing a skill also installs the skills it requires.

### Claude Code

```bash
npx github:aiudalabs/aiudalabs-marketplace add brand-starter --harness claude-code
```

This writes the skill to `.claude/skills/startup-visual-identity/` and the agent to `.claude/agents/brand-guardian.md`. The agent loads the skill on demand, by name.

You can also add the repository as a plugin marketplace, where each stack is a plugin:

```
/plugin marketplace add aiudalabs/aiudalabs-marketplace
/plugin install brand-starter@aiudalabs-marketplace
```

### Cursor

```bash
npx github:aiudalabs/aiudalabs-marketplace add brand-starter --harness cursor
```

This writes `.cursor/skills/startup-visual-identity/` and `.cursor/agents/brand-guardian.md`.

### GitHub Copilot

```bash
npx github:aiudalabs/aiudalabs-marketplace add brand-starter --harness copilot
```

This writes `.github/skills/startup-visual-identity/` and `.github/agents/brand-guardian.agent.md`, which VS Code, Copilot CLI and the coding agent read.

### OpenAI Codex CLI

```bash
npx github:aiudalabs/aiudalabs-marketplace add brand-starter --harness codex
```

This writes `.agents/skills/startup-visual-identity/` and converts the agent to `.codex/agents/brand-guardian.toml`.

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
node bin/cli.mjs add brand-starter --harness cursor --dir /path/to/your/project
```

## Repository layout

```
agents/            Personas, one Markdown file each, grouped by category
skills/            Agent Skills folders (SKILL.md + scripts/ references/ assets/)
stacks/            Curated bundles of agents and skills
workflows/         Reserved: multi-step processes (format not defined yet)
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
