// Terminal formatting for the CLI: colors, a banner, wrapped text and the
// catalog listing. No dependencies. Colors are off when output is not a
// terminal, when NO_COLOR is set or with --plain; FORCE_COLOR turns them on.

const ESC = '\u001b[';
const ANSI = /\u001b\[[0-9;]*m/g;

export const stripAnsi = (text) => text.replace(ANSI, '');
export const visibleLength = (text) => [...stripAnsi(text)].length;

export function colorEnabled({ plain = false, stream = process.stdout, env = process.env } = {}) {
  if (plain || 'NO_COLOR' in env) return false;
  if (env.FORCE_COLOR && env.FORCE_COLOR !== '0') return true;
  return Boolean(stream.isTTY);
}

// One palette, by component type, so a kind keeps its color everywhere.
const PALETTE = {
  agent: 213, skill: 45, workflow: 215, external: 141, stack: 120,
  dim: 245, accent: 215, ok: 120, warn: 221,
};

export function makePainter(enabled) {
  const wrap = (open, close = 0) => (text) => (enabled ? `${ESC}${open}m${text}${ESC}${close}m` : String(text));
  const fg = (code) => wrap(`38;5;${code}`, 39);
  return {
    enabled,
    bold: wrap(1, 22),
    dim: fg(PALETTE.dim),
    italic: wrap(3, 23),
    type: (type) => fg(PALETTE[type] ?? PALETTE.dim),
    accent: fg(PALETTE.accent),
    ok: fg(PALETTE.ok),
    warn: fg(PALETTE.warn),
    fg,
  };
}

// Word wrap that keeps ANSI codes out of the width count.
export function wrapText(text, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (line && visibleLength(line) + 1 + visibleLength(word) > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The first sentence, or the first `maxLines` wrapped lines with an ellipsis.
export function summarize(text, width, maxLines = 2) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  const firstSentence = clean.match(/^.+?[.!?](\s|$)/)?.[0].trim() ?? clean;
  const lines = wrapText(firstSentence, width);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s.,;:]*$/, '')}…`;
  return kept;
}

const padEnd = (text, width) => text + ' '.repeat(Math.max(0, width - visibleLength(text)));

// Block letters for the banner, five rows high. The website draws the same logo.
export const LETTERS = {
  a: [' ███ ', '█   █', '█████', '█   █', '█   █'],
  i: ['███', ' █ ', ' █ ', ' █ ', '███'],
  u: ['█   █', '█   █', '█   █', '█   █', ' ███ '],
  d: ['████ ', '█   █', '█   █', '█   █', '████ '],
  l: ['█    ', '█    ', '█    ', '█    ', '█████'],
  b: ['████ ', '█   █', '████ ', '█   █', '████ '],
  s: [' ████', '█    ', ' ███ ', '    █', '████ '],
};
export const GRADIENT = [214, 215, 216, 217, 218, 219, 183, 147, 111];

export function blockWord(word, paint) {
  const rows = ['', '', '', '', ''];
  [...word].forEach((char, index) => {
    const glyph = LETTERS[char];
    const color = paint.fg(GRADIENT[index % GRADIENT.length]);
    glyph.forEach((row, line) => { rows[line] += `${color(row)} `; });
  });
  return rows.map((row) => row.trimEnd());
}

export function banner({ name, version, description, counts }, paint, width) {
  const logo = width >= 56 ? blockWord('aiudalabs', paint) : [paint.bold(paint.accent('aiudalabs'))];
  const label = (word, count) => (count === 1 ? word.replace(/s$/, '') : word);
  const stats = counts.map(([word, count, type]) => `${paint.bold(paint.type(type)(count))} ${paint.dim(label(word, count))}`).join(paint.dim('  ·  '));
  return [
    '',
    ...logo.map((row) => `  ${row}`),
    '',
    `  ${paint.bold('marketplace')}  ${paint.dim(`v${version}`)}  ${paint.dim('·')}  ${paint.dim(name)}`,
    ...wrapText(description, width - 4).map((line) => `  ${paint.italic(line)}`),
    '',
    `  ${stats}`,
    '',
  ];
}

export function sectionHeader(title, count, type, paint, width) {
  const label = ` ${title.toUpperCase()} ${paint.dim(`(${count})`)} `;
  const rule = '─'.repeat(Math.max(4, width - visibleLength(label) - 4));
  return ['', `${paint.type(type)('──')}${paint.bold(paint.type(type)(label))}${paint.type(type)(rule)}`];
}

// One component: a bullet, its name, details on the right, and a short description.
export function itemLines({ type, name, details, description }, paint, width, full = false) {
  const right = details.filter(Boolean).join(paint.dim(' · '));
  const left = `  ${paint.type(type)('●')} ${paint.bold(name)}`;
  const gap = Math.max(2, width - visibleLength(left) - visibleLength(right));
  const head = gap + visibleLength(left) + visibleLength(right) <= width + 2 ? `${left}${' '.repeat(gap)}${right}` : `${left}  ${right}`;
  const textWidth = width - 6;
  const body = full ? wrapText(String(description ?? '').replace(/\s+/g, ' '), textWidth) : summarize(description, textWidth);
  return [head, ...body.map((line) => `      ${paint.dim(line)}`)];
}

// A simple table with a header row, for stacks.
export function table(columns, rows, paint, width) {
  const widths = columns.map((column, index) => Math.max(visibleLength(column.title), ...rows.map((row) => visibleLength(row[index]))));
  const last = columns.length - 1;
  const fixed = widths.slice(0, last).reduce((sum, value) => sum + value + 3, 2);
  widths[last] = Math.max(16, width - fixed);
  const line = (cells) => `  ${cells.map((cell, index) => (index === last ? cell : padEnd(cell, widths[index]))).join(paint.dim(' │ '))}`;
  const out = [line(columns.map((column) => paint.bold(column.title))), `  ${widths.map((value) => paint.dim('─'.repeat(value))).join(paint.dim('─┼─'))}`];
  for (const row of rows) {
    const wrapped = summarize(stripAnsi(row[last]), widths[last], 2);
    out.push(line([...row.slice(0, last), paint.dim(wrapped[0] ?? '')]));
    for (const extra of wrapped.slice(1)) out.push(line([...row.slice(0, last).map(() => ''), paint.dim(extra)]));
  }
  return out;
}
