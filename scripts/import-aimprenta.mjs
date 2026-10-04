#!/usr/bin/env node
// Imports skills, agents and workflows from an aimprenta checkout
// (https://github.com/aiudalabs/aimprenta) into this marketplace's canonical
// formats. Re-run it after aimprenta or its vendored upstreams change; it
// rewrites every component it owns and leaves everything else alone.
//
// Usage: node scripts/import-aimprenta.mjs <path-to-aimprenta> [--live <dir>] [--only name,name]
//
//   --live  folder holding upstreams aimprenta does not vendor, each cloned at
//           the commit in its vendors.lock: <dir>/<name> (needed for sciwrite)
//
// Third-party content keeps its license: each imported skill gets a
// THIRD_PARTY_NOTICES.md with the upstream repository, the pinned commit, the
// list of changes and the full license text; each imported agent carries
// `source` and `license`, which adapters append to the installed file.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT } from '../lib/components.mjs';
import { parseFrontmatter, stringifyFrontmatter } from '../lib/frontmatter.mjs';

const AIMPRENTA_REPO = 'https://github.com/aiudalabs/aimprenta';

// Upstream projects aimprenta vendors. Commits are read from its vendors.lock.
const UPSTREAMS = {
  'research-skills': { license: 'BSD-3-Clause', author: 'Seyed (Yahya) Shirazi' },
  'academic-human-in-the-loop': { license: 'MIT', author: 'wanshuiyin' },
  'claude-skills': { license: 'MIT', author: 'Nasser Ghanemzadeh' },
  'academic-writing-agents': { license: 'MIT', author: 'Haiwen Huang' },
  sciwrite: { license: 'CC-BY-4.0', author: 'Lorena A. Barba', live: true },
};

const PRINCIPLES_LINE = 'Read `/Users/owl/.claude/principles/academic-writing.md` for the full principle set.';

// ---------------------------------------------------------------------------
// What to import. Later phases add entries here.
// ---------------------------------------------------------------------------

const SKILLS = [
  {
    name: 'lit-review', upstream: 'research-skills', from: 'vendor/research-skills/plugins/manuscript/skills/lit-review',
    compatibility: 'Upstream relies on the opencite plugin from the research-skills project for DOI lookup, PDF retrieval and BibTeX export; it is not included in this marketplace. Without it, use web search and fetch for those steps. Parallel collection needs a harness with subagents.',
    changes: ['Frontmatter converted to this marketplace format: `version` moved to `metadata.version`, `license` and `metadata.source` added.'],
  },
  {
    name: 'humanizer', upstream: 'research-skills', from: 'vendor/research-skills/plugins/manuscript/skills/humanizer',
    changes: ['Frontmatter converted to this marketplace format: `version` moved to `metadata.version`, `license` and `metadata.source` added.', 'The skill folder keeps its own `LICENSE` file for the upstream humanizer content it adapts.'],
  },
  {
    name: 'citation-audit', upstream: 'academic-human-in-the-loop', from: 'vendor/academic-human-in-the-loop/skills/citation-audit',
    extra: [
      ['vendor/academic-human-in-the-loop/skills/shared-references', 'shared-references'],
      ['vendor/academic-human-in-the-loop/tools/verify_paper_audits.sh', 'tools/verify_paper_audits.sh'],
      ['vendor/academic-human-in-the-loop/tools/refresh_audit_hashes.py', 'tools/refresh_audit_hashes.py'],
    ],
    rewrite: (text) => text
      .replaceAll('(../shared-references/', '(shared-references/')
      .replace('mcp__codex__codex, WebSearch', 'Agent, WebSearch'),
    prefaceFile: 'patches/citation-audit-adaptation.md',
    preface: (note) => note
      .replace('LOCAL ADAPTATION (aimprenta install)', 'ADAPTATION (aiudalabs marketplace)')
      .replace('spawn a FRESH Claude subagent via the Agent tool (subagent_type: general-purpose)', 'spawn a FRESH subagent with your harness\'s subagent tool (in Claude Code, the Agent tool with subagent_type general-purpose)'),
    metadata: { 'requires-tools': 'python3 bash' },
    compatibility: 'Runs reviewer calls as fresh subagents, so it needs a harness with subagents. The bundled tools need Python 3 and bash.',
    changes: [
      'Each reviewer call runs as a fresh subagent instead of the OpenAI Codex MCP; an adaptation note at the top of SKILL.md explains the substitution, and `allowed-tools` lists `Agent` instead of `mcp__codex__codex`.',
      '`shared-references/` and the two scripts in `tools/` are bundled inside the skill folder (upstream keeps them at the repository root), and links to them are rewritten.',
      'Frontmatter converted to this marketplace format: `argument-hint` moved to `metadata`, `license`, `compatibility` and `metadata.source` added.',
    ],
  },
  {
    name: 'line-and-copy-editor', upstream: 'claude-skills', from: 'vendor/claude-skills/line-and-copy-editor',
    changes: ['Frontmatter converted to this marketplace format: `metadata.version` and `metadata.source` added.'],
  },
  {
    name: 'sciwrite', upstream: 'sciwrite', live: true,
    rewrite: (text) => text.replace(/^name: manuscript-writing-review$/m, 'name: sciwrite'),
    skip: ['.git'],
    changes: ['Renamed from `manuscript-writing-review` to `sciwrite`, the name the workflows use to call it.', 'Frontmatter converted to this marketplace format: `license`, `metadata.version` and `metadata.source` added.'],
  },
  {
    name: 'academic-writing-principles', upstream: 'academic-writing-agents', fromFile: 'vendor/academic-writing-agents/principles/academic-writing.md',
    frontmatter: {
      name: 'academic-writing-principles',
      description: 'The full principle set behind the academic writing agents: evidence and citation rules (E1 to E3), figures, structure, limitations and style, each with an identifier the agents cite. Use when an academic writing or review agent asks for its principles, or when reviewing or drafting academic prose and a specific principle such as E2 or D4 needs to be checked.',
    },
    changes: ['Created as a skill from `principles/academic-writing.md` so agents can load it by name; upstream installs it as a loose file under `~/.claude/principles/`. The principles text is unchanged.'],
  },
];

const AGENTS = [
  { name: 'bibliography-auditor', upstream: 'academic-writing-agents', category: 'research', tags: ['research', 'citations', 'bibliography'] },
  { name: 'paper-crawler', upstream: 'academic-writing-agents', category: 'research', tags: ['research', 'literature'] },
  { name: 'research-analyst', upstream: 'academic-writing-agents', category: 'research', tags: ['research', 'literature', 'novelty'] },
];

const WORKFLOWS = [
  {
    name: 'article-author', from: 'skills/article-author', requires: 'citation-audit sciwrite humanizer',
    rewrite: (text) => text.replace('`docs/community-validation.md`', '`docs/community-validation.md` in the aimprenta repository'),
  },
];

// ---------------------------------------------------------------------------

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readLock(aimprenta) {
  const commits = {};
  for (const line of readFileSync(join(aimprenta, 'vendors.lock'), 'utf8').split('\n')) {
    const [repo, commit, name] = line.trim().split(/\s+/);
    if (repo?.startsWith('https://') && commit && name) commits[name] = { repo, commit };
  }
  return commits;
}

const stringValues = (map = {}) => Object.fromEntries(Object.entries(map).filter(([, value]) => typeof value === 'string'));

function writeNotice(dir, { name, upstream, origin, changes, licenseText }) {
  const lines = [
    '# Third-party notices',
    '',
    `This skill is adapted from **${upstream}**, ${origin.repo}, at commit \`${origin.commit}\`, by ${UPSTREAMS[upstream].author}, used under the ${UPSTREAMS[upstream].license} license. It reached this marketplace through aimprenta (${AIMPRENTA_REPO}), which vendors it.`,
    '',
    'Changes made here:',
    '',
    ...changes.map((change) => `- ${change}`),
    '',
    'License of the upstream project:',
    '',
    '```',
    licenseText.trimEnd(),
    '```',
    '',
  ];
  writeFileSync(join(dir, 'THIRD_PARTY_NOTICES.md'), lines.join('\n'));
  return name;
}

let liveDir = null;
const upstreamDir = (aimprenta, upstream) => (UPSTREAMS[upstream].live ? join(liveDir, upstream) : join(aimprenta, 'vendor', upstream));

function licenseTextFor(aimprenta, upstream) {
  const file = join(upstreamDir(aimprenta, upstream), 'LICENSE');
  if (!existsSync(file)) fail(`license file not found for ${upstream}: ${file}`);
  return readFileSync(file, 'utf8');
}

function importSkill(aimprenta, lock, spec) {
  const origin = lock[spec.upstream];
  if (!origin) fail(`${spec.upstream} is not in vendors.lock`);
  const target = join(ROOT, 'skills', spec.name);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  let data;
  let body;
  if (spec.fromFile) {
    data = spec.frontmatter;
    body = readFileSync(join(aimprenta, spec.fromFile), 'utf8');
  } else {
    const source = spec.live ? upstreamDir(aimprenta, spec.upstream) : join(aimprenta, spec.from);
    cpSync(source, target, { recursive: true, filter: (path) => !(spec.skip ?? []).some((part) => path.split(/[\\/]/).includes(part)) });
    let text = readFileSync(join(source, 'SKILL.md'), 'utf8');
    if (spec.rewrite) text = spec.rewrite(text);
    ({ data, body } = parseFrontmatter(text));
  }
  for (const [from, to] of spec.extra ?? []) {
    mkdirSync(dirname(join(target, to)), { recursive: true });
    cpSync(join(aimprenta, from), join(target, to), { recursive: true });
  }
  if (spec.prefaceFile) body = `${spec.preface(readFileSync(join(aimprenta, spec.prefaceFile), 'utf8')).trimEnd()}\n\n${body}`;

  const frontmatter = {
    name: spec.name,
    description: data.description,
    license: UPSTREAMS[spec.upstream].license,
    compatibility: spec.compatibility ?? data.compatibility,
    // The specification wants a space-delimited string; some upstreams use a list.
    'allowed-tools': Array.isArray(data['allowed-tools']) ? data['allowed-tools'].join(' ') : data['allowed-tools'],
    metadata: {
      ...stringValues(data.metadata),
      version: data.metadata?.version ?? data.version ?? '0.1.0',
      author: UPSTREAMS[spec.upstream].author,
      source: origin.repo,
      ...(data['argument-hint'] ? { 'argument-hint': data['argument-hint'] } : {}),
      ...spec.metadata,
    },
  };
  writeFileSync(join(target, 'SKILL.md'), stringifyFrontmatter(frontmatter, body));
  writeNotice(target, { name: spec.name, upstream: spec.upstream, origin, changes: spec.changes, licenseText: licenseTextFor(aimprenta, spec.upstream) });
  return `skill/${spec.name}`;
}

function importAgent(aimprenta, lock, spec) {
  const origin = lock[spec.upstream];
  const file = join(aimprenta, 'vendor', spec.upstream, 'agents', `${spec.name}.md`);
  const { data, body: rawBody } = parseFrontmatter(readFileSync(file, 'utf8'));
  const needsPrinciples = rawBody.includes(PRINCIPLES_LINE);
  const body = rawBody.replaceAll(PRINCIPLES_LINE, 'Load the `academic-writing-principles` skill for the full principle set.');
  const frontmatter = {
    name: spec.name,
    description: data.description,
    version: '0.1.0',
    ...(needsPrinciples ? { requires: ['academic-writing-principles'] } : {}),
    tags: spec.tags,
    source: origin.repo,
    license: UPSTREAMS[spec.upstream].license,
  };
  const target = join(ROOT, 'agents', spec.category, `${spec.name}.md`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, stringifyFrontmatter(frontmatter, body));
  return `agent/${spec.name}`;
}

function importWorkflow(aimprenta, spec) {
  const source = join(aimprenta, spec.from);
  const target = join(ROOT, 'workflows', spec.name);
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  let text = readFileSync(join(source, 'SKILL.md'), 'utf8');
  if (spec.rewrite) text = spec.rewrite(text);
  const { data, body } = parseFrontmatter(text);
  const frontmatter = {
    name: spec.name,
    description: data.description,
    license: 'MIT',
    compatibility: spec.compatibility,
    metadata: {
      version: '0.1.0',
      author: 'aiudalabs',
      source: AIMPRENTA_REPO,
      ...(data['argument-hint'] ? { 'argument-hint': data['argument-hint'] } : {}),
      ...(spec.requires ? { requires: spec.requires } : {}),
      ...(spec.agents ? { agents: spec.agents } : {}),
    },
  };
  writeFileSync(join(target, 'SKILL.md'), stringifyFrontmatter(frontmatter, body));
  return `workflow/${spec.name}`;
}

const args = process.argv.slice(2);
const aimprenta = args.find((arg, index) => !arg.startsWith('--') && !['--live', '--only'].includes(args[index - 1]));
if (!aimprenta || !existsSync(join(aimprenta, 'vendors.lock'))) fail('Usage: node scripts/import-aimprenta.mjs <path-to-aimprenta> [--live <dir>] [--only name,name]');
const liveIndex = args.indexOf('--live');
liveDir = liveIndex === -1 ? null : args[liveIndex + 1];
const onlyIndex = args.indexOf('--only');
const only = onlyIndex === -1 ? null : new Set(args[onlyIndex + 1].split(','));
const wanted = (spec) => !only || only.has(spec.name);

// Upstreams aimprenta does not vendor (it clones them at install time) must be
// cloned first, at the commit in vendors.lock, into --live <dir>/<name>.
for (const [name, upstream] of Object.entries(UPSTREAMS)) {
  if (!upstream.live || !SKILLS.some((spec) => spec.upstream === name && wanted(spec))) continue;
  if (!liveDir || !existsSync(join(liveDir, name, 'SKILL.md'))) fail(`${name} is not vendored by aimprenta: clone it at the commit in vendors.lock into <dir>/${name} and pass --live <dir>.`);
}

const lock = readLock(aimprenta);
const imported = [
  ...SKILLS.filter(wanted).map((spec) => importSkill(aimprenta, lock, spec)),
  ...AGENTS.filter(wanted).map((spec) => importAgent(aimprenta, lock, spec)),
  ...WORKFLOWS.filter(wanted).map((spec) => importWorkflow(aimprenta, spec)),
];
for (const name of imported) console.log(`imported ${name}`);
console.log('\nNext: npm run catalog && npm run validate && npm test');
