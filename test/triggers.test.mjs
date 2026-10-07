import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT, loadAll, skillLike } from '../lib/components.mjs';
import { NO_SKILL, collectCases, judge, parseChoice, routingPrompt, summarize, triggerProblems } from '../lib/triggers.mjs';

const item = { id: 'sciwrite' };
const names = new Set(['sciwrite', 'manuscript-revision', 'paper-review', 'humanizer']);
const positive = (query) => ({ query, should_trigger: true });

test('triggers: a well-formed file has no problems', () => {
  const cases = [positive('a'), positive('b'), positive('c'), { query: 'd', should_trigger: false, use_instead: 'paper-review' }, { query: 'e', should_trigger: false }];
  assert.deepEqual(triggerProblems(item, cases, names), []);
});

test('triggers: counts, fields and use_instead are checked', () => {
  const problems = triggerProblems(item, [
    positive('TODO: fill me'),
    { query: '', should_trigger: 'yes' },
    { query: 'x', should_trigger: false, use_instead: 'sciwrite' },
    { query: 'y', should_trigger: false, use_instead: 'ghost' },
    { query: 'z', should_trigger: true, use_instead: 'humanizer', note: 1 },
  ], names).join('\n');
  for (const expected of [/template placeholder/, /`query` must be a non-empty string/, /`should_trigger` must be true or false/,
    /cannot name the component itself/, /unknown skill, workflow or external "ghost"/, /only goes on a case with `should_trigger: false`/,
    /unknown field `note`/, /at least 3 cases with `should_trigger: true` \(has 2\)/]) {
    assert.match(problems, expected);
  }
  assert.deepEqual(triggerProblems(item, {}, names), ['evals/triggers.json must be a list of cases']);
});

test('parseChoice: reads exact names, formatted names and names inside a sentence', () => {
  const all = new Set([...names, NO_SKILL]);
  assert.equal(parseChoice('sciwrite', all), 'sciwrite');
  assert.equal(parseChoice('`Manuscript-Revision`.', all), 'manuscript-revision');
  assert.equal(parseChoice('I would load paper-review, then maybe sciwrite', all), 'paper-review');
  assert.equal(parseChoice('none', all), NO_SKILL);
  assert.equal(parseChoice('no idea', all), NO_SKILL);
});

test('judge and summarize: misses, wrong picks and the confused pairs', () => {
  const results = [
    { component: 'sciwrite', should_trigger: true, chosen: 'sciwrite' },
    { component: 'sciwrite', should_trigger: true, chosen: 'manuscript-revision' },
    { component: 'sciwrite', should_trigger: false, use_instead: 'paper-review', chosen: 'sciwrite' },
    { component: 'humanizer', should_trigger: false, chosen: NO_SKILL },
  ].map((result) => ({ ...result, passed: judge(result, result.chosen) }));
  const summary = summarize(results);
  assert.equal(summary.passed, 2);
  assert.deepEqual(summary.rows[0], { component: 'sciwrite', passed: 1, total: 3, falsePositives: 1, misses: 1 });
  assert.deepEqual(summary.pairs.map((p) => p.pair), ['paper-review -> sciwrite', 'sciwrite -> manuscript-revision']);
});

test('the routing prompt shows every name and description, and the catalog has cases for each', () => {
  const catalog = skillLike(loadAll());
  const prompt = routingPrompt(catalog);
  for (const entry of catalog) assert.ok(prompt.includes(`- ${entry.id}: ${entry.data.description}`));
  const cases = collectCases(catalog.filter((entry) => entry.type !== 'external'));
  const covered = new Set(cases.map((entry) => entry.component));
  assert.equal(covered.size, catalog.filter((entry) => entry.type !== 'external').length);
});

test('eval-triggers --dry-run calls nothing and reports the size of the run', () => {
  const run = spawnSync(process.execPath, [join(ROOT, 'scripts/eval-triggers.mjs'), '--dry-run', '--stack', 'write-article'], { encoding: 'utf8', env: { ...process.env, ANTHROPIC_API_KEY: '' } });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /case\(s\) from \d+ component\(s\), routed among \d+ component\(s\)/);
});
