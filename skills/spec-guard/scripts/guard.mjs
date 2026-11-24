#!/usr/bin/env node
// spec-guard hooks. install.mjs wires them into a project; they can also run by hand.
//
//   node guard.mjs pre-commit         git hook: staged files stay inside the active issue and its lane
//   node guard.mjs commit-msg <file>  git hook: on an issue branch, the subject starts with the issue id
//                                     and its `[refs: ...]`, if any, names only the issue's refs
//   node guard.mjs pre-merge-commit   git hook: an issue branch merges only commits already on the base
//   node guard.mjs pre-tool           agent hook: reads a tool call as JSON on stdin and blocks a file
//                                     edit outside the active issue and lane (exit 2). Claude Code's
//                                     PreToolUse hook protocol.
//
// The active issue is the issue id in the current branch name (wt/S3-07, S3-07-create-booking).
// On a branch without an issue id nothing is restricted, except that a staged docs/ISSUES.md
// must pass `spec.mjs check`. The base is develop, main or master, the first that exists.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { DOCS, ISSUE_ID_IN_TEXT, checkProject, pathInGlobs, readProject, refsProblems } from './lib.mjs';

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

const ADVICE = 'Stay inside the issue, or stop and ask the orchestrator to amend it (`node tools/spec-guard/spec.mjs amend <id> --add-file <path>`). Never widen it silently, never --no-verify.';

// Why the merge in progress may not land on this issue branch, or null. An issue branch syncs by merging
// the base branch (or a commit already on it); anything else would bring in changes no hook checked.
// git names the merged heads in GITHEAD_<sha> variables during pre-merge-commit, and in MERGE_HEAD once a
// conflicted merge is being concluded.
function mergeHeads(root) {
  const fromEnv = Object.keys(process.env).map((key) => /^GITHEAD_([0-9a-f]{40,64})$/.exec(key)?.[1]).filter(Boolean);
  if (fromEnv.length) return fromEnv;
  const file = git(['rev-parse', '--git-path', 'MERGE_HEAD'], root);
  const path = file && resolve(root, file);
  return path && existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean) : [];
}

function mergeRefusal(ctx) {
  const heads = mergeHeads(ctx.root);
  if (!ctx.id || !heads.length) return null;
  const base = ['develop', 'main', 'master'].find((name) => git(['rev-parse', '-q', '--verify', name], ctx.root) !== null);
  if (!base) return null;
  const foreign = heads.filter((head) => spawnSync('git', ['merge-base', '--is-ancestor', head, base], { cwd: ctx.root }).status !== 0);
  if (!foreign.length) return null;
  return `merge refused on ${ctx.branch}: ${foreign.map((head) => head.slice(0, 7)).join(', ')} is not on ${base}. Sync an issue branch only by merging ${base}; ask the orchestrator to land the change on ${base} first.`;
}

function preMergeCommit() {
  const ctx = context();
  const reason = ctx && mergeRefusal(ctx);
  if (!reason) return 0;
  console.error(`spec-guard: ${reason}`);
  return 1;
}

function preCommit() {
  const ctx = context();
  if (!ctx) return 0;
  const staged = (git(['diff', '--cached', '--name-only', '--diff-filter=ACMRD'], ctx.root) ?? '').split('\n').filter(Boolean);
  const messages = [];
  if (staged.includes(DOCS.issues)) {
    const errors = checkProject(readProject(ctx.root)).filter((problem) => problem.level === 'error');
    for (const problem of errors) messages.push(`${problem.where}: ${problem.message}`);
  }
  const merging = mergeHeads(ctx.root).length > 0;
  if (merging) {
    // Concluding a merge after conflicts: the staged files are the base's; the merge rule applies instead.
    const reason = mergeRefusal(ctx);
    if (reason) messages.push(reason);
  } else if (ctx.id) {
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
  if (/^(Merge|Revert|fixup!|squash!)/.test(subject)) return 0;
  if (!subject.startsWith(ctx.id)) {
    console.error(`spec-guard: on branch ${ctx.branch} the commit subject must start with ${ctx.id}, for example:\n  ${ctx.id} task-1: <what changed> [refs: D-03]\nThat id is how impact and why trace code back to decisions.`);
    return 1;
  }
  const { issue } = activeIssue(ctx);
  const problems = issue ? refsProblems(issue, subject) : [];
  if (!problems.length) return 0;
  console.error(`spec-guard: commit refused\n${problems.map((problem) => `  - ${problem}`).join('\n')}\n[refs: ...] lists only ids from the issue's decision_refs and requirement_refs; omit it when both are empty.`);
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

const modes = { 'pre-commit': preCommit, 'commit-msg': commitMsg, 'pre-merge-commit': preMergeCommit, 'pre-tool': preTool, 'claude-pre-tool': preTool };
if (!modes[mode]) {
  console.error('usage: guard.mjs pre-commit | commit-msg <file> | pre-merge-commit | pre-tool');
  process.exit(2);
}
process.exit(modes[mode]());
