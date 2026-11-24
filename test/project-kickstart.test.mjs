import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT } from '../lib/components.mjs';
import { pathDependencies } from '../skills/project-kickstart/assets/flutter-firebase/tools/deps-check.mjs';
import { offsetConfig } from '../skills/project-kickstart/assets/flutter-firebase/tools/emulator-config.mjs';

const ASSETS = join(ROOT, 'skills', 'project-kickstart', 'assets', 'flutter-firebase');
const read = (path) => readFileSync(join(ASSETS, path), 'utf8');
// JSON assets hold {{placeholders}} only inside strings, so they parse as they are.
const json = (path) => JSON.parse(read(path));

function scratch(t) {
  const dir = mkdtempSync(join(tmpdir(), 'aiuda-kickstart-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('kickstart assets: melos runs (root dev dependency, CI=true, check-only format, serial tests)', () => {
  assert.match(read('pubspec.yaml'), /dev_dependencies:\n(?:\s+#.*\n)*\s+melos: \^6\.3\.2/);
  const melos = read('melos.yaml');
  assert.match(melos, /dart format --output=none --set-exit-if-changed \./);
  assert.match(melos, /melos exec -c 1 --dir-exists="test" -- "flutter test"/);
  assert.match(melos, /tests-present:/);
  assert.match(melos, /deps-check:\n.*\n\s+run: node tools\/deps-check\.mjs/);
  assert.match(read('AGENTS.md'), /CI=true melos bootstrap && CI=true melos run deps-check && CI=true melos run analyze/);
  assert.match(read('.gitignore'), /^pubspec_overrides\.yaml$/m);
});

test('kickstart assets: functions build, stage and deploy from functions/.deploy', () => {
  const firebase = json('firebase.json');
  const [functions] = firebase.functions;
  assert.equal(functions.source, 'functions/.deploy');
  assert.match(functions.predeploy.at(-1), /stage-deploy\.mjs/);
  assert.ok(functions.ignore.includes('*.local'));
  const pkg = json('functions/package.json');
  assert.match(pkg.scripts.build, /gen-index\.mjs && tsc --noEmit && node scripts\/bundle\.mjs$/);
  assert.match(pkg.scripts['build:watch'], /stage-deploy\.mjs --watch --bundle/);
  assert.ok(pkg.devDependencies.esbuild);
  assert.equal(pkg.devDependencies['@{{project_name}}/types'], 'workspace:*');
  for (const script of ['test', 'test:rules', 'test:integration']) {
    assert.doesNotMatch(pkg.scripts[script], /passWithNoTests/, script);
  }
  assert.match(pkg.scripts.lint, /eslint src test/);
  assert.deepEqual(read('functions/.gitignore').split('\n').filter((l) => l && !l.startsWith('#')), ['/src/index.ts', '/lib/', '/.deploy/']);
  assert.match(read('functions/src/init.ts'), /setGlobalOptions\(\{ region: FUNCTIONS_REGION \}\)/);
  assert.match(read('functions/src/init.ts'), /'\{\{functions_region\}\}'/);
  assert.ok(existsSync(join(ASSETS, 'functions', '.env.local.example')));
  const root = json('package.json');
  assert.match(root.scripts['emulators:test'], /^pnpm run functions:stage && firebase emulators:exec .*'pnpm --dir functions run test:integration'$/);
  assert.match(root.scripts['rules:test'], /FIREBASE_CONFIG:\+--config/);
  assert.deepEqual(root.pnpm.onlyBuiltDependencies, ['esbuild', 'protobufjs', '@firebase/util']);
});

test('kickstart assets: emulators on 127.0.0.1, no Realtime Database, links site with its own fallback', () => {
  const firebase = json('firebase.json');
  for (const [name, value] of Object.entries(firebase.emulators)) {
    if (typeof value === 'object') assert.equal(value.host, '127.0.0.1', name);
  }
  assert.equal(firebase.database, undefined);
  assert.equal(firebase.emulators.database, undefined);
  assert.ok(!existsSync(join(ASSETS, 'database.rules.json')));
  assert.doesNotMatch(read('.env.example'), /=localhost|DATABASE/);
  assert.doesNotMatch(read('.github/workflows/firebase.yml'), /database\.rules/);
  const links = firebase.hosting.find((site) => site.target === 'links');
  assert.deepEqual(links.rewrites, [{ source: '/r/**', destination: '/open.html' }]);
  assert.ok(existsSync(join(ASSETS, 'links', 'public', 'open.html')));
  assert.ok(links.headers.some((h) => h.source === '/.well-known/apple-app-site-association'));
  assert.ok(!links.ignore.includes('**/.*'), 'the links site must deploy .well-known/');
  assert.match(links.predeploy[0], /stage-links\.mjs/);
  assert.match(read('.gitignore'), /^\/links\/public\/\.well-known\/$/m);
});

test('kickstart assets: no stale Flutter literal, workflows reusable', () => {
  const skill = readFileSync(join(ROOT, 'skills', 'project-kickstart', 'SKILL.md'), 'utf8');
  assert.doesNotMatch(skill, /3\.27\.0/);
  assert.match(read('.tool-versions'), /^flutter \{\{flutter_version\}\}$/m);
  for (const wf of ['flutter', 'firebase', 'admin']) assert.match(read(`.github/workflows/${wf}.yml`), /^ {2}workflow_call:$/m, wf);
});

test('deps-check: reads block and inline path dependencies', () => {
  const deps = pathDependencies('name: ui\ndependencies:\n  core: {path: ../core}\n  data:\n    path: ../data # no\n  intl: ^0.19.0\ndev_dependencies:\n  helpers:\n    path: "../helpers"\nflutter:\n  uses-material-design: true\n');
  assert.deepEqual(deps, [
    { section: 'dependencies', name: 'core', path: '../core' },
    { section: 'dependencies', name: 'data', path: '../data' },
    { section: 'dev_dependencies', name: 'helpers', path: '../helpers' },
  ]);
});

test('deps-check: fails on an edge outside the package graph', (t) => {
  const dir = scratch(t);
  mkdirSync(join(dir, 'tools'));
  cpSync(join(ASSETS, 'tools', 'deps-check.mjs'), join(dir, 'tools', 'deps-check.mjs'));
  const pkg = (path, deps) => {
    mkdirSync(join(dir, path), { recursive: true });
    writeFileSync(join(dir, path, 'pubspec.yaml'), `name: x\ndependencies:\n${deps.map((d) => `  ${d}:\n    path: ../${d}\n`).join('')}`);
  };
  pkg('packages/core', []);
  pkg('packages/data', ['core']);
  pkg('packages/ui', ['core']);
  const ok = spawnSync('node', [join(dir, 'tools', 'deps-check.mjs')], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /3 Dart packages/);
  pkg('packages/ui', ['core', 'data']);
  const bad = spawnSync('node', [join(dir, 'tools', 'deps-check.mjs')], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /packages\/ui: dependencies data .* not allowed/);
});

test('emulator-config: shifts every port, binds 127.0.0.1, turns the UI off', () => {
  const out = offsetConfig(json('firebase.json'), 100);
  assert.equal(out.emulators.firestore.port, 8180);
  assert.equal(out.emulators.firestore.websocketPort, 9250);
  assert.equal(out.emulators.hub.port, 4500);
  assert.equal(out.emulators.auth.host, '127.0.0.1');
  assert.deepEqual(out.emulators.ui, { enabled: false });
  assert.equal(out.functions[0].source, 'functions/.deploy');
});

test('vitest-suite: NOT RUN without test files, fails on stray tests and outside the emulators', (t) => {
  const dir = scratch(t);
  mkdirSync(join(dir, 'scripts'));
  cpSync(join(ASSETS, 'functions', 'scripts', 'vitest-suite.mjs'), join(dir, 'scripts', 'vitest-suite.mjs'));
  const run = (suite) => spawnSync('node', [join(dir, 'scripts', 'vitest-suite.mjs'), suite], { encoding: 'utf8', env: { ...process.env, FIREBASE_EMULATOR_HUB: '' } });
  const empty = run('rules');
  assert.equal(empty.status, 0);
  assert.match(empty.stdout, /rules: NOT RUN \(0 test files/);
  mkdirSync(join(dir, 'test', 'misc'), { recursive: true });
  writeFileSync(join(dir, 'test', 'misc', 'a.test.ts'), '');
  const stray = run('unit');
  assert.equal(stray.status, 1);
  assert.match(stray.stderr, /test\/misc\/a\.test\.ts/);
  mkdirSync(join(dir, 'test', 'integration'));
  writeFileSync(join(dir, 'test', 'integration', 'b.test.ts'), '');
  const outside = run('integration');
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /pnpm emulators:test/);
});
