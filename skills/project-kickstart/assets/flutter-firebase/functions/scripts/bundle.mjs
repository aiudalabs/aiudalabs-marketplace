// Bundles the Cloud Functions entry point into lib/index.js. Owner: firebase-dev.
//
// The shared types package @{{project_name}}/types (packages-ts/types) ships
// TypeScript source that Node cannot load and Cloud Build cannot install
// (workspace: protocol), so it is a "workspace:*" devDependency, inlined here. Every npm package stays external and is installed from the
// deployed package.json. `build` runs gen-index and `tsc --noEmit` first; this
// script only transpiles and bundles.
//
// `--watch` rebuilds on change (used by build:watch with the emulator).
//
// The bundle fails when the code imports an npm package that is not listed in
// "dependencies": a devDependency would be missing at runtime after deploy.

import { context } from 'esbuild';
import { builtinModules } from 'node:module';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// Workspace packages inlined into the bundle. Everything else bare is external.
const INLINED = ['@{{project_name}}/types'];
const runtimeDeps = new Set(Object.keys(pkg.dependencies ?? {}));
const builtins = new Set(builtinModules);

/** 'firebase-admin/app' -> 'firebase-admin'; '@scope/pkg/sub' -> '@scope/pkg'. */
function packageName(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

const watch = process.argv.includes('--watch');
const outfile = join(root, 'lib', 'index.js');
const libDir = join(root, 'lib');

/** @type {import('esbuild').Plugin} */
const externalizeNpm = {
  name: 'externalize-npm',
  setup(b) {
    const missing = new Set();
    b.onStart(() => missing.clear());
    // Bare specifiers only: relative and absolute paths are bundled as usual.
    b.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path.startsWith('node:') || builtins.has(args.path)) {
        return { path: args.path, external: true };
      }
      const name = packageName(args.path);
      if (INLINED.includes(name)) return undefined;
      if (!runtimeDeps.has(name)) missing.add(`${name} (imported by ${relative(root, args.importer)})`);
      return { path: args.path, external: true };
    });
    b.onEnd((result) => {
      if (missing.size === 0) return;
      rmSync(libDir, { recursive: true, force: true });
      const text = 'imports not in functions/package.json "dependencies"';
      console.error(`bundle: ${text}:`);
      for (const entry of missing) console.error(`  - ${entry}`);
      result.errors.push({ text });
    });
  },
};

rmSync(libDir, { recursive: true, force: true });

const ctx = await context({
  absWorkingDir: root,
  entryPoints: [join(root, 'src', 'index.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'warning',
  plugins: [externalizeNpm],
});

if (watch) {
  await ctx.watch();
  console.log('bundle: watching src/ for changes');
} else {
  const result = await ctx.rebuild().catch((error) => error);
  await ctx.dispose();
  if (result.errors.length > 0) process.exit(1);
  console.log('bundle: wrote lib/index.js');
}
