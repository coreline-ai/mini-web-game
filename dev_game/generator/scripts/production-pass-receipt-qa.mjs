#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { productionGateProfile } from './lib/production-gate-profile.mjs';
import { depsInstallArgs } from './lib/npm-install.mjs';
import { browserLaunchArgs, classifyPageError } from './lib/browser-boot-diagnostics.mjs';
import {
  POLISH_ELIGIBLE_STATES, assertSnapshotUnchanged, beginGateSnapshot, canonicalSnapshot,
  invalidatePassReceipt,
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
// fixture는 진짜 git 저장소다 — 아래 "legacy-pass 폐지" 대조군이 증거 파일을 실제로 커밋해
// 옛 자격 조건을 재현하기 때문이다.
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

  // ── canonical snapshot: 열거하지 않은 입력도 전부 봉인된다 ──
  // 열거 방식이던 판은 vite.config.js·lockfile·scripts/·docs/를 놓쳤다. 설정을 바꿔도
  // 영수증이 stale이 되지 않았다(실측). 이제 포함이 기본값이고 생성 출력만 제외한다.
  for (const [label, rel] of [
    ['vite config', 'vite.config.js'],
    ['lockfile', 'package-lock.json'],
    ['build script', 'scripts/build.mjs'],
    ['planning doc', 'docs/01-GDD.md'],
    ['asset plan', 'asset-plan.json'],
    ['index.html', 'index.html'],
    ['qa input', 'qa/capture-matrix.json'],
  ]) {
    const file = path.join(v2, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `// ${label}\n`);
    expect(verifyPassReceipt(v2), {
      state: 'stale', label: `snapshot covers ${label}`,
      fingerprint: /project inputs changed since the gate ran/,
    });
    fs.rmSync(file);
  }

  // 파일 삭제·rename도 감지해야 한다.
  fs.renameSync(path.join(v2, 'src', 'main.js'), path.join(v2, 'src', 'renamed.js'));
  expect(verifyPassReceipt(v2), {
    state: 'stale', label: 'snapshot detects rename',
    fingerprint: /project inputs changed since the gate ran/,
  });
  fs.renameSync(path.join(v2, 'src', 'renamed.js'), path.join(v2, 'src', 'main.js'));

  // 제외 이름이 **중첩 경로**에 있으면 게임 내용이다. basename으로만 걸던 판은
  // `src/dist/data.json` 같은 경로를 지문에서 통째로 지워, 거기 둔 코드를 PASS 뒤에
  // 마음대로 바꿔도 영수증이 유효했다(독립 검토 실측). Vite는 그런 경로도 import한다.
  for (const rel of ['src/dist/data.json', 'src/node_modules/x.js', 'src/coverage/c.js',
    'src/.vite/v.js', 'assets/qa-captures/a.js', 'src/PRODUCTION-DEMO-NOT-VERIFIED.json',
    'src/.playwright-cli/p.js']) {
    const file = path.join(v2, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'payload\n');
    expect(verifyPassReceipt(v2), {
      state: 'stale', label: `nested exclusion name is content: ${rel}`,
      fingerprint: /project inputs changed since the gate ran/,
    });
    fs.rmSync(file);
  }

  // 생성 출력은 제외된다 — 빌드했다고 영수증이 stale이 되면 게이트를 통과할 수 없다.
  for (const dir of ['dist', 'qa-captures', '.playwright-cli', 'node_modules']) {
    fs.mkdirSync(path.join(v2, dir), { recursive: true });
    fs.writeFileSync(path.join(v2, dir, 'output.txt'), 'generated\n');
  }
  check(verifyPassReceipt(v2).state === 'pass',
    'generated output directories must not change the snapshot');

  // 루트의 symlink된 생성 디렉터리는 게이트를 막으면 안 된다(pnpm·workspace 배치).
  // 제외 판정이 symlink 검사보다 앞에 있어야 한다.
  const nmTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'nm-target-'));
  fs.writeFileSync(path.join(nmTarget, 'pkg.js'), 'x\n');
  for (const name of ['node_modules', 'dist']) {
    // 앞의 생성-출력 대조군이 같은 이름의 실디렉터리를 남겨 둔다. 먼저 치운다.
    fs.rmSync(path.join(v2, name), { recursive: true, force: true });
    fs.symlinkSync(nmTarget, path.join(v2, name));
    check(verifyPassReceipt(v2).state === 'pass',
      `symlinked ${name} at root must not break the snapshot`);
    fs.rmSync(path.join(v2, name));
  }
  fs.rmSync(nmTarget, { recursive: true, force: true });

  // symlink는 봉인할 수 없다. 조용히 넘어가지 않고 snapshot 생성 자체를 실패시킨다.
  const linked = makeProject('symlinked');
  fs.symlinkSync(path.join(linked, 'src', 'main.js'), path.join(linked, 'src', 'alias.js'));
  let symlinkError = null;
  try { canonicalSnapshot(linked); } catch (error) { symlinkError = error; }
  check(symlinkError?.code === 'E_SNAPSHOT_SYMLINK',
    `symlink must fail snapshot creation (got ${symlinkError?.code || 'no error'})`);
  fs.rmSync(path.join(linked, 'src', 'alias.js'));

  // TOCTOU: QA 도중 입력이 바뀌면 영수증을 쓰지 않는다.
  const begun = beginGateSnapshot(v2);
  check(assertSnapshotUnchanged(begun, 'probe') === begun.digest, 'unchanged snapshot must verify');
  fs.writeFileSync(path.join(v2, 'src', 'main.js'), 'export const version = 99;\n');
  let driftError = null;
  try { assertSnapshotUnchanged(begun, 'probe'); } catch (error) { driftError = error; }
  check(driftError?.code === 'E_SNAPSHOT_DRIFT',
    `mid-QA change must be detected (got ${driftError?.code || 'no error'})`);
  let writerError = null;
  try { writePassReceipt(v2, { gateProfile: 'custom-loop-full', spec: v2spec, verified: begun }); }
  catch (error) { writerError = error; }
  check(writerError?.code === 'E_SNAPSHOT_DRIFT',
    `writer must re-check the snapshot before writing (got ${writerError?.code || 'no error'})`);
  fs.writeFileSync(path.join(v2, 'src', 'main.js'), 'export const version = 1;\n');
  // 표식은 지문이 아니라 별도 조건이다 — 지문에 들어가면 시작/종료 digest가 항상 달라진다.
  fs.writeFileSync(path.join(v2, 'PRODUCTION-DEMO-NOT-VERIFIED.json'), '{}\n');
  check(canonicalSnapshot(v2) === begun.digest, 'the not-verified marker must not enter the snapshot');
  fs.rmSync(path.join(v2, 'PRODUCTION-DEMO-NOT-VERIFIED.json'));

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
  expect(verifyPassReceipt(bare), {
    state: 'unknown', label: 'no receipt',
    fingerprint: /no production-demo PASS receipt/,
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

  // ── legacy-pass 폐지: 옛 자격을 **전부** 갖춘 게임도 이제 unknown이다 ──
  // 2026-08-19까지는 (1) 동결 allowlist 등재 + (2) 커밋된 `qa-evidence/<id>-<date>.md` 두 조건을
  // 모두 만족하면 영수증 없이도 polish 진입이 허용됐다(`legacy-pass`). 이 대조군은 그 두 조건을
  // **일부러 전부 만족시킨 뒤** unknown을 요구한다. allowlist 파일을 fixture에 되살려 두는 것이
  // 핵심이다 — 파일이 있어도 어떤 코드도 그것을 읽지 않는다는 것이 증명 대상이기 때문이다.
  // 이것이 무너지면 "게이트를 통과한 현재 영수증만 polish를 허용한다"는 규칙에 예외가 생긴다.
  const formerLegacy = makeProject('legacy-evidence');
  fs.writeFileSync(path.join(evidenceDir, 'legacy-pass-allowlist.json'),
    `${JSON.stringify({ schemaVersion: 1, frozenAt: '2026-08-17', games: [{ id: 'legacy-evidence' }] }, null, 2)}\n`);
  commitEvidence('legacy-evidence-2026-08-01.md');
  expect(verifyPassReceipt(formerLegacy), {
    state: 'unknown', label: 'former legacy-pass shape: allowlist entry + committed evidence',
    fingerprint: /no production-demo PASS receipt/,
  });

  // ── 미검증 표식: 영수증 없음은 이기고, 유효한 현재 영수증에는 진다 ──
  // 앞의 판은 표식을 **모든 것보다** 앞에 두었다. 그러면 `make-game`의
  // clearIncompleteMarker가 "검증 → !ok면 throw" 순서라서 표식을 영원히 못 지운다(교착).
  // 게이트를 통과했다는 유효한 영수증은 표식보다 강한 증거다.
  const marked = makeProject('marked-unverified');
  check(verifyPassReceipt(marked).state === 'unknown', 'marker fixture must start unknown');
  fs.writeFileSync(path.join(marked, 'PRODUCTION-DEMO-NOT-VERIFIED.json'), '{"reason":"gate not run"}\n');
  expect(verifyPassReceipt(marked), {
    state: 'invalid', label: 'PRODUCTION-DEMO-NOT-VERIFIED marker over a missing receipt',
    fingerprint: /PRODUCTION-DEMO-NOT-VERIFIED\.json/,
  });
  writePassReceipt(marked, { gateProfile: 'compatibility', spec: { schemaVersion: '1.0.0' } });
  expect(verifyPassReceipt(marked), {
    state: 'pass', label: 'valid receipt outranks a stale marker (no deadlock)',
    fingerprint: /PASS receipt is current/,
  });

  // ── 없는 프로젝트는 라이브러리 수준에서도 자격이 없다 ──
  // CLI에만 두면 make-game 같은 직접 호출자가 검사를 우회한다.
  expect(verifyPassReceipt(path.join(root, 'dev_game', 'generated', 'never-created')), {
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
// 같은 지문을 공유하는 컨트롤이 여럿인 것은 정상이다(v1/v2 둘 다 pass, unknown 두 경로).
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
// 영수증만 지우면 실패한 실행이 게임을 unknown으로 되돌린다 — "통과하지 못했다"가 "모른다"로
// 희석된다. 표식을 함께 남겨야 한다.
check(gateSource.indexOf('fs.writeFileSync(notVerifiedMarker') > 0
  && gateSource.indexOf('fs.writeFileSync(notVerifiedMarker') < gateSource.indexOf("'factory:qa'"),
  'production gate must write the not-verified marker before the first gate');
check(gateSource.indexOf('fs.rmSync(notVerifiedMarker') > gateSource.lastIndexOf('customLoopFullQa'),
  'production gate must remove the not-verified marker only after every gate passed');
check(makeSource.indexOf('verifyPassReceipt(projectDir)') < makeSource.indexOf('fs.unlinkSync(file)'),
  'make-game must verify the receipt before removing the incomplete marker');
// 포트에 응답이 있다는 것과 **내 서버가 응답한다**는 것은 다르다. 실측(2026-08-19): 전날 세션이
// 남긴 다른 게임의 프리뷰가 포트를 잡고 있어 브라우저 게이트가 남의 dist를 검사한 뒤 영수증이
// 발급됐다. 신원 확인이 브라우저 게이트보다 **앞**이어야 그 통과가 무엇을 본 것인지 말할 수 있다.
const clfSource = fs.readFileSync(path.join(scriptsDir, 'custom-loop-full-qa.mjs'), 'utf8');
for (const [label, source, firstBrowserGate] of [
  ['production-gate', gateSource, 'visualLayoutQa'],
  ['custom-loop-full-qa', clfSource, 'captured-state-qa.mjs'],
]) {
  const guard = source.indexOf('assertPreviewServesProject(');
  check(guard > 0, `${label} must verify the preview serves this project's dist`);
  check(guard > 0 && guard < source.lastIndexOf(firstBrowserGate),
    `${label} must verify preview identity before the first browser gate`);
  check(/--strictPort/.test(source), `${label} must pin the preview port with --strictPort`);
  check(/stderr\?\.on\('data'/.test(source), `${label} must keep the preview stderr instead of discarding it`);
}
// 검사가 아니라 **정리**가 빠져 있으면 오염은 계속 만들어진다. production-gate의 run()은 실패 시
// process.exit()을 부르고 그 경로는 try/finally를 건너뛰므로, 실패한 게이트마다 프리뷰가 고아로
// 남았다(실측 2026-08-19). 종료 경로 전부를 덮는 exit 훅이 첫 브라우저 게이트보다 앞에 있어야 한다.
// ── 게이트가 지문 입력을 스스로 바꾸지 못하게 한다 ──────────────────────────
// `npm install`은 lockfile을 고칠 권한이 있고, 실제로 고쳤다(실측 2026-08-19: castle-archer의
// 게이트 실행이 optional peer 항목 2개를 지웠다). lockfile은 canonical snapshot에 포함되므로
// 그 실행은 **자기가 바꾼 상태를 봉인**하고, 트리가 정리되는 순간 영수증이 stale이 된다.
// 그것이 오늘 stale 2건의 원인이었다. lockfile이 있으면 읽기 전용인 `npm ci`를 쓴다.
{
  const lockRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-install-args-'));
  try {
    check(depsInstallArgs(lockRoot).join(' ') === 'install --silent',
      'lockfile이 없는 프로젝트(즉석 스캐폴드)는 npm install로 생성해야 한다');
    fs.writeFileSync(path.join(lockRoot, 'package-lock.json'), '{"lockfileVersion":3}\n');
    check(depsInstallArgs(lockRoot).join(' ') === 'ci --silent',
      'lockfile이 있는 프로젝트는 npm ci로 설치해야 한다 — install은 지문 입력을 바꾼다');
  } finally {
    fs.rmSync(lockRoot, { recursive: true, force: true });
  }
}
for (const [label, source] of [['production-gate', gateSource], ['custom-loop-full-qa', clfSource]]) {
  check(!/\['install', '--silent'\]/.test(source),
    `${label} must not run npm install on a game (it rewrites package-lock.json, which the receipt fingerprint covers)`);
}
check(/depsInstallArgs\(projectDir\)/.test(gateSource),
  'production gate must install through the shared deterministic-install contract');

// ── 브라우저 게이트가 자기 실패를 설명해야 한다 ─────────────────────────────
// 실측(2026-08-20): 씬 대기가 `.catch(() => {})`로 침묵하고 다음 검사가 "레지스트리가 비었다"만
// 보고했다. 그 공백을 사람이 추측으로 메웠고(메모리 압력·뷰포트 크기·텍스처 총량), 세 추측이
// 모두 재측정에서 배제됐다. 계측을 붙인 첫 실패에서 원인이 한 줄로 나왔다 —
// `rafTicks=725 loop=stopped frame=0`: 브라우저는 프레임을 주는데 Phaser 루프가 시작되지 않았다.
{
  const savedGl = process.env.GAME_QA_GL;
  try {
    delete process.env.GAME_QA_GL;
    check(browserLaunchArgs().includes('--use-angle=swiftshader'),
      '기본 소프트웨어 GL 경로는 ANGLE이어야 한다 (실측: gl 9/10 vs angle 22/22)');
    process.env.GAME_QA_GL = 'gl';
    check(browserLaunchArgs().includes('--use-gl=swiftshader'),
      'GAME_QA_GL=gl로 옛 경로를 되돌릴 수 있어야 한다 — 비교 측정이 불가능하면 원인을 확정할 수 없다');
  } finally {
    if (savedGl === undefined) delete process.env.GAME_QA_GL; else process.env.GAME_QA_GL = savedGl;
  }
  check(classifyPageError('Framebuffer status: Framebuffer Unsupported') === 'rendererWarning',
    'swiftshader 드라이버 메시지는 렌더러 경고로 분류해야 한다 (게임들의 자체 어댑터와 같은 분류)');
  check(classifyPageError('TypeError: x is not a function') === 'error',
    '실제 페이지 오류는 error로 남아야 한다');
}
for (const [label, file] of [['visual-layout-qa', 'visual-layout-qa.mjs'], ['scene-composite-qa', 'scene-composite-qa.mjs']]) {
  const source = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
  check(/browserLaunchArgs\(\)/.test(source) && !/--use-gl=swiftshader/.test(source),
    `${label}은 공용 실행 인자를 써야 한다 — 하드코딩하면 GL 경로를 비교 측정할 수 없다`);
  check(/awaitScene\(page, /.test(source),
    `${label}은 씬 대기 실패를 계측해야 한다 (침묵하는 .catch로 두면 원인을 추측하게 된다)`);
  check(/installFrameCounter\(page\)/.test(source),
    `${label}은 프레임 카운터를 주입해야 한다 — rafTicks가 "프레임 없음"과 "루프 미시작"을 가른다`);
  check(/writeDiagnostics\(/.test(source), `${label}은 진단을 파일로 남겨야 한다`);
}

const exitHook = gateSource.indexOf("process.on('exit', killPreviewGroup)");
check(exitHook > 0, 'production gate must register an exit-time preview cleanup (run() calls process.exit and skips finally)');
check(exitHook > 0 && exitHook < gateSource.lastIndexOf('visualLayoutQa'),
  'production gate must register the exit-time cleanup before the first browser gate');



if (failures.length) {
  console.error('production PASS receipt QA failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('production PASS receipt QA OK: v1/v2 profiles, tracked receipt path, '
  + 'pass/stale/invalid/unknown, src+asset staleness, '
  + 'forgery/schema/JSON/unverified-marker positives, retired legacy-pass '
  + '(allowlist entry + committed evidence must stay unknown), fingerprint exclusivity, '
  + 'gate-start invalidation, gate/make wiring, preview identity guard, preview exit cleanup, '
  + 'deterministic install (lockfile → npm ci), browser boot diagnostics (ANGLE 기본 · 대기 계측 · 잡음 분류)');
