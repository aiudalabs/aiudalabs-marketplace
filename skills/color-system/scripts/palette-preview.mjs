#!/usr/bin/env node
// Builds one HTML page that shows palette candidates side by side, each applied
// to the same small sample (heading, text, button, link, card), with its
// swatches and the contrast of its declared pairs. Made for the moment the
// user has to choose between candidates.
//
// Usage:
//   node palette-preview.mjs <palette.json>... [--out palette-preview.html]
//        [--heading "text"] [--body "text"] [--action "text"]
//
// Each palette.json is the same file contrast.mjs reads:
//   { "colors": { "background": "#...", "text": "#...", ... }, "pairs": [ ... ] }
// Every palette needs the roles "background" and "text". The sample also uses
// surface, border, text-muted, action, on-action and link when present, and
// falls back to background or text when they are missing. The file name is
// used as the candidate's label.
//
// Open the output in a browser. No network is used.

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { contrastRatio, parseHex } from './color-lib.mjs';

const REQUIRED = { text: 4.5, 'large-text': 3, ui: 3, 'text-aaa': 7 };
const TEXT_OPTIONS = {
  heading: 'A heading that says what we do',
  body: 'Body text sits here, long enough to judge how the text color reads on the background.',
  action: 'Primary action',
};

function fail(message) {
  console.error(message);
  process.exit(2);
}

function readOptions(args) {
  const options = { out: 'palette-preview.html', ...TEXT_OPTIONS, files: [] };
  for (let index = 0; index < args.length; index++) {
    const key = args[index].startsWith('--') ? args[index].slice(2) : null;
    if (!key) options.files.push(args[index]);
    else if (key in options && key !== 'files' && args[index + 1] !== undefined) options[key] = args[++index];
    else return null;
  }
  return options.files.length > 0 ? options : null;
}

function loadPalette(file) {
  let palette;
  try {
    palette = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Cannot read ${file}: ${error.message}`);
  }
  const colors = palette.colors ?? {};
  for (const [name, hex] of Object.entries(colors)) {
    if (!parseHex(hex)) fail(`${file}: "${name}" is not a hex color: ${hex}`);
  }
  if (!colors.background || !colors.text) fail(`${file}: "colors" needs the roles "background" and "text" so the sample can be drawn`);
  return { label: basename(file).replace(/(\.palette)?\.json$/, ''), colors, pairs: palette.pairs ?? [] };
}

const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);

// Black or white, whichever reads better on the swatch.
const labelColor = (hex) => (contrastRatio(parseHex(hex), [0, 0, 0]) >= 4.5 ? '#000' : '#fff');

function pairRows(colors, pairs) {
  return pairs.map(({ foreground, background, use = 'text' }) => {
    if (!colors[foreground] || !colors[background] || !REQUIRED[use]) return '';
    const ratio = contrastRatio(parseHex(colors[foreground]), parseHex(colors[background]));
    const passed = ratio >= REQUIRED[use];
    return `<tr><td>${escapeHtml(foreground)} on ${escapeHtml(background)}</td><td>${ratio.toFixed(2)}:1</td><td>${passed ? 'pass' : '<b>FAIL</b>'}</td></tr>`;
  }).join('');
}

function candidate({ label, colors, pairs }, text) {
  const { background, text: ink } = colors;
  const style = {
    surface: colors.surface ?? background,
    border: colors.border ?? colors.surface ?? ink,
    muted: colors['text-muted'] ?? ink,
    action: colors.action ?? ink,
    onAction: colors['on-action'] ?? background,
    link: colors.link ?? colors.action ?? ink,
  };
  const swatches = Object.entries(colors).map(([name, hex]) => `<div class="swatch" style="background:${hex};color:${labelColor(hex)}">${escapeHtml(name)}<br>${hex}</div>`).join('');
  const rows = pairRows(colors, pairs);

  return `<section style="background:${background};color:${ink};border-color:${style.border}">
<p class="label" style="color:${style.muted}">${escapeHtml(label)}</p>
<h2>${escapeHtml(text.heading)}</h2>
<p>${escapeHtml(text.body)}</p>
<p style="color:${style.muted}">Secondary text, for notes and sources.</p>
<p><span class="button" style="background:${style.action};color:${style.onAction}">${escapeHtml(text.action)}</span> <span style="color:${style.link};text-decoration:underline">A text link</span></p>
<div class="card" style="background:${style.surface};border-color:${style.border}">A card on the surface color, with <span style="color:${style.link};text-decoration:underline">a link</span> inside.</div>
<div class="swatches">${swatches}</div>
${rows ? `<table style="border-color:${style.border}"><tr><th>Pair</th><th>Ratio</th><th></th></tr>${rows}</table>` : ''}
</section>`;
}

const options = readOptions(process.argv.slice(2));
if (!options) fail('Usage: node palette-preview.mjs <palette.json>... [--out palette-preview.html] [--heading "text"] [--body "text"] [--action "text"]');

const sections = options.files.map(loadPalette).map((palette) => candidate(palette, options));
const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Palette candidates</title>
<style>
body{margin:0;padding:24px;display:grid;grid-template-columns:repeat(${sections.length},minmax(320px,1fr));gap:20px;font:16px/1.5 system-ui,sans-serif;background:#d9d9d9}
section{padding:28px;border:1px solid;border-radius:6px}
.label{font:12px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px}
h2{font-size:28px;line-height:1.15;margin:0 0 12px}
p{margin:0 0 12px}
.button{display:inline-block;padding:10px 16px;border-radius:4px;font-weight:600;margin-right:12px}
.card{padding:14px;border:1px solid;border-radius:4px;margin:16px 0}
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:4px}
.swatch{padding:8px 6px;font:10px/1.3 ui-monospace,monospace;border-radius:3px}
table{width:100%;border-collapse:collapse;margin-top:16px;font:12px/1.4 ui-monospace,monospace}
td,th{padding:3px 0;text-align:left;border-bottom:1px solid;border-color:inherit;font-weight:400}
</style>
${sections.join('\n')}
</html>
`;

writeFileSync(options.out, html);
console.log(`Wrote ${options.out} with ${sections.length} candidate(s).`);
