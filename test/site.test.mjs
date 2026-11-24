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
  // The validator keeps agent and skill names apart, so bare names are enough.
  assert.equal(find('workflow', 'paper-review').ref, 'paper-review');
  assert.equal(find('agent', 'paper-reviewer').ref, 'paper-reviewer');
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
  assert.ok(find('agent', 'paper-reviewer').usedBy.some((ref) => ref.kind === 'workflow' && ref.name === 'paper-review'));
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
  // A component's page fetches its own instructions.
  for (const file of ['content/skill/color-system.md', 'content/workflow/paper-author.md', 'content/agent/brand-guardian.md']) assert.ok(readFileSync(join(out, file), 'utf8').length > 100, file);

  const window = {};
  new Function('window', readFileSync(join(out, 'data.js'), 'utf8'))(window);
  assert.equal(window.MARKETPLACE.items.length, data.items.length);
  assert.equal(window.MARKETPLACE.logo.length, 'aiudalabs'.length);
  // The page is served from a subfolder, so every local reference is relative.
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  // Each asset URL carries a version, so a deploy is not hidden by the browser's cache.
  for (const file of ['styles.css', 'app.js', 'data.js']) assert.match(html, new RegExp(`"${file.replace('.', '\\.')}\\?v=[0-9a-f]{10}"`), file);
  assert.ok(!/(?:href|src)="\/(?!\/)/.test(html), 'no root-relative URLs');
});

// WCAG 2.x relative luminance and contrast ratio.
function contrast(a, b) {
  const luminance = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test('the site colors meet WCAG AA in both themes', () => {
  const css = readFileSync(join(ROOT, 'site', 'styles.css'), 'utf8');
  const tokens = (block) => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/g)].map((match) => [match[1], match[2]]));
  const themes = { dark: tokens(css.match(/:root \{(.*?)\}/s)[1]), light: tokens(css.match(/:root\[data-theme="light"\] \{(.*?)\}/s)[1]) };
  const kinds = ['skill', 'agent', 'workflow', 'stack', 'external'];
  // [foreground, background, minimum ratio]: 4.5 for text, 3 for the border that identifies a control.
  const pairs = [
    ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text-muted', 'bg', 4.5], ['text-muted', 'surface', 4.5], ['text-muted', 'surface-2', 4.5],
    ['on-solid', 'solid', 4.5], ['link', 'surface', 4.5], ['warn', 'warn-bg', 4.5], ['border-strong', 'bg', 3], ['border-strong', 'surface', 3],
    ...kinds.flatMap((kind) => [[kind, 'bg', 4.5], [kind, 'surface', 4.5], [kind, `${kind}-bg`, 4.5]]),
  ];
  for (const [theme, values] of Object.entries(themes)) {
    for (const [fg, bg, minimum] of pairs) {
      assert.ok(values[fg] && values[bg], `${theme}: --${fg} and --${bg} are defined`);
      const ratio = contrast(values[fg], values[bg]);
      assert.ok(ratio >= minimum, `${theme}: --${fg} on --${bg} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`);
    }
  }
});

test('the site keeps to its type scale', () => {
  const css = readFileSync(join(ROOT, 'site', 'styles.css'), 'utf8');
  const rules = css.slice(css.indexOf('* { box-sizing'));
  // Outside the SVG diagrams, which are drawn at their own scale, sizes come from the --text tokens.
  const stray = [...rules.matchAll(/font(?:-size)?:[^;{}]*?(\d*\.?\d+)(rem|px)/g)].map((match) => match[0]).filter((rule) => !/1[1-3](\.5)?px/.test(rule) && !/clamp\(0\.36rem/.test(rule));
  assert.deepEqual(stray, []);
});

test('the home page names the right number of harnesses', () => {
  // site/index.html says "all seven tools" and draws three of them plus "four more".
  assert.equal(adapters.length, 7, 'a harness was added or removed: update the text and the diagram in site/index.html');
});
