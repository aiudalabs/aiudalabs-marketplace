// Builds the generated index files. Output is deterministic (no timestamps)
// so CI can check the committed files are up to date.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, listSkillFiles, requiredTools, skillRequires, workflowAgents } from './components.mjs';
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

const skillEntry = (item) => ({
  name: item.id,
  description: item.data.description,
  version: item.data.metadata?.version,
  license: item.data.license,
  requires: skillRequires(item),
  tools: requiredTools(item),
  path: item.path,
  files: listSkillFiles(item.dir),
});

export function buildCatalog({ agents, skills, workflows = [], externals = [], stacks }, pkg) {
  return {
    schemaVersion: 1,
    name: pkg.name,
    version: pkg.version,
    agents: agents.map((agent) => ({
      name: agent.id,
      description: agent.data.description,
      version: agent.data.version,
      category: agent.category,
      requires: agent.data.requires ?? [],
      tags: agent.data.tags ?? [],
      license: agent.data.license,
      source: agent.data.source,
      path: agent.path,
    })),
    skills: skills.map(skillEntry),
    workflows: workflows.map((workflow) => ({ ...skillEntry(workflow), agents: workflowAgents(workflow) })),
    externals: externals.map((external) => ({
      name: external.id,
      description: external.data.description,
      version: external.data.version,
      license: external.data.license,
      repo: external.data.repo,
      commit: external.data.commit,
      path: external.path,
    })),
    stacks: stacks.map((stack) => ({
      name: stack.id,
      description: stack.data.description,
      version: stack.data.version,
      agents: stack.data.agents ?? [],
      skills: stack.data.skills ?? [],
      workflows: stack.data.workflows ?? [],
      path: stack.path,
    })),
  };
}

// Plugin marketplace in the Claude Code format: one plugin per stack, pointing
// at the canonical files in place. Copilot CLI and Osaurus read this file too.
// Externals have no files in this repository, so plugins cannot include them;
// the CLI installs them.
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
        skills: skills.filter((item) => item.type !== 'external').map((item) => `./${item.path}`),
        agents: agents.map((agent) => `./${agent.path}`),
      };
    }),
  };
}
