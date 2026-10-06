import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { adapters } from '../adapters/index.mjs';
import { ROOT, loadAll } from '../lib/components.mjs';
import { resolveReference } from '../lib/install.mjs';
import { buildSiteData } from '../lib/site.mjs';

const components = loadAll();
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const data = buildSiteData(components, adapters, pkg);
const find = (kind, name) => data.items.find((item) => item.kind === kind && item.name === name);

test('the site lists every component once, with a description', () => {
  const total = ['agents', 'skills', 'workflows', 'externals', 'stacks'].reduce((sum, key) => sum + components[key].length, 0);
  assert.equal(data.items.length, total);
  assert.equal(new Set(data.items.map((item) => `${item.kind}/${item.name}`)).size, total);
  for (const item of data.items) assert.ok(item.description && item.version && item.path, `${item.kind}/${item.name}`);
  assert.deepEqual(data.harnesses.map((harness) => harness.id), adapters.map((adapter) => adapter.id));
});

test('the name shown in the install command is one `add` accepts', () => {
  for (const item of data.items) {
    const resolved = resolveReference(item.ref, components);
    assert.equal(`${resolved.type}/${resolved.id}`, `${item.kind}/${item.name}`);
  }
  // An agent and a workflow share this name, so the bare name would be ambiguous.
  assert.equal(find('workflow', 'paper-review').ref, 'workflow/paper-review');
  assert.equal(find('agent', 'paper-review').ref, 'agent/paper-review');
  assert.equal(find('skill', 'color-system').ref, 'color-system');
});

test('what a component installs and who uses it follow the real dependencies', () => {
  const names = (refs, kind) => refs.filter((ref) => ref.kind === kind).map((ref) => ref.name).sort();
  const stack = find('stack', 'write-article');
  assert.deepEqual(names(stack.uses, 'workflow'), ['article-author']);
  assert.deepEqual(names(stack.installs, 'skill'), ['citation-audit', 'humanizer', 'line-and-copy-editor', 'sciwrite']);
  assert.ok(!stack.installs.some((ref) => ref.kind === 'stack'), 'a component does not list itself');

  const usedBy = find('skill', 'citation-audit').usedBy.map((ref) => `${ref.kind}/${ref.name}`);
  assert.ok(usedBy.includes('workflow/article-author'));
  assert.ok(find('agent', 'paper-review').usedBy.some((ref) => ref.kind === 'workflow' && ref.name === 'paper-review'));
  assert.ok(find('external', 'kindle-cover').usedBy.some((ref) => ref.name === 'production-book-publisher'));

  for (const item of data.items) {
    for (const ref of [...item.uses, ...item.installs, ...item.usedBy]) assert.ok(find(ref.kind, ref.name), `${item.name} points to ${ref.kind}/${ref.name}`);
  }
});

test('a harness without project folders or agent files says so', () => {
  const osaurus = data.harnesses.find((harness) => harness.id === 'osaurus');
  assert.equal(osaurus.skills, null);
  assert.equal(osaurus.supportsAgents, false);
  assert.ok(osaurus.globalSkills);
  assert.equal(data.harnesses.find((harness) => harness.id === 'claude-code').skills, '.claude/skills');
});

test('the build writes a folder GitHub Pages can serve', (t) => {
  const out = mkdtempSync(join(tmpdir(), 'marketplace-site-'));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const run = spawnSync(process.execPath, [join(ROOT, 'scripts', 'build-site.mjs'), out], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  for (const file of ['index.html', 'styles.css', 'app.js', 'data.js']) assert.ok(existsSync(join(out, file)), file);

  const window = {};
  new Function('window', readFileSync(join(out, 'data.js'), 'utf8'))(window);
  assert.equal(window.MARKETPLACE.items.length, data.items.length);
  assert.equal(window.MARKETPLACE.logo.length, 'aiudalabs'.length);
  // The page is served from a subfolder, so every local reference is relative.
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.ok(!/(?:href|src)="\/(?!\/)/.test(html), 'no root-relative URLs');
});

test('the home page names the right number of harnesses', () => {
  // site/index.html says "all seven tools" and draws three of them plus "four more".
  assert.equal(adapters.length, 7, 'a harness was added or removed: update the text and the diagram in site/index.html');
});
