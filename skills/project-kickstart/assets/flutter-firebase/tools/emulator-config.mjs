#!/usr/bin/env node
// Writes a firebase.json copy whose emulators are shifted by an offset, so parallel
// worktrees run their emulator gates side by side. Owner: firebase-dev.
//
//   node tools/emulator-config.mjs <offset>     e.g. 100 for the first worktree, 200 for the next
//
// Every emulator port (and the hub, logging, websocket ports) moves by <offset>, every
// host is 127.0.0.1 and the UI is off. The script prints the file's path:
//
//   FIREBASE_CONFIG="$(node tools/emulator-config.mjs 100)" pnpm rules:test
//   FIREBASE_CONFIG="$(node tools/emulator-config.mjs 100)" pnpm emulators:test
//
// The root scripts pass "--config $FIREBASE_CONFIG" when it is set. The file sits in the
// repo root, ignored by git (firebase.emulators-*.json): firebase-tools resolves every
// path in a config against the config's folder and refuses one outside it, so a copy
// elsewhere cannot point at the rules or functions/.deploy. Delete it when done.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function offsetConfig(config, offset) {
  const out = structuredClone(config);
  const emulators = out.emulators ?? {};
  for (const [name, value] of Object.entries(emulators)) {
    if (!value || typeof value !== 'object') continue;
    if (name === 'ui') {
      emulators.ui = { enabled: false };
      continue;
    }
    value.host = '127.0.0.1';
    for (const portKey of ['port', 'websocketPort']) {
      if (Number.isInteger(value[portKey])) value[portKey] += offset;
    }
  }
  return out;
}

function main() {
  const offset = Number(process.argv[2]);
  if (!Number.isInteger(offset) || offset <= 0 || offset > 50000) {
    console.error('usage: node tools/emulator-config.mjs <offset>   (a positive integer, e.g. 100)');
    process.exit(2);
  }
  const config = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));
  const file = join(root, `firebase.emulators-${offset}.json`);
  writeFileSync(file, `${JSON.stringify(offsetConfig(config, offset), null, 2)}\n`);
  console.log(file);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
