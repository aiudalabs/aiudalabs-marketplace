// Builds the data the website reads. Deterministic, like the catalog, so the
// site is rebuilt from the components on every deploy and never drifts.

import { listSkillFiles, requiredTools, skillLike, skillRequires, workflowAgents } from './components.mjs';
import { expand } from './install.mjs';

export const REPOSITORY = 'aiudalabs/aiudalabs-marketplace';

const KEYS = ['stacks', 'workflows', 'skills', 'agents', 'externals'];
const ref = (item) => ({ kind: item.type, name: item.id });

// What a component names directly, as { kind, name }. An agent and a workflow
// may share a name, so a bare name is not enough.
function directUses(item, components) {
  const skill = (id) => skillLike(components).find((candidate) => candidate.id === id);
  const agent = (id) => components.agents.find((candidate) => candidate.id === id);
  if (item.type === 'agent') return (item.data.requires ?? []).map(skill).map(ref);
  if (item.type === 'skill') return skillRequires(item).map(skill).map(ref);
  if (item.type === 'workflow') return [...skillRequires(item).map(skill), ...workflowAgents(item).map(agent)].map(ref);
  if (item.type === 'stack') {
    const { agents = [], skills = [], workflows = [] } = item.data;
    return [...workflows.map(skill), ...skills.map(skill), ...agents.map(agent)].map(ref);
  }
  return [];
}

function details(item) {
  const { data } = item;
  if (item.type === 'agent') return { category: item.category, tags: data.tags ?? [], license: data.license ?? null, source: data.source ?? null };
  if (item.type === 'external') return { license: data.license, repo: data.repo, commit: data.commit, notes: data.notes ?? null };
  if (item.type === 'stack') return {};
  return {
    license: data.license ?? null,
    compatibility: data.compatibility ?? null,
    tools: requiredTools(item),
    source: data.metadata?.source ?? null,
    files: listSkillFiles(item.dir),
  };
}

function harnessEntry(adapter) {
  return {
    id: adapter.id,
    label: adapter.label,
    skills: adapter.skillsDir?.project ?? null,
    agents: adapter.agentsDir?.project ?? null,
    globalSkills: adapter.skillsDir?.global ?? null,
    supportsAgents: Boolean(adapter.agentsDir),
  };
}

export function buildSiteData(components, adapters, pkg) {
  const all = KEYS.flatMap((key) => components[key] ?? []);
  const sameName = (item) => all.filter((other) => other.id === item.id).length;
  const sameRef = (a, b) => a.kind === b.kind && a.name === b.name;

  const items = all.map((item) => {
    const self = ref(item);
    const installed = expand([item], components);
    return {
      ...self,
      // The name `add` takes: bare unless two kinds share it.
      ref: sameName(item) > 1 ? `${item.type}/${item.id}` : item.id,
      description: item.data.description,
      version: item.data.metadata?.version ?? item.data.version,
      path: item.path,
      uses: directUses(item, components),
      installs: [...installed.skills, ...installed.agents].map(ref).filter((other) => !sameRef(other, self)),
      ...details(item),
    };
  });

  for (const item of items) {
    item.usedBy = items.filter((other) => other.uses.some((used) => sameRef(used, item))).map(({ kind, name }) => ({ kind, name }));
  }

  return {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    repository: REPOSITORY,
    harnesses: adapters.map(harnessEntry),
    items,
  };
}
