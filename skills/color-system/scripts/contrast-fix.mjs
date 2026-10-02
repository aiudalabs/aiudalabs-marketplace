#!/usr/bin/env node
// Repairs a failing color pair with the smallest change: it keeps the hue and
// chroma of one color and moves only its lightness until the pair passes.
// Use it to fix an existing palette without changing how it looks.
//
// Usage:
//   node contrast-fix.mjs <foreground-hex> <background-hex> [--use text] [--adjust foreground]
//
//   --use     text (4.5:1, default), large-text (3:1), ui (3:1) or text-aaa (7:1)
//   --adjust  which color may change: foreground (default) or background
//
// Prints the original ratio, the adjusted color and the new ratio. Exit code 0
// when the pair passes (already, or after the fix), 1 when no lightness
// reaches the target, 2 on bad input.

import { contrastRatio, oklchToRgb, parseHex, rgbToOklch, toHex } from './color-lib.mjs';

const REQUIRED = { text: 4.5, 'large-text': 3, ui: 3, 'text-aaa': 7 };
const STEP = 0.002;

function fail(message) {
  console.error(message);
  process.exit(2);
}

function readOptions(args) {
  const options = { use: 'text', adjust: 'foreground', colors: [] };
  for (let index = 0; index < args.length; index++) {
    const key = args[index].startsWith('--') ? args[index].slice(2) : null;
    if (!key) options.colors.push(args[index]);
    else if (key in options && key !== 'colors') options[key] = args[++index];
    else return null;
  }
  return options;
}

// Walks lightness away from the other color, in small steps, and returns the
// first color that reaches the target. Hue is kept; chroma is kept where the
// sRGB gamut allows it.
function findPassing(movable, fixed, target) {
  const [lightness, chroma, hue] = rgbToOklch(movable);
  const fixedLightness = rgbToOklch(fixed)[0];
  const direction = lightness >= fixedLightness ? 1 : -1;
  for (const sign of [direction, -direction]) {
    for (let next = lightness; next >= 0 && next <= 1; next += sign * STEP) {
      const { rgb } = oklchToRgb([next, chroma, hue]);
      const candidate = parseHex(toHex(rgb));
      if (contrastRatio(candidate, fixed) >= target) return { rgb: candidate, lightnessChange: next - lightness };
    }
  }
  return null;
}

const options = readOptions(process.argv.slice(2));
const usage = 'Usage: node contrast-fix.mjs <foreground-hex> <background-hex> [--use text|large-text|ui|text-aaa] [--adjust foreground|background]';
if (!options || options.colors.length !== 2) fail(usage);
const [foreground, background] = options.colors.map((color) => parseHex(color));
const target = REQUIRED[options.use];
if (!foreground || !background || !target || !['foreground', 'background'].includes(options.adjust)) fail(usage);

const original = contrastRatio(foreground, background);
console.log(`Original: ${toHex(foreground)} on ${toHex(background)}  ${original.toFixed(2)}:1  (${options.use} needs ${target}:1)`);
if (original >= target) {
  console.log('Already passes. No change needed.');
  process.exit(0);
}

const movingForeground = options.adjust === 'foreground';
const result = findPassing(movingForeground ? foreground : background, movingForeground ? background : foreground, target);
if (!result) {
  console.log(`No lightness of the ${options.adjust} reaches ${target}:1 against the other color. Adjust the other color instead.`);
  process.exit(1);
}

const fixedForeground = movingForeground ? result.rgb : foreground;
const fixedBackground = movingForeground ? background : result.rgb;
const direction = result.lightnessChange > 0 ? 'lighter' : 'darker';
console.log(`Fixed:    ${toHex(fixedForeground)} on ${toHex(fixedBackground)}  ${contrastRatio(fixedForeground, fixedBackground).toFixed(2)}:1`);
console.log(`Changed the ${options.adjust} from ${toHex(movingForeground ? foreground : background)} to ${toHex(result.rgb)}: same hue, ${Math.abs(result.lightnessChange * 100).toFixed(1)} points ${direction}.`);
