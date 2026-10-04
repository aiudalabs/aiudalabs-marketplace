// OpenAI Codex CLI: skills live in `.agents/skills`, agents are TOML files
// with `name`, `description` and `developer_instructions`.

import { agentBody } from './shared.mjs';

const tomlString = (value) => JSON.stringify(value);

// Multi-line basic string: only backslashes and triple quotes need escaping.
const tomlMultiline = (value) => `"""\n${value.replace(/\\/g, '\\\\').replace(/"""/g, '""\\"').trimEnd()}\n"""`;

export default {
  id: 'codex',
  label: 'OpenAI Codex CLI',
  skillsDir: { project: '.agents/skills', global: '.agents/skills' },
  agentsDir: { project: '.codex/agents', global: '.codex/agents' },
  renderAgent(agent) {
    const content = [
      `name = ${tomlString(agent.id)}`,
      `description = ${tomlString(agent.data.description)}`,
      `developer_instructions = ${tomlMultiline(agentBody(agent))}`,
      '',
    ].join('\n');
    return { fileName: `${agent.id}.toml`, content };
  },
};
