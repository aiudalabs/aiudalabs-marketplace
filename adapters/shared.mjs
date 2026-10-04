// Helpers shared by harness adapters.

import { stringifyFrontmatter } from '../lib/frontmatter.mjs';

// The agent's instructions as installed. An agent adapted from another project
// is a single file, so its attribution has to travel inside the body.
export function agentBody(agent) {
  const { source, license } = agent.data;
  if (!source) return agent.body;
  return `${agent.body.trimEnd()}\n\n---\n\nAdapted from ${source}, used under the ${license} license.\n`;
}

// Most harnesses read agents as Markdown with `name` + `description` frontmatter.
export function markdownAgent(agent, { extension = '.md' } = {}) {
  const frontmatter = { name: agent.id, description: agent.data.description };
  return { fileName: `${agent.id}${extension}`, content: stringifyFrontmatter(frontmatter, agentBody(agent)) };
}
