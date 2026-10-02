#!/usr/bin/env node
// Exports a Design Tokens file (DTCG 2025.10) to CSS custom properties or to
// a flat JSON map. Aliases become var() references in CSS, so a theme can
// override a primitive and everything that points to it follows.
//
// Usage:
//   node export-tokens.mjs <file.tokens.json> [--format css|json] [--selector ":root"] [--prefix brand]
//
// For a dark theme, keep the overrides in their own token file and export it
// with a different selector:
//   node export-tokens.mjs brand.dark.tokens.json --selector '[data-theme="dark"]'
//
// Run validate-tokens.mjs first. Composite types other than shadow, and
// colors in hsl or hwb without a "hex" fallback, are skipped with a warning.

import { aliasTarget, collectTokens, readTokenFile, resolveAlias, resolveType } from './tokens-lib.mjs';

const FUNCTIONAL_SPACES = ['oklch', 'oklab', 'lab', 'lch'];
const COLOR_FUNCTION_SPACES = ['srgb-linear', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020', 'xyz-d65', 'xyz-d50'];
const GENERIC_FAMILIES = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded'];

const toHex = (components) => `#${components.map((item) => Math.round(item * 255).toString(16).padStart(2, '0')).join('')}`;

function colorToCss({ colorSpace, components, alpha = 1, hex }) {
  const opaque = alpha === 1;
  const parts = components.join(' ');
  const suffix = opaque ? '' : ` / ${alpha}`;
  if (colorSpace === 'srgb' && !components.includes('none')) {
    if (opaque) return hex ?? toHex(components);
    return `rgb(${components.map((item) => Math.round(item * 255)).join(' ')}${suffix})`;
  }
  if (FUNCTIONAL_SPACES.includes(colorSpace)) return `${colorSpace}(${parts}${suffix})`;
  if (COLOR_FUNCTION_SPACES.includes(colorSpace)) return `color(${colorSpace} ${parts}${suffix})`;
  if (hex && opaque) return hex;
  return null;
}

const unitValue = (value) => `${value.value}${value.unit}`;
const fontName = (name) => (GENERIC_FAMILIES.includes(name) ? name : `"${name}"`);

function shadowToCss(value, cssValue) {
  const layers = Array.isArray(value) ? value : [value];
  const rendered = layers.map((layer) => {
    const parts = ['offsetX', 'offsetY', 'blur', 'spread', 'color'].map((key) => cssValue(key === 'color' ? 'color' : 'dimension', layer[key]));
    if (parts.includes(null)) return null;
    return `${layer.inset ? 'inset ' : ''}${parts.join(' ')}`;
  });
  return rendered.includes(null) ? null : rendered.join(', ');
}

function makeRenderer(variableName) {
  const cssValue = (type, value) => {
    const target = aliasTarget(value);
    if (target) return `var(${variableName(target)})`;
    if (type === 'color') return colorToCss(value);
    if (type === 'dimension' || type === 'duration') return unitValue(value);
    if (type === 'fontFamily') return [value].flat().map(fontName).join(', ');
    if (type === 'fontWeight' || type === 'number') return String(value);
    if (type === 'cubicBezier') return `cubic-bezier(${value.join(', ')})`;
    if (type === 'shadow') return shadowToCss(value, cssValue);
    return null;
  };
  return cssValue;
}

function readOptions(args) {
  const option = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index === -1 ? fallback : args[index + 1];
  };
  return {
    file: args.find((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--')),
    format: option('format', 'css'),
    selector: option('selector', ':root'),
    prefix: option('prefix', ''),
  };
}

const options = readOptions(process.argv.slice(2));
if (!options.file || !['css', 'json'].includes(options.format)) {
  console.error('Usage: node export-tokens.mjs <file.tokens.json> [--format css|json] [--selector ":root"] [--prefix brand]');
  process.exit(2);
}

let tree;
try {
  tree = readTokenFile(options.file);
} catch (error) {
  console.error(`Cannot read ${options.file}: ${error.message}`);
  process.exit(2);
}

const { tokens } = collectTokens(tree);
const variableName = (name) => `--${[options.prefix, ...name.split('.')].filter((part) => part && part !== '$root').join('-')}`;
const cssValue = makeRenderer(variableName);

const lines = [];
const flat = {};
for (const [name, entry] of tokens) {
  const type = resolveType(name, tokens);
  const css = cssValue(type, entry.token.$value);
  if (css === null) {
    console.error(`skipped ${name}: cannot export a ${type ?? 'typeless'} token`);
    continue;
  }
  lines.push(`  ${variableName(name)}: ${css};`);

  // The JSON format has no variables, so aliases are resolved to final values.
  const resolved = resolveAlias(name, tokens).entry;
  flat[name] = resolved ? cssValue(type, resolved.token.$value) : css;
}

if (options.format === 'json') console.log(JSON.stringify(flat, null, 2));
else console.log(`${options.selector} {\n${lines.join('\n')}\n}`);
