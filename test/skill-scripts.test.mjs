import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT } from '../lib/components.mjs';
import { contrastRatio, oklchToRgb, parseHex, rgbToOklch, toHex } from '../skills/color-system/scripts/color-lib.mjs';

const run = (skill, script, ...args) => spawnSync('node', [join(ROOT, 'skills', skill, 'scripts', script), ...args], { encoding: 'utf8' });

function tempFile(t, name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'aiuda-scripts-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, name);
  writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
  return file;
}

test('color-lib: OKLCH conversion matches the published reference values', () => {
  // Magenta is the worked example in the DTCG Color Module: oklch(0.7016 0.3225 328.363).
  const [lightness, chroma, hue] = rgbToOklch(parseHex('#ff00ff'));
  assert.ok(Math.abs(lightness - 0.7016) < 0.001);
  assert.ok(Math.abs(chroma - 0.3225) < 0.001);
  assert.ok(Math.abs(hue - 328.363) < 0.01);

  for (const hex of ['#e8440a', '#2563eb', '#10b981', '#777777', '#000000', '#ffffff']) {
    assert.equal(toHex(oklchToRgb(rgbToOklch(parseHex(hex))).rgb), hex);
  }
});

test('color-lib: WCAG contrast of black on white is 21', () => {
  assert.equal(contrastRatio(parseHex('#000'), parseHex('#fff')), 21);
});

test('color-ramp: 11 steps, anchored on the base color, valid as tokens', (t) => {
  const report = run('color-system', 'color-ramp.mjs', '#2563eb', '--name', 'primary');
  assert.equal(report.status, 0);
  assert.equal(report.stdout.trim().split('\n').length, 12);
  assert.match(report.stdout, /#2563eb .*<- base color/);

  const tokens = run('color-system', 'color-ramp.mjs', '#2563eb', '--name', 'primary', '--tokens');
  const file = tempFile(t, 'ramp.tokens.json', tokens.stdout);
  assert.equal(run('design-tokens', 'validate-tokens.mjs', file).status, 0);

  assert.equal(run('color-system', 'color-ramp.mjs', 'not-a-color').status, 2);
});

test('contrast: exit code reflects whether declared pairs pass', (t) => {
  assert.equal(run('color-system', 'contrast.mjs', '#1a1a1a', '#ffffff').status, 0);
  assert.equal(run('color-system', 'contrast.mjs', '#999999', '#ffffff').status, 1);

  const colors = { ink: '#1a1a1a', paper: '#ffffff', faint: '#999999' };
  const passing = tempFile(t, 'ok.json', { colors, pairs: [{ foreground: 'ink', background: 'paper', use: 'text' }] });
  const failing = tempFile(t, 'bad.json', { colors, pairs: [{ foreground: 'faint', background: 'paper', use: 'text' }] });
  const matrix = tempFile(t, 'matrix.json', { colors });
  assert.equal(run('color-system', 'contrast.mjs', '--palette', passing).status, 0);
  assert.equal(run('color-system', 'contrast.mjs', '--palette', failing).status, 1);
  assert.equal(run('color-system', 'contrast.mjs', '--palette', matrix).status, 0);
});

test('type-scale: steps follow the ratio', () => {
  const result = run('typography-system', 'type-scale.mjs', '--base', '16', '--ratio', '1.25', '--json');
  const { steps } = JSON.parse(result.stdout);
  const byName = Object.fromEntries(steps.map((step) => [step.name, step]));
  assert.equal(byName.base.px, 16);
  assert.equal(byName.lg.px, 20);
  assert.equal(byName.xl.px, 25);
  assert.equal(run('typography-system', 'type-scale.mjs', '--ratio', '0.9').status, 2);
});

test('validate-tokens: accepts the example and rejects format violations', (t) => {
  const example = join(ROOT, 'skills', 'design-tokens', 'assets', 'example.tokens.json');
  assert.equal(run('design-tokens', 'validate-tokens.mjs', example).status, 0);

  const bad = tempFile(t, 'bad.tokens.json', {
    color: {
      $type: 'color',
      'hex-string': { $value: '#ff0000' },
      dangling: { $value: '{color.missing}' },
      mismatch: { $value: { colorSpace: 'srgb', components: [1, 0, 1], hex: '#ff00fe' } },
    },
    untyped: { $value: 3 },
    size: { $type: 'dimension', $value: { value: 1, unit: 'em' } },
  });
  const result = run('design-tokens', 'validate-tokens.mjs', bad);
  assert.equal(result.status, 1);
  for (const expected of [/not a string like/, /unknown token/, /does not match components/, /no \$type/, /px or rem/]) {
    assert.match(result.stdout, expected);
  }
});

test('export-tokens: references become var() in CSS and resolved values in JSON', () => {
  const example = join(ROOT, 'skills', 'design-tokens', 'assets', 'example.tokens.json');
  const css = run('design-tokens', 'export-tokens.mjs', example, '--prefix', 'brand').stdout;
  assert.match(css, /^:root \{/);
  assert.match(css, /--brand-color-text-default: var\(--brand-color-neutral-900\);/);
  assert.match(css, /--brand-space-4: 1rem;/);

  const flat = JSON.parse(run('design-tokens', 'export-tokens.mjs', example, '--format', 'json').stdout);
  assert.equal(flat['color.text.default'], flat['color.neutral.900']);
  assert.match(flat['color.text.default'], /^#[0-9a-f]{6}$/);
});

test('logo-sheet: builds a review sheet and strips script from the SVG', (t) => {
  const svg = tempFile(t, 'concept.svg', '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><rect width="10" height="10"/></svg>');
  const out = join(svg, '..', 'review.html');
  const result = run('logo-direction', 'logo-sheet.mjs', svg, '--out', out);
  assert.equal(result.status, 0);

  const html = readFileSync(out, 'utf8');
  assert.equal(html.match(/<figure/g).length, 7, 'four large views and three small sizes');
  assert.ok(!html.includes('alert('), 'scripts and event handlers are removed');
  assert.ok(!html.includes('rel="stylesheet"'), 'no stylesheet unless asked');
  run('logo-direction', 'logo-sheet.mjs', svg, '--out', out, '--font-css', 'https://fonts.example/css?family=Brand');
  assert.match(readFileSync(out, 'utf8'), /<link rel="stylesheet" href="https:\/\/fonts\.example\/css\?family=Brand">/);
  assert.equal(run('logo-direction', 'logo-sheet.mjs').status, 2);
});

test('scan-colors: reports colors that are not in the allowed file', (t) => {
  const allowed = tempFile(t, 'palette.json', { colors: { primary: '#2563EB', paper: '#ffffff' } });
  const clean = tempFile(t, 'clean.css', 'a{color:#2563eb;background:#fff}');
  const dirty = tempFile(t, 'dirty.css', 'a{color:#ff0000}\n.b{fill:rgb(1,2,3)}');

  assert.equal(run('brand-review', 'scan-colors.mjs', '--allowed', allowed, clean).status, 0);
  const result = run('brand-review', 'scan-colors.mjs', '--allowed', allowed, dirty);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /#ff0000 {2}used 1 time/);
  assert.match(result.stdout, /dirty\.css:1/);
  assert.match(result.stdout, /1 color function call/);
  assert.equal(run('brand-review', 'scan-colors.mjs', clean).status, 2);
});

test('render-assets: validates the manifest and reports readiness without writing', (t) => {
  const svg = tempFile(t, 'symbol.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
  const dir = join(svg, '..');
  const manifest = join(dir, 'manifest.json');
  writeFileSync(manifest, JSON.stringify({ assets: [{ name: 'icon', source: 'symbol.svg', width: 64, height: 64 }] }));

  // Whether a renderer exists depends on the machine: 0 means ready, 3 means none found.
  const check = run('brand-asset-kit', 'render-assets.mjs', manifest, '--check');
  assert.ok([0, 3].includes(check.status));
  assert.match(check.stdout, /icon\.png {2}64x64 {2}from svg/);
  assert.ok(!existsSync(join(dir, 'exports')), '--check writes nothing');

  const missing = tempFile(t, 'bad.json', { assets: [{ name: 'icon', source: 'nope.svg', width: 64, height: 64 }] });
  assert.equal(run('brand-asset-kit', 'render-assets.mjs', missing).status, 2);
  const badSize = tempFile(t, 'bad2.json', { assets: [{ name: 'icon', source: 'bad2.json', width: 0, height: 64 }] });
  assert.equal(run('brand-asset-kit', 'render-assets.mjs', badSize).status, 2);
});

test('palette-preview: shows each candidate with its pair results', (t) => {
  const palette = { colors: { background: '#ffffff', text: '#1a1a1a', action: '#999999', 'on-action': '#ffffff' }, pairs: [{ foreground: 'text', background: 'background', use: 'text' }, { foreground: 'on-action', background: 'action', use: 'text' }] };
  const first = tempFile(t, 'one.palette.json', palette);
  const second = tempFile(t, 'two.palette.json', palette);
  const out = join(first, '..', 'preview.html');

  const result = run('color-system', 'palette-preview.mjs', first, second, '--out', out, '--heading', 'Real <headline>');
  assert.equal(result.status, 0);
  const html = readFileSync(out, 'utf8');
  assert.equal(html.match(/<section/g).length, 2);
  assert.match(html, /Real &lt;headline&gt;/);
  assert.match(html, /text on background<\/td><td>17\.40:1<\/td><td>pass/);
  assert.match(html, /on-action on action<\/td><td>2\.85:1<\/td><td><b>FAIL<\/b>/);

  const noRoles = tempFile(t, 'bad.palette.json', { colors: { bg: '#ffffff', ink: '#000000' } });
  assert.equal(run('color-system', 'palette-preview.mjs', noRoles).status, 2);
});

test('type-preview: one column per family, with the stylesheet and escaped text', (t) => {
  const out = join(tempFile(t, 'placeholder.txt', ''), '..', 'type.html');
  const result = run('typography-system', 'type-preview.mjs', '--font', 'Family One', '--font', 'Family Two', '--font-css', 'https://fonts.example/css?family=One', '--heading', '¿Qué <tal>?', '--out', out);
  assert.equal(result.status, 0);
  const html = readFileSync(out, 'utf8');
  assert.equal(html.match(/<section/g).length, 2);
  assert.match(html, /font-family:'Family One',sans-serif/);
  assert.match(html, /<link rel="stylesheet" href="https:\/\/fonts\.example\/css\?family=One">/);
  assert.match(html, /¿Qué &lt;tal&gt;\?/);

  assert.equal(run('typography-system', 'type-preview.mjs', '--heading', 'no fonts').status, 2);
  assert.equal(run('typography-system', 'type-preview.mjs', '--font', 'X', '--ratio', '1').status, 2);
});
