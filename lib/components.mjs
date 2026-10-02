// Discovers canonical components on disk. Everything else (validation,
// catalog, adapters, CLI) builds on these loaders.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './frontmatter.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const toPosix = (path) => path.split('\\').join('/');
const repoPath = (root, path) => toPosix(relative(root, path));

function subdirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((entry) => statSync(join(dir, entry)).isDirectory()).sort();
}

// Parses frontmatter without throwing so the validator can report every
// broken file in one run. Loaders return `error` instead.
function readComponentFile(file) {
  try {
    return { ...parseFrontmatter(readFileSync(file, 'utf8')), error: null };
  } catch (error) {
    return { data: {}, body: '', error: error.message };
  }
}

export function loadAgents(root = ROOT) {
  const agents = [];
  for (const category of subdirs(join(root, 'agents'))) {
    const dir = join(root, 'agents', category);
    for (const entry of readdirSync(dir).sort()) {
      if (!entry.endsWith('.md') || entry === 'README.md') continue;
      const file = join(dir, entry);
      agents.push({ type: 'agent', id: entry.slice(0, -3), category, file, path: repoPath(root, file), ...readComponentFile(file) });
    }
  }
  return agents;
}

export function loadSkills(root = ROOT) {
  return subdirs(join(root, 'skills')).map((id) => {
    const dir = join(root, 'skills', id);
    const file = join(dir, 'SKILL.md');
    const parsed = existsSync(file) ? readComponentFile(file) : { data: {}, body: '', error: 'SKILL.md is missing' };
    return { type: 'skill', id, dir, file, path: repoPath(root, dir), ...parsed };
  });
}

export function loadStacks(root = ROOT) {
  return subdirs(join(root, 'stacks')).map((id) => {
    const file = join(root, 'stacks', id, 'stack.json');
    const stack = { type: 'stack', id, file, path: repoPath(root, file), data: {}, error: null };
    if (!existsSync(file)) return { ...stack, error: 'stack.json is missing' };
    try {
      return { ...stack, data: JSON.parse(readFileSync(file, 'utf8')) };
    } catch (error) {
      return { ...stack, error: `invalid JSON: ${error.message}` };
    }
  });
}

export function loadAll(root = ROOT) {
  return { agents: loadAgents(root), skills: loadSkills(root), stacks: loadStacks(root) };
}

// Every file inside a skill folder, as paths relative to the skill root.
export function listSkillFiles(skillDir) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(toPosix(relative(skillDir, full)));
    }
  };
  walk(skillDir);
  return files;
}
