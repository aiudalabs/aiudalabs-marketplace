#!/usr/bin/env node
// WCAG 2.2 contrast checks for a single pair or for a whole palette.
//
// Usage:
//   node contrast.mjs <foreground-hex> <background-hex>
//   node contrast.mjs --palette palette.json
//
// palette.json:
//   {
//     "colors": { "ink": "#1a1a1a", "paper": "#faf8f4", "primary": "#e8440a" },
//     "pairs": [
//       { "foreground": "ink", "background": "paper", "use": "text" },
//       { "foreground": "primary", "background": "paper", "use": "large-text" }
//     ]
//   }
//
// "use" is one of: text (4.5:1), large-text (3:1), ui (3:1), text-aaa (7:1).
// With "pairs", every listed pair is checked and the exit code is 1 if any fails.
// Without "pairs", the script prints the full matrix as a report and exits 0.
// Exit code 2 means bad input.

import { readFileSync } from 'node:fs';
import { contrastRatio, parseHex } from './color-lib.mjs';

// WCAG 2.2 success criteria 1.4.3 (AA), 1.4.6 (AAA) and 1.4.11 (non-text).
const REQUIRED = { text: 4.5, 'large-text': 3, ui: 3, 'text-aaa': 7 };

function fail(message) {
  console.error(message);
  process.exit(2);
}

function levels(ratio) {
  if (ratio >= 7) return 'AAA text';
  if (ratio >= 4.5) return 'AA text';
  if (ratio >= 3) return 'AA large text / UI only';
  return 'fails';
}

function checkPair(foreground, background) {
  const ratio = contrastRatio(foreground, background);
  console.log(`Contrast ratio: ${ratio.toFixed(2)}:1  (${levels(ratio)})`);
  for (const [use, required] of Object.entries(REQUIRED)) {
    console.log(`  ${use.padEnd(10)} needs ${required}:1  ${ratio >= required ? 'pass' : 'FAIL'}`);
  }
  process.exit(ratio >= REQUIRED.text ? 0 : 1);
}

function loadPalette(file) {
  let palette;
  try {
    palette = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Cannot read ${file}: ${error.message}`);
  }
  const colors = {};
  for (const [name, hex] of Object.entries(palette.colors ?? {})) {
    colors[name] = parseHex(hex) ?? fail(`"${name}" is not a hex color: ${hex}`);
  }
  if (Object.keys(colors).length < 2) fail('palette needs at least two entries under "colors"');
  return { colors, pairs: palette.pairs ?? [] };
}

function checkDeclaredPairs(colors, pairs) {
  let failures = 0;
  for (const { foreground, background, use = 'text' } of pairs) {
    if (!colors[foreground] || !colors[background]) fail(`unknown color in pair: ${foreground} on ${background}`);
    if (!REQUIRED[use]) fail(`unknown use "${use}" (use one of: ${Object.keys(REQUIRED).join(', ')})`);
    const ratio = contrastRatio(colors[foreground], colors[background]);
    const passed = ratio >= REQUIRED[use];
    if (!passed) failures++;
    console.log(`${passed ? 'pass' : 'FAIL'}  ${foreground} on ${background}  ${ratio.toFixed(2)}:1  (${use} needs ${REQUIRED[use]}:1)`);
  }
  console.log(`\n${pairs.length - failures} of ${pairs.length} pairs pass.`);
  process.exit(failures > 0 ? 1 : 0);
}

function printMatrix(colors) {
  const names = Object.keys(colors);
  const width = Math.max(...names.map((name) => name.length), 6) + 2;
  console.log('Contrast of each foreground (rows) on each background (columns):\n');
  console.log(''.padEnd(width) + names.map((name) => name.padStart(width)).join(''));
  for (const foreground of names) {
    const cells = names.map((background) => (foreground === background ? '-' : contrastRatio(colors[foreground], colors[background]).toFixed(2)));
    console.log(foreground.padEnd(width) + cells.map((cell) => cell.padStart(width)).join(''));
  }
  console.log('\n4.5 or more: text. 3 or more: large text and UI components. 7 or more: AAA text.');
}

const args = process.argv.slice(2);
if (args[0] === '--palette') {
  if (!args[1]) fail('Usage: node contrast.mjs --palette palette.json');
  const { colors, pairs } = loadPalette(args[1]);
  if (pairs.length > 0) checkDeclaredPairs(colors, pairs);
  printMatrix(colors);
  process.exit(0);
}

const [foreground, background] = args.map((arg) => parseHex(arg));
if (!foreground || !background) fail('Usage: node contrast.mjs <foreground-hex> <background-hex>   or   node contrast.mjs --palette palette.json');
checkPair(foreground, background);
