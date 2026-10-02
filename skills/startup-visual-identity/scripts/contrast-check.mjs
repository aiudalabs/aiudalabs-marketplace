#!/usr/bin/env node
// WCAG 2.x contrast ratio between two hex colors.
// Usage: node contrast-check.mjs <foreground> <background>
// Exits 1 when the pair fails AA for normal text, 2 on bad input.

const AA_NORMAL = 4.5;
const AA_LARGE = 3;
const AAA_NORMAL = 7;
const AAA_LARGE = 4.5;

function parseHex(input) {
  const hex = input.trim().replace(/^#/, '');
  const full = hex.length === 3 ? [...hex].map((char) => char + char).join('') : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16));
}

// Relative luminance as defined by WCAG 2.x.
function luminance(rgb) {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const [foregroundArg, backgroundArg] = process.argv.slice(2);
const foreground = parseHex(foregroundArg ?? '');
const background = parseHex(backgroundArg ?? '');

if (!foreground || !background) {
  console.error('Usage: node contrast-check.mjs <foreground-hex> <background-hex>   e.g. "#1A1A1A" "#FFFFFF"');
  process.exit(2);
}

const ratio = contrastRatio(foreground, background);
const verdict = (threshold) => (ratio >= threshold ? 'pass' : 'FAIL');

console.log(`Contrast ratio: ${ratio.toFixed(2)}:1`);
console.log(`AA  normal text (${AA_NORMAL}:1): ${verdict(AA_NORMAL)}`);
console.log(`AA  large text  (${AA_LARGE}:1): ${verdict(AA_LARGE)}`);
console.log(`AAA normal text (${AAA_NORMAL}:1): ${verdict(AAA_NORMAL)}`);
console.log(`AAA large text  (${AAA_LARGE}:1): ${verdict(AAA_LARGE)}`);

process.exit(ratio >= AA_NORMAL ? 0 : 1);
