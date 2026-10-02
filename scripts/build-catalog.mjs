#!/usr/bin/env node
// Regenerates catalog/catalog.json and .claude-plugin/marketplace.json
// from the canonical components.
// Usage: node scripts/build-catalog.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT, loadAll } from '../lib/components.mjs';
import { buildGeneratedFiles } from '../lib/catalog.mjs';
import { validateAll } from '../lib/validate.mjs';

const components = loadAll();
const errors = validateAll(components).filter((issue) => issue.level === 'error');
if (errors.length > 0) {
  console.error(`Refusing to build: ${errors.length} validation error(s). Run \`npm run validate\`.`);
  process.exit(1);
}

for (const [path, content] of Object.entries(buildGeneratedFiles(components))) {
  const file = join(ROOT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`Wrote ${path}`);
}
