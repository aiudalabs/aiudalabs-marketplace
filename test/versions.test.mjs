import assert from 'node:assert/strict';
import { test } from 'node:test';
import { componentOfPath, unbumped } from '../lib/versions.mjs';

const skill = (version) => `---\nname: demo\ndescription: Does demo things.\nmetadata:\n  version: "${version}"\n---\n\nBody.\n`;

test('versions: paths map to the component whose version must move', () => {
  assert.equal(componentOfPath('skills/demo/references/a.md').key, 'skills/demo');
  assert.equal(componentOfPath('workflows/flow/SKILL.md').file, 'workflows/flow/SKILL.md');
  assert.equal(componentOfPath('agents/design/brand-guardian.md').key, 'agents/design/brand-guardian.md');
  assert.equal(componentOfPath('externals/x/external.json').file, 'externals/x/external.json');
  assert.equal(componentOfPath('skills/demo/evals/triggers.json'), null, 'evals alone need no bump');
  assert.equal(componentOfPath('lib/install.mjs'), null);
});

test('versions: a changed component that kept its version is reported', () => {
  const files = {
    base: { 'skills/demo/SKILL.md': skill('1.0.0'), 'skills/bumped/SKILL.md': skill('1.0.0') },
    head: { 'skills/demo/SKILL.md': skill('1.0.0'), 'skills/bumped/SKILL.md': skill('1.1.0'), 'skills/new/SKILL.md': skill('0.1.0') },
  };
  const read = (ref, file) => files[ref === null ? 'head' : 'base'][file] ?? null;
  const changed = ['skills/demo/references/x.md', 'skills/bumped/SKILL.md', 'skills/new/SKILL.md'];
  assert.deepEqual(unbumped(changed, read, { base: 'base' }), [{ key: 'skills/demo', version: '1.0.0' }]);
});
