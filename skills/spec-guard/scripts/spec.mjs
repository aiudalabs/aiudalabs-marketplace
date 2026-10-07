#!/usr/bin/env node
// spec-guard command line. Run from the project root.
//
//   node spec.mjs check [--strict]           structural checks of the spec and backlog
//   node spec.mjs waves [--write]            compute waves; --write updates ISSUES.md and WAVE_DAG.md
//   node spec.mjs status [--base <branch>]   phases done, sprint progress, the next wave to run
//   node spec.mjs impact <D-03|FR-X-1|S3-07> what a decision, requirement or issue reaches
//   node spec.mjs why <path>                 the issues, decisions and commits behind a file
//   node spec.mjs verify <S3-07> [--base <branch>] [--worktree]  the issue's commits stay in its files and lane
//   node spec.mjs amend <S3-07> [--add-file p] [--remove-file p] [--add-dep id] [--remove-dep id]
//                               [--add-read r] [--remove-read r]   edit one issue, recompute waves, sync prompts
//   node spec.mjs prompts [--write]          executor and orchestrator prompts match docs/ISSUES.md
//   node spec.mjs export github|csv|json [--out <dir>]
//
// Options: --root <dir> (default: current directory), --json for machine output.
// No dependencies: Node.js 18 or later and git.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  AMENDABLE, DOCS, ISSUE_ID_IN_TEXT, PHASES, amendIssue, assignWaves, checkProject, compareIds, issuesFor, issuesTouching, mergedIds,
  nextWave, parseIssues, readProject, referencesOf, refsProblems, renderWaveDag, syncPrompts, toCsv, toGithubScript, verifyChanges,
  writeWavesInto,
} from './lib.mjs';

const USAGE = 'usage: spec.mjs check|waves|status|impact <id>|why <path>|verify <issue>|amend <issue>|prompts|export github|csv|json [--root <dir>] [--base <branch>] [--strict] [--write] [--worktree] [--json]';
const AMEND_OPTIONS = Object.fromEntries(Object.keys(AMENDABLE).flatMap((what) => [[`add-${what}`, { type: 'string', multiple: true }], [`remove-${what}`, { type: 'string', multiple: true }]]));

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: 'string', default: '.' },
    base: { type: 'string' },
    out: { type: 'string', default: 'docs/exports' },
    strict: { type: 'boolean' },
    write: { type: 'boolean' },
    json: { type: 'boolean' },
    worktree: { type: 'boolean' },
    ...AMEND_OPTIONS,
  },
});
const [command, argument] = positionals;
const root = resolve(values.root);

function fail(message) {
  console.error(`spec-guard: ${message}`);
  process.exit(2);
}

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return result.stdout;
}

const branchExists = (name) => git(['rev-parse', '--verify', '--quiet', name]) !== null;

function baseBranch() {
  if (values.base) return values.base;
  return ['develop', 'main', 'master'].find(branchExists) ?? 'HEAD';
}

const isAncestor = (commit, ref) => spawnSync('git', ['merge-base', '--is-ancestor', commit, ref], { cwd: root }).status === 0;

// Paths and globs of files_touched that git ignores: a new file there cannot be committed without -f.
// A glob is probed with a stand-in name (`lib/**` as `lib/spec-guard-probe`).
function ignoredPaths(files) {
  const probes = files.map((file) => ({ file, probe: file.replace(/\/$/, '/**').replace(/\*\*$/, 'spec-guard-probe').replace(/\*\*/g, 'x').replace(/[*?]/g, 'x') }));
  const result = spawnSync('git', ['check-ignore', '--stdin'], { cwd: root, encoding: 'utf8', input: probes.map((p) => p.probe).join('\n') });
  if (result.error || ![0, 1].includes(result.status)) return [];
  const ignored = new Set(result.stdout.split('\n').filter(Boolean));
  return probes.filter((p) => ignored.has(p.probe)).map((p) => p.file);
}

const subjects = (ref, extra = []) => (git(['log', '--format=%s', ...extra, ref]) ?? '').split('\n').filter(Boolean);

function load() {
  const project = readProject(root);
  if (!project.issues && !['status', 'check'].includes(command)) fail(`no backlog at ${DOCS.issues}; run the multi-agent-governance skill first`);
  return project;
}

function print(problems) {
  const errors = problems.filter((problem) => problem.level === 'error');
  for (const problem of problems) console.log(`${problem.level === 'error' ? 'ERROR  ' : 'warning'} ${problem.where}  ${problem.message}`);
  return errors.length;
}

// ---------------------------------------------------------------- commands

function check() {
  const project = load();
  const problems = checkProject(project, { strict: values.strict });
  for (const issue of project.issues ?? []) {
    for (const file of ignoredPaths(issue.files)) problems.push({ level: 'warning', code: 'ignored-path', where: `${DOCS.issues}:${issue.line}`, message: `${issue.id}: git ignores ${file}, so its files cannot be committed; fix .gitignore in the issue that owns it` });
  }
  if (values.json) {
    console.log(JSON.stringify(problems, null, 2));
  } else {
    const errors = print(problems);
    const warnings = problems.length - errors;
    const checked = [project.brief && 'the brief', project.decisions && `${project.decisions.size} decisions`, project.requirements && `${project.requirements.size} requirements`, project.roster && `${project.roster.agents.size} agents`, project.screens && `${project.screens.screens.size} screens`, project.issues && `${project.issues.length} issues`].filter(Boolean);
    const scope = checked.length ? checked.join(', ') : 'no spec documents yet';
    const verdict = errors ? '' : project.issues ? ' The backlog is consistent.' : ' No backlog yet: multi-agent-governance writes it in Phase 6.';
    console.log(`\nChecked ${scope}: ${errors} error(s), ${warnings} warning(s).${verdict}`);
  }
  process.exitCode = problems.some((problem) => problem.level === 'error') ? 1 : 0;
}

function waves() {
  const project = load();
  const { waves: computed, stuck } = assignWaves(project.issues);
  if (stuck.length) fail(`cannot assign waves to ${stuck.join(', ')}: a dependency cycle; run \`spec.mjs check\``);
  if (values.write) {
    writeFileSync(join(root, DOCS.issues), writeWavesInto(project.issuesText, computed));
    const updated = readProject(root);
    writeFileSync(join(root, DOCS.waves), renderWaveDag(updated.issues, computed));
    console.log(`Wrote wave numbers into ${DOCS.issues} and the layout into ${DOCS.waves}.`);
    writePrompts(updated.issues);
    return;
  }
  if (values.json) return console.log(JSON.stringify(Object.fromEntries(computed), null, 2));
  console.log(renderWaveDag(project.issues, computed));
  const changed = project.issues.filter((issue) => issue.data.wave !== computed.get(issue.id));
  if (changed.length) console.log(`${changed.length} issue(s) differ from ISSUES.md; run with --write to update it.`);
}

function status() {
  const project = readProject(root);
  const base = baseBranch();
  const done = PHASES.map((phase) => ({ ...phase, done: phase.done(root) }));
  const report = { phases: done.map(({ phase, skill, done: isDone }) => ({ phase, skill, done: isDone })), profile: project.profile, base };
  if (project.issues) {
    const merged = mergedIds(subjects(base));
    const { waves: computed } = assignWaves(project.issues);
    const sprints = [...new Set(project.issues.map((issue) => issue.sprint))].sort((a, b) => a - b);
    report.sprints = sprints.map((sprint) => {
      const inSprint = project.issues.filter((issue) => issue.sprint === sprint);
      return { sprint, merged: inSprint.filter((issue) => merged.has(issue.id)).length, total: inSprint.length };
    });
    const next = nextWave(project.issues, computed, merged);
    report.next = next && { sprint: next.sprint, wave: next.wave, ready: next.ready.map((issue) => issue.id), blocked: next.blocked.map((issue) => issue.id) };
    report.errors = checkProject(project).filter((problem) => problem.level === 'error').length;
  }
  if (values.json) return console.log(JSON.stringify(report, null, 2));

  console.log('Spec');
  for (const phase of done) console.log(`  ${phase.done ? '[x]' : '[ ]'} Phase ${phase.phase}  ${phase.skill}`);
  console.log(`  Stack profile: ${project.profile ?? 'not locked'}`);
  const next = done.find((phase) => !phase.done);
  if (!report.sprints) {
    console.log(next ? `\nNext: Phase ${next.phase}, the \`${next.skill}\` skill.` : '\nThe spec is complete.');
    return;
  }
  console.log(`\nBuild (merged = a commit on ${base} starts with the issue id)`);
  for (const sprint of report.sprints) console.log(`  Sprint ${sprint.sprint}: ${sprint.merged}/${sprint.total} merged`);
  if (report.errors) console.log(`\n${report.errors} backlog error(s): run \`spec.mjs check\` before building.`);
  if (!report.next) return console.log('\nEvery issue is merged.');
  console.log(`\nNext: sprint ${report.next.sprint}, wave ${report.next.wave}`);
  if (report.next.ready.length) console.log(`  ready:   ${report.next.ready.join(', ')}`);
  if (report.next.blocked.length) console.log(`  blocked: ${report.next.blocked.join(', ')} (a dependency is not merged)`);
}

function impact() {
  if (!argument) fail('impact needs a decision, requirement or issue id, such as D-03, FR-ORDER-1 or S3-07');
  const project = load();
  const issues = issuesFor(project.issues, argument);
  const title = project.decisions?.get(argument)?.title ?? project.requirements?.get(argument)?.title ?? issues[0]?.title ?? '';
  const dependents = issues.flatMap((issue) => project.issues.filter((other) => other.deps.includes(issue.id) && !issues.includes(other)));
  const files = [...new Set(issues.flatMap((issue) => issue.files))];
  const ids = [argument, ...issues.map((issue) => issue.id)];
  const commits = [...new Set(ids.flatMap((id) => (git(['log', '--all', '--format=%h %s', `--grep=${id}`]) ?? '').split('\n').filter(Boolean)))];
  const report = { id: argument, title, issues: issues.map((issue) => issue.id), dependents: [...new Set(dependents.map((issue) => issue.id))], files, commits };
  if (values.json) return console.log(JSON.stringify(report, null, 2));
  if (issues.length === 0) console.log(`No issue implements ${argument}.`);
  console.log(`${argument}${title ? ` — ${title}` : ''}`);
  console.log(`\nIssues (${issues.length}):`);
  for (const issue of issues.sort((a, b) => compareIds(a.id, b.id))) console.log(`  ${issue.id} ${issue.title}  [${issue.data.owner}]`);
  if (report.dependents.length) console.log(`\nIssues that depend on them: ${report.dependents.join(', ')}`);
  console.log(`\nFiles (${files.length}):`);
  for (const file of files) console.log(`  ${file}`);
  console.log(`\nCommits (${commits.length}):`);
  for (const commit of commits) console.log(`  ${commit}`);
  console.log('\nChanging it means revisiting these issues, re-running their acceptance tests and re-reviewing these files.');
}

function why() {
  if (!argument) fail('why needs a file path');
  const project = load();
  const path = relative(root, resolve(argument)).split('\\').join('/');
  const issues = issuesTouching(project.issues, path);
  const refs = [...new Set(issues.flatMap(referencesOf))];
  const history = (git(['log', '--format=%h %s', '--', path]) ?? '').split('\n').filter(Boolean);
  const cited = [...new Set(history.map((line) => ISSUE_ID_IN_TEXT.exec(line)?.[0]).filter(Boolean))];
  if (values.json) return console.log(JSON.stringify({ path, issues: issues.map((issue) => issue.id), refs, commits: history, citedIssues: cited }, null, 2));
  console.log(path);
  if (issues.length === 0 && history.length === 0) return console.log('\nNo issue lists this file and no commit touched it.');
  console.log('\nPlanned by:');
  for (const issue of issues) console.log(`  ${issue.id} ${issue.title}  [${issue.data.owner}]`);
  if (refs.length) console.log('\nBecause of:');
  for (const ref of refs) console.log(`  ${ref} — ${project.decisions?.get(ref)?.title ?? project.requirements?.get(ref)?.title ?? '(not found in the docs)'}`);
  console.log(`\nCommits (${history.length}):`);
  for (const line of history.slice(0, 20)) console.log(`  ${line}`);
  const unplanned = cited.filter((id) => !issues.some((issue) => issue.id === id));
  if (unplanned.length) console.log(`\nCommits from ${unplanned.join(', ')} changed this file without listing it in files_touched.`);
}

function verify() {
  if (!argument) fail('verify needs an issue id, such as S3-07');
  const project = load();
  const issue = project.issues.find((candidate) => candidate.id === argument);
  if (!issue) fail(`${argument} is not in ${DOCS.issues}`);
  const owner = project.roster?.agents.get(issue.data.owner);
  const base = baseBranch();
  const lines = (text) => (text ?? '').split('\n').filter(Boolean);
  // The verdict covers what the branch committed since it left the base. Files a tool or a reviewer
  // wrote locally (melos overrides, a refreshed lockfile) are listed apart, unless --worktree.
  const committedText = git(['diff', '--name-only', `${base}...HEAD`]) ?? git(['diff', '--name-only', base]);
  if (committedText === null) fail(`cannot diff against ${base}; pass --base <branch>`);
  const committed = [...new Set(lines(committedText))].sort();
  const uncommitted = [...new Set([...lines(git(['diff', '--name-only', 'HEAD'])), ...lines(git(['ls-files', '--others', '--exclude-standard']))])].sort();
  const checked = values.worktree ? [...new Set([...committed, ...uncommitted])].sort() : committed;
  const { outsideIssue, outsideLane } = verifyChanges(issue, owner, checked);
  const outsideOf = (paths) => { const found = verifyChanges(issue, owner, paths); return [...new Set([...found.outsideIssue, ...found.outsideLane])].sort(); };
  const loose = values.worktree ? [] : outsideOf(uncommitted);
  const log = lines(git(['log', '--format=%H %P%x09%s', `${base}..HEAD`])).map((line) => {
    const [hashes, subject = ''] = line.split('\t');
    const [hash, ...parents] = hashes.split(' ');
    return { hash, parents, subject };
  });
  const foreign = log.filter((commit) => commit.parents.length < 2 && !commit.subject.startsWith(issue.id)).map((commit) => commit.subject);
  const merges = log.filter((commit) => commit.parents.length > 1 && commit.parents.slice(1).some((parent) => !isAncestor(parent, base))).map((commit) => `${commit.hash.slice(0, 7)} ${commit.subject}`);
  const badRefs = log.flatMap((commit) => refsProblems(issue, commit.subject).map((problem) => `commit "${commit.subject}": ${problem}`));
  const ignored = ignoredPaths(issue.files);
  const report = { issue: issue.id, owner: issue.data.owner, base, changed: checked, uncommitted, outsideIssue, outsideLane, foreignCommits: foreign, foreignMerges: merges, refs: badRefs, ignored };
  if (values.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`${issue.id} (${issue.data.owner}) against ${base}: ${checked.length} ${values.worktree ? 'changed (committed or not)' : 'committed'} file(s).`);
    for (const path of outsideIssue) console.log(`ERROR   ${path} is not in ${issue.id}'s files_touched`);
    for (const path of outsideLane) console.log(`ERROR   ${path} is outside ${issue.data.owner}'s lane`);
    for (const subject of foreign) console.log(`warning commit "${subject}" does not start with ${issue.id}`);
    for (const merge of merges) console.log(`warning merge ${merge} brings in commits that are not on ${base}; sync an issue branch only by merging ${base}`);
    for (const problem of badRefs) console.log(`warning ${problem}`);
    for (const file of ignored) console.log(`warning git ignores ${file} from files_touched; its new files need a .gitignore fix, never git add -f`);
    if (loose.length) console.log(`warning (uncommitted) not part of the verdict, outside the issue or lane: ${loose.join(', ')}`);
    if (!outsideIssue.length && !outsideLane.length) console.log(`Every ${values.worktree ? 'change' : 'committed change'} is inside the issue and the lane.`);
    else console.log('\nRevert those changes, or stop and ask the orchestrator to amend the issue (`spec.mjs amend`). Never widen files_touched silently.');
  }
  process.exitCode = outsideIssue.length || outsideLane.length ? 1 : 0;
}

// Brings docs/SPRINT_PROMPTS.md in line with the issues; returns the drift that was fixed.
function writePrompts(issues) {
  const file = join(root, DOCS.prompts);
  if (!existsSync(file)) return null;
  const { text, drift } = syncPrompts(readFileSync(file, 'utf8'), issues);
  if (!drift.length) return drift;
  writeFileSync(file, text);
  console.log(`Updated ${DOCS.prompts}:`);
  for (const item of drift) console.log(`  line ${item.line}: ${item.message}`);
  return drift;
}

function prompts() {
  const project = load();
  if (project.prompts === null) fail(`no ${DOCS.prompts}`);
  if (values.write) {
    const fixed = writePrompts(project.issues);
    if (!fixed.length) console.log(`${DOCS.prompts} already matches ${DOCS.issues}.`);
    const left = syncPrompts(readFileSync(join(root, DOCS.prompts), 'utf8'), project.issues).drift;
    for (const item of left) console.log(`ERROR   ${DOCS.prompts}:${item.line} ${item.message}; fix it by hand or regenerate the sprint with execution-router`);
    process.exitCode = left.length ? 1 : 0;
    return;
  }
  const { drift } = syncPrompts(project.prompts, project.issues);
  if (values.json) console.log(JSON.stringify(drift, null, 2));
  else {
    for (const item of drift) console.log(`ERROR   ${DOCS.prompts}:${item.line} ${item.message}`);
    console.log(drift.length ? `\n${drift.length} stale part(s); run \`spec.mjs prompts --write\`.` : `${DOCS.prompts} matches ${DOCS.issues}.`);
  }
  process.exitCode = drift.length ? 1 : 0;
}

// Edits one issue's files_touched, depends_on or reads, so nobody edits issue YAML by hand. Refuses an
// amendment that adds errors to the backlog; otherwise writes ISSUES.md, WAVE_DAG.md and the prompts.
function amend() {
  if (!argument) fail('amend needs an issue id, such as S3-07');
  const changes = Object.entries(AMENDABLE).flatMap(([what, key]) => ['add', 'remove'].flatMap((op) => (values[`${op}-${what}`] ?? []).map((value) => ({ op, key, value }))));
  if (!changes.length) fail('amend needs at least one of --add-file, --remove-file, --add-dep, --remove-dep, --add-read, --remove-read');
  const project = load();
  const { text: amended, problems } = amendIssue(project.issuesText, argument, changes);
  if (problems.length) fail(`nothing changed: ${problems.join('; ')}`);
  const { issues } = parseIssues(amended);
  const { waves: computed, stuck } = assignWaves(issues);
  if (stuck.length) fail(`nothing changed: the amendment makes a dependency cycle (${stuck.join(', ')})`);
  const nextText = writeWavesInto(amended, computed);

  const key = (problem) => `${problem.code}|${problem.message}`;
  const before = new Set(checkProject(project).filter((problem) => problem.level === 'error' && problem.code !== 'prompt-drift').map(key));
  const after = checkProject({ ...project, issuesText: nextText, issues: parseIssues(nextText).issues, prompts: null });
  const added = after.filter((problem) => problem.level === 'error' && !before.has(key(problem)));
  if (added.length) {
    print(added);
    fail(`nothing changed: the amendment adds ${added.length} error(s) to the backlog`);
  }

  const moved = project.issues.filter((issue) => issue.data.wave !== computed.get(issue.id)).map((issue) => `${issue.id} ${issue.data.wave ?? '-'} -> ${computed.get(issue.id)}`);
  writeFileSync(join(root, DOCS.issues), nextText);
  const updated = readProject(root);
  writeFileSync(join(root, DOCS.waves), renderWaveDag(updated.issues, computed));
  for (const change of changes) console.log(`${argument} ${change.key}: ${change.op === 'add' ? '+' : '-'} ${change.value}`);
  console.log(`Wrote ${DOCS.issues} and ${DOCS.waves}.${moved.length ? ` Waves moved: ${moved.join(', ')}.` : ' No wave moved.'}`);
  const fixed = writePrompts(updated.issues);
  if (fixed === null) console.log(`No ${DOCS.prompts} to update.`);
  const left = fixed === null ? [] : syncPrompts(readFileSync(join(root, DOCS.prompts), 'utf8'), updated.issues).drift;
  for (const item of left) console.log(`STALE   ${DOCS.prompts}:${item.line} ${item.message}; fix it by hand or regenerate the sprint with execution-router`);
  for (const problem of checkProject(updated).filter((p) => p.level === 'warning' && p.where.startsWith(DOCS.issues) && p.message.startsWith(argument))) console.log(`warning ${problem.message}`);
  console.log(`\nCommit ${DOCS.issues}, ${DOCS.waves}${fixed ? ` and ${DOCS.prompts}` : ''} together. A worktree already running ${argument} gets the change by merging the base branch after that commit.`);
  process.exitCode = left.length ? 1 : 0;
}

function exportBacklog() {
  const formats = { github: ['github-issues.sh', toGithubScript], csv: ['issues.csv', toCsv], jira: ['issues.csv', toCsv], linear: ['issues.csv', toCsv], json: ['issues.json', null] };
  const format = formats[argument];
  if (!format) fail('export needs github, csv or json');
  const project = load();
  const errors = checkProject(project).filter((problem) => problem.level === 'error');
  if (errors.length) fail(`the backlog has ${errors.length} error(s); run \`spec.mjs check\` and fix them before exporting`);
  const issues = [...project.issues].sort((a, b) => compareIds(a.id, b.id));
  const [fileName, render] = format;
  const content = render ? render(issues) : `${JSON.stringify(issues.map((issue) => ({ id: issue.id, title: issue.title, sprint: issue.sprint, ...issue.data, body: issue.body.trim() })), null, 2)}\n`;
  const dir = resolve(root, values.out);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, fileName);
  writeFileSync(file, content, { mode: argument === 'github' ? 0o755 : 0o644 });
  console.log(`Wrote ${relative(root, file)} (${issues.length} issues).`);
  if (argument === 'github') console.log('Review it, then run it: it creates labels, one milestone per sprint and one issue per backlog item with the gh CLI.');
  else if (argument !== 'json') console.log('Import it with your tracker\'s CSV importer (Jira and Linear both have one) and map the columns there. Dependencies arrive as text; link them in the tracker.');
}

const commands = { check, waves, status, impact, why, verify, amend, prompts, export: exportBacklog };
if (!commands[command]) fail(USAGE);
commands[command]();
