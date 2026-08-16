#!/usr/bin/env node
// play-profile-qa.mjs — 게임이 **게임으로 성립하는가**를 잰다 (계약 §2.0.27 / 결함 클래스 O).
//
// 왜 필요한가. 기존 게이트는 전부 아티팩트를 본다 — 자산 provenance, DPR, 레이아웃 겹침,
// 씬 합성, 문서-런타임 동기화. "조작에 값이 붙어 있는가"를 보는 것은 하나도 없다.
//
// 사용자가 `last-minute-keeper`를 두고 "공을 어떻게 막는지 모르겠다 / 재미없다"고 했을 때,
// 전 게이트가 GREEN이었다. 그 지적을 숫자로 옮길 수단이 저장소에 없었다는 뜻이다.
//
// ─────────────────────────────────────────────────────────────────────────────
// **이 게이트는 절대 판정에 쓰지 않는다. 회귀 탐지 전용이다.**
//
// 계약 §0.1의 양성 대조를 통과하지 못했다. 위에 적은 "다이브 처벌" 결함을 config에 되돌려
// 넣고 돌렸는데 RED가 되지 않았다 — 그 결함이 실은 **내 봇의 타이밍 오류**였기 때문이다.
// 도착 460ms 전에 다이브(지속 340ms)해서 RECOVERING 상태로 공을 맞고 있었다. 제대로 만든
// 봇으로 원본을 재측정하니 다이브는 잘 작동했다(93%).
//
// 그래서 **봇의 실력이 교란 변수다.** 못 만든 봇은 없는 결함을 만들어내고, 너무 잘 만든 봇은
// 실재하는 결함을 가린다. 이 게이트의 RED는 "게임이 나쁘다"가 아니라 "기준선에서 벗어났다"만
// 뜻한다. 단조성 위반이 나오면 **먼저 봇을 의심할 것.**
// ─────────────────────────────────────────────────────────────────────────────
//
// 미적 판단은 하지 않는다. "재미있는가"는 사람이 플레이해야 알고, 여기서는 **조작에 값이
// 붙어 있는가**만 기계적으로 잰다. 셋을 본다.
//
//   1. 단조성 — 선언한 순서대로 성적이 오르는가. 뒤집히면 정답 행동이 처벌받고 있다.
//   2. 분리   — 인접 프로파일의 차이가 minGap 이상인가. 붙어 있으면 그 조작 계층이 무의미하다.
//   3. 범위   — 각 프로파일의 성적이 선언한 min/max 안인가. 최상위가 못 이기면 불공정,
//               최하위가 잘하면 조작이 무의미하다.
//
// 프로젝트가 제공해야 하는 것은 둘뿐이다.
//   qa/play-profiles.js  — 프로파일 선언 (PLAY_PROFILES, 선택적으로 SAMPLE_MS)
//   qa/play-driver.mjs   — export async function runProfile(page, profileId, ms)
//                          → { successes, failures } 를 돌려준다
//
// v1 아케이드는 대상이 아니다. 이 두 파일이 없으면 건너뛴다 — v2 custom-loop에서만 필수다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = { sampleMs: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project') args.project = argv[++i];
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--sample-ms') args.sampleMs = Number(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && (!args.project || !args.url)) {
    throw new Error('Required: --project <dir> --url <http-url>');
  }
  return args;
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage:
  node generator/scripts/play-profile-qa.mjs --project <dir> --url <http-url> [--sample-ms N]

게임이 게임으로 성립하는지 검사한다. 프로젝트의 qa/play-profiles.js와 qa/play-driver.mjs를
읽어 봇을 돌리고, 성적의 단조성·분리·범위를 판정한다. 두 파일이 없으면 건너뛴다.`);
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));
const projectDir = path.resolve(args.project);
const profilesFile = path.join(projectDir, 'qa', 'play-profiles.js');
const driverFile = path.join(projectDir, 'qa', 'play-driver.mjs');

if (!fs.existsSync(profilesFile) || !fs.existsSync(driverFile)) {
  console.log('play-profile QA: skipped (qa/play-profiles.js 또는 qa/play-driver.mjs 없음)');
  process.exit(0);
}

const { PLAY_PROFILES, SAMPLE_MS } = await import(pathToFileURL(profilesFile).href);
const { runProfile } = await import(pathToFileURL(driverFile).href);

if (!Array.isArray(PLAY_PROFILES) || PLAY_PROFILES.length < 2) {
  console.error('play-profile QA failed: PLAY_PROFILES는 2개 이상이어야 한다 — 비교 대상이 없으면 계층을 잴 수 없다');
  process.exit(1);
}

const sampleMs = args.sampleMs || SAMPLE_MS || 40_000;
const errors = [];
const rows = [];

const browser = await chromium.launch();
try {
  for (const profile of PLAY_PROFILES) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true,
    });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto(args.url, { waitUntil: 'domcontentloaded' });

    const result = await runProfile(page, profile.id, sampleMs);
    await page.close();

    const total = (result?.successes ?? 0) + (result?.failures ?? 0);
    if (!total) {
      errors.push(`${profile.id}: 표본 0 — ${sampleMs}ms 동안 판정이 한 번도 일어나지 않았다. `
        + '드라이버가 실제로 플레이하지 않았거나 게임이 진행되지 않는다.');
      continue;
    }
    const rate = Math.round((result.successes / total) * 100);
    rows.push({ id: profile.id, label: profile.label || profile.id, successes: result.successes, failures: result.failures, rate, pageErrors: pageErrors.length });

    // 범위 — 선언한 기대치 안인가
    if (typeof profile.expect?.min === 'number' && rate < profile.expect.min) {
      errors.push(`${profile.id}: 성적 ${rate}% < 선언한 최소 ${profile.expect.min}% `
        + '— 이 전략을 제대로 수행해도 목표에 못 미친다면 조작이 아니라 게임이 문제다');
    }
    if (typeof profile.expect?.max === 'number' && rate > profile.expect.max) {
      errors.push(`${profile.id}: 성적 ${rate}% > 선언한 최대 ${profile.expect.max}% `
        + '— 이보다 잘 나오면 그 위 계층의 조작이 무의미하다는 뜻이다');
    }
    if (pageErrors.length) {
      errors.push(`${profile.id}: 브라우저 예외 ${pageErrors.length}건 — ${pageErrors[0].slice(0, 120)}`);
    }
  }

  // 단조성 — 선언 순서대로 성적이 올라야 한다. 이번 세션의 실패 서명이 정확히 이것이다.
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const cur = rows[i];
    if (cur.rate < prev.rate) {
      errors.push(`단조성 위반: ${cur.label}(${cur.rate}%) < ${prev.label}(${prev.rate}%) `
        + '— 더 많이 조작하는 전략이 더 나쁜 성적을 낸다면 정답 행동이 처벌받고 있다 (계약 §2.0.27)');
    }
  }

  // 분리 — 인접 프로파일이 붙어 있으면 그 사이의 조작 계층에 값이 없다
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const cur = rows[i];
    const minGap = PLAY_PROFILES[i]?.minGap ?? 8;
    if (cur.rate - prev.rate < minGap) {
      errors.push(`분리 부족: ${prev.label}(${prev.rate}%) → ${cur.label}(${cur.rate}%), `
        + `차이 ${cur.rate - prev.rate}%p < ${minGap}%p — 이 계층의 조작에 값이 없다`);
    }
  }
} finally {
  await browser.close();
}

const report = { ok: errors.length === 0, sampleMs, profiles: rows, errors };
const outDir = path.join(projectDir, 'qa-captures');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'play-profile-results.json'), `${JSON.stringify(report, null, 2)}\n`);

for (const r of rows) console.log(`  ${String(r.label).padEnd(14)} ${String(r.rate + '%').padStart(4)}  (성공 ${r.successes} / 실패 ${r.failures})`);

if (errors.length) {
  console.error('play-profile QA failed (회귀 탐지 — 기준선에서 벗어남):');
  for (const e of errors) console.error(`- ${e}`);
  console.error('');
  console.error('먼저 봇(qa/play-driver.mjs)이 여전히 유효한지 확인할 것. 계약 §0.1 —');
  console.error('이번 게이트를 만들게 한 "결함"도 실은 봇의 타이밍 오류였다.');
  process.exit(1);
}
console.log(`play-profile QA OK: ${rows.length}개 프로파일, 단조 증가·분리·범위 모두 만족`);
