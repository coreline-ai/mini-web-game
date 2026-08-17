#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { productionGateProfile } from './lib/production-gate-profile.mjs';
import {
  POLISH_ELIGIBLE_STATES, invalidatePassReceipt, legacyPassEvidence,
  passReceiptPath, projectFingerprint, verifyPassReceipt, writePassReceipt,
} from './lib/production-pass-receipt.mjs';

// production-demo PASS 영수증의 계측 검증.
//
// 계약 §0.1: 검사기의 출력은 **음성 대조군(정상 입력에 GREEN)과 양성 대조군(알려진 불량에
// RED)을 모두 통과하기 전에는 증거가 아니다.** 아래 컨트롤은 상태 하나마다 그 쌍을 만든다.
// exit code만 보는 컨트롤은 검사기 자체를 fail-open으로 만들기 때문에, 모든 RED 컨트롤은
// **실패 사유 지문**까지 함께 확인한다. 그리고 지문끼리 겹치면 서로 다른 결함을 같은 것으로
// 착각하므로, 마지막에 지문 상호 배타성을 기계로 교차 대조한다.

const failures = [];
function check(condition, message) { if (!condition) failures.push(message); }

/** RED 컨트롤: 상태 + 지문 + ok=false 를 한꺼번에 본다. */
const seenReasons = [];
function expect(result, { state, fingerprint, label }) {
  seenReasons.push({ label, reason: result.reason, fingerprint });
  check(result.state === state, `${label}: state must be ${state} (got ${result.state})`);
  check(result.ok === POLISH_ELIGIBLE_STATES.includes(state), `${label}: ok must follow polish eligibility`);
  check(fingerprint.test(result.reason || ''), `${label}: reason fingerprint ${fingerprint} (got "${result.reason}")`);
}

// ── 게이트 프로필 ────────────────────────────────────────────────────────────
check(productionGateProfile({ schemaVersion: '1.0.0' }) === 'compatibility', 'v1 auto profile');
for (const buildDecision of ['custom-loop', 'hybrid', 'archetype-start']) {
  check(productionGateProfile({ schemaVersion: '2.0.0', buildDecision }) === 'custom-loop-full',
    `v2 ${buildDecision} must use custom-loop-full`);
}
try {
  productionGateProfile({ schemaVersion: '2.0.0', buildDecision: 'hybrid' }, 'compatibility');
  failures.push('v2 compatibility must throw');
} catch (error) {
  check(/cannot use compatibility/.test(error.message), 'v2 compatibility failure reason');
}

// ── fixture ──────────────────────────────────────────────────────────────────
// 실제 배치를 그대로 흉내 낸다: `<root>/dev_game/generated/<id>`. 그래야 정본 영수증이
// `<root>/dev_game/docs/qa-evidence/` 안에 떨어지고, fixture 정리로 전부 지워진다.
// tmpdir 바로 아래에 만들면 영수증이 fixture 밖으로 새어 나가 지워지지 않는다.
// legacy-pass는 **커밋된** 증거만 받으므로 fixture도 진짜 git 저장소여야 한다.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'production-pass-receipt-'));
const evidenceDir = path.join(root, 'dev_game', 'docs', 'qa-evidence');
fs.mkdirSync(evidenceDir, { recursive: true });
function git(...argv) {
  const r = spawnSync('git', ['-c', 'user.email=qa@fixture', '-c', 'user.name=qa',
    '-c', 'commit.gpgsign=false', ...argv], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${argv.join(' ')} 실패: ${r.stderr || r.stdout}`);
}
git('init', '-q', '-b', 'main');
function makeProject(id) {
  const dir = path.join(root, 'dev_game', 'generated', id);
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"fixture"}\n');
  fs.writeFileSync(path.join(dir, 'assets', 'asset-manifest.json'), '{"assets":[]}\n');
  fs.writeFileSync(path.join(dir, 'assets', 'hero.png'), 'PNG-v1\n');
  fs.writeFileSync(path.join(dir, 'src', 'main.js'), 'export const version = 1;\n');
  return dir;
}
// 동결 allowlist를 fixture에 심는다. 목록에 없는 게임은 증거가 있어도 legacy-pass가 아니다.
// **덧붙이기**다. 덮어쓰기로 두었더니 뒤쪽 컨트롤이 앞쪽 fixture의 자격을 조용히 빼앗아,
// 대조군이 의도한 결함이 아니라 fixture 설정 때문에 붉어졌다.
const allowlisted = [];
function allowlist(...ids) {
  for (const id of ids) if (!allowlisted.includes(id)) allowlisted.push(id);
  fs.writeFileSync(path.join(evidenceDir, 'legacy-pass-allowlist.json'),
    `${JSON.stringify({ schemaVersion: 1, frozenAt: '2026-08-17', games: allowlisted.map((id) => ({ id })) }, null, 2)}\n`);
}
/** 증거 파일을 쓰고 **커밋까지** 한다. commit 없이 쓰기만 하면 증거로 세면 안 된다. */
function commitEvidence(name) {
  fs.writeFileSync(path.join(evidenceDir, name), '# QA\n');
  git('add', '--', path.join('dev_game', 'docs', 'qa-evidence', name));
  git('commit', '-q', '-m', `evidence ${name}`);
}
function writeSessionReport(dir, runId) {
  fs.mkdirSync(path.join(dir, 'qa-captures'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'qa-captures', 'qa-session-report.json'),
    `${JSON.stringify({ runId }, null, 2)}\n`);
}

try {
  // 영수증 경로는 추적되는 qa-evidence 아래여야 한다. gitignored `qa-captures/`에 두었던
  // 첫 판은 게임 19개 중 0개만 영수증을 갖게 만들었고 game-polish를 도달 불가로 만들었다.
  const pathProbe = makeProject('path-probe');
  const expectedReceipt = path.join(root, 'dev_game', 'docs', 'qa-evidence', 'path-probe-production-pass.json');
  check(passReceiptPath(pathProbe) === expectedReceipt,
    `receipt must live in tracked docs/qa-evidence (got ${passReceiptPath(pathProbe)})`);

  // ── 음성 대조군 1: v1 compatibility. 세션 리포트가 없는 것이 **정상**이다 ──
  // 이 컨트롤이 없던 동안, 모든 영수증에 qaRunId를 요구하는 변경이 v1 게임의
  // `--gate full`을 마지막 줄에서 깨뜨렸다(make-game clearIncompleteMarker throw).
  const v1 = makeProject('v1-game');
  writePassReceipt(v1, { gateProfile: 'compatibility', spec: { schemaVersion: '1.0.0' } });
  expect(verifyPassReceipt(v1), {
    state: 'pass', label: 'v1 compatibility receipt', fingerprint: /PASS receipt is current/,
  });

  // ── 음성 대조군 2: v2 custom-loop-full + 일치하는 세션 리포트 ──
  const v2 = makeProject('v2-game');
  writeSessionReport(v2, 'run-2026-08-17-abc');
  const v2spec = { schemaVersion: '2.0.0', buildDecision: 'hybrid' };
  const written = writePassReceipt(v2, { gateProfile: 'custom-loop-full', spec: v2spec });
  check(fs.existsSync(written.output), 'receipt must be written');
  check(written.receipt.qaRunId === 'run-2026-08-17-abc', 'receipt must capture the QA session runId');
  expect(verifyPassReceipt(v2), {
    state: 'pass', label: 'v2 receipt with session report', fingerprint: /PASS receipt is current/,
  });

  // ── 양성 대조군 1: stale — 프로젝트가 바뀌었다 ──
  fs.writeFileSync(path.join(v2, 'src', 'main.js'), 'export const version = 2;\n');
  expect(verifyPassReceipt(v2), {
    state: 'stale', label: 'changed source', fingerprint: /project inputs changed since the gate ran/,
  });
  fs.writeFileSync(path.join(v2, 'src', 'main.js'), 'export const version = 1;\n');

  // ── 양성 대조군 1-b: 아트를 다시 만들어도 stale이어야 한다 ──
  // manifest만 해싱하던 판은 자산 바이너리 변경을 전혀 보지 못했다(manifest에 자산별 해시가
  // 없다). 그래서 PASS 뒤 스프라이트를 통째로 갈아도 영원히 pass였다.
  fs.writeFileSync(path.join(v2, 'assets', 'hero.png'), 'PNG-v2-regenerated\n');
  expect(verifyPassReceipt(v2), {
    state: 'stale', label: 'regenerated art', fingerprint: /project inputs changed since the gate ran/,
  });
  fs.writeFileSync(path.join(v2, 'assets', 'hero.png'), 'PNG-v1\n');

  // ── 양성 대조군 2: 세션 리포트 runId 불일치 ──
  writeSessionReport(v2, 'run-different');
  expect(verifyPassReceipt(v2), {
    state: 'invalid', label: 'session runId mismatch',
    fingerprint: /but qa-captures\/qa-session-report\.json/,
  });

  // ── 양성 대조군 3: 위조 — 게이트를 돌린 적 없는 손으로 쓴 v2 영수증 ──
  // qa-captures/는 추적되지 않으므로 검토자가 볼 수 없다. 세션 리포트 교차 검증은 위조의
  // **문턱을 올릴 뿐 닫지 못한다**(서명/CI 발급이 없다). 여기서 닫히는 것은 "세션 없이 쓴
  // custom-loop-full 영수증"뿐이며, 그 사실을 컨트롤로 고정해 둔다.
  const forged = makeProject('forged-game');
  fs.mkdirSync(path.dirname(passReceiptPath(forged)), { recursive: true });
  fs.writeFileSync(passReceiptPath(forged), `${JSON.stringify({
    schemaVersion: 2, status: 'PASS', gateProfile: 'custom-loop-full',
    projectFingerprint: 'deadbeef', generatedAt: '2026-08-17T00:00:00.000Z',
  })}\n`);
  expect(verifyPassReceipt(forged), {
    state: 'invalid', label: 'forged v2 receipt without a QA session',
    fingerprint: /has no qaRunId/,
  });

  // ── 양성 대조군 4: 구 스키마(v1 영수증)는 거부 ──
  fs.writeFileSync(passReceiptPath(forged), `${JSON.stringify({
    schemaVersion: 1, status: 'PASS', gateProfile: 'compatibility',
    projectFingerprint: 'deadbeef', generatedAt: '2026-08-17T00:00:00.000Z',
  })}\n`);
  expect(verifyPassReceipt(forged), {
    state: 'invalid', label: 'schemaVersion 1 receipt', fingerprint: /incomplete production-demo PASS receipt/,
  });

  // ── 양성 대조군 5: 깨진 JSON ──
  fs.writeFileSync(passReceiptPath(forged), '{broken');
  expect(verifyPassReceipt(forged), {
    state: 'invalid', label: 'broken receipt JSON', fingerprint: /invalid PASS receipt JSON/,
  });

  // ── unknown: 영수증도 없고 완료 기록도 없다 ──
  const bare = makeProject('bare-game');
  check(legacyPassEvidence(bare).length === 0, 'bare project must have no legacy evidence');
  expect(verifyPassReceipt(bare), {
    state: 'unknown', label: 'no receipt, no evidence',
    fingerprint: /no production-demo PASS receipt and no committed/,
  });

  // ── 양성 대조군 6: gateProfile 위조 ──
  // spec과 대조하지 않으면 v2 프로젝트 영수증에 `"gateProfile": "compatibility"` 한 단어만
  // 넣어 세션 교차 검증을 통째로 건너뛸 수 있다. 위조 문턱을 올렸다는 이 파일의 주장이
  // 한 단어로 무너지는 구멍이었다.
  const v2Weakened = makeProject('v2-weakened');
  fs.mkdirSync(path.join(v2Weakened, 'src', 'game', 'data'), { recursive: true });
  fs.writeFileSync(path.join(v2Weakened, 'src', 'game', 'data', 'game-spec.json'),
    `${JSON.stringify({ schemaVersion: '2.0.0', buildDecision: 'hybrid' })}\n`);
  for (const claimed of ['compatibility', 'anything-at-all']) {
    fs.writeFileSync(passReceiptPath(v2Weakened), `${JSON.stringify({
      schemaVersion: 2, status: 'PASS', gateProfile: claimed,
      projectFingerprint: projectFingerprint(v2Weakened), generatedAt: '2026-08-17T00:00:00.000Z',
    })}\n`);
    expect(verifyPassReceipt(v2Weakened), {
      state: 'invalid', label: `v2 receipt claiming gateProfile "${claimed}"`,
      fingerprint: /but this project requires at least/,
    });
  }

  // ── legacy-pass: 동결 allowlist + **커밋된** qa-evidence/<id>-<date>.md ──
  const legacy = makeProject('legacy-evidence');
  allowlist('legacy-evidence', 'uncommitted-evidence', 'staged-evidence', 'marked-unverified');
  commitEvidence('legacy-evidence-2026-08-01.md');
  check(legacyPassEvidence(legacy).includes('qa-evidence/legacy-evidence-2026-08-01.md'),
    'legacy evidence must list the committed qa-evidence summary');
  expect(verifyPassReceipt(legacy), {
    state: 'legacy-pass', label: 'allowlisted + committed evidence',
    fingerprint: /frozen legacy allowlist with committed/,
  });

  // ── 양성 대조군 7: allowlist에 없는 게임은 증거가 있어도 legacy-pass가 아니다 ──
  // 목록이 닫혀 있지 않으면 스킬이 빌드 중에 쓰는 요약 파일이 곧 자격증이 된다 —
  // 게이트가 실패한 빌드가 스스로 polish 자격을 발급하는 순환이다.
  const notListed = makeProject('not-listed');
  commitEvidence('not-listed-2026-08-01.md');
  check(legacyPassEvidence(notListed).length === 0,
    'a game outside the frozen allowlist must not become legacy-pass by writing evidence');
  expect(verifyPassReceipt(notListed), {
    state: 'unknown', label: 'evidence but not on the allowlist',
    fingerprint: /no production-demo PASS receipt and no committed/,
  });

  // ── 양성 대조군 8: 커밋하지 않은 / stage만 한 증거는 세지 않는다 ──
  // `git ls-files`는 **인덱스**를 읽으므로 `git add`만 해도 통과한다. `git ls-tree HEAD`여야
  // 커밋된 트리만 본다. 두 경우를 다 건다.
  const uncommitted = makeProject('uncommitted-evidence');
  fs.writeFileSync(path.join(evidenceDir, 'uncommitted-evidence-2026-08-01.md'), '# QA\n');
  check(legacyPassEvidence(uncommitted).length === 0, 'unstaged evidence must not count');
  expect(verifyPassReceipt(uncommitted), {
    state: 'unknown', label: 'unstaged evidence file',
    fingerprint: /no production-demo PASS receipt and no committed/,
  });
  const staged = makeProject('staged-evidence');
  fs.writeFileSync(path.join(evidenceDir, 'staged-evidence-2026-08-01.md'), '# QA\n');
  git('add', '--', path.join('dev_game', 'docs', 'qa-evidence', 'staged-evidence-2026-08-01.md'));
  check(legacyPassEvidence(staged).length === 0, 'staged-but-uncommitted evidence must not count');
  expect(verifyPassReceipt(staged), {
    state: 'unknown', label: 'staged-but-uncommitted evidence',
    fingerprint: /no production-demo PASS receipt and no committed/,
  });

  // ── 양성 대조군 9: 접두사 충돌 ──
  // `startsWith(`${id}-`)`이면 `legacy`가 `legacy-evidence-2026-08-01.md`를 제 증거로 삼는다.
  const prefix = makeProject('legacy');
  allowlist('legacy');
  check(legacyPassEvidence(prefix).length === 0,
    'a game id that prefixes another must not inherit its evidence');
  expect(verifyPassReceipt(prefix), {
    state: 'unknown', label: 'prefix-colliding game id',
    fingerprint: /no production-demo PASS receipt and no committed/,
  });

  // ── 미검증 표식: legacy는 이기고, 유효한 현재 영수증에는 진다 ──
  // 앞의 판은 표식을 **모든 것보다** 앞에 두었다. 그러면 `make-game`의
  // clearIncompleteMarker가 "검증 → !ok면 throw" 순서라서 표식을 영원히 못 지운다(교착).
  // 게이트를 통과했다는 유효한 영수증은 표식보다 강한 증거다.
  const marked = makeProject('marked-unverified');
  commitEvidence('marked-unverified-2026-08-01.md');
  check(verifyPassReceipt(marked).state === 'legacy-pass', 'marker fixture must start legacy-pass');
  fs.writeFileSync(path.join(marked, 'PRODUCTION-DEMO-NOT-VERIFIED.json'), '{"reason":"gate not run"}\n');
  expect(verifyPassReceipt(marked), {
    state: 'invalid', label: 'PRODUCTION-DEMO-NOT-VERIFIED marker over legacy',
    fingerprint: /PRODUCTION-DEMO-NOT-VERIFIED\.json/,
  });
  writePassReceipt(marked, { gateProfile: 'compatibility', spec: { schemaVersion: '1.0.0' } });
  expect(verifyPassReceipt(marked), {
    state: 'pass', label: 'valid receipt outranks a stale marker (no deadlock)',
    fingerprint: /PASS receipt is current/,
  });

  // ── 없는 프로젝트는 라이브러리 수준에서도 자격이 없다 ──
  // CLI에만 두면 make-game 같은 직접 호출자가 legacy-pass를 받는다.
  expect(verifyPassReceipt(path.join(root, 'dev_game', 'generated', 'legacy-evidence-deleted')), {
    state: 'unknown', label: 'missing project directory', fingerprint: /project directory not found/,
  });

  // ── 게이트 시작 시 무효화 ──
  const invalidated = invalidatePassReceipt(v2);
  check(invalidated.removed === true, 'invalidatePassReceipt must remove an existing receipt');
  check(!fs.existsSync(passReceiptPath(v2)), 'invalidated receipt file must be gone');
  check(invalidatePassReceipt(v2).removed === false, 'invalidating twice must be a no-op');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

// ── 지문 상호 배타성 ─────────────────────────────────────────────────────────
// 지문 하나가 여러 사유에 걸리면 서로 다른 결함이 같은 것으로 보고된다. 하나 고칠 때마다
// 전수 재대조가 필요하므로 여기서 기계로 돌린다.
// 같은 지문을 공유하는 컨트롤이 여럿인 것은 정상이다(v1/v2 둘 다 pass, legacy-pass 두 경로).
// 위반은 **다른** 지문의 사유까지 걸리는 경우다 — 그때 두 결함이 한 결함으로 보고된다.
for (const probe of seenReasons) {
  const foreign = seenReasons.filter((other) => String(other.fingerprint) !== String(probe.fingerprint)
    && probe.fingerprint.test(other.reason || ''));
  check(foreign.length === 0,
    `fingerprint ${probe.fingerprint} (${probe.label}) also matches a different failure mode: ${foreign.map((h) => h.label).join(', ')}`);
}

// ── 호출부 배선 ──────────────────────────────────────────────────────────────
const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
const gateSource = fs.readFileSync(path.join(scriptsDir, 'production-gate.mjs'), 'utf8');
const makeSource = fs.readFileSync(path.join(scriptsDir, 'make-game.mjs'), 'utf8');
check(gateSource.lastIndexOf('writePassReceipt(') > gateSource.lastIndexOf('customLoopFullQa'),
  'production gate must write the receipt after the custom-loop gate');
// 실패한 실행이 지난 PASS를 남기면 status가 GREEN을 보고한다. 무효화는 첫 게이트보다 앞이어야 한다.
check(gateSource.indexOf('invalidatePassReceipt(projectDir)') > 0
  && gateSource.indexOf('invalidatePassReceipt(projectDir)') < gateSource.indexOf("'factory:qa'"),
  'production gate must invalidate the previous receipt before the FIRST gate (factory:qa), not just before production-demo-qa');
// 영수증만 지우면 실패한 실행이 게임을 legacy-pass로 **승격**시킨다. 표식을 함께 남겨야 한다.
check(gateSource.indexOf('fs.writeFileSync(notVerifiedMarker') > 0
  && gateSource.indexOf('fs.writeFileSync(notVerifiedMarker') < gateSource.indexOf("'factory:qa'"),
  'production gate must write the not-verified marker before the first gate');
check(gateSource.indexOf('fs.rmSync(notVerifiedMarker') > gateSource.lastIndexOf('customLoopFullQa'),
  'production gate must remove the not-verified marker only after every gate passed');
check(makeSource.indexOf('verifyPassReceipt(projectDir)') < makeSource.indexOf('fs.unlinkSync(file)'),
  'make-game must verify the receipt before removing the incomplete marker');

if (failures.length) {
  console.error('production PASS receipt QA failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('production PASS receipt QA OK: v1/v2 profiles, tracked receipt path, '
  + 'pass/legacy-pass/stale/invalid/unknown, src+asset staleness, '
  + 'forgery/schema/JSON/unverified-marker positives, committed-only legacy evidence '
  + '(uncommitted + prefix-collision negatives), fingerprint exclusivity, '
  + 'gate-start invalidation, gate/make wiring');
