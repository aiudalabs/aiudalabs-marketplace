#!/usr/bin/env node
// Runs the trigger evals: shows a model the name and description of every
// skill, workflow and external, as a harness does at discovery time, and
// checks which one it picks for each case in evals/triggers.json.
//
// Usage: node scripts/eval-triggers.mjs [name...] [--stack <name>] [--model <id>]
//          [--effort low|medium|high] [--concurrency 4] [--min 90] [--json] [--dry-run]
//
//   name...    only run the cases of these skills or workflows (default: all)
//   --stack    route among what this stack installs, instead of the whole catalog
//   --min      exit 1 when the overall pass rate is below this percentage
//   --dry-run  print what would run and the size of the prompt, call nothing
//
// Calls the Claude API with plain fetch, because this repository has no
// dependencies. Credentials come from ANTHROPIC_API_KEY, or ANTHROPIC_AUTH_TOKEN
// for an OAuth token. Every run costs money: one request per case.

import { parseArgs } from 'node:util';
import { loadAll, skillLike } from '../lib/components.mjs';
import { expand, resolveReference } from '../lib/install.mjs';
import { NO_SKILL, collectCases, judge, parseChoice, routingPrompt, summarize } from '../lib/triggers.mjs';

const API_URL = `${process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'}/v1/messages`;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    stack: { type: 'string' },
    model: { type: 'string', default: 'claude-opus-5-5' },
    effort: { type: 'string', default: 'low' },
    concurrency: { type: 'string', default: '4' },
    min: { type: 'string' },
    json: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
  },
});

const components = loadAll();
const catalog = skillLike(components);
const scope = values.stack ? expand([resolveReference(`stack/${values.stack}`, components)], components).skills : catalog;
const tested = positionals.length > 0 ? positionals.map((name) => catalog.find((item) => item.id === name) ?? fail(`no skill or workflow named "${name}"`)) : scope;
const outOfScope = tested.filter((item) => !scope.includes(item));
if (outOfScope.length > 0) fail(`${outOfScope.map((item) => item.id).join(', ')} not installed by stack ${values.stack}`);

const system = routingPrompt(scope);
const names = new Set([...scope.map((item) => item.id), NO_SKILL]);
const cases = collectCases(tested.filter((item) => item.type !== 'external'));

if (values['dry-run']) {
  console.log(`${cases.length} case(s) from ${tested.length} component(s), routed among ${scope.length} component(s).`);
  console.log(`Routing prompt: ${system.length} characters. Model: ${values.model}, effort ${values.effort}. One request per case.`);
  process.exit(0);
}

function authHeaders() {
  if (process.env.ANTHROPIC_API_KEY) return { 'x-api-key': process.env.ANTHROPIC_API_KEY };
  if (process.env.ANTHROPIC_AUTH_TOKEN) return { authorization: `Bearer ${process.env.ANTHROPIC_AUTH_TOKEN}`, betas: ['oauth-2025-04-20'] };
  return fail('set ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) to run the evals');
}

const { betas = [], ...auth } = authHeaders();
const headers = {
  'content-type': 'application/json',
  'anthropic-version': '2023-06-01',
  // A safety decline is retried on a fallback model instead of failing the case.
  'anthropic-beta': [...betas, 'server-side-fallback-2026-07-01'].join(','),
  ...auth,
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function route(query, attempt = 1) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: values.model,
      max_tokens: 2048,
      // The catalog is the same for every case, so it is cached after the first.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: query }],
      output_config: { effort: values.effort },
      fallbacks: 'default',
    }),
  });
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(Number(response.headers.get('retry-after') ?? 2 ** attempt) * 1000);
    return route(query, attempt + 1);
  }
  const body = await response.json();
  if (!response.ok) fail(`API ${response.status}: ${body.error?.message ?? JSON.stringify(body)}`);
  if (body.stop_reason === 'refusal') return 'refused';
  return body.content.filter((block) => block.type === 'text').map((block) => block.text).join('');
}

async function runAll() {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < cases.length) {
      const testCase = cases[next++];
      const answer = await route(testCase.query);
      const chosen = parseChoice(answer, names);
      results.push({ ...testCase, chosen, passed: judge(testCase, chosen) });
      if (!values.json) process.stderr.write('.');
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Number(values.concurrency)) }, worker));
  if (!values.json) process.stderr.write('\n');
  return results;
}

const results = await runAll();
const summary = summarize(results);
const rate = summary.total ? (100 * summary.passed) / summary.total : 100;

if (values.json) {
  console.log(JSON.stringify({ model: values.model, effort: values.effort, ...summary, results }, null, 2));
} else {
  console.log(`\n${summary.passed}/${summary.total} cases passed (${rate.toFixed(1)}%), ${values.model} at effort ${values.effort}, routing among ${scope.length} components.\n`);
  for (const row of summary.rows.filter((r) => r.passed < r.total)) {
    console.log(`${row.component.padEnd(30)} ${row.passed}/${row.total}  missed ${row.misses}, wrongly chosen ${row.falsePositives}`);
  }
  if (summary.pairs.length > 0) {
    console.log('\nConfusions (wanted -> chosen):');
    for (const { pair, count } of summary.pairs) console.log(`  ${String(count).padStart(2)}  ${pair}`);
  }
}
if (values.min && rate < Number(values.min)) process.exitCode = 1;
