#!/usr/bin/env node
// Generates a modular type scale: each step is the previous one times a ratio.
//
// Usage:
//   node type-scale.mjs [--base 16] [--ratio 1.25] [--down 2] [--up 6] [--json]
//
//   --base   body size in px (default 16)
//   --ratio  scale ratio (default 1.25). Common choices: 1.125, 1.2, 1.25, 1.333, 1.5
//   --down   steps smaller than the body size (default 2)
//   --up     steps larger than the body size (default 6)
//
// Line heights are starting values to tune by eye: long text needs more
// leading than large display text.

const DEFAULTS = { base: 16, ratio: 1.25, down: 2, up: 6 };
const SMALLER = ['sm', 'xs', '2xs', '3xs'];
const LARGER = ['lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl'];

function readOptions(args) {
  const options = { ...DEFAULTS, json: args.includes('--json') };
  for (const key of Object.keys(DEFAULTS)) {
    const index = args.indexOf(`--${key}`);
    if (index === -1) continue;
    const value = Number(args[index + 1]);
    if (!Number.isFinite(value) || value <= 0) return null;
    options[key] = value;
  }
  if (options.ratio <= 1) return null;
  if (options.down > SMALLER.length || options.up > LARGER.length) return null;
  return options;
}

function lineHeight(sizePx, base) {
  if (sizePx <= base * 1.25) return 1.5;
  if (sizePx <= base * 2) return 1.3;
  return 1.15;
}

function buildScale({ base, ratio, down, up }) {
  const steps = [];
  for (let offset = -down; offset <= up; offset++) {
    const px = base * ratio ** offset;
    const name = offset === 0 ? 'base' : offset < 0 ? SMALLER[-offset - 1] : LARGER[offset - 1];
    steps.push({ name, px: Number(px.toFixed(2)), rem: Number((px / 16).toFixed(4)), lineHeight: lineHeight(px, base) });
  }
  return steps;
}

const options = readOptions(process.argv.slice(2));
if (!options) {
  console.error('Usage: node type-scale.mjs [--base 16] [--ratio 1.25] [--down 2] [--up 6] [--json]');
  console.error(`ratio must be greater than 1, down at most ${SMALLER.length}, up at most ${LARGER.length}`);
  process.exit(2);
}

const steps = buildScale(options);
if (options.json) {
  console.log(JSON.stringify({ base: options.base, ratio: options.ratio, steps }, null, 2));
  process.exit(0);
}

console.log(`Type scale: base ${options.base}px, ratio ${options.ratio}\n`);
console.log('| Step | px | rem | Line height |');
console.log('| --- | --- | --- | --- |');
for (const step of steps) console.log(`| ${step.name} | ${step.px} | ${step.rem} | ${step.lineHeight} |`);
