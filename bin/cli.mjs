#!/usr/bin/env node
// aiudalabs-marketplace CLI: list components and install them into a harness.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { adapters, getAdapter } from '../adapters/index.mjs';
import { ROOT, loadAll, requiredTools, skillRequires, workflowAgents } from '../lib/components.mjs';
import { InstallError, applyInstall, expand, missingTools, planInstall, resolveReference } from '../lib/install.mjs';
import {
  MANIFEST_FILE, classifyUpdate, hashTarget, manifestHarnesses, outdated, planRemoval, readManifest, recordInstall, recordRemoval,
  resolveTarget, writeManifest,
} from '../lib/manifest.mjs';
import { SCAFFOLD_KINDS, planScaffold } from '../lib/scaffold.mjs';
import { validateAll } from '../lib/validate.mjs';
import { banner, colorEnabled, itemLines, makePainter, sectionHeader, table } from './ui.mjs';

const HELP = `aiudalabs-marketplace <command>

Commands:
  list [kind]               Show the catalog; kind is agents, skills, workflows, externals or stacks
  harnesses                 Show supported harnesses and where they install
  add <name...>             Install components into a harness
  update [name...]          Bring installed components to the catalog's versions
  remove <name...>          Remove components and the dependencies nothing else needs
  outdated                  Show installed components that have a newer version
  doctor <name...>          Check that the tools the components need are installed
  new <kind> <name>         Start a component from its template, in a clone of the marketplace;
                            kind is skill, agent, workflow, stack or external

Options for add, update, remove and outdated:
  --harness, -a <id>        Target harness (required, except for outdated), see \`harnesses\`
  --global, -g              Install for the current user instead of the project
  --dir <path>              Project directory to install into (default: current directory)
  --dry-run                 Print what would be written, change nothing
  --force                   add: replace components that are already installed;
                            update and remove: also replace or delete local edits
  --allow-unlicensed        Install externals whose repository has no license
                            without asking (needed when not in a terminal)

Options for new:
  --category <name>         Folder under agents/ for a new agent (required for agents)
  --dir <path>              Marketplace clone to write into (default: current directory)

Options for list:
  --search, -s <text>       Only show components whose name or description contains the text
  --full                    Show full descriptions instead of the first sentence
  --plain                   No colors (also when NO_COLOR is set or output is not a terminal)
  --json                    Print the listing as JSON

Names can be bare (brand-guardian) or qualified (agent/brand-guardian,
skill/color-system, workflow/visual-identity, external/sciwrite,
stack/brand-identity). Installing anything also installs what it uses:
an agent brings its skills, a workflow brings its skills and agents.

Externals are skills kept in another repository. They are cloned with git
at a pinned commit, and the listing shows their license, which may be
"none". An external without a license is installed only after you agree.

\`add\` records what it installed in ${MANIFEST_FILE} in the project (or
your home directory with --global). \`update\`, \`remove\` and \`outdated\`
read that file and touch only what it lists.`;

function loadComponents() {
  const components = loadAll();
  const errors = validateAll(components).filter((issue) => issue.level === 'error');
  if (errors.length > 0) throw new InstallError(`this copy of the marketplace has ${errors.length} validation error(s); run \`npm run validate\``);
  return components;
}

const KINDS = ['agents', 'skills', 'workflows', 'externals', 'stacks'];
const TYPE_OF = { agents: 'agent', skills: 'skill', workflows: 'workflow', externals: 'external', stacks: 'stack' };

const plural = (n, word) => (n ? `${n} ${word}${n === 1 ? '' : 's'}` : null);

function listDetails(item, components, paint) {
  const count = plural;
  const version = paint.dim(`v${item.data.metadata?.version ?? item.data.version ?? '?'}`);
  if (item.type === 'agent') return [paint.dim(item.category), count((item.data.requires ?? []).length, 'skill'), version];
  if (item.type === 'skill') return [requiredTools(item).length ? paint.warn(`needs ${requiredTools(item).join(', ')}`) : null, version];
  if (item.type === 'workflow') return [paint.dim([count(skillRequires(item).length, 'skill'), count(workflowAgents(item).length, 'agent')].filter(Boolean).join(', ')), version];
  if (item.type === 'external') {
    const license = item.data.license === 'none' ? paint.warn('no license') : paint.dim(item.data.license);
    return [license, paint.dim(`@${item.data.commit.slice(0, 7)}`), version];
  }
  return [];
}

function list(kindArg, { json, search, full, plain }) {
  const components = loadComponents();
  if (kindArg && !KINDS.includes(kindArg)) throw new InstallError(`unknown kind "${kindArg}"; use one of: ${KINDS.join(', ')}`);
  const needle = search?.toLowerCase();
  const matches = (item) => !needle || item.id.includes(needle) || String(item.data.description ?? '').toLowerCase().includes(needle);
  const groups = KINDS.filter((kind) => !kindArg || kind === kindArg).map((kind) => [kind, components[kind].filter(matches)]);

  if (json) {
    const pick = (item) => ({ name: item.id, type: item.type, description: item.data.description });
    console.log(JSON.stringify(Object.fromEntries(groups.map(([kind, items]) => [kind, items.map(pick)])), null, 2));
    return;
  }

  const paint = makePainter(colorEnabled({ plain }));
  const width = Math.min(process.stdout.columns || 100, 110);
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const counts = KINDS.map((kind) => [kind, components[kind].length, TYPE_OF[kind]]);
  const out = banner({ name: pkg.name, version: pkg.version, description: pkg.description, counts }, paint, width);

  for (const [kind, items] of groups) {
    if (items.length === 0) continue;
    out.push(...sectionHeader(kind, items.length, TYPE_OF[kind], paint, width));
    if (kind === 'stacks') {
      const rows = items.map((stack) => {
        const { agents, skills } = expand([stack], components);
        const installs = [plural(skills.length, 'skill'), plural(agents.length, 'agent')].filter(Boolean).join(' · ');
        return [paint.bold(paint.type('stack')(stack.id)), installs, stack.data.description];
      });
      out.push('', ...table([{ title: 'Stack' }, { title: 'Installs' }, { title: 'For' }], rows, paint, width));
      continue;
    }
    for (const item of items) {
      out.push(...itemLines({ type: item.type, name: item.id, details: listDetails(item, components, paint), description: item.data.description }, paint, width, full));
    }
  }

  if (groups.every(([, items]) => items.length === 0)) out.push('', `  ${paint.warn('Nothing matches')} ${paint.dim(search ? `"${search}"` : '')}`);
  out.push(
    '',
    `  ${paint.dim('Install one piece or a whole stack:')}`,
    `  ${paint.accent('npx github:aiudalabs/aiudalabs-marketplace add')} ${paint.bold('<name>')} ${paint.accent('--harness')} ${paint.bold('<id>')}`,
    `  ${paint.dim('Harnesses:')} ${adapters.map((adapter) => adapter.id).join(paint.dim(', '))}`,
    '',
  );
  console.log(out.join('\n'));
}

function printMissingTools(skills) {
  const missing = missingTools(skills);
  for (const { tool, neededBy } of missing) console.log(`missing    ${tool} (needed by ${neededBy.join(', ')})`);
  return missing;
}

function doctor(references) {
  if (references.length === 0) throw new InstallError('doctor needs at least one component name');
  const components = loadComponents();
  const { skills } = expand(references.map((reference) => resolveReference(reference, components)), components);
  const missing = printMissingTools(skills);
  if (missing.length === 0) console.log('All required tools are installed.');
  else process.exitCode = 1;
}

function harnesses() {
  const show = (dirs, scope, prefix) => (dirs?.[scope] ? `${prefix}${dirs[scope]}` : 'not supported');
  for (const adapter of adapters) {
    console.log(`\n${adapter.id}  (${adapter.label})`);
    console.log(`  skills  project: ${show(adapter.skillsDir, 'project', './')}   global: ${show(adapter.skillsDir, 'global', '~/')}`);
    console.log(`  agents  project: ${show(adapter.agentsDir, 'project', './')}   global: ${show(adapter.agentsDir, 'global', '~/')}`);
  }
}

function installContext(options, { needsHarness = true } = {}) {
  if (needsHarness && !options.harness) throw new InstallError('this command needs --harness <id>; run `harnesses` to see the options');
  const adapter = options.harness ? getAdapter(options.harness) : null;
  if (options.harness && !adapter) throw new InstallError(`unknown harness "${options.harness}"; supported: ${adapters.map((a) => a.id).join(', ')}`);
  const scope = options.global ? 'global' : 'project';
  const baseDir = options.global ? homedir() : resolve(options.dir ?? process.cwd());
  const display = (target) => `${options.global ? '~' : '.'}/${relative(baseDir, target)}`;
  if (!options.global) console.log(`Project: ${baseDir}`);
  return { adapter, scope, baseDir, display };
}

const STATUS_LABEL = { installed: 'installed ', exists: 'exists    ', failed: 'FAILED    ' };

function printResults(results, display, existsHint) {
  for (const result of results) {
    const hint = result.status === 'exists' ? existsHint : result.error ? `  ${result.error}` : '';
    console.log(`${STATUS_LABEL[result.status]} ${result.kind}/${result.id} -> ${display(result.target)}${hint}`);
  }
}

async function ask(question) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^y(es)?$/i.test((await prompt.question(question)).trim());
  } finally {
    prompt.close();
  }
}

// An external whose repository has no license grants no rights to copy it.
// Install it only when the user agrees, in a prompt or with --allow-unlicensed.
async function consentToUnlicensed(operations, options) {
  const unlicensed = operations.filter((op) => op.kind === 'external' && op.license === 'none');
  if (unlicensed.length === 0 || options['allow-unlicensed']) return operations;
  const names = unlicensed.map((op) => `${op.id} (${op.repo})`).join(', ');
  console.log(`\nNo license: ${names}\nIts repository grants no permission to copy or use the code. Check with the author before relying on it.`);
  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  if (interactive && await ask('Install it anyway? [y/N] ')) return operations;
  for (const op of unlicensed) {
    console.log(`skipped    external/${op.id}: no license${interactive ? '' : '; pass --allow-unlicensed to install it'}`);
  }
  return operations.filter((op) => !unlicensed.includes(op));
}

function printExternals(operations) {
  for (const operation of operations.filter((op) => op.kind === 'external')) {
    console.log(`external   ${operation.id}: cloning ${operation.repo} at ${operation.commit.slice(0, 7)} (license: ${operation.license})`);
  }
}

async function add(references, options) {
  if (references.length === 0) throw new InstallError('add needs at least one component name');
  const { adapter, scope, baseDir, display } = installContext(options);
  const components = loadComponents();
  const roots = references.map((reference) => resolveReference(reference, components));
  const { operations, skipped } = planInstall(expand(roots, components), adapter, { scope, baseDir });
  for (const note of skipped) console.log(`skipped    ${note}`);

  if (options['dry-run']) {
    for (const operation of operations) console.log(`would add  ${operation.kind}/${operation.id} -> ${display(operation.target)}`);
    return;
  }
  const manifest = readManifest(baseDir);
  const approved = await consentToUnlicensed(operations, options);
  printExternals(approved);
  const results = applyInstall(approved, { force: options.force });
  printResults(results, display, '  (use `update` for a newer version, or --force to replace it)');
  writeManifest(baseDir, recordInstall(manifest, adapter.id, roots, results, baseDir));
  printMissingTools(expand(roots, components).skills);
  if (operations.length === 0) throw new InstallError(`nothing could be installed for ${adapter.label} at ${scope} level`);
  if (results.some((result) => result.status === 'failed')) process.exitCode = 1;
}

const UPDATE_LABEL = {
  install: 'add       ',
  upgrade: 'upgrade   ',
  current: 'current   ',
  modified: 'modified  ',
  foreign: 'not ours  ',
};

async function update(references, options) {
  const { adapter, scope, baseDir, display } = installContext(options);
  const components = loadComponents();
  const manifest = readManifest(baseDir);
  const requested = manifest.harnesses[adapter.id]?.requested ?? [];
  if (requested.length === 0) throw new InstallError(`nothing was installed for ${adapter.label} here with \`add\``);

  const named = references.map((reference) => resolveReference(reference, components));
  const roots = named.length > 0 ? named : requested.flatMap((key) => {
    try {
      return [resolveReference(key, components)];
    } catch {
      console.log(`gone       ${key}: no longer in the catalog; \`remove ${key}\` to delete it`);
      return [];
    }
  });
  const { operations } = planInstall(expand(roots, components), adapter, { scope, baseDir });
  const plan = classifyUpdate(manifest, adapter.id, operations, { baseDir });

  const apply = [];
  for (const { operation, state } of plan) {
    const chosen = state === 'install' || state === 'upgrade' || (state === 'modified' && options.force);
    const hint = state === 'modified' && !options.force ? '  (edited locally; --force replaces your edits)'
      : state === 'foreign' ? '  (not installed by this tool; `add --force` takes it over)' : '';
    if (state !== 'current' || options['dry-run']) console.log(`${UPDATE_LABEL[state]} ${operation.kind}/${operation.id} -> ${display(operation.target)}${hint}`);
    if (chosen) apply.push(operation);
  }
  if (options['dry-run']) return;
  if (apply.length === 0) {
    console.log('Everything is up to date.');
    return;
  }
  const results = applyInstall(await consentToUnlicensed(apply, options), { force: true });
  for (const result of results.filter((r) => r.status === 'failed')) console.log(`FAILED     ${result.kind}/${result.id}  ${result.error}`);
  writeManifest(baseDir, recordInstall(manifest, adapter.id, roots, results, baseDir));
  console.log(`Updated ${results.filter((r) => r.status === 'installed').length} component(s).`);
  if (results.some((result) => result.status === 'failed')) process.exitCode = 1;
}

function remove(references, options) {
  if (references.length === 0) throw new InstallError('remove needs at least one component name');
  const { adapter, baseDir, display } = installContext(options);
  const components = loadAll();
  const manifest = readManifest(baseDir);
  // Names that left the catalog can still be removed by their qualified name.
  const roots = references.map((reference) => {
    const [type, id] = reference.split('/');
    if (id !== undefined && manifest.harnesses[adapter.id]?.requested.includes(reference)) return { type, id };
    return resolveReference(reference, components);
  });
  const plan = planRemoval(manifest, adapter.id, roots, components);
  for (const key of plan.stillNeeded) console.log(`kept       ${key}: another installed component still needs it`);

  const removed = [];
  for (const entry of plan.remove) {
    const target = resolveTarget(baseDir, entry.target);
    const edited = entry.hash && existsSync(target) && hashTarget(target) !== entry.hash;
    // Edited files are the user's now: stop tracking them, but keep them.
    removed.push(entry);
    if (edited && !options.force) {
      console.log(`kept       ${entry.key} -> ${display(target)}  (edited locally, no longer tracked; --force deletes it)`);
      continue;
    }
    console.log(`${options['dry-run'] ? 'would remove' : 'removed   '} ${entry.key} -> ${display(target)}`);
    if (!options['dry-run']) rmSync(target, { recursive: true, force: true });
  }
  if (options['dry-run']) return;
  writeManifest(baseDir, recordRemoval(manifest, adapter.id, { requested: plan.requested, remove: removed }));
}

function showOutdated(options) {
  const { baseDir } = installContext(options, { needsHarness: false });
  const components = loadAll();
  const manifest = readManifest(baseDir);
  const harnessIds = options.harness ? [options.harness] : manifestHarnesses(manifest);
  if (harnessIds.length === 0) return console.log(`Nothing installed here with \`add\` (no ${MANIFEST_FILE}).`);

  let any = false;
  for (const harnessId of harnessIds) {
    for (const row of outdated(manifest, harnessId, components)) {
      any = true;
      console.log(`${harnessId.padEnd(12)} ${row.key.padEnd(40)} ${row.installed ?? '?'} -> ${row.available ?? 'removed from the catalog'}`);
    }
  }
  if (!any) console.log('Everything is up to date.');
  else console.log('\nRun `update --harness <id>` to upgrade.');
}

// Contributors run this in their clone; through npx the current directory is some other project.
const CHECKOUT_FOLDERS = ['agents', 'skills', 'stacks'];

function create(kind, name, options) {
  if (!kind) throw new InstallError(`new needs a kind and a name; kinds: ${SCAFFOLD_KINDS.join(', ')}`);
  const root = resolve(options.dir ?? process.cwd());
  if (!CHECKOUT_FOLDERS.every((folder) => existsSync(join(root, folder)))) {
    throw new InstallError(`${root} is not a clone of the marketplace; run \`new\` from the clone you are contributing to, or pass --dir`);
  }
  const { path, content, extra } = planScaffold(kind, name, { category: options.category, components: loadAll(root) });
  const files = [{ path, content }, ...extra];
  const existing = files.find((entry) => existsSync(join(root, entry.path)));
  if (existing) throw new InstallError(`${existing.path} already exists`);
  for (const entry of files) {
    mkdirSync(dirname(join(root, entry.path)), { recursive: true });
    writeFileSync(join(root, entry.path), entry.content);
    console.log(`created    ${entry.path}`);
  }
  console.log('\nNext: replace every TODO, then run `npm run catalog`, `npm run validate` and `npm test`.');
  console.log('What goes in it: CONTRIBUTING.md. Every field and rule: docs/component-formats.md.');
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      harness: { type: 'string', short: 'a' },
      global: { type: 'boolean', short: 'g' },
      dir: { type: 'string' },
      category: { type: 'string' },
      'dry-run': { type: 'boolean' },
      force: { type: 'boolean' },
      'allow-unlicensed': { type: 'boolean' },
      json: { type: 'boolean' },
      search: { type: 'string', short: 's' },
      full: { type: 'boolean' },
      plain: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [command, ...rest] = positionals;

  if (values.help || !command || command === 'help') return console.log(HELP);
  if (command === 'list') return list(rest[0], values);
  if (command === 'harnesses') return harnesses();
  if (command === 'add') return add(rest, values);
  if (command === 'update') return update(rest, values);
  if (command === 'remove') return remove(rest, values);
  if (command === 'outdated') return showOutdated(values);
  if (command === 'doctor') return doctor(rest);
  if (command === 'new') return create(rest[0], rest[1], values);
  throw new InstallError(`unknown command "${command}"\n\n${HELP}`);
}

try {
  await main();
} catch (error) {
  // parseArgs errors and InstallErrors are user mistakes; anything else is a bug.
  if (!(error instanceof InstallError) && !error.code?.startsWith('ERR_PARSE_ARGS')) throw error;
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
