// Cursor: https://cursor.com/docs/context/skills and /subagents

import { markdownAgent } from './shared.mjs';

export default {
  id: 'cursor',
  label: 'Cursor',
  skillsDir: { project: '.cursor/skills', global: '.cursor/skills' },
  agentsDir: { project: '.cursor/agents', global: '.cursor/agents' },
  renderAgent: (agent) => markdownAgent(agent),
};
