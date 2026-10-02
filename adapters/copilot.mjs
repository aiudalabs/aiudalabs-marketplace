// GitHub Copilot (VS Code, CLI, coding agent):
// https://docs.github.com/en/copilot/reference/custom-agents-configuration

import { markdownAgent } from './shared.mjs';

export default {
  id: 'copilot',
  label: 'GitHub Copilot',
  skillsDir: { project: '.github/skills', global: '.copilot/skills' },
  agentsDir: { project: '.github/agents', global: '.copilot/agents' },
  renderAgent: (agent) => markdownAgent(agent, { extension: '.agent.md' }),
};
