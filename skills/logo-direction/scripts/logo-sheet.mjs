#!/usr/bin/env node
// Builds one HTML review sheet from a set of SVG logo concepts, so they can be
// compared side by side under the conditions a logo has to survive:
// large, small (64, 32 and 16 px), one color, and reversed on a dark background.
//
// Usage:
//   node logo-sheet.mjs <concept.svg>... [--out logo-review.html] [--dark "#111111"] [--light "#ffffff"]
//
// Open the output file in a browser. Nothing is uploaded and no network is used.

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const SMALL_SIZES = [64, 32, 16];

function readOptions(args) {
  const options = { out: 'logo-review.html', dark: '#111111', light: '#ffffff', files: [] };
  for (let index = 0; index < args.length; index++) {
    const key = args[index].startsWith('--') ? args[index].slice(2) : null;
    if (!key) options.files.push(args[index]);
    else if (key in options && key !== 'files') options[key] = args[++index];
    else return null;
  }
  return options.files.length > 0 ? options : null;
}

// Strips the XML prolog and anything that could run script when the sheet is opened.
function loadSvg(file) {
  const raw = readFileSync(file, 'utf8');
  const start = raw.indexOf('<svg');
  if (start === -1) throw new Error(`${file} does not contain an <svg> element`);
  return raw
    .slice(start)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
}

const escapeHtml = (text) => text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
const cell = (className, style, svg, label) => `<figure class="${className}" style="${style}"><div class="mark">${svg}</div><figcaption>${label}</figcaption></figure>`;

function conceptSection(file, svg, { dark, light }) {
  const small = SMALL_SIZES.map((size) => cell('small', `--size:${size}px;background:${light}`, svg, `${size}px`)).join('');
  return `<section>
<h2>${escapeHtml(basename(file))}</h2>
<div class="row">
${cell('large', `background:${light}`, svg, 'Color on light')}
${cell('large', `background:${dark}`, svg, 'Color on dark')}
${cell('large mono-dark', `background:${light}`, svg, 'One color, dark')}
${cell('large mono-light', `background:${dark};color:${light}`, svg, 'One color, reversed')}
</div>
<div class="row">${small}</div>
</section>`;
}

const options = readOptions(process.argv.slice(2));
if (!options) {
  console.error('Usage: node logo-sheet.mjs <concept.svg>... [--out logo-review.html] [--dark "#111111"] [--light "#ffffff"]');
  process.exit(2);
}

let sections;
try {
  sections = options.files.map((file) => conceptSection(file, loadSvg(file), options));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

// brightness(0) turns every painted pixel black, which shows the silhouette the
// mark would have in a one-color print. invert(1) then makes that silhouette white.
const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Logo review</title>
<style>
body{margin:0;padding:32px;font:14px/1.4 system-ui,sans-serif;background:#f3f3f3;color:#222}
h1{font-size:20px;margin:0 0 4px}
p{margin:0 0 24px;color:#555;max-width:70ch}
section{margin:0 0 40px}
h2{font-size:15px;margin:0 0 12px}
.row{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:16px}
figure{margin:0;border:1px solid #ddd;border-radius:6px;overflow:hidden}
figcaption{padding:6px 10px;font-size:12px;background:#fff;color:#555;border-top:1px solid #ddd}
.mark{display:flex;align-items:center;justify-content:center}
.large .mark{width:260px;height:180px;padding:24px;box-sizing:border-box}
.large svg{max-width:100%;max-height:100%}
.small .mark{width:96px;height:96px}
.small svg{width:var(--size);height:var(--size)}
.mono-dark svg{filter:brightness(0)}
.mono-light svg{filter:brightness(0) invert(1)}
</style>
<h1>Logo review</h1>
<p>Each concept is shown in color on light and dark backgrounds, as a one-color silhouette, and at 64, 32 and 16 pixels. A concept that loses its idea in the silhouette or at 16 pixels needs a simpler small-size variant, or another idea.</p>
${sections.join('\n')}
</html>
`;

writeFileSync(options.out, html);
console.log(`Wrote ${options.out} with ${options.files.length} concept(s).`);
