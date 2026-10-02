#!/usr/bin/env node
// Validates a Design Tokens file against the DTCG Format Module 2025.10.
//
// Usage: node validate-tokens.mjs <file.tokens.json>
// Exit code 0: valid. 1: errors found. 2: the file could not be read.
//
// Checked in full: names, $value presence, type resolution, aliases, and the
// value shape of color, dimension, duration, fontFamily, fontWeight,
// cubicBezier and number, plus the required properties of shadow, border and
// transition. Not checked in depth: strokeStyle, gradient, typography, $ref
// JSON pointers and $extends. Those produce a warning, not an error.

import { ALIAS, aliasTarget, collectTokens, readTokenFile, resolveAlias, resolveType } from './tokens-lib.mjs';

const COLOR_SPACES = ['srgb', 'srgb-linear', 'hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020', 'xyz-d65', 'xyz-d50'];
const FONT_WEIGHTS = ['thin', 'hairline', 'extra-light', 'ultra-light', 'light', 'normal', 'regular', 'book', 'medium', 'semi-bold', 'demi-bold', 'bold', 'extra-bold', 'ultra-bold', 'black', 'heavy', 'extra-black', 'ultra-black'];
const REQUIRED_PROPERTIES = {
  shadow: ['color', 'offsetX', 'offsetY', 'blur', 'spread'],
  border: ['color', 'width', 'style'],
  transition: ['duration', 'delay', 'timingFunction'],
};
const SHALLOW_TYPES = ['strokeStyle', 'gradient', 'typography'];

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const inRange = (value, min, max) => isNumber(value) && value >= min && value <= max;

function checkColor(value) {
  if (typeof value === 'string') return ['a color $value must be an object with colorSpace and components, not a string like "#ff0000"'];
  if (!isObject(value)) return ['a color $value must be an object'];
  const problems = [];
  if (!COLOR_SPACES.includes(value.colorSpace)) problems.push(`unknown colorSpace "${value.colorSpace}"`);
  const components = value.components;
  if (!Array.isArray(components) || components.length !== 3 || !components.every((item) => isNumber(item) || item === 'none')) {
    problems.push('components must be an array of three numbers (or "none")');
  } else if (value.colorSpace === 'srgb' && !components.every((item) => item === 'none' || inRange(item, 0, 1))) {
    problems.push('srgb components must be between 0 and 1');
  }
  if ('alpha' in value && !inRange(value.alpha, 0, 1)) problems.push('alpha must be between 0 and 1');
  if ('hex' in value && !/^#[0-9a-fA-F]{6}$/.test(value.hex)) problems.push('hex must be 6-digit notation such as "#ff00ff"');
  if (problems.length === 0) problems.push(...checkHexMatches(value));
  return problems;
}

// In srgb the hex fallback and the components describe the same color.
function checkHexMatches({ colorSpace, components, hex }) {
  if (colorSpace !== 'srgb' || !hex || components.includes('none')) return [];
  const fromComponents = `#${components.map((item) => Math.round(item * 255).toString(16).padStart(2, '0')).join('')}`;
  return fromComponents === hex.toLowerCase() ? [] : [`hex ${hex} does not match components (${fromComponents})`];
}

function checkUnitValue(value, units, label) {
  if (!isObject(value) || !isNumber(value.value) || !units.includes(value.unit)) {
    return [`a ${label} $value must be an object like { "value": 1, "unit": "${units[0]}" } with unit ${units.join(' or ')}`];
  }
  return [];
}

function checkFontFamily(value) {
  const valid = typeof value === 'string' || (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string'));
  return valid ? [] : ['a fontFamily $value must be a font name or an array of font names'];
}

function checkFontWeight(value) {
  const valid = inRange(value, 1, 1000) || FONT_WEIGHTS.includes(value);
  return valid ? [] : ['a fontWeight $value must be a number from 1 to 1000 or a named weight such as "bold"'];
}

function checkCubicBezier(value) {
  const valid = Array.isArray(value) && value.length === 4 && value.every(isNumber);
  return valid ? [] : ['a cubicBezier $value must be an array of four numbers'];
}

function checkComposite(type, value) {
  const items = type === 'shadow' && Array.isArray(value) ? value : [value];
  const problems = [];
  for (const item of items) {
    if (!isObject(item)) return [`a ${type} $value must be an object`];
    for (const property of REQUIRED_PROPERTIES[type]) {
      if (!(property in item)) problems.push(`${type} is missing "${property}"`);
    }
  }
  return problems;
}

const CHECKS = {
  color: checkColor,
  dimension: (value) => checkUnitValue(value, ['px', 'rem'], 'dimension'),
  duration: (value) => checkUnitValue(value, ['ms', 's'], 'duration'),
  fontFamily: checkFontFamily,
  fontWeight: checkFontWeight,
  cubicBezier: checkCubicBezier,
  number: (value) => (isNumber(value) ? [] : ['a number $value must be a JSON number']),
  shadow: (value) => checkComposite('shadow', value),
  border: (value) => checkComposite('border', value),
  transition: (value) => checkComposite('transition', value),
};

function checkName(path) {
  const name = path[path.length - 1];
  if (name === undefined || name === '$root') return [];
  if (name.startsWith('$')) return [`name "${name}" must not start with "$"`];
  if (/[{}.]/.test(name)) return [`name "${name}" must not contain "{", "}" or "."`];
  return [];
}

function checkToken(name, entry, tokens) {
  const errors = checkName(entry.path);
  const warnings = [];
  const value = entry.token.$value;

  const target = aliasTarget(value);
  if (target) {
    const resolved = resolveAlias(name, tokens);
    if (resolved.error) errors.push(resolved.error);
    return { errors, warnings };
  }
  if (typeof value === 'string' && value.includes('{') && !ALIAS.test(value)) {
    errors.push(`"${value}" is not a valid reference; use the form "{group.token}"`);
    return { errors, warnings };
  }
  if (isObject(value) && '$ref' in value) {
    warnings.push('$ref JSON pointers are not checked by this script');
    return { errors, warnings };
  }

  const type = resolveType(name, tokens);
  if (!type) errors.push('no $type on the token or on any parent group');
  else if (SHALLOW_TYPES.includes(type)) warnings.push(`${type} values are not checked in depth by this script`);
  else if (!CHECKS[type]) errors.push(`unknown $type "${type}"`);
  else errors.push(...CHECKS[type](value));
  return { errors, warnings };
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node validate-tokens.mjs <file.tokens.json>');
  process.exit(2);
}

let tree;
try {
  tree = readTokenFile(file);
} catch (error) {
  console.error(`Cannot read ${file}: ${error.message}`);
  process.exit(2);
}

const { tokens, groups } = collectTokens(tree);
let errorCount = 0;
let warningCount = 0;
const report = (level, name, message) => console.log(`${level.padEnd(7)} ${name || '(root)'}: ${message}`);

for (const { path, node } of groups) {
  for (const message of checkName(path)) { report('ERROR', path.join('.'), message); errorCount++; }
  if ('$extends' in node) { report('WARNING', path.join('.'), '$extends is not checked by this script'); warningCount++; }
}
for (const [name, entry] of tokens) {
  const { errors, warnings } = checkToken(name, entry, tokens);
  for (const message of errors) { report('ERROR', name, message); errorCount++; }
  for (const message of warnings) { report('WARNING', name, message); warningCount++; }
}

console.log(`\n${tokens.size} token(s): ${errorCount} error(s), ${warningCount} warning(s).`);
process.exit(errorCount > 0 ? 1 : 0);
