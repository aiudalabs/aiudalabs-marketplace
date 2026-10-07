// Trigger evals: user requests that should, and near misses that should not,
// make a harness load a skill. Every skill and workflow keeps them in
// evals/triggers.json. scripts/eval-triggers.mjs runs them against a model.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const TRIGGERS_FILE = 'evals/triggers.json';
export const MIN_POSITIVE = 3;
export const MIN_NEGATIVE = 2;
// The answer a router gives when no skill fits.
export const NO_SKILL = 'none';

// Returns { cases } or { error }.
export function readTriggers(item) {
  const file = join(item.dir, TRIGGERS_FILE);
  if (!existsSync(file)) return { error: `${TRIGGERS_FILE} is missing` };
  try {
    return { cases: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (error) {
    return { error: `${TRIGGERS_FILE} is not valid JSON: ${error.message}` };
  }
}

// Checks one component's trigger cases. `names` are the skill-like names a
// negative case may send the request to instead.
export function triggerProblems(item, cases, names) {
  if (!Array.isArray(cases)) return [`${TRIGGERS_FILE} must be a list of cases`];
  const problems = [];
  cases.forEach((entry, index) => {
    const where = `${TRIGGERS_FILE} case ${index + 1}`;
    if (typeof entry?.query !== 'string' || entry.query.trim() === '') problems.push(`${where}: \`query\` must be a non-empty string`);
    else if (/^TODO\b/.test(entry.query.trim())) problems.push(`${where}: \`query\` still has the template placeholder`);
    if (typeof entry?.should_trigger !== 'boolean') problems.push(`${where}: \`should_trigger\` must be true or false`);
    const extra = Object.keys(entry ?? {}).filter((key) => !['query', 'should_trigger', 'use_instead'].includes(key));
    if (extra.length > 0) problems.push(`${where}: unknown field \`${extra[0]}\``);
    if (!('use_instead' in (entry ?? {}))) return;
    if (entry.should_trigger !== false) problems.push(`${where}: \`use_instead\` only goes on a case with \`should_trigger: false\``);
    else if (entry.use_instead === item.id) problems.push(`${where}: \`use_instead\` cannot name the component itself`);
    else if (!names.has(entry.use_instead)) problems.push(`${where}: \`use_instead\` names unknown skill, workflow or external "${entry.use_instead}"`);
  });
  const positives = cases.filter((entry) => entry?.should_trigger === true).length;
  const negatives = cases.filter((entry) => entry?.should_trigger === false).length;
  if (positives < MIN_POSITIVE) problems.push(`${TRIGGERS_FILE} needs at least ${MIN_POSITIVE} cases with \`should_trigger: true\` (has ${positives})`);
  if (negatives < MIN_NEGATIVE) problems.push(`${TRIGGERS_FILE} needs at least ${MIN_NEGATIVE} near misses with \`should_trigger: false\` (has ${negatives})`);
  return problems;
}

// What a harness shows the model at discovery time: name and description only.
export function routingPrompt(items) {
  const catalog = items.map((item) => `- ${item.id}: ${item.data.description}`).join('\n');
  return [
    'You are an AI coding assistant. These skills are installed. You see only their names and descriptions; a skill\'s full instructions load when you choose it.',
    '',
    catalog,
    '',
    `For the user's request, choose the one skill you would load first. Answer with its exact name and nothing else, or "${NO_SKILL}" if no skill fits.`,
  ].join('\n');
}

// Reads the router's answer: the first known name it mentions, else none.
export function parseChoice(text, names) {
  const answer = String(text).trim().toLowerCase().replace(/[`"'.*]/g, '');
  if (names.has(answer)) return answer;
  const mentioned = [...names].filter((name) => new RegExp(`(^|[^a-z0-9-])${name}([^a-z0-9-]|$)`).test(answer));
  return mentioned.sort((a, b) => answer.indexOf(a) - answer.indexOf(b))[0] ?? NO_SKILL;
}

// A positive passes when the router picks the component; a negative passes
// when it picks anything else. `use_instead` is reported, not required.
export function judge(testCase, chosen) {
  if (testCase.should_trigger) return chosen === testCase.component;
  return chosen !== testCase.component;
}

// Every case of the given components, tagged with the component it belongs to.
export function collectCases(items) {
  return items.flatMap((item) => {
    const { cases = [] } = readTriggers(item);
    return Array.isArray(cases) ? cases.map((entry) => ({ ...entry, component: item.id })) : [];
  });
}

// Per-component results and the pairs the router confuses, worst first.
export function summarize(results) {
  const byComponent = new Map();
  const confusions = new Map();
  for (const result of results) {
    const row = byComponent.get(result.component) ?? { component: result.component, passed: 0, total: 0, falsePositives: 0, misses: 0 };
    row.total += 1;
    if (result.passed) row.passed += 1;
    else if (result.should_trigger) row.misses += 1;
    else row.falsePositives += 1;
    byComponent.set(result.component, row);
    if (result.passed) continue;
    const key = result.should_trigger ? `${result.component} -> ${result.chosen}` : `${result.use_instead ?? NO_SKILL} -> ${result.component}`;
    confusions.set(key, (confusions.get(key) ?? 0) + 1);
  }
  const rows = [...byComponent.values()].sort((a, b) => a.passed / a.total - b.passed / b.total || a.component.localeCompare(b.component));
  const pairs = [...confusions].map(([pair, count]) => ({ pair, count })).sort((a, b) => b.count - a.count || a.pair.localeCompare(b.pair));
  const passed = results.filter((result) => result.passed).length;
  return { passed, total: results.length, rows, pairs };
}
