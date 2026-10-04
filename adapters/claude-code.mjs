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
  // Claude Code reads `argument-hint` at the top level, to show what a skill
  // invoked as a slash command expects. Canonical skills keep it in metadata.
  skillFrontmatter(data) {
    const hint = data.metadata?.['argument-hint'];
    if (!hint) return data;
    return { ...data, 'argument-hint': hint };
  },
};
