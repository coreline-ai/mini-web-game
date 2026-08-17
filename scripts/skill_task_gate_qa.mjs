#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const gate = path.join(path.dirname(fileURLToPath(import.meta.url)), 'skill_task_gate.mjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-task-gate-qa-'));
const results = [];

function git(repo, args) {
  execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
}

function makeRepo(name) {
  const repo = path.join(root, name);
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'README.md'), '# fixture\n');
  fs.writeFileSync(path.join(repo, 'src', 'skill.txt'), 'version 1\n');
  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.email', 'fixture@example.invalid']);
  git(repo, ['config', 'user.name', 'Fixture']);
  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'baseline']);
  return repo;
}

function invoke(repo, args) {
  return spawnSync(process.execPath, [gate, ...args, '--repo', repo], { encoding: 'utf8' });
}

function expect(name, result, code, fingerprint) {
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const ok = result.status === code && output.includes(fingerprint);
  results.push({ name, ok, detail: `exit=${result.status}, expected=${code}, fingerprint=${fingerprint}`, output });
}

function write(repo, relative, content) {
  const file = path.join(repo, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

try {
  // 1. 정상 순서 GREEN
  const normal = makeRepo('normal');
  const allow = ['src/skill.txt', 'docs/implementation.md', 'docs/comparison.md', 'docs/review.md'];
  let result = invoke(normal, ['start', '--task-id', 'normal-task', '--implementer', 'worker-a',
    '--target', 'src/skill.txt',
    ...allow.flatMap((item) => ['--allow', item])]);
  expect('normal/start', result, 0, 'PLANNED');
  write(normal, 'src/skill.txt', 'version 2\n');
  expect('normal/implemented', invoke(normal, ['advance', '--task-id', 'normal-task', '--to', 'IMPLEMENTED']), 0, 'IMPLEMENTED');
  write(normal, 'docs/implementation.md', '# Implemented\n- changed skill\n');
  expect('normal/documented', invoke(normal, ['advance', '--task-id', 'normal-task', '--to', 'DOCUMENTED',
    '--evidence', 'docs/implementation.md']), 0, 'DOCUMENTED');
  write(normal, 'docs/comparison.md', '# Skill comparison\n- MATCH\n');
  expect('normal/compared', invoke(normal, ['advance', '--task-id', 'normal-task', '--to', 'SKILL_COMPARED',
    '--evidence', 'docs/comparison.md', '--comparison', 'MATCH']), 0, 'SKILL_COMPARED');
  write(normal, 'docs/review.md', '# Independent review\n- approve\n');
  expect('normal/reviewed', invoke(normal, ['advance', '--task-id', 'normal-task', '--to', 'REVIEWED',
    '--evidence', 'docs/review.md', '--reviewer', 'reviewer-b']), 0, 'REVIEWED');
  expect('normal/pass', invoke(normal, ['advance', '--task-id', 'normal-task', '--to', 'PASS']), 0, 'PASS');
  expect('normal/verify', invoke(normal, ['verify', '--task-id', 'normal-task']), 0, 'PASS');

  // 2. 단계 건너뛰기 RED + 5. 미완료 상태에서 새 작업 RED
  const order = makeRepo('order');
  expect('order/start', invoke(order, ['start', '--task-id', 'order-task', '--implementer', 'worker-a',
    '--target', 'src/skill.txt',
    '--allow', 'src/skill.txt', '--allow', 'docs/evidence.md']), 0, 'PLANNED');
  write(order, 'src/skill.txt', 'version 2\n');
  write(order, 'docs/evidence.md', '# evidence\n');
  expect('order/skip', invoke(order, ['advance', '--task-id', 'order-task', '--to', 'DOCUMENTED',
    '--evidence', 'docs/evidence.md']), 1, 'E_ORDER');
  expect('order/second-active', invoke(order, ['start', '--task-id', 'second-task', '--implementer', 'worker-b',
    '--target', 'README.md', '--allow', 'README.md']), 1, 'E_ACTIVE_TASK');

  // 3. 선언하지 않은 파일 변경 RED
  const scope = makeRepo('scope');
  expect('scope/start', invoke(scope, ['start', '--task-id', 'scope-task', '--implementer', 'worker-a',
    '--target', 'src/skill.txt', '--allow', 'src/skill.txt']), 0, 'PLANNED');
  write(scope, 'src/skill.txt.evil', 'undeclared prefix lookalike\n');
  expect('scope/outside', invoke(scope, ['advance', '--task-id', 'scope-task', '--to', 'IMPLEMENTED']), 1, 'E_SCOPE');

  // 증거 파일만 만들어 IMPLEMENTED를 세탁할 수 없다.
  const noChange = makeRepo('no-change');
  expect('no-change/start', invoke(noChange, ['start', '--task-id', 'no-change-task', '--implementer', 'worker-a',
    '--target', 'src/skill.txt', '--allow', 'src/skill.txt', '--allow', 'docs/evidence.md']), 0, 'PLANNED');
  write(noChange, 'docs/evidence.md', '# evidence only\n');
  expect('no-change/implemented', invoke(noChange, ['advance', '--task-id', 'no-change-task', '--to', 'IMPLEMENTED']),
    1, 'E_NO_CHANGE');

  // 4. PASS 후 승인 파일 변경 RED, 다음 작업도 차단
  write(normal, 'src/skill.txt', 'version 3 after pass\n');
  expect('pass-drift/verify', invoke(normal, ['verify', '--task-id', 'normal-task']), 1, 'E_PASS_DRIFT');
  expect('pass-drift/next-start', invoke(normal, ['start', '--task-id', 'next-task', '--implementer', 'worker-c',
    '--target', 'README.md', '--allow', 'README.md']), 1, 'E_PASS_DRIFT');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

for (const item of results) {
  console.log(`${item.ok ? '✓' : '✗'} ${item.name}: ${item.detail}`);
  if (!item.ok) console.log(item.output.trim());
}
const failed = results.filter((item) => !item.ok);
if (failed.length) {
  console.error(`skill task gate QA failed: ${failed.length}/${results.length}`);
  process.exit(1);
}
console.log(`skill task gate QA OK: ${results.length} assertions`);
