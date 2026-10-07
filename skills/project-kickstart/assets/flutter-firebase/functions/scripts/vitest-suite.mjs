// Runs one Vitest suite: unit, rules or integration. Owner: firebase-dev.
//
//   node scripts/vitest-suite.mjs unit|rules|integration [vitest args]
//
// Until a suite has its first test file it prints "NOT RUN (0 test files)" and
// exits 0, so the empty scaffold passes CI. From the first test file on, Vitest
// runs without --passWithNoTests: a suite whose tests are not found fails.
// Report a NOT RUN suite as not run, never as a pass.
//
// unit also fails on a *.test.ts under test/ outside unit/, rules/ and
// integration/: no config would ever run it. integration also fails when the
// Functions emulator loaded no function (`firebase emulators:exec` exits 0 when
// the functions fail to load), or when it runs outside `pnpm emulators:test`.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUITES = {
  unit: { config: 'vitest.config.ts', dirs: ['src', 'test/unit'] },
  rules: { config: 'vitest.rules.config.ts', dirs: ['test/rules'] },
  integration: { config: 'vitest.integration.config.ts', dirs: ['test/integration'] },
};

function testFiles(dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.test.ts'))
    .map((e) => relative(root, join(e.parentPath ?? e.path, e.name)));
}

function fail(message) {
  console.error(`vitest-suite: ${message}`);
  process.exit(1);
}

const [name, ...args] = process.argv.slice(2);
const suite = SUITES[name];
if (!suite) fail(`usage: vitest-suite.mjs ${Object.keys(SUITES).join('|')} [vitest args]`);

if (name === 'unit') {
  const known = ['test/unit/', 'test/rules/', 'test/integration/'];
  const stray = testFiles('test').filter((f) => !known.some((k) => f.startsWith(k)));
  if (stray.length > 0) fail(`test files no suite runs (move them under ${known.join(', ')}): ${stray.join(', ')}`);
}

const files = suite.dirs.flatMap(testFiles);
if (files.length === 0) {
  console.log(`vitest-suite: ${name}: NOT RUN (0 test files in ${suite.dirs.join(', ')})`);
  process.exit(0);
}

if (name === 'integration') {
  // `firebase emulators:exec` exits 0 even when the functions fail to load, so
  // ask the Functions emulator, through the hub, how many functions it serves.
  const hub = process.env.FIREBASE_EMULATOR_HUB;
  if (!hub) fail('integration tests run inside the emulators: use `pnpm emulators:test` from the repo root');
  try {
    const emulators = await (await fetch(`http://${hub}/emulators`)).json();
    const fn = emulators.functions;
    if (!fn) fail('the Functions emulator is not running (emulators:exec --only must include functions)');
    const { backends } = await (await fetch(`http://${fn.host}:${fn.port}/backends`)).json();
    const count = backends.reduce((n, b) => n + (b.functionTriggers?.length ?? 0), 0);
    if (count === 0) fail('the Functions emulator loaded no function: check its log above (functions/.deploy staged?)');
    console.log(`vitest-suite: integration: ${count} functions loaded in the emulator`);
  } catch (error) {
    fail(`cannot ask the emulator hub at ${hub}: ${error.message}`);
  }
}

const run = spawnSync('vitest', ['run', '--config', suite.config, ...args], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(run.status ?? 1);
