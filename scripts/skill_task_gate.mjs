#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ── PASS는 왜 커밋을 요구하는가 ──────────────────────────────────────────────
// `stateSeal`은 키 없는 `sha256(자기 자신)`이다. 그건 봉인이 아니라 체크섬이다. 실측(2026-08-17):
// 게이트를 한 번도 실행하지 않고 손으로 쓴 상태 파일이 `verify`에서 exit 0 `PASS`를 받았다.
// 상태 파일은 untracked라서 지우면 승인 이력 자체가 사라지기도 했다.
//
// 로컬 저장소에는 위조자가 갖지 못하는 비밀이 없으므로 서명으로는 닫히지 않는다. 대신 **git을
// 앵커로 쓴다**: PASS 상태는 HEAD에 커밋돼 있어야 하고, 작업 트리의 바이트가 커밋된 바이트와
// 같아야 한다. 위조하려면 커밋이 필요하고, 커밋은 이력에 남아 검토자가 볼 수 있다.
// 커밋된 상태 파일을 지우는 것도 RED다. 같은 방식이 `production-pass-receipt`의 legacy-pass에서
// 이미 쓰이고 있다.

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATES = ['PLANNED', 'IMPLEMENTED', 'DOCUMENTED', 'SKILL_COMPARED', 'REVIEWED', 'PASS'];
const STATE_DIR = path.posix.join('dev_game', 'docs', 'skill-workflow');

function die(code, message) {
  console.error(`[SKILL_TASK_GATE:${code}] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { allow: [], target: [], supersede: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--repo') out.repo = argv[++i];
    else if (arg === '--task-id') out.taskId = argv[++i];
    else if (arg === '--implementer') out.implementer = argv[++i];
    else if (arg === '--allow') out.allow.push(argv[++i]);
    else if (arg === '--target') out.target.push(argv[++i]);
    else if (arg === '--supersede') out.supersede.push(argv[++i]);
    else if (arg === '--to') out.to = argv[++i];
    else if (arg === '--evidence') out.evidence = argv[++i];
    else if (arg === '--comparison') out.comparison = argv[++i];
    else if (arg === '--reviewer') out.reviewer = argv[++i];
    else if (arg === '--help' || arg === '-h') out.help = true;
    else die('E_ARGS', `알 수 없는 인자: ${arg}`);
  }
  return out;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stateSeal(state) {
  const copy = structuredClone(state);
  delete copy.stateSeal;
  return sha(JSON.stringify(stable(copy)));
}

function normalizeTaskId(value) {
  const id = String(value || '');
  if (!/^[a-z0-9][a-z0-9._-]{2,79}$/.test(id)) {
    die('E_TASK_ID', 'task-id는 3~80자의 소문자·숫자·점·밑줄·하이픈이어야 한다');
  }
  return id;
}

function repoRelative(repo, value, label = 'path') {
  if (!value) die('E_PATH', `${label}가 비어 있다`);
  const absolute = path.resolve(repo, value);
  const relative = path.relative(repo, absolute).split(path.sep).join('/');
  if (!relative || relative === '.' || relative.startsWith('../') || path.isAbsolute(relative)) {
    die('E_PATH', `${label}가 저장소 내부 상대경로가 아니다: ${value}`);
  }
  if (relative === '.git' || relative.startsWith('.git/')) {
    die('E_PATH', `${label}에 .git 경로를 사용할 수 없다`);
  }
  return relative.replace(/\/$/, '');
}

function matchesAllowed(file, allowed) {
  return allowed.some((entry) => file === entry || file.startsWith(`${entry}/`));
}

function workflowDir(repo) {
  return path.join(repo, ...STATE_DIR.split('/'));
}

function statePath(repo, taskId) {
  return path.join(workflowDir(repo), `${taskId}.state.json`);
}

function stateRelative(taskId) {
  return `${STATE_DIR}/${taskId}.state.json`;
}

function git(repo, args) {
  try {
    return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  } catch (error) {
    die('E_GIT', `git ${args.join(' ')} 실패: ${error.message}`);
  }
}

function snapshot(repo, excluded = new Set()) {
  let raw;
  try {
    raw = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: repo,
      encoding: 'buffer',
    });
  } catch (error) {
    die('E_GIT', `저장소 파일 목록을 읽을 수 없다: ${error.message}`);
  }
  const result = {};
  for (const file of raw.toString('utf8').split('\0').filter(Boolean).sort()) {
    const relative = file.split(path.sep).join('/');
    if (excluded.has(relative)) continue;
    const absolute = path.join(repo, relative);
    let stat;
    try { stat = fs.lstatSync(absolute); }
    catch { result[relative] = 'MISSING'; continue; }
    if (stat.isSymbolicLink()) result[relative] = `SYMLINK:${fs.readlinkSync(absolute)}`;
    else if (stat.isFile()) result[relative] = sha(fs.readFileSync(absolute));
  }
  return result;
}

function changedPaths(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => before[key] !== after[key]).sort();
}

function scopedSnapshot(full, allowed) {
  return Object.fromEntries(Object.entries(full).filter(([file]) => matchesAllowed(file, allowed)));
}

function readState(file) {
  let state;
  try { state = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { die('E_STATE_READ', `상태 파일을 읽을 수 없다: ${file}: ${error.message}`); }
  if (state.schemaVersion !== 1 || !STATES.includes(state.status) || !state.taskId) {
    die('E_STATE_SCHEMA', `상태 파일 형식이 잘못됐다: ${file}`);
  }
  if (state.stateSeal !== stateSeal(state)) {
    die('E_STATE_TAMPERED', `상태 seal이 일치하지 않는다: ${state.taskId}`);
  }
  return state;
}

function writeState(file, state) {
  state.stateSeal = stateSeal(state);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

function listStates(repo) {
  const dir = workflowDir(repo);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.state.json'))
    .sort()
    .map((name) => ({ file: path.join(dir, name), state: readState(path.join(dir, name)) }));
}

/** HEAD에 커밋된 바이트. 없으면 null. */
function committedBytes(repo, relative) {
  const result = spawnSync('git', ['show', `HEAD:${relative}`], { cwd: repo, encoding: 'buffer' });
  return result.status === 0 ? result.stdout : null;
}

/** HEAD에 커밋된 상태 파일 목록. 커밋이 없으면 빈 목록. */
function committedStateFiles(repo) {
  // `-z`가 없으면 비ASCII 경로가 C-quote로 돌아와 매칭되지 않는다. task-id 규칙상 지금은
  // ASCII뿐이지만, 같은 결함을 다른 채널에서 이미 한 번 고쳤다. 두 채널을 같은 형식으로 둔다.
  const result = spawnSync('git', ['ls-tree', '--name-only', '-r', '-z', 'HEAD', '--', `${STATE_DIR}/`],
    { cwd: repo, encoding: 'utf8' });
  if (result.status !== 0) return [];
  return result.stdout.split('\0').map((line) => line.trim()).filter((line) => line.endsWith('.state.json'));
}

/** 커밋된 상태 파일을 지워 승인 이력을 없애지 못하게 한다. */
function assertNoDeletedStates(repo) {
  for (const relative of committedStateFiles(repo)) {
    if (!fs.existsSync(path.join(repo, relative))) {
      die('E_STATE_DELETED', `커밋된 상태 파일이 작업 트리에 없다: ${relative}\n  `
        + '삭제로 승인 이력을 지울 수 없다. 복원한 뒤 다시 실행할 것');
    }
  }
}

/** PASS는 HEAD에 커밋된 사실이어야 한다. 손으로 쓴 상태 파일을 막는 유일한 장치다. */
function assertPassCommitted(repo, state) {
  const relative = stateRelative(state.taskId);
  const committed = committedBytes(repo, relative);
  if (committed === null) {
    die('E_PASS_UNCOMMITTED', `PASS 상태 파일이 HEAD에 없다: ${relative}\n  `
      + 'PASS는 저장소가 공유하는 사실이어야 한다. 상태 파일을 커밋한 뒤 verify할 것');
  }
  if (!committed.equals(fs.readFileSync(path.join(repo, relative)))) {
    die('E_PASS_MODIFIED', `PASS 상태 파일이 HEAD의 내용과 다르다: ${relative}\n  `
      + '커밋 뒤에 상태 파일을 고칠 수 없다');
  }
}

/** PASS 이후 승인 범위에서 바뀐 경로. 죽지 않고 목록만 돌려준다. */
function passDrift(repo, state) {
  const now = scopedSnapshot(snapshot(repo, new Set([stateRelative(state.taskId)])), state.allowedPaths);
  return changedPaths(state.approvedSnapshot || {}, now);
}

function verifyPassSnapshot(repo, state) {
  if (state.status !== 'PASS' || !state.approvedSnapshot) {
    die('E_NOT_PASS', `${state.taskId}는 검증 가능한 PASS 상태가 아니다`);
  }
  // 빈 범위의 PASS는 **영원히 drift가 나지 않는다** — scopedSnapshot이 전부 걸러내므로
  // 저장소를 통째로 바꿔도 verify가 통과하고 다음 task까지 열어 준다. 커밋만 하면 되는
  // 위조의 가장 값싼 형태였다(독립 검토 실측). 범위 없는 승인은 승인이 아니다.
  if (!Array.isArray(state.allowedPaths) || !state.allowedPaths.length) {
    die('E_EMPTY_SCOPE', `${state.taskId} PASS에 allowedPaths가 없다 — 범위 없는 승인은 무효다`);
  }
  if (!Object.keys(state.approvedSnapshot).length) {
    die('E_EMPTY_SCOPE', `${state.taskId} PASS의 approvedSnapshot이 비어 있다 — 봉인된 파일이 없다`);
  }
  assertPassCommitted(repo, state);
  const now = scopedSnapshot(snapshot(repo, new Set([stateRelative(state.taskId)])), state.allowedPaths);
  const drift = changedPaths(state.approvedSnapshot, now);
  if (drift.length) {
    die('E_PASS_DRIFT', `${state.taskId} PASS 이후 승인 범위가 변경됐다: ${drift.join(', ')}`);
  }
}

function evidenceFile(repo, value, allowed, prior = []) {
  const relative = repoRelative(repo, value, 'evidence');
  if (!matchesAllowed(relative, allowed)) {
    die('E_SCOPE', `evidence가 선언된 허용 범위 밖이다: ${relative}`);
  }
  if (prior.includes(relative)) die('E_EVIDENCE_REUSE', `단계별 증거 파일은 서로 달라야 한다: ${relative}`);
  let text;
  try { text = fs.readFileSync(path.join(repo, relative), 'utf8').trim(); }
  catch (error) { die('E_EVIDENCE', `증거 파일을 읽을 수 없다: ${relative}: ${error.message}`); }
  if (!text) die('E_EVIDENCE', `증거 파일이 비어 있다: ${relative}`);
  return relative;
}

function assertScope(repo, state) {
  const now = snapshot(repo, new Set([stateRelative(state.taskId)]));
  const changed = changedPaths(state.baselineSnapshot, now);
  const outside = changed.filter((file) => !matchesAllowed(file, state.allowedPaths));
  if (outside.length) die('E_SCOPE', `선언하지 않은 파일 변경: ${outside.join(', ')}`);
  return { now, changed };
}

function printUsage() {
  console.log(`Usage:
  node scripts/skill_task_gate.mjs start --task-id <id> --implementer <id> --target <path> --allow <path> [--allow <path> ...]
  node scripts/skill_task_gate.mjs advance --task-id <id> --to <state> [--evidence <file>] [--comparison MATCH] [--reviewer <id>]
  node scripts/skill_task_gate.mjs verify --task-id <id>
  node scripts/skill_task_gate.mjs status --task-id <id>

States: ${STATES.join(' -> ')}
Use --repo <path> only for an alternate repository or test fixture.`);
}

const [command, ...rest] = process.argv.slice(2);
if (command === '--help' || command === '-h') { printUsage(); process.exit(0); }
const args = parseArgs(rest);
if (!command || args.help) { printUsage(); process.exit(command ? 0 : 1); }
const repo = path.resolve(args.repo || SCRIPT_ROOT);
if (!fs.existsSync(path.join(repo, '.git'))) die('E_REPO', `git 저장소가 아니다: ${repo}`);
const taskId = normalizeTaskId(args.taskId);
const file = statePath(repo, taskId);

if (command === 'start') {
  if (fs.existsSync(file)) die('E_TASK_EXISTS', `이미 존재하는 task-id다: ${taskId}`);
  if (!args.implementer) die('E_IMPLEMENTER', '--implementer가 필요하다');
  if (!args.allow.length) die('E_ALLOWLIST', '--allow 경로가 하나 이상 필요하다');
  if (!args.target.length) die('E_TARGET', '--target 구현 경로가 하나 이상 필요하다');

  assertNoDeletedStates(repo);
  const existing = listStates(repo);
  const active = existing.find(({ state }) => state.status !== 'PASS');
  if (active) die('E_ACTIVE_TASK', `미완료 작업 ${active.state.taskId} (${active.state.status})이 있어 새 작업을 시작할 수 없다`);

  // supersede 대상은 **검증 전에** 정한다. 순서를 반대로 두었더니, drift가 난 PASS가 새 작업을
  // 전부 막고 그 유일한 해소 수단(supersede)까지 막았다 — 게이트가 영구 교착이었다(실측).
  // 대상이 PASS 상태인지는 여전히 확인한다.
  const supersedes = [...new Set(args.supersede.map(normalizeTaskId))].sort();
  for (const id of supersedes) {
    const target = existing.find(({ state }) => state.taskId === id)?.state;
    if (!target || target.status !== 'PASS') die('E_SUPERSEDE', `supersede 대상이 유효한 PASS가 아니다: ${id}`);
  }
  const supersedingNow = new Set(supersedes);

  const supersededByPass = new Set(existing.flatMap(({ state }) => state.status === 'PASS' ? (state.supersedes || []) : []));
  for (const { state } of existing) {
    if (state.status !== 'PASS') continue;
    if (supersededByPass.has(state.taskId) || supersedingNow.has(state.taskId)) continue;
    verifyPassSnapshot(repo, state);
  }

  // supersede로 넘어가는 drift는 **지우지 않고 기록한다.** 그래야 "왜 저 승인이 대체됐는지"가
  // 커밋된 상태 파일에 남아 검토 가능하다. 조용히 넘어가면 승인 이력이 세탁된다.
  const supersededDrift = {};
  for (const id of supersedes) {
    const target = existing.find(({ state }) => state.taskId === id)?.state;
    const drift = passDrift(repo, target);
    if (drift.length) {
      supersededDrift[id] = drift;
      console.log(`[SKILL_TASK_GATE:SUPERSEDE_DRIFT] ${id}의 승인 범위가 바뀐 채로 대체된다: ${drift.join(', ')}`);
    }
  }

  const allowedPaths = [...new Set(args.allow.map((entry) => repoRelative(repo, entry, 'allow')))].sort();
  const targetPaths = [...new Set(args.target.map((entry) => repoRelative(repo, entry, 'target')))].sort();
  const outsideTargets = targetPaths.filter((target) => !matchesAllowed(target, allowedPaths));
  if (outsideTargets.length) die('E_TARGET', `target이 allowlist 밖이다: ${outsideTargets.join(', ')}`);
  const baselineSnapshot = snapshot(repo, new Set([stateRelative(taskId)]));
  const state = {
    schemaVersion: 1,
    taskId,
    implementer: String(args.implementer),
    status: 'PLANNED',
    allowedPaths,
    targetPaths,
    supersedes,
    supersededDrift,
    baselineHead: git(repo, ['rev-parse', 'HEAD']),
    baselineSnapshot,
    evidence: {},
    history: [{ from: null, to: 'PLANNED', at: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeState(file, state);
  console.log(`[SKILL_TASK_GATE:OK] ${taskId} PLANNED — 구현 ${targetPaths.length}개 / 허용 ${allowedPaths.length}개`);
  process.exit(0);
}

if (!fs.existsSync(file)) die('E_TASK_MISSING', `상태 파일이 없다: ${taskId}`);
const state = readState(file);

if (command === 'status') {
  console.log(JSON.stringify({ taskId, status: state.status, targetPaths: state.targetPaths,
    allowedPaths: state.allowedPaths, evidence: state.evidence }, null, 2));
  process.exit(0);
}

if (command === 'verify') {
  assertNoDeletedStates(repo);
  if (state.status === 'PASS') {
    const otherPass = listStates(repo).find(({ state: candidate }) => candidate.status === 'PASS'
      && (candidate.supersedes || []).includes(taskId));
    if (otherPass) {
      console.log(`[SKILL_TASK_GATE:SUPERSEDED] ${taskId} → ${otherPass.state.taskId}`);
      process.exit(0);
    }
    verifyPassSnapshot(repo, state);
  } else {
    assertScope(repo, state);
  }
  console.log(`[SKILL_TASK_GATE:OK] ${taskId} ${state.status}`);
  process.exit(0);
}

if (command !== 'advance') die('E_COMMAND', `알 수 없는 명령: ${command}`);
const target = String(args.to || '').toUpperCase();
const currentIndex = STATES.indexOf(state.status);
if (STATES[currentIndex + 1] !== target) {
  die('E_ORDER', `${state.status} 다음에는 ${STATES[currentIndex + 1] || '없음'}만 가능하다; 요청: ${target || '(없음)'}`);
}
const scoped = assertScope(repo, state);
if (target === 'IMPLEMENTED' && !scoped.changed.some((changed) => matchesAllowed(changed, state.targetPaths || []))) {
  die('E_NO_CHANGE', 'IMPLEMENTED로 진행할 구현 target 변경이 없다');
}
if (target === 'DOCUMENTED') {
  state.evidence.documentation = evidenceFile(repo, args.evidence, state.allowedPaths);
}
if (target === 'SKILL_COMPARED') {
  if (String(args.comparison || '').toUpperCase() !== 'MATCH') {
    die('E_COMPARISON', 'SKILL_COMPARED에는 --comparison MATCH가 필요하다');
  }
  state.evidence.skillComparison = evidenceFile(repo, args.evidence, state.allowedPaths,
    [state.evidence.documentation]);
  state.evidence.comparisonVerdict = 'MATCH';
}
if (target === 'REVIEWED') {
  if (!args.reviewer || String(args.reviewer).toLowerCase() === String(state.implementer).toLowerCase()) {
    die('E_REVIEWER', 'reviewer는 implementer와 다른 ID여야 한다');
  }
  state.evidence.review = evidenceFile(repo, args.evidence, state.allowedPaths,
    [state.evidence.documentation, state.evidence.skillComparison]);
  state.evidence.reviewer = String(args.reviewer);
}
if (target === 'PASS') {
  for (const key of ['documentation', 'skillComparison', 'review', 'reviewer']) {
    if (!state.evidence[key]) die('E_PASS_EVIDENCE', `PASS에 필요한 증거가 없다: ${key}`);
  }
  state.approvedSnapshot = scopedSnapshot(scoped.now, state.allowedPaths);
  state.passedAt = new Date().toISOString();
}
state.history.push({ from: state.status, to: target, at: new Date().toISOString() });
state.status = target;
state.updatedAt = new Date().toISOString();
writeState(file, state);
console.log(`[SKILL_TASK_GATE:OK] ${taskId} ${target}`);
