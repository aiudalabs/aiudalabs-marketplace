#!/usr/bin/env node
// Imports skills, agents, workflows and externals from an aimprenta checkout
// (https://github.com/aiudalabs/aimprenta) into this marketplace's canonical
// formats. Re-run it after aimprenta or its vendored upstreams change; it
// rewrites every component it owns and leaves everything else alone.
//
// Usage: node scripts/import-aimprenta.mjs <path-to-aimprenta> [--live <dir>] [--only name,name]
//
//   --live  folder holding upstreams aimprenta does not vendor, each cloned at
//           the commit in its vendors.lock: <dir>/<name> (needed for sciwrite)
//
// Third-party content keeps its license: each imported skill or workflow gets a
// THIRD_PARTY_NOTICES.md with the upstream repository, the pinned commit, the
// list of changes and the full license text; each imported agent carries
// `source` and `license`, which adapters append to the installed file.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { listSkillFiles } from '../lib/components.mjs';
import { dirname, join } from 'node:path';
import { ROOT } from '../lib/components.mjs';
import { parseFrontmatter, stringifyFrontmatter } from '../lib/frontmatter.mjs';

const AIMPRENTA_REPO = 'https://github.com/aiudalabs/aimprenta';
const AIMPRENTA = { license: 'MIT', author: 'aiudalabs', repo: AIMPRENTA_REPO };

// SPDX license of each upstream. Commits come from aimprenta's vendors.lock and
// copyright holders from each upstream's LICENSE file.
const UPSTREAM_LICENSES = {
  'research-skills': 'BSD-3-Clause',
  'academic-human-in-the-loop': 'MIT',
  'claude-skills': 'MIT',
  'academic-writing-agents': 'MIT',
  'manuscript-writing': 'MIT',
  'book-typesetting-skill': 'MIT',
  'kindle-book-skill': 'MIT',
  'claude-anvil': 'MIT',
  'ebook-publishing-skill': 'MIT',
  sciwrite: 'CC-BY-4.0',
};
const LIVE_UPSTREAMS = new Set(['sciwrite']);

const CONVERTED = 'Frontmatter converted to this marketplace format (`license`, `metadata.version` and `metadata.source`; harness-specific fields moved into `metadata`).';
const PORTABLE = 'Plugin-scoped names (such as `manuscript:humanizer`) and fixed install paths (such as `~/.claude/skills/<name>`), wherever they occur in the Markdown files, are rewritten to the component names and folder placeholders used here, so the text works in every harness.';
const BOOKWRIGHT_ORCHESTRATORS = ['writer', 'reviewer', 'iterator', 'rewriter'];

// Rewrites applied to every imported text: plugin-scoped names, plugin-root
// paths and the absolute paths aimprenta's installer creates. A skill is
// installed into a different folder in every harness, so no text may locate
// one through a fixed path such as ~/.claude/skills/<name>.
function portable(text) {
  return text
    .replace(/`?bookwright:(writer|reviewer|iterator|rewriter)`?/g, '`bookwright-$1`')
    .replace(/bookwright:(init|integrate|revise|notebook)\b/g, 'bookwright `/$1` command (not included in this marketplace)')
    .replace(/bookwright:([a-z][a-z0-9-]*)/g, '$1')
    // The research-skills manuscript plugin, under the names used here.
    .replace(/manuscript:manuscript-writing\b/g, 'manuscript-drafting')
    .replace(/manuscript:manuscript-formatting\b/g, 'paper-publisher')
    .replace(/manuscript:(paper-review|humanizer|lit-review)\b/g, '$1')
    .replaceAll('${CLAUDE_PLUGIN_ROOT}/docs', 'docs')
    .replaceAll('~/.claude/scripts/aimprenta/', '<manuscript-checks skill folder>/scripts/')
    .replaceAll('Read `/Users/owl/.claude/principles/academic-writing.md` for the full principle set.', 'Load the `academic-writing-principles` skill for the full principle set.')
    .replaceAll('/Users/owl/.claude/', '~/.claude/')
    .replaceAll('`~/.claude/agents/`', 'the installed agents folder')
    .replace(/~\/\.(?:claude|codex)\/skills\/([a-z0-9-]+)/g, '<$1 skill folder>')
    .replace(/~\/\.(?:claude|codex)\/skills\b\/?/g, '<skills folder>');
}

// Applies `portable` to every Markdown file of an imported folder, not only
// SKILL.md: references are read by the agent too. Notices stay verbatim.
function portableTree(target, rewrite = (file, text) => text) {
  for (const file of listSkillFiles(target)) {
    if (!file.endsWith('.md') || /(^|\/)(THIRD_PARTY_NOTICES|NOTICE|LICENSE)\.md$/.test(file)) continue;
    const path = join(target, file);
    const before = readFileSync(path, 'utf8');
    const after = rewrite(file, portable(before));
    if (after !== before) writeFileSync(path, after);
  }
}

// ---------------------------------------------------------------------------
// What to import.
// ---------------------------------------------------------------------------

const RS = 'vendor/research-skills/plugins/manuscript';
const ANVIL = 'vendor/claude-anvil';

// The upstream shared references citation-audit links to, directly or through
// another reference.
const CITATION_AUDIT_REFERENCES = [
  'acceptance-gate.md', 'assurance-contract.md', 'citation-discipline.md', 'effort-contract.md', 'experiment-integrity.md',
  'external-cadence.md', 'fan-out-pattern.md', 'integration-contract.md', 'page-shrink-heuristic.md', 'paper-preferences.md',
  'review-tracing.md', 'reviewer-independence.md', 'reviewer-routing.md', 'wiki-helper-resolution.md', 'writing-principles.md',
];

const SKILL_FOLDER_NOTE = '`<book-typesetting skill folder>` stands for the folder this file was loaded from. Replace it with that path before running a command.';

const SKILLS = [
  {
    name: 'lit-review', upstream: 'research-skills', from: `${RS}/skills/lit-review`,
    compatibility: 'Upstream relies on the opencite plugin from the research-skills project for DOI lookup, PDF retrieval and BibTeX export; it is not included in this marketplace. Without it, use web search and fetch for those steps. Parallel collection needs a harness with subagents.',
  },
  { name: 'humanizer', upstream: 'research-skills', from: `${RS}/skills/humanizer`, changes: ['The skill folder keeps its own `LICENSE` file for the upstream humanizer content it adapts.'] },
  {
    name: 'citation-audit', upstream: 'academic-human-in-the-loop', from: 'vendor/academic-human-in-the-loop/skills/citation-audit',
    extra: [
      // Only the references this skill reaches; upstream's folder serves its whole suite.
      ['vendor/academic-human-in-the-loop/skills/shared-references', 'shared-references', { only: CITATION_AUDIT_REFERENCES }],
      ['vendor/academic-human-in-the-loop/tools/verify_paper_audits.sh', 'tools/verify_paper_audits.sh'],
      ['vendor/academic-human-in-the-loop/tools/refresh_audit_hashes.py', 'tools/refresh_audit_hashes.py'],
    ],
    rewrite: (text) => text.replaceAll('(../shared-references/', '(shared-references/').replace('mcp__codex__codex, WebSearch', 'Agent, WebSearch'),
    // Links to sibling skills of the upstream suite that are not bundled here.
    treeRewrite: (file, text) => text
      .replaceAll('](../citation-audit/SKILL.md)', '](../SKILL.md)')
      .replace(/\[([^\]]+)\]\(\.\.\/(?:paper-claim-audit|skills-codex)\/[^)]*\)/g, '$1'),
    prefaceFile: 'patches/citation-audit-adaptation.md',
    preface: (note) => note
      .replace('LOCAL ADAPTATION (aimprenta install)', 'ADAPTATION (aiudalabs marketplace)')
      .replace('spawn a FRESH Claude subagent via the Agent tool (subagent_type: general-purpose)', 'spawn a FRESH subagent with your harness\'s subagent tool (in Claude Code, the Agent tool with subagent_type general-purpose)'),
    metadata: { 'requires-tools': 'python3 bash' },
    compatibility: 'Runs reviewer calls as fresh subagents, so it needs a harness with subagents. The bundled tools need Python 3 and bash.',
    changes: [
      'Each reviewer call runs as a fresh subagent instead of the OpenAI Codex MCP; an adaptation note at the top of SKILL.md explains the substitution, and `allowed-tools` lists `Agent` instead of `mcp__codex__codex`.',
      '`shared-references/` and the two scripts in `tools/` are bundled inside the skill folder (upstream keeps them at the repository root), and links to them are rewritten. Only the shared references this skill links to, directly or through another reference, are bundled; links to upstream sibling skills that are not bundled become plain text.',
    ],
  },
  {
    name: 'line-and-copy-editor', upstream: 'claude-skills', from: 'vendor/claude-skills/line-and-copy-editor', skip: ['README.md'],
    changes: ['`README.md` is left out: it explains how to install from the upstream collection and links to files outside the skill.'],
  },
  {
    name: 'sciwrite', upstream: 'sciwrite', live: true, skip: ['.git'],
    rewrite: (text) => text.replace(/^name: manuscript-writing-review$/m, 'name: sciwrite'),
    changes: ['Renamed from `manuscript-writing-review` to `sciwrite`, the name the workflows use to call it.'],
  },
  {
    name: 'academic-writing-principles', upstream: 'academic-writing-agents', fromFile: 'vendor/academic-writing-agents/principles/academic-writing.md',
    description: 'The full principle set behind the academic writing agents: evidence and citation rules (E1 to E3), figures, structure, limitations and style, each with an identifier the agents cite. Use when an academic writing or review agent asks for its principles, or when reviewing or drafting academic prose and a specific principle such as E2 or D4 needs to be checked.',
    changes: ['Created as a skill from `principles/academic-writing.md` so agents can load it by name; upstream installs it as a loose file under `~/.claude/principles/`. The principles text is unchanged.'],
  },
  {
    name: 'manuscript-drafting', upstream: 'research-skills', from: `${RS}/skills/manuscript-writing`,
    changes: ['Renamed from `manuscript-writing` to `manuscript-drafting`, as aimprenta does, because a second upstream skill uses the same name.'],
  },
  {
    name: 'manuscript-revision', upstream: 'manuscript-writing', from: 'vendor/manuscript-writing',
    changes: ['Renamed from `manuscript-writing` to `manuscript-revision`, as aimprenta does, because a second upstream skill uses the same name.'],
  },
  { name: 'textbook-methodology', upstream: 'claude-anvil', from: `${ANVIL}/bookwright/skills/textbook-methodology` },
  { name: 'notebook-paired-with-prose', upstream: 'claude-anvil', from: `${ANVIL}/bookwright/skills/notebook-paired-with-prose` },
  { name: 'cross-reference-discipline', upstream: 'claude-anvil', from: `${ANVIL}/bookwright/skills/cross-reference-discipline` },
  {
    name: 'book-typesetting', upstream: 'book-typesetting-skill', from: 'vendor/book-typesetting-skill', skip: ['INSTALL.sh', '.gitignore', 'README.md', '.git'],
    metadata: { 'requires-tools': 'quarto pandoc xelatex gs python3' },
    rewrite: (text) => replaceOnce(text, '/scripts/doctor.sh\n```\n', `/scripts/doctor.sh\n\`\`\`\n\n${SKILL_FOLDER_NOTE}\n`),
    changes: [
      'Installed as a plain skill folder: `INSTALL.sh`, `README.md` and `.gitignore` are left out, as upstream\'s own installer does; `LICENSE` and `NOTICE.md` are kept.',
      'Paths under `~/.claude/skills/book-typesetting` are written as `<book-typesetting skill folder>`, because each harness installs skills in its own folder.',
    ],
  },
  { name: 'kindle-book', upstream: 'kindle-book-skill', from: 'vendor/kindle-book-skill', metadata: { 'requires-tools': 'python3' } },
  {
    name: 'kdp-audit', upstream: 'claude-anvil', from: `${ANVIL}/kdp/skills/kdp-audit`, extra: [[`${ANVIL}/kdp/docs`, 'docs', { skip: ['superpowers'] }]],
    changes: ['The plugin\'s `docs/` folder is bundled inside the skill, without the maintainers\' planning notes in `docs/superpowers/`, and `${CLAUDE_PLUGIN_ROOT}/docs` paths point to it.'],
  },
  {
    name: 'kdp-listing', upstream: 'claude-anvil', from: `${ANVIL}/kdp/skills/kdp-listing`, extra: [[`${ANVIL}/kdp/docs`, 'docs', { skip: ['superpowers'] }]],
    changes: ['The plugin\'s `docs/` folder is bundled inside the skill, without the maintainers\' planning notes in `docs/superpowers/`, and `${CLAUDE_PLUGIN_ROOT}/docs` paths point to it.'],
  },
  { name: 'ebook-publishing', upstream: 'ebook-publishing-skill', from: 'vendor/ebook-publishing-skill' },
];

// Skills written for this marketplace around aimprenta's own scripts.
const OWN_SKILLS = [
  {
    name: 'manuscript-checks',
    files: [['scripts/check_structure.py', 'scripts/check_structure.py'], ['scripts/check_readability.py', 'scripts/check_readability.py'], ['scripts/check_claims.py', 'scripts/check_claims.py']],
    description: 'Deterministic checks for a book or paper manuscript that an LLM reviewer can be talked out of: stub and truncation markers, empty sections and broken markdown; readability outliers between chapters; and re-running each chapter\'s tests to confirm the numbers in its claim ledger still hold. Use before an editorial review, before production, or when a workflow asks for the manuscript checks.',
    compatibility: 'Needs Python 3. check_claims.py also needs pytest and pyyaml in the Python environment that runs the book\'s code.',
    metadata: { 'requires-tools': 'python3' },
    body: `# Manuscript checks

Three scripts that check a manuscript mechanically. They catch a different class of defect from reviewers: things that are wrong whatever anyone thinks of the prose. Run them, read the output, and report it as it is.

Run each script from this skill's folder. Each one takes the folder that directly contains the chapter files (\`*.md\`), such as \`book/chapters\`; it does not search subfolders.

## Structure

\`\`\`bash
python3 scripts/check_structure.py <book-dir> [--json]
\`\`\`

Finds truncation and stub markers, empty sections and malformed markdown in each chapter. Exit code 1 if any file has a finding. \`[source needed]\` markers are reported, never failed on: they mark a real gap on purpose.

## Readability

\`\`\`bash
python3 scripts/check_readability.py <book-dir> [--outlier-threshold 15] [--json] [--strict]
\`\`\`

Computes Flesch Reading Ease per chapter and flags chapters that are outliers against the book's own average. It is advisory and exits 0 unless \`--strict\` is passed. It is a blunt measure; use it beside a human or model clarity review, never instead of one.

## Claims

\`\`\`bash
python3 scripts/check_claims.py <book-dir> [--python /path/to/python3]
\`\`\`

For books with executable chapters: looks for \`code/*/passport.yaml\` claim ledgers, re-runs each chapter's test suite, and reports whether the claims still hold. Exit code 0 when every chapter passes. Use \`--python\` to point at the environment where the book's code runs.

## Reporting

Paste each script's output into the review or production report. Do not summarize a failing check as passing, and do not skip a check because the manuscript looks fine.
`,
  },
];

const AGENTS = [
  ...['bibliography-auditor', 'paper-crawler', 'research-analyst'].map((name) => ({ name, upstream: 'academic-writing-agents', category: 'research' })),
  ...['logic-reviewer', 'consistency-checker', 'prose-polisher', 'writing-reviewer', 'technical-reviewer', 'section-drafter', 'brainstormer'].map((name) => ({ name, upstream: 'academic-writing-agents', category: 'writing' })),
  ...['latex-layout-auditor', 'latex-figure-specialist'].map((name) => ({ name, upstream: 'academic-writing-agents', category: 'latex' })),
  {
    // Renamed so `add paper-review` is not ambiguous with the workflow.
    name: 'paper-reviewer', upstream: 'research-skills', from: `${RS}/agents/paper-review.md`, category: 'research',
    rewrite: (text) => replaceOnce(text.replace(/^name: paper-review$/m, 'name: paper-reviewer'), PAPER_REVIEW_LOOKUP, PORTABLE_PAPER_REVIEW_LOOKUP),
  },
  ...['source-reformulator', 'cross-ref-auditor', 'quality-auditor', 'notebook-author', 'section-writer', 'math-auditor', 'spec-auditor'].map((name) => ({ name, upstream: 'claude-anvil', from: `${ANVIL}/bookwright/agents/${name}.md`, category: 'book' })),
];

// The upstream reviewer finds its rubric through the Claude Code plugin root,
// which does not exist in other harnesses, and under skills/, where a workflow
// is not installed in a plugin.
const PAPER_REVIEW_LOOKUP = `1. Locate the skill references:
   \`\`\`bash
   REF="\${CLAUDE_PLUGIN_ROOT}/skills/paper-review/references"
   if [ -z "\${CLAUDE_PLUGIN_ROOT:-}" ] || ! test -d "$REF"; then
       matches="$(find . -type d -path '*/skills/paper-review/references' 2>/dev/null)"
       n="$(printf '%s\\n' "$matches" | grep -c .)"
       [ "$n" -eq 0 ] && { echo "FATAL: paper-review/references not found; install the manuscript plugin so the rubric is on disk" >&2; exit 2; }
       REF="$(printf '%s\\n' "$matches" | head -1)"
       [ "$n" -gt 1 ] && echo "warning: $n candidate references dirs found; using $REF" >&2
       echo "warning: CLAUDE_PLUGIN_ROOT unset/invalid; using fallback rubric at $REF" >&2
   fi
   test -f "$REF/review-procedure.md" || { echo "FATAL: $REF has no review-procedure.md" >&2; exit 2; }
   echo "Using rubric at: $REF"; ls "$REF"
   \`\`\``;
const PORTABLE_PAPER_REVIEW_LOOKUP = `1. Locate the skill references. Load the \`paper-review\` skill with your skill tool: its folder holds \`references/\`. If you cannot tell where that folder is, find it in the project and in the user's harness folders:
   \`\`\`bash
   REF="$(find . ~/.claude ~/.agents ~/.codex ~/.cursor ~/.gemini ~/.copilot ~/.config/opencode ~/.osaurus -path '*/paper-review/references/review-procedure.md' 2>/dev/null | head -1)"
   test -n "$REF" || { echo "FATAL: paper-review/references not found; install the paper-review workflow so the rubric is on disk" >&2; exit 2; }
   REF="$(dirname "$REF")"
   echo "Using rubric at: $REF"; ls "$REF"
   \`\`\``;
const PORTABLE_PAPER_REVIEW_DISPATCH = `## Dispatch

Pass the reviewer only the framing: the manuscript path, the target journal or manuscript type, and the mode. In every branch the reviewer follows \`references/review-procedure.md\`.

- **Harness with subagents:** dispatch the \`paper-reviewer\` agent as a subagent. For panel mode, dispatch one per lens in parallel, each told its lens, then run one more for the synthesis.
- **Fallback** (no subagents, or the user wants an interactive in-thread review): follow \`references/review-procedure.md\` from this skill's folder directly in this context. Never review from memory: if the references cannot be read, stop and say so.

`;

const BOOKWRIGHT_DESCRIPTIONS = {
  writer: 'Drafts textbook chapters section by section from a chapter plan: dispatches the right drafting agent per section (section-writer, notebook-author or source-reformulator), then has spec-auditor and quality-auditor check each one and re-dispatches fixes. Use when a planned chapter or section of a technical book needs to be written.',
  reviewer: 'Reviews a section, a chapter or a whole technical book by running four auditors in parallel (spec-auditor, quality-auditor, math-auditor, cross-ref-auditor) and merging their findings into one dated report. It reports and does not fix. Use when drafted book content needs an editorial review.',
  rewriter: 'Fixes the findings of a book review report: sends each finding to the right drafting agent, verifies the fix with the auditor that owns that kind of finding, and writes a revision report paired with the review. Use after a review report exists and its findings need to be applied.',
  iterator: 'Drives drafted book content to clean by looping the bookwright-reviewer and bookwright-rewriter workflows until no findings remain at the chosen threshold, progress stalls or the round cap is reached, then reports a truthful recount. Use when a chapter or the whole book should be reviewed and fixed repeatedly without supervision.',
};

const WORKFLOWS = [
  {
    name: 'article-author', from: 'skills/article-author',
    rewrite: (text) => text.replace('`docs/community-validation.md`', '`docs/community-validation.md` in the aimprenta repository'),
  },
  {
    name: 'book-author', from: 'skills/book-author', notRequired: ['scientific-book-editor'],
    rewrite: (text) => text.replaceAll('`writer`', '`bookwright-writer`').replaceAll('`iterator`', '`bookwright-iterator`'),
    compatibility: 'Dispatches drafting and audit agents, so it needs a harness with subagents.',
  },
  { name: 'scientific-book-editor', from: 'skills/scientific-book-editor', requires: ['manuscript-checks'], notRequired: ['production-book-publisher'], compatibility: 'Runs a panel of review agents in parallel, so it needs a harness with subagents. The manuscript checks need Python 3.' },
  {
    name: 'paper-review', upstream: 'research-skills', from: `${RS}/skills/paper-review`, agents: ['paper-reviewer'],
    rewrite: (text) => {
      const dispatch = /## Dispatch\n[\s\S]*?\n(?=## The brain)/;
      if (!dispatch.test(text)) fail('paper-review: the Dispatch section was not found upstream');
      return text.replace(dispatch, () => PORTABLE_PAPER_REVIEW_DISPATCH);
    },
    compatibility: 'Dispatches the paper-reviewer agent once (single mode) or several times in parallel (panel mode), so it needs a harness with subagents.',
    changes: [
      'Imported as a workflow, because it dispatches a reviewer agent; the agent is imported alongside it as `paper-reviewer`, so the two names do not collide.',
      'The Dispatch section is rewritten for any harness with subagents: upstream points at Claude Code, Codex and Copilot plugin templates that are not part of this marketplace.',
    ],
  },
  {
    name: 'paper-author', from: 'skills/paper-author', notRequired: ['scientific-book-editor'], version: '0.2.0',
    // A depth setting (scripts/patches/paper-author-depth.md) so a preprint
    // does not get a venue submission's full checking.
    rewrite: (text) => [
      ['argument-hint: "[paper-dir-or-idea]"', 'argument-hint: "[paper-dir-or-idea] [--depth preprint|venue]"'],
      ['## Stage 1 — Frame the paper', `${readFileSync(join(ROOT, 'scripts/patches/paper-author-depth.md'), 'utf8').trimEnd()}\n\n## Stage 1 — Frame the paper`],
      ['conference / preprint-only), rough length budget.', 'conference / preprint-only), rough length budget, and the depth.'],
      ['`references.bib` + paper cards the later `citation-audit` can verify against.', '`references.bib` + paper cards the later `citation-audit` can verify against,\nat the volume the depth sets.'],
      ['Invoke `paper-review` (panel mode for anything going to a real venue, single\nmode for a fast internal check — ask the user which) alongside', 'Invoke `paper-review` (single mode at `preprint` depth, panel mode at `venue`\ndepth) alongside'],
      ['check) and `sciwrite` in full-review mode', 'check, scoped by depth) and, at `venue` depth only, `sciwrite` in full-review mode'],
    ].reduce((current, [from, to]) => replaceOnce(current, from, to), text),
    compatibility: 'Dispatches research and review agents, so it needs a harness with subagents.',
  },
  {
    name: 'paper-publisher', from: 'skills/paper-publisher', notRequired: ['paper-author'], requires: ['manuscript-checks'],
    compatibility: 'Builds the submission PDF with LaTeX (latexmk and a TeX distribution with tlmgr); named venue classes are fetched from the venue at build time.',
    metadata: { 'requires-tools': 'latexmk python3' },
  },
  { name: 'production-book-publisher', from: 'skills/production-book-publisher', requires: ['manuscript-checks', 'book-typesetting'], compatibility: 'Needs Quarto, a LaTeX distribution, Ghostscript and Python 3 for print and EPUB builds; epubcheck and pdfinfo for validation. kindle-cover is installed from its own repository.', metadata: { 'requires-tools': 'quarto python3 pdfinfo' } },
  ...BOOKWRIGHT_ORCHESTRATORS.map((role) => ({
    name: `bookwright-${role}`, upstream: 'claude-anvil', notRequired: role === 'writer' ? ['bookwright-rewriter'] : [], fromAgent: `${ANVIL}/bookwright/agents/${role}.md`, description: BOOKWRIGHT_DESCRIPTIONS[role],
    compatibility: 'Dispatches specialist agents, so it needs a harness with subagents.',
    changes: [`Converted from the \`${role}\` agent of the bookwright plugin into a workflow, because it coordinates other agents through steps; references to plugin-scoped names such as \`bookwright:reviewer\` now name the marketplace components.`],
  })),
];

const EXTERNALS = [
  {
    name: 'kindle-cover', lockName: 'kindle-cover-skill', path: '', license: 'none',
    description: 'Generates a full-wrap paperback cover PDF for Amazon KDP, front, spine and back in one file, with the spine width computed from the page count. Use when a book needs a KDP paperback cover.',
    notes: 'The upstream repository has no license file, so the skill is cloned from it when installed instead of being copied here. aimprenta also patches it to add a 7x10 inch trim size; that patch is not applied by this marketplace.',
  },
];

// ---------------------------------------------------------------------------

function fail(message) {
  console.error(message);
  process.exit(1);
}

let aimprenta;
let liveDir = null;
const lock = {};

function readLock() {
  for (const line of readFileSync(join(aimprenta, 'vendors.lock'), 'utf8').split('\n')) {
    const [repo, commit, name] = line.trim().split(/\s+/);
    if (repo?.startsWith('https://') && commit && name) lock[name] = { repo, commit };
  }
}

const upstreamDir = (upstream) => (LIVE_UPSTREAMS.has(upstream) ? join(liveDir, upstream) : join(aimprenta, 'vendor', upstream));
const licenseText = (upstream) => readFileSync(join(upstreamDir(upstream), 'LICENSE'), 'utf8');

// The copyright holder as the upstream's LICENSE states it.
function author(upstream) {
  const line = licenseText(upstream).split('\n').find((candidate) => /copyright/i.test(candidate) && /\d{4}/.test(candidate));
  if (!line) fail(`no copyright line in the LICENSE of ${upstream}`);
  return line.replace(/^.*?\d{4}(\s*-\s*\d{4})?,?\s*/, '').trim();
}

function upstreamInfo(upstream) {
  if (!lock[upstream]) fail(`${upstream} is not in vendors.lock`);
  return { license: UPSTREAM_LICENSES[upstream], author: author(upstream), ...lock[upstream] };
}

function writeNotice(dir, upstream, changes) {
  const info = upstreamInfo(upstream);
  const lines = [
    '# Third-party notices',
    '',
    `Adapted from **${upstream}**, ${info.repo}, at commit \`${info.commit}\`, by ${info.author}, used under the ${info.license} license. It reached this marketplace through aimprenta (${AIMPRENTA_REPO}), which vendors it.`,
    '',
    'Changes made here:',
    '',
    ...[CONVERTED, PORTABLE, ...changes].map((change) => `- ${change}`),
    '',
    'License of the upstream project:',
    '',
    '```',
    licenseText(upstream).trimEnd(),
    '```',
    '',
  ];
  writeFileSync(join(dir, 'THIRD_PARTY_NOTICES.md'), lines.join('\n'));
}

const stringValues = (map = {}) => Object.fromEntries(Object.entries(map).filter(([, value]) => typeof value === 'string'));
const listString = (value) => (Array.isArray(value) ? value.join(' ') : value);

function skillFrontmatter({ name, data, description, license, compatibility, info, metadata }) {
  return {
    name,
    description: description ?? data.description,
    license,
    compatibility: compatibility ?? data.compatibility,
    // The specification wants a space-delimited string; some upstreams use a list.
    'allowed-tools': listString(data['allowed-tools']),
    metadata: {
      ...stringValues(data.metadata),
      version: data.metadata?.version ?? data.version ?? '0.1.0',
      author: info.author,
      source: info.repo,
      ...(data['argument-hint'] ? { 'argument-hint': data['argument-hint'] } : {}),
      ...metadata,
    },
  };
}

function copyFolder(source, target, skip = []) {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true, filter: (path) => !skip.some((part) => path.split(/[\\/]/).includes(part)) });
}

function importSkill(spec) {
  const info = upstreamInfo(spec.upstream);
  const target = join(ROOT, 'skills', spec.name);
  let text;
  if (spec.fromFile) {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    text = `---\nname: ${spec.name}\n---\n\n${readFileSync(join(aimprenta, spec.fromFile), 'utf8')}`;
  } else {
    const source = spec.live ? upstreamDir(spec.upstream) : join(aimprenta, spec.from);
    copyFolder(source, target, spec.skip);
    text = readFileSync(join(source, 'SKILL.md'), 'utf8');
  }
  for (const [from, to, { only, skip = [] } = {}] of spec.extra ?? []) {
    mkdirSync(dirname(join(target, to)), { recursive: true });
    const keep = (path) => {
      const parts = path.split(/[\\/]/);
      if (skip.some((part) => parts.includes(part))) return false;
      return !only || path === join(aimprenta, from) || only.includes(parts.at(-1));
    };
    cpSync(join(aimprenta, from), join(target, to), { recursive: true, filter: keep });
  }
  portableTree(target, spec.treeRewrite);
  if (spec.rewrite) text = spec.rewrite(text);
  let { data, body } = parseFrontmatter(portable(text));
  if (spec.prefaceFile) body = `${spec.preface(readFileSync(join(aimprenta, spec.prefaceFile), 'utf8')).trimEnd()}\n\n${body}`;
  const frontmatter = skillFrontmatter({ name: spec.name, data, description: spec.description, license: info.license, compatibility: spec.compatibility, info, metadata: spec.metadata });
  writeFileSync(join(target, 'SKILL.md'), stringifyFrontmatter(frontmatter, body));
  writeNotice(target, spec.upstream, spec.changes ?? []);
  return `skill/${spec.name}`;
}

function importOwnSkill(spec) {
  const target = join(ROOT, 'skills', spec.name);
  rmSync(target, { recursive: true, force: true });
  for (const [from, to] of spec.files) {
    mkdirSync(dirname(join(target, to)), { recursive: true });
    cpSync(join(aimprenta, from), join(target, to));
  }
  const frontmatter = {
    name: spec.name, description: spec.description, license: AIMPRENTA.license, compatibility: spec.compatibility,
    metadata: { version: '0.1.0', author: AIMPRENTA.author, source: AIMPRENTA.repo, ...spec.metadata },
  };
  writeFileSync(join(target, 'SKILL.md'), stringifyFrontmatter(frontmatter, spec.body));
  return `skill/${spec.name}`;
}

function importAgent(spec) {
  const info = upstreamInfo(spec.upstream);
  const file = join(aimprenta, spec.from ?? join('vendor', spec.upstream, 'agents', `${spec.name}.md`));
  const text = readFileSync(file, 'utf8');
  const { data, body } = parseFrontmatter(portable(spec.rewrite ? spec.rewrite(text) : text));
  const frontmatter = {
    name: spec.name,
    description: data.description,
    version: '0.1.0',
    ...(body.includes('`academic-writing-principles`') ? { requires: ['academic-writing-principles'] } : {}),
    tags: [spec.category],
    source: info.repo,
    license: info.license,
  };
  const target = join(ROOT, 'agents', spec.category, `${spec.name}.md`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, stringifyFrontmatter(frontmatter, body));
  return `agent/${spec.name}`;
}

// Everything that can be named as a dependency, to derive each workflow's
// `requires` and `agents` from the components its body names in backticks.
function knownNames() {
  return {
    skills: new Set([...SKILLS, ...OWN_SKILLS, ...WORKFLOWS, ...EXTERNALS].map((spec) => spec.name)),
    agents: new Set(AGENTS.map((spec) => spec.name)),
  };
}

// A patch that no longer matches upstream must stop the import, not vanish.
function replaceOnce(text, from, to) {
  if (!text.includes(from)) fail(`patch text not found upstream: ${from.slice(0, 60)}`);
  return text.replace(from, () => to);
}

const namedIn = (body, names, self) => [...names].filter((name) => name !== self && body.includes(`\`${name}\``)).sort();

function importWorkflow(spec) {
  const target = join(ROOT, 'workflows', spec.name);
  let text;
  if (spec.fromAgent) {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    text = readFileSync(join(aimprenta, spec.fromAgent), 'utf8');
  } else {
    copyFolder(join(aimprenta, spec.from), target);
    portableTree(target);
    text = readFileSync(join(aimprenta, spec.from, 'SKILL.md'), 'utf8');
  }
  if (spec.rewrite) text = spec.rewrite(text);
  const { data, body: rawBody } = parseFrontmatter(portable(text));
  // A dependency the body names only in prose still has to appear in backticks.
  const explicit = [...(spec.requires ?? []), ...(spec.agents ?? [])];
  const unnamed = explicit.filter((name) => !rawBody.includes(`\`${name}\``));
  const body = unnamed.length ? `${rawBody.trimEnd()}\n\nThis workflow also uses ${unnamed.map((name) => `\`${name}\``).join(' and ')}.\n` : rawBody;
  const names = knownNames();
  // The next stage of a pipeline is mentioned, not required: installing the
  // book writer should not install the whole publishing toolchain.
  const requires = namedIn(body, names.skills, spec.name).filter((name) => !(spec.notRequired ?? []).includes(name));
  // An agent may share the workflow's name, as paper-review does.
  const agents = [...new Set([...namedIn(body, names.agents, null), ...(spec.agents ?? [])])].sort();
  const info = spec.upstream ? upstreamInfo(spec.upstream) : AIMPRENTA;
  const frontmatter = {
    name: spec.name,
    description: spec.description ?? data.description,
    license: info.license,
    compatibility: spec.compatibility,
    metadata: {
      version: spec.version ?? '0.1.0',
      author: info.author,
      source: info.repo,
      ...(data['argument-hint'] ? { 'argument-hint': data['argument-hint'] } : {}),
      ...(requires.length ? { requires: requires.join(' ') } : {}),
      ...(agents.length ? { agents: agents.join(' ') } : {}),
      ...spec.metadata,
    },
  };
  writeFileSync(join(target, 'SKILL.md'), stringifyFrontmatter(frontmatter, body));
  if (spec.upstream) writeNotice(target, spec.upstream, spec.changes ?? []);
  return `workflow/${spec.name}`;
}

function importExternal(spec) {
  const origin = lock[spec.lockName];
  if (!origin) fail(`${spec.lockName} is not in vendors.lock`);
  const target = join(ROOT, 'externals', spec.name);
  mkdirSync(target, { recursive: true });
  const entry = {
    name: spec.name, description: spec.description, version: '0.1.0', kind: 'skill',
    repo: origin.repo, commit: origin.commit, path: spec.path, license: spec.license, notes: spec.notes,
  };
  writeFileSync(join(target, 'external.json'), `${JSON.stringify(entry, null, 2)}\n`);
  return `external/${spec.name}`;
}

const args = process.argv.slice(2);
aimprenta = args.find((arg, index) => !arg.startsWith('--') && !['--live', '--only'].includes(args[index - 1]));
if (!aimprenta || !existsSync(join(aimprenta, 'vendors.lock'))) fail('Usage: node scripts/import-aimprenta.mjs <path-to-aimprenta> [--live <dir>] [--only name,name]');
const liveIndex = args.indexOf('--live');
liveDir = liveIndex === -1 ? null : args[liveIndex + 1];
const onlyIndex = args.indexOf('--only');
const only = onlyIndex === -1 ? null : new Set(args[onlyIndex + 1].split(','));
const wanted = (spec) => !only || only.has(spec.name);

for (const upstream of LIVE_UPSTREAMS) {
  if (!SKILLS.some((spec) => spec.upstream === upstream && wanted(spec))) continue;
  if (!liveDir || !existsSync(join(liveDir, upstream, 'SKILL.md'))) fail(`${upstream} is not vendored by aimprenta: clone it at the commit in vendors.lock into <dir>/${upstream} and pass --live <dir>.`);
}
readLock();

const imported = [
  ...SKILLS.filter(wanted).map(importSkill),
  ...OWN_SKILLS.filter(wanted).map(importOwnSkill),
  ...AGENTS.filter(wanted).map(importAgent),
  ...WORKFLOWS.filter(wanted).map(importWorkflow),
  ...EXTERNALS.filter(wanted).map(importExternal),
];
for (const name of imported) console.log(`imported ${name}`);
console.log('\nNext: npm run catalog && npm run validate && npm test');
