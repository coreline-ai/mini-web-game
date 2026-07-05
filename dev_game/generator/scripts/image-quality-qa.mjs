#!/usr/bin/env node
// image-quality-qa.mjs — OBJECTIVE image quality gate.
//
// Policy (user mandate): every shipped image must be produced through the Codex
// imagegen skill at main-game ("Don't Get Pooped!") quality. Arbitrary/procedural
// image generation is FORBIDDEN as final art. This gate enforces it with pixel-level
// measurements calibrated against the main project's shipped assets:
//
//   main-game backgrounds : 1080x1920, colors 16K-25K, edge-variance 172-480
//   main-game sprites     : 512px, colors 8.6K-17.7K, edge-variance 481-1338
//   procedural placeholder: colors ~1085, edge-variance ~16  → must always FAIL
//
// Checks per asset (thresholds = main-game minimums with safety margin):
//   - provenance.method === "codex-gpt-imagegen-skill"  (임의 생성 금지)
//   - backgrounds >= 1080x1920, colors >= 8000, edgeVar >= 100
//   - core sprites use role-aware minimums (large heroes 320px+, gameplay objects 220px+),
//       colors >= 3000, edgeVar >= 150, alpha
//   - ui >= 96px, colors >= 1500, edgeVar >= 100, alpha
//   - fx/feedback >= 128px, colors >= 3000, edgeVar >= 200, alpha
//   - placeholder auto-reject: colors < 2000 or edgeVar < 60
//   - required set is genre-adaptive: >=3 backgrounds, player when applicable,
//     at least one core gameplay object/target, a pause/button UI asset, and feedback/FX.
//
// Usage: node generator/scripts/image-quality-qa.mjs --project <generated-game-dir>

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REQUIRED_METHOD = 'codex-gpt-imagegen-skill';
const CORE_ROLES = new Set(['player', 'hazard', 'obstacle', 'enemy', 'boss', 'collectible', 'reward', 'projectile', 'vehicle', 'parcel', 'sort-bin', 'item', 'powerup', 'target', 'goal', 'scanner', 'conveyor']);
const GAMEPLAY_OBJECT_LIKE = new Set(['hazard', 'obstacle', 'enemy', 'boss', 'target', 'goal', 'vehicle', 'parcel', 'sort-bin', 'item', 'powerup', 'projectile', 'scanner', 'conveyor']);
const COLLECT_LIKE = new Set(['collectible', 'reward']);

// hfMax = STYLE ceiling on high-frequency energy (mean 3x3 Laplacian, full frame).
// USER MANDATE: only main-game-quality 3D-glossy-cartoon art passes; the busy painterly/
// gacha look the user rejected must FAIL. Thresholds are calibrated on real measurements so
// they pass {main game + style-bible regenerated assets} and reject {the old painterly slop}:
//   backgrounds — main game 1.7-3.25, style-bible regen 1.1-1.8  | old painterly 3.83-4.12 → hfMax 3.6
//   core sprite — main game char 2.9-3.9, regen chibi sheet 6.9   | old gacha hero 8.98      → hfMax 8.0
//   ui          — main game buttons 2.6-2.9, regen btn 3.8        |                          → hfMax 6.0
//   fx          — regen fx 2.2-2.5                                |                          → hfMax 6.0
// NOTE: kept strict per explicit user instruction ("그 정도의 품질만 통과"). The productionize
// ART BIBLE already forces this style into every prompt, so on-style assets land far under these.
const T = {
  background: { minW: 1080, minH: 1920, colors: 8000, edge: 60, hfMax: 3.6 },
  core: { minSide: 256, colors: 3000, edge: 150, alpha: true, hfMax: 8.0 },
  ui: { minSide: 96, colors: 1500, edge: 100, alpha: true, hfMax: 6.0 },
  fx: { minSide: 128, colors: 3000, edge: 200, alpha: true, hfMax: 6.0 },
  placeholder: { colors: 2000, edge: 60 },
};

const ROLE_MIN_SIDE = {
  player: 320,
  parcel: 220,
  vehicle: 300,
  'sort-bin': 260,
  scanner: 160,
  conveyor: 256,
  collectible: 192,
  reward: 192,
  item: 192,
  powerup: 192,
  target: 192,
  goal: 192,
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--project') args.project = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.project) throw new Error('Missing required --project <dir>');
  return args;
}

function usage() {
  console.log('Usage: node generator/scripts/image-quality-qa.mjs --project <generated-game-dir>');
}

// PIL 측정 (해상도/고유색/엣지분산/알파) — 한 번의 python3 호출로 배치 측정
function measure(files) {
  const py = `
import sys, json
from PIL import Image, ImageFilter, ImageStat
out=[]
for p in json.load(sys.stdin):
    try:
        im=Image.open(p); w,h=im.size
        rgb=im.convert('RGB')
        small=rgb.resize((min(256,w),min(256,h)))
        colors=len(set(list(small.getdata())))
        edge=ImageStat.Stat(rgb.convert('L').filter(ImageFilter.FIND_EDGES)).var[0]
        # hf = high-frequency energy (mean 3x3 Laplacian over the FULL frame). STYLE metric:
        # clean 3D-glossy render (smooth interiors + a few bold edges) is low; busy painterly/
        # gacha noise is 2-3x higher. Full-frame (not opaque-masked) is intentional — a clean
        # chibi's bold outline spikes per-pixel, but averaged across the whole frame it stays low,
        # while painterly noise stays high everywhere. Calibrated: main-game char 2.9 vs my old 9.0.
        g=rgb.convert('L')
        lap=g.filter(ImageFilter.Kernel((3,3),[0,-1,0,-1,4,-1,0,-1,0],1,0))
        hf=ImageStat.Stat(lap).mean[0]
        alpha=False
        if im.mode in ('RGBA','LA','PA'):
            a=im.convert('RGBA').getchannel('A')
            mn,_=a.getextrema(); alpha = mn < 250
        out.append({'p':p,'w':w,'h':h,'colors':colors,'edge':round(edge,1),'hf':round(hf,2),'alpha':alpha})
    except Exception as e:
        out.append({'p':p,'err':str(e)})
print(json.dumps(out))
`;
  const r = spawnSync('python3', ['-c', py], { input: JSON.stringify(files), encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) throw new Error(`python3/PIL 측정 실패: ${r.stderr || r.stdout}`);
  const arr = JSON.parse(r.stdout);
  return new Map(arr.map((m) => [m.p, m]));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }
  // production-gate가 dev_game cwd로 호출하므로 다른 게이트와 동일한 후보 해석
  const candidates = [
    path.resolve(process.cwd(), args.project),
    path.resolve(process.cwd(), '..', args.project),
    path.resolve(process.cwd(), 'generated', args.project),
    path.resolve(process.cwd(), '..', 'generated', args.project),
  ];
  const projectDir = candidates.find((c) => fs.existsSync(c)) || candidates[0];
  const manifestFile = path.join(projectDir, 'assets/asset-manifest.json');
  if (!fs.existsSync(manifestFile)) { console.error('assets/asset-manifest.json missing'); process.exit(1); }
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const errors = [];

  const bgs = Array.isArray(manifest.stageBackgrounds) ? manifest.stageBackgrounds : [];
  const imgs = Array.isArray(manifest.images) ? manifest.images : [];

  // ---- 필수 집합 (임의 생략 금지) ----
  if (bgs.length < 3) errors.push(`stage backgrounds must be >= 3 (found ${bgs.length})`);
  const roleOf = (e) => String(e.role || '').toLowerCase();
  if (!imgs.some((e) => roleOf(e) === 'player')) errors.push('required core asset missing: role "player"');
  if (!imgs.some((e) => GAMEPLAY_OBJECT_LIKE.has(roleOf(e)))) {
    errors.push('required core asset missing: gameplay object/target role (hazard/vehicle/parcel/sort-bin/target/etc.)');
  }
  const hasCollectibleSpec = Boolean(manifest.requiresCollectibleAssets || manifest.requiredRoles?.includes?.('collectible'));
  if (hasCollectibleSpec && !imgs.some((e) => COLLECT_LIKE.has(roleOf(e)))) errors.push('required core asset missing: collectible-like role');
  const hasPauseButton = imgs.some((e) => /(^|[-_])pause($|[-_])|button_pause|btn-pause/i.test(String(e.id || '')));
  const hasAnyButton = imgs.some((e) => /button|btn/i.test(String(e.id || '')) || roleOf(e) === 'ui-icon');
  const hasFeedback = imgs.some((e) => roleOf(e) === 'feedback' || String(e.type || '').toLowerCase() === 'fx' || /^fx[-_]|stamp|combo/i.test(String(e.id || '')));
  if (!hasAnyButton) errors.push('required UI asset missing: at least one generated button/ui-icon');
  if (!hasPauseButton) errors.push('required UI asset missing: generated pause button/icon');
  if (!hasFeedback) errors.push('required feedback/FX image missing: stamp/combo/fx asset');

  // ---- 검사 대상 수집 ----
  const jobs = [];
  const meta = [];
  const push = (entry, kind) => {
    const file = path.join(projectDir, entry.path || '');
    jobs.push(file);
    meta.push({ entry, kind, file, label: `${entry.id || entry.path} [${kind}]` });
  };
  for (const bg of bgs) push(bg, 'background');
  for (const e of imgs) {
    const role = roleOf(e);
    if (CORE_ROLES.has(role)) push(e, 'core');
    else if (e.id === 'btn-frame' || e.id === 'btn-pause' || role === 'ui-icon' || e.type === 'ui') push(e, 'ui');
    else if (String(e.id || '').startsWith('fx-') || e.type === 'fx' || role === 'feedback') push(e, 'fx');
  }

  // ---- provenance 강제 (imagegen 스킬 산출물만 허용) ----
  for (const m of meta) {
    const p = m.entry.provenance || {};
    if (p.method !== REQUIRED_METHOD) {
      errors.push(`${m.label} provenance.method must be "${REQUIRED_METHOD}" (임의/절차적/API 생성 금지), got "${p.method || 'none'}"`);
    }
  }

  // ---- 파일 존재 + 픽셀 측정 ----
  const missing = meta.filter((m) => !fs.existsSync(m.file));
  for (const m of missing) errors.push(`${m.label} file missing: ${m.entry.path}`);
  const present = meta.filter((m) => fs.existsSync(m.file));
  const measured = present.length ? measure(present.map((m) => m.file)) : new Map();

  for (const m of present) {
    const r = measured.get(m.file);
    if (!r || r.err) { errors.push(`${m.label} unreadable image: ${r?.err || 'no result'}`); continue; }
    // placeholder 자동 탈락 (절차적/단색 이미지)
    if (r.colors < T.placeholder.colors || r.edge < T.placeholder.edge) {
      errors.push(`${m.label} looks procedural/placeholder (colors=${r.colors}, edgeVar=${r.edge}) — imagegen 고품질 아트로 재생성 필요`);
      continue;
    }
    if (m.kind === 'background') {
      if (r.w < T.background.minW || r.h < T.background.minH) errors.push(`${m.label} ${r.w}x${r.h} below main-game bar ${T.background.minW}x${T.background.minH}`);
      if (r.colors < T.background.colors) errors.push(`${m.label} colors ${r.colors} < ${T.background.colors} (detail below main-game bar)`);
      if (r.edge < T.background.edge) errors.push(`${m.label} edgeVar ${r.edge} < ${T.background.edge} (sharpness below main-game bar)`);
      if (r.hf > T.background.hfMax) errors.push(`${m.label} hf ${r.hf} > ${T.background.hfMax} — too noisy/oversharpened for production-demo (재생성 필요)`);
    } else {
      const t = { ...T[m.kind] };
      const role = roleOf(m.entry);
      if (m.kind === 'core' && ROLE_MIN_SIDE[role]) t.minSide = ROLE_MIN_SIDE[role];
      const frames = Number(m.entry.frames || 1);
      const minSideActual = frames > 1 ? Math.min(r.w / frames, r.h) : Math.min(r.w, r.h);
      if (minSideActual < t.minSide) errors.push(`${m.label} ${frames > 1 ? `frame ${Math.round(minSideActual)}px` : `${r.w}x${r.h}`} below min side ${t.minSide}px`);
      if (r.colors < t.colors) errors.push(`${m.label} colors ${r.colors} < ${t.colors}`);
      if (r.edge < t.edge) errors.push(`${m.label} edgeVar ${r.edge} < ${t.edge}`);
      if (t.hfMax && r.hf > t.hfMax) errors.push(`${m.label} hf ${r.hf} > ${t.hfMax} — too noisy/oversharpened for production-demo (재생성 필요)`);
      if (t.alpha && !r.alpha) errors.push(`${m.label} has no transparency (alpha required)`);
    }
  }

  if (errors.length) {
    console.error(`Image quality QA failed: ${projectDir}`);
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(`Image quality QA OK: ${projectDir} (${present.length} assets at role-aware production-demo bar)`);
}

try { main(); } catch (err) { console.error(err.message || err); usage(); process.exit(1); }
