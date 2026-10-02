#!/usr/bin/env node
// Renders brand assets (icons, social images, logo exports) to PNG from SVG or
// HTML sources, at the exact pixel sizes listed in a manifest.
//
// Usage:
//   node render-assets.mjs <manifest.json> [--check]
//
//   --check  list what would be rendered and which renderer was found; write nothing
//
// Manifest:
//   {
//     "outDir": "exports",
//     "stylesheets": ["https://fonts.example/css?family=Brand"],
//     "assets": [
//       { "name": "icon-512", "source": "logo/symbol.svg", "width": 512, "height": 512,
//         "background": "#ffffff", "padding": 48 },
//       { "name": "og-image", "source": "templates/og.html", "width": 1200, "height": 630 }
//     ]
//   }
// Paths are relative to the manifest. "background" defaults to transparent and
// "padding" (px, SVG sources only) to 0. "stylesheets" is optional: web font
// stylesheets to load for <text> inside SVG sources. HTML sources link their own.
//
// Renderers, in order of preference:
//   1. A Chromium-based browser (Chrome, Chromium, Edge) run headless. Handles
//      SVG and HTML sources, including web fonts. Set BROWSER_PATH to choose one.
//   2. ImageMagick (`magick`). SVG sources only; text needs the font installed.
// With neither, the script lists the assets as pending and exits with code 3.
//
// Every PNG written is read back and its pixel size checked against the manifest.
// Exit codes: 0 all rendered, 1 a render failed, 2 bad input, 3 no renderer.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const BROWSER_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const FONT_WAIT_MS = 5000;
const RENDER_TIMEOUT_MS = 60000;
const POLL_MS = 100;

function fail(message, code = 2) {
  console.error(message);
  process.exit(code);
}

const onPath = (command) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [command]).status === 0;
const isAvailable = (candidate) => (candidate.includes('/') || candidate.includes('\\') ? existsSync(candidate) : onPath(candidate));

function findBrowser() {
  if (process.env.BROWSER_PATH) return isAvailable(process.env.BROWSER_PATH) ? process.env.BROWSER_PATH : null;
  return BROWSER_CANDIDATES.find(isAvailable) ?? null;
}

function loadManifest(file) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Cannot read ${file}: ${error.message}`);
  }
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) fail('manifest needs a non-empty "assets" list');

  const base = dirname(resolve(file));
  const assets = manifest.assets.map((asset) => {
    const { name, source, width, height, background = 'transparent', padding = 0 } = asset;
    if (!name || !source) fail(`every asset needs "name" and "source": ${JSON.stringify(asset)}`);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) fail(`${name}: "width" and "height" must be positive integers`);
    const sourcePath = resolve(base, source);
    if (!existsSync(sourcePath)) fail(`${name}: source not found: ${source}`);
    const kind = extname(sourcePath).toLowerCase() === '.svg' ? 'svg' : 'html';
    return { name, sourcePath, kind, width, height, background, padding };
  });
  const stylesheets = (manifest.stylesheets ?? []).filter((url) => /^https?:\/\//.test(url));
  return { outDir: resolve(base, manifest.outDir ?? 'exports'), assets, stylesheets };
}

// The SVG is inlined, not referenced, so fonts declared by the page apply to its text.
function svgPage({ sourcePath, width, height, background, padding }, stylesheets) {
  const links = stylesheets.map((url) => `<link rel="stylesheet" href="${url.replace(/"/g, '&quot;')}">`).join('');
  const svg = readFileSync(sourcePath, 'utf8').replace(/<\?xml[^>]*\?>/, '');
  const inner = `width:${width - 2 * padding}px;height:${height - 2 * padding}px`;
  return `<!doctype html><meta charset="utf-8">${links}<style>
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:${background}}
body{display:flex;align-items:center;justify-content:center}
.fit{${inner};display:flex;align-items:center;justify-content:center}
.fit>svg{max-width:100%;max-height:100%;width:100%;height:100%}
</style><div class="fit">${svg}</div>`;
}

// A PNG file is complete once it ends with the IEND chunk.
function pngIsComplete(file) {
  if (!existsSync(file)) return false;
  const data = readFileSync(file);
  return data.length > 12 && data.toString('latin1', data.length - 8, data.length - 4) === 'IEND';
}

// Headless browsers sometimes stay alive after writing the screenshot (first-run
// and background tasks), so this waits for the file, not for the process to exit.
function renderWithBrowser(browser, asset, output, workDir, stylesheets) {
  let url = pathToFileURL(asset.sourcePath).href;
  if (asset.kind === 'svg') {
    const page = join(workDir, `${asset.name}.html`);
    writeFileSync(page, svgPage(asset, stylesheets));
    url = pathToFileURL(page).href;
  }
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
    `--user-data-dir=${join(workDir, 'profile')}`,
    `--window-size=${asset.width},${asset.height}`,
    `--virtual-time-budget=${FONT_WAIT_MS}`,
    `--screenshot=${output}`,
  ];
  if (asset.background === 'transparent') args.push('--default-background-color=00000000');

  return new Promise((done) => {
    const child = spawn(browser, [...args, url], { stdio: 'ignore' });
    const started = Date.now();
    let error = null;
    const finish = () => {
      clearInterval(timer);
      child.kill();
      done({ error });
    };
    const timer = setInterval(() => {
      if (pngIsComplete(output) || Date.now() - started > RENDER_TIMEOUT_MS) finish();
    }, POLL_MS);
    child.on('error', (spawnError) => { error = spawnError; finish(); });
    child.on('exit', finish);
  });
}

function renderWithMagick(asset, output) {
  const inner = `${asset.width - 2 * asset.padding}x${asset.height - 2 * asset.padding}`;
  const background = asset.background === 'transparent' ? 'none' : asset.background;
  const args = ['-background', background, '-density', '384', asset.sourcePath, '-resize', inner, '-gravity', 'center', '-extent', `${asset.width}x${asset.height}`, output];
  return spawnSync('magick', args, { encoding: 'utf8', timeout: 60000 });
}

// PNG stores width and height as big-endian integers at bytes 16 and 20.
function pngSize(file) {
  const header = readFileSync(file).subarray(0, 24);
  if (header.length < 24 || header.toString('latin1', 1, 4) !== 'PNG') return null;
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

const args = process.argv.slice(2);
const manifestFile = args.find((arg) => !arg.startsWith('--'));
if (!manifestFile) fail('Usage: node render-assets.mjs <manifest.json> [--check]');

const { outDir, assets, stylesheets } = loadManifest(manifestFile);
const browser = findBrowser();
const hasMagick = onPath('magick');
const rendererFor = (asset) => (browser ? 'browser' : hasMagick && asset.kind === 'svg' ? 'magick' : null);

console.log(`Renderer: ${browser ? `browser (${browser})` : hasMagick ? 'ImageMagick (SVG sources only)' : 'none found'}`);

if (args.includes('--check')) {
  for (const asset of assets) console.log(`  ${rendererFor(asset) ? 'ready  ' : 'pending'}  ${asset.name}.png  ${asset.width}x${asset.height}  from ${asset.kind}`);
  process.exit(assets.every(rendererFor) ? 0 : 3);
}

mkdirSync(outDir, { recursive: true });
const workDir = mkdtempSync(join(tmpdir(), 'brand-assets-'));
let failures = 0;
let pending = 0;

for (const asset of assets) {
  const output = join(outDir, `${asset.name}.png`);
  const renderer = rendererFor(asset);
  if (!renderer) {
    pending++;
    console.log(`pending  ${asset.name}.png  ${asset.width}x${asset.height}  (no renderer for ${asset.kind} sources)`);
    continue;
  }
  rmSync(output, { force: true });
  const result = renderer === 'browser' ? await renderWithBrowser(browser, asset, output, workDir, stylesheets) : renderWithMagick(asset, output);
  const size = existsSync(output) ? pngSize(output) : null;
  if (size && size.width === asset.width && size.height === asset.height) {
    console.log(`ok       ${asset.name}.png  ${size.width}x${size.height}`);
    continue;
  }
  failures++;
  const reason = size ? `got ${size.width}x${size.height}, expected ${asset.width}x${asset.height}` : (result.stderr || result.error?.message || 'no file written').toString().trim().split('\n').pop();
  console.log(`FAILED   ${asset.name}.png  ${reason}`);
}

// The browser may still be flushing its profile when it is stopped, so retry, and
// leave the temporary folder behind rather than fail after a successful render.
try {
  rmSync(workDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
} catch {
  console.error(`note: could not remove temporary folder ${workDir}`);
}
console.log(`\n${assets.length - failures - pending} rendered, ${failures} failed, ${pending} pending. Output: ${outDir}`);
if (failures > 0) process.exit(1);
process.exit(pending > 0 ? 3 : 0);
