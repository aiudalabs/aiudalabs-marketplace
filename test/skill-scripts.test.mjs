import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
