#!/usr/bin/env node
// check_skill_conformance.mjs — 계획이 자기 기준을 도중에 바꾸지 못하게 막는다.
//
// 왜 필요한가. 이 저장소의 반복된 실패는 "작업이 틀린 것"이 아니라 "작업에 맞춰 기준이
// 조용히 움직인 것"이었다. 구현자가 스스로 완료를 선언하고, 그 완료의 정의를 같은 사람이
// 같은 세션에서 고쳤다. 그러면 어떤 증거도 사후 합리화와 구분되지 않는다.
//
// 그래서 이 검사는 **구조만** 본다. 다이어트 품질이나 의미 정합성은 판정하지 않는다 —
// 그건 대상 파일을 편집하지 않은 독립 reviewer가 대조표로 한다. 여기서 보는 것은 넷이다.
//
//   1. 계획 본문 불변성   승인된 계획이 체크박스 말고 다른 데가 바뀌지 않았는가
//   2. 보고서 구조        각 Phase 보고서에 필수 절과 판정이 있는가
//   3. 선행 승인          Phase N이 PASS이려면 N-1이 PASS인가
//   4. 경로 소유권        dirty path가 현재 Phase까지의 허용 경로 안인가
//
// 전부 fail-closed다. 읽을 수 없거나 해석할 수 없으면 통과가 아니라 실패다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--plan') args.plan = argv[++i];
    else if (a === '--conformance-dir') args.dir = argv[++i];
    else if (a === '--repo-root') args.repoRoot = argv[++i];
    else if (a === '--status-file') args.statusFile = argv[++i];
    else if (a === '--committed-paths-file') args.committedPathsFile = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.plan) throw new Error('Missing required --plan <plan.md>');
  return args;
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage:
  node scripts/check_skill_conformance.mjs --plan <plan.md> [--conformance-dir <dir>]
       [--status-file <file>] [--committed-paths-file <file>]

계획 본문 불변성·Phase 보고서 구조·선행 승인·경로 소유권을 검사한다. 구조만 본다.
--status-file은 git status --porcelain=v1 --untracked-files=all 출력을 파일로 주입한다
(fixture로 범위 밖 변경을 시험할 때 저장소를 더럽히지 않기 위한 것이다).
--committed-paths-file은 baselineHead..HEAD의 변경 경로를 한 줄에 하나씩 주입한다.`);
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));
const PLAN = path.resolve(args.plan);
const planId = path.basename(PLAN).replace(/\.md$/, '');
const DIR = path.resolve(args.dir || path.join(ROOT, 'dev_game', 'docs', 'skill-conformance', planId));
const REPO = path.resolve(args.repoRoot || ROOT);

const problems = [];
function readOrFail(file, label) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    problems.push(`${label}을 읽을 수 없다: ${file}\n    ${err.message}`);
    return null;
  }
}
function readJsonOrFail(file, label) {
  const raw = readOrFail(file, label);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    problems.push(`${label}을 파싱할 수 없다: ${file}\n    ${err.message}`);
    return null;
  }
}

async function sha256(text) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(text).digest('hex');
}

// ── 1. 계획 본문 불변성 ───────────────────────────────────────────────────────
// 승인 후 허용되는 변경은 `[ ] → [x]` 하나뿐이다. 정규화 후 hash가 달라졌다면 본문이
// 바뀐 것이고, 그건 계획이 자기 기준을 움직인 것이다.
const planText = readOrFail(PLAN, '계획서');
const approval = readJsonOrFail(path.join(DIR, 'approved-plan.json'), '승인 파일');

if (planText !== null && approval) {
  for (const field of ['rawPlanSha256', 'normalizedPlanSha256', 'baselineHead', 'verdict', 'normalization']) {
    if (!approval[field]) problems.push(`승인 파일에 ${field}가 없다`);
  }
  if (approval.verdict !== 'APPROVE') {
    problems.push(`승인 파일의 verdict가 APPROVE가 아니다: ${approval.verdict}`);
  }
  // 정규화 방식은 **승인서가 소유한다.** 검사기가 더 나은 방식을 안다고 임의로 바꾸면
  // 기록된 hash와 어긋나고, 그건 구현자가 판정 기준을 움직인 것이다. 승인서가 선언한
  // 방식만 구현하고, 모르는 방식이면 통과가 아니라 실패다.
  //
  // (알려진 개선점: 현재 방식은 전역 치환이라 산문 안의 `[ ] → [x]` 설명까지 정규화한다.
  //  줄 시작 목록 표지로 좁히는 편이 정확하지만, 그러려면 승인서를 다시 발급해야 한다.
  //  Phase 6에서 유예 또는 재승인으로 처리할 것.)
  const GLOBAL_CHECKBOX = 'UTF-8 bytes with Markdown checkbox markers [x] and [X] '
    + 'normalized to [ ]; all other bytes unchanged';
  let normalized = null;
  if (!approval.normalization || approval.normalization === GLOBAL_CHECKBOX) {
    normalized = planText.replace(/\[x\]/g, '[ ]').replace(/\[X\]/g, '[ ]');
  } else {
    problems.push(`승인 파일이 선언한 정규화 방식을 구현하지 않았다: "${approval.normalization}"`);
  }
  if (normalized !== null) {
    const nowNorm = await sha256(normalized);
    if (nowNorm !== approval.normalizedPlanSha256) {
      problems.push('계획 본문이 승인 이후 변경됐다 (normalized hash 불일치).\n    '
        + `승인: ${approval.normalizedPlanSha256}\n    현재: ${nowNorm}\n    `
        + '체크박스 외의 변경은 계획 수정이므로 다시 승인받아야 한다');
    }
  }
}

// ── 2·3. Phase 보고서 구조와 선행 승인 ────────────────────────────────────────
const REQUIRED_SECTIONS = ['작업 전 계약', 'As-built', '증거', '판정'];
const VERDICTS = new Set(['PLANNED', 'IMPLEMENTING', 'EVIDENCE_READY', 'ADVERSARIAL_REVIEW', 'PASS', 'BLOCKED']);
// 템플릿 자리표시자가 남은 채로 PASS가 나오면 증거가 없는 PASS다.
const PLACEHOLDER = /\((?:EVIDENCE_READY|ADVERSARIAL_REVIEW)에서 작성\)/;

let reports = [];
try {
  reports = fs.readdirSync(DIR)
    .filter((f) => /^phase-\d+-.*\.md$/.test(f))
    .sort((a, b) => Number(/^phase-(\d+)/.exec(a)[1]) - Number(/^phase-(\d+)/.exec(b)[1]));
} catch (err) {
  problems.push(`conformance 디렉터리를 읽을 수 없다: ${DIR}\n    ${err.message}`);
}
if (!problems.length && !reports.length) {
  problems.push(`${DIR}에 phase-<N>-*.md 보고서가 하나도 없다 — 공허한 통과를 거부한다`);
}

// Phase 번호는 1부터다. `phase-0-*.md`로 이름 지으면 보고서는 존재하므로 "보고서가 없다"
// 검사를 통과하고, `currentPhase`가 0이 되어 **경로 소유권 블록 전체(dirty + committed)가
// 통째로 건너뛰어진다.** 범위 밖 변경이 양쪽 채널에 다 있어도 OK가 나온다. 침묵 SKIP이므로
// 여기서 이름부터 막는다.
for (const file of reports) {
  if (Number(/^phase-(\d+)/.exec(file)[1]) < 1) {
    problems.push(`Phase 번호는 1부터다: ${file}\n    `
      + 'phase-0-*.md는 경로 소유권 검사를 통째로 건너뛰게 만든다');
  }
}

const phases = [];
for (const file of reports) {
  const n = Number(/^phase-(\d+)/.exec(file)[1]);
  const text = readOrFail(path.join(DIR, file), file);
  if (text === null) continue;

  // 절 존재 검사는 **헤딩**을 본다. 단어 포함만 보면 `- 판정: \`PASS\`` 한 줄이
  // "판정 절이 있다"를 자기충족시키고, '증거'도 아무 문장에 들어 있으면 통과한다.
  for (const section of REQUIRED_SECTIONS) {
    const heading = new RegExp(`^#{2,4}\\s*[\\d.]*\\s*.*${section}`, 'm');
    if (!heading.test(text)) problems.push(`${file}: 필수 절 헤딩 "${section}"이 없다`);
  }
  // 판정 줄을 **통째로** 잡는다. 추출은 첫 줄에서 하면서 귀속 검사는 문서 전체를 훑으면
  // 둘의 대상이 어긋나, 무기명 판정이 문서 어딘가에 인용된 귀속 줄로 세탁된다
  // (독립 검토 5회차 P1-D). 같은 것을 보는 두 규칙은 같은 대상을 봐야 한다.
  const m = /^(-\s*판정:\s*`([A-Z_-]+)`.*)$/m.exec(text);
  if (!m) {
    problems.push(`${file}: 최종 판정 줄이 없다 (형식: - 판정: \`PASS\`)`);
    phases.push({ n, file, verdict: null, text });
    continue;
  }
  const verdictLine = m[1];
  const verdict = m[2];
  if (!VERDICTS.has(verdict)) problems.push(`${file}: 알 수 없는 판정 값 ${verdict}`);
  if (verdict === 'PASS' && PLACEHOLDER.test(text)) {
    problems.push(`${file}: PASS인데 템플릿 자리표시자가 남아 있다 — 증거 없는 PASS다`);
  }

  // `PASS`는 **발급자 귀속**을 동반해야 한다.
  //
  // 이 계획의 제1 규칙은 "구현자는 As-built를 쓰지만 PASS를 발급하지 않는다"인데(계획서
  // 186행, pipeline §6.2), 4회차까지 그것만 기계가 아니라 약속으로 남아 있었다. 그리고
  // 실제로 깨졌다 — 판정 줄의 기계적 잠금(manifest 자기참조)을 P0-3에서 푼 **직후에**
  // 구현자가 자기 자신에게 PASS를 발급했다. 잠금을 푸는 수정에는 그 자리를 대신할 규칙이
  // 따라왔어야 했다. (독립 검토 4회차 P0-4)
  //
  // 형식: - 판정: `PASS` — reviewer: <id>, round <n>, <date>
  //
  // 이 규칙은 발급자의 **진위를 검증하지 않으며 할 수도 없다.** `reviewer: me`도 통과한다.
  // 막는 것은 부주의·기본값·시험 잔재로 인한 **무기명 완료 선언**이고, 실제로 5회차에
  // 일어난 형태가 정확히 그것이다. 묵시적 통과를 명시적·귀속된 주장으로 바꿔서, 거짓말을
  // 하려면 흔적을 남기게 만든다. 진정성은 여전히 사람과 절차의 속성이다.
  if (verdict === 'PASS' && !/—\s*reviewer:\s*\S+/.test(verdictLine)) {
    problems.push(`${file}: PASS에 발급자 귀속이 없다.\n    `
      + `판정 줄: ${verdictLine.trim()}\n    `
      + '형식: - 판정: `PASS` — reviewer: <id>, round <n>, <date>\n    '
      + '구현자는 PASS를 발급하지 않는다. 귀속 없는 PASS는 자기 발급과 구분할 수 없다\n    '
      + '(귀속은 **같은 줄**에 있어야 한다 — 문서 어딘가의 인용된 귀속 줄로는 대신할 수 없다)');
  }
  phases.push({ n, file, verdict, text });
}

// 같은 Phase 번호의 보고서가 둘 이상이면 나중 것만 남아 사슬이 하나만 고정하고 나머지는
// 무보호가 된다. 어느 것이 그 Phase의 보고서인지 모호한 상태를 통과시키지 않는다.
{
  const seen = new Map();
  for (const p of phases) seen.set(p.n, (seen.get(p.n) || []).concat(p.file));
  for (const [n, list] of seen) {
    if (list.length > 1) {
      problems.push(`Phase ${n}의 보고서가 ${list.length}개다: ${list.join(', ')}\n    `
        + '어느 것이 그 Phase의 판정인지 모호하면 사슬이 하나만 고정하고 나머지는 무보호가 된다');
    }
  }
}

const byNumber = new Map(phases.map((p) => [p.n, p]));
for (const p of phases) {
  if (p.verdict !== 'PASS') continue;
  for (let prev = 1; prev < p.n; prev += 1) {
    const before = byNumber.get(prev);
    if (!before) {
      problems.push(`${p.file}: PASS인데 선행 Phase ${prev}의 보고서가 없다`);
    } else if (before.verdict !== 'PASS') {
      problems.push(`${p.file}: PASS인데 선행 Phase ${prev}가 ${before.verdict}다 — `
        + '선행 미승인 상태에서 다음 Phase를 닫을 수 없다');
    }
  }
}

// 현재 Phase = PASS가 아닌 가장 낮은 번호. 전부 PASS면 마지막.
const open = phases.filter((p) => p.verdict !== 'PASS').map((p) => p.n).sort((a, b) => a - b);
const currentPhase = open.length ? open[0] : Math.max(0, ...phases.map((p) => p.n));

// ── 3.5 이전 Phase 승인물의 hash 불변성 ───────────────────────────────────────
// 경로 소유권은 **누적**이다 — Phase 4 시점에는 Phase 1~4의 허용 경로가 전부 열려 있다.
// 앞 Phase가 남긴 변경이 커밋 전까지 계속 dirty로 보이기 때문에 그래야 한다.
//
// 그런데 그것만으로는 계획서가 금지한 것을 못 막는다. 독립 검토(2026-08-16)가 실측했다:
// Phase 1~3 PASS · Phase 4 진행 중 상태에서 `skills/game-factory/SKILL.md`(Phase 2 소유,
// 이미 승인됨)를 다시 고쳐도 GREEN이었다. 즉 "이전 PASS 파일 hash가 바뀌면 그 PASS를
// 무효화한다"는 규칙이 기계로 전혀 강제되지 않았다.
//
// 그래서 PASS한 Phase는 자기가 바꾼 파일의 hash manifest를 남기고, 이후 Phase는 그것을
// 깨뜨릴 수 없다. 깨뜨려야 한다면 그 Phase의 PASS를 무효화하고 다시 검토하는 것이 절차다.

// 고아 manifest — 승인 기록만 남고 증거가 사라진 상태.
// 독립 검토 2회차가 찾았다: PASS 보고서 `phase-1-x.md`만 지우면 그 Phase가 목록에서 사라져
// manifest 검사 자체가 건너뛰어지고 GREEN이 된다. 미추적 파일 삭제라 git 흔적도 남지 않는다.
// 승인 기록이 있는데 그 근거 보고서가 없으면 그건 통과가 아니라 증거 인멸이다.
try {
  for (const f of fs.readdirSync(DIR)) {
    const m = /^phase-(\d+)-approved-hashes\.json$/.exec(f);
    if (!m) continue;
    const n = Number(m[1]);
    if (!byNumber.has(n)) {
      problems.push(`고아 승인 기록: ${f}가 있는데 phase-${n}-*.md 보고서가 없다.\n    `
        + '승인 기록만 남고 증거가 사라졌다 — 무엇이 왜 승인됐는지 확인할 수 없다');
    }
  }
} catch { /* 디렉터리 읽기 실패는 위에서 이미 problem으로 남았다 */ }

for (const p of phases) {
  if (p.verdict !== 'PASS') continue;
  const manifestPath = path.join(DIR, `phase-${p.n}-approved-hashes.json`);
  const manifest = readJsonOrFail(manifestPath, `Phase ${p.n} 승인 hash manifest`);
  if (!manifest) continue; // readJsonOrFail이 이미 problem을 남겼다
  const files = manifest.files || {};
  if (!Object.keys(files).length) {
    problems.push(`Phase ${p.n} 승인 hash manifest에 files가 비어 있다 — `
      + '무엇이 승인됐는지 알 수 없으면 이후 Phase가 무엇을 깨뜨렸는지도 알 수 없다');
    continue;
  }

  // manifest는 **자기 자신과 자기 Phase 보고서를 담을 수 없다.**
  // 담으면 그 Phase를 닫는 행위 자체가 위반이 된다 — 판정 줄을 `EVIDENCE_READY`에서
  // `PASS`로 바꾸는 순간 보고서 hash가 달라져 "이전 PASS가 무효"가 뜬다. 도달해야 할
  // 종료 상태를 게이트가 거부하는 셈이다. 반대로 그때마다 manifest를 재발급하면 승인
  // 이후에 구현자가 승인 기록을 다시 쓰는 것이고, 그게 이 사슬이 막으려던 자기증명이다.
  // 사슬의 시작점은 자기 자신을 담을 수 없다. (독립 검토 3회차 P0-3)
  // 경로 비교는 소문자로 한다. 대소문자 무시 파일시스템(macOS)에서는 `PHASE-1-…`도 같은
  // 파일을 읽으므로, 대소문자를 구분하는 정규식은 규칙을 우회당한다.
  const selfNames = [new RegExp(`(^|/)phase-${p.n}-.*\\.md$`), new RegExp(`(^|/)phase-${p.n}-approved-hashes\\.json$`)];
  for (const rel of Object.keys(files)) {
    if (selfNames.some((re) => re.test(rel.toLowerCase()))) {
      problems.push(`Phase ${p.n} manifest가 자기 자신을 담고 있다: ${rel}\n    `
        + '자기 Phase의 보고서·manifest를 담으면 그 Phase를 닫을 수 없다 — '
        + '판정 줄을 고치는 순간 자기 위반이 된다');
    }
  }

  // N ≥ 2의 manifest는 직전 Phase의 보고서와 manifest를 반드시 담아 사슬을 잇는다.
  // 링크가 없으면 앞 Phase의 산출물이 무보호가 되고, 그 구간이 Phase 1까지 소급된다.
  // 이 규칙이 위에서 뺀 자기 보고서를 다음 Phase가 자동으로 회수한다. (P1-C)
  if (p.n >= 2) {
    const prevReport = byNumber.get(p.n - 1)?.file;
    const need = [`phase-${p.n - 1}-approved-hashes.json`, prevReport].filter(Boolean);
    for (const want of need) {
      // **정본 경로**여야 한다. `endsWith`로 보면 아무 디렉터리의 동명 사본이든 링크 요건을
      // 충족해서, 미끼 사본 하나로 사슬을 우회할 수 있다(4회차 검토 P2-H 실측).
      const canonical = path.relative(REPO, path.join(DIR, want)).split(path.sep).join('/');
      if (!Object.keys(files).some((rel) => rel === canonical)) {
        // 링크가 아예 없는 것과 동명 사본으로 대체된 것은 다른 사고다. 메시지를 가르지
        // 않으면 대조군이 두 입력 형태를 구분하지 못해 커버리지 침식이 보이지 않는다(P2-J).
        const decoy = Object.keys(files).find((rel) => rel !== canonical && rel.endsWith(`/${want}`));
        if (decoy) {
          problems.push(`Phase ${p.n} manifest의 사슬 링크가 정본 경로가 아니다: ${decoy}\n    `
            + `기대: ${canonical}\n    `
            + '동명 사본은 링크가 아니다 — 미끼 하나로 사슬 전체가 무력해진다');
        } else {
          problems.push(`Phase ${p.n} manifest에 사슬 링크가 없다: ${canonical}\n    `
            + `직전 Phase를 담지 않으면 Phase ${p.n - 1}의 산출물이 무보호가 된다`);
        }
      }
    }
  }
  // PASS한 Phase는 정의상 전부 현재 Phase보다 앞이거나 같다. 자기 Phase가 PASS면
  // 그 manifest도 이미 확정된 것이므로 똑같이 불변이어야 한다.
  for (const [rel, want] of Object.entries(files)) {
    // manifest는 신뢰 산출물이지만, 경로 검증 없이 join하면 저장소 밖을 읽는다.
    // 신뢰하는 입력이라도 범위를 벗어나면 그건 이미 신뢰할 입력이 아니다.
    if (path.isAbsolute(rel) || rel.split('/').includes('..')) {
      problems.push(`Phase ${p.n} manifest의 경로가 저장소를 벗어난다: ${rel}`);
      continue;
    }
    const abs = path.join(REPO, rel);
    let got = null;
    try {
      got = await sha256(fs.readFileSync(abs, 'utf8'));
    } catch (err) {
      problems.push(`이전 PASS가 무효: Phase ${p.n}이 승인한 ${rel}을 읽을 수 없다\n    ${err.message}`);
      continue;
    }
    if (got !== want) {
      problems.push(`이전 PASS가 무효: ${rel}이 Phase ${p.n} 승인 이후 변경됐다.\n    `
        + `승인: ${want}\n    현재: ${got}\n    `
        + `Phase ${p.n}의 PASS를 무효화하고 그 Phase부터 다시 검토해야 한다`);
    }
  }
}

// ── 4. 경로 소유권 ────────────────────────────────────────────────────────────
const ownership = readJsonOrFail(path.join(DIR, 'path-ownership.json'), '경로 소유권 정본');

function dirtyPaths() {
  if (args.statusFile) {
    const raw = readOrFail(path.resolve(args.statusFile), 'status 파일');
    return raw === null ? [] : raw.split('\n').filter(Boolean).map((l) => l.slice(3).trim());
  }
  try {
    const out = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'],
      { cwd: REPO, encoding: 'utf8' });
    return out.split('\n').filter(Boolean).map((l) => l.slice(3).trim());
  } catch (err) {
    problems.push(`git status를 실행할 수 없다: ${err.message}`);
    return [];
  }
}

// dirty path만 보면 범위 밖 변경을 커밋하는 순간 작업 트리가 깨끗해져 GREEN이 된다.
// 승인서가 이미 baselineHead를 갖고 있으므로 그 시점부터 HEAD까지의 committed delta도
// 같은 allowlist로 검사한다. rename은 양쪽 경로를 모두 보기 위해 --no-renames를 쓴다.
function committedPaths() {
  if (args.committedPathsFile) {
    const raw = readOrFail(path.resolve(args.committedPathsFile), 'committed paths 파일');
    return raw === null ? [] : raw.split('\n').map((line) => line.trim()).filter(Boolean);
  }
  // synthetic fixture는 실제 git history가 없고 status만 주입한다. 그때 committed delta를
  // 조용히 []로 두면 **committed 범위 검사가 통째로 꺼진 채 GREEN이 된다** — 검사기 스스로
  // fail-open이 되는 구멍이었다. status를 주입하는 fixture는 committed delta도 명시적으로
  // 선언해야 한다. 커밋된 변경이 없으면 빈 파일을 주면 된다. 침묵은 선언이 아니다.
  if (args.statusFile) {
    problems.push('--status-file은 --committed-paths-file과 함께 써야 한다\n    '
      + 'committed delta를 선언하지 않으면 범위 밖 커밋을 검사하지 않은 채 통과한다');
    return [];
  }
  const baseline = approval?.baselineHead;
  if (!baseline) return [];
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', baseline, 'HEAD'],
      { cwd: REPO, stdio: 'ignore' });
  } catch {
    problems.push(`승인 baselineHead가 현재 HEAD의 조상이 아니다: ${baseline}\n    `
      + '승인되지 않은 기준선 교체·rebase 상태에서는 변경 범위를 증명할 수 없다');
    return [];
  }
  try {
    const out = execFileSync('git', ['diff', '--name-only', '--no-renames', `${baseline}..HEAD`],
      { cwd: REPO, encoding: 'utf8' });
    return out.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch (err) {
    problems.push(`baselineHead..HEAD committed delta를 측정할 수 없다: ${err.message}`);
    return [];
  }
}

if (ownership && currentPhase > 0) {
  const allowed = [...(ownership.alwaysAllowed || [])];
  for (let n = 1; n <= currentPhase; n += 1) {
    const spec = ownership.phases?.[String(n)];
    if (!spec) {
      problems.push(`경로 소유권 정본에 Phase ${n} 항목이 없다`);
      continue;
    }
    allowed.push(...(spec.allowed || []));
  }

  // UNTRUSTED_PREPLAN — 계획 전부터 dirty였던 경로. dirty인 것은 위반이 아니다.
  // 위반은 **심판 Phase 전에 내용이 바뀌는 것**이다. 그건 어느 Phase의 성과도 아닌
  // 몰래 편집이고, 나중에 "이건 원래 그랬다"와 구분할 수 없게 된다.
  const preplan = new Map((ownership.untrustedPreplan || []).map((e) => [e.path, e]));
  for (const entry of preplan.values()) {
    if (currentPhase >= entry.adjudicatedInPhase) continue; // 심판 Phase 도달 — 고정 해제
    let patchHash = null;
    try {
      const patch = execFileSync('git', ['diff', '--', entry.path], { cwd: REPO, encoding: 'utf8' });
      patchHash = await sha256(patch);
    } catch (err) {
      problems.push(`UNTRUSTED_PREPLAN patch를 측정할 수 없다: ${entry.path}\n    ${err.message}`);
      continue;
    }
    if (patchHash !== entry.patchSha256) {
      problems.push(`격리 위반: ${entry.path}\n    `
        + `Phase ${entry.adjudicatedInPhase}에서 심판할 사전 변경인데 그 전에 내용이 바뀌었다.\n    `
        + `고정: ${entry.patchSha256}\n    현재: ${patchHash}`);
    }
  }

  const changed = [
    ...committedPaths().map((p) => ({ path: p, source: 'committed' })),
    ...dirtyPaths().map((p) => ({ path: p, source: 'dirty' })),
  ];
  const seenChanged = new Set();
  for (const item of changed) {
    const p = item.path;
    if (seenChanged.has(`${item.source}:${p}`)) continue;
    seenChanged.add(`${item.source}:${p}`);
    if (preplan.has(p)) continue; // 위에서 hash로 따로 검사했다
    if (!allowed.some((prefix) => p === prefix || p.startsWith(prefix))) {
      problems.push(`범위 밖 변경: ${p} (${item.source})\n    `
        + `Phase ${currentPhase} 시점에서 허용된 경로가 아니다. 현재 Phase를 BLOCKED하고 `
        + '계획을 고친 뒤 다시 검토해야 한다');
    }
  }
}

// ── 보고 ──────────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error('skill conformance check failed:');
  for (const p of problems) console.error(`- ${p}`);
  console.error('\n이 검사는 구조만 본다. 통과했다고 다이어트가 옳다는 뜻은 아니다 — '
    + '의미 정합성은 독립 reviewer의 대조표가 판정한다.');
  process.exit(1);
}
console.log(`skill conformance: OK (계획 ${planId}, 보고서 ${phases.length}개, 현재 Phase ${currentPhase})`);
for (const p of phases) console.log(`  Phase ${p.n}  ${String(p.verdict).padEnd(18)} ${p.file}`);
console.log('  구조만 검사했다. 다이어트 품질은 독립 reviewer 대조표가 판정한다.');
