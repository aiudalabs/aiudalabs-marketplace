#!/usr/bin/env node
// Builds an 11-step tonal ramp (50 to 950) from one brand color, in OKLCH,
// so the steps are evenly spaced to the eye and keep the hue of the base color.
//
// Usage:
//   node color-ramp.mjs <hex> [--name primary] [--neutral] [--no-anchor] [--tokens]
//
//   --neutral    build a tinted neutral: same hue, very low chroma
//   --no-anchor  do not replace the nearest step with the exact base color
//   --tokens     print a Design Tokens (DTCG 2025.10) group instead of the report

import { oklchToRgb, parseHex, rgbToOklch, toHex } from './color-lib.mjs';

// Target lightness per step. These are starting values, not a standard: adjust
// them if the brand needs more separation at the light or the dark end.
const LIGHTNESS = { 50: 0.97, 100: 0.93, 200: 0.87, 300: 0.78, 400: 0.68, 500: 0.58, 600: 0.5, 700: 0.42, 800: 0.34, 900: 0.27, 950: 0.2 };
const NEUTRAL_CHROMA = 0.012;

// Very light and very dark steps cannot hold much chroma, so taper it toward the ends.
function taper(lightness) {
  const distance = Math.abs(lightness - 0.55) / 0.45;
  return Math.max(0.2, 1 - 0.75 * distance ** 2);
}

function buildRamp(baseHex, { neutral, anchor }) {
  const [baseLightness, baseChroma, hue] = rgbToOklch(parseHex(baseHex));
  const steps = Object.entries(LIGHTNESS).map(([step, lightness]) => {
    const wanted = neutral ? Math.min(baseChroma, NEUTRAL_CHROMA) : baseChroma * taper(lightness);
    const { rgb, chroma } = oklchToRgb([lightness, wanted, hue]);
    return { step, hex: toHex(rgb), oklch: [lightness, chroma, hue] };
  });

  if (!anchor || neutral) return { steps, anchorStep: null };
  const nearest = steps.reduce((best, step) => (Math.abs(step.oklch[0] - baseLightness) < Math.abs(best.oklch[0] - baseLightness) ? step : best));
  nearest.hex = toHex(parseHex(baseHex));
  nearest.oklch = [baseLightness, baseChroma, hue];
  return { steps, anchorStep: nearest.step };
}

const round = (value, digits) => Number(value.toFixed(digits));

function toTokens(name, steps) {
  const group = { $type: 'color' };
  for (const { step, hex } of steps) {
    group[step] = { $value: { colorSpace: 'srgb', components: parseHex(hex).map((value) => round(value, 4)), hex } };
  }
  return { color: { [name]: group } };
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const nameIndex = args.indexOf('--name');
const name = nameIndex === -1 ? 'brand' : args[nameIndex + 1];
const baseHex = args.find((arg, index) => !arg.startsWith('--') && index !== nameIndex + 1);

if (!baseHex || !parseHex(baseHex) || !name) {
  console.error('Usage: node color-ramp.mjs <hex> [--name primary] [--neutral] [--no-anchor] [--tokens]');
  process.exit(2);
}

const { steps, anchorStep } = buildRamp(baseHex, { neutral: flags.has('--neutral'), anchor: !flags.has('--no-anchor') });

if (flags.has('--tokens')) {
  console.log(JSON.stringify(toTokens(name, steps), null, 2));
  process.exit(0);
}

console.log(`${name}: ramp from ${toHex(parseHex(baseHex))}${flags.has('--neutral') ? ' (tinted neutral)' : ''}`);
for (const { step, hex, oklch } of steps) {
  const marker = step === anchorStep ? '  <- base color' : '';
  console.log(`  ${step.padStart(3)}  ${hex}  oklch(${round(oklch[0], 3)} ${round(oklch[1], 3)} ${round(oklch[2], 1)})${marker}`);
}
