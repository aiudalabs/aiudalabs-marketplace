// Validation rules for canonical components.
// Skill rules follow https://agentskills.io/specification.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { listSkillFiles, skillLike, skillRequires, workflowAgents } from './components.mjs';

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const SKILL_FIELDS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
const AGENT_FIELDS = ['name', 'description', 'version', 'requires', 'tags', 'license', 'source'];
const STACK_FIELDS = ['name', 'description', 'version', 'agents', 'skills', 'workflows'];
const EXTERNAL_FIELDS = ['name', 'description', 'version', 'kind', 'repo', 'commit', 'path', 'license', 'notes'];
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const URL_PATTERN = /^https:\/\/\S+$/;

const NAME_MAX = 64;
const DESCRIPTION_MAX = 1024;
const COMPATIBILITY_MAX = 500;
const SKILL_BODY_MAX_LINES = 500;
const AGENT_BODY_MAX_LINES = 150;

// A path that only exists in one harness, or in a Claude Code plugin. Skills
// install into a different folder in every harness, so text that locates a
// skill this way breaks everywhere else.
const HARNESS_PATH = /(?:~|\$HOME|\$\{HOME\})\/\.(?:claude|codex|cursor|gemini|copilot|agents|osaurus|config\/opencode)\/(?:skills|agents)\b|CLAUDE_PLUGIN_ROOT/g;
// Files kept verbatim from their source, which the rules above do not apply to.
const VERBATIM_FILE = /(^|\/)(THIRD_PARTY_NOTICES|NOTICE|LICENSE)(\.md|\.txt)?$/;
const TEXT_FILE = /\.(md|txt|sh|py|mjs|js|json|ya?ml|toml)$/;

const isString = (value) => typeof value === 'string';
const lineCount = (text) => text.split('\n').length;

// Returns a list of { level: 'error' | 'warning', path, message }.
export function validateAll(components) {
  const { agents, skills, workflows = [], externals = [], stacks } = components;
  // Skills, workflows and externals all install into the same folder, so they share one namespace.
  const skillIds = new Set(skillLike(components).map((item) => item.id));
  const agentIds = new Set(agents.map((agent) => agent.id));
  const workflowIds = new Set(workflows.map((workflow) => workflow.id));
  return [
    ...skills.flatMap((skill) => validateSkill(skill, skillIds)),
    ...workflows.flatMap((workflow) => validateWorkflow(workflow, skillIds, agentIds)),
    ...[...skills, ...workflows].flatMap(validateSkillFiles),
    ...externals.flatMap(validateExternal),
    ...agents.flatMap((agent) => validateAgent(agent, skillIds)),
    ...duplicates(agents, 'agent'),
    ...duplicates(skillLike(components), 'skill, workflow or external'),
    ...nameClashes(agents, skillIds),
    ...stacks.flatMap((stack) => validateStack(stack, { agentIds, skillIds, workflowIds })),
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

// The naming rule every component shares. Returns what is wrong with a name, as phrases that follow it.
export function nameProblems(name) {
  const problems = [];
  if (name.length > NAME_MAX) problems.push(`is longer than ${NAME_MAX} characters`);
  if (!NAME_PATTERN.test(name)) problems.push('must be lowercase letters, digits and single hyphens, and cannot start or end with a hyphen');
  return problems;
}

function checkName(report, name, expected, expectedLabel) {
  if (!isString(name) || name === '') return report.error('`name` is required');
  for (const problem of nameProblems(name)) report.error(`\`name\` ${problem}`);
  if (name !== expected) report.error(`\`name\` ("${name}") must match the ${expectedLabel} ("${expected}")`);
}

function checkDescription(report, description) {
  if (!isString(description) || description.trim() === '') return report.error('`description` is required');
  // Skeletons from `new` start with a TODO description, so an unfinished component cannot pass.
  if (/^TODO\b/.test(description.trim())) report.error('`description` still has the template placeholder; say what it does and when to use it');
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
  checkName(report, data.name, skill.id, `${skill.type ?? 'skill'} folder name`);
  checkDescription(report, data.description);

  if ('license' in data && !isString(data.license)) report.error('`license` must be a string');
  if ('allowed-tools' in data && !isString(data['allowed-tools'])) report.error('`allowed-tools` must be a space-delimited string');
  if ('compatibility' in data) checkCompatibility(report, data.compatibility);
  checkSkillMetadata(report, data.metadata);
  for (const required of skillRequires(skill)) {
    if (required === skill.id) report.error('`metadata.requires` cannot list the skill itself');
    else if (!skillIds.has(required)) report.error(`\`metadata.requires\` references unknown skill, workflow or external "${required}"`);
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

// Checks every file a skill ships, not only SKILL.md: references are loaded by
// the agent too. Files under assets/ are templates for the user's output, so
// their links point into the user's project and are not checked.
export function validateSkillFiles(skill) {
  if (skill.error || !existsSync(skill.dir)) return [];
  const report = reporter(skill.path);
  for (const file of listSkillFiles(skill.dir)) {
    if (VERBATIM_FILE.test(file) || !TEXT_FILE.test(file)) continue;
    const text = readFileSync(join(skill.dir, file), 'utf8');
    for (const match of text.matchAll(HARNESS_PATH)) {
      const line = lineCount(text.slice(0, match.index));
      report.error(`${file}:${line} uses the harness-specific path "${match[0]}"; refer to this skill's folder, or to another skill by name`);
    }
    if (!file.endsWith('.md') || file.startsWith('assets/')) continue;
    for (const link of relativeLinks(text)) {
      const target = join(skill.dir, dirname(file), link);
      if (relative(skill.dir, target).startsWith('..')) report.error(`${file} links outside the skill folder: ${link}; skills are installed one folder at a time`);
      else if (file !== 'SKILL.md' && !existsSync(target)) report.error(`${file} links to a missing file: ${link}`);
    }
  }
  return report.issues;
}

// A workflow is a skill that coordinates other skills and agents in phases.
export function validateWorkflow(workflow, skillIds, agentIds) {
  const issues = validateSkill(workflow, skillIds);
  if (workflow.error) return issues;
  const report = reporter(workflow.path);
  const agents = workflowAgents(workflow);
  for (const agent of agents) {
    if (!agentIds.has(agent)) report.error(`\`metadata.agents\` references unknown agent "${agent}"`);
    else if (!workflow.body.includes(`\`${agent}\``)) report.error(`agent "${agent}" is not named in the body (write it as \`${agent}\`)`);
  }
  if (agents.length + skillRequires(workflow).length === 0) {
    report.error('a workflow must list the skills it uses in `metadata.requires` or the agents it dispatches in `metadata.agents`');
  }
  return [...issues, ...report.issues];
}

// A skill kept in another repository, cloned at a pinned commit when installed.
export function validateExternal(external) {
  const report = reporter(external.path);
  if (external.error) {
    report.error(external.error);
    return report.issues;
  }
  const { data } = external;
  checkUnknownFields(report, data, EXTERNAL_FIELDS);
  checkName(report, data.name, external.id, 'external folder name');
  checkDescription(report, data.description);
  checkVersion(report, data.version, 'version');
  if (data.kind !== 'skill') report.error('`kind` must be "skill" (the only kind supported)');
  if (!isString(data.repo) || !URL_PATTERN.test(data.repo)) report.error('`repo` must be an https URL of a git repository');
  if (!isString(data.commit) || !COMMIT_PATTERN.test(data.commit)) report.error('`commit` must be a full 40-character commit hash');
  if (!isString(data.path)) report.error('`path` must be the folder of the skill inside the repository ("" for the root)');
  else if (data.path.startsWith('/') || data.path.split('/').includes('..')) report.error('`path` must stay inside the repository');
  if (!isString(data.license) || data.license === '') report.error('`license` is required: an SPDX identifier, or "none" when the repository has no license');
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
// Code blocks, inline code and placeholder paths such as `<slug>/card.md` are
// examples of output the skill writes, not files it ships, so they are skipped.
function relativeLinks(body) {
  const prose = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const links = new Set();
  for (const match of prose.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (target === '' || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('/') || /[<>{}]/.test(target)) continue;
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
  // Agents adapted from other projects carry their attribution with them.
  if ('source' in data && (!isString(data.source) || !URL_PATTERN.test(data.source))) report.error('`source` must be an https URL');
  if (('source' in data) !== ('license' in data)) report.error('`source` and `license` go together: give both or neither');
  if (!NAME_PATTERN.test(agent.category)) report.error(`category folder "${agent.category}" must be lowercase-hyphenated`);

  for (const field of ['requires', 'tags']) {
    if (field in data && !Array.isArray(data[field])) report.error(`\`${field}\` must be a list`);
  }
  for (const skill of Array.isArray(data.requires) ? data.requires : []) {
    if (!skillIds.has(skill)) report.error(`\`requires\` references unknown skill, workflow or external "${skill}"`);
    // Harnesses do not read `requires`; the body text is how the agent learns to load the skill.
    else if (!body.includes(`\`${skill}\``)) report.error(`required skill "${skill}" is not named in the body (write it as \`${skill}\`)`);
  }

  if (body.trim() === '') report.error('agent has no persona body after the frontmatter');
  for (const match of body.matchAll(HARNESS_PATH)) {
    report.error(`body uses the harness-specific path "${match[0]}"; agents are installed into every harness, so name skills instead of locating them by path`);
  }
  if (lineCount(body) > AGENT_BODY_MAX_LINES) {
    report.warn(`agent body is over ${AGENT_BODY_MAX_LINES} lines; agents are personas, move procedures into a skill`);
  }
  return report.issues;
}

// An agent and a skill with the same name make `add <name>` ambiguous, and a
// body that says "use paper-review" could mean either.
function nameClashes(agents, skillIds) {
  return agents
    .filter((agent) => skillIds.has(agent.id))
    .map((agent) => ({ level: 'error', path: agent.path, message: `agent name "${agent.id}" is also the name of a skill, workflow or external; rename one of them` }));
}

// Each kind installs into one flat folder per harness, so names must be unique within it.
function duplicates(items, label) {
  const seen = new Map();
  const issues = [];
  for (const item of items) {
    const first = seen.get(item.id);
    if (first) issues.push({ level: 'error', path: item.path, message: `${label} name "${item.id}" is already used by ${first}` });
    else seen.set(item.id, item.path);
  }
  return issues;
}

export function validateStack(stack, { agentIds, skillIds, workflowIds = new Set() }) {
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
  const workflows = stackList(report, data, 'workflows');
  if (agents.length + skills.length + workflows.length === 0) report.error('stack must include at least one agent, skill or workflow');
  for (const agent of agents) if (!agentIds.has(agent)) report.error(`references unknown agent "${agent}"`);
  for (const skill of skills) {
    if (!skillIds.has(skill) || workflowIds.has(skill)) report.error(`references unknown skill or external "${skill}" (list workflows under "workflows")`);
  }
  for (const workflow of workflows) if (!workflowIds.has(workflow)) report.error(`references unknown workflow "${workflow}"`);
  return report.issues;
}

function stackList(report, data, field) {
  if (!(field in data)) return [];
  if (Array.isArray(data[field]) && data[field].every(isString)) return data[field];
  report.error(`\`${field}\` must be a list of names`);
  return [];
}
