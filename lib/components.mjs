// Discovers canonical components on disk. Everything else (validation,
// catalog, adapters, CLI) builds on these loaders.

import { createHash } from 'node:crypto';
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

// Skills and workflows share one folder format: <folder>/<name>/SKILL.md.
function loadSkillFolders(root, folder, type) {
  return subdirs(join(root, folder)).map((id) => {
    const dir = join(root, folder, id);
    const file = join(dir, 'SKILL.md');
    const parsed = existsSync(file) ? readComponentFile(file) : { data: {}, body: '', error: 'SKILL.md is missing' };
    return { type, id, dir, file, path: repoPath(root, dir), ...parsed };
  });
}

export const loadSkills = (root = ROOT) => loadSkillFolders(root, 'skills', 'skill');
export const loadWorkflows = (root = ROOT) => loadSkillFolders(root, 'workflows', 'workflow');

// Space-delimited lists kept in a skill's or workflow's metadata.
function metadataList(component, key) {
  const value = component.data?.metadata?.[key];
  if (typeof value !== 'string') return [];
  return value.split(/\s+/).filter(Boolean);
}

// Skills (or workflows, or externals) a skill or workflow depends on.
export const skillRequires = (component) => metadataList(component, 'requires');
// Agents a workflow dispatches.
export const workflowAgents = (component) => metadataList(component, 'agents');
// Command-line tools a skill needs on the machine, such as python3 or quarto.
export const requiredTools = (component) => metadataList(component, 'requires-tools');

function loadJsonFolders(root, folder, fileName, type) {
  return subdirs(join(root, folder)).map((id) => {
    const file = join(root, folder, id, fileName);
    const entry = { type, id, file, path: repoPath(root, file), data: {}, error: null };
    if (!existsSync(file)) return { ...entry, error: `${fileName} is missing` };
    try {
      return { ...entry, data: JSON.parse(readFileSync(file, 'utf8')) };
    } catch (error) {
      return { ...entry, error: `invalid JSON: ${error.message}` };
    }
  });
}

// Skills that live in another repository and are fetched at install time.
export const loadExternals = (root = ROOT) => loadJsonFolders(root, 'externals', 'external.json', 'external');

export const loadStacks = (root = ROOT) => loadJsonFolders(root, 'stacks', 'stack.json', 'stack');

export function loadAll(root = ROOT) {
  return {
    agents: loadAgents(root),
    skills: loadSkills(root),
    workflows: loadWorkflows(root),
    externals: loadExternals(root),
    stacks: loadStacks(root),
  };
}

// The version a component declares: skills and workflows keep it in metadata.
export function componentVersion(item) {
  if (item.type === 'skill' || item.type === 'workflow') return item.data.metadata?.version ?? null;
  return item.data.version ?? null;
}

// Everything that installs into a harness's skills folder, by name.
export const skillLike = ({ skills, workflows = [], externals = [] }) => [...skills, ...workflows, ...externals];

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

// A fingerprint of an installed file or folder. `overrides` replaces the content
// of some files, so a plan can fingerprint what it would write (a skill whose
// SKILL.md a harness rewrites) and compare it with what is on disk.
export function hashTree(dir, overrides = {}) {
  const hash = createHash('sha256');
  for (const file of listSkillFiles(dir)) hash.update(file).update('\0').update(overrides[file] ?? readFileSync(join(dir, file))).update('\0');
  return hash.digest('hex');
}

export const hashText = (text) => createHash('sha256').update(text).digest('hex');
