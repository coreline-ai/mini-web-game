#!/usr/bin/env node
// completion-claim-qa.mjs — "완료"라는 판정이 거짓 양성을 내지 않는지 검사한다.
//
// 이 저장소에서 가장 비싼 실패는 깨진 게임을 만드는 것이 아니라, **깨진 게임을 완료라고
// 부르는 것**이다. 외부 전문가 검토(2026-08-16)가 그 경로를 찾아냈다.
//
//   · make-game 기본 게이트가 `demo`였고, 그 경로는 production-demo-qa만 돌렸다
//   · 그 호출에 --require-gpt-imagegen이 없었다 (strict provenance가 옵트인)
//   · 그런데도 `✔ Done. Production-demo game`을 출력했다
//
// 실측: vite build가 실패하는 문법 오류가 든 소스와, 영수증과 다른 WebP를 넣은 산출물이
// 둘 다 그 경로를 통과했다.
//
// ── 이 검사가 대조군을 쓰는 이유 (계약 §0.1) ────────────────────────────────
// 이 부정 테스트를 처음 돌렸을 때 두 결함 사본이 모두 차단되길래 "이미 막고 있다"고
// 결론 낼 뻔했다. 확인해 보니 **무손상 사본도 똑같이 차단**됐다 — 임시 디렉터리 이름이
// spec.game.id와 달라서 그 이유로 먼저 실패한 것이었다. 결함이 아니라 이름 때문이었다.
//
// 그래서 이 검사는 매번 **음성 대조(무손상 사본이 통과하는가)를 먼저** 확인한다. 음성
// 대조가 실패하면 나머지 결과는 전부 무의미하므로 그 자리에서 실패로 처리한다.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED = path.resolve(__dirname, '..', '..', 'generated');
const PRODUCTION_DEMO_QA = path.join(__dirname, 'production-demo-qa.mjs');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--fixture') args.fixture = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage:
  node generator/scripts/completion-claim-qa.mjs [--fixture <generated-game-id>]

"완료" 판정이 거짓 양성을 내지 않는지 검사한다. 무손상 사본(음성 대조)이 통과하고,
문법이 깨진 소스와 영수증이 변조된 산출물이 차단되는지 본다.`);
  process.exit(0);
}
const args = parseArgs(process.argv.slice(2));

// fixture는 영수증을 가진 v2 게임이어야 한다. 없으면 검사할 대상이 없다.
function pickFixture() {
  if (args.fixture) return path.join(GENERATED, args.fixture);
  const candidates = fs.readdirSync(GENERATED)
    .map((n) => path.join(GENERATED, n))
    .filter((d) => fs.existsSync(path.join(d, 'assets', 'asset-manifest.json')));
  for (const dir of candidates) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(dir, 'assets', 'asset-manifest.json'), 'utf8'));
      // 영수증은 images[].provenance 안에 있다(assets 배열이 아니다).
      const hasReceipt = (m.images || []).some((a) => a.provenance?.outputSha256 && a.provenance?.runId);
      if (hasReceipt) return dir;
    } catch {}
  }
  return null;
}

const fixture = pickFixture();
if (!fixture) {
  console.log('completion-claim QA: skipped (영수증을 가진 생성 게임이 없다)');
  process.exit(0);
}
const gameId = path.basename(fixture);

// 사본의 **디렉터리 이름은 반드시 spec.game.id와 같아야 한다.** 다르면 production-demo-qa가
// 그 이유로 먼저 실패해서 부정 테스트가 무효가 된다 — 위 §0.1 주석의 함정이 정확히 이것이다.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'completion-claim-'));
function makeCopy(label) {
  const dir = path.join(root, label, gameId);
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  fs.cpSync(fixture, dir, {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|dist|qa-captures)$/.test(src),
  });
  return dir;
}

function runGate(dir) {
  const r = spawnSync(process.execPath, [PRODUCTION_DEMO_QA, '--project', dir, '--require-gpt-imagegen'],
    { encoding: 'utf8' });
  return { passed: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}` };
}

const failures = [];
try {
  // ── 음성 대조 — 이것이 실패하면 나머지 결과는 읽을 가치가 없다
  const control = runGate(makeCopy('control'));
  if (!control.passed) {
    const why = control.out.split('\n').filter((l) => l.trim().startsWith('-'))[0] || '(사유 불명)';
    console.error('completion-claim QA failed: **음성 대조 실패** — 무손상 사본이 통과하지 않는다.');
    console.error(`  ${why.trim()}`);
    console.error('  결함 사본의 결과는 이 상태에서 아무 의미가 없다. 대조군을 먼저 고칠 것 (계약 §0.1).');
    process.exit(1);
  }
  console.log('  음성 대조 (무손상 사본)          통과 ✓');

  // ── 양성 대조 1: 빌드가 불가능한 소스
  //
  // 자산 계약 게이트가 이것을 통과시키는 것 자체는 결함이 아니다 — manifest·provenance·자산
  // 규격만 보는 게이트이고 빌드는 full gate(production-gate.mjs의 `npm run build`)가 본다.
  // 결함이었던 것은 **그 계약 게이트만 돌고 완료를 선언한 것**이다. 그래서 여기서는 두 가지를
  // 나눠 확인한다: (a) 계약 게이트가 빌드를 보지 않는다는 사실을 기록하고,
  // (b) full gate 체인에 빌드가 실제로 들어 있는지 검사한다.
  const syntax = makeCopy('syntax');
  fs.appendFileSync(path.join(syntax, 'src', 'main.js'), '\nthis is not valid javascript ((( ;\n');
  const syntaxResult = runGate(syntax);
  console.log(`  문법 깨진 소스 (계약 게이트)      ${syntaxResult.passed ? '통과 — 설계상 정상' : '차단'}`);

  const productionGate = fs.readFileSync(path.join(__dirname, 'production-gate.mjs'), 'utf8');
  const fullGateBuilds = /run\(npmCommand\(\), \['run', 'build'\]/.test(productionGate);
  console.log(`  full gate가 빌드를 수행           ${fullGateBuilds ? '예 ✓' : '아니오 ✗'}`);
  if (!fullGateBuilds) {
    failures.push('full gate 체인에 `npm run build`가 없다. 빌드 실패가 어느 경로에서도 잡히지 않으므로, '
      + '완료 판정이 빌드 가능성을 보장하지 못한다.');
  }

  // ── 양성 대조 2: 영수증과 다른 산출물
  const tamper = makeCopy('tamper');
  const manifest = JSON.parse(fs.readFileSync(path.join(tamper, 'assets', 'asset-manifest.json'), 'utf8'));
  // path는 프로젝트 루트 기준이다("assets/characters/x.webp").
  const target = (manifest.images || []).find((a) => a.provenance?.outputSha256 && a.path
    && fs.existsSync(path.join(tamper, a.path)));
  if (!target) {
    failures.push('영수증을 가진 자산 파일을 찾지 못해 변조 테스트를 못 했다 — fixture를 확인할 것.');
  } else {
    const file = path.join(tamper, target.path);
    const buf = Buffer.from(fs.readFileSync(file));
    buf[buf.length - 1] ^= 0xff; // 1바이트만 바꾼다
    fs.writeFileSync(file, buf);
    const tamperResult = runGate(tamper);
    console.log(`  영수증 변조 (${target.path})${' '.repeat(Math.max(1, 8 - target.path.length))}${tamperResult.passed ? '통과 ✗' : '차단 ✓'}`);
    if (tamperResult.passed) {
      failures.push(`영수증(outputSha256)과 다른 ${target.path}이 통과한다. provenance 검사가 실효 없다.`);
    }
  }

  // ── make-game의 완료 판정 자체를 읽는다. 실행하면 수 분이 걸리므로 소스를 검사한다.
  const makeGame = fs.readFileSync(path.join(__dirname, 'make-game.mjs'), 'utf8');
  const defaultsToFull = /gate:\s*'full'/.test(makeGame);
  const verifiedOnlyFull = /const verified\s*=\s*args\.gate === 'full'/.test(makeGame);
  const strictAlways = /production-gate\.mjs'\),\s*'--project',\s*out,\s*'--require-gpt-imagegen'/.test(makeGame);
  console.log(`  make-game 기본 게이트 full       ${defaultsToFull ? '예 ✓' : '아니오 ✗'}`);
  console.log(`  완료 판정이 full 전용            ${verifiedOnlyFull ? '예 ✓' : '아니오 ✗'}`);
  console.log(`  strict provenance 항상 적용      ${strictAlways ? '예 ✓' : '아니오 ✗'}`);
  if (!defaultsToFull) failures.push("make-game 기본 게이트가 'full'이 아니다.");
  if (!verifiedOnlyFull) failures.push('완료 판정이 full gate 외의 경로에서도 참이 된다.');
  if (!strictAlways) failures.push('full gate 호출이 --require-gpt-imagegen을 넘기지 않는다.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

if (failures.length) {
  console.error('\ncompletion-claim QA failed:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log(`completion-claim QA OK (fixture: ${gameId})`);
