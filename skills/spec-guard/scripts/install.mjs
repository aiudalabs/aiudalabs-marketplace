#!/usr/bin/env node
// Installs spec-guard into a project, so the checks travel with the repository:
//
//   tools/spec-guard/         spec.mjs, guard.mjs and lib.mjs, committed with the project
//   .githooks/pre-commit      staged files stay inside the active issue and its lane
//   .githooks/commit-msg      commit subjects on an issue branch start with the issue id
//   .githooks/pre-merge-commit  an issue branch merges only commits already on the base branch
//   git config core.hooksPath .githooks   (local to this clone; every clone runs it once)
//
// Options:
//   --claude   also add a Claude Code PreToolUse hook to .claude/settings.json that blocks
//              an edit outside the active issue before it happens
//   --ci       also add .github/workflows/spec-guard.yml: check --strict on every push, and
//              verify on pull requests from issue branches
//   --root <dir>  the project (default: current directory)
//   --force    replace hook and workflow files that already exist
//
// Existing files that spec-guard did not write are left alone, with a message.

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const MARK = 'spec-guard';
const TOOLS = 'tools/spec-guard';

const { values } = parseArgs({ options: { root: { type: 'string', default: '.' }, claude: { type: 'boolean' }, ci: { type: 'boolean' }, force: { type: 'boolean' } } });

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

const root = git(['rev-parse', '--show-toplevel'], resolve(values.root));
if (!root) {
  console.error('spec-guard: not a git repository. Run `git init` first, then install again.');
  process.exit(2);
}

const report = [];
const ours = (file) => existsSync(file) && readFileSync(file, 'utf8').includes(MARK);

function writeOwned(path, content, mode = 0o644) {
  const file = join(root, path);
  if (existsSync(file) && !ours(file) && !values.force) {
    report.push(`kept     ${path} (exists and was not written by spec-guard; add the call yourself or use --force)`);
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content, { mode });
  report.push(`wrote    ${path}`);
}

// The tools themselves.
mkdirSync(join(root, TOOLS), { recursive: true });
for (const name of ['lib.mjs', 'spec.mjs', 'guard.mjs']) copyFileSync(join(here, name), join(root, TOOLS, name));
writeFileSync(join(root, TOOLS, 'README.md'), `# spec-guard

Installed by the spec-guard skill. Checks the spec and backlog in \`docs/\` with code, and keeps each
issue's changes inside its files and its agent's lane. Commit this folder with the project.

\`\`\`bash
node ${TOOLS}/spec.mjs check --strict   # the backlog is consistent
node ${TOOLS}/spec.mjs waves --write    # compute waves into docs/ISSUES.md and docs/WAVE_DAG.md
node ${TOOLS}/spec.mjs status           # phases, sprint progress, the next wave
node ${TOOLS}/spec.mjs impact D-03      # what a decision, requirement or issue reaches
node ${TOOLS}/spec.mjs why <file>       # the issues and decisions behind a file
node ${TOOLS}/spec.mjs verify S3-07     # the issue's commits stay inside its files and lane
node ${TOOLS}/spec.mjs amend S3-07 --add-file <path>   # amend an issue; never edit its frontmatter by hand
node ${TOOLS}/spec.mjs prompts --write  # docs/SPRINT_PROMPTS.md matches docs/ISSUES.md
\`\`\`

After cloning, enable the git hooks once: \`git config core.hooksPath .githooks\`.
`);
report.push(`wrote    ${TOOLS}/ (lib.mjs, spec.mjs, guard.mjs, README.md)`);

// Git hooks, committed under .githooks so every clone can enable them.
const hook = (args) => `#!/bin/sh\n# ${MARK}: keeps commits inside the active issue. If this blocks you, ask the orchestrator to amend files_touched; never --no-verify.\nexec node "$(git rev-parse --show-toplevel)/${TOOLS}/guard.mjs" ${args}\n`;
writeOwned('.githooks/pre-commit', hook('pre-commit'), 0o755);
writeOwned('.githooks/commit-msg', hook('commit-msg "$1"'), 0o755);
writeOwned('.githooks/pre-merge-commit', hook('pre-merge-commit'), 0o755);
const hooksPath = git(['config', '--get', 'core.hooksPath'], root);
if (hooksPath && hooksPath !== '.githooks') {
  report.push(`kept     core.hooksPath=${hooksPath} (already set; point it at .githooks or call the hooks from yours)`);
} else {
  git(['config', 'core.hooksPath', '.githooks'], root);
  report.push('set      git config core.hooksPath .githooks (this clone; others run it once)');
}

// Claude Code: block the edit itself, before it reaches a commit.
if (values.claude) {
  const path = '.claude/settings.json';
  const file = join(root, path);
  let settings = {};
  if (existsSync(file)) {
    try {
      settings = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      console.error(`spec-guard: ${path} is not valid JSON; fix it and install again.`);
      process.exit(2);
    }
  }
  const command = `node "$CLAUDE_PROJECT_DIR/${TOOLS}/guard.mjs" pre-tool`;
  settings.hooks ??= {};
  settings.hooks.PreToolUse ??= [];
  const present = settings.hooks.PreToolUse.some((entry) => entry.hooks?.some((h) => h.command === command));
  if (!present) settings.hooks.PreToolUse.push({ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command }] });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
  report.push(`${present ? 'kept    ' : 'updated '} ${path} (PreToolUse hook blocks edits outside the active issue)`);
}

// CI: the same checks on every push and pull request.
if (values.ci) {
  writeOwned('.github/workflows/spec-guard.yml', `# ${MARK}: the backlog stays consistent and each issue's pull request stays in its lane.
name: spec-guard
on:
  push:
  pull_request:
jobs:
  spec-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Backlog is consistent
        run: node ${TOOLS}/spec.mjs check --strict
      - name: Pull request stays inside its issue
        if: github.event_name == 'pull_request'
        env:
          HEAD_REF: \${{ github.head_ref }}
          BASE_REF: \${{ github.base_ref }}
        run: |
          id=$(printf '%s' "$HEAD_REF" | grep -oE 'S[0-9]+-[0-9]+' | head -n 1 || true)
          if [ -z "$id" ]; then echo "No issue id in $HEAD_REF; nothing to verify."; exit 0; fi
          node ${TOOLS}/spec.mjs verify "$id" --base "origin/$BASE_REF"
`);
}

console.log(report.join('\n'));
console.log(`\nCommit ${TOOLS}/ and .githooks/ with the project. Run \`node ${TOOLS}/spec.mjs check\` to start.`);
