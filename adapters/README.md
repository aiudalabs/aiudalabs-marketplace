# Adapters

An adapter tells the installer where a harness keeps skills and agents, and how to render a canonical agent into that harness's format. Skills need no conversion: every supported harness reads Agent Skills folders natively, so the installer copies them as they are.

## Supported harnesses

Project paths are relative to the project root. Global paths are relative to the home directory.

| Harness | Id | Skills (project) | Skills (global) | Agents (project) | Agents (global) | Agent format |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Code | `claude-code` | `.claude/skills/` | `.claude/skills/` | `.claude/agents/` | `.claude/agents/` | `<name>.md` with `name`, `description` |
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

## How agents reach their skills

Rendered agents carry only what each harness needs to register them. None of them gets a list of skills in its frontmatter. An agent names its skills in the "Skills" section of its body, and the harness finds them because the installer always copies an agent's required skills next to it.

This is deliberate for Claude Code, whose subagent `skills` field injects the full content of every listed skill at startup. Leaving it out keeps progressive disclosure: only the `name` and `description` of each skill are in context until one is needed. For the same reason the canonical field is called `requires`, so Claude Code does not read it as `skills` when a stack is installed as a plugin.

Codex (`skills.config`) and OpenCode (`permission.skill`) can enable, disable or restrict skills per agent. The adapters do not use those settings.

## Can an agent load its skills?

This is the assumption the design rests on. An installed agent names its skills in its body and carries no skills field, so it reaches them only if the harness lets a subagent load skills on demand. What each vendor documents, checked on 2026-10-07:

| Harness | Subagent loads skills on demand | Evidence |
| --- | --- | --- |
| Claude Code | Documented yes | The sub-agents page: without `skills`, "the subagent can still discover and invoke project, user, and plugin skills through the Skill tool during execution". Omitting `tools` inherits every tool, the Skill tool included. |
| OpenCode | Documented yes | Skills load "on-demand via the native `skill` tool"; per-agent `permission.skill` defaults to allow. |
| Gemini CLI | Likely, not documented | Subagents that omit `tools` inherit all of them, which would include `activate_skill`; the subagents page never mentions skills. |
| GitHub Copilot | Unclear | The `.agent.md` reference has no skills property and `tools` defaults to all. The Copilot SDK page says sub-agents "do not inherit skills", but it covers programmatic agents, not `.agent.md` files. |
| Cursor | Not verified | The documentation could not be read from where this was checked. |
| OpenAI Codex CLI | Not verified | Same. Codex has a per-agent `skills.config`, which the adapter does not set. |

Every path in the table at the top of this page matched the documentation that could be read. Gemini CLI, OpenCode and Copilot also read `.agents/skills/`.

### Check it in your harness

Documentation is not behavior. To check a harness, install this canary in an empty project, using that harness's folders from the table above, then ask the main session to have `canary-agent` fetch the codeword:

```markdown
<!-- <skills folder>/canary-skill/SKILL.md -->
---
name: canary-skill
description: Gives the project codeword. Use when anyone asks for the project codeword.
---

The project codeword is PERIWINKLE-4417. Reply with it exactly.
```

```markdown
<!-- <agents folder>/canary-agent.md -->
---
name: canary-agent
description: Answers questions about the project codeword. Delegate to it when the user asks for the codeword.
---

You do not know the codeword. Load the `canary-skill` skill and follow it. If you cannot load skills, say "NO SKILL ACCESS" and list your tools.
```

Ask: "Use the canary-agent subagent to get the project codeword. Do not read any files or load skills yourself." `PERIWINKLE-4417` means the subagent loaded the skill; "NO SKILL ACCESS" means agents installed here cannot reach their skills. Please open an issue with the result and the harness version, so the table above can say "tested".

## What has been tested

The test suite installs the example stack through every adapter into a temporary project and checks the files land in the paths above. The generated plugin manifest passes `claude plugin validate`.

Loading the installed files inside each harness has not been verified yet; the canary above is how to verify it. If a harness does not pick up a component, please open an issue with the harness version.

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
- `markdownAgent` in [`shared.mjs`](shared.mjs) covers the common case of Markdown with `name` and `description` frontmatter. Use `agentBody(agent)` for the instructions in any custom format: it appends the attribution of agents adapted from other projects.
- `skillFrontmatter(data)` is optional. It receives a skill's or workflow's parsed frontmatter and returns the frontmatter to install, for fields a harness reads at the top level. Return `data` unchanged when there is nothing to do. The Claude Code adapter uses it to lift `metadata.argument-hint`.

## Adding a harness

1. Find the vendor's documentation for skill and agent locations. Do not guess paths.
2. Create `adapters/<id>.mjs` following the contract, with the documentation link in the header comment.
3. Register it in [`index.mjs`](index.mjs).
4. Add a row and a source link to the table above.
5. Run `npm test`. The install test covers every registered adapter.
