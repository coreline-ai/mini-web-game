import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionGateProfile } from './production-gate-profile.mjs';
import { assertArgv, isMainModule } from './cli-contract.mjs';

// production-demo PASS 영수증 — 첫 PASS 경계를 기계로 판정한다.
//
// ── 왜 추적 경로에 쓰는가 ────────────────────────────────────────────────────
// 첫 판은 `<project>/qa-captures/production-demo-pass.json`에 썼다. 그런데 생성 게임의
// `.gitignore:4`가 `qa-captures/`를 통째로 무시한다. 실측(2026-08-17): 게임 19개 중 영수증을
// 가진 것이 **0개**였고, 그 결과 `game-polish`가 어떤 요청도 받을 수 없었다 — 모든 후보정이
// factory로 되돌아갔다. 첫 PASS는 **저장소가 공유하는 사실**이지 한 사람의 로컬 상태가 아니다.
// 그래서 정본을 추적되는 `dev_game/docs/qa-evidence/<game-id>-production-pass.json`으로 옮겼다.
//
// ── 왜 두 상태가 아니라 다섯 상태인가 ───────────────────────────────────────
// 첫 판은 "영수증이 있다/없다" 둘로만 갈랐고, **없음을 실패와 같이 취급**했다. 그건 틀렸다.
// 영수증이 없는 것은 "게이트를 통과하지 못했다"가 아니라 **"모른다"**다. 영수증 제도가
// 생기기 전에 만들어진 게임들은 `dev_game/docs/qa-evidence/`에 완료 기록을 갖고 있다.
// 그 게임들을 factory로 돌려보내는 것은 사실과 다르다.
//
//   pass        영수증이 현재 프로젝트와 일치한다
//   legacy-pass 동결된 allowlist에 있고 커밋된 QA 기록이 있다 (영수증 제도 이전 게임)
//   stale       영수증이 있는데 프로젝트가 그 뒤로 바뀌었다
//   invalid     영수증이 깨졌거나, 미검증 표식이 있거나, gateProfile이 spec과 어긋나거나,
//               custom-loop-full 영수증인데 QA 세션 증거가 없다
//   unknown     영수증도 없고 allowlist 자격도 없다
//
// pass와 legacy-pass만 polish 진입을 허용한다(exit 0). 나머지는 factory다.
//
// ── legacy-pass는 왜 "닫힌 목록"인가 ────────────────────────────────────────
// 첫 판은 "완료 기록 파일이 있으면 legacy-pass"였다. 그건 **자기 자신을 인증하는 규칙**이다:
// `game-factory`와 `game-polish` 둘 다 빌드 도중에 그 요약 파일을 쓰라고 지시하고, 그 지시는
// 게이트 통과 여부와 무관하다. 즉 실패한 빌드가 스스로 polish 자격을 발급할 수 있었다.
// 파일을 `06-FINAL-QA-SUMMARY.md`에서 `qa-evidence/`로 바꾸는 것으로는 이 순환이 닫히지
// 않는다 — 어느 쪽이든 스킬이 쓰는 파일이다. (실제로 `iron-courier-last-line`의 유일한
// 증거는 polish 세션이 만든 `-polish-02.md`다.)
//
// 그래서 legacy-pass는 파일 존재 여부가 아니라 **동결된 목록**으로 정한다:
// `dev_game/docs/qa-evidence/legacy-pass-allowlist.json`. 이 목록은 영수증 제도가 생긴 시점에
// 이미 존재하던 게임만 담고 **늘어나지 않는다.** 새 게임은 legacy-pass가 될 수 없고 반드시
// 영수증을 벌어야 한다. 목록에 있어도 HEAD에 커밋된 증거 파일이 사라지면 자격도 사라진다.
//
// (정정: 이전 판 주석은 게임 안 `docs/06-FINAL-QA-SUMMARY.md`가 "추적되지 않는다"고 적었다.
// 그건 skybreak-gunship 한 개를 재고 일반화한 것이고 **틀렸다** — `dev_game/.gitignore`에
// 게임별 un-ignore 목록이 있어 17개 중 15개는 추적된다. 그 파일을 증거에서 뺀 진짜 이유는
// 추적 여부가 아니라 위의 순환이다.)
//
// ── legacy-pass의 한계를 정직하게 ───────────────────────────────────────────
// legacy-pass에는 지문이 없다. **그 게임이 그 뒤로 바뀌었는지 알 수 없다** — stale 판정은
// 영수증을 가진 게임에만 성립한다. 그러니 legacy-pass는 "지금도 통과 상태"가 아니라
// "통과한 적이 있고, 현재성은 증명되지 않았다"는 뜻이다. 이건 일회성 다리다: 다음 게이트
// 실행이 성공하면 pass로, 실패하면 미검증 표식이 남아 invalid로 바뀌며 영구히 사라진다.
//
// ── 위조에 대해 정직하게 ─────────────────────────────────────────────────────
// `projectFingerprint`는 공개 파일의 공개 해시다. 서명도 비밀값도 없으므로 **암호학적으로
// 위조 불가능하지 않다.** 실측으로 확인된 사실이다 — 게이트를 한 번도 돌리지 않고 손으로 쓴
// 영수증이 통과했다.
//
// 아래 `qaRunId` + `qa-session-report.json` 교차 검증은 그 문턱을 올린다: 위조하려면 QA 세션
// 보고서까지 함께 지어내야 하고, 그건 추적되지 않는 로컬 파일이라 검토자가 볼 수 없다.
// **문턱을 올릴 뿐 닫지는 못한다.** 진짜로 닫으려면 서명 키나 CI 발급이 필요하고, 그건 이
// 저장소가 아직 갖고 있지 않다. 그 사실을 여기 적어 둔다 — 모르는 채로 신뢰하는 것보다 낫다.
//
// ── 왜 qaRunId를 v2에만 요구하는가 ──────────────────────────────────────────
// 처음엔 모든 영수증에 `qaRunId`를 요구했다. 실측하니 **v1 게임 전부가 깨졌다**:
// `compatibility` 프로필은 `qa-captures/qa-session-report.json`을 만들지 않는데,
// `make-game`의 `clearIncompleteMarker`가 `!ok`에서 throw하므로 v1의 `--gate full`이
// 마지막 줄에서 실패했다. 없는 증거를 요구하는 검사는 대상이 아니라 검사가 틀린 것이다.
// 그래서 교차 검증은 그 산출물을 **실제로 만드는** `custom-loop-full` 프로필에만 건다.

/** polish 진입을 허용하는 상태. 나머지(stale/invalid/unknown)는 factory로 라우팅한다. */
export const POLISH_ELIGIBLE_STATES = ['pass', 'legacy-pass'];

function fileSha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// ── canonical snapshot ───────────────────────────────────────────────────────
// 목록을 **열거**하던 판은 열거하지 않은 입력을 보지 못했다. 실측(2026-08-17): `src`, `qa`,
// `assets`, `package.json`, `index.html`만 해싱해서 `vite.config.js`, lockfile, `scripts/`,
// `docs/`, `asset-plan.json`을 놓쳤다 — Vite 설정을 바꿔도 영수증이 stale이 되지 않았다.
// 그래서 **포함을 기본값**으로 뒤집고, 생성 출력만 이름으로 제외한다.
//
// 제외는 **경로**로 판정한다. basename으로 판정하던 판은 `src/dist/data.json`,
// `src/node_modules/x.js`, `assets/qa-captures/a.js`, `src/PRODUCTION-DEMO-NOT-VERIFIED.json`을
// 전부 지문에서 지웠다(실측). Vite는 그런 경로에서도 import하므로, 임의의 게임 코드를 거기
// 두면 PASS 뒤에 마음대로 바꿔도 영수증이 그대로 유효했다.
//
//   루트 한정  생성 도구가 프로젝트 루트에만 만드는 것들
//   어느 깊이  진짜로 어디에 있든 내용이 아닌 것 (.git, OS 부산물)
const SNAPSHOT_EXCLUDED_ROOT_DIRS = new Set([
  'node_modules', 'dist', 'qa-captures', '.playwright-cli', 'coverage', '.vite',
]);
const SNAPSHOT_EXCLUDED_ANY_DIRS = new Set(['.git']);
// 미검증 표식은 지문이 아니라 **별도의 invalid 조건**이다. 지문에 넣으면 표식을 남기는 것만으로
// 지문이 바뀌어, 게이트 시작과 종료의 digest가 항상 달라진다. 루트의 그 파일만 해당한다.
const SNAPSHOT_EXCLUDED_ROOT_FILES = new Set(['PRODUCTION-DEMO-NOT-VERIFIED.json']);
const SNAPSHOT_EXCLUDED_ANY_FILES = new Set(['.DS_Store']);

export class SnapshotError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// 이름만 본다. `entry.isDirectory()`로 갈랐더니 **symlink된 디렉터리는 isDirectory()가 false**라
// 제외 판정을 빠져나가 symlink 가드에 걸렸다 — pnpm 배치의 `node_modules` 하나로 게이트가
// 완주 불가능했다(실측). 제외 이름은 대상이 실디렉터리든 링크든 똑같이 제외한다.
function isExcluded(name, atRoot) {
  if (SNAPSHOT_EXCLUDED_ANY_DIRS.has(name) || SNAPSHOT_EXCLUDED_ANY_FILES.has(name)) return true;
  return atRoot && (SNAPSHOT_EXCLUDED_ROOT_DIRS.has(name) || SNAPSHOT_EXCLUDED_ROOT_FILES.has(name));
}

function walkSnapshot(root, relative, out) {
  const dir = path.join(root, relative);
  const atRoot = !relative;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    // 제외 판정이 symlink 검사보다 **앞**이다. 뒤에 두었더니 pnpm·workspace 배치에서 흔한
    // symlink된 `node_modules`/`dist`가 snapshot 생성을 실패시켜 게이트를 완주할 수 없었다.
    if (isExcluded(entry.name, atRoot)) continue;
    if (entry.isSymbolicLink()) {
      // 링크 문자열만 봉인하면 대상이 바뀌어도 지문이 그대로다. 프로젝트 밖을 가리키면
      // 애초에 봉인할 수 없다. 조용히 넘어가는 대신 snapshot 생성 자체를 실패시킨다.
      throw new SnapshotError('E_SNAPSHOT_SYMLINK',
        `canonical snapshot에 symlink가 있다: ${rel}\n  `
        + '링크는 봉인할 수 없다. 실제 파일로 바꾸거나 루트의 제외 디렉터리로 옮길 것');
    }
    if (entry.isDirectory()) walkSnapshot(root, rel, out);
    else if (entry.isFile()) out.push(rel);
  }
}

/**
 * 프로젝트 root 아래 **모든** regular file의 digest. 경로는 POSIX 상대경로로 정규화하고
 * UTF-8 byte 오름차순으로 정렬한 뒤 `F\0<path>\0<sha256>\n` record를 이어 붙여 해싱한다.
 * 같은 함수를 QA 시작·QA 종료·writer 직전·verify가 함께 쓴다.
 */
export function canonicalSnapshot(projectDir) {
  const files = [];
  walkSnapshot(projectDir, '', files);
  files.sort((a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')));
  const hash = crypto.createHash('sha256');
  for (const rel of files) {
    hash.update('F\0').update(rel, 'utf8').update('\0')
      .update(fileSha256(path.join(projectDir, rel))).update('\n');
  }
  return hash.digest('hex');
}

/** 이전 이름. 호출부가 많아 유지하되 구현은 canonical snapshot 하나다. */
export function projectFingerprint(projectDir) {
  return canonicalSnapshot(projectDir);
}

/** 프로젝트가 속한 dev_game 루트. 추적 경로를 계산하는 데 쓴다. */
function devGameRoot(projectDir) {
  let dir = path.resolve(projectDir);
  for (let i = 0; i < 8; i += 1) {
    if (path.basename(dir) === 'dev_game') return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // generated/<id> 밖에서 부르는 경우(임시 fixture 등) — 프로젝트 옆에 둔다.
  return path.resolve(projectDir, '..', '..');
}

/** 정본 영수증 경로. **추적되는** qa-evidence 아래다. */
export function passReceiptPath(projectDir) {
  return path.join(devGameRoot(projectDir), 'docs', 'qa-evidence',
    `${path.basename(path.resolve(projectDir))}-production-pass.json`);
}

export const CLI_CONTRACT_ID = 'factory:production-pass-status';

/** 부팅 경로와 parity harness가 같은 계약을 쓴다. 부작용 없음. */
export function parseCliArgs(argv) { assertArgv(CLI_CONTRACT_ID, argv); return { project: argv[argv.indexOf('--project') + 1] }; }

export const LEGACY_ALLOWLIST_RELATIVE = 'docs/qa-evidence/legacy-pass-allowlist.json';

/**
 * legacy-pass 자격. 두 조건을 **모두** 만족해야 한다.
 *   1. 동결된 allowlist에 있는 게임 id다 (제도 이전 게임의 닫힌 집합)
 *   2. HEAD에 커밋된 `qa-evidence/<id>-<YYYY-MM-DD>*.md`가 실제로 있다
 *
 * `git ls-files`가 아니라 `git ls-tree HEAD`를 쓴다 — 전자는 **인덱스**를 읽어서
 * `git add`만 해도 통과한다(커밋 없이 라우팅이 바뀐다). 후자는 커밋된 트리만 본다.
 * 파일명에 날짜를 요구하는 이유: 단순 접두사 매칭이면 `sky`가 `sky-archer-2026-07-09.md`를
 * 제 증거로 삼아 태어나자마자 legacy-pass가 된다.
 */
export function legacyPassEvidence(projectDir) {
  const devGame = devGameRoot(projectDir);
  const gameId = path.basename(path.resolve(projectDir));
  let allow;
  try { allow = JSON.parse(fs.readFileSync(path.join(devGame, LEGACY_ALLOWLIST_RELATIVE), 'utf8')); }
  catch { return []; }
  if (!(allow.games || []).some((entry) => entry.id === gameId)) return [];

  const evidenceDir = path.join(devGame, 'docs', 'qa-evidence');
  const pattern = new RegExp(`^${gameId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}-\\d{2}-\\d{2}.*\\.md$`);
  let committed = [];
  try {
    committed = execFileSync('git', ['ls-tree', '--name-only', 'HEAD', '--', '.'],
      { cwd: evidenceDir, encoding: 'utf8' })
      .split('\n').map((line) => line.trim()).filter(Boolean);
  } catch { return []; } // git 저장소가 아니거나 커밋이 없으면 공유된 사실을 증명할 수 없다
  return committed
    .filter((name) => pattern.test(name) && fs.existsSync(path.join(evidenceDir, name)))
    .map((name) => `qa-evidence/${name}`)
    .sort();
}

/** 게이트 진입 시 호출한다. 실패한 실행이 이전 PASS를 남기지 못하게 한다. */
export function invalidatePassReceipt(projectDir) {
  const file = passReceiptPath(projectDir);
  if (!fs.existsSync(file)) return { removed: false, file };
  fs.rmSync(file);
  return { removed: true, file };
}

/**
 * 게이트가 검사를 시작하기 직전의 digest. 이 값을 들고 다니다가 종료 시점과 writer 직전에
 * 다시 대조한다. 그러지 않으면 **QA 도중에 바뀐 상태**가 봉인된다 — QA는 옛 파일을 보고
 * 영수증은 새 파일을 봉인하는 TOCTOU다.
 */
export function beginGateSnapshot(projectDir) {
  return { projectDir, digest: canonicalSnapshot(projectDir), at: new Date().toISOString() };
}

/** QA가 끝난 뒤 같은 digest인지 본다. 다르면 영수증을 쓰지 않는다. */
export function assertSnapshotUnchanged(begun, stage) {
  const now = canonicalSnapshot(begun.projectDir);
  if (now !== begun.digest) {
    throw new SnapshotError('E_SNAPSHOT_DRIFT',
      `${stage}: QA가 검사한 snapshot이 그 사이 바뀌었다\n  `
      + `시작 ${begun.digest.slice(0, 16)} / 현재 ${now.slice(0, 16)}\n  `
      + 'QA가 본 것과 다른 상태를 봉인할 수 없다. 게이트를 처음부터 다시 돌릴 것');
  }
  return now;
}

export function writePassReceipt(projectDir, { gateProfile, spec = {}, verified = null } = {}) {
  // writer 직전 재대조. 게이트 종료와 쓰기 사이에도 시간이 있다.
  if (verified) assertSnapshotUnchanged(verified, 'writePassReceipt');
  const output = passReceiptPath(projectDir);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  let qaSession = null;
  const qaSessionPath = path.join(projectDir, 'qa-captures', 'qa-session-report.json');
  try { qaSession = JSON.parse(fs.readFileSync(qaSessionPath, 'utf8')); } catch {}
  const receipt = {
    schemaVersion: 2,
    status: 'PASS',
    gateProfile,
    gameSpecVersion: spec.schemaVersion || null,
    buildDecision: spec.buildDecision || null,
    projectFingerprint: projectFingerprint(projectDir),
    qaRunId: qaSession?.runId || null,
    generatedAt: new Date().toISOString(),
  };
  const temp = `${output}.tmp-${process.pid}`;
  fs.writeFileSync(temp, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.renameSync(temp, output);
  return { output, receipt };
}

export function verifyPassReceipt(projectDir) {
  const file = passReceiptPath(projectDir);

  // 없는 프로젝트에 legacy 자격을 주면 안 된다. CLI에만 두었던 검사를 라이브러리로 올린다 —
  // make-game 같은 호출자는 CLI를 거치지 않는다.
  if (!fs.existsSync(projectDir)) {
    return { ok: false, state: 'unknown', file, reason: `project directory not found: ${projectDir}` };
  }

  if (!fs.existsSync(file)) {
    // 미검증 표식은 영수증이 **없을 때만** 판정을 뒤집는다. 유효한 현재 영수증은 게이트가
    // 실제로 통과했다는 더 강한 증거이고, 표식보다 우선한다. 이 순서가 아니면
    // `make-game`의 clearIncompleteMarker가 검증 → throw로 표식을 영원히 못 지운다(교착).
    const notVerified = path.join(projectDir, 'PRODUCTION-DEMO-NOT-VERIFIED.json');
    if (fs.existsSync(notVerified)) {
      return {
        ok: false, state: 'invalid', file,
        reason: 'project carries PRODUCTION-DEMO-NOT-VERIFIED.json — the last build did not clear the gate',
      };
    }
    // 영수증 없음 = 실패가 아니라 **모름**. 동결된 allowlist에 있고 커밋된 기록이 있으면 legacy-pass.
    const legacy = legacyPassEvidence(projectDir);
    if (legacy.length) {
      return {
        ok: true, state: 'legacy-pass', file, legacyEvidence: legacy,
        reason: 'no PASS receipt, but this game is on the frozen legacy allowlist with committed '
          + 'QA evidence. Not fingerprinted — it means "passed at some point", not "still current".',
      };
    }
    return {
      ok: false, state: 'unknown', file,
      reason: 'no production-demo PASS receipt and no committed QA completion evidence',
    };
  }

  let receipt;
  try { receipt = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) {
    return { ok: false, state: 'invalid', reason: `invalid PASS receipt JSON: ${error.message}`, file };
  }
  if (receipt.schemaVersion !== 2 || receipt.status !== 'PASS' || !receipt.gateProfile
    || !receipt.projectFingerprint || !receipt.generatedAt) {
    return { ok: false, state: 'invalid', reason: 'incomplete production-demo PASS receipt', file, receipt };
  }

  // gateProfile은 프로젝트의 spec과 대조한다. 이게 없으면 v2 프로젝트에 손으로 쓴 영수증에
  // `"gateProfile": "compatibility"` 한 단어만 넣어 세션 교차 검증을 통째로 건너뛸 수 있다.
  // v1을 `--mode custom-loop-full`로 더 세게 돌리는 것은 정상이므로 강화 방향만 허용한다.
  const specFile = path.join(projectDir, 'src', 'game', 'data', 'game-spec.json');
  let spec = {};
  try { spec = JSON.parse(fs.readFileSync(specFile, 'utf8')); } catch {}
  const autoProfile = productionGateProfile(spec);
  if (!['compatibility', 'custom-loop-full'].includes(receipt.gateProfile)
    || (autoProfile === 'custom-loop-full' && receipt.gateProfile !== 'custom-loop-full')) {
    return {
      ok: false, state: 'invalid', file, receipt,
      reason: `PASS receipt claims gateProfile "${receipt.gateProfile}" but this project requires `
        + `at least "${autoProfile}"`,
    };
  }

  // QA 실행 증거. custom-loop-full 프로필만 세션 리포트를 만들므로 거기에만 요구한다.
  if (receipt.gateProfile === 'custom-loop-full') {
    if (!receipt.qaRunId) {
      return {
        ok: false, state: 'invalid', file, receipt,
        reason: 'custom-loop-full PASS receipt has no qaRunId — nothing shows a QA session actually ran',
      };
    }
    const sessionPath = path.join(projectDir, 'qa-captures', 'qa-session-report.json');
    let session = null;
    try { session = JSON.parse(fs.readFileSync(sessionPath, 'utf8')); } catch {}
    if (!session || session.runId !== receipt.qaRunId) {
      return {
        ok: false, state: 'invalid', file, receipt,
        reason: `PASS receipt claims qaRunId ${receipt.qaRunId} but qa-captures/qa-session-report.json `
          + `${session ? `reports ${session.runId}` : 'is missing'}`,
      };
    }
  }

  const current = projectFingerprint(projectDir);
  if (receipt.projectFingerprint !== current) {
    return {
      ok: false, state: 'stale', file, receipt, current,
      reason: 'stale production-demo PASS receipt: project inputs changed since the gate ran',
    };
  }
  return { ok: true, state: 'pass', file, receipt, current, reason: 'production-demo PASS receipt is current' };
}

function resolveProject(projectArg) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const devGame = path.resolve(here, '..', '..', '..');
  const candidates = [
    path.resolve(process.cwd(), projectArg),
    path.resolve(devGame, projectArg),
    path.resolve(devGame, '..', projectArg),
  ];
  return candidates.find((candidate) => {
    try { return fs.statSync(candidate).isDirectory(); } catch { return false; }
  }) || candidates[0];
}

if (isMainModule(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: node production-pass-receipt.mjs --project <generated-game-dir>

Reports whether a game has passed its first production-demo gate.

  exit 0   pass         receipt matches the project as it stands now
                        (custom-loop-full receipts are additionally cross-checked
                        against qa-captures/qa-session-report.json; the v1
                        compatibility profile writes no session report, so a v1
                        receipt attests the gate run and nothing more)
           legacy-pass  on the frozen legacy-pass-allowlist.json AND has a committed
                        dev_game/docs/qa-evidence/<game-id>-<date>.md. The list
                        never grows. NOT fingerprinted — it means "passed at some
                        point", not "still current"
  exit 1   stale        receipt exists, project changed since it was written
           invalid      receipt broken, PRODUCTION-DEMO-NOT-VERIFIED.json present,
                        gateProfile weaker than the project's spec requires, or a
                        custom-loop-full receipt with no QA session behind it
           unknown      no receipt and no allowlist entitlement`);
    process.exit(0);
  }
  try { assertArgv(CLI_CONTRACT_ID, argv); }
  catch (error) { console.error(error.message); process.exit(1); }
  const index = argv.indexOf('--project');
  const projectDir = resolveProject(argv[index + 1]);
  // 없는 경로를 그대로 판정하면 `state: unknown`과 함께 **존재하지 않는 영수증 경로**를 찍어
  // 디버깅하는 사람을 헷갈리게 한다. 라우팅 결과(exit 1)는 같지만 이유를 정확히 말한다.
  if (!fs.existsSync(projectDir)) {
    console.log(JSON.stringify({
      ok: false, state: 'unknown', reason: `project directory not found: ${argv[index + 1]}`,
      resolved: projectDir, receipt: null,
    }, null, 2));
    process.exit(1);
  }
  const result = verifyPassReceipt(projectDir);
  console.log(JSON.stringify({ ...result, receipt: result.receipt || null }, null, 2));
  process.exit(result.ok ? 0 : 1);
}
