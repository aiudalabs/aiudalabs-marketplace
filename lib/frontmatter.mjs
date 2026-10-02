// Minimal YAML-frontmatter reader/writer. Zero dependencies by design.
//
// Supports only the subset this repo allows in canonical components:
//   key: scalar            (plain, 'single' or "double" quoted)
//   key: [a, b]            (inline list of scalars)
//   key: > / |             (block scalar, indented continuation lines)
//   key:                   (followed by an indented `- item` list
//     - item                or an indented one-level `k: v` map)
//
// Anything else throws. Harnesses parse these files with real YAML parsers,
// so being strict here keeps canonical files portable.

export class FrontmatterError extends Error {}

const KEY_LINE = /^([A-Za-z][A-Za-z0-9_-]*):(?:\s+(.*))?$/;

export function parseFrontmatter(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') throw new FrontmatterError('file must start with a `---` frontmatter line');
  const end = lines.indexOf('---', 1);
  if (end === -1) throw new FrontmatterError('frontmatter is not closed with `---`');

  const data = parseBlock(lines.slice(1, end));
  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');
  return { data, body };
}

function parseBlock(lines) {
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isSkippable(line)) { i++; continue; }
    if (/^\s/.test(line)) throw new FrontmatterError(`unexpected indentation: "${line}"`);

    const match = KEY_LINE.exec(line);
    if (!match) throw new FrontmatterError(`cannot parse line: "${line}"`);
    const [, key, rawValue = ''] = match;
    if (key in data) throw new FrontmatterError(`duplicate key: "${key}"`);

    const nested = [];
    i++;
    while (i < lines.length && (lines[i].trim() === '' || /^\s/.test(lines[i]))) nested.push(lines[i++]);

    data[key] = parseValue(key, rawValue.trim(), nested);
  }
  return data;
}

function parseValue(key, value, nested) {
  const content = nested.filter((line) => !isSkippable(line));

  if (/^[>|][+-]?$/.test(value)) return parseBlockScalar(value[0], nested);
  if (value !== '') {
    if (content.length > 0) throw new FrontmatterError(`"${key}" has a value and indented lines; use a block scalar (>)`);
    return value.startsWith('[') ? parseInlineList(key, value) : parseScalar(key, value);
  }
  if (content.length === 0) return '';
  if (content[0].trim().startsWith('- ')) return parseList(key, content);
  return parseMap(key, content);
}

function parseBlockScalar(style, nested) {
  const kept = nested.map((line) => line.trim());
  while (kept.length > 0 && kept[kept.length - 1] === '') kept.pop();
  if (style === '|') return kept.join('\n');
  return kept.join(' ').replace(/\s+/g, ' ').trim();
}

function parseInlineList(key, value) {
  if (!value.endsWith(']')) throw new FrontmatterError(`"${key}": inline list is not closed`);
  const inner = value.slice(1, -1).trim();
  if (inner === '') return [];
  return inner.split(',').map((item) => parseScalar(key, item.trim()));
}

function parseList(key, content) {
  return content.map((line) => {
    const item = line.trim();
    if (!item.startsWith('- ')) throw new FrontmatterError(`"${key}": expected a "- item" line, got "${item}"`);
    return parseScalar(key, item.slice(2).trim());
  });
}

function parseMap(key, content) {
  const map = {};
  for (const line of content) {
    const match = KEY_LINE.exec(line.trim());
    if (!match) throw new FrontmatterError(`"${key}": cannot parse nested line "${line.trim()}"`);
    const value = (match[2] ?? '').trim();
    if (value === '') throw new FrontmatterError(`"${key}.${match[1]}": nested maps deeper than one level are not supported`);
    map[match[1]] = parseScalar(`${key}.${match[1]}`, value);
  }
  return map;
}

function parseScalar(key, value) {
  if (value.startsWith('"')) return parseDoubleQuoted(key, value);
  if (value.startsWith("'")) {
    if (value.length < 2 || !value.endsWith("'")) throw new FrontmatterError(`"${key}": unterminated single-quoted string`);
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (/: | #/.test(value) || value.endsWith(':')) {
    throw new FrontmatterError(`"${key}": plain value contains ": " or " #"; wrap it in double quotes`);
  }
  if (/^[&*!%@`{]/.test(value)) throw new FrontmatterError(`"${key}": value starts with a reserved YAML character; quote it`);
  return value;
}

function parseDoubleQuoted(key, value) {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') return parsed;
  } catch {
    // fall through to the error below
  }
  throw new FrontmatterError(`"${key}": invalid double-quoted string`);
}

function isSkippable(line) {
  const trimmed = line.trim();
  return trimmed === '' || trimmed.startsWith('#');
}

// Emits frontmatter that any YAML parser reads back identically: every string
// is written as a JSON string, which is a valid YAML double-quoted scalar.
export function stringifyFrontmatter(data, body) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    lines.push(...stringifyEntry(key, value));
  }
  lines.push('---', '', body.trimEnd(), '');
  return lines.join('\n');
}

function stringifyEntry(key, value) {
  if (Array.isArray(value)) return [`${key}: [${value.map((item) => JSON.stringify(String(item))).join(', ')}]`];
  if (typeof value === 'object') {
    return [`${key}:`, ...Object.entries(value).map(([k, v]) => `  ${k}: ${JSON.stringify(String(v))}`)];
  }
  if (typeof value === 'boolean' || typeof value === 'number') return [`${key}: ${value}`];
  return [`${key}: ${JSON.stringify(value)}`];
}
