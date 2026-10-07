// spec-guard core: reads the spec documents of a project and checks them.
// Pure functions over text, plus readProject(), which reads the files.
// No dependencies: Node.js 18 or later. Formats: ../references/formats.md

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const DOCS = {
  decisions: 'docs/OPINIONATED_DEFAULTS.md',
  requirements: 'docs/PRD.md',
  roster: 'docs/AGENT_ROSTER.md',
  legacyRoster: 'docs/AGENTS.md',
  issues: 'docs/ISSUES.md',
  waves: 'docs/WAVE_DAG.md',
};

const PROFILE_ALIASES = { 'aiuda-flutter-firebase': 'flutter-firebase', 'python-fastapi-react': 'fastapi-react' };
const REQUIRED_KEYS = ['id', 'sprint', 'owner', 'files_touched', 'depends_on', 'decision_refs', 'requirement_refs'];
const LIST_KEYS = ['files_touched', 'depends_on', 'decision_refs', 'requirement_refs', 'reads'];
export const MAX_WAVE_SIZE = 7;

const DASH = '\\s*[—–:-]\\s*';
const ISSUE_ID = /^S(\d+)-(\d+)$/;
export const ISSUE_ID_IN_TEXT = /\bS\d+-\d+\b/;

// ---------------------------------------------------------------- ids

export function compareIds(a, b) {
  const [, sa, na] = ISSUE_ID.exec(a) ?? [, Infinity, Infinity];
  const [, sb, nb] = ISSUE_ID.exec(b) ?? [, Infinity, Infinity];
  return Number(sa) - Number(sb) || Number(na) - Number(nb) || a.localeCompare(b);
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// ---------------------------------------------------------------- decisions and requirements

// `## D-03 — Title` or the older `## Decision 3: Title`.
export function parseDecisions(text) {
  const decisions = new Map();
  const problems = [];
  const pattern = new RegExp(`^#{1,6}\\s+(?:D-(\\d+)|Decision\\s+(\\d+))${DASH}(.+)$`, 'gim');
  for (const match of text.matchAll(pattern)) {
    const id = `D-${String(match[1] ?? match[2]).padStart(2, '0')}`;
    const title = match[3].trim();
    if (decisions.has(id)) problems.push(error('duplicate-decision', `${DOCS.decisions}:${lineOf(text, match.index)}`, `${id} is defined twice`));
    decisions.set(id, { id, title, deferred: /\(deferred\)/i.test(title), existing: /\(existing\)/i.test(title) });
  }
  const profile = /\*\*Stack profile:\*\*\s*`?([a-z0-9-]+)`?/i.exec(text)?.[1]?.toLowerCase();
  return { decisions, profile: profile ? (PROFILE_ALIASES[profile] ?? profile) : null, problems };
}

// `### FR-ORDER-1 — Title` (or `FR-12`).
export function parseRequirements(text) {
  const requirements = new Map();
  const problems = [];
  const pattern = new RegExp(`^#{1,6}\\s+(FR-[A-Z0-9]+(?:-\\d+)?)${DASH}(.+)$`, 'gm');
  for (const match of text.matchAll(pattern)) {
    const [, id, title] = match;
    if (requirements.has(id)) problems.push(error('duplicate-requirement', `${DOCS.requirements}:${lineOf(text, match.index)}`, `${id} is defined twice`));
    requirements.set(id, { id, title: title.trim(), deferred: /\(deferred\)/i.test(title), existing: /\(existing\)/i.test(title) });
  }
  return { requirements, problems };
}

// ---------------------------------------------------------------- roster

// `## agent-name` sections with an `**Owns:**` line of backticked globs, or `none`.
export function parseRoster(text, file = DOCS.roster) {
  const agents = new Map();
  const problems = [];
  const lines = text.split('\n');
  let current = null;
  lines.forEach((line, index) => {
    const heading = /^##\s+`?([a-z0-9]+(?:-[a-z0-9]+)*)`?(?:\s+[—–-]\s+.*|\s*\(.*\))?\s*$/.exec(line);
    if (heading) {
      current = { name: heading[1], owns: null, reviewOnly: false, line: index + 1 };
      agents.set(current.name, current);
      return;
    }
    if (/^#{1,2}\s/.test(line)) current = null;
    const owns = /^\s*[-*]?\s*\*\*Owns:?\*\*:?\s*(.*)$/i.exec(line);
    if (!current || !owns) return;
    if (/^none\b/i.test(owns[1].trim())) {
      current.owns = [];
      current.reviewOnly = true;
      return;
    }
    current.owns = [...owns[1].matchAll(/`([^`]+)`/g)].map((match) => normalizePath(match[1]));
  });
  for (const agent of agents.values()) {
    if (agent.owns === null) problems.push(error('roster-no-lane', `${file}:${agent.line}`, `agent ${agent.name} has no **Owns:** line (write \`**Owns:** none\` for a review-only agent)`));
  }
  return { agents, problems };
}

// ---------------------------------------------------------------- issues

function parseScalar(raw) {
  const value = raw.trim();
  if (/^".*"$|^'.*'$/.test(value)) return value.slice(1, -1);
  if (value === 'true' || value === 'false') return value === 'true';
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

const stripComment = (line) => line.replace(/(^|\s)#.*$/, '').trimEnd();

// The small YAML subset described in formats.md.
export function parseFrontmatter(lines) {
  const data = {};
  const problems = [];
  let listKey = null;
  for (const raw of lines) {
    const line = stripComment(raw);
    if (line.trim() === '') continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) {
      data[listKey].push(parseScalar(item[1]));
      continue;
    }
    const pair = /^([a-z_][a-z0-9_]*):\s*(.*)$/i.exec(line);
    if (!pair) {
      problems.push(`cannot read frontmatter line "${raw.trim()}"`);
      continue;
    }
    const [, key, value] = pair;
    listKey = null;
    if (value === '') {
      data[key] = [];
      listKey = key;
    } else if (/^\[.*\]$/.test(value)) {
      const inner = value.slice(1, -1).trim();
      data[key] = inner === '' ? [] : inner.split(',').map((part) => parseScalar(part));
    } else {
      data[key] = parseScalar(value);
    }
  }
  return { data, problems };
}

export function parseIssues(text) {
  const issues = [];
  const problems = [];
  const lines = text.split('\n');
  let sprint = null;
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const sprintHeading = /^#\s+Sprint\s+(\d+)(?:\s*[—–:-]\s*(.*))?$/i.exec(line);
    if (sprintHeading) {
      sprint = { number: Number(sprintHeading[1]), theme: (sprintHeading[2] ?? '').trim() };
      index++;
      continue;
    }
    const heading = new RegExp(`^##\\s+(S\\d+-\\d+)${DASH}(.+)$`).exec(line);
    if (!heading) {
      index++;
      continue;
    }
    const issue = { id: heading[1], title: heading[2].trim(), line: index + 1, sprintHeading: sprint, data: {}, frontmatterRange: null };
    const where = `${DOCS.issues}:${index + 1}`;
    index++;
    while (index < lines.length && lines[index].trim() === '') index++;
    if (lines[index]?.trim() !== '---') {
      problems.push(error('no-frontmatter', where, `${issue.id} has no frontmatter block (--- ... ---) after its heading`));
    } else {
      const start = index + 1;
      let end = start;
      while (end < lines.length && lines[end].trim() !== '---' && !/^##?\s/.test(lines[end])) end++;
      if (lines[end]?.trim() !== '---') {
        problems.push(error('no-frontmatter', where, `${issue.id} frontmatter is not closed with ---`));
        index = end;
      } else {
        const { data, problems: yamlProblems } = parseFrontmatter(lines.slice(start, end));
        issue.data = data;
        issue.frontmatterRange = [start, end];
        for (const problem of yamlProblems) problems.push(error('frontmatter', where, `${issue.id}: ${problem}`));
        index = end + 1;
      }
    }
    const bodyStart = index;
    while (index < lines.length && !/^#{1,2}\s/.test(lines[index])) index++;
    issue.body = lines.slice(bodyStart, index).join('\n');
    issues.push(issue);
  }
  for (const issue of issues) {
    for (const key of LIST_KEYS) {
      if (key in issue.data && !Array.isArray(issue.data[key])) issue.data[key] = [issue.data[key]];
      if (Array.isArray(issue.data[key])) issue.data[key] = issue.data[key].map((value) => String(value));
    }
    issue.files = (issue.data.files_touched ?? []).map(normalizePath);
    issue.deps = issue.data.depends_on ?? [];
    issue.sprint = typeof issue.data.sprint === 'number' ? issue.data.sprint : Number(ISSUE_ID.exec(issue.id)?.[1]);
    issue.criteria = countCriteria(issue.body);
    issue.hasGoal = /^\*\*(Objetivo|Goal):?\*\*:?\s*\S/im.test(issue.body);
  }
  return { issues, problems };
}

function countCriteria(body) {
  const lines = body.split('\n');
  const start = lines.findIndex((line) => /^#{3,6}\s+(acceptance criteria|criterios de aceptaci[oó]n)/i.test(line));
  if (start === -1) return 0;
  let count = 0;
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) break;
    if (/^\s*(\d+[.)]|[-*])\s+\S/.test(line)) count++;
  }
  return count;
}

// ---------------------------------------------------------------- globs

export const normalizePath = (path) => String(path).trim().replace(/^\.\//, '').replace(/#.*$/, '');

const segmentsOf = (glob) => {
  const path = normalizePath(glob);
  const parts = path.split('/').filter((part) => part !== '');
  if (path.endsWith('/')) parts.push('**');
  return parts;
};

const hasWildcard = (segment) => /[*?]/.test(segment);
const segmentRegex = (segment) => new RegExp(`^${segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`);

export function globToRegex(glob) {
  const parts = segmentsOf(glob);
  const source = parts.map((segment, index) => {
    const last = index === parts.length - 1;
    if (segment === '**') return last ? '.+' : '(?:[^/]+/)*';
    return segmentRegex(segment).source.slice(1, -1) + (last ? '' : '/');
  }).join('');
  return new RegExp(`^${source}$`);
}

export const matches = (glob, path) => globToRegex(glob).test(normalizePath(path));

function segmentsOverlap(a, b) {
  if (!hasWildcard(a) && !hasWildcard(b)) return a === b;
  if (!hasWildcard(a)) return segmentRegex(b).test(a);
  if (!hasWildcard(b)) return segmentRegex(a).test(b);
  const prefix = (segment) => segment.split(/[*?]/)[0];
  const suffix = (segment) => segment.split(/[*?]/).at(-1);
  const [pa, pb, sa, sb] = [prefix(a), prefix(b), suffix(a), suffix(b)];
  return (pa.startsWith(pb) || pb.startsWith(pa)) && (sa.endsWith(sb) || sb.endsWith(sa));
}

function overlapSegments(a, b) {
  if (a.length === 0 && b.length === 0) return true;
  if (a[0] === '**') return overlapSegments(a.slice(1), b) || (b.length > 0 && overlapSegments(a, b.slice(1)));
  if (b[0] === '**') return overlapSegments(a, b.slice(1)) || (a.length > 0 && overlapSegments(a.slice(1), b));
  if (a.length === 0 || b.length === 0) return false;
  return segmentsOverlap(a[0], b[0]) && overlapSegments(a.slice(1), b.slice(1));
}

// True when some path could match both globs. Errs on the side of "yes".
export const globsOverlap = (a, b) => overlapSegments(segmentsOf(a), segmentsOf(b));

function coversSegments(outer, inner) {
  if (outer.length === 0 && inner.length === 0) return true;
  if (outer[0] === '**') return coversSegments(outer.slice(1), inner) || (inner.length > 0 && coversSegments(outer, inner.slice(1)));
  if (inner[0] === '**' || outer.length === 0 || inner.length === 0) return false;
  const [o, i] = [outer[0], inner[0]];
  const ok = !hasWildcard(o) ? o === i : !hasWildcard(i) ? segmentRegex(o).test(i) : o === '*' || o === i;
  return ok && coversSegments(outer.slice(1), inner.slice(1));
}

// True when every path matching `inner` also matches `outer`. Errs on the side of "no".
export const globCovers = (outer, inner) => coversSegments(segmentsOf(outer), segmentsOf(inner));

export const inLane = (owns, glob) => owns.some((lane) => globCovers(lane, glob));
export const pathInGlobs = (globs, path) => globs.some((glob) => matches(glob, path));

// ---------------------------------------------------------------- waves

function filesOverlap(a, b) {
  return a.files.some((fa) => b.files.some((fb) => globsOverlap(fa, fb)));
}

// Waves inside each sprint, as described in formats.md. Returns { waves: Map id -> wave, stuck: [ids] }.
export function assignWaves(issues) {
  const waves = new Map();
  const stuck = [];
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const sprints = [...new Set(issues.map((issue) => issue.sprint))].sort((a, b) => a - b);
  for (const sprint of sprints) {
    let remaining = issues.filter((issue) => issue.sprint === sprint).sort((a, b) => compareIds(a.id, b.id));
    let wave = 1;
    while (remaining.length > 0) {
      const ready = remaining.filter((issue) => issue.deps.every((dep) => {
        const other = byId.get(dep);
        if (!other || other.sprint !== sprint) return true;
        return waves.has(dep) && waves.get(dep) < wave;
      }));
      const chosen = [];
      for (const issue of ready) if (!chosen.some((other) => filesOverlap(issue, other))) chosen.push(issue);
      if (chosen.length === 0) {
        stuck.push(...remaining.map((issue) => issue.id));
        break;
      }
      for (const issue of chosen) waves.set(issue.id, wave);
      remaining = remaining.filter((issue) => !chosen.includes(issue));
      wave++;
    }
  }
  return { waves, stuck };
}

function findCycle(issues) {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const state = new Map();
  const stack = [];
  const visit = (id) => {
    if (state.get(id) === 'done') return null;
    if (state.get(id) === 'open') return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 'open');
    stack.push(id);
    for (const dep of byId.get(id)?.deps ?? []) {
      if (!byId.has(dep)) continue;
      const cycle = visit(dep);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, 'done');
    return null;
  };
  for (const issue of issues) {
    const cycle = visit(issue.id);
    if (cycle) return cycle;
  }
  return null;
}

// ---------------------------------------------------------------- check

const error = (code, where, message) => ({ level: 'error', code, where, message });
const warning = (code, where, message) => ({ level: 'warning', code, where, message });

export function checkProject(project, { strict = false } = {}) {
  const { decisions, requirements, roster, issues } = project;
  const found = [...project.problems];
  const at = (issue) => `${DOCS.issues}:${issue.line}`;
  const gap = strict ? error : warning;

  if (!issues) return [...found, error('no-issues', DOCS.issues, 'no backlog found; multi-agent-governance writes it')];
  if (!roster) found.push(warning('no-roster', DOCS.roster, 'no agent roster found, so owners and lanes are not checked'));
  if (!decisions) found.push(warning('no-decisions', DOCS.decisions, 'no decisions document found, so decision_refs are not checked'));
  if (!requirements) found.push(warning('no-requirements', DOCS.requirements, 'no PRD found, so requirement_refs are not checked'));
  if (decisions && !project.profile) found.push(warning('no-profile', DOCS.decisions, 'no `**Stack profile:**` line; the stack is not locked'));

  if (roster) {
    const lanes = [...roster.agents.values()].filter((agent) => agent.owns?.length);
    for (const [i, a] of lanes.entries()) {
      for (const b of lanes.slice(i + 1)) {
        const shared = a.owns.flatMap((ga) => b.owns.filter((gb) => globsOverlap(ga, gb)).map((gb) => `${ga} / ${gb}`));
        if (shared.length) found.push(error('lanes-overlap', project.rosterFile, `${a.name} and ${b.name} both own ${shared.join(', ')}`));
      }
    }
  }

  const ids = new Map();
  for (const issue of issues) {
    if (ids.has(issue.id)) found.push(error('duplicate-issue', at(issue), `${issue.id} is defined twice (also line ${ids.get(issue.id).line})`));
    else ids.set(issue.id, issue);
  }

  const { waves, stuck } = assignWaves(issues);
  const cycle = findCycle(issues);
  if (cycle) found.push(error('dependency-cycle', DOCS.issues, `dependency cycle: ${cycle.join(' -> ')}`));
  else if (stuck.length) found.push(error('waves-stuck', DOCS.issues, `cannot assign waves to ${stuck.join(', ')}`));

  for (const issue of issues) {
    const where = at(issue);
    const { data } = issue;
    if (!issue.frontmatterRange) continue;
    for (const key of REQUIRED_KEYS) if (!(key in data)) found.push(error('missing-field', where, `${issue.id} has no \`${key}\` (an empty list is fine, a missing key is not)`));
    if ('id' in data && data.id !== issue.id) found.push(error('id-mismatch', where, `heading says ${issue.id} but id is ${data.id}`));
    const idSprint = Number(ISSUE_ID.exec(issue.id)?.[1]);
    if ('sprint' in data && data.sprint !== idSprint) found.push(error('sprint-mismatch', where, `${issue.id} has sprint ${data.sprint}; its id says ${idSprint}`));
    if (issue.sprintHeading && issue.sprintHeading.number !== idSprint) found.push(error('sprint-heading', where, `${issue.id} sits under "Sprint ${issue.sprintHeading.number}"`));

    const owner = roster?.agents.get(data.owner);
    if (roster && data.owner && !owner) found.push(error('unknown-owner', where, `${issue.id} owner "${data.owner}" is not in the roster (${[...roster.agents.keys()].join(', ')})`));
    if (owner?.reviewOnly) found.push(error('review-only-owner', where, `${issue.id} is owned by ${owner.name}, a review-only agent`));

    if ('files_touched' in data && issue.files.length === 0) found.push(error('no-files', where, `${issue.id} touches no files; list every path it writes`));
    if (owner?.owns?.length) {
      for (const file of issue.files) if (!inLane(owner.owns, file)) found.push(error('outside-lane', where, `${issue.id}: ${file} is outside ${owner.name}'s lane (${owner.owns.join(', ')})`));
    }

    for (const dep of issue.deps) {
      const other = ids.get(dep);
      if (dep === issue.id) found.push(error('self-dependency', where, `${issue.id} depends on itself`));
      else if (!other) found.push(error('unknown-dependency', where, `${issue.id} depends on ${dep}, which does not exist`));
      else if (other.sprint > issue.sprint) found.push(error('later-dependency', where, `${issue.id} (sprint ${issue.sprint}) depends on ${dep} from a later sprint`));
    }

    if (decisions) for (const ref of data.decision_refs ?? []) if (!decisions.has(ref)) found.push(error('unknown-decision', where, `${issue.id} cites ${ref}, which is not in ${DOCS.decisions}`));
    if (requirements) for (const ref of data.requirement_refs ?? []) if (!requirements.has(ref)) found.push(error('unknown-requirement', where, `${issue.id} cites ${ref}, which is not in ${DOCS.requirements}`));

    if ('commit_strategy' in data && !['atomic', 'squash'].includes(data.commit_strategy)) found.push(error('commit-strategy', where, `${issue.id} commit_strategy must be atomic or squash`));
    if ('autonomous' in data && typeof data.autonomous !== 'boolean') found.push(error('autonomous', where, `${issue.id} autonomous must be true or false`));
    if (issue.criteria === 0) found.push(error('no-criteria', where, `${issue.id} has no numbered list under "### Acceptance criteria"`));
    if (!issue.hasGoal) found.push(warning('no-goal', where, `${issue.id} has no **Objetivo:** line for people reading the board`));

    const computed = waves.get(issue.id);
    if (!('wave' in data)) found.push(error('no-wave', where, `${issue.id} has no wave; run \`spec.mjs waves --write\``));
    else if (computed !== undefined && data.wave !== computed) found.push(error('wave-mismatch', where, `${issue.id} is in wave ${data.wave} but its dependencies and files put it in wave ${computed}; run \`spec.mjs waves --write\``));
  }

  const counts = new Map();
  for (const issue of issues) {
    const key = `${issue.sprint}/${waves.get(issue.id)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of counts) {
    const [sprint, wave] = key.split('/');
    if (count > MAX_WAVE_SIZE) found.push(warning('large-wave', DOCS.issues, `sprint ${sprint} wave ${wave} has ${count} issues; more than ${MAX_WAVE_SIZE} run in parallel is hard to supervise`));
  }

  const cited = (key) => new Set(issues.flatMap((issue) => issue.data[key] ?? []));
  if (decisions) {
    const used = cited('decision_refs');
    for (const decision of decisions.values()) {
      if (!decision.deferred && !decision.existing && !used.has(decision.id)) found.push(gap('uncovered-decision', DOCS.decisions, `${decision.id} (${decision.title}) is implemented by no issue: scope dropped silently, or mark it (deferred) or, if the code already does it, (existing)`));
    }
  }
  if (requirements) {
    const used = cited('requirement_refs');
    for (const requirement of requirements.values()) {
      if (!requirement.deferred && !requirement.existing && !used.has(requirement.id)) found.push(gap('uncovered-requirement', DOCS.requirements, `${requirement.id} (${requirement.title}) is implemented by no issue, or mark it (deferred) or (existing)`));
    }
  }
  return found;
}

// ---------------------------------------------------------------- waves --write

// Sets `wave:` in every issue's frontmatter. Returns the new ISSUES.md text.
export function writeWavesInto(text, waves) {
  const lines = text.split('\n');
  const { issues } = parseIssues(text);
  for (const issue of [...issues].reverse()) {
    if (!issue.frontmatterRange || !waves.has(issue.id)) continue;
    const [start, end] = issue.frontmatterRange;
    const value = `wave: ${waves.get(issue.id)}`;
    const existing = lines.slice(start, end).findIndex((line) => /^wave:/.test(line));
    if (existing !== -1) {
      lines[start + existing] = value;
      continue;
    }
    const sprintLine = lines.slice(start, end).findIndex((line) => /^sprint:/.test(line));
    lines.splice(sprintLine === -1 ? end : start + sprintLine + 1, 0, value);
  }
  return lines.join('\n');
}

export function renderWaveDag(issues, waves) {
  const out = ['# Wave DAG', '', '_Written by `spec.mjs waves --write` from docs/ISSUES.md. Do not edit by hand._', ''];
  const sprints = [...new Set(issues.map((issue) => issue.sprint))].sort((a, b) => a - b);
  for (const sprint of sprints) {
    const theme = issues.find((issue) => issue.sprint === sprint)?.sprintHeading?.theme;
    out.push(`## Sprint ${sprint}${theme ? ` — ${theme}` : ''}`, '');
    const inSprint = issues.filter((issue) => issue.sprint === sprint);
    const count = Math.max(0, ...inSprint.map((issue) => waves.get(issue.id) ?? 0));
    for (let wave = 1; wave <= count; wave++) {
      const members = inSprint.filter((issue) => waves.get(issue.id) === wave).sort((a, b) => compareIds(a.id, b.id));
      out.push(`### Wave ${wave}`, '', '| Issue | Owner | Depends on | Files |', '| --- | --- | --- | --- |');
      for (const issue of members) out.push(`| ${issue.id} ${issue.title.replace(/\|/g, '\\|')} | ${issue.data.owner ?? '?'} | ${issue.deps.join(', ') || '-'} | ${issue.files.map((file) => `\`${file}\``).join(', ')} |`);
      out.push('');
    }
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- reading a project

const read = (root, path) => (existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : null);

export function readProject(root) {
  const problems = [];
  const decisionsText = read(root, DOCS.decisions);
  const requirementsText = read(root, DOCS.requirements);
  const rosterFile = existsSync(join(root, DOCS.roster)) ? DOCS.roster : existsSync(join(root, DOCS.legacyRoster)) ? DOCS.legacyRoster : null;
  const issuesText = read(root, DOCS.issues);

  const decisions = decisionsText ? parseDecisions(decisionsText) : null;
  const requirements = requirementsText ? parseRequirements(requirementsText) : null;
  const roster = rosterFile ? parseRoster(read(root, rosterFile), rosterFile) : null;
  const issues = issuesText && issuesText.trim() ? parseIssues(issuesText) : null;
  for (const part of [decisions, requirements, roster, issues]) if (part) problems.push(...part.problems);
  if (roster && roster.agents.size === 0) problems.push(warning('empty-roster', rosterFile, 'no `## agent-name` sections found'));

  return {
    root,
    problems,
    issuesText,
    rosterFile,
    profile: decisions?.profile ?? null,
    decisions: decisions && decisions.decisions.size ? decisions.decisions : null,
    requirements: requirements && requirements.requirements.size ? requirements.requirements : null,
    roster,
    issues: issues?.issues ?? null,
  };
}

// ---------------------------------------------------------------- phases

const exists = (root, path) => existsSync(join(root, path));
const isWritten = (root, path) => {
  const text = read(root, path);
  if (!text) return false;
  const content = text.split('\n').filter((line) => line.trim() && !/^#|^_.*_$/.test(line.trim()));
  return content.length >= 3;
};
const anyFile = (root, dir, pattern) => exists(root, dir) && readdirSync(join(root, dir)).some((name) => pattern.test(name) && isWritten(root, join(dir, name)));

export const PHASES = [
  { phase: 1, skill: 'product-discovery', done: (root) => isWritten(root, 'docs/PRODUCT_BRIEF.md') && isWritten(root, DOCS.decisions) },
  { phase: 2, skill: 'product-requirements', done: (root) => isWritten(root, DOCS.requirements) },
  { phase: 3, skill: 'schema-design', done: (root) => anyFile(root, 'docs', /SCHEMA\.md$/) },
  { phase: 4, skill: 'ui-screens-spec', done: (root) => isWritten(root, 'docs/UI_SCREENS.md') },
  { phase: 5, skill: 'system-architecture', done: (root) => isWritten(root, 'docs/ARCHITECTURE.md') },
  { phase: 6, skill: 'multi-agent-governance', done: (root) => isWritten(root, DOCS.issues) && (isWritten(root, DOCS.roster) || isWritten(root, DOCS.legacyRoster)) },
  { phase: 7, skill: 'navegable-mockups', done: (root) => exists(root, 'mockups') && readdirSync(join(root, 'mockups')).some((name) => name.endsWith('.html')) },
];

// ---------------------------------------------------------------- progress

// Issue ids whose commits are on the base branch: a commit subject starting with the id.
export function mergedIds(subjects) {
  const merged = new Set();
  for (const subject of subjects) {
    const id = /^(S\d+-\d+)\b/.exec(subject.trim())?.[1];
    if (id) merged.add(id);
  }
  return merged;
}

// The next wave to run: the first sprint with open issues, and its lowest wave
// whose issues all have their dependencies merged.
export function nextWave(issues, waves, merged) {
  const open = issues.filter((issue) => !merged.has(issue.id));
  if (open.length === 0) return null;
  const sprint = Math.min(...open.map((issue) => issue.sprint));
  const inSprint = open.filter((issue) => issue.sprint === sprint);
  const wave = Math.min(...inSprint.map((issue) => waves.get(issue.id) ?? Infinity));
  const members = inSprint.filter((issue) => waves.get(issue.id) === wave).sort((a, b) => compareIds(a.id, b.id));
  const blocked = members.filter((issue) => issue.deps.some((dep) => !merged.has(dep)));
  return { sprint, wave, ready: members.filter((issue) => !blocked.includes(issue)), blocked };
}

// ---------------------------------------------------------------- traceability

export const referencesOf = (issue) => [...(issue.data.decision_refs ?? []), ...(issue.data.requirement_refs ?? [])];

export function issuesFor(issues, id) {
  if (ISSUE_ID.test(id)) return issues.filter((issue) => issue.id === id);
  return issues.filter((issue) => referencesOf(issue).includes(id));
}

export const issuesTouching = (issues, path) => issues.filter((issue) => pathInGlobs(issue.files, path));

// Changed paths checked against an issue and its owner's lane.
export function verifyChanges(issue, owner, paths) {
  const outsideIssue = paths.filter((path) => !pathInGlobs(issue.files, path));
  const outsideLane = owner?.owns?.length ? paths.filter((path) => !pathInGlobs(owner.owns, path)) : [];
  return { outsideIssue, outsideLane };
}

// ---------------------------------------------------------------- exports

const criteriaText = (issue) => {
  const lines = issue.body.split('\n');
  const start = lines.findIndex((line) => /^#{3,6}\s+(acceptance criteria|criterios de aceptaci[oó]n)/i.test(line));
  return start === -1 ? '' : lines.slice(start + 1).join('\n').trim();
};

export function issueMarkdown(issue) {
  const goal = /^\*\*(?:Objetivo|Goal):?\*\*:?\s*(.*)$/im.exec(issue.body)?.[1] ?? '';
  return [
    goal && `**Objetivo:** ${goal}`,
    '',
    `- Owner: ${issue.data.owner ?? '?'}`,
    `- Sprint ${issue.sprint}, wave ${issue.data.wave ?? '?'}`,
    `- Depends on: ${issue.deps.join(', ') || 'nothing'}`,
    `- Decisions: ${(issue.data.decision_refs ?? []).join(', ') || '-'}; requirements: ${(issue.data.requirement_refs ?? []).join(', ') || '-'}`,
    `- Files: ${issue.files.map((file) => `\`${file}\``).join(', ')}`,
    '',
    '### Acceptance criteria',
    '',
    criteriaText(issue),
  ].filter((line) => line !== false).join('\n');
}

const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

export function toCsv(issues) {
  const rows = [['Summary', 'Description', 'Issue Type', 'Sprint', 'Labels', 'Depends On']];
  for (const issue of issues) {
    rows.push([`${issue.id} ${issue.title}`, issueMarkdown(issue), 'Story', `Sprint ${issue.sprint}`, `sprint-${issue.sprint} agent-${issue.data.owner ?? 'unassigned'}`, issue.deps.join(' ')]);
  }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;

// A reviewable shell script of `gh` commands. Nothing is sent until a person runs it.
export function toGithubScript(issues) {
  const owners = [...new Set(issues.map((issue) => issue.data.owner).filter(Boolean))].sort();
  const sprints = [...new Set(issues.map((issue) => issue.sprint))].sort((a, b) => a - b);
  const theme = (sprint) => issues.find((issue) => issue.sprint === sprint)?.sprintHeading?.theme;
  const milestone = (sprint) => `Sprint ${sprint}${theme(sprint) ? ` — ${theme(sprint)}` : ''}`;
  const out = [
    '#!/usr/bin/env bash',
    '# Creates the backlog of docs/ISSUES.md as GitHub issues. Written by spec-guard.',
    '# Review it, then run it from the repository root. Needs the gh CLI, logged in.',
    '# Issues that already exist (same id in the title) are skipped, so it can run twice.',
    'set -euo pipefail',
    'repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)',
    '',
    ...owners.map((owner) => `gh label create ${shellQuote(`agent:${owner}`)} --color 1D76DB --force >/dev/null`),
    ...sprints.map((sprint) => `gh label create ${shellQuote(`sprint-${sprint}`)} --color 808080 --force >/dev/null`),
    ...sprints.map((sprint) => `gh api "repos/$repo/milestones" --jq '.[].title' | grep -qxF ${shellQuote(milestone(sprint))} || gh api "repos/$repo/milestones" -f title=${shellQuote(milestone(sprint))} >/dev/null`),
    '',
    'create() {',
    '  local id="$1" title="$2" milestone="$3" labels="$4" body="$5"',
    '  if gh issue list --state all --search "$id in:title" --json title --jq ".[].title" | grep -q "^$id "; then echo "exists  $id"; return; fi',
    '  gh issue create --title "$id $title" --milestone "$milestone" --label "$labels" --body "$body" >/dev/null',
    '  echo "created $id"',
    '}',
    '',
  ];
  for (const issue of issues) {
    out.push(`create ${shellQuote(issue.id)} ${shellQuote(issue.title)} ${shellQuote(milestone(issue.sprint))} ${shellQuote(`sprint-${issue.sprint},agent:${issue.data.owner ?? 'unassigned'}`)} ${shellQuote(issueMarkdown(issue))}`);
  }
  return `${out.join('\n')}\n`;
}
