#!/usr/bin/env node
// Builds one HTML page that shows typeface candidates side by side, each set
// in the same content: a heading, body text, a small table with numbers, and
// accented characters. Made for the moment the user has to choose a typeface.
//
// Usage:
//   node type-preview.mjs --font "Family One" --font "Family Two" [options]
//
// Options:
//   --font <family>      a candidate family; repeat for each candidate
//   --font-css <url>     stylesheet that loads the candidates; repeat if needed
//   --mono <family>      family for labels and table headers (default: system monospace)
//   --heading <text>     heading sample, in the brand's own words
//   --body <text>        body sample
//   --accents <text>     characters to check, such as "ñ á é ü ¿ ¡ ç ã"
//   --base <px>          body size (default 16)
//   --ratio <number>     scale ratio (default 1.25)
//   --background <hex>   page background (default #ffffff)
//   --text <hex>         text color (default #1a1a1a)
//   --out <file>         output file (default type-preview.html)
//
// Open the output in a browser. The network is used only for --font-css.
// A family that is not installed and not loaded by --font-css silently shows a
// fallback font, so check that the candidates actually look different.

import { writeFileSync } from 'node:fs';

const DEFAULTS = {
  mono: 'ui-monospace',
  heading: 'A heading that says what we do',
  body: 'Body text sits here, long enough to judge rhythm, spacing and how the letters read in a full paragraph.',
  accents: 'ñ á é í ó ú ü ¿ ¡ ç ã õ',
  base: '16',
  ratio: '1.25',
  background: '#ffffff',
  text: '#1a1a1a',
  out: 'type-preview.html',
};
const REPEATABLE = ['font', 'font-css'];

function readOptions(args) {
  const options = { ...DEFAULTS, font: [], 'font-css': [] };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].startsWith('--') ? args[index].slice(2) : null;
    const value = args[index + 1];
    if (!key || value === undefined || !(key in options)) return null;
    if (REPEATABLE.includes(key)) options[key].push(value);
    else options[key] = value;
  }
  const base = Number(options.base);
  const ratio = Number(options.ratio);
  if (options.font.length === 0 || !(base > 0) || !(ratio > 1)) return null;
  if (![options.background, options.text].every((hex) => /^#[0-9a-fA-F]{3,8}$/.test(hex))) return null;
  return { ...options, base, ratio };
}

const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
// Font names go inside a quoted CSS string, so drop the characters that could end it.
const cssName = (name) => name.replace(/["\\;{}<>]/g, '');

function candidate(family, options) {
  const size = (steps) => `${(options.base * options.ratio ** steps).toFixed(2)}px`;
  return `<section style="font-family:'${cssName(family)}',sans-serif">
<p class="label">${escapeHtml(family)}</p>
<h2 style="font-size:${size(4)}">${escapeHtml(options.heading)}</h2>
<p style="font-size:${size(1)}">${escapeHtml(options.body)}</p>
<p>${escapeHtml(options.body)}</p>
<h3 style="font-size:${size(2)}">A subheading</h3>
<table><tr><th>Item</th><th>Before</th><th>After</th></tr>
<tr><td>First row</td><td>1,234.50</td><td>987.00</td></tr>
<tr><td>Second row</td><td>111.11</td><td>48.75</td></tr></table>
<p class="small" style="font-size:${size(-1)}">Small text, for captions and sources. 0123456789</p>
<p class="accents">${escapeHtml(options.accents)}</p>
<p><b>Bold</b> · Regular · <i>Italic</i> · ABCDEFGHIJKLM · abcdefghijklm</p>
</section>`;
}

const options = readOptions(process.argv.slice(2));
if (!options) {
  console.error('Usage: node type-preview.mjs --font "Family" [--font "Family"]... [--font-css <url>] [--mono <family>] [--heading <text>] [--body <text>] [--accents <text>] [--base 16] [--ratio 1.25] [--background <hex>] [--text <hex>] [--out file.html]');
  process.exit(2);
}

const links = options['font-css']
  .filter((url) => /^https?:\/\//.test(url))
  .map((url) => `<link rel="stylesheet" href="${escapeHtml(url)}">`)
  .join('\n');
const sections = options.font.map((family) => candidate(family, options));

const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Typeface candidates</title>
${links}
<style>
body{margin:0;padding:24px;display:grid;grid-template-columns:repeat(${sections.length},minmax(320px,1fr));gap:20px;background:#d9d9d9}
section{padding:32px;border-radius:6px;background:${options.background};color:${options.text};font-size:${options.base}px;line-height:1.5}
.label,th{font:500 12px/1 '${cssName(options.mono)}',monospace;text-transform:uppercase;letter-spacing:.06em;opacity:.7}
.label{margin:0 0 16px}
h2{line-height:1.15;font-weight:700;margin:0 0 14px}
h3{line-height:1.3;font-weight:600;margin:20px 0 6px}
p{margin:0 0 12px}
table{border-collapse:collapse;width:100%;margin:8px 0 14px;font-variant-numeric:tabular-nums}
td,th{padding:6px 0;text-align:right;border-bottom:1px solid color-mix(in srgb,currentColor 20%,transparent)}
td:first-child,th:first-child{text-align:left}
.small{opacity:.75}
.accents{font-size:1.5em;letter-spacing:.05em}
</style>
${sections.join('\n')}
</html>
`;

writeFileSync(options.out, html);
console.log(`Wrote ${options.out} with ${sections.length} candidate(s).`);
