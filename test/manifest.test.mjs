import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { getAdapter } from '../adapters/index.mjs';
import { loadAll } from '../lib/components.mjs';
import { InstallError, applyInstall, expand, planInstall, resolveReference } from '../lib/install.mjs';
import {
  MANIFEST_FILE, classifyUpdate, outdated, planRemoval, readManifest, recordInstall, recordRemoval, resolveTarget, writeManifest,
} from '../lib/manifest.mjs';

const components = loadAll();
const adapter = getAdapter('claude-code');

function install(t, references, baseDir = mkdtempSync(join(tmpdir(), 'aiuda-manifest-'))) {
  t.after(() => rmSync(baseDir, { recursive: true, force: true }));
  const roots = references.map((reference) => resolveReference(reference, components));
  const { operations } = planInstall(expand(roots, components), adapter, { scope: 'project', baseDir });
  const results = applyInstall(operations);
  const manifest = recordInstall(readManifest(baseDir), adapter.id, roots, results, baseDir);
  writeManifest(baseDir, manifest);
  return { baseDir, manifest, operations };
}

test('manifest: add records what it requested and installed, with versions', (t) => {
  const { baseDir, manifest } = install(t, ['brand-identity']);
  const section = readManifest(baseDir).harnesses['claude-code'];
  assert.deepEqual(section.requested, ['stack/brand-identity']);
  assert.equal(section.installed['skill/color-system'].target, '.claude/skills/color-system');
  assert.match(section.installed['skill/color-system'].version, /^\d+\.\d+\.\d+$/);
  assert.equal(section.installed['agent/brand-guardian'].target, '.claude/agents/brand-guardian.md');
  assert.deepEqual(outdated(manifest, 'claude-code', components), []);
});

test('manifest: components that existed before are not tracked', (t) => {
  const baseDir = mkdtempSync(join(tmpdir(), 'aiuda-manifest-'));
  const mine = join(baseDir, '.claude/skills/color-system');
  applyInstall([{ kind: 'agent', id: 'x', content: '', target: join(mine, 'SKILL.md') }]);
  const { manifest } = install(t, ['brand-identity'], baseDir);
  assert.equal(manifest.harnesses['claude-code'].installed['skill/color-system'], undefined);
});

test('applyInstall with force replaces a folder instead of merging into it', (t) => {
  const { operations } = install(t, ['color-system']);
  const target = operations.find((op) => op.id === 'color-system').target;
  writeFileSync(join(target, 'dropped-upstream.md'), 'old');
  applyInstall(operations, { force: true });
  assert.equal(existsSync(join(target, 'dropped-upstream.md')), false);
});

test('update: sorts components into current, upgrade and modified', (t) => {
  const { baseDir, manifest, operations } = install(t, ['brand-identity']);
  const installed = manifest.harnesses['claude-code'].installed;
  installed['skill/color-system'].version = '0.0.1';
  installed['skill/typography-system'].version = '0.0.1';
  appendFileSync(join(baseDir, '.claude/skills/typography-system/SKILL.md'), '\nmy edit\n');

  const states = Object.fromEntries(classifyUpdate(manifest, 'claude-code', operations, { baseDir }).map(({ operation, state }) => [operation.id, state]));
  assert.equal(states['color-system'], 'upgrade');
  assert.equal(states['typography-system'], 'modified');
  assert.equal(states['brand-guardian'], 'current');
  assert.deepEqual(outdated(manifest, 'claude-code', components).map((row) => row.key).sort(), ['skill/color-system', 'skill/typography-system']);
});

test('remove: deletes dependencies only when nothing else needs them', (t) => {
  const { manifest } = install(t, ['brand-identity', 'launch-readiness', 'color-system']);
  const plan = planRemoval(manifest, 'claude-code', [resolveReference('stack/brand-identity', components)], components);
  const removed = plan.remove.map((entry) => entry.key);
  assert.ok(removed.includes('agent/brand-guardian'));
  assert.ok(removed.includes('skill/brand-review'));
  assert.ok(!removed.includes('skill/color-system'), 'still requested on its own');
  assert.ok(!removed.includes('skill/competitor-research'), 'launch-readiness needs it');
  assert.deepEqual(plan.requested, ['stack/launch-readiness', 'skill/color-system']);

  const after = recordRemoval(manifest, 'claude-code', plan);
  assert.equal(after.harnesses['claude-code'].installed['agent/brand-guardian'], undefined);
});

test('remove: refuses dependencies and names that were never added', (t) => {
  const { manifest } = install(t, ['brand-identity']);
  assert.throws(() => planRemoval(manifest, 'claude-code', [resolveReference('color-system', components)], components), /dependency/);
  assert.throws(() => planRemoval(manifest, 'claude-code', [resolveReference('launch-readiness', components)], components), InstallError);
});

test('manifest: paths cannot point outside the base directory', () => {
  assert.throws(() => resolveTarget('/project', '../elsewhere'), InstallError);
  assert.throws(() => resolveTarget('/project', '/etc/passwd'), InstallError);
  assert.throws(() => resolveTarget('/project', '.'), InstallError);
  assert.equal(resolveTarget('/project', '.claude/skills/a'), '/project/.claude/skills/a');
});

test('manifest: the file goes away when nothing is tracked', (t) => {
  const { baseDir, manifest } = install(t, ['color-system']);
  const plan = planRemoval(manifest, 'claude-code', [resolveReference('color-system', components)], components);
  writeManifest(baseDir, recordRemoval(manifest, 'claude-code', plan));
  assert.equal(existsSync(join(baseDir, MANIFEST_FILE)), false);
});

test('manifest: a corrupt file is a user error, not a crash', (t) => {
  const baseDir = mkdtempSync(join(tmpdir(), 'aiuda-manifest-'));
  t.after(() => rmSync(baseDir, { recursive: true, force: true }));
  writeFileSync(join(baseDir, MANIFEST_FILE), '{ nope');
  assert.throws(() => readManifest(baseDir), InstallError);
});
