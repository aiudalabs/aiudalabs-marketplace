import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { ROOT, loadAll } from '../lib/components.mjs';
import { InstallError } from '../lib/install.mjs';
import { SCAFFOLD_KINDS, planScaffold } from '../lib/scaffold.mjs';
import { validateAll } from '../lib/validate.mjs';

const CLI = join(ROOT, 'bin', 'cli.mjs');
const messages = (issues) => issues.filter((issue) => issue.level === 'error').map((issue) => `${issue.path}: ${issue.message}`);

function write(root, path, content) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

// An empty marketplace checkout: the folders exist and nothing is in them.
function emptyCheckout(t) {
  const root = mkdtempSync(join(tmpdir(), 'marketplace-new-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const folder of ['agents', 'skills', 'workflows', 'externals', 'stacks']) mkdirSync(join(root, folder));
  return root;
}

const plan = (kind, name, options = {}) => planScaffold(kind, name, { components: loadAll(), ...options });

test('each kind is written where the loaders look for it', () => {
  const expected = {
    skill: 'skills/meeting-notes/SKILL.md',
    agent: 'agents/operations/meeting-notes.md',
    workflow: 'workflows/meeting-notes/SKILL.md',
    stack: 'stacks/meeting-notes/stack.json',
    external: 'externals/meeting-notes/external.json',
  };
  assert.deepEqual(SCAFFOLD_KINDS, Object.keys(expected));
  for (const kind of SCAFFOLD_KINDS) {
    const { path, content } = plan(kind, 'meeting-notes', { category: 'operations' });
    assert.equal(path, expected[kind]);
    assert.ok(content.includes('meeting-notes'), `${kind} skeleton carries the name`);
    assert.ok(!content.includes('{{'), `${kind} skeleton has no unfilled placeholder`);
  }
  assert.ok(plan('skill', 'meeting-notes').content.includes('# Meeting Notes'));
});

test('a skeleton is refused for a bad kind, a bad name, a missing category or a name in use', () => {
  const refused = (kind, name, options, pattern) => assert.throws(() => plan(kind, name, options), (error) => error instanceof InstallError && pattern.test(error.message));
  refused('prompt', 'meeting-notes', {}, /unknown kind/);
  refused('skill', 'Meeting_Notes', {}, /lowercase/);
  refused('skill', 'a'.repeat(65), {}, /64 characters/);
  refused('agent', 'meeting-notes', {}, /--category/);
  refused('agent', 'meeting-notes', { category: 'Ops Team' }, /category/);
  refused('agent', 'brand-guardian', { category: 'design' }, /already/);
  refused('stack', 'brand-identity', {}, /already/);
  // Skills, workflows and externals share one namespace.
  refused('skill', 'article-author', {}, /already/);
  refused('workflow', 'kindle-cover', {}, /already/);
});

test('an unfilled skeleton does not pass validation', (t) => {
  for (const kind of SCAFFOLD_KINDS) {
    const root = emptyCheckout(t);
    const { path, content, extra } = planScaffold(kind, 'meeting-notes', { category: 'operations', components: loadAll(root) });
    write(root, path, content);
    for (const file of extra) write(root, file.path, file.content);
    const errors = messages(validateAll(loadAll(root)));
    assert.ok(errors.some((message) => message.includes('template placeholder')), `${kind}: ${errors.join('\n')}`);
  }
});

const filledTriggers = JSON.stringify([
  { query: 'Turn this call transcript into notes', should_trigger: true },
  { query: 'Summarize what we decided in standup', should_trigger: true },
  { query: 'Notes from this recording, please', should_trigger: true },
  { query: 'Schedule a meeting for Tuesday', should_trigger: false },
  { query: 'Write minutes for a board meeting that has not happened', should_trigger: false },
]);

test('a skill skeleton comes with trigger evals that fail until filled in', (t) => {
  const root = emptyCheckout(t);
  const { extra } = planScaffold('skill', 'meeting-notes', { components: loadAll(root) });
  assert.deepEqual(extra.map((file) => file.path), ['skills/meeting-notes/evals/triggers.json']);
  assert.ok(JSON.parse(extra[0].content).every((entry) => entry.query.startsWith('TODO')));
  assert.deepEqual(planScaffold('stack', 'meeting-notes', { components: loadAll(root) }).extra, []);
});

test('a skill and an agent skeleton pass once the description and triggers are written', (t) => {
  for (const kind of ['skill', 'agent']) {
    const root = emptyCheckout(t);
    const { path, content, extra } = planScaffold(kind, 'meeting-notes', { category: 'operations', components: loadAll(root) });
    for (const file of extra) write(root, file.path, filledTriggers);
    write(root, path, content.replace(/^description: .*$/m, 'description: Turns a transcript into notes. Use when asked for meeting notes.'));
    assert.deepEqual(messages(validateAll(loadAll(root))), []);
  }
});

test('`new` writes the skeleton into a checkout and refuses anywhere else', (t) => {
  const root = emptyCheckout(t);
  const run = (...args) => spawnSync(process.execPath, [CLI, 'new', ...args], { encoding: 'utf8' });

  const created = run('agent', 'meeting-facilitator', '--category', 'operations', '--dir', root);
  assert.equal(created.status, 0, created.stderr);
  assert.match(created.stdout, /agents\/operations\/meeting-facilitator\.md/);
  assert.match(readFileSync(join(root, 'agents/operations/meeting-facilitator.md'), 'utf8'), /^name: meeting-facilitator$/m);

  const again = run('agent', 'meeting-facilitator', '--category', 'operations', '--dir', root);
  assert.equal(again.status, 1);
  assert.match(again.stderr, /already/);

  const elsewhere = mkdtempSync(join(tmpdir(), 'not-a-marketplace-'));
  t.after(() => rmSync(elsewhere, { recursive: true, force: true }));
  const skill = run('skill', 'meeting-notes', '--dir', root);
  assert.equal(skill.status, 0, skill.stderr);
  assert.ok(existsSync(join(root, 'skills/meeting-notes/evals/triggers.json')));

  const outside = run('skill', 'meeting-notes', '--dir', elsewhere);
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /clone of the marketplace/);
  assert.ok(!existsSync(join(elsewhere, 'skills')));
});
