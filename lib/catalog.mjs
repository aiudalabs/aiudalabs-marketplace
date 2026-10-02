// Builds the generated index files. Output is deterministic (no timestamps)
// so CI can check the committed files are up to date.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, listSkillFiles, skillRequires } from './components.mjs';
import { expand } from './install.mjs';

export const CATALOG_PATH = 'catalog/catalog.json';
export const PLUGIN_MARKETPLACE_PATH = '.claude-plugin/marketplace.json';

const OWNER_NAME = 'Aiuda Labs';

const toJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

// Returns { repoRelativePath: fileContent } for every generated file.
export function buildGeneratedFiles(components, root = ROOT) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return {
    [CATALOG_PATH]: toJson(buildCatalog(components, pkg)),
    [PLUGIN_MARKETPLACE_PATH]: toJson(buildPluginMarketplace(components, pkg)),
  };
}

export function buildCatalog({ agents, skills, stacks }, pkg) {
  return {
    schemaVersion: 1,
    name: pkg.name,
    version: pkg.version,
    agents: agents.map((agent) => ({
      name: agent.id,
      description: agent.data.description,
      version: agent.data.version,
      category: agent.category,
      skills: agent.data.skills ?? [],
      tags: agent.data.tags ?? [],
      path: agent.path,
    })),
    skills: skills.map((skill) => ({
      name: skill.id,
      description: skill.data.description,
      version: skill.data.metadata?.version,
      license: skill.data.license,
      requires: skillRequires(skill),
      path: skill.path,
      files: listSkillFiles(skill.dir),
    })),
    stacks: stacks.map((stack) => ({
      name: stack.id,
      description: stack.data.description,
      version: stack.data.version,
      agents: stack.data.agents ?? [],
      skills: stack.data.skills ?? [],
      path: stack.path,
    })),
  };
}

// Plugin marketplace in the Claude Code format: one plugin per stack, pointing
// at the canonical files in place. Copilot CLI and Osaurus read this file too.
export function buildPluginMarketplace(components, pkg) {
  return {
    name: pkg.name,
    owner: { name: OWNER_NAME },
    metadata: { description: pkg.description, version: pkg.version },
    plugins: components.stacks.map((stack) => {
      const { agents, skills } = expand([stack], components);
      return {
        name: stack.id,
        description: stack.data.description,
        version: stack.data.version,
        source: './',
        strict: false,
        skills: skills.map((skill) => `./${skill.path}`),
        agents: agents.map((agent) => `./${agent.path}`),
      };
    }),
  };
}
