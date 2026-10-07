#!/usr/bin/env node
// Checks every Dart package's path dependencies against the package graph of
// docs/ARCHITECTURE.md. Owner: flutter-dev. Run by `melos run deps-check` and flutter.yml.
//
//   core      depends on: nothing (pure Dart)
//   data      depends on: core
//   ui        depends on: core
//   feature_* depends on: core, data, ui
//   apps/*    depends on: feature_*, core, data, ui
//
// Changing ALLOWED is an architecture change (docs/ARCHITECTURE.md first), never a
// side edit in a feature issue. Only path dependencies are checked; hosted
// packages are free. Exits 1 on any edge outside the graph.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ALLOWED = {
  core: [],
  data: ['core'],
  ui: ['core'],
  feature: ['core', 'data', 'ui'],
  app: ['feature', 'core', 'data', 'ui'],
};

/** packages/core -> core; packages/feature_x -> feature; apps/x -> app. */
function kindOf(dir) {
  const [top, name] = relative(root, dir).split(sep);
  if (top === 'apps' && name) return 'app';
  if (top === 'packages' && name) return name.startsWith('feature_') ? 'feature' : name;
  return undefined;
}

/** Path dependencies of a pubspec: [{ section, name, path }]. Block and inline forms. */
export function pathDependencies(text) {
  const deps = [];
  let section;
  let current;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) {
      const m = /^([\w]+):/.exec(line);
      section = m && ['dependencies', 'dev_dependencies', 'dependency_overrides'].includes(m[1]) ? m[1] : undefined;
      current = undefined;
      continue;
    }
    if (!section) continue;
    const entry = /^\s{2}([\w]+):\s*(.*)$/.exec(line);
    if (entry && indent === 2) {
      current = entry[1];
      const inline = /path:\s*['"]?([^'",}]+)['"]?/.exec(entry[2]);
      if (inline) deps.push({ section, name: current, path: inline[1].trim() });
      continue;
    }
    const path = /^\s+path:\s*['"]?([^'"]+?)['"]?\s*$/.exec(line);
    if (path && current) deps.push({ section, name: current, path: path[1] });
  }
  return deps;
}

function packageDirs() {
  const dirs = [];
  for (const top of ['apps', 'packages']) {
    const base = join(root, top);
    if (!existsSync(base)) continue;
    for (const e of readdirSync(base, { withFileTypes: true })) {
      if (e.isDirectory() && existsSync(join(base, e.name, 'pubspec.yaml'))) dirs.push(join(base, e.name));
    }
  }
  return dirs;
}

function main() {
  const errors = [];
  const dirs = packageDirs();
  for (const dir of dirs) {
    const from = kindOf(dir);
    const label = relative(root, dir);
    if (!(from in ALLOWED)) {
      errors.push(`${label}: not in the package graph (core, data, ui, feature_*, apps/*)`);
      continue;
    }
    for (const dep of pathDependencies(readFileSync(join(dir, 'pubspec.yaml'), 'utf8'))) {
      const to = kindOf(resolve(dir, dep.path));
      if (!to || !ALLOWED[from].includes(to)) {
        errors.push(`${label}: ${dep.section} ${dep.name} (path ${dep.path}) is not allowed; ${from} may depend on ${ALLOWED[from].join(', ') || 'nothing'}`);
      }
    }
  }
  for (const e of errors) console.error(`deps-check: ${e}`);
  if (errors.length > 0) process.exit(1);
  console.log(`deps-check: ${dirs.length} Dart packages, path dependencies within the graph`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
