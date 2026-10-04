// Resolves component references and installs them through a harness adapter.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { requiredTools, skillLike, skillRequires, workflowAgents } from './components.mjs';
import { stringifyFrontmatter } from './frontmatter.mjs';

export class InstallError extends Error {}

const TYPE_KEYS = { agent: 'agents', skill: 'skills', workflow: 'workflows', external: 'externals', stack: 'stacks' };
const TYPE_LIST = Object.keys(TYPE_KEYS).map((type) => `${type}/`).join(', ');

// Accepts "brand-guardian" or a qualified "agent/brand-guardian".
export function resolveReference(reference, components) {
  const [first, second] = reference.split('/');
  if (second !== undefined) {
    const key = TYPE_KEYS[first];
    if (!key) throw new InstallError(`unknown component type "${first}" (use ${TYPE_LIST})`);
    const found = (components[key] ?? []).find((component) => component.id === second);
    if (!found) throw new InstallError(`no ${first} named "${second}"`);
    return found;
  }

  const matches = Object.values(TYPE_KEYS).flatMap((key) => (components[key] ?? []).filter((component) => component.id === first));
  if (matches.length === 0) throw new InstallError(`nothing named "${first}"; run \`list\` to see what is available`);
  if (matches.length > 1) {
    const options = matches.map((match) => `${match.type}/${match.id}`).join(', ');
    throw new InstallError(`"${first}" is ambiguous, use one of: ${options}`);
  }
  return matches[0];
}

// Expands stacks, workflows and every `requires` into unique agents and skill-like
// items (skills, workflows and externals, which all install into the skills folder).
export function expand(roots, components) {
  const agents = new Map();
  const skills = new Map();
  const everything = skillLike(components);
  const find = (id) => everything.find((item) => item.id === id);

  const addSkill = (id) => {
    if (skills.has(id)) return;
    const item = find(id);
    skills.set(id, item);
    if (item.type === 'external') return;
    skillRequires(item).forEach(addSkill);
    workflowAgents(item).forEach(addAgent);
  };
  const addAgent = (id) => {
    if (agents.has(id)) return;
    const agent = components.agents.find((candidate) => candidate.id === id);
    agents.set(id, agent);
    (agent.data.requires ?? []).forEach(addSkill);
  };

  for (const root of roots) {
    if (root.type === 'agent') addAgent(root.id);
    if (['skill', 'workflow', 'external'].includes(root.type)) addSkill(root.id);
    if (root.type !== 'stack') continue;
    (root.data.agents ?? []).forEach(addAgent);
    (root.data.skills ?? []).forEach(addSkill);
    (root.data.workflows ?? []).forEach(addSkill);
  }
  return { agents: [...agents.values()], skills: [...skills.values()] };
}

// A harness may rewrite a skill's frontmatter on install, for example to lift a
// field it understands out of `metadata`. Returns the new SKILL.md, or null.
function renderSkillFile(item, adapter) {
  if (!adapter.skillFrontmatter || item.type === 'external') return null;
  const data = adapter.skillFrontmatter(item.data);
  return data === item.data ? null : stringifyFrontmatter(data, item.body);
}

// Returns the operations an install would perform, without touching disk.
export function planInstall({ agents, skills }, adapter, { scope, baseDir }) {
  const operations = [];
  const skipped = [];

  const skillsDir = adapter.skillsDir?.[scope];
  for (const item of skills) {
    if (!skillsDir) {
      skipped.push(`${item.type}/${item.id}: ${adapter.label} has no ${scope}-level skills folder`);
      continue;
    }
    const target = join(baseDir, skillsDir, item.id);
    if (item.type === 'external') {
      const { repo, commit, path, license } = item.data;
      operations.push({ kind: 'external', id: item.id, repo, commit, path, license, target });
      continue;
    }
    operations.push({ kind: item.type, id: item.id, source: item.dir, target, skillFile: renderSkillFile(item, adapter) });
  }

  const agentsDir = adapter.agentsDir?.[scope];
  for (const agent of agents) {
    if (!agentsDir || !adapter.renderAgent) {
      skipped.push(`agent/${agent.id}: ${adapter.label} has no file-based agents`);
      continue;
    }
    const { fileName, content } = adapter.renderAgent(agent);
    operations.push({ kind: 'agent', id: agent.id, content, target: join(baseDir, agentsDir, fileName) });
  }
  return { operations, skipped };
}

const git = (args, cwd) => spawnSync('git', args, { cwd, encoding: 'utf8' });

// Clones the repository, checks out the pinned commit and copies the skill folder.
function installExternal(operation) {
  const workDir = mkdtempSync(join(tmpdir(), 'marketplace-external-'));
  try {
    const clone = git(['clone', '--quiet', operation.repo, workDir]);
    if (clone.error) return `git is not available: ${clone.error.message}`;
    if (clone.status !== 0) return `git clone failed: ${clone.stderr.trim()}`;
    const checkout = git(['checkout', '--quiet', operation.commit], workDir);
    if (checkout.status !== 0) return `commit ${operation.commit} not found: ${checkout.stderr.trim()}`;
    const source = join(workDir, operation.path);
    if (!existsSync(join(source, 'SKILL.md'))) return `no SKILL.md at "${operation.path || '.'}" in ${operation.repo}`;
    cpSync(source, operation.target, { recursive: true, force: true, filter: (path) => !path.split(/[\\/]/).includes('.git') });
    return null;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

// Applies a plan. Existing targets are left alone unless `force` is set.
export function applyInstall(operations, { force = false } = {}) {
  return operations.map((operation) => {
    if (existsSync(operation.target) && !force) return { ...operation, status: 'exists' };
    if (operation.kind === 'external') {
      rmSync(operation.target, { recursive: true, force: true });
      const error = installExternal(operation);
      return error ? { ...operation, status: 'failed', error } : { ...operation, status: 'installed' };
    }
    if (operation.kind === 'skill' || operation.kind === 'workflow') {
      cpSync(operation.source, operation.target, { recursive: true, force: true });
      if (operation.skillFile) writeFileSync(join(operation.target, 'SKILL.md'), operation.skillFile);
      return { ...operation, status: 'installed' };
    }
    mkdirSync(dirname(operation.target), { recursive: true });
    writeFileSync(operation.target, operation.content);
    return { ...operation, status: 'installed' };
  });
}

const onPath = (command) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [command]).status === 0;

// Lists the command-line tools that the given skills need and this machine lacks.
export function missingTools(skills, isAvailable = onPath) {
  const missing = new Map();
  for (const item of skills) {
    if (item.type === 'external') continue;
    for (const tool of requiredTools(item)) {
      if (isAvailable(tool)) continue;
      if (!missing.has(tool)) missing.set(tool, []);
      missing.get(tool).push(item.id);
    }
  }
  return [...missing].map(([tool, neededBy]) => ({ tool, neededBy }));
}
