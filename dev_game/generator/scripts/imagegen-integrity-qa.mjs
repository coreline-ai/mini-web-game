#!/usr/bin/env node
// imagegen 무결성 회귀 테스트 — 영수증 기반 승격·원자적 생성·레거시 정책이 회귀하지 않는지
// 스텁 codex로 검증한다. CI-safe: chroma helper(~/.codex) 없이 배경 자산만 사용하며,
// python3 + Pillow만 요구한다 (생성 검증·리샘플 단계가 쓰는 것과 동일).
//
// 케이스 1~7: implement_20260815_123807.md Phase 4 / 8~12: implement_20260815_132631.md Phase B
//   1.  exec 비정상 종료   → 실패 판정 + 원본 보존 + 기존 영수증 무손상
//   2.  정체 출력          → unchanged-output 실패 + 원본 보존
//   3.  무영수증 + wire    → draft 유지 + no-receipt 보고
//   4.  SHA 불일치         → skip 거부·재생성 → 새 영수증 실일치
//   5.  legacy-1 + wire    → 승격 유지
//   6.  custom-loop 무Codex → 스캐폴드 완주
//   7.  성공 경로          → 영수증 발급 → skip-existing 전부 skip (거부-만능 방지)
//   8.  품질 거부 소진     → 원본 보존 / 8b. 원본 없으면 거부 산출물도 남기지 않음
//   9.  승격 성공 경로     → 배경 3종 + 코어 스프라이트 → qualityTier production-demo
//   10. 실패 있는 실행     → 승격 조건을 만족해도 tier 미승격(이전 승격도 draft로 되돌림)
//   11. 런타임 수출        → 영수증이 최종 WebP 기준으로 재계산
//   12. 게이트 영수증 분기 → 무영수증 검출 / legacy-1 통과 / SHA 불일치 검출
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
const GATE = path.join(SCRIPTS, 'production-demo-qa.mjs');
const MAKEGAME = path.join(SCRIPTS, 'make-game.mjs');
const V2_SPEC = path.join(SCRIPTS, '..', 'examples', 'custom-loop-shell.spec.json');

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'imagegen-integrity-'));
const BIN = path.join(WORK, 'bin');
const MODE_FILE = path.join(BIN, 'mode.txt');
fs.mkdirSync(BIN, { recursive: true });

// ── 스텁 codex ──────────────────────────────────────────────────────────────
// mode.txt:
//   "ok"              결정적 노이즈 PNG(같은 입력이면 같은 바이트 — 정체 출력 테스트에 이용)
//   "fail"            exec 단계에서 exit 3
//   "stale"           exec는 성공하나 이전 산출물과 동일 바이트
//   "reject:<접두사>"  해당 id만 민무늬 PNG(품질 검증에서 soft edge로 거부) — 나머지는 ok
//
// --version 출력에 "codex"가 반드시 포함돼야 한다. findCodexOrNull이 /codex/i로 후보를
// 걸러내므로, 그 문자열이 없으면 스텁이 조용히 탈락하고 실제 codex가 돌아 테스트가
// 무의미해진다(실제로 겪은 함정).
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
if (mode.startsWith('reject:') && name.startsWith(mode.slice(7))) {
  // 생성 자체는 성공(exit 0 + 새 바이트)하지만 품질 검증에서 거부되는 산출물.
  // 시도마다 색을 바꿔 unchanged-output이 아니라 verify 실패 경로를 타게 한다.
  const counter = path.join(dir, '.' + name + '.rejects');
  const n = fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0;
  fs.writeFileSync(counter, String(n + 1));
  const flat = "from PIL import Image\\nImage.new('RGB',(1080,1920),(20,16," + (28 + n * 7) + ")).save(r'" + dir + "/" + name + "')";
  const rr = spawnSync('python3', ['-c', flat], { encoding: 'utf8' });
  process.exit(rr.status === 0 ? 0 : 1);
}
// 생성 시점 검증이 실제 게이트와 같은 세 지표를 본다: 엣지분산(≥60) · 고주파(≤3.6) ·
// 색수(≥8000). 단순 노이즈는 hf에, 단색 블록은 색수에 걸린다. 블록마다 부드러운
// 그라디언트를 넣으면 경계는 선명하고(엣지) 내부는 평활하며(hf) 색은 풍부하다(색수) —
// 실제 게임 배경 아트의 통계적 특성과 같은 자리에 놓인다. 실측: colors 12029 / edge 329 / hf 1.23
const py = [
  "from PIL import Image",
  "import random",
  "im=Image.new('RGB',(1080,1920))",
  "px=im.load()",
  "random.seed(7)",
  "B=160",
  "for by in range(0,1920,B):",
  "    for bx in range(0,1080,B):",
  "        c0=(random.randrange(256),random.randrange(256),random.randrange(256))",
  "        c1=(random.randrange(256),random.randrange(256),random.randrange(256))",
  "        for y in range(by,min(by+B,1920)):",
  "            t=(y-by)/B",
  "            c=tuple(int(c0[i]+(c1[i]-c0[i])*t) for i in range(3))",
  "            for x in range(bx,min(bx+B,1080)): px[x,y]=c",
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
const LEGACY_PROVENANCE = {
  source: 'generated-for-game', generatedFor: GID, method: 'codex-gpt-imagegen-skill',
  model: 'gpt 이미지젠 스킬', sourceSkill: 'imagegen', promptHash: 'pre-receipt-era',
  provenanceVersion: 'legacy-1',
};
// `backgrounds`: 배경 개수(qualityTier 승격은 3개 이상을 요구하므로 승격 경로 검증에 필요)
// `legacySprite`: legacy-1 provenance를 가진 알파 PNG 코어 스프라이트를 미리 깔아 둔다.
//   크로마 헬퍼 없이 coreAll 조건을 만족시키는 유일한 방법이라 CI에서도 승격 경로를 탈 수 있다.
// `legacyBackgrounds`: 배경 엔트리에도 legacy-1을 붙인다(재생성 실패 시에도 승격 상태가 유지되는
//   현실적 상황 — genFailures 가드만 따로 검증하기 위해 필요하다).
function makeFixture(name, { backgrounds = 1, legacySprite = false, legacyBackgrounds = false } = {}) {
  const dir = path.join(WORK, name);
  fs.mkdirSync(path.join(dir, 'assets', 'backgrounds'), { recursive: true });
  const bgs = Array.from({ length: backgrounds }, (_, i) => ({
    id: `stage-${i + 1}`, path: `assets/backgrounds/stage-${i + 1}.png`,
    width: 1080, height: 1920, prompt: `integrity test stage ${i + 1}`,
  }));
  const plan = {
    gameId: GID,
    themeColors: { background: '#1a0e18', player: '#ffb347', collectible: '#ffd54a', ui: '#fff3e0' },
    backgrounds: bgs, sprites: [], ui: [], fx: [],
  };
  const manifest = {
    qualityTier: 'draft',
    stageBackgrounds: bgs.map((b) => ({
      id: b.id, path: b.path, delivery: 'runtime', quality: 'draft',
      ...(legacyBackgrounds ? { provenance: { ...LEGACY_PROVENANCE } } : {}),
    })),
    images: [],
  };
  if (legacySprite) {
    fs.mkdirSync(path.join(dir, 'assets', 'characters'), { recursive: true });
    const spPath = path.join(dir, 'assets', 'characters', 'hero.png');
    const r = spawnSync('python3', ['-c',
      `from PIL import Image, ImageDraw\nim=Image.new('RGBA',(512,512),(0,0,0,0))\nd=ImageDraw.Draw(im)\nd.ellipse([60,60,452,452],fill=(200,120,60,255))\nd.ellipse([140,140,372,372],fill=(240,180,90,255))\nim.save(r"${spPath}")`,
    ], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`legacy sprite fixture failed: ${r.stderr}`);
    plan.sprites.push({ id: 'hero', path: 'assets/characters/hero.png', role: 'player', prompt: 'hero' });
    manifest.images.push({
      id: 'hero', path: 'assets/characters/hero.png', type: 'sprite', role: 'player',
      delivery: 'runtime', quality: 'draft', requiresAlpha: true, provenance: { ...LEGACY_PROVENANCE },
    });
  }
  // production-demo-qa는 이 둘이 없으면 다른 검사를 하기 전에 조기 반환한다.
  // 케이스 12가 영수증 분기까지 도달하려면 최소 골격이 필요하다.
  fs.mkdirSync(path.join(dir, 'src', 'game', 'data'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, private: true }, null, 2));
  fs.writeFileSync(path.join(dir, 'src', 'game', 'data', 'game-spec.json'), JSON.stringify({ schemaVersion: '1.0.0', game: { id: name } }, null, 2));
  fs.writeFileSync(path.join(dir, 'asset-plan.json'), JSON.stringify(plan, null, 2));
  fs.writeFileSync(path.join(dir, 'assets', 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
  return dir;
}
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const manifestOf = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'assets', 'asset-manifest.json'), 'utf8'));
const bgEntryOf = (dir) => manifestOf(dir).stageBackgrounds.find((x) => x.id === 'stage-1');
const bgFileOf = (dir) => path.join(dir, bgEntryOf(dir).path);

function runImagegen(dir, extra = [], { runtimeExport = false } = {}) {
  const args = [IMAGEGEN, '--project', dir, '--only', 'backgrounds'];
  if (!runtimeExport) args.push('--no-runtime-export');
  const r = spawnSync(process.execPath, [...args, ...extra], {
    encoding: 'utf8', env: { ...process.env, DEVGAME_CODEX_BIN: stubBin },
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}
function runGate(dir) {
  const r = spawnSync(process.execPath, [GATE, '--project', dir, '--require-gpt-imagegen'], { encoding: 'utf8' });
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

// ── 8. 품질 거부로 재시도 소진 → 원본 보존 ──────────────────────────────────
// codexGenerate의 stash는 한 시도만 덮는다(새 바이트면 성공으로 보고 원본을 버림).
// 품질 검증은 그 위층이라, "생성됐지만 거부됨"이 반복되면 좋은 원본이 사라지고 거부
// 산출물만 남는 사고가 실제로 재현됐다. preserveOriginal이 그 구간을 덮는지 검증한다.
const D = makeFixture('fixture-d');
testCase('case 8: 품질 거부 재시도 소진 → 원본 보존 (거부 산출물로 대체되지 않음)', () => {
  setMode('ok');
  const first = runImagegen(D);
  check(first.status === 0, 'baseline generation must succeed');
  const goodSha = sha(bgFileOf(D));
  setMode('reject:stage-1');
  const { status, out } = runImagegen(D);
  check(status !== 0, 'exit non-zero expected when every attempt is rejected');
  check(/FAILED/.test(out), 'expected an explicit retries-exhausted report');
  check(sha(bgFileOf(D)) === goodSha, 'the good original must survive a fully rejected regeneration');
  const leftovers = fs.readdirSync(path.dirname(bgFileOf(D))).filter((f) => /\.orig\.|\.prev\./.test(f));
  check(leftovers.length === 0, `no temp artefacts may be left behind, found: ${leftovers.join(', ')}`);
});
testCase('case 8b: 원본이 없던 상태에서 전 시도 거부 → 거부 산출물을 남기지 않음', () => {
  const E = makeFixture('fixture-e');
  setMode('reject:stage-1');
  const { status } = runImagegen(E);
  check(status !== 0, 'exit non-zero expected');
  check(!fs.existsSync(bgFileOf(E)), 'a rejected artefact must not be left under assets/ (it would ship to dist)');
});

// ── 9/10. qualityTier 승격 — 성공 경로와 실패-차단 가드 ─────────────────────
// 이전 픽스처는 배경 1개뿐이라 승격 조건(배경 3개 + 코어 스프라이트)이 구조적으로
// 불성립이었고, "승격되지 않았다"는 assert가 항상 참인 vacuous 검사였다.
testCase('case 9: 배경 3종 + 코어 스프라이트 전부 증명 → qualityTier production-demo 승격', () => {
  const F = makeFixture('fixture-f', { backgrounds: 3, legacySprite: true });
  setMode('ok');
  const { status, out } = runImagegen(F);
  check(status === 0, `exit 0 expected, got ${status}\n${out.slice(-400)}`);
  const m = manifestOf(F);
  check(m.stageBackgrounds.every((b) => b.quality === 'production-demo'), 'all three backgrounds must be promoted');
  check(m.images.find((i) => i.id === 'hero')?.quality === 'production-demo', 'the legacy-1 core sprite must be promoted');
  check(m.qualityTier === 'production-demo', `qualityTier must flip, got ${m.qualityTier}`);
});
testCase('case 10: 승격 조건을 모두 만족해도 생성 실패가 1건 있으면 tier 미승격', () => {
  const G = makeFixture('fixture-g', { backgrounds: 3, legacySprite: true, legacyBackgrounds: true });
  setMode('ok');
  runImagegen(G); // 세 배경 실제 생성 → 영수증 획득
  setMode('reject:stage-3'); // stage-3만 거부, 원본은 보존되어 승격 상태 유지
  const { status } = runImagegen(G);
  check(status !== 0, 'the run must fail because one asset exhausted its retries');
  const m = manifestOf(G);
  check(m.stageBackgrounds.every((b) => b.quality === 'production-demo'), 'preserved originals keep their promotion (precondition for this test)');
  check(m.images.find((i) => i.id === 'hero')?.quality === 'production-demo', 'core sprite still promoted (precondition)');
  check(m.qualityTier !== 'production-demo', `tier must not be promoted on a run with generation failures, got ${m.qualityTier}`);
});

// ── 11. 런타임 WebP 수출 후 영수증 재계산 ───────────────────────────────────
testCase('case 11: 런타임 수출 시 영수증이 최종 WebP 기준으로 재계산됨', () => {
  const H = makeFixture('fixture-h');
  setMode('ok');
  const { status, out } = runImagegen(H, [], { runtimeExport: true });
  check(status === 0, `exit 0 expected, got ${status}\n${out.slice(-400)}`);
  const e = bgEntryOf(H);
  check(/\.webp$/.test(e.path), `manifest must point at the runtime WebP, got ${e.path}`);
  check(fs.existsSync(bgFileOf(H)), 'the runtime WebP must exist on disk');
  check(e.provenance?.outputSha256 === sha(bgFileOf(H)), 'receipt must hash-match the exported WebP, not the master PNG');
  check(fs.existsSync(path.join(H, 'assets', '_source', 'masters', 'stage-1.png')), 'the master PNG must be kept under assets/_source/masters/');
});

// ── 12. 게이트의 영수증 검증 분기 ───────────────────────────────────────────
// 이 분기는 실게임 438개가 전부 legacy-1이라 어떤 실행에서도 타지 않는다. 게이트를
// 직접 호출해 세 상태의 판정을 고정한다. 픽스처는 다른 사유로도 실패하므로 판정은
// 영수증 관련 에러 문자열의 유무로만 한다.
const MISSING = /missing the generation receipt/;
const MISMATCH = /receipt mismatch/;
testCase('case 12: 게이트가 무영수증을 잡고, legacy-1은 통과시키고, SHA 불일치를 잡는다', () => {
  const I = makeFixture('fixture-i');
  setMode('ok');
  runImagegen(I);
  const file = bgFileOf(I);

  const setProv = (prov) => {
    const m = manifestOf(I);
    m.stageBackgrounds[0].provenance = prov;
    fs.writeFileSync(path.join(I, 'assets', 'asset-manifest.json'), JSON.stringify(m, null, 2));
  };
  const claimOnly = {
    source: 'generated-for-game', generatedFor: GID, method: 'codex-gpt-imagegen-skill',
    model: 'gpt 이미지젠 스킬', sourceSkill: 'imagegen', promptHash: 'claimed',
  };

  setProv({ ...claimOnly });
  check(MISSING.test(runGate(I).out), 'a receiptless entry must be reported as missing the generation receipt');

  setProv({ ...claimOnly, provenanceVersion: 'legacy-1' });
  const legacyOut = runGate(I).out;
  check(!MISSING.test(legacyOut) && !MISMATCH.test(legacyOut), 'legacy-1 must be grandfathered past the receipt check');

  setProv({ ...claimOnly, outputSha256: sha(file), runId: 'test-run', generatedAt: new Date().toISOString() });
  const validOut = runGate(I).out;
  check(!MISSING.test(validOut) && !MISMATCH.test(validOut), 'a valid receipt must pass the receipt check');

  setProv({ ...claimOnly, outputSha256: '0'.repeat(64), runId: 'test-run', generatedAt: new Date().toISOString() });
  check(MISMATCH.test(runGate(I).out), 'a receipt that does not hash-match the file must be reported as a mismatch');
});

// ── 13. 파생 자산(derived) 규칙 ─────────────────────────────────────────────
// 파생 인정이 "다른 게임 자산 재사용" 금지를 뚫으면 안 된다. 부모가 같은 manifest 안의
// generated-for-game 자산일 때만 통과해야 한다.
testCase('case 13: 파생 자산은 같은 게임의 자산에서만 인정된다', () => {
  const J = makeFixture('fixture-j');
  setMode('ok');
  runImagegen(J);
  const mf = path.join(J, 'assets', 'asset-manifest.json');
  const withDerived = (prov) => {
    const m = manifestOf(J);
    m.images = [{ id: 'derived-sheet', path: m.stageBackgrounds[0].path, type: 'sprite', role: 'player', quality: 'production-demo', provenance: prov }];
    fs.writeFileSync(mf, JSON.stringify(m, null, 2));
    return runGate(J).out;
  };
  const base = { source: 'derived-from-generated-for-game', generatedFor: 'fixture-j' };

  check(/no provenance.derivedFrom parents/.test(withDerived({ ...base })),
    'a derived asset without derivedFrom must be rejected');
  check(/not an asset of this game/.test(withDerived({ ...base, derivedFrom: ['some-other-games-hero'] })),
    'deriving from an id that is not in this manifest must be rejected (this is what keeps shared assets banned)');

  const okOut = withDerived({ ...base, derivedFrom: ['stage-1'] });
  check(!/derivedFrom|not an asset of this game|circular/.test(okOut),
    `deriving from this game's own generated asset must pass, got:\n${okOut.slice(-300)}`);
  check(!/derived-sheet provenance\.(method|model|sourceSkill|promptHash)/.test(okOut),
    'a derived asset must not be asked for imagegen fields — its origin is proven by its parent');

  // 순환: A가 B에서, B가 A에서 파생
  const m = manifestOf(J);
  m.images = [
    { id: 'd-a', path: m.stageBackgrounds[0].path, type: 'sprite', role: 'player', quality: 'production-demo', provenance: { ...base, derivedFrom: ['d-b'] } },
    { id: 'd-b', path: m.stageBackgrounds[0].path, type: 'sprite', role: 'player', quality: 'production-demo', provenance: { ...base, derivedFrom: ['d-a'] } },
  ];
  fs.writeFileSync(mf, JSON.stringify(m, null, 2));
  check(/circular derivation chain/.test(runGate(J).out), 'a circular derivation chain must be reported, not looped on');
});

// ── 14. v2 custom-loop의 장르 고유 role로도 tier가 승격되는가 ───────────────
// 아케이드 어휘(player/hazard/…) 하드코딩만 보던 시절에는 custom-loop 게임이 무슨 짓을
// 해도 tier가 draft에 묶였다. 계약은 spec의 requiredAssetRoles가 권위라고 정한다.
testCase('case 14: v2 requiredAssetRoles의 장르 고유 role로 tier 승격', () => {
  const K = makeFixture('fixture-k', { backgrounds: 3, legacySprite: true });
  // 스프라이트 role을 아케이드 어휘에 없는 이름으로 바꾸고, spec에 그것을 선언한다.
  const m = manifestOf(K);
  m.images[0].role = 'cargo-ship';
  fs.writeFileSync(path.join(K, 'assets', 'asset-manifest.json'), JSON.stringify(m, null, 2));
  const planFile = path.join(K, 'asset-plan.json');
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  plan.sprites[0].role = 'cargo-ship';
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
  const specFile = path.join(K, 'src', 'game', 'data', 'game-spec.json');
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  spec.schemaVersion = '2.0.0';
  spec.requiredAssetRoles = ['stage-backdrop', 'cargo-ship'];
  fs.writeFileSync(specFile, JSON.stringify(spec, null, 2));

  setMode('ok');
  const { status, out } = runImagegen(K);
  check(status === 0, `exit 0 expected, got ${status}\n${out.slice(-300)}`);
  check(manifestOf(K).qualityTier === 'production-demo',
    `custom-loop roles must be able to reach production-demo, got ${manifestOf(K).qualityTier}`);
});

// ── 결과 ────────────────────────────────────────────────────────────────────
console.log('');
if (failures) {
  console.log(`✗ imagegen integrity QA: ${failures} case(s) failed`);
  console.log(`  fixtures kept for inspection: ${WORK}`);
  process.exit(1);
}
fs.rmSync(WORK, { recursive: true, force: true });
console.log('✔ imagegen integrity QA: all cases passed');
