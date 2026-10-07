#!/usr/bin/env node
// Copies one environment's App Links / Universal Links files into the links site.
// Owner: firebase-dev.
//
// Each environment has its own app ids and signing keys, so the association files
// live per alias in links/env/<alias>/.well-known/ (assetlinks.json,
// apple-app-site-association). This script replaces links/public/.well-known/
// (ignored by git) with the files of the project being deployed:
//
//   node links/scripts/stage-links.mjs              the Hosting predeploy: $GCLOUD_PROJECT
//   node links/scripts/stage-links.mjs <alias|id>   by hand, before `pnpm emulators`
//
// The alias comes from .firebaserc ("default" for {{project_name}}-dev). It fails on a
// project .firebaserc does not list, so dev ids never reach staging or prod.

import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const projects = JSON.parse(readFileSync(join(root, '.firebaserc'), 'utf8')).projects ?? {};
const wanted = process.argv[2] ?? process.env.GCLOUD_PROJECT;
const alias = wanted in projects ? wanted : Object.keys(projects).find((a) => projects[a] === wanted);
if (!alias) {
  console.error(`stage-links: "${wanted ?? ''}" is not an alias or project in .firebaserc (pass one, or set GCLOUD_PROJECT)`);
  process.exit(1);
}

const from = join(root, 'links', 'env', alias, '.well-known');
const to = join(root, 'links', 'public', '.well-known');
rmSync(to, { recursive: true, force: true });
if (existsSync(from)) cpSync(from, to, { recursive: true, filter: (src) => !src.endsWith('.gitkeep') });
const files = existsSync(to) ? readdirSync(to) : [];
console.log(`stage-links: ${alias} (${projects[alias]}): ${files.join(', ') || 'no association files yet'}`);
