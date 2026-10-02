// Claude Code: https://code.claude.com/docs/en/skills and /sub-agents
// Subagents accept a `skills` list, so the persona's skills are wired natively.

import { markdownAgent } from './shared.mjs';

export default {
  id: 'claude-code',
  label: 'Claude Code',
  skillsDir: { project: '.claude/skills', global: '.claude/skills' },
  agentsDir: { project: '.claude/agents', global: '.claude/agents' },
  renderAgent(agent) {
    const skills = agent.data.skills ?? [];
    return markdownAgent(agent, { extra: skills.length > 0 ? { skills } : {} });
  },
};
