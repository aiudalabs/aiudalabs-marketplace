#!/usr/bin/env node
// Builds one HTML board that shows visual directions side by side, at the same
// scale, next to the current look, so they can be compared by eye.
//
// Usage:
//   node direction-board.mjs --direction "Name=page.html" [--direction ...]
//        [--reference "Current site=current.png"] [--out direction-board.html]
//        [--width 1280] [--height 2400]
//
//   --direction  a direction page (HTML) with its label; repeat for each one
//   --reference  the existing look, as an image or an HTML file; repeat if needed
//   --width      viewport width each page is laid out at (default 1280)
//   --height     how much of each page to show, in px at that width (default 2400)
//
// Paths are written into the board as given, so pass them relative to the
// board file. Open the board in a browser. No network is used by the board
// itself; each direction page loads whatever it links.

import { writeFileSync } from 'node:fs';
import { extname } from 'node:path';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

function readOptions(args) {
  const options = { out: 'direction-board.html', width: '1280', height: '2400', direction: [], reference: [] };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].startsWith('--') ? args[index].slice(2) : null;
    const value = args[index + 1];
    if (!key || value === undefined || !(key in options)) return null;
    if (Array.isArray(options[key])) options[key].push(value);
    else options[key] = value;
  }
  const width = Number(options.width);
  const height = Number(options.height);
  if (options.direction.length === 0 || !(width >= 320) || !(height >= 320)) return null;
  return { ...options, width, height };
}

// "Label=path" pairs. The label may contain "=" only before the last one.
function parseEntry(entry) {
  const split = entry.lastIndexOf('=');
  if (split < 1 || split === entry.length - 1) return null;
  return { label: entry.slice(0, split).trim(), path: entry.slice(split + 1).trim() };
}

const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);

function column({ label, path }, kind) {
  const source = escapeHtml(encodeURI(path));
  const isImage = IMAGE_EXTENSIONS.includes(extname(path).toLowerCase());
  const view = isImage
    ? `<img src="${source}" alt="${escapeHtml(label)}">`
    : `<iframe src="${source}" title="${escapeHtml(label)}" loading="lazy" tabindex="-1"></iframe>`;
  return `<article class="${kind}">
<header><h2>${escapeHtml(label)}</h2><a href="${source}" target="_blank" rel="noopener">Open full size</a></header>
<div class="frame">${view}</div>
</article>`;
}

const options = readOptions(process.argv.slice(2));
if (!options) {
  console.error('Usage: node direction-board.mjs --direction "Name=page.html" [--direction ...] [--reference "Current site=current.png"] [--out direction-board.html] [--width 1280] [--height 2400]');
  process.exit(2);
}

const references = options.reference.map(parseEntry);
const directions = options.direction.map(parseEntry);
if ([...references, ...directions].includes(null)) {
  console.error('Each --direction and --reference must look like "Label=path".');
  process.exit(2);
}

const columns = [...references.map((entry) => column(entry, 'reference')), ...directions.map((entry) => column(entry, 'direction'))];

// Each page is laid out at the full viewport width, then scaled down to fit its column.
const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Direction board</title>
<style>
:root{--page-w:${options.width};--page-h:${options.height};--col:min(30rem,90vw)}
body{margin:0;padding:24px;font:14px/1.4 system-ui,sans-serif;background:#e4e4e4;color:#1c1c1c}
h1{font-size:20px;margin:0 0 4px}
p{margin:0 0 20px;color:#555;max-width:70ch}
main{display:flex;gap:24px;align-items:flex-start;overflow-x:auto;padding-bottom:16px}
article{flex:0 0 var(--col)}
article header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px}
h2{font-size:15px;margin:0}
a{color:#1c1c1c}
.frame{width:var(--col);aspect-ratio:var(--page-w)/var(--page-h);overflow:hidden;background:#fff;border:1px solid #bbb;border-radius:4px;container-type:inline-size}
.reference .frame{border-style:dashed}
iframe{width:calc(var(--page-w)*1px);height:calc(var(--page-h)*1px);border:0;transform-origin:0 0;transform:scale(calc(100cqw/(var(--page-w)*1px)));pointer-events:none}
img{display:block;width:100%;height:auto}
</style>
<h1>Direction board</h1>
<p>Every page is shown at the same scale. The dashed frame is the current look. Use "Open full size" to see a direction as a visitor would.</p>
<main>
${columns.join('\n')}
</main>
</html>
`;

writeFileSync(options.out, html);
console.log(`Wrote ${options.out} with ${references.length} reference(s) and ${directions.length} direction(s).`);
