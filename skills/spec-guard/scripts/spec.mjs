#!/usr/bin/env node
// spec-guard command line. Run from the project root.
//
//   node spec.mjs check [--strict]           structural checks of the spec and backlog
//   node spec.mjs waves [--write]            compute waves; --write updates ISSUES.md and WAVE_DAG.md
//   node spec.mjs status [--base <branch>]   phases done, sprint progress, the next wave to run
//   node spec.mjs impact <D-03|FR-X-1|S3-07> what a decision, requirement or issue reaches
//   node spec.mjs why <path>                 the issues, decisions and commits behind a file
//   node spec.mjs verify <S3-07> [--base <branch>]  the issue's changes stay in its files and lane
//   node spec.mjs export github|csv|json [--out <dir>]
//
// Options: --root <dir> (default: current directory), --json for machine output.
// No dependencies: Node.js 18 or later and git.

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  DOCS, ISSUE_ID_IN_TEXT, PHASES, assignWaves, checkProject, compareIds, issuesFor, issuesTouching, mergedIds, nextWave,
  readProject, referencesOf, renderWaveDag, toCsv, toGithubScript, verifyChanges, writeWavesInto,
} from './lib.mjs';

const USAGE = 'usage: spec.mjs check|waves|status|impact <id>|why <path>|verify <issue>|export github|csv|json [--root <dir>] [--base <branch>] [--strict] [--write] [--json]';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: 'string', default: '.' },
    base: { type: 'string' },
    out: { type: 'string', default: 'docs/exports' },
    strict: { type: 'boolean' },
    write: { type: 'boolean' },
    json: { type: 'boolean' },
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
  if (values.json) {
    console.log(JSON.stringify(problems, null, 2));
  } else {
    const errors = print(problems);
    const warnings = problems.length - errors;
    const checked = [project.decisions && `${project.decisions.size} decisions`, project.requirements && `${project.requirements.size} requirements`, project.roster && `${project.roster.agents.size} agents`, project.issues && `${project.issues.length} issues`].filter(Boolean);
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
  const committed = git(['diff', '--name-only', `${base}...HEAD`]) ?? git(['diff', '--name-only', base]);
  if (committed === null) fail(`cannot diff against ${base}; pass --base <branch>`);
  const working = git(['diff', '--name-only', 'HEAD']) ?? '';
  const untracked = git(['ls-files', '--others', '--exclude-standard']) ?? '';
  const paths = [...new Set([committed, working, untracked].join('\n').split('\n').filter(Boolean))].sort();
  const { outsideIssue, outsideLane } = verifyChanges(issue, owner, paths);
  const foreign = subjects(`${base}..HEAD`).filter((subject) => !subject.startsWith(issue.id) && !/^Merge /.test(subject));
  const report = { issue: issue.id, owner: issue.data.owner, base, changed: paths, outsideIssue, outsideLane, foreignCommits: foreign };
  if (values.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`${issue.id} (${issue.data.owner}) against ${base}: ${paths.length} changed file(s).`);
    for (const path of outsideIssue) console.log(`ERROR   ${path} is not in ${issue.id}'s files_touched`);
    for (const path of outsideLane) console.log(`ERROR   ${path} is outside ${issue.data.owner}'s lane`);
    for (const subject of foreign) console.log(`warning commit "${subject}" does not start with ${issue.id}`);
    if (!outsideIssue.length && !outsideLane.length) console.log('Every change is inside the issue and the lane.');
    else console.log('\nRevert those changes, or stop and ask the orchestrator to amend the issue. Never widen files_touched silently.');
  }
  process.exitCode = outsideIssue.length || outsideLane.length ? 1 : 0;
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

const commands = { check, waves, status, impact, why, verify, export: exportBacklog };
if (!commands[command]) fail(USAGE);
commands[command]();
