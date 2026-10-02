// Validation rules for canonical components.
// Skill rules follow https://agentskills.io/specification.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { skillRequires } from './components.mjs';

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const SKILL_FIELDS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
const AGENT_FIELDS = ['name', 'description', 'version', 'skills', 'tags'];
const STACK_FIELDS = ['name', 'description', 'version', 'agents', 'skills'];

const NAME_MAX = 64;
const DESCRIPTION_MAX = 1024;
const COMPATIBILITY_MAX = 500;
const SKILL_BODY_MAX_LINES = 500;
const AGENT_BODY_MAX_LINES = 150;

const isString = (value) => typeof value === 'string';
const lineCount = (text) => text.split('\n').length;

// Returns a list of { level: 'error' | 'warning', path, message }.
export function validateAll({ agents, skills, stacks }) {
  const skillIds = new Set(skills.map((skill) => skill.id));
  const agentIds = new Set(agents.map((agent) => agent.id));
  return [
    ...skills.flatMap((skill) => validateSkill(skill, skillIds)),
    ...agents.flatMap((agent) => validateAgent(agent, skillIds)),
    ...duplicateAgents(agents),
    ...stacks.flatMap((stack) => validateStack(stack, agentIds, skillIds)),
  ];
}

function reporter(path) {
  const issues = [];
  return {
    issues,
    error: (message) => issues.push({ level: 'error', path, message }),
    warn: (message) => issues.push({ level: 'warning', path, message }),
  };
}

function checkName(report, name, expected, expectedLabel) {
  if (!isString(name) || name === '') return report.error('`name` is required');
  if (name.length > NAME_MAX) report.error(`\`name\` is longer than ${NAME_MAX} characters`);
  if (!NAME_PATTERN.test(name)) {
    report.error('`name` must be lowercase letters, digits and single hyphens, and cannot start or end with a hyphen');
  }
  if (name !== expected) report.error(`\`name\` ("${name}") must match the ${expectedLabel} ("${expected}")`);
}

function checkDescription(report, description) {
  if (!isString(description) || description.trim() === '') return report.error('`description` is required');
  if (description.length > DESCRIPTION_MAX) report.error(`\`description\` is longer than ${DESCRIPTION_MAX} characters`);
}

function checkUnknownFields(report, data, allowed) {
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) report.error(`unknown field \`${key}\` (allowed: ${allowed.join(', ')})`);
  }
}

function checkVersion(report, version, field) {
  if (!isString(version) || !SEMVER_PATTERN.test(version)) report.error(`\`${field}\` must be a semver string like "0.1.0"`);
}

export function validateSkill(skill, skillIds) {
  const report = reporter(skill.path);
  if (skill.error) {
    report.error(skill.error);
    return report.issues;
  }
  const { data, body } = skill;

  checkUnknownFields(report, data, SKILL_FIELDS);
  checkName(report, data.name, skill.id, 'skill folder name');
  checkDescription(report, data.description);

  if ('license' in data && !isString(data.license)) report.error('`license` must be a string');
  if ('allowed-tools' in data && !isString(data['allowed-tools'])) report.error('`allowed-tools` must be a space-delimited string');
  if ('compatibility' in data) checkCompatibility(report, data.compatibility);
  checkSkillMetadata(report, data.metadata);
  for (const required of skillRequires(skill)) {
    if (required === skill.id) report.error('`metadata.requires` cannot list the skill itself');
    else if (!skillIds.has(required)) report.error(`\`metadata.requires\` references unknown skill "${required}"`);
  }

  if (body.trim() === '') report.error('SKILL.md has no instructions after the frontmatter');
  if (lineCount(body) > SKILL_BODY_MAX_LINES) {
    report.warn(`SKILL.md body is over ${SKILL_BODY_MAX_LINES} lines; move detail into references/`);
  }
  for (const link of relativeLinks(body)) {
    if (!existsSync(join(skill.dir, link))) report.error(`SKILL.md links to a missing file: ${link}`);
  }
  return report.issues;
}

function checkCompatibility(report, compatibility) {
  if (!isString(compatibility) || compatibility === '') return report.error('`compatibility` must be a non-empty string');
  if (compatibility.length > COMPATIBILITY_MAX) report.error(`\`compatibility\` is longer than ${COMPATIBILITY_MAX} characters`);
}

// The spec has no top-level version, so this marketplace requires it in metadata.
function checkSkillMetadata(report, metadata) {
  if (metadata === undefined) return report.error('`metadata.version` is required by this marketplace');
  if (typeof metadata !== 'object' || Array.isArray(metadata)) return report.error('`metadata` must be a map of string keys to string values');
  for (const [key, value] of Object.entries(metadata)) {
    if (!isString(value)) report.error(`\`metadata.${key}\` must be a string`);
  }
  checkVersion(report, metadata.version, 'metadata.version');
}

// Markdown links and images that point at files inside the skill folder.
function relativeLinks(body) {
  const links = new Set();
  for (const match of body.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (target === '' || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('/')) continue;
    links.add(target);
  }
  return [...links];
}

export function validateAgent(agent, skillIds) {
  const report = reporter(agent.path);
  if (agent.error) {
    report.error(agent.error);
    return report.issues;
  }
  const { data, body } = agent;

  checkUnknownFields(report, data, AGENT_FIELDS);
  checkName(report, data.name, agent.id, 'file name');
  checkDescription(report, data.description);
  checkVersion(report, data.version, 'version');
  if (!NAME_PATTERN.test(agent.category)) report.error(`category folder "${agent.category}" must be lowercase-hyphenated`);

  for (const field of ['skills', 'tags']) {
    if (field in data && !Array.isArray(data[field])) report.error(`\`${field}\` must be a list`);
  }
  for (const skill of Array.isArray(data.skills) ? data.skills : []) {
    if (!skillIds.has(skill)) report.error(`references unknown skill "${skill}"`);
  }

  if (body.trim() === '') report.error('agent has no persona body after the frontmatter');
  if (lineCount(body) > AGENT_BODY_MAX_LINES) {
    report.warn(`agent body is over ${AGENT_BODY_MAX_LINES} lines; agents are personas, move procedures into a skill`);
  }
  return report.issues;
}

// Agents install into one flat folder per harness, so ids must be unique across categories.
function duplicateAgents(agents) {
  const seen = new Map();
  const issues = [];
  for (const agent of agents) {
    const first = seen.get(agent.id);
    if (first) issues.push({ level: 'error', path: agent.path, message: `agent name "${agent.id}" is already used by ${first}` });
    else seen.set(agent.id, agent.path);
  }
  return issues;
}

export function validateStack(stack, agentIds, skillIds) {
  const report = reporter(stack.path);
  if (stack.error) {
    report.error(stack.error);
    return report.issues;
  }
  const { data } = stack;

  checkUnknownFields(report, data, STACK_FIELDS);
  checkName(report, data.name, stack.id, 'stack folder name');
  checkDescription(report, data.description);
  checkVersion(report, data.version, 'version');

  const agents = stackList(report, data, 'agents');
  const skills = stackList(report, data, 'skills');
  if (agents.length + skills.length === 0) report.error('stack must include at least one agent or skill');
  for (const agent of agents) if (!agentIds.has(agent)) report.error(`references unknown agent "${agent}"`);
  for (const skill of skills) if (!skillIds.has(skill)) report.error(`references unknown skill "${skill}"`);
  return report.issues;
}

function stackList(report, data, field) {
  if (!(field in data)) return [];
  if (Array.isArray(data[field]) && data[field].every(isString)) return data[field];
  report.error(`\`${field}\` must be a list of names`);
  return [];
}
