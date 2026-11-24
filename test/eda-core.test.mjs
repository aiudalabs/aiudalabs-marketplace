import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT } from '../lib/components.mjs';

// The eda-core scripts are Python. The tests run when python3 has numpy, pandas, scipy and agent-eda; otherwise they are skipped.
const python = process.env.EDA_CORE_PYTHON ?? 'python3';
const ready = spawnSync(python, ['-c', 'import numpy, pandas, scipy, agent_eda'], { encoding: 'utf8' }).status === 0;

test('eda-core: unit tests (detection, numbers, determinism, safe input)', { skip: ready ? false : 'python3 with numpy, pandas, scipy and agent-eda is not available' }, () => {
  const run = spawnSync(python, ['-m', 'unittest', 'discover', '-s', join('test', 'eda-core')], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  assert.equal(run.status, 0, run.stderr.split('\n').slice(-25).join('\n'));
});
