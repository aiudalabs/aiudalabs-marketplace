#!/usr/bin/env node
// aiudalabs-marketplace CLI: list components and install them into a harness.

import { homedir } from 'node:os';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { adapters, getAdapter } from '../adapters/index.mjs';
import { loadAll } from '../lib/components.mjs';
import { InstallError, applyInstall, expand, planInstall, resolveReference } from '../lib/install.mjs';
import { validateAll } from '../lib/validate.mjs';

const HELP = `aiudalabs-marketplace <command>

Commands:
  list                      Show available agents, skills and stacks
  harnesses                 Show supported harnesses and where they install
  add <name...>             Install components into a harness

Options for add:
  --harness, -a <id>        Target harness (required), see \`harnesses\`
  --global, -g              Install for the current user instead of the project
  --dir <path>              Project directory to install into (default: current directory)
  --dry-run                 Print what would be written, change nothing
  --force                   Overwrite components that are already installed

Options for list:
  --json                    Print the listing as JSON

Names can be bare (brand-guardian) or qualified (agent/brand-guardian,
skill/startup-visual-identity, stack/brand-starter). Installing an agent
also installs the skills it uses.`;

function loadComponents() {
  const components = loadAll();
  const errors = validateAll(components).filter((issue) => issue.level === 'error');
  if (errors.length > 0) throw new InstallError(`this copy of the marketplace has ${errors.length} validation error(s); run \`npm run validate\``);
  return components;
}

function list({ json }) {
  const { agents, skills, stacks } = loadComponents();
  if (json) {
    const pick = (component) => ({ name: component.id, description: component.data.description });
    console.log(JSON.stringify({ agents: agents.map(pick), skills: skills.map(pick), stacks: stacks.map(pick) }, null, 2));
    return;
  }
  for (const [title, items] of [['Agents', agents], ['Skills', skills], ['Stacks', stacks]]) {
    console.log(`\n${title}`);
    for (const item of items) console.log(`  ${item.type}/${item.id}\n      ${item.data.description}`);
  }
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
  for (const result of applyInstall(operations, { force: options.force })) {
    const label = result.status === 'installed' ? 'installed ' : 'exists    ';
    const hint = result.status === 'exists' ? '  (use --force to overwrite)' : '';
    console.log(`${label} ${result.kind}/${result.id} -> ${display(result.target)}${hint}`);
  }
  if (operations.length === 0) throw new InstallError(`nothing could be installed for ${adapter.label} at ${scope} level`);
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      harness: { type: 'string', short: 'a' },
      global: { type: 'boolean', short: 'g' },
      dir: { type: 'string' },
      'dry-run': { type: 'boolean' },
      force: { type: 'boolean' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [command, ...rest] = positionals;

  if (values.help || !command || command === 'help') return console.log(HELP);
  if (command === 'list') return list(values);
  if (command === 'harnesses') return harnesses();
  if (command === 'add') return add(rest, values);
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
