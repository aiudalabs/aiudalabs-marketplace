import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { adapters, getAdapter } from '../adapters/index.mjs';
import { loadAll } from '../lib/components.mjs';
import { FrontmatterError, parseFrontmatter, stringifyFrontmatter } from '../lib/frontmatter.mjs';
import { InstallError, applyInstall, expand, planInstall, resolveReference } from '../lib/install.mjs';
import { validateAgent, validateAll, validateSkill } from '../lib/validate.mjs';

const doc = (frontmatter, body = 'Body.') => `---\n${frontmatter}\n---\n\n${body}\n`;
const errorsOf = (issues) => issues.filter((issue) => issue.level === 'error').map((issue) => issue.message);

test('frontmatter: parses scalars, lists, maps and block scalars', () => {
  const { data, body } = parseFrontmatter(doc([
    'name: demo',
    'quoted: "has: colon"',
    "single: 'it''s'",
    'inline: [a, "b c"]',
    'block:',
    '  - one',
    '  - two',
    'metadata:',
    '  version: "0.1.0"',
    'folded: >',
    '  first line',
    '  second line',
  ].join('\n')));

  assert.deepEqual(data, {
    name: 'demo',
    quoted: 'has: colon',
    single: "it's",
    inline: ['a', 'b c'],
    block: ['one', 'two'],
    metadata: { version: '0.1.0' },
    folded: 'first line second line',
  });
  assert.equal(body, 'Body.\n');
});

test('frontmatter: rejects what a real YAML parser would misread', () => {
  assert.throws(() => parseFrontmatter('no frontmatter'), FrontmatterError);
  assert.throws(() => parseFrontmatter('---\nname: demo\n'), FrontmatterError);
  assert.throws(() => parseFrontmatter(doc('description: Use when: something')), FrontmatterError);
  assert.throws(() => parseFrontmatter(doc('name: a\nname: b')), FrontmatterError);
});

test('frontmatter: stringify output parses back to the same data', () => {
  const data = { name: 'demo', description: 'Tricky: "quotes" and # hashes', skills: ['a', 'b'] };
  const parsed = parseFrontmatter(stringifyFrontmatter(data, '# Title\n\nText.'));
  assert.deepEqual(parsed.data, data);
  assert.equal(parsed.body, '# Title\n\nText.\n');
});

function skillFixture(data, body = 'Instructions.') {
  return { type: 'skill', id: 'demo-skill', dir: tmpdir(), path: 'skills/demo-skill', data, body, error: null };
}

test('validateSkill: accepts a spec-compliant skill', () => {
  const skill = skillFixture({ name: 'demo-skill', description: 'Does a thing. Use when asked.', metadata: { version: '1.0.0' } });
  assert.deepEqual(validateSkill(skill, new Set()), []);
});

test('validateSkill: enforces the Agent Skills naming and field rules', () => {
  const badName = (name) => errorsOf(validateSkill(skillFixture({ name, description: 'x', metadata: { version: '1.0.0' } }), new Set()));
  assert.ok(badName('Demo-Skill').length > 0, 'uppercase');
  assert.ok(badName('demo--skill').length > 0, 'consecutive hyphens');
  assert.ok(badName('-demo-skill').length > 0, 'leading hyphen');
  assert.ok(badName('other-name').length > 0, 'does not match folder');

  const tooLong = skillFixture({ name: 'demo-skill', description: 'x'.repeat(1025), metadata: { version: '1.0.0' } });
  assert.match(errorsOf(validateSkill(tooLong, new Set())).join(), /longer than 1024/);

  const unknownField = skillFixture({ name: 'demo-skill', description: 'x', version: '1.0.0', metadata: { version: '1.0.0' } });
  assert.match(errorsOf(validateSkill(unknownField, new Set())).join(), /unknown field `version`/);

  const noVersion = skillFixture({ name: 'demo-skill', description: 'x' });
  assert.match(errorsOf(validateSkill(noVersion, new Set())).join(), /metadata\.version/);

  const brokenLink = skillFixture({ name: 'demo-skill', description: 'x', metadata: { version: '1.0.0' } }, 'See [ref](references/missing-file.md).');
  assert.match(errorsOf(validateSkill(brokenLink, new Set())).join(), /missing file/);

  const examples = skillFixture({ name: 'demo-skill', description: 'x', metadata: { version: '1.0.0' } }, 'Cite as [slug](../research/<strand>/card.md).\n\n```md\n[a](b/missing.md)\n```\n\nOr `[c](d/missing.md)`.');
  assert.deepEqual(errorsOf(validateSkill(examples, new Set())), [], 'placeholders and code are not checked');
});

test('validateSkill: metadata.requires must name other existing skills', () => {
  const withRequires = (requires) => skillFixture({ name: 'demo-skill', description: 'x', metadata: { version: '1.0.0', requires } });
  const known = new Set(['demo-skill', 'other-skill']);
  assert.deepEqual(validateSkill(withRequires('other-skill'), known), []);
  assert.match(errorsOf(validateSkill(withRequires('missing-skill'), known)).join(), /unknown skill, workflow or external "missing-skill"/);
  assert.match(errorsOf(validateSkill(withRequires('demo-skill'), known)).join(), /cannot list the skill itself/);
});

test('expand: a skill brings the skills it requires', () => {
  const components = loadAll();
  const { agents, skills } = expand([resolveReference('skill/startup-positioning-audit', components)], components);
  assert.deepEqual(agents, []);
  assert.deepEqual(skills.map((skill) => skill.id).sort(), ['competitor-research', 'homepage-copy-audit', 'startup-positioning-audit']);
});

test('validateAgent: requires known skills and a matching file name', () => {
  const agent = {
    type: 'agent', id: 'demo-agent', category: 'design', path: 'agents/design/demo-agent.md', error: null, body: 'Persona.',
    data: { name: 'demo-agent', description: 'A persona.', version: '0.1.0', requires: ['missing-skill'] },
  };
  assert.match(errorsOf(validateAgent(agent, new Set())).join(), /unknown skill, workflow or external "missing-skill"/);
  assert.match(errorsOf(validateAgent(agent, new Set(['missing-skill']))).join(), /not named in the body/);
  assert.deepEqual(validateAgent({ ...agent, body: 'Persona. Load `missing-skill` when needed.' }, new Set(['missing-skill'])), []);
});

test('repository components are valid', () => {
  assert.deepEqual(errorsOf(validateAll(loadAll())), []);
});

test('resolveReference: bare, qualified and unknown names', () => {
  const components = loadAll();
  assert.equal(resolveReference('brand-guardian', components).type, 'agent');
  assert.equal(resolveReference('skill/color-system', components).type, 'skill');
  assert.throws(() => resolveReference('nope', components), InstallError);
  assert.throws(() => resolveReference('widget/brand-guardian', components), InstallError);
});

test('expand: an agent brings the skills it requires', () => {
  const components = loadAll();
  const { agents, skills } = expand([resolveReference('agent/brand-guardian', components)], components);
  assert.deepEqual(agents.map((agent) => agent.id), ['brand-guardian']);
  assert.deepEqual(skills.map((skill) => skill.id).sort(), [...agents[0].data.requires].sort());
  assert.ok(skills.length > 1);
});

test('every adapter installs the brand-identity stack into a project', (t) => {
  const components = loadAll();
  const expanded = expand([resolveReference('stack/brand-identity', components)], components);

  for (const adapter of adapters.filter((candidate) => candidate.skillsDir.project)) {
    const baseDir = mkdtempSync(join(tmpdir(), `aiuda-${adapter.id}-`));
    t.after(() => rmSync(baseDir, { recursive: true, force: true }));

    const { operations, skipped } = planInstall(expanded, adapter, { scope: 'project', baseDir });
    assert.deepEqual(skipped, [], adapter.id);
    const results = applyInstall(operations);
    assert.ok(results.every((result) => result.status === 'installed'), adapter.id);
    for (const operation of operations) assert.ok(existsSync(operation.target), `${adapter.id}: ${operation.target}`);

    const skillFile = join(baseDir, adapter.skillsDir.project, 'color-system', 'SKILL.md');
    assert.equal(parseFrontmatter(readFileSync(skillFile, 'utf8')).data.name, 'color-system');
    assert.ok(existsSync(join(baseDir, adapter.skillsDir.project, 'color-system', 'scripts', 'contrast.mjs')), `${adapter.id}: scripts are copied`);

    assert.ok(applyInstall(operations).every((result) => result.status === 'exists'), `${adapter.id}: second run must not overwrite`);
  }
});

test('adapters render agents in each harness format', () => {
  const agent = loadAll().agents.find((candidate) => candidate.id === 'brand-guardian');

  const claude = getAdapter('claude-code').renderAgent(agent);
  assert.equal(claude.fileName, 'brand-guardian.md');
  assert.deepEqual(Object.keys(parseFrontmatter(claude.content).data), ['name', 'description'], 'no `skills` field: it would preload every skill');

  assert.equal(getAdapter('copilot').renderAgent(agent).fileName, 'brand-guardian.agent.md');

  const opencode = parseFrontmatter(getAdapter('opencode').renderAgent(agent).content);
  assert.deepEqual(Object.keys(opencode.data), ['description']);

  const codex = getAdapter('codex').renderAgent(agent);
  assert.equal(codex.fileName, 'brand-guardian.toml');
  assert.match(codex.content, /^name = "brand-guardian"\ndescription = ".+"\ndeveloper_instructions = """\n/);
});

test('osaurus: skills are global only and agents are skipped', () => {
  const components = loadAll();
  const expanded = expand([resolveReference('stack/brand-identity', components)], components);
  const osaurus = getAdapter('osaurus');

  const project = planInstall(expanded, osaurus, { scope: 'project', baseDir: '/unused' });
  assert.equal(project.operations.length, 0);
  assert.equal(project.skipped.length, expanded.skills.length + expanded.agents.length);

  const global = planInstall(expanded, osaurus, { scope: 'global', baseDir: '/home/someone' });
  assert.ok(global.operations.length > 0 && global.operations.every((operation) => operation.kind === 'skill'));
});
