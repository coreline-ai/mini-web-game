#!/usr/bin/env node

import crypto from 'node:crypto';
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

/** PASS 상태 파일을 커밋한다. PASS는 저장소가 공유하는 사실이어야 verify를 통과한다. */
function commitAll(repo, message) {
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-qm', message]);
}

/**
 * 게이트를 한 번도 실행하지 않고 손으로 PASS 상태 파일을 만든다.
 * seal은 키 없는 sha256(자기 자신)이라 누구나 계산할 수 있다 — 그래서 seal만으로는 못 막는다.
 */
function forgePassState(repo, taskId, allowed, snapshotOverride) {
  const stable = (value) => (Array.isArray(value) ? value.map(stable)
    : (value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])])) : value));
  const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
  const state = {
    schemaVersion: 1,
    taskId,
    implementer: 'forger',
    status: 'PASS',
    allowedPaths: allowed,
    targetPaths: allowed,
    supersedes: [],
    baselineHead: '0'.repeat(40),
    baselineSnapshot: {},
    approvedSnapshot: snapshotOverride ?? Object.fromEntries(allowed.map((rel) => [rel,
      sha(fs.readFileSync(path.join(repo, rel)))])),
    evidence: { documentation: 'd', skillComparison: 'c', review: 'r', reviewer: 'x' },
    history: [],
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
    passedAt: '2026-08-17T00:00:00.000Z',
  };
  const copy = { ...state };
  delete copy.stateSeal;
  state.stateSeal = sha(JSON.stringify(stable(copy)));
  const dir = path.join(repo, 'dev_game', 'docs', 'skill-workflow');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${taskId}.state.json`), `${JSON.stringify(state, null, 2)}\n`);
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
  // 커밋 전 PASS는 verify를 통과하면 안 된다. 손으로 쓴 상태 파일과 구별할 방법이 그것뿐이다.
  expect('normal/verify-before-commit', invoke(normal, ['verify', '--task-id', 'normal-task']),
    1, 'E_PASS_UNCOMMITTED');
  commitAll(normal, 'normal task pass');
  expect('normal/verify', invoke(normal, ['verify', '--task-id', 'normal-task']), 0, 'PASS');

  // 커밋 뒤 상태 파일을 고치면 RED. seal을 다시 계산해도 HEAD의 바이트와 달라진다.
  const tampered = JSON.parse(fs.readFileSync(path.join(normal,
    'dev_game/docs/skill-workflow/normal-task.state.json'), 'utf8'));
  tampered.allowedPaths = [...tampered.allowedPaths, 'README.md'];
  const stableSort = (v) => (Array.isArray(v) ? v.map(stableSort)
    : (v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stableSort(v[k])])) : v));
  const copy = { ...tampered };
  delete copy.stateSeal;
  tampered.stateSeal = crypto.createHash('sha256').update(JSON.stringify(stableSort(copy))).digest('hex');
  write(normal, 'dev_game/docs/skill-workflow/normal-task.state.json', `${JSON.stringify(tampered, null, 2)}\n`);
  expect('normal/post-commit-edit', invoke(normal, ['verify', '--task-id', 'normal-task']), 1, 'E_PASS_MODIFIED');
  git(normal, ['checkout', '--', 'dev_game/docs/skill-workflow/normal-task.state.json']);
  expect('normal/restored', invoke(normal, ['verify', '--task-id', 'normal-task']), 0, 'PASS');

  // 위조: 게이트를 한 번도 돌리지 않고 손으로 쓴 PASS. seal은 맞지만 HEAD에 없다.
  const forged = makeRepo('forged');
  forgePassState(forged, 'forged-task', ['src/skill.txt']);
  expect('forged/verify', invoke(forged, ['verify', '--task-id', 'forged-task']), 1, 'E_PASS_UNCOMMITTED');
  expect('forged/blocks-next-start', invoke(forged, ['start', '--task-id', 'next-task',
    '--implementer', 'w', '--target', 'README.md', '--allow', 'README.md']), 1, 'E_PASS_UNCOMMITTED');

  // 빈 범위 PASS: 커밋하기만 하면 무엇을 바꿔도 영원히 통과하던 가장 값싼 위조.
  const empty = makeRepo('empty-scope');
  forgePassState(empty, 'empty-scope-task', []);
  commitAll(empty, 'forged empty scope');
  expect('empty-scope/verify', invoke(empty, ['verify', '--task-id', 'empty-scope-task']), 1, 'E_EMPTY_SCOPE');
  expect('empty-scope/blocks-next-start', invoke(empty, ['start', '--task-id', 'after-empty',
    '--implementer', 'w', '--target', 'README.md', '--allow', 'README.md']), 1, 'E_EMPTY_SCOPE');

  // allowedPaths는 있는데 봉인된 파일이 0개인 경우도 같은 공허함이다. 두 갈래를 따로 건다 —
  // 하나로 묶어 두었더니 한쪽 검사를 무력화해도 다른 쪽이 가려 대조가 성립하지 않았다.
  // allowedPaths만 비어 있고 snapshot은 그럴듯한 위조. 손으로 쓰면 얼마든지 만들 수 있는
  // 조합이고, 이것만이 allowedPaths 검사를 단독으로 증명한다.
  const emptyAllow = makeRepo('empty-allow');
  forgePassState(emptyAllow, 'empty-allow-task', [], {
    'src/skill.txt': crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(emptyAllow, 'src', 'skill.txt'))).digest('hex'),
  });
  commitAll(emptyAllow, 'forged empty allow');
  expect('empty-allow/verify', invoke(emptyAllow, ['verify', '--task-id', 'empty-allow-task']),
    1, 'allowedPaths가 없다');

  const emptySnap = makeRepo('empty-snapshot');
  forgePassState(emptySnap, 'empty-snapshot-task', ['src/skill.txt'], {});
  commitAll(emptySnap, 'forged empty snapshot');
  expect('empty-snapshot/verify', invoke(emptySnap, ['verify', '--task-id', 'empty-snapshot-task']),
    1, 'approvedSnapshot이 비어 있다');

  // 커밋된 상태 파일을 지워 승인 이력을 없앨 수 없다.
  const deleted = makeRepo('deleted');
  expect('deleted/start', invoke(deleted, ['start', '--task-id', 'deleted-task', '--implementer', 'w',
    '--target', 'src/skill.txt', '--allow', 'src/skill.txt']), 0, 'PLANNED');
  commitAll(deleted, 'planned state');
  fs.rmSync(path.join(deleted, 'dev_game/docs/skill-workflow/deleted-task.state.json'));
  expect('deleted/start-after-delete', invoke(deleted, ['start', '--task-id', 'fresh-task',
    '--implementer', 'w', '--target', 'README.md', '--allow', 'README.md']), 1, 'E_STATE_DELETED');

  // drift가 난 PASS는 새 작업을 막는다. 그런데 그 유일한 해소 수단이 supersede인데,
  // supersede **대상까지** 검증하면 게이트가 영구 교착이다 — 실제 저장소가 그 상태였다
  // (계획서를 재작성해 PASS가 drift → 어떤 start도 불가 → supersede도 불가). 그래서
  // 대상은 검증에서 빼되, drift를 지우지 않고 새 상태 파일에 **기록**한다.
  const drifted = makeRepo('drifted');
  const dAllow = ['src/skill.txt', 'docs/impl.md', 'docs/comp.md', 'docs/rev.md'];
  expect('drifted/start', invoke(drifted, ['start', '--task-id', 'first-task', '--implementer', 'w',
    '--target', 'src/skill.txt', ...dAllow.flatMap((i) => ['--allow', i])]), 0, 'PLANNED');
  write(drifted, 'src/skill.txt', 'version 2\n');
  invoke(drifted, ['advance', '--task-id', 'first-task', '--to', 'IMPLEMENTED']);
  write(drifted, 'docs/impl.md', '# i\n');
  invoke(drifted, ['advance', '--task-id', 'first-task', '--to', 'DOCUMENTED', '--evidence', 'docs/impl.md']);
  write(drifted, 'docs/comp.md', '# c\n');
  invoke(drifted, ['advance', '--task-id', 'first-task', '--to', 'SKILL_COMPARED', '--evidence', 'docs/comp.md', '--comparison', 'MATCH']);
  write(drifted, 'docs/rev.md', '# r\n');
  invoke(drifted, ['advance', '--task-id', 'first-task', '--to', 'REVIEWED', '--evidence', 'docs/rev.md', '--reviewer', 'r2']);
  invoke(drifted, ['advance', '--task-id', 'first-task', '--to', 'PASS']);
  commitAll(drifted, 'first pass');
  write(drifted, 'src/skill.txt', 'version 3 — drift\n');
  commitAll(drifted, 'edit after pass');
  expect('drifted/plain-start-blocked', invoke(drifted, ['start', '--task-id', 'plain-task',
    '--implementer', 'w', '--target', 'README.md', '--allow', 'README.md']), 1, 'E_PASS_DRIFT');
  expect('drifted/supersede-start-allowed', invoke(drifted, ['start', '--task-id', 'successor-task',
    '--implementer', 'w', '--target', 'src/skill.txt', '--allow', 'src/skill.txt',
    '--supersede', 'first-task']), 0, 'SUPERSEDE_DRIFT');
  const successor = JSON.parse(fs.readFileSync(path.join(drifted,
    'dev_game/docs/skill-workflow/successor-task.state.json'), 'utf8'));
  results.push({ name: 'drifted/drift-recorded',
    ok: Array.isArray(successor.supersededDrift?.['first-task'])
      && successor.supersededDrift['first-task'].includes('src/skill.txt'),
    detail: 'supersededDrift must record which approved paths changed',
    output: JSON.stringify(successor.supersededDrift) });

  // verify-all: task-id 없이 저장소의 모든 유효 PASS를 검증한다. 체인에 넣을 수 있는 유일한
  // 형태다 — 이것이 없어서 저장소 자신의 PASS drift가 조용히 남았다.
  // green은 깨끗한 PASS를 가진 normal 저장소에서. drifted 저장소는 successor가 아직 PASS가
  // 아니므로 first-task가 superseded로 취급되지 않고, 이미 drift 상태다 — 그대로 RED 케이스다.
  expect('normal/verify-all-green', invoke(normal, ['verify-all']), 0, 'verify-all — 유효 PASS 1개');
  expect('drifted/verify-all-drift', invoke(drifted, ['verify-all']), 1, 'E_PASS_DRIFT');

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
// 개수를 세어 출력만 하면 검사를 지워도 "OK"가 나온다. 실측(2026-08-17): 9개를 지워도 통과했다.
// 기대 개수를 고정해, 대조군이 사라지는 것 자체를 RED로 만든다.
const EXPECTED_ASSERTIONS = 33;
if (results.length !== EXPECTED_ASSERTIONS) {
  console.error(`skill task gate QA: 대조군 개수가 ${EXPECTED_ASSERTIONS}개가 아니다 (실제 ${results.length}개)`);
  console.error('대조군을 늘렸다면 EXPECTED_ASSERTIONS를 함께 올릴 것. 줄었다면 왜 사라졌는지 확인할 것.');
  process.exit(1);
}
const failed = results.filter((item) => !item.ok);
if (failed.length) {
  console.error(`skill task gate QA failed: ${failed.length}/${results.length}`);
  process.exit(1);
}
console.log(`skill task gate QA OK: ${results.length} assertions`);
