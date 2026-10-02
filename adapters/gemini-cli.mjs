// Gemini CLI: https://geminicli.com/docs/cli/skills/ and /docs/core/subagents/

import { markdownAgent } from './shared.mjs';

export default {
  id: 'gemini-cli',
  label: 'Gemini CLI',
  skillsDir: { project: '.gemini/skills', global: '.gemini/skills' },
  agentsDir: { project: '.gemini/agents', global: '.gemini/agents' },
  renderAgent: (agent) => markdownAgent(agent),
};
