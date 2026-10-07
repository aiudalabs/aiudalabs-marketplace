import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT } from '../lib/components.mjs';
import {
  assignWaves, checkProject, globCovers, globsOverlap, matches, mergedIds, nextWave, parseDecisions, parseIssues,
  parseRequirements, parseRoster, parseScreens, readProject, toCsv, toGithubScript, writeWavesInto,
} from '../skills/spec-guard/scripts/lib.mjs';

const SKILL = join(ROOT, 'skills/spec-guard');
const EXAMPLE = join(SKILL, 'assets/example');
const SCRIPTS = join(SKILL, 'scripts');
const codes = (problems, level = 'error') => problems.filter((problem) => problem.level === level).map((problem) => problem.code);

function copyExample(t) {
  const dir = mkdtempSync(join(tmpdir(), 'spec-guard-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  cpSync(join(EXAMPLE, 'docs'), join(dir, 'docs'), { recursive: true });
  return dir;
}

const edit = (dir, file, from, to) => {
  const path = join(dir, 'docs', file);
  const text = readFileSync(path, 'utf8');
  assert.ok(text.includes(from), `fixture text not found: ${from}`);
  writeFileSync(path, text.replace(from, to));
};

const run = (args, cwd, input) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8', input });
const hasGit = spawnSync('git', ['--version']).status === 0;

test('globs: matching, overlap and coverage', () => {
  assert.ok(matches('apps/**', 'apps/player/lib/main.dart'));
  assert.ok(matches('functions/src/*.ts', 'functions/src/index.ts'));
  assert.ok(!matches('functions/src/*.ts', 'functions/src/callable/a.ts'));
  assert.ok(matches('docs/', 'docs/PRD.md'));
  assert.ok(matches('firestore.rules', './firestore.rules'));

  assert.ok(globsOverlap('apps/**', 'apps/player/x.dart'));
  assert.ok(globsOverlap('functions/**', 'functions/src/*.ts'));
  assert.ok(!globsOverlap('apps/player/**', 'apps/owner/**'));
  assert.ok(!globsOverlap('src/*.ts', 'src/*.dart'));

  assert.ok(globCovers('apps/**', 'apps/player/lib/**'));
  assert.ok(globCovers('functions/**', 'functions/src/a.ts'));
  assert.ok(!globCovers('apps/player/**', 'apps/**'));
  assert.ok(!globCovers('functions/src/*.ts', 'functions/**'));
});

test('decisions: D-xx headings, the older "Decision N:" form, deferred and the profile', () => {
  const { decisions, profile } = parseDecisions('**Stack profile:** `aiuda-flutter-firebase`\n\n## D-01 — Pay at confirmation\n\n## Decision 2: Free cancellation\n\n## D-11 — Loyalty (deferred)\n');
  assert.deepEqual([...decisions.keys()], ['D-01', 'D-02', 'D-11']);
  assert.equal(decisions.get('D-02').title, 'Free cancellation');
  assert.ok(decisions.get('D-11').deferred);
  assert.equal(profile, 'flutter-firebase');
  const withProfile = parseDecisions('## D-01 — Stack\n\n**Stack profile:** fastapi-react\n\n## D-02 — Other\n');
  assert.ok(withProfile.decisions.get('D-01').locksProfile, 'the profile decision is implemented by the scaffold');
  assert.ok(!withProfile.decisions.get('D-02').locksProfile);
  assert.deepEqual(parseDecisions('## D-01 — a\n## D-01 — b\n').problems.map((p) => p.code), ['duplicate-decision']);
});

test('requirements and roster', () => {
  const { requirements } = parseRequirements('### FR-ORDER-1 — Place an order\n### FR-12 — Legacy id\n#### FR-PAY-2 — Refunds (deferred)\n### FR-CHECK-IN-3 — Check in\n');
  assert.deepEqual([...requirements.keys()], ['FR-ORDER-1', 'FR-12', 'FR-PAY-2', 'FR-CHECK-IN-3']);
  assert.ok(requirements.get('FR-PAY-2').deferred);

  const { agents, problems } = parseRoster('## flutter-dev\n\n**Owns:** `apps/**`, `packages/ui/**`\n\n## qa-tester\n\n**Owns:** none\n\n## react-dev — admin\n\nNo lane line.\n');
  assert.deepEqual(agents.get('flutter-dev').owns, ['apps/**', 'packages/ui/**']);
  assert.ok(agents.get('qa-tester').reviewOnly);
  assert.deepEqual(problems.map((p) => p.code), ['roster-no-lane']);
});

test('issues: the frontmatter subset, criteria and goal', () => {
  const { issues, problems } = parseIssues([
    '# Sprint 1 — Setup', '', '## S1-01 — Do it', '---', 'id: S1-01', 'sprint: 1', 'owner: "firebase-dev"  # comment',
    'files_touched:', '  - functions/a.ts   # the function', 'depends_on: []', 'decision_refs: [D-01, D-02]', 'requirement_refs: FR-1',
    'autonomous: false', '---', '**Objetivo:** Algo.', '', '### Acceptance criteria', '1. One', '2. Two', '',
  ].join('\n'));
  assert.deepEqual(problems, []);
  const [issue] = issues;
  assert.equal(issue.data.owner, 'firebase-dev');
  assert.deepEqual(issue.files, ['functions/a.ts']);
  assert.deepEqual(issue.data.decision_refs, ['D-01', 'D-02']);
  assert.deepEqual(issue.data.requirement_refs, ['FR-1']);
  assert.equal(issue.data.autonomous, false);
  assert.equal(issue.criteria, 2);
  assert.ok(issue.hasGoal);
  assert.equal(issue.sprintHeading.theme, 'Setup');
});

test('the example project passes check --strict', () => {
  const problems = checkProject(readProject(EXAMPLE), { strict: true });
  assert.deepEqual(problems, []);
});

test('waves: dependencies and shared files push issues to later waves, per sprint', () => {
  const issue = (id, deps, files) => ({ id, sprint: Number(id[1]), deps, files });
  const { waves, stuck } = assignWaves([
    issue('S1-01', [], ['a.ts']), issue('S1-02', [], ['a.ts']), issue('S1-03', ['S1-01'], ['b.ts']), issue('S2-01', ['S1-03'], ['c.ts']),
  ]);
  assert.deepEqual(Object.fromEntries(waves), { 'S1-01': 1, 'S1-02': 2, 'S1-03': 2, 'S2-01': 1 });
  assert.deepEqual(stuck, []);
  const cycle = assignWaves([issue('S1-01', ['S1-02'], ['a']), issue('S1-02', ['S1-01'], ['b'])]);
  assert.deepEqual(cycle.stuck, ['S1-01', 'S1-02']);
});

test('waves --write sets wave: and keeps the rest of the file', () => {
  const text = '## S1-01 — A\n---\nid: S1-01\nsprint: 1\nowner: x\n---\nbody\n\n## S1-02 — B\n---\nid: S1-02\nwave: 9\n---\n';
  const written = writeWavesInto(text, new Map([['S1-01', 1], ['S1-02', 2]]));
  assert.match(written, /sprint: 1\nwave: 1\nowner: x/);
  assert.match(written, /id: S1-02\nwave: 2\n/);
  assert.ok(written.includes('body'));
});

test('check: each kind of mistake is reported', (t) => {
  const cases = [
    ['unknown-owner', 'ISSUES.md', 'owner: flutter-dev\nfiles_touched:\n  - apps/player/lib/courts', 'owner: mobile-dev\nfiles_touched:\n  - apps/player/lib/courts'],
    ['outside-lane', 'ISSUES.md', '  - apps/player/lib/courts/court_list.dart', '  - functions/src/sneaky.ts'],
    ['review-only-owner', 'ISSUES.md', 'owner: flutter-dev\nfiles_touched:\n  - apps/player/lib/courts', 'owner: qa-tester\nfiles_touched:\n  - apps/player/lib/courts'],
    ['lanes-overlap', 'AGENT_ROSTER.md', '**Owns:** `apps/**`, `packages/ui/**`', '**Owns:** `apps/**`, `functions/src/**`'],
    ['unknown-dependency', 'ISSUES.md', 'depends_on: [S1-01]', 'depends_on: [S1-09]'],
    ['later-dependency', 'ISSUES.md', 'id: S1-02\nsprint: 1\nwave: 1\nowner: flutter-dev\nfiles_touched:\n  - apps/player/lib/courts/court_list.dart\ndepends_on: []', 'id: S1-02\nsprint: 1\nwave: 1\nowner: flutter-dev\nfiles_touched:\n  - apps/player/lib/courts/court_list.dart\ndepends_on: [S2-04]'],
    ['unknown-decision', 'ISSUES.md', 'decision_refs: [D-02, D-03]', 'decision_refs: [D-02, D-09]'],
    ['unknown-requirement', 'ISSUES.md', 'requirement_refs: [FR-BOOKING-2]', 'requirement_refs: [FR-BOOKING-9]'],
    ['missing-field', 'ISSUES.md', 'requirement_refs: [FR-BOOKING-3]\n', ''],
    ['no-criteria', 'ISSUES.md', '1. Refunds in full more than 24 hours ahead, nothing later.', 'Refunds.'],
    ['wave-mismatch', 'ISSUES.md', 'id: S2-02\nsprint: 2\nwave: 2', 'id: S2-02\nsprint: 2\nwave: 1'],
    ['dependency-cycle', 'ISSUES.md', 'depends_on: [S2-01]\ndecision_refs: [D-01, D-03]', 'depends_on: [S2-03]\ndecision_refs: [D-01, D-03]'],
  ];
  for (const [code, file, from, to] of cases) {
    const dir = copyExample(t);
    if (code === 'dependency-cycle') edit(dir, 'ISSUES.md', 'depends_on: [S2-01]\ndecision_refs: [D-02, D-03]', 'depends_on: [S2-02]\ndecision_refs: [D-02, D-03]');
    edit(dir, file, from, to);
    assert.ok(codes(checkProject(readProject(dir))).includes(code), `${code}: ${JSON.stringify(checkProject(readProject(dir)))}`);
  }
});

test('check: uncovered decisions warn, and fail with --strict', (t) => {
  const dir = copyExample(t);
  edit(dir, 'OPINIONATED_DEFAULTS.md', '## D-04 — Loyalty points (deferred)', '## D-04 — Loyalty points');
  const project = readProject(dir);
  assert.deepEqual(codes(checkProject(project), 'warning'), ['uncovered-decision']);
  assert.deepEqual(codes(checkProject(project, { strict: true })), ['uncovered-decision']);
  edit(dir, 'OPINIONATED_DEFAULTS.md', '## D-04 — Loyalty points', '## D-04 — Loyalty points (existing)');
  assert.deepEqual(checkProject(readProject(dir), { strict: true }), [], 'a decision the code already implements needs no issue');
});

test('progress: merged issues come from commit subjects, and the next wave waits for dependencies', () => {
  const project = readProject(EXAMPLE);
  const merged = mergedIds(['S1-01 task-1: types [refs: D-03]', 'Merge branch wt/S1-01', 'chore: start']);
  assert.deepEqual([...merged], ['S1-01']);
  const { waves } = assignWaves(project.issues);
  const next = nextWave(project.issues, waves, merged);
  assert.equal(next.sprint, 1);
  assert.deepEqual(next.ready.map((issue) => issue.id), ['S1-02']);
  const later = nextWave(project.issues, waves, new Set(['S1-01', 'S1-02']));
  assert.deepEqual([later.sprint, later.wave, later.ready.map((i) => i.id)], [2, 1, ['S2-01']]);
});

test('exports: CSV quotes every cell and the GitHub script only runs gh after review', () => {
  const { issues } = readProject(EXAMPLE);
  const csv = toCsv(issues);
  assert.match(csv, /^"Summary","Description","Issue Type","Sprint","Labels","Depends On"\n/);
  assert.match(csv, /"S2-02 confirmBooking callable with payment"/);
  const script = toGithubScript(issues);
  assert.match(script, /^#!\/usr\/bin\/env bash/);
  assert.match(script, /gh label create 'agent:firebase-dev'/);
  assert.match(script, /create 'S2-04' 'Booking screen' 'Sprint 2 — Booking flow' 'sprint-2,agent:flutter-dev'/);
});

test('spec.mjs: check exit codes, and export refuses a backlog with errors', (t) => {
  const ok = run([join(SCRIPTS, 'spec.mjs'), 'check', '--strict', '--root', EXAMPLE]);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const dir = copyExample(t);
  edit(dir, 'ISSUES.md', 'owner: flutter-dev\nfiles_touched:\n  - apps/player/lib/courts', 'owner: ghost\nfiles_touched:\n  - apps/player/lib/courts');
  assert.equal(run([join(SCRIPTS, 'spec.mjs'), 'check', '--root', dir]).status, 1);
  const exported = run([join(SCRIPTS, 'spec.mjs'), 'export', 'csv', '--root', dir]);
  assert.equal(exported.status, 2);
  assert.match(exported.stderr, /error/);
});

test('check runs before there is a backlog, on the documents that exist', (t) => {
  const dir = copyExample(t);
  rmSync(join(dir, 'docs/ISSUES.md'));
  assert.deepEqual(checkProject(readProject(dir), { strict: true }), [], 'decisions, PRD and roster alone are fine');
  const ok = run([join(SCRIPTS, 'spec.mjs'), 'check', '--strict', '--root', dir]);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /No backlog yet/);
  edit(dir, 'PRD.md', '- Given a free slot', '- Serves D-09. Given a free slot');
  assert.deepEqual(codes(checkProject(readProject(dir))), ['unknown-decision'], 'a PRD citing a decision that does not exist');
  assert.equal(run([join(SCRIPTS, 'spec.mjs'), 'impact', 'D-01', '--root', dir]).status, 2, 'impact still needs a backlog');
});

test('check: the brief headings and the jobs the PRD traces', (t) => {
  const dir = copyExample(t);
  const headings = ['Tagline', 'Apps', 'Market', 'User groups', 'Core value loop', 'Personas and jobs', 'Adversarial analysis', 'Do-not-build list'];
  const brief = headings.map((name, i) => `## ${i + 1}. ${name}\n\n${name === 'Personas and jobs' ? '| J-ANA-1 | Book a court |\n| J-ANA-2 | Cancel |\n' : 'Text.\n'}`).join('\n');
  writeFileSync(join(dir, 'docs/PRODUCT_BRIEF.md'), `# Product Brief — Courts\n\n${brief}`);
  edit(dir, 'PRD.md', '- Given a free slot', '- Traces J-ANA-1. Given a free slot');
  edit(dir, 'PRD.md', '- Given a `requested` booking', '- Traces J-ANA-2 and J-BOB-1. Given a `requested` booking');
  assert.deepEqual(codes(checkProject(readProject(dir))), ['unknown-job'], 'J-BOB-1 is not in the brief');
  edit(dir, 'PRD.md', ' and J-BOB-1', '');
  assert.deepEqual(checkProject(readProject(dir), { strict: true }), []);
  edit(dir, 'PRD.md', 'Traces J-ANA-2. ', '');
  assert.deepEqual(codes(checkProject(readProject(dir), { strict: true })), ['uncovered-job']);
  writeFileSync(join(dir, 'docs/PRODUCT_BRIEF.md'), '# Brief\n\n## Tagline\n\nOld format.\n');
  assert.deepEqual(codes(checkProject(readProject(dir)), 'warning'), ['brief-format'], 'an old brief only warns');
});

test('check: other documents may only cite decisions and requirements that exist', (t) => {
  const dir = copyExample(t);
  writeFileSync(join(dir, 'docs/FIREBASE_SCHEMA.md'), '# Schema\n\nBookings serve FR-BOOKING-1 and D-03.\n\n```\nexample D-99\n```\n');
  assert.deepEqual(checkProject(readProject(dir)), []);
  writeFileSync(join(dir, 'docs/UI_SCREENS.md'), '# Screens\n\nServes FR-BOOKING-7 under D-42.\n');
  const found = checkProject(readProject(dir));
  assert.deepEqual(found.map((p) => [p.code, p.where]), [['dangling-ref', 'docs/UI_SCREENS.md:3'], ['dangling-ref', 'docs/UI_SCREENS.md:3']]);
});

test('check: an id a document proposes with (proposed) warns instead of dangling', (t) => {
  const dir = copyExample(t);
  const write = (text) => writeFileSync(join(dir, 'docs/ARCHITECTURE.md'), text);
  write('# Architecture\n\n## 15. Changes to earlier documents\n\n1. PRD: add `FR-AUTH-3` (proposed) for account deletion.\n2. Decisions: a new D-13 (proposed), recorded by the vendor spike.\n');
  const found = checkProject(readProject(dir), { strict: true });
  assert.deepEqual(found.map((p) => [p.level, p.code, p.where]), [
    ['warning', 'proposed-id', 'docs/ARCHITECTURE.md:5'],
    ['warning', 'proposed-id', 'docs/ARCHITECTURE.md:6'],
  ], 'open proposals pass even under --strict');
  assert.match(found[0].message, /FR-AUTH-3 is proposed \(docs\/ARCHITECTURE\.md:5\) and not yet in docs\/PRD\.md/);

  writeFileSync(join(dir, 'docs/FIREBASE_SCHEMA.md'), '# Schema\n\n`deleteAccount` serves FR-AUTH-3.\n');
  const relied = checkProject(readProject(dir));
  assert.deepEqual(codes(relied, 'warning'), ['proposed-id', 'proposed-id'], 'an unmarked citation of a proposed id only warns');
  assert.match(relied[0].message, /cited without \(proposed\) at docs\/FIREBASE_SCHEMA\.md:3/);
  assert.deepEqual(codes(checkProject(readProject(dir), { strict: true })), ['proposed-id'], '--strict fails when another line relies on it');

  write('# Architecture\n\nServes FR-AUTH-4 and D-14 (proposed).\n');
  writeFileSync(join(dir, 'docs/FIREBASE_SCHEMA.md'), '# Schema\n');
  assert.deepEqual(codes(checkProject(readProject(dir))), ['dangling-ref'], 'the marker covers only the id it follows');

  write('# Architecture\n\nAdds FR-BOOKING-1 (proposed).\n');
  assert.deepEqual(checkProject(readProject(dir), { strict: true }), [], 'once defined, a proposal is silent');
});

const SCREEN = (id, title, { anchor = id, blocks = ['Header', 'Body', 'Primary CTA', 'Navigation', 'Data', 'Permissions'], nav = 'Back: 1.1' } = {}) => [
  anchor && `<a id="s-${anchor}"></a>`, `### ${id} — ${title}`, '',
  ...blocks.map((block) => (block === 'Navigation' ? `**Navigation**\n- ${nav}\n` : block === 'Data' ? '- **Data:** reads courts. Serves: FR-BOOKING-1.\n' : `**${block}**\n- None. Price [COPY: "$12.50 por 1.5 h"], cold start < 2.5 s.\n`)),
].filter(Boolean).join('\n');

const UI_SCREENS = [
  '# UI Screens — Courts', '', '## 1. Apps inventory', '', 'Version 3.22.0 of Flutter.', '',
  '## App 1 — player-app', '', '### Navigation graph — player-app', '', 'Entry points: Home (1.1).', '', '```',
  'Home (1.1)', '  → Court (1.2.1)          tap', '  → Auth (1.3.x)           signed out', '```', '',
  SCREEN('1.1', 'Home', { nav: 'Tab bar. Card tap → 1.2.1' }),
  SCREEN('1.2.1', 'Court'),
  SCREEN('1.3.1', 'Sign-in'),
  '## Key screens', '', '| 1.2.1 Court | The detail view | mockup: mockups/player-app.html#s-1.2.1 |', '',
].join('\n');

test('screens: anchors, the six blocks and navigation targets', () => {
  const { screens, refs, apps, problems } = parseScreens(UI_SCREENS);
  assert.deepEqual(problems, []);
  assert.deepEqual([...screens.keys()], ['1.1', '1.2.1', '1.3.1']);
  assert.equal(screens.get('1.2.1').app, 'player-app');
  assert.equal(screens.get('1.2.1').blocks.size, 6);
  assert.deepEqual(Object.fromEntries(apps), { 1: 'player-app' });
  assert.deepEqual([...new Set(refs.map((ref) => ref.id))].sort(), ['1.1', '1.2.1', '1.3.x'], 'prices, sizes and versions are not screen ids');
});

test('check: docs/UI_SCREENS.md, the links into it and the mockups', (t) => {
  const dir = copyExample(t);
  const write = (text) => writeFileSync(join(dir, 'docs/UI_SCREENS.md'), text);
  write(UI_SCREENS);
  assert.deepEqual(checkProject(readProject(dir), { strict: true }), [], 'no mockups yet is fine');

  write(UI_SCREENS + SCREEN('1.2.1', 'Court again'));
  assert.deepEqual(codes(checkProject(readProject(dir))), ['duplicate-screen']);
  write(UI_SCREENS.replace('<a id="s-1.3.1"></a>', '<a id="s-1.3.2"></a>'));
  assert.deepEqual(codes(checkProject(readProject(dir))), ['screen-anchor-mismatch']);
  write(UI_SCREENS.replace('<a id="s-1.3.1"></a>\n', ''));
  assert.deepEqual(codes(checkProject(readProject(dir)), 'warning'), ['screen-no-anchor']);
  write(UI_SCREENS.replace('**Permissions**\n- None. Price [COPY: "$12.50 por 1.5 h"], cold start < 2.5 s.\n\n<a id="s-1.2.1">', '<a id="s-1.2.1">'));
  const blocks = checkProject(readProject(dir));
  assert.deepEqual(blocks.map((p) => [p.level, p.code, p.where]), [['warning', 'screen-blocks', 'docs/UI_SCREENS.md:20']]);
  assert.match(blocks[0].message, /screen 1\.1 has no Permissions block/);

  for (const [from, to] of [['  → Court (1.2.1)', '  → Court (1.2.9)'], ['Card tap → 1.2.1', 'Card tap → 1.4.1'], ['Back: 1.1\n', 'Back: 7.1\n'], ['(1.3.x)', '(1.4.x)']]) {
    write(UI_SCREENS.replace(from, to));
    assert.deepEqual(codes(checkProject(readProject(dir))), ['unknown-screen'], to);
  }
  write(UI_SCREENS.replaceAll('Serves: FR-BOOKING-1.', 'Serves: FR-BOOKING-8.'));
  assert.deepEqual(codes(checkProject(readProject(dir))).filter((code) => code === 'dangling-ref').length, 3, 'FR ids are checked as citations, once per line');

  write(UI_SCREENS.replace('mockups/player-app.html#s-1.2.1', 'mockups/player-app.html#s-1.2.2'));
  assert.deepEqual(codes(checkProject(readProject(dir))), ['unknown-screen']);
  write(UI_SCREENS.replace('mockups/player-app.html#s-1.2.1', 'mockups/owner-app.html#s-1.2.1'));
  assert.deepEqual(codes(checkProject(readProject(dir)), 'warning'), ['mockup-app']);
  write(UI_SCREENS);
  edit(dir, 'ISSUES.md', '---\n**Objetivo:**', 'reads:\n  - docs/UI_SCREENS.md#s-1.9.9\n---\n**Objetivo:**');
  const issueLink = checkProject(readProject(dir));
  assert.deepEqual(issueLink.map((p) => p.code), ['unknown-screen']);
  assert.match(issueLink[0].where, /^docs\/ISSUES\.md:\d+$/);
  edit(dir, 'ISSUES.md', '#s-1.9.9', '#s-1.2.1');

  mkdirSync(join(dir, 'mockups'));
  writeFileSync(join(dir, 'mockups/player-app.html'), '<section id="s-1.1"></section>');
  assert.deepEqual(codes(checkProject(readProject(dir)), 'warning'), ['mockup-missing-screen']);
  writeFileSync(join(dir, 'mockups/player-app.html'), '<section id="s-1.2.1"></section>');
  assert.deepEqual(checkProject(readProject(dir), { strict: true }), []);
});

test('install and hooks: commits and agent edits stay inside the active issue', { skip: !hasGit && 'git is not installed' }, (t) => {
  const dir = copyExample(t);
  const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'develop');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  const installed = run([join(SCRIPTS, 'install.mjs'), '--claude', '--ci'], dir);
  assert.equal(installed.status, 0, installed.stderr);
  for (const name of ['lib.mjs', 'spec.mjs', 'guard.mjs']) {
    assert.equal(readFileSync(join(dir, 'tools/spec-guard', name), 'utf8'), readFileSync(join(SCRIPTS, name), 'utf8'), `${name} is copied as is`);
  }
  assert.ok(existsSync(join(dir, '.github/workflows/spec-guard.yml')));
  assert.equal(git('config', '--get', 'core.hooksPath').stdout.trim(), '.githooks');
  assert.equal(git('add', '-A').status, 0);
  assert.equal(git('commit', '-qm', 'chore: start').status, 0);

  git('checkout', '-qb', 'wt/S1-01');
  writeFileSync(join(dir, 'firestore.rules'), 'rules_version = "2";\n');
  git('add', '-A');
  assert.notEqual(git('commit', '-qm', 'update rules').status, 0, 'the subject must start with the issue id');
  assert.equal(git('commit', '-qm', 'S1-01 task-1: deny writes [refs: D-03]').status, 0);

  writeFileSync(join(dir, 'outside.txt'), 'x');
  git('add', '-A');
  const refused = git('commit', '-qm', 'S1-01 task-2: sneak');
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /outside.txt is not in S1-01's files_touched/);
  git('reset', '-q', 'HEAD', 'outside.txt');
  rmSync(join(dir, 'outside.txt'));

  const call = (file) => run([join(dir, 'tools/spec-guard/guard.mjs'), 'pre-tool'], dir, JSON.stringify({ tool_name: 'Edit', cwd: dir, tool_input: { file_path: join(dir, file) } }));
  assert.equal(call('firestore.rules').status, 0);
  const blocked = call('functions/src/index.ts');
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /spec-guard blocked this edit/);

  const verified = run([join(dir, 'tools/spec-guard/spec.mjs'), 'verify', 'S1-01'], dir);
  assert.equal(verified.status, 0, verified.stdout);
  const settings = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8'));
  assert.equal(settings.hooks.PreToolUse.length, 1);
  run([join(SCRIPTS, 'install.mjs'), '--claude'], dir);
  assert.equal(JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8')).hooks.PreToolUse.length, 1, 'installing twice adds the hook once');
});
