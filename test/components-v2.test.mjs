import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { getAdapter } from '../adapters/index.mjs';
import { loadAll } from '../lib/components.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { applyInstall, expand, missingTools, planInstall, resolveReference } from '../lib/install.mjs';
import { validateAll } from '../lib/validate.mjs';

const errors = (issues) => issues.filter((issue) => issue.level === 'error').map((issue) => `${issue.path}: ${issue.message}`).join('\n');

function write(root, path, content) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
}

const skillFile = (name, metadata = '', body = 'Instructions.') =>
  `---\nname: ${name}\ndescription: Does ${name}. Use when asked.\nmetadata:\n  version: "0.1.0"\n${metadata}---\n\n${body}\n`;

// Valid trigger evals: three requests for the component, two near misses.
const triggers = (name) => [
  ...['first', 'second', 'third'].map((n) => ({ query: `A ${n} request for ${name}`, should_trigger: true })),
  { query: `Something close to ${name} but not it`, should_trigger: false },
  { query: `Another near miss for ${name}`, should_trigger: false },
];

// A small marketplace on disk: one skill, one workflow, one agent, one external, one stack.
function fixture(t, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'marketplace-v2-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = {
    'skills/humanizer/SKILL.md': skillFile('humanizer', '  requires-tools: "python3 definitely-not-a-real-tool"\n'),
    'workflows/article-author/SKILL.md': skillFile('article-author', '  requires: humanizer cover-art\n  agents: prose-polisher\n  argument-hint: "<topic>"\n', 'Draft, then hand the text to `prose-polisher`.'),
    'agents/writing/prose-polisher.md': '---\nname: prose-polisher\ndescription: Rewrites prose for clarity.\nversion: 0.1.0\nsource: https://github.com/example/agents\nlicense: MIT\n---\n\nYou rewrite prose.\n',
    'externals/cover-art/external.json': { name: 'cover-art', description: 'Designs a cover.', version: '0.1.0', kind: 'skill', repo: 'https://github.com/example/cover-art', commit: 'a'.repeat(40), path: '', license: 'none' },
    'stacks/write-article/stack.json': { name: 'write-article', description: 'Write an article.', version: '0.1.0', workflows: ['article-author'] },
    'skills/humanizer/evals/triggers.json': triggers('humanizer'),
    'workflows/article-author/evals/triggers.json': triggers('article-author'),
    ...overrides,
  };
  for (const [path, content] of Object.entries(files)) if (content !== null) write(root, path, content);
  return { root, components: loadAll(root) };
}

test('a valid marketplace with a workflow, an external and an attributed agent', (t) => {
  const { components } = fixture(t);
  assert.equal(errors(validateAll(components)), '');
  assert.equal(components.workflows.length, 1);
  assert.equal(components.externals.length, 1);
});

test('workflows: agents must exist and be named in the body', (t) => {
  const unknown = fixture(t, { 'workflows/article-author/SKILL.md': skillFile('article-author', '  agents: ghost\n', 'Uses `ghost`.') });
  assert.match(errors(validateAll(unknown.components)), /unknown agent "ghost"/);

  const unnamed = fixture(t, { 'workflows/article-author/SKILL.md': skillFile('article-author', '  agents: prose-polisher\n', 'No mention.') });
  assert.match(errors(validateAll(unnamed.components)), /agent "prose-polisher" is not named in the body/);

  const empty = fixture(t, { 'workflows/article-author/SKILL.md': skillFile('article-author') });
  assert.match(errors(validateAll(empty.components)), /a workflow must list the skills/);
});

test('externals: repo, pinned commit, path and license are checked', (t) => {
  const bad = { name: 'cover-art', description: 'x', version: '0.1.0', kind: 'skill', repo: 'git@github.com:x/y.git', commit: 'main', path: '../outside', license: '' };
  const { components } = fixture(t, { 'externals/cover-art/external.json': bad });
  const found = errors(validateAll(components));
  for (const expected of [/`repo` must be an https URL/, /full 40-character commit/, /must stay inside the repository/, /`license` is required/]) {
    assert.match(found, expected);
  }
});

test('skills, workflows and externals share one namespace', (t) => {
  const { components } = fixture(t, { 'skills/article-author/SKILL.md': skillFile('article-author') });
  assert.match(errors(validateAll(components)), /name "article-author" is already used/);
});

test('agents: source and license go together', (t) => {
  const { components } = fixture(t, { 'agents/writing/prose-polisher.md': '---\nname: prose-polisher\ndescription: x\nversion: 0.1.0\nsource: https://github.com/example/agents\n---\n\nYou rewrite prose.\n' });
  assert.match(errors(validateAll(components)), /`source` and `license` go together/);
});

test('stacks: workflows are listed under "workflows"', (t) => {
  const { components } = fixture(t, { 'stacks/write-article/stack.json': { name: 'write-article', description: 'x', version: '0.1.0', skills: ['article-author'] } });
  assert.match(errors(validateAll(components)), /list workflows under "workflows"/);
});

test('content: no harness-specific paths in any file a skill ships, nor in agents', (t) => {
  const { components } = fixture(t, {
    'skills/humanizer/SKILL.md': skillFile('humanizer', '', 'Run `~/.claude/skills/humanizer/scripts/run.sh`.'),
    'skills/humanizer/references/setup.md': 'Plugins use ${CLAUDE_PLUGIN_ROOT}/scripts.\n',
    'skills/humanizer/scripts/run.sh': 'cd "$HOME/.codex/skills/humanizer"\n',
    'skills/humanizer/THIRD_PARTY_NOTICES.md': 'Upstream installed into ~/.claude/skills/, kept verbatim.\n',
    'agents/writing/prose-polisher.md': '---\nname: prose-polisher\ndescription: x\nversion: 0.1.0\n---\n\nRead ~/.cursor/agents/notes.md first.\n',
  });
  const found = errors(validateAll(components));
  assert.match(found, /SKILL\.md:8 uses the harness-specific path "~\/\.claude\/skills"/);
  assert.match(found, /references\/setup\.md:1 uses the harness-specific path "CLAUDE_PLUGIN_ROOT"/);
  assert.match(found, /scripts\/run\.sh:1 uses the harness-specific path "\$HOME\/\.codex\/skills"/);
  assert.match(found, /body uses the harness-specific path "~\/\.cursor\/agents"/);
  assert.doesNotMatch(found, /THIRD_PARTY_NOTICES/, 'notices are kept verbatim');
});

test('content: links in references must resolve inside the skill folder', (t) => {
  const { components } = fixture(t, {
    'skills/humanizer/SKILL.md': skillFile('humanizer', '', 'See [guide](references/guide.md).'),
    'skills/humanizer/references/guide.md': 'See [sibling](../../other-skill/SKILL.md), [gone](missing.md), [ok](../SKILL.md) and `[text](url)`.\n',
    'skills/humanizer/assets/chapter.md': '![figure](../images/fig.png) is the user\'s file.\n',
  });
  const found = errors(validateAll(components));
  assert.match(found, /references\/guide\.md links outside the skill folder: \.\.\/\.\.\/other-skill\/SKILL\.md/);
  assert.match(found, /references\/guide\.md links to a missing file: missing\.md/);
  assert.doesNotMatch(found, /\.\.\/SKILL\.md|url|assets/);
});

test('agents and skills cannot share a name', (t) => {
  const { components } = fixture(t, { 'agents/writing/humanizer.md': '---\nname: humanizer\ndescription: x\nversion: 0.1.0\n---\n\nYou humanize.\n' });
  assert.match(errors(validateAll(components)), /agent name "humanizer" is also the name of a skill/);
});

test('expand: a stack brings its workflow, the workflow its skills, external and agents', (t) => {
  const { components } = fixture(t);
  const { agents, skills } = expand([resolveReference('stack/write-article', components)], components);
  assert.deepEqual(agents.map((agent) => agent.id), ['prose-polisher']);
  assert.deepEqual(skills.map((item) => `${item.type}/${item.id}`).sort(), ['external/cover-art', 'skill/humanizer', 'workflow/article-author']);
});

test('claude-code lifts metadata.argument-hint; other harnesses leave SKILL.md untouched', (t) => {
  const { components } = fixture(t);
  const expanded = expand([resolveReference('workflow/article-author', components)], components);
  const claude = planInstall(expanded, getAdapter('claude-code'), { scope: 'project', baseDir: '/x' });
  const workflow = claude.operations.find((op) => op.id === 'article-author');
  assert.equal(parseFrontmatter(workflow.skillFile).data['argument-hint'], '<topic>');

  const cursor = planInstall(expanded, getAdapter('cursor'), { scope: 'project', baseDir: '/x' });
  assert.equal(cursor.operations.find((op) => op.id === 'article-author').skillFile, null);
});

test('rendered agents keep their attribution in every format', (t) => {
  const { components } = fixture(t);
  const agent = components.agents[0];
  for (const id of ['claude-code', 'copilot', 'codex', 'opencode']) {
    assert.match(getAdapter(id).renderAgent(agent).content, /Adapted from https:\/\/github\.com\/example\/agents, used under the MIT license\./, id);
  }
});

test('externals install from a git repository at the pinned commit', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'external-repo-'));
  const target = join(mkdtempSync(join(tmpdir(), 'external-target-')), 'cover-art');
  t.after(() => { rmSync(repo, { recursive: true, force: true }); rmSync(dirname(target), { recursive: true, force: true }); });
  const git = (...args) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: repo, encoding: 'utf8' });
  git('init', '--quiet');
  write(repo, 'skills/cover-art/SKILL.md', skillFile('cover-art', '', 'First version.'));
  git('add', '.'); git('commit', '--quiet', '-m', 'one');
  const pinned = git('rev-parse', 'HEAD').stdout.trim();
  write(repo, 'skills/cover-art/SKILL.md', skillFile('cover-art', '', 'Second version.'));
  git('commit', '--quiet', '-am', 'two');

  const [result] = applyInstall([{ kind: 'external', id: 'cover-art', repo, commit: pinned, path: 'skills/cover-art', license: 'none', target }]);
  assert.equal(result.status, 'installed', result.error);
  assert.match(readFileSync(join(target, 'SKILL.md'), 'utf8'), /First version/);
  assert.ok(!existsSync(join(target, '.git')));

  const [missing] = applyInstall([{ kind: 'external', id: 'cover-art', repo, commit: pinned, path: 'nope', license: 'none', target }], { force: true });
  assert.equal(missing.status, 'failed');
  assert.match(missing.error, /no SKILL.md/);
});

test('missingTools reports each missing tool once, with the skills that need it', (t) => {
  const { components } = fixture(t);
  const missing = missingTools(components.skills, (tool) => tool === 'python3');
  assert.deepEqual(missing, [{ tool: 'definitely-not-a-real-tool', neededBy: ['humanizer'] }]);
});
