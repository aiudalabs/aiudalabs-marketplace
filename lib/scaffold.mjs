// Plans the skeleton of a new component from templates/. It reads the
// template and returns what to write; the CLI does the writing.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, skillLike } from './components.mjs';
import { InstallError } from './install.mjs';
import { nameProblems } from './validate.mjs';

// Where each kind lives, and which names it must not collide with.
// Skills, workflows and externals install into one folder, so they share a namespace.
const KINDS = {
  skill: { template: 'skill.md', target: (name) => `skills/${name}/SKILL.md`, taken: skillLike, triggers: (name) => `skills/${name}/evals/triggers.json` },
  agent: { template: 'agent.md', target: (name, category) => `agents/${category}/${name}.md`, taken: (components) => components.agents },
  workflow: { template: 'workflow.md', target: (name) => `workflows/${name}/SKILL.md`, taken: skillLike, triggers: (name) => `workflows/${name}/evals/triggers.json` },
  stack: { template: 'stack.json', target: (name) => `stacks/${name}/stack.json`, taken: (components) => components.stacks },
  external: { template: 'external.json', target: (name) => `externals/${name}/external.json`, taken: skillLike },
};

export const SCAFFOLD_KINDS = Object.keys(KINDS);

const titleCase = (name) => name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');

function checkCategory(kind, category, components) {
  if (kind !== 'agent') return;
  const existing = [...new Set(components.agents.map((agent) => agent.category))].sort().join(', ');
  if (!category) throw new InstallError(`an agent needs --category <name>${existing ? `; existing categories: ${existing}` : ''}`);
  if (nameProblems(category).length > 0) throw new InstallError(`category "${category}" ${nameProblems(category)[0]}`);
}

// Returns { path, content } for the new component, relative to the marketplace
// root, and `extra` files: the trigger evals every skill and workflow needs.
export function planScaffold(kind, name, { category, components, templatesDir = join(ROOT, 'templates') }) {
  const spec = KINDS[kind];
  if (!spec) throw new InstallError(`unknown kind "${kind}"; use one of: ${SCAFFOLD_KINDS.join(', ')}`);
  if (!name) throw new InstallError(`new ${kind} needs a name`);
  if (nameProblems(name).length > 0) throw new InstallError(`name "${name}" ${nameProblems(name)[0]}`);
  checkCategory(kind, category, components);

  const clash = spec.taken(components).find((item) => item.id === name);
  if (clash) throw new InstallError(`"${name}" is already the name of a ${clash.type} (${clash.path})`);

  const fill = (file) => readFileSync(join(templatesDir, file), 'utf8').replaceAll('{{name}}', name).replaceAll('{{title}}', titleCase(name));
  const extra = spec.triggers ? [{ path: spec.triggers(name), content: fill('triggers.json') }] : [];
  return { path: spec.target(name, category), content: fill(spec.template), extra };
}
