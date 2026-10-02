#!/usr/bin/env node
// Finds colors in source files that are not part of the brand palette.
//
// Usage:
//   node scan-colors.mjs --allowed <palette.json|brand.tokens.json> <file-or-folder>...
//
// The allowed file can be any JSON: every hex color found anywhere in it is
// treated as approved. A palette.json or a .tokens.json file both work.
// Scans .css .scss .less .html .htm .svg .js .jsx .ts .tsx .vue .svelte .md files.
//
// Reports hex colors (#rgb, #rrggbb, with or without alpha) and counts rgb(),
// hsl() and other color functions, which it cannot compare and lists for a
// manual look. Exit code 0: nothing off-palette. 1: off-palette colors found.
// 2: bad input.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const EXTENSIONS = ['.css', '.scss', '.less', '.html', '.htm', '.svg', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.md'];
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])/g;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g;

function fail(message) {
  console.error(message);
  process.exit(2);
}

// Normalizes to lowercase #rrggbb, dropping alpha: #abc and #aabbccff both become #aabbcc.
function normalize(hex) {
  const digits = hex.slice(1).toLowerCase();
  const full = digits.length <= 4 ? [...digits].map((char) => char + char).join('') : digits;
  return `#${full.slice(0, 6)}`;
}

function collectFiles(target, files = []) {
  let stats;
  try {
    stats = statSync(target);
  } catch {
    fail(`Not found: ${target}`);
  }
  if (stats.isFile()) {
    files.push(target);
    return files;
  }
  for (const entry of readdirSync(target)) {
    if (SKIP_DIRS.includes(entry)) continue;
    const full = join(target, entry);
    if (statSync(full).isDirectory()) collectFiles(full, files);
    else if (EXTENSIONS.includes(extname(entry).toLowerCase())) files.push(full);
  }
  return files;
}

const args = process.argv.slice(2);
const allowedIndex = args.indexOf('--allowed');
const allowedFile = allowedIndex === -1 ? null : args[allowedIndex + 1];
const targets = args.filter((arg, index) => index !== allowedIndex && index !== allowedIndex + 1);
if (!allowedFile || targets.length === 0) fail('Usage: node scan-colors.mjs --allowed <palette.json|brand.tokens.json> <file-or-folder>...');

let allowedText;
try {
  allowedText = readFileSync(allowedFile, 'utf8');
} catch (error) {
  fail(`Cannot read ${allowedFile}: ${error.message}`);
}
const allowed = new Set((allowedText.match(HEX) ?? []).map(normalize));
if (allowed.size === 0) fail(`No hex colors found in ${allowedFile}`);

const offPalette = new Map();
let functionCount = 0;
const files = targets.flatMap((target) => collectFiles(target));

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    functionCount += (line.match(COLOR_FUNCTION) ?? []).length;
    for (const match of line.match(HEX) ?? []) {
      const color = normalize(match);
      if (allowed.has(color)) continue;
      if (!offPalette.has(color)) offPalette.set(color, []);
      offPalette.get(color).push(`${file}:${index + 1}`);
    }
  });
}

console.log(`Scanned ${files.length} file(s) against ${allowed.size} approved color(s).\n`);
for (const [color, places] of [...offPalette].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${color}  used ${places.length} time(s)`);
  for (const place of places.slice(0, 5)) console.log(`    ${place}`);
  if (places.length > 5) console.log(`    ... and ${places.length - 5} more`);
}
if (offPalette.size === 0) console.log('No off-palette hex colors.');
if (functionCount > 0) console.log(`\n${functionCount} color function call(s) such as rgb() or hsl() were not compared. Check them by hand.`);
process.exit(offPalette.size > 0 ? 1 : 0);
