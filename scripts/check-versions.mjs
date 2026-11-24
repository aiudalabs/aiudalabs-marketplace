#!/usr/bin/env node
// Fails when a component changed since the base branch and kept its version.
// Usage: node scripts/check-versions.mjs [base-ref]   (default: origin/main)
// Compares the merge base with the working tree, so it also catches uncommitted changes.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../lib/components.mjs';
import { unbumped } from '../lib/versions.mjs';

const git = (...args) => {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout : null;
};

const baseRef = process.argv[2] ?? 'origin/main';
const base = git('merge-base', 'HEAD', baseRef)?.trim();
if (!base) {
  console.error(`check-versions: cannot find the merge base with ${baseRef}; fetch it first (actions/checkout with fetch-depth: 0).`);
  process.exit(2);
}

const changed = [git('diff', '--name-only', base), git('ls-files', '--others', '--exclude-standard')].join('\n').split('\n').filter(Boolean);
const read = (ref, file) => {
  if (ref === null) return existsSync(join(ROOT, file)) ? readFileSync(join(ROOT, file), 'utf8') : null;
  return git('show', `${ref}:${file}`);
};

const problems = unbumped(changed, read, { base });
for (const { key, version } of problems) console.log(`ERROR  ${key} changed but is still version ${version}; bump it (minor for behavior, patch for wording)`);
console.log(problems.length ? `\n${problems.length} component(s) need a version bump.` : `Every changed component has a new version (compared with ${baseRef}).`);
process.exitCode = problems.length ? 1 : 0;
