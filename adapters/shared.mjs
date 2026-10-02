// Helpers shared by harness adapters.

import { stringifyFrontmatter } from '../lib/frontmatter.mjs';

// Most harnesses read agents as Markdown with `name` + `description` frontmatter.
export function markdownAgent(agent, { extension = '.md' } = {}) {
  const frontmatter = { name: agent.id, description: agent.data.description };
  return { fileName: `${agent.id}${extension}`, content: stringifyFrontmatter(frontmatter, agent.body) };
}
