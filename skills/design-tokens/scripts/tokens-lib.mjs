// Reading and resolving Design Tokens files (DTCG Format Module 2025.10).
// Shared by validate-tokens.mjs and export-tokens.mjs. No dependencies.

import { readFileSync } from 'node:fs';

export const ALIAS = /^\{([^{}]+)\}$/;

export function readTokenFile(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// Flattens the tree into a Map of "group.token" -> { path, token, type }.
// `type` is the token's own $type or the closest parent group's.
export function collectTokens(tree) {
  const tokens = new Map();
  const groups = [];
  const walk = (node, path, inheritedType) => {
    const type = typeof node.$type === 'string' ? node.$type : inheritedType;
    if ('$value' in node) {
      tokens.set(path.join('.'), { path, token: node, type });
      return;
    }
    groups.push({ path, node });
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$') && key !== '$root') continue;
      if (isObject(child)) walk(child, [...path, key], type);
    }
  };
  walk(tree, [], undefined);
  return { tokens, groups };
}

export const aliasTarget = (value) => (typeof value === 'string' ? ALIAS.exec(value)?.[1] : undefined);

// Follows aliases to the final token. Returns { entry } or { error }.
export function resolveAlias(name, tokens, seen = []) {
  if (seen.includes(name)) return { error: `circular reference: ${[...seen, name].join(' -> ')}` };
  const entry = tokens.get(name);
  if (!entry) return { error: `reference to unknown token "{${name}}"` };
  const target = aliasTarget(entry.token.$value);
  if (!target) return { entry };
  return resolveAlias(target, tokens, [...seen, name]);
}

// A token's type: its own or inherited one, or the type of the token it references.
export function resolveType(name, tokens) {
  const entry = tokens.get(name);
  if (entry.type) return entry.type;
  const resolved = resolveAlias(name, tokens);
  return resolved.entry?.type;
}
