#!/usr/bin/env node
// imagegen 무결성 회귀 테스트 — 영수증 기반 승격·원자적 생성·레거시 정책이 회귀하지 않는지
// 스텁 codex로 검증한다. CI-safe: chroma helper(~/.codex) 없이 배경 자산만 사용하며,
// python3 + Pillow만 요구한다 (생성 검증·리샘플 단계가 쓰는 것과 동일).
//
// 케이스 (implement_20260815_123807.md Phase 4):
//   1. exec 비정상 종료   → 실패 판정 + 원본 보존 + 기존 영수증 무손상
//   2. 정체 출력          → unchanged-output 실패 + 원본 보존
//   3. 무영수증 + wire    → draft 유지 + no-receipt 보고
//   4. SHA 불일치         → skip 거부·재생성 → 새 영수증 실일치
//   5. legacy-1 + wire    → 승격 유지
//   6. custom-loop 무Codex → 스캐폴드 완주
//   7. 성공 경로          → 영수증 발급 → skip-existing 전부 skip (거부-만능 방지)
//
// 사용: node generator/scripts/imagegen-integrity-qa.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const IMAGEGEN = path.join(SCRIPTS, 'codex-imagegen.mjs');
const MAKEGAME = path.join(SCRIPTS, 'make-game.mjs');
const V2_SPEC = path.join(SCRIPTS, '..', 'examples', 'custom-loop-shell.spec.json');

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-integrity-'));
const BIN = path.join(WORK, 'bin');
const MODE_FILE = path.join(BIN, 'mode.txt');
fs.mkdirSync(BIN, { recursive: true });

// ── 스텁 codex ──────────────────────────────────────────────────────────────
// mode.txt: "ok" = 결정적 노이즈 PNG(같은 입력이면 같은 바이트 — 정체 출력 테스트에 이용)
//           "fail" = exec 단계에서 exit 3
const STUB = `#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const argv = process.argv.slice(2);
if (argv.includes('--version')) { console.log('codex-cli 0.0.0-integrity-stub'); process.exit(0); }
if (argv[0] === 'login') { console.log('Logged in using stub'); process.exit(0); }
const mode = fs.readFileSync(path.join(__dirname, 'mode.txt'), 'utf8').trim();
if (mode === 'fail') { console.error('stub: simulated exec failure'); process.exit(3); }
const dir = argv[argv.indexOf('-C') + 1];
const prompt = argv[argv.length - 1];
const name = /as '([^']+)'/.exec(prompt)[1];
if (mode === 'stale') {
  // 파이프라인이 치워 둔 이전 산출물(<name>.prev.<pid>)을 그대로 복사해
  // "exec는 성공했지만 새 아트는 없다"(캐시/정체 출력)를 재현한다.
  const prev = fs.readdirSync(dir).find((f) => f.startsWith(name + '.prev.'));
  if (prev) fs.copyFileSync(path.join(dir, prev), path.join(dir, name));
  process.exit(0);
}
const py = [
  "from PIL import Image",
  "import random",
  "im=Image.new('RGB',(1080,1920))",
  "px=im.load()",
  "random.seed(7)",
  "for y in range(0,1920,4):",
  "    for x in range(0,1080,4):",
  "        c=(random.randrange(256),random.randrange(256),random.randrange(256))",
  "        for dy in range(4):",
  "            for dx in range(4):",
  "                px[x+dx,y+dy]=c",
  "im.save(r'" + dir + "/" + name + "')",
].join('\\n');
const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
if (r.status !== 0) process.stderr.write(String(r.stderr));
process.exit(r.status === 0 ? 0 : 1);
`;
const stubBin = path.join(BIN, 'codex');
fs.writeFileSync(stubBin, STUB);
fs.chmodSync(stubBin, 0o755);
const setMode = (m) => fs.writeFileSync(MODE_FILE, m);

// ── 픽스처 ──────────────────────────────────────────────────────────────────
const GID = 'integrity-fixture';
function makeFixture(name) {
  const dir = path.join(WORK, name);
  fs.mkdirSync(path.join(dir, 'assets', 'backgrounds'), { recursive: true });
  const plan = {
    gameId: GID,
    themeColors: { background: '#1a0e18', player: '#ffb347', collectible: '#ffd54a', ui: '#fff3e0' },
    backgrounds: [{ id: 'stage-1', path: 'assets/backgrounds/stage-1.png', width: 1080, height: 1920, prompt: 'integrity test stage' }],
    sprites: [], ui: [], fx: [],
  };
  const manifest = {
    qualityTier: 'draft',
    stageBackgrounds: [{ id: 'stage-1', path: 'assets/backgrounds/stage-1.png', delivery: 'runtime', quality: 'draft' }],
    images: [],
  };
  fs.writeFileSync(path.join(dir, 'asset-plan.json'), JSON.stringify(plan, null, 2));
  fs.writeFileSync(path.join(dir, 'assets', 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
  return dir;
}
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const manifestOf = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'assets', 'asset-manifest.json'), 'utf8'));
const bgEntryOf = (dir) => manifestOf(dir).stageBackgrounds.find((x) => x.id === 'stage-1');
const bgFileOf = (dir) => path.join(dir, bgEntryOf(dir).path);

function runImagegen(dir, extra = []) {
  const r = spawnSync(process.execPath, [IMAGEGEN, '--project', dir, '--only', 'backgrounds', '--no-runtime-export', ...extra], {
    encoding: 'utf8', env: { ...process.env, DEVGAME_CODEX_BIN: stubBin },
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}
function runWire(dir) {
  const r = spawnSync(process.execPath, [IMAGEGEN, '--project', dir, '--only', 'wire', '--no-runtime-export'], {
    encoding: 'utf8', env: { ...process.env, DEVGAME_CODEX_BIN: stubBin },
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}

// ── assert 러너 ─────────────────────────────────────────────────────────────
let failures = 0;
let current = null;
function testCase(label, fn) {
  current = { label, checks: [] };
  try { fn(); } catch (err) { current.checks.push({ ok: false, what: `threw: ${err.message}` }); }
  const bad = current.checks.filter((c) => !c.ok);
  console.log(`${bad.length ? '✗' : '✔'} ${label}`);
  for (const c of current.checks) if (!c.ok) console.log(`    FAIL: ${c.what}`);
  if (bad.length) failures += 1;
}
const check = (ok, what) => current.checks.push({ ok: !!ok, what });

// python3 + Pillow 없으면 여기서 명확히 실패시킨다 (조용한 스킵 금지).
const pil = spawnSync('python3', ['-c', 'import PIL'], { encoding: 'utf8' });
if (pil.status !== 0) {
  console.error('✗ python3 + Pillow is required (the same dependency the generation verifier uses). Install: pip3 install Pillow');
  process.exit(1);
}

console.log(`imagegen integrity QA — work dir: ${WORK}\n`);

// ── 7. 성공 경로 (다른 케이스의 기반 상태이므로 먼저 실행) ──────────────────
const A = makeFixture('fixture-a');
let shaAfterSuccess = null;
testCase('case 7a: 정상 생성 → 영수증 발급 + production-demo 승격', () => {
  setMode('ok');
  const { status, out } = runImagegen(A);
  check(status === 0, `exit 0 expected, got ${status}\n${out.slice(-400)}`);
  const e = bgEntryOf(A);
  check(e.quality === 'production-demo', `quality production-demo expected, got ${e.quality}`);
  const pr = e.provenance || {};
  check(pr.outputSha256 && pr.runId && pr.generatedAt, 'receipt fields (outputSha256/runId/generatedAt) missing');
  check(pr.outputSha256 === sha(bgFileOf(A)), 'receipt outputSha256 does not match the file on disk');
  shaAfterSuccess = sha(bgFileOf(A));
});
testCase('case 7b: --skip-existing → 전부 skip (거부-만능 방지)', () => {
  const { status, out } = runImagegen(A, ['--skip-existing']);
  check(status === 0, `exit 0 expected, got ${status}`);
  check(/skipped/.test(out), 'expected the asset to be skipped/reused');
  check(!/regenerating/.test(out), 'nothing should regenerate when receipt matches');
  check(sha(bgFileOf(A)) === shaAfterSuccess, 'file must be untouched by a skip run');
});

// ── 2. 정체 출력 — 결정적 스텁이 같은 바이트를 다시 쓰면 unchanged-output ───
testCase('case 2: 정체 출력 → unchanged-output 실패 + 원본 보존', () => {
  setMode('stale'); // exec exit 0이지만 이전 산출물과 동일 바이트
  const { status, out } = runImagegen(A); // --skip-existing 없음 = 강제 재생성
  check(status !== 0, 'exit non-zero expected when every attempt is a stale output');
  check(/output identical|unchanged/.test(out), `expected unchanged-output report\n${out.slice(-400)}`);
  check(sha(bgFileOf(A)) === shaAfterSuccess, 'original file must be preserved on failure');
  const e = bgEntryOf(A);
  check(e.provenance?.outputSha256 === shaAfterSuccess, 'existing receipt must survive a failed regeneration');
  check(manifestOf(A).qualityTier !== 'production-demo', 'tier must not be promoted on a run with generation failures');
});

// ── 1. exec 비정상 종료 ─────────────────────────────────────────────────────
testCase('case 1: exec exit 3 → 실패 판정 + 원본 보존 + 영수증 무손상', () => {
  setMode('fail');
  const { status, out } = runImagegen(A);
  check(status !== 0, `exit non-zero expected, got ${status}`);
  check(/FAILED|failed/.test(out), 'expected an explicit failure report');
  check(sha(bgFileOf(A)) === shaAfterSuccess, 'original file must be preserved when exec fails');
  check(bgEntryOf(A).provenance?.outputSha256 === shaAfterSuccess, 'receipt must be untouched when exec fails');
});

// ── 4. SHA 불일치 → skip 거부 → 재생성 → 새 영수증 실일치 ──────────────────
testCase('case 4: 영수증-파일 SHA 불일치 → 재생성 + 새 영수증 일치', () => {
  setMode('ok');
  const tampered = Buffer.from('tampered-not-a-real-png');
  fs.writeFileSync(bgFileOf(A), tampered);
  const tamperedSha = sha(bgFileOf(A));
  const { status, out } = runImagegen(A, ['--skip-existing']);
  check(status === 0, `exit 0 expected after successful regeneration, got ${status}\n${out.slice(-400)}`);
  check(/content differs from receipt/.test(out), 'expected the receipt mismatch to be reported as the regeneration reason');
  const e = bgEntryOf(A);
  check(sha(bgFileOf(A)) !== tamperedSha, 'tampered file must be replaced');
  check(e.provenance?.outputSha256 === sha(bgFileOf(A)), 'new receipt must hash-match the regenerated file');
});

// ── 3. 무영수증 provenance + wire → draft 유지 ──────────────────────────────
const B = makeFixture('fixture-b');
testCase('case 3: 무영수증 provenance + --only wire → draft 유지 + no-receipt 보고', () => {
  fs.copyFileSync(bgFileOf(A), path.join(B, 'assets', 'backgrounds', 'stage-1.png'));
  const m = manifestOf(B);
  m.stageBackgrounds[0].provenance = {
    source: 'generated-for-game', generatedFor: GID, method: 'codex-gpt-imagegen-skill',
    model: 'gpt 이미지젠 스킬', sourceSkill: 'imagegen', promptHash: 'claimed-without-proof',
  };
  fs.writeFileSync(path.join(B, 'assets', 'asset-manifest.json'), JSON.stringify(m, null, 2));
  const { out } = runWire(B);
  const e = bgEntryOf(B);
  check(e.quality === 'draft', `quality must stay draft without a receipt, got ${e.quality}`);
  check(/no-receipt/.test(out), 'expected the no-receipt reason in the report');
  check(manifestOf(B).qualityTier !== 'production-demo', 'tier must stay draft');
});

// ── 5. legacy-1 + wire → 승격 유지 ──────────────────────────────────────────
const C = makeFixture('fixture-c');
testCase('case 5: provenanceVersion legacy-1 + --only wire → 승격 유지', () => {
  fs.copyFileSync(bgFileOf(A), path.join(C, 'assets', 'backgrounds', 'stage-1.png'));
  const m = manifestOf(C);
  m.stageBackgrounds[0].provenance = {
    source: 'generated-for-game', generatedFor: GID, method: 'codex-gpt-imagegen-skill',
    model: 'gpt 이미지젠 스킬', sourceSkill: 'imagegen', promptHash: 'pre-receipt-era',
    provenanceVersion: 'legacy-1',
  };
  fs.writeFileSync(path.join(C, 'assets', 'asset-manifest.json'), JSON.stringify(m, null, 2));
  runWire(C);
  const e = bgEntryOf(C);
  check(e.quality === 'production-demo', `legacy-1 must keep production-demo, got ${e.quality}`);
});

// ── 6. custom-loop + Codex 부재 → 스캐폴드 완주 ─────────────────────────────
testCase('case 6: custom-loop 스펙 + Codex 부재 → 스캐폴드 완주', () => {
  const out = path.join(WORK, 'custom-shell');
  const r = spawnSync(process.execPath, [MAKEGAME, '--spec', V2_SPEC, '--out', out], {
    encoding: 'utf8', env: { ...process.env, DEVGAME_CODEX_BIN: path.join(WORK, 'no-such-codex') },
  });
  const log = `${r.stdout}\n${r.stderr}`;
  check(r.status === 0, `exit 0 expected, got ${r.status}\n${log.slice(-400)}`);
  check(/Custom-loop shell generated safely/.test(log), 'expected the custom-loop shell completion message');
  // cli는 스펙 id로 프로젝트 디렉터리를 이름 짓기도 한다 — 두 후보 모두 확인
  const src = [path.join(out, 'src'), path.join(WORK, 'custom-loop-shell', 'src')];
  check(src.some((d) => fs.existsSync(d)), 'scaffold src/ must exist');
});

// ── 결과 ────────────────────────────────────────────────────────────────────
console.log('');
if (failures) {
  console.log(`✗ imagegen integrity QA: ${failures} case(s) failed`);
  console.log(`  fixtures kept for inspection: ${WORK}`);
  process.exit(1);
}
fs.rmSync(WORK, { recursive: true, force: true });
console.log('✔ imagegen integrity QA: 8/8 checks passed (7 cases + skip path)');
