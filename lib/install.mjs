// Resolves component references and installs them through a harness adapter.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export class InstallError extends Error {}

const TYPE_KEYS = { agent: 'agents', skill: 'skills', stack: 'stacks' };

// Accepts "brand-guardian" or a qualified "agent/brand-guardian".
export function resolveReference(reference, components) {
  const [first, second] = reference.split('/');
  if (second !== undefined) {
    const key = TYPE_KEYS[first];
    if (!key) throw new InstallError(`unknown component type "${first}" (use agent/, skill/ or stack/)`);
    const found = components[key].find((component) => component.id === second);
    if (!found) throw new InstallError(`no ${first} named "${second}"`);
    return found;
  }

  const matches = Object.values(TYPE_KEYS).flatMap((key) => components[key].filter((component) => component.id === first));
  if (matches.length === 0) throw new InstallError(`nothing named "${first}"; run \`list\` to see what is available`);
  if (matches.length > 1) {
    const options = matches.map((match) => `${match.type}/${match.id}`).join(', ');
    throw new InstallError(`"${first}" is ambiguous, use one of: ${options}`);
  }
  return matches[0];
}

// Expands stacks and agent skill dependencies into unique agents and skills.
export function expand(roots, components) {
  const agents = new Map();
  const skills = new Map();
  const find = (key, id) => components[key].find((component) => component.id === id);
  const addSkill = (id) => skills.set(id, find('skills', id));
  const addAgent = (id) => {
    const agent = find('agents', id);
    agents.set(id, agent);
    (agent.data.skills ?? []).forEach(addSkill);
  };

  for (const root of roots) {
    if (root.type === 'skill') addSkill(root.id);
    if (root.type === 'agent') addAgent(root.id);
    if (root.type !== 'stack') continue;
    (root.data.agents ?? []).forEach(addAgent);
    (root.data.skills ?? []).forEach(addSkill);
  }
  return { agents: [...agents.values()], skills: [...skills.values()] };
}

// Returns the operations an install would perform, without touching disk.
export function planInstall({ agents, skills }, adapter, { scope, baseDir }) {
  const operations = [];
  const skipped = [];

  const skillsDir = adapter.skillsDir?.[scope];
  for (const skill of skills) {
    if (!skillsDir) skipped.push(`skill/${skill.id}: ${adapter.label} has no ${scope}-level skills folder`);
    else operations.push({ kind: 'skill', id: skill.id, source: skill.dir, target: join(baseDir, skillsDir, skill.id) });
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

// Applies a plan. Existing targets are left alone unless `force` is set.
export function applyInstall(operations, { force = false } = {}) {
  return operations.map((operation) => {
    if (existsSync(operation.target) && !force) return { ...operation, status: 'exists' };
    if (operation.kind === 'skill') {
      cpSync(operation.source, operation.target, { recursive: true, force: true });
      return { ...operation, status: 'installed' };
    }
    mkdirSync(dirname(operation.target), { recursive: true });
    writeFileSync(operation.target, operation.content);
    return { ...operation, status: 'installed' };
  });
}
