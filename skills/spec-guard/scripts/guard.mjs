#!/usr/bin/env node
// spec-guard hooks. install.mjs wires them into a project; they can also run by hand.
//
//   node guard.mjs pre-commit         git hook: staged files stay inside the active issue and its lane
//   node guard.mjs commit-msg <file>  git hook: on an issue branch, the subject starts with the issue id
//   node guard.mjs pre-tool           agent hook: reads a tool call as JSON on stdin and blocks a file
//                                     edit outside the active issue and lane (exit 2). Claude Code's
//                                     PreToolUse hook protocol.
//
// The active issue is the issue id in the current branch name (wt/S3-07, S3-07-create-booking).
// On a branch without an issue id nothing is restricted, except that a staged docs/ISSUES.md
// must pass `spec.mjs check`. `git commit --no-verify` skips the git hooks; CI runs them again.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { DOCS, ISSUE_ID_IN_TEXT, checkProject, pathInGlobs, readProject } from './lib.mjs';

const [mode, argument] = process.argv.slice(2);

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function context(cwd = process.cwd()) {
  const root = git(['rev-parse', '--show-toplevel'], cwd);
  if (!root) return null;
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root) ?? '';
  const id = ISSUE_ID_IN_TEXT.exec(branch)?.[0] ?? null;
  return { root, branch, id };
}

function activeIssue({ root, id }) {
  const project = readProject(root);
  const issue = project.issues?.find((candidate) => candidate.id === id) ?? null;
  const owner = issue ? project.roster?.agents.get(issue.data.owner) ?? null : null;
  return { project, issue, owner };
}

// Why a path may not be written on this branch, or null when it may.
function refusal(issue, owner, path) {
  if (!pathInGlobs(issue.files, path)) return `${path} is not in ${issue.id}'s files_touched (${issue.files.join(', ')})`;
  if (owner?.owns?.length && !pathInGlobs(owner.owns, path)) return `${path} is outside ${owner.name}'s lane (${owner.owns.join(', ')})`;
  return null;
}

const ADVICE = 'Stay inside the issue, or stop and ask the orchestrator to amend files_touched in docs/ISSUES.md. Never widen it silently.';

function preCommit() {
  const ctx = context();
  if (!ctx) return 0;
  const staged = (git(['diff', '--cached', '--name-only', '--diff-filter=ACMRD'], ctx.root) ?? '').split('\n').filter(Boolean);
  const messages = [];
  if (staged.includes(DOCS.issues)) {
    const errors = checkProject(readProject(ctx.root)).filter((problem) => problem.level === 'error');
    for (const problem of errors) messages.push(`${problem.where}: ${problem.message}`);
  }
  if (ctx.id) {
    const { issue, owner } = activeIssue(ctx);
    if (!issue) messages.push(`branch ${ctx.branch} names ${ctx.id}, which is not in ${DOCS.issues}`);
    else for (const path of staged) {
      const reason = refusal(issue, owner, path);
      if (reason) messages.push(reason);
    }
  }
  if (messages.length === 0) return 0;
  console.error(`spec-guard: commit refused\n${messages.map((message) => `  - ${message}`).join('\n')}\n${ctx.id ? ADVICE : 'Fix the backlog with `node tools/spec-guard/spec.mjs check`.'}`);
  return 1;
}

function commitMsg() {
  const ctx = context();
  if (!ctx?.id || !argument) return 0;
  const subject = readFileSync(argument, 'utf8').split('\n').find((line) => line.trim() && !line.startsWith('#')) ?? '';
  if (subject.startsWith(ctx.id) || /^(Merge|Revert|fixup!|squash!)/.test(subject)) return 0;
  console.error(`spec-guard: on branch ${ctx.branch} the commit subject must start with ${ctx.id}, for example:\n  ${ctx.id} task-1: <what changed> [refs: D-03]\nThat id is how impact and why trace code back to decisions.`);
  return 1;
}

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

function preTool() {
  let call;
  try {
    call = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  if (!EDIT_TOOLS.has(call.tool_name)) return 0;
  const target = call.tool_input?.file_path ?? call.tool_input?.notebook_path;
  const ctx = context(call.cwd);
  if (!target || !ctx?.id) return 0;
  const absolute = isAbsolute(target) ? target : resolve(call.cwd ?? process.cwd(), target);
  const path = relative(ctx.root, absolute).split('\\').join('/');
  if (path.startsWith('..')) return 0;
  const { issue, owner } = activeIssue(ctx);
  if (!issue) return 0;
  const reason = refusal(issue, owner, path);
  if (!reason) return 0;
  console.error(`spec-guard blocked this edit: ${reason}. ${ADVICE}`);
  return 2;
}

const modes = { 'pre-commit': preCommit, 'commit-msg': commitMsg, 'pre-tool': preTool, 'claude-pre-tool': preTool };
if (!modes[mode]) {
  console.error('usage: guard.mjs pre-commit | commit-msg <file> | pre-tool');
  process.exit(2);
}
process.exit(modes[mode]());
