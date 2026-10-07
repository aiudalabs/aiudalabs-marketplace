// The aiuda-stack components work together only if the documents one skill
// writes are the documents spec-guard reads. These tests hold them together.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT, loadAll } from '../lib/components.mjs';
import { expand, resolveReference } from '../lib/install.mjs';
import { globsOverlap, parseRoster } from '../skills/spec-guard/scripts/lib.mjs';

const PROFILES = { 'flutter-firebase': ['flutter-dev', 'firebase-dev', 'react-dev', 'qa-tester', 'product-advisor'], 'fastapi-react': ['python-dev', 'react-dev', 'qa-tester', 'product-advisor'] };

test('each stack profile ships a roster spec-guard can read, with lanes that do not overlap', () => {
  const agentNames = new Set(loadAll().agents.map((agent) => agent.id));
  for (const [profile, expected] of Object.entries(PROFILES)) {
    const file = join(ROOT, 'skills', `stack-profile-${profile}`, 'references/agents.md');
    assert.ok(existsSync(file), `${profile}: references/agents.md`);
    const { agents, problems } = parseRoster(readFileSync(file, 'utf8'));
    assert.deepEqual(problems, [], profile);
    assert.deepEqual([...agents.keys()].sort(), [...expected].sort(), `${profile}: roster`);
    for (const name of agents.keys()) assert.ok(agentNames.has(name), `${profile}: ${name} is an agent in this marketplace`);
    const lanes = [...agents.values()].filter((agent) => agent.owns.length);
    for (const [i, a] of lanes.entries()) {
      for (const b of lanes.slice(i + 1)) {
        const shared = a.owns.filter((ga) => b.owns.some((gb) => globsOverlap(ga, gb)));
        assert.deepEqual(shared, [], `${profile}: ${a.name} and ${b.name} share a lane`);
      }
    }
    assert.ok(agents.get('qa-tester').reviewOnly, `${profile}: qa-tester is review-only`);
  }
});

test('copies of the Aiuda Labs design system stay identical', () => {
  const copies = ['aiuda-brand', 'html-spec-generator'].map((skill) => join(ROOT, 'skills', skill, 'references/DESIGN_SYSTEM.md')).filter(existsSync);
  assert.ok(copies.length >= 2);
  const [first, ...rest] = copies.map((file) => readFileSync(file, 'utf8'));
  for (const text of rest) assert.equal(text, first);
});

test('installing a stack brings the agents its workflows dispatch and the skills they load', () => {
  const components = loadAll();
  for (const [stack, devs] of [['aiuda-stack', PROFILES['flutter-firebase']], ['aiuda-stack-fastapi', PROFILES['fastapi-react']]]) {
    const { agents, skills } = expand([resolveReference(`stack/${stack}`, components)], components);
    const agentIds = agents.map((agent) => agent.id);
    const skillIds = skills.map((skill) => skill.id);
    for (const dev of devs) assert.ok(agentIds.includes(dev), `${stack}: ${dev}`);
    for (const skill of ['spec-guard', 'issue-delivery', 'issue-review', 'multi-agent-governance', 'product-discovery', 'stack-profile-flutter-firebase', 'stack-profile-fastapi-react']) {
      assert.ok(skillIds.includes(skill), `${stack}: ${skill}`);
    }
  }
});

test('the spec skills write the formats spec-guard reads', () => {
  const read = (skill) => readFileSync(join(ROOT, 'skills', skill, 'SKILL.md'), 'utf8');
  assert.match(read('product-discovery'), /^## D-\d{2} — /m, 'decisions are written as D-xx headings');
  assert.match(read('product-discovery'), /\*\*Stack profile:\*\*/, 'the stack profile line');
  assert.match(read('product-requirements'), /FR-[A-Z]+-\d/, 'requirement ids');
  assert.match(read('multi-agent-governance'), /AGENT_ROSTER\.md/, 'the roster file');
  assert.match(read('multi-agent-governance'), /requirement_refs/, 'issues cite requirements');
  assert.match(read('multi-agent-governance'), /waves --write/, 'waves are computed, not chosen');
});
