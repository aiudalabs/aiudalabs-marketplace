# Adapters

An adapter tells the installer where a harness keeps skills and agents, and how to render a canonical agent into that harness's format. Skills need no conversion: every supported harness reads Agent Skills folders natively, so the installer copies them as they are.

## Supported harnesses

Project paths are relative to the project root. Global paths are relative to the home directory.

| Harness | Id | Skills (project) | Skills (global) | Agents (project) | Agents (global) | Agent format |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Code | `claude-code` | `.claude/skills/` | `.claude/skills/` | `.claude/agents/` | `.claude/agents/` | `<name>.md` with `name`, `description`, `skills` |
| Cursor | `cursor` | `.cursor/skills/` | `.cursor/skills/` | `.cursor/agents/` | `.cursor/agents/` | `<name>.md` with `name`, `description` |
| OpenAI Codex CLI | `codex` | `.agents/skills/` | `.agents/skills/` | `.codex/agents/` | `.codex/agents/` | `<name>.toml` with `name`, `description`, `developer_instructions` |
| Gemini CLI | `gemini-cli` | `.gemini/skills/` | `.gemini/skills/` | `.gemini/agents/` | `.gemini/agents/` | `<name>.md` with `name`, `description` |
| OpenCode | `opencode` | `.opencode/skills/` | `.config/opencode/skills/` | `.opencode/agents/` | `.config/opencode/agents/` | `<name>.md` with `description` |
| GitHub Copilot | `copilot` | `.github/skills/` | `.copilot/skills/` | `.github/agents/` | `.copilot/agents/` | `<name>.agent.md` with `name`, `description` |
| Osaurus | `osaurus` | Not supported | `.osaurus/skills/` | Not supported | Not supported | Agents are created in the app |

These paths were taken from each vendor's documentation on 2026-10-01. Sources:

- Claude Code: <https://code.claude.com/docs/en/skills>, <https://code.claude.com/docs/en/sub-agents>
- Cursor: <https://cursor.com/docs/context/skills>, <https://cursor.com/docs/context/subagents>
- Codex CLI: <https://learn.chatgpt.com/docs/build-skills>, <https://learn.chatgpt.com/docs/agent-configuration/subagents>
- Gemini CLI: <https://geminicli.com/docs/cli/skills/>, <https://geminicli.com/docs/core/subagents/>
- OpenCode: <https://opencode.ai/docs/skills/>, <https://opencode.ai/docs/agents/>
- GitHub Copilot: <https://docs.github.com/en/copilot/reference/custom-agents-configuration>, <https://docs.github.com/en/copilot/concepts/agents/about-agent-skills>
- Osaurus: <https://github.com/osaurus-ai/osaurus> (`docs/SKILLS.md`)

## What has been tested

The test suite installs the example stack through every adapter into a temporary project and checks the files land in the paths above. The generated plugin manifest passes `claude plugin validate`.

Loading the installed files inside each harness has not been verified yet. If a harness does not pick up a component, please open an issue with the harness version.

## Plugin marketplace

`npm run catalog` also generates `.claude-plugin/marketplace.json`, with one plugin per stack pointing at the canonical files. Claude Code reads it with `/plugin marketplace add`. Copilot CLI and Osaurus document support for the same manifest location.

## The adapter contract

Each adapter is a module in this folder that default-exports an object:

```js
export default {
  id: 'my-harness',                 // value for --harness
  label: 'My Harness',              // name shown to users
  skillsDir: { project: '.my/skills', global: '.my/skills' },
  agentsDir: { project: '.my/agents', global: '.my/agents' },
  renderAgent(agent) {
    return { fileName: `${agent.id}.md`, content: '...' };
  },
};
```

- Use `null` for a scope the harness does not support. Set `agentsDir` and `renderAgent` to `null` when the harness has no file-based agents.
- `agent` has `id`, `category`, `data` (the parsed frontmatter) and `body` (the Markdown after the frontmatter).
- `markdownAgent` in [`shared.mjs`](shared.mjs) covers the common case of Markdown with `name` and `description` frontmatter.

## Adding a harness

1. Find the vendor's documentation for skill and agent locations. Do not guess paths.
2. Create `adapters/<id>.mjs` following the contract, with the documentation link in the header comment.
3. Register it in [`index.mjs`](index.mjs).
4. Add a row and a source link to the table above.
5. Run `npm test`. The install test covers every registered adapter.
