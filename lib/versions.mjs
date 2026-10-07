// Finds components whose content changed without a version bump. `update`
// notices content changes anyway, but a version that moves is what people read
// in `outdated` and in the catalog, so CI asks for it.

import { parseFrontmatter } from './frontmatter.mjs';

// The component a repository path belongs to, or null. Trigger evals do not
// change what a component does, so a change to them alone needs no bump.
export function componentOfPath(path) {
  const parts = path.split('/');
  if (parts.includes('evals')) return null;
  if ((parts[0] === 'skills' || parts[0] === 'workflows') && parts.length > 2) return { key: `${parts[0]}/${parts[1]}`, file: `${parts[0]}/${parts[1]}/SKILL.md`, field: 'metadata.version' };
  if (parts[0] === 'agents' && parts.length === 3 && parts[2].endsWith('.md')) return { key: path, file: path, field: 'version' };
  if (parts[0] === 'externals' && parts.length > 2) return { key: `externals/${parts[1]}`, file: `externals/${parts[1]}/external.json`, field: 'version' };
  if (parts[0] === 'stacks' && parts[2] === 'stack.json') return { key: `stacks/${parts[1]}`, file: path, field: 'version' };
  return null;
}

export function versionIn(file, text) {
  if (text === null) return null;
  if (file.endsWith('.json')) return JSON.parse(text).version ?? null;
  const { data } = parseFrontmatter(text);
  return data.metadata?.version ?? data.version ?? null;
}

// `read(ref, file)` returns the file's text at a git ref, or null when it does not exist there.
export function unbumped(changedPaths, read, { base, head = null }) {
  const components = new Map();
  for (const path of changedPaths) {
    const component = componentOfPath(path);
    if (component) components.set(component.key, component);
  }
  const problems = [];
  for (const { key, file } of components.values()) {
    const before = read(base, file);
    const after = read(head, file);
    if (before === null || after === null) continue; // new or deleted
    const [was, now] = [versionIn(file, before), versionIn(file, after)];
    if (was === now) problems.push({ key, version: now });
  }
  return problems;
}
