// OpenCode: https://opencode.ai/docs/skills/ and /docs/agents/
// The agent name comes from the file name, so only `description` is written.

import { stringifyFrontmatter } from '../lib/frontmatter.mjs';
import { agentBody } from './shared.mjs';

export default {
  id: 'opencode',
  label: 'OpenCode',
  skillsDir: { project: '.opencode/skills', global: '.config/opencode/skills' },
  agentsDir: { project: '.opencode/agents', global: '.config/opencode/agents' },
  renderAgent(agent) {
    const content = stringifyFrontmatter({ description: agent.data.description }, agentBody(agent));
    return { fileName: `${agent.id}.md`, content };
  },
};
