import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT } from '../lib/components.mjs';
import { banner, colorEnabled, makePainter, stripAnsi, summarize, table, visibleLength, wrapText } from '../bin/ui.mjs';

const cli = (args, env = {}) => spawnSync('node', [join(ROOT, 'bin', 'cli.mjs'), ...args], { encoding: 'utf8', env: { ...process.env, ...env } });

test('color is on for terminals, off for NO_COLOR, --plain and pipes, forced by FORCE_COLOR', () => {
  assert.equal(colorEnabled({ stream: { isTTY: true }, env: {} }), true);
  assert.equal(colorEnabled({ stream: { isTTY: false }, env: {} }), false);
  assert.equal(colorEnabled({ stream: { isTTY: true }, env: { NO_COLOR: '' } }), false);
  assert.equal(colorEnabled({ plain: true, stream: { isTTY: true }, env: {} }), false);
  assert.equal(colorEnabled({ stream: { isTTY: false }, env: { FORCE_COLOR: '1' } }), true);
});

test('widths ignore color codes', () => {
  const paint = makePainter(true);
  const text = paint.bold(paint.accent('hello'));
  assert.notEqual(text, 'hello');
  assert.equal(stripAnsi(text), 'hello');
  assert.equal(visibleLength(text), 5);
});

test('wrapText keeps every line within the width', () => {
  const lines = wrapText('one two three four five six seven eight nine ten eleven twelve', 14);
  assert.ok(lines.length > 1);
  assert.ok(lines.every((line) => line.length <= 14), lines.join('|'));
});

test('summarize keeps the first sentence and cuts long ones with an ellipsis', () => {
  assert.deepEqual(summarize('Short one. Then more text.', 80), ['Short one.']);
  const long = summarize('word '.repeat(80), 20, 2);
  assert.equal(long.length, 2);
  assert.ok(long[1].endsWith('…'));
});

test('banner shows the version and singular or plural counts', () => {
  const lines = banner({ name: 'x', version: '1.2.3', description: 'A catalog.', counts: [['agents', 2, 'agent'], ['externals', 1, 'external']] }, makePainter(false), 100);
  const text = lines.join('\n');
  assert.match(text, /v1\.2\.3/);
  assert.match(text, /2 agents/);
  assert.match(text, /1 external\b/);
  assert.match(text, /█/, 'block letters at a wide width');
  assert.doesNotMatch(banner({ name: 'x', version: '1', description: 'd', counts: [] }, makePainter(false), 40).join('\n'), /█/, 'plain name when narrow');
});

test('table aligns columns', () => {
  const lines = table([{ title: 'A' }, { title: 'B' }], [['long-name', 'text'], ['x', 'more text']], makePainter(false), 60);
  const separators = lines.filter((line) => line.includes('│')).map((line) => line.indexOf('│'));
  assert.equal(new Set(separators).size, 1, lines.join('\n'));
});

test('list: plain output without escape codes, with sections, filters and a hint', () => {
  const result = cli(['list', '--plain']);
  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stdout, /\u001b\[/);
  for (const section of ['AGENTS', 'SKILLS', 'WORKFLOWS', 'EXTERNALS', 'STACKS']) assert.match(result.stdout, new RegExp(`── ${section} \\(\\d+\\)`));
  assert.match(result.stdout, /add <name> --harness <id>/);

  const filtered = cli(['list', 'skills', '--search', 'citation', '--plain']).stdout;
  assert.match(filtered, /citation-audit/);
  assert.doesNotMatch(filtered, /── AGENTS/);

  assert.match(cli(['list', '--search', 'zzzz-nothing', '--plain']).stdout, /Nothing matches/);
  assert.equal(cli(['list', 'widgets']).status, 1);
  assert.doesNotMatch(cli(['list'], { NO_COLOR: '1', FORCE_COLOR: '' }).stdout, /\u001b\[/);
});

test('list --json is machine-readable', () => {
  const data = JSON.parse(cli(['list', 'stacks', '--json']).stdout);
  assert.deepEqual(Object.keys(data), ['stacks']);
  assert.ok(data.stacks.every((stack) => stack.type === 'stack' && stack.name && stack.description));
});
