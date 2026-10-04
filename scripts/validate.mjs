#!/usr/bin/env node
// Validates every agent, skill and stack, and checks generated files are up to date.
// Usage: node scripts/validate.mjs

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadAll } from '../lib/components.mjs';
import { buildGeneratedFiles } from '../lib/catalog.mjs';
import { validateAll } from '../lib/validate.mjs';

const components = loadAll();
const issues = validateAll(components);
const hasErrors = issues.some((issue) => issue.level === 'error');

// Files generated from invalid components are meaningless, so only compare when clean.
if (!hasErrors) {
  for (const [path, expected] of Object.entries(buildGeneratedFiles(components))) {
    const file = join(ROOT, path);
    const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (current !== expected) issues.push({ level: 'error', path, message: 'out of date; run `npm run catalog`' });
  }
}

for (const issue of issues) console.log(`${issue.level.toUpperCase().padEnd(7)} ${issue.path}: ${issue.message}`);

const { agents, skills, workflows, externals, stacks } = components;
const errors = issues.filter((issue) => issue.level === 'error').length;
const counts = `${agents.length} agent(s), ${skills.length} skill(s), ${workflows.length} workflow(s), ${externals.length} external(s), ${stacks.length} stack(s)`;
console.log(`\nChecked ${counts}: ${errors} error(s), ${issues.length - errors} warning(s).`);
process.exit(errors > 0 ? 1 : 0);
