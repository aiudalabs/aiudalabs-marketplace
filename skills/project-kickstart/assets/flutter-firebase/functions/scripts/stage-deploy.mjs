// Writes the functions deploy source into functions/.deploy/. Owner: firebase-dev.
//
// firebase.json points functions.source here, for deploys and for the emulator.
// functions/package.json may hold `workspace:` devDependencies (the shared types,
// inlined by scripts/bundle.mjs), which Cloud Build's npm cannot install. The staged
// folder holds only what runs in production:
//
//   .deploy/package.json   name, version, main, engines and "dependencies" (npm only)
//   .deploy/lib/           the bundle from scripts/bundle.mjs (types already inlined)
//   .deploy/.env*          the parameter files firebase-tools reads from the source
//   .deploy/.secret.local  folder (.env.<alias> on deploy; .env.local and .secret.local
//                          in the emulator only: the deploy ignores *.local)
//   .deploy/node_modules   a link to functions/node_modules, never uploaded (firebase.json
//                          ignores node_modules): the CLI runs the SDK's
//                          node_modules/.bin/firebase-functions from the source folder to
//                          discover the functions, on deploy and in the emulator
//
// Run `pnpm --dir functions run build` first. The script then loads the staged
// bundle and fails when any exported function has no explicit region, which
// would send it to us-central1 (the region comes from src/init.ts).
//
//   node functions/scripts/stage-deploy.mjs                    stage once
//   node functions/scripts/stage-deploy.mjs --watch            restage when lib/ changes
//   node functions/scripts/stage-deploy.mjs --watch --bundle   also run bundle.mjs --watch
//                                                              (functions build:watch)

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  watchFile,
  writeFileSync,
} from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const libDir = join(root, 'lib');
const outDir = join(root, '.deploy');

// Only registry versions can be installed by Cloud Build.
const LOCAL_PROTOCOLS = /^(workspace|file|link|portal):/;

function fail(message) {
  throw new Error(`stage-deploy: ${message}`);
}

function deployManifest() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const dependencies = pkg.dependencies ?? {};
  const local = Object.entries(dependencies).filter(([, spec]) => LOCAL_PROTOCOLS.test(spec));
  if (local.length > 0) {
    fail(`"dependencies" must hold registry versions only: ${local.map(([n, s]) => `${n}@${s}`).join(', ')}`);
  }
  // No scripts (Cloud Build would run gcp-build) and no devDependencies.
  return {
    name: pkg.name,
    version: pkg.version,
    private: true,
    main: pkg.main,
    engines: pkg.engines,
    dependencies,
  };
}

function stage() {
  const manifest = deployManifest();
  const entry = join(root, manifest.main);
  if (!existsSync(entry)) fail(`${relative(root, entry)} is missing: run \`pnpm --dir functions run build\` first`);

  if (!existsSync(join(root, 'node_modules'))) fail('functions/node_modules is missing: run `pnpm install` first');

  // Replace the contents, not the folder itself: the emulator keeps watching it.
  mkdirSync(outDir, { recursive: true });
  for (const entry of readdirSync(outDir)) {
    if (entry !== 'node_modules') rmSync(join(outDir, entry), { recursive: true, force: true });
  }
  mkdirSync(join(outDir, 'lib'));
  writeFileSync(join(outDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const file of readdirSync(libDir)) copyFileSync(join(libDir, file), join(outDir, 'lib', file));
  const envFiles = readdirSync(root).filter(
    (f) => ((f === '.env' || f.startsWith('.env.')) && !f.endsWith('.example')) || f === '.secret.local',
  );
  for (const file of envFiles) copyFileSync(join(root, file), join(outDir, file));
  if (!existsSync(join(outDir, 'node_modules'))) {
    symlinkSync(join('..', 'node_modules'), join(outDir, 'node_modules'), 'junction');
  }
  return { manifest, envFiles };
}

/**
 * Every exported function must carry an explicit region; none means us-central1.
 * Loaded in a child process so each check sees a fresh module graph.
 */
function checkRegions(manifest) {
  const entry = join(outDir, manifest.main);
  const probe = `
    const exported = require(${JSON.stringify(entry)});
    const out = {};
    for (const [name, value] of Object.entries(exported)) {
      if (value && value.__endpoint) out[name] = value.__endpoint.region ?? null;
    }
    process.stdout.write(JSON.stringify(out));`;
  const result = spawnSync(process.execPath, ['-e', probe], { cwd: outDir, encoding: 'utf8' });
  if (result.status !== 0) fail(`cannot load ${relative(root, entry)}:\n${result.stderr}`);
  const regions = new Map();
  const missing = [];
  for (const [name, region] of Object.entries(JSON.parse(result.stdout))) {
    if (!Array.isArray(region) || region.length === 0) missing.push(name);
    else regions.set(name, region.join(','));
  }
  if (missing.length > 0) {
    fail(
      `functions without an explicit region (would deploy to us-central1): ${missing.join(', ')}. ` +
        'The generated src/index.ts must import ./init (setGlobalOptions) before any function file.',
    );
  }
  return regions;
}

function run() {
  const { manifest, envFiles } = stage();
  const regions = checkRegions(manifest);
  const byRegion = [...new Set(regions.values())].map((r) => `${r}: ${[...regions].filter(([, v]) => v === r).length}`);
  console.log(
    `stage-deploy: wrote .deploy/ (package.json without devDependencies, lib/, ${envFiles.join(' ') || 'no env files'}); ` +
      `functions ${regions.size}${byRegion.length ? ` (${byRegion.join('; ')})` : ''}`,
  );
}

if (process.argv.includes('--watch')) {
  // The emulator reloads the source folder when it changes; restage after each bundle.
  // watchFile polls, so it survives bundle.mjs deleting and rewriting lib/.
  const restage = () => {
    try {
      run();
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
  };
  if (process.argv.includes('--bundle')) {
    // One long-running command for the dev loop: the bundler rewrites lib/, this restages it.
    const bundler = spawn(process.execPath, [join(root, 'scripts', 'bundle.mjs'), '--watch'], { stdio: 'inherit' });
    bundler.on('exit', (code) => process.exit(code ?? 1));
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, () => {
        bundler.kill(signal);
        process.exit(0);
      });
    }
  } else {
    restage();
  }
  watchFile(join(libDir, 'index.js'), { interval: 500 }, (curr) => {
    if (curr.mtimeMs > 0) restage();
  });
  console.log('stage-deploy: watching lib/index.js for changes');
} else {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
