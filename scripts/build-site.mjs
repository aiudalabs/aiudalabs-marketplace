#!/usr/bin/env node
// Builds the website into _site/: the static files in site/ plus data.js,
// generated from the components. GitHub Pages serves that folder.
// Usage: node scripts/build-site.mjs [output-dir]

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { adapters } from '../adapters/index.mjs';
import { GRADIENT, LETTERS } from '../bin/ui.mjs';
import { ROOT, loadAll } from '../lib/components.mjs';
import { buildSiteData } from '../lib/site.mjs';
import { validateAll } from '../lib/validate.mjs';

// xterm 256-color code to hex, for the 6x6x6 cube the banner uses.
const CUBE = [0, 95, 135, 175, 215, 255];
const hex = (code) => `#${[Math.floor((code - 16) / 36), Math.floor(((code - 16) % 36) / 6), (code - 16) % 6].map((level) => CUBE[level].toString(16).padStart(2, '0')).join('')}`;

const components = loadAll();
const errors = validateAll(components).filter((issue) => issue.level === 'error');
if (errors.length > 0) {
  console.error(`Not building the site: ${errors.length} validation error(s). Run \`npm run validate\`.`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const logo = [...'aiudalabs'].map((char, index) => ({ rows: LETTERS[char], color: hex(GRADIENT[index % GRADIENT.length]) }));
const data = { ...buildSiteData(components, adapters, pkg), logo };

const out = resolve(process.argv[2] ?? join(ROOT, '_site'));
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(ROOT, 'site'), out, { recursive: true });
// A script, not JSON, so the page also works when opened from disk.
writeFileSync(join(out, 'data.js'), `window.MARKETPLACE = ${JSON.stringify(data)};\n`);
// Each component's own text, fetched by its page: content/<kind>/<name>.md.
for (const item of [...components.skills, ...components.workflows, ...components.agents]) {
  mkdirSync(join(out, 'content', item.type), { recursive: true });
  writeFileSync(join(out, 'content', item.type, `${item.id}.md`), item.body.trim() + '\n');
}
console.log(`Wrote ${out} (${data.items.length} components)`);
