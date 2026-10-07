// Records what the CLI installed into a project or home directory, so later
// runs can tell what is outdated, what was edited locally and what is safe
// to remove. One file per base directory, with a section per harness.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { componentVersion, listSkillFiles } from './components.mjs';
import { InstallError, expand, resolveReference } from './install.mjs';

export const MANIFEST_FILE = '.aiudalabs-marketplace.json';
const MANIFEST_VERSION = 1;

const emptyManifest = () => ({ version: MANIFEST_VERSION, harnesses: {} });
const toPosix = (path) => path.split('\\').join('/');

export const entryKey = (operation) => `${operation.kind}/${operation.id}`;
export const rootKey = (root) => `${root.type}/${root.id}`;

export function readManifest(baseDir) {
  const file = join(baseDir, MANIFEST_FILE);
  if (!existsSync(file)) return emptyManifest();
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new InstallError(`${file} is not valid JSON: ${error.message}`);
  }
  if (manifest?.version !== MANIFEST_VERSION || typeof manifest.harnesses !== 'object') {
    throw new InstallError(`${file} has an unknown format; expected version ${MANIFEST_VERSION}`);
  }
  return manifest;
}

// Writes the manifest, or deletes it once nothing is tracked.
export function writeManifest(baseDir, manifest) {
  const file = join(baseDir, MANIFEST_FILE);
  if (Object.keys(manifest.harnesses).length === 0) return rmSync(file, { force: true });
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

const section = (manifest, harnessId) => manifest.harnesses[harnessId] ?? { requested: [], installed: {} };

// A fingerprint of an installed file or folder, to notice local edits.
export function hashTarget(target) {
  if (!existsSync(target)) return null;
  const hash = createHash('sha256');
  if (!statSync(target).isDirectory()) return hash.update(readFileSync(target)).digest('hex');
  for (const file of listSkillFiles(target)) hash.update(file).update('\0').update(readFileSync(join(target, file))).update('\0');
  return hash.digest('hex');
}

// Paths in the manifest are relative to the base directory and must stay inside it,
// because `remove` deletes them.
export function resolveTarget(baseDir, relativeTarget) {
  const target = resolve(baseDir, relativeTarget);
  const inside = relative(resolve(baseDir), target);
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
    throw new InstallError(`manifest path "${relativeTarget}" points outside ${baseDir}`);
  }
  return target;
}

// Adds what an install wrote. Components that already existed and were not
// installed by this tool stay untracked, so `remove` never deletes them.
export function recordInstall(manifest, harnessId, roots, results, baseDir) {
  const current = section(manifest, harnessId);
  const requested = [...new Set([...current.requested, ...roots.map(rootKey)])];
  const installed = { ...current.installed };
  for (const result of results) {
    if (result.status !== 'installed') continue;
    installed[entryKey(result)] = {
      version: result.version ?? null,
      ...(result.commit ? { commit: result.commit } : {}),
      target: toPosix(relative(baseDir, result.target)),
      hash: hashTarget(result.target),
    };
  }
  return { ...manifest, harnesses: { ...manifest.harnesses, [harnessId]: { requested, installed } } };
}

// Resolves the requested names that still exist in the catalog.
function resolvable(references, components) {
  const roots = [];
  for (const reference of references) {
    try {
      roots.push(resolveReference(reference, components));
    } catch (error) {
      if (!(error instanceof InstallError)) throw error;
    }
  }
  return roots;
}

// Every key the given roots install, as `kind/id`.
function neededKeys(roots, components) {
  const { agents, skills } = expand(roots, components);
  return new Set([...agents.map((agent) => `agent/${agent.id}`), ...skills.map((item) => `${item.type}/${item.id}`)]);
}

// Decides what `remove` deletes: the named components and the dependencies
// nothing else that was requested still needs.
export function planRemoval(manifest, harnessId, roots, components) {
  const current = section(manifest, harnessId);
  const removing = new Set(roots.map(rootKey));
  for (const key of removing) {
    if (current.requested.includes(key)) continue;
    if (current.installed[key]) throw new InstallError(`${key} was installed as a dependency; remove what you added instead`);
    throw new InstallError(`${key} was not installed with \`add --harness ${harnessId}\` here`);
  }

  const requested = current.requested.filter((key) => !removing.has(key));
  const keep = neededKeys(resolvable(requested, components), components);
  const remove = Object.entries(current.installed)
    .filter(([key]) => !keep.has(key))
    .map(([key, entry]) => ({ key, ...entry }));
  const stillNeeded = [...removing].filter((key) => keep.has(key));
  return { requested, remove, stillNeeded };
}

// Drops removed entries and the names no longer requested.
export function recordRemoval(manifest, harnessId, { requested, remove }) {
  const current = section(manifest, harnessId);
  const removed = new Set(remove.map((entry) => entry.key));
  const installed = Object.fromEntries(Object.entries(current.installed).filter(([key]) => !removed.has(key)));
  const harnesses = { ...manifest.harnesses };
  if (requested.length === 0 && Object.keys(installed).length === 0) delete harnesses[harnessId];
  else harnesses[harnessId] = { requested, installed };
  return { ...manifest, harnesses };
}

const sameRelease = (entry, operation) => entry.version === (operation.version ?? null) && (entry.commit ?? null) === (operation.commit ?? null);

// Sorts the operations of a fresh plan for `update`:
//   install   not on disk yet
//   upgrade   installed by this tool, the catalog has another version
//   current   installed by this tool at the catalog's version
//   modified  installed by this tool, then edited locally (needs --force)
//   foreign   on disk but not installed by this tool (left alone)
export function classifyUpdate(manifest, harnessId, operations, { baseDir }) {
  const { installed } = section(manifest, harnessId);
  return operations.map((operation) => {
    const entry = installed[entryKey(operation)];
    if (!existsSync(operation.target)) return { operation, state: 'install' };
    if (!entry) return { operation, state: 'foreign' };
    if (sameRelease(entry, operation)) return { operation, state: 'current' };
    const edited = entry.hash && hashTarget(resolveTarget(baseDir, entry.target)) !== entry.hash;
    return { operation, state: edited ? 'modified' : 'upgrade' };
  });
}

// Installed entries whose version differs from the catalog, or that left it.
export function outdated(manifest, harnessId, components) {
  const { installed } = section(manifest, harnessId);
  const byKey = new Map([
    ...components.agents.map((agent) => [`agent/${agent.id}`, agent]),
    ...[...components.skills, ...components.workflows, ...components.externals].map((item) => [`${item.type}/${item.id}`, item]),
  ]);
  const rows = [];
  for (const [key, entry] of Object.entries(installed)) {
    const item = byKey.get(key);
    if (!item) {
      rows.push({ key, installed: entry.version, available: null });
      continue;
    }
    const available = componentVersion(item);
    const commit = item.type === 'external' ? item.data.commit : null;
    if (entry.version !== available || (entry.commit ?? null) !== commit) rows.push({ key, installed: entry.version, available });
  }
  return rows;
}

export const manifestHarnesses = (manifest) => Object.keys(manifest.harnesses);
