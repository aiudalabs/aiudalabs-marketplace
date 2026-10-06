#!/usr/bin/env node
// aiudalabs-marketplace CLI: list components and install them into a harness.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { adapters, getAdapter } from '../adapters/index.mjs';
import { ROOT, loadAll, requiredTools, skillRequires, workflowAgents } from '../lib/components.mjs';
import { InstallError, applyInstall, expand, missingTools, planInstall, resolveReference } from '../lib/install.mjs';
import { SCAFFOLD_KINDS, planScaffold } from '../lib/scaffold.mjs';
import { validateAll } from '../lib/validate.mjs';
import { banner, colorEnabled, itemLines, makePainter, sectionHeader, table } from './ui.mjs';

const HELP = `aiudalabs-marketplace <command>

Commands:
  list [kind]               Show the catalog; kind is agents, skills, workflows, externals or stacks
  harnesses                 Show supported harnesses and where they install
  add <name...>             Install components into a harness
  doctor <name...>          Check that the tools the components need are installed
  new <kind> <name>         Start a component from its template, in a clone of the marketplace;
                            kind is skill, agent, workflow, stack or external

Options for add:
  --harness, -a <id>        Target harness (required), see \`harnesses\`
  --global, -g              Install for the current user instead of the project
  --dir <path>              Project directory to install into (default: current directory)
  --dry-run                 Print what would be written, change nothing
  --force                   Overwrite components that are already installed

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
"none".`;

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

function add(references, options) {
  if (references.length === 0) throw new InstallError('add needs at least one component name');
  if (!options.harness) throw new InstallError('add needs --harness <id>; run `harnesses` to see the options');
  const adapter = getAdapter(options.harness);
  if (!adapter) throw new InstallError(`unknown harness "${options.harness}"; supported: ${adapters.map((a) => a.id).join(', ')}`);

  const components = loadComponents();
  const roots = references.map((reference) => resolveReference(reference, components));
  const scope = options.global ? 'global' : 'project';
  const baseDir = options.global ? homedir() : resolve(options.dir ?? process.cwd());
  const { operations, skipped } = planInstall(expand(roots, components), adapter, { scope, baseDir });

  const display = (target) => `${options.global ? '~' : '.'}/${relative(baseDir, target)}`;
  if (!options.global) console.log(`Project: ${baseDir}`);
  for (const note of skipped) console.log(`skipped    ${note}`);

  if (options['dry-run']) {
    for (const operation of operations) console.log(`would add  ${operation.kind}/${operation.id} -> ${display(operation.target)}`);
    return;
  }
  for (const operation of operations.filter((op) => op.kind === 'external')) {
    console.log(`external   ${operation.id}: cloning ${operation.repo} at ${operation.commit.slice(0, 7)} (license: ${operation.license})`);
  }
  const results = applyInstall(operations, { force: options.force });
  for (const result of results) {
    const label = { installed: 'installed ', exists: 'exists    ', failed: 'FAILED    ' }[result.status];
    const hint = result.status === 'exists' ? '  (use --force to overwrite)' : result.error ? `  ${result.error}` : '';
    console.log(`${label} ${result.kind}/${result.id} -> ${display(result.target)}${hint}`);
  }
  printMissingTools(expand(roots, components).skills);
  if (operations.length === 0) throw new InstallError(`nothing could be installed for ${adapter.label} at ${scope} level`);
  if (results.some((result) => result.status === 'failed')) process.exitCode = 1;
}

// Contributors run this in their clone; through npx the current directory is some other project.
const CHECKOUT_FOLDERS = ['agents', 'skills', 'stacks'];

function create(kind, name, options) {
  if (!kind) throw new InstallError(`new needs a kind and a name; kinds: ${SCAFFOLD_KINDS.join(', ')}`);
  const root = resolve(options.dir ?? process.cwd());
  if (!CHECKOUT_FOLDERS.every((folder) => existsSync(join(root, folder)))) {
    throw new InstallError(`${root} is not a clone of the marketplace; run \`new\` from the clone you are contributing to, or pass --dir`);
  }
  const { path, content } = planScaffold(kind, name, { category: options.category, components: loadAll(root) });
  const file = join(root, path);
  if (existsSync(file)) throw new InstallError(`${path} already exists`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`created    ${path}`);
  console.log('\nNext: replace every TODO, then run `npm run catalog`, `npm run validate` and `npm test`.');
  console.log('What goes in it: CONTRIBUTING.md. Every field and rule: docs/component-formats.md.');
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      harness: { type: 'string', short: 'a' },
      global: { type: 'boolean', short: 'g' },
      dir: { type: 'string' },
      category: { type: 'string' },
      'dry-run': { type: 'boolean' },
      force: { type: 'boolean' },
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
  if (command === 'doctor') return doctor(rest);
  if (command === 'new') return create(rest[0], rest[1], values);
  throw new InstallError(`unknown command "${command}"\n\n${HELP}`);
}

try {
  main();
} catch (error) {
  // parseArgs errors and InstallErrors are user mistakes; anything else is a bug.
  if (!(error instanceof InstallError) && !error.code?.startsWith('ERR_PARSE_ARGS')) throw error;
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
