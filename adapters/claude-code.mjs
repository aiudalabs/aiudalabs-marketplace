// Claude Code: https://code.claude.com/docs/en/skills and /sub-agents
// The subagent `skills` field is deliberately not written: it injects the full
// content of every listed skill at startup. Without it the subagent still
// discovers installed skills and loads them on demand.

import { markdownAgent } from './shared.mjs';

export default {
  id: 'claude-code',
  label: 'Claude Code',
  skillsDir: { project: '.claude/skills', global: '.claude/skills' },
  agentsDir: { project: '.claude/agents', global: '.claude/agents' },
  renderAgent: (agent) => markdownAgent(agent),
};
