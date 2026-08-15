#!/usr/bin/env node
// codex-imagegen.mjs — dev_game AI ART STEP.
// Reads a generated game's asset-plan.json and produces production-grade raster art
// by driving Codex's BUILT-IN imagegen skill / image_gen tool via `codex exec`.
// No image SDK runner is generated. Backgrounds are generated directly; sprites are generated on
// a flat chroma-key background and made transparent with the imagegen skill's
// remove_chroma_key.py helper. Generated entries are promoted to quality:"production-demo"
// in asset-manifest.json, and qualityTier flips to "production-demo" once every core
// asset + >=3 backgrounds are real art — which is exactly what factory:production-demo-qa gates.
//
// Usage:
//   node generator/scripts/codex-imagegen.mjs --project <dir> [--only backgrounds|sprites|all]
//   DEVGAME_CODEX_BIN=/path/to/codex node ... (override codex binary)
//
// A full run is one `codex exec` per plan asset (3-25 for a typical game, up to --timeout
// each), so it routinely outruns a caller's command timeout. --skip-existing + --id make a
// partial run resumable: rerun the same command and only the missing/broken assets regenerate.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { findCodex, resolveCodexHome, chromaHelperPath, codexGenerate } from './lib/codex-host.mjs';

function parseArgs(argv) {
  const args = { only: 'all', timeoutSec: 300 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--project') args.project = argv[++i];
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--codex') args.codex = argv[++i];
    else if (a === '--timeout') args.timeoutSec = Number(argv[++i]);
    else if (a === '--skip-existing') args.skipExisting = true;
    else if (a === '--id') args.id = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.project) throw new Error('Missing required --project <dir>');
  if (!['all', 'backgrounds', 'sprites', 'ui', 'fx', 'wire'].includes(args.only)) throw new Error('--only must be all|backgrounds|sprites|ui|fx|wire');
  return args;
}

function usage() {
  console.log(`Usage:
  node generator/scripts/codex-imagegen.mjs --project <generated-game-dir> [--only all|backgrounds|sprites]

Drives Codex built-in imagegen skill / image_gen tool (via 'codex exec') to
generate production art declared in <project>/asset-plan.json, then promotes matching
asset-manifest.json entries to quality:"production-demo".

Options:
  --only <group>      all|backgrounds|sprites|ui|fx|wire (default all)
  --skip-existing     Reuse on-disk assets that already pass validation; regenerate only
                      the missing, undersized, or opaque ones. Makes an interrupted run
                      resumable instead of restarting every image.
  --id <glob>         Only process plan entries whose id matches (e.g. --id "stage-*")
  --timeout <sec>     Per-image timeout, default 300
  --codex <bin>       codex binary to drive

Env:
  DEVGAME_CODEX_BIN   Path to a working codex binary (auto-detected otherwise)
  CODEX_HOME          Codex home holding the imagegen skill's remove_chroma_key.py`);
}

// findCodex / codexGenerate / CODEX_HOME resolution live in lib/codex-host.mjs so that
// host-preflight.mjs probes exactly the host this step will drive.

// 이 프로세스 1회 실행을 식별한다. 영수증이 어느 실행에서 나왔는지 추적하기 위한 것.
const RUN_ID = crypto.randomBytes(8).toString('hex');

function sha256File(f) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); } catch { return null; }
}

function readJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
function writeJson(f, o) { fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n'); }
function promptHash(id, prompt = '') {
  return crypto.createHash('sha256').update(`${id}|${prompt}`).digest('hex').slice(0, 16);
}
function imagegenProvenance(gameId, id, prompt = '', extra = {}) {
  return {
    source: 'generated-for-game',
    generatedFor: gameId,
    generator: 'dev_game/generator/scripts/codex-imagegen.mjs',
    method: 'codex-gpt-imagegen-skill',
    // 내장 image_gen 도구는 모델 버전을 노출하지 않는다. 정확한 모델명 미검증(opaque).
    // 모델명 단정 대신 사용자 기준 명칭인 gpt 이미지젠 스킬로 기록한다.
    model: 'gpt 이미지젠 스킬',
    modelVerified: false,
    postProcessing: ['chroma-key-removal', 'autocrop-resize'],
    sourceSkill: 'imagegen',
    toolMode: 'built-in-image_gen',
    promptHash: promptHash(id, prompt),
    quality: 'high',
    // 실행 영수증 — 이 파일이 실제 생성 호출에서 나왔음을 증명한다. 디스크에 파일이 있다는
    // 사실만으로는 출처가 성립하지 않으므로, 영수증은 성공한 생성 경로에서만 붙는다.
    runId: RUN_ID,
    generatedAt: new Date().toISOString(),
    ...extra,
  };
}

// PNG IHDR layout: width@16, height@20, bit depth@24, colour type@25.
// Colour types 4 (grey+alpha) and 6 (RGBA) are the ones carrying an alpha channel — a sprite
// that comes back as type 2 (RGB) is proof chroma-key removal never took effect on it.
function pngInfo(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.length < 26 || b[0] !== 0x89 || b[1] !== 0x50) return null;
    const colorType = b[25];
    return {
      width: b.readUInt32BE(16),
      height: b.readUInt32BE(20),
      colorType,
      hasAlpha: colorType === 4 || colorType === 6,
    };
  } catch { return null; }
}

// Background sizing follows production-demo-quality-contract.md §2.0.5 (authoritative source
// for every asset resolution in dev_game). Do not tune these numbers here — change the
// contract and mirror it, or the doc and the generator drift apart again.
//   세로 배경 · 제작 원본 2160x3840 / 런타임 권장 1080x1920
const BG_MASTER = { width: 2160, height: 3840 };
const BG_RUNTIME_MIN = { width: 1080, height: 1920 };

// Declared Resample (§2.0.5): built-in image_gen's native size is not controllable and comes
// back below the master spec (observed 941x1672). Preserving the raw and recording the true
// native size is what separates a legitimate resample from a `source-too-small` defect —
// Class L rule 9-1 judges on exactly those two artefacts.
function declaredResample(projectDir, bg, file, native) {
  const target = {
    width: Math.max(BG_MASTER.width, bg.width || 0),
    height: Math.max(BG_MASTER.height, bg.height || 0),
  };
  if (native.width >= target.width && native.height >= target.height) return null;
  const rawRel = path.join('assets/_source', `${bg.id}-raw${path.extname(file) || '.png'}`);
  const rawAbs = path.join(projectDir, rawRel);
  fs.mkdirSync(path.dirname(rawAbs), { recursive: true });
  fs.copyFileSync(file, rawAbs);
  if (!autocropResize(file, target.width, target.height, 0, { crop: false })) {
    fs.rmSync(rawAbs, { force: true });
    return null;
  }
  return {
    nativeSize: `${native.width}x${native.height}`,
    resampledTo: `${target.width}x${target.height}`,
    resampleMethod: 'lanczos',
    rawPath: rawRel,
  };
}

// Glob matcher for --id ("stage-*", "btn-?", exact ids). No pattern -> everything matches.
function idMatcher(pattern) {
  if (!pattern) return () => true;
  const rx = new RegExp('^' + pattern
    .split('*').map((part) => part.split('?').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.'))
    .join('.*') + '$');
  return (id) => rx.test(String(id));
}

// --skip-existing decision for one planned asset. Reuse only what would pass a fresh
// generation's own checks: undersized or opaque files are regenerated (that is the point of
// resuming), while a file we cannot parse is left untouched rather than silently overwritten.
function reusableExisting(file, { minW = 0, minH = 0, needsAlpha = false, entry = null } = {}) {
  if (!fs.existsSync(file)) return null;
  // 재사용은 "이전 실행이 만들었다"는 증명 위에서만 성립한다. 영수증이 없거나 파일 내용이
  // 영수증의 해시와 다르면, 그것은 이 파이프라인의 산출물이라고 볼 수 없으므로 다시 만든다.
  const receipt = entry?.provenance?.outputSha256;
  if (!receipt) return { reuse: false, note: 'no generation receipt' };
  if (sha256File(file) !== receipt) return { reuse: false, note: 'content differs from receipt' };
  const info = pngInfo(file);
  if (!info) return { reuse: true, note: 'existing non-PNG left as is' };
  if (info.width < minW || info.height < minH) return { reuse: false, note: `too small ${info.width}x${info.height}` };
  if (needsAlpha && !info.hasAlpha) return { reuse: false, note: 'opaque, no alpha channel' };
  return { reuse: true, note: `${info.width}x${info.height}` };
}

// ---- make a generated (opaque) sprite transparent via chroma-key helper ----
// Returns a status, never a bare false: a missing helper and a helper that ran and failed
// need different fixes, and callers must be able to say which happened instead of shipping
// an opaque sprite that only surfaces much later in image-quality-qa.
function removeChroma(codexHome, file) {
  const helper = chromaHelperPath(codexHome);
  if (!fs.existsSync(helper)) return { ok: false, reason: 'no-helper', helper };
  // --auto-key border: sample the key color from the image border (robust vs assuming exact magenta).
  // --despill: decontaminate key-color spill. --edge-feather 2: erode the matte 2px inward to kill
  // the residual magenta/glow HALO fringe (the pink outline bug on sprite edges).
  const r = spawnSync('python3', [helper, '--input', file, '--out', file, '--auto-key', 'border', '--despill', '--edge-feather', '2', '--force'], { encoding: 'utf8', timeout: 60000 });
  if (r.status === 0) return { ok: true, reason: 'ok' };
  const detail = String(r.stderr || r.error?.message || '').trim().split('\n').filter(Boolean).pop();
  return { ok: false, reason: 'failed', detail };
}

// Wire the generated game code to actually LOAD and DISPLAY the produced assets:
// remap sprite loads (svg -> production png paths), load stage backgrounds, and show a
// background image in Home/Game instead of a flat color. publicDir is 'assets', so a
// file at assets/characters/player.png is loaded by Phaser as 'characters/player.png'.
function rel(p) { return String(p).replace(/^assets\//, ''); }
function wireGameToAssets(projectDir, plan) {
  const spriteByRole = {};
  for (const s of plan.sprites || []) spriteByRole[s.role] = rel(s.path);
  const bgs = (plan.backgrounds || []).map((b, i) => ({ key: `bg_${i}`, path: rel(b.path) }));
  const patched = [];

  const loadingFile = path.join(projectDir, 'src/game/scenes/LoadingScene.js');
  if (fs.existsSync(loadingFile)) {
    let t = fs.readFileSync(loadingFile, 'utf8');
    const before = t;
    const playerSprite = (plan.sprites || []).find((s) => s.role === 'player');
    if (playerSprite && playerSprite.frames && fs.existsSync(path.join(projectDir, playerSprite.path))) {
      const sz = pngInfo(path.join(projectDir, playerSprite.path));
      const fw = sz ? Math.round(sz.width / playerSprite.frames) : playerSprite.height;
      const fh = sz ? sz.height : playerSprite.height;
      t = t.replace(/this\.load\.image\(ASSET_KEYS\.player,[^;]*;/, `this.load.spritesheet(ASSET_KEYS.player, '${rel(playerSprite.path)}', { frameWidth: ${fw}, frameHeight: ${fh} });`);
    } else if (spriteByRole.player) {
      t = t.replace("'images/player.svg'", `'${spriteByRole.player}'`);
    }
    if (spriteByRole.hazard) t = t.replace("'images/hazard.svg'", `'${spriteByRole.hazard}'`);
    if (spriteByRole.collectible) t = t.replace("'images/collectible.svg'", `'${spriteByRole.collectible}'`);
    if (bgs.length && !t.includes("this.load.image('bg_0'")) {
      const loads = bgs.map((b) => `    this.load.image('${b.key}', '${b.path}');`).join('\n');
      t = t.replace(/(this\.load\.image\(ASSET_KEYS\.collectible[^\n]*\n)/, `$1${loads}\n`);
    }
    // FX textures (only those that exist on disk — avoid 404 console errors)
    const fxs = (plan.fx || [])
      .filter((f) => fs.existsSync(path.join(projectDir, f.path)))
      .map((f) => ({ key: String(f.id).replace(/-/g, '_'), path: rel(f.path) }));
    if (fxs.length && !t.includes("this.load.image('fx_")) {
      const loads = fxs.map((f) => `    this.load.image('${f.key}', '${f.path}');`).join('\n');
      t = t.replace(/(this\.load\.image\(ASSET_KEYS\.collectible[^\n]*\n)/, `$1${loads}\n`);
    }
    // UI textures: btn-frame -> ui_frame, btn-pause -> ui_pause (only if they exist)
    const uis = (plan.ui || [])
      .filter((u) => fs.existsSync(path.join(projectDir, u.path)))
      .map((u) => ({ key: 'ui_' + String(u.id).replace(/^btn-/, '').replace(/-/g, '_'), path: rel(u.path) }));
    if (uis.length && !t.includes("this.load.image('ui_")) {
      const loads = uis.map((u) => `    this.load.image('${u.key}', '${u.path}');`).join('\n');
      t = t.replace(/(this\.load\.image\(ASSET_KEYS\.collectible[^\n]*\n)/, `$1${loads}\n`);
    }
    if (t !== before) { fs.writeFileSync(loadingFile, t); patched.push('LoadingScene'); }
  }

  if (bgs.length) {
    const bgImage = `{ const bg = this.add.image(SPEC.canvas.width / 2, SPEC.canvas.height / 2, 'bg_0').setDepth(-10); bg.setScale(Math.max(SPEC.canvas.width / bg.width, SPEC.canvas.height / bg.height)); }`;
    const gameFile = path.join(projectDir, 'src/game/scenes/GameScene.js');
    if (fs.existsSync(gameFile)) {
      let t = fs.readFileSync(gameFile, 'utf8');
      const before = t;
      t = t.replace(/this\.add\.rectangle\(0, 0, SPEC\.canvas\.width, SPEC\.canvas\.height,[^\n]*?\.setOrigin\(0\);/, bgImage);
      if (t !== before) { fs.writeFileSync(gameFile, t); patched.push('GameScene'); }
    }
    const homeFile = path.join(projectDir, 'src/game/scenes/HomeScene.js');
    if (fs.existsSync(homeFile)) {
      let t = fs.readFileSync(homeFile, 'utf8');
      const before = t;
      t = t.replace(/this\.add\.rectangle\(0, 0, width, height, 0x0b1024\)\.setOrigin\(0\);/, `{ const bg = this.add.image(width / 2, height / 2, 'bg_0').setDepth(-10); bg.setScale(Math.max(width / bg.width, height / bg.height)); }`);
      if (t !== before) { fs.writeFileSync(homeFile, t); patched.push('HomeScene'); }
    }
  }
  return patched;
}

// An asset declared requiresAlpha but demonstrably lacking an alpha channel is not
// production-demo, no matter that a file exists at the path. Only a PNG we can parse can be
// disproved — formats we cannot read (WebP is common in shipped games) keep their grade
// rather than being demoted on a guess.
function alphaGrade(file) {
  const info = pngInfo(file);
  if (!info) return 'unknown';
  return info.hasAlpha ? 'alpha' : 'opaque';
}

// Promote manifest entries for plan assets that are on disk AND already carry imagegen
// provenance. It must never mint provenance itself: a file existing on disk says nothing about
// where it came from, so synthesising `method: codex-gpt-imagegen-skill` here would let any
// hand-dropped PNG claim production-demo origin without a single generation call.
function promoteExisting(projectDir, plan, manifest) {
  const demoted = [];
  const unproven = [];
  manifest.stageBackgrounds = manifest.stageBackgrounds || [];
  manifest.images = manifest.images || [];
  const gid = plan.gameId;
  if (gid) manifest.assetIsolation = manifest.assetIsolation || { mode: 'per-game', generatedFor: gid, noSharedRuntimeAssets: true };
  for (const bg of plan.backgrounds || []) {
    if (!fs.existsSync(path.join(projectDir, bg.path))) continue;
    let e = manifest.stageBackgrounds.find((x) => x.id === bg.id);
    if (!e) { e = { id: bg.id, path: bg.path, minWidth: bg.width, minHeight: bg.height }; manifest.stageBackgrounds.push(e); }
    e.path = bg.path; e.delivery = 'runtime';
    if (e.provenance?.method) e.quality = 'production-demo';
    else { e.quality = 'draft'; unproven.push({ id: bg.id, group: 'background' }); }
  }
  for (const sp of plan.sprites || []) {
    if (!fs.existsSync(path.join(projectDir, sp.path))) continue;
    let e = manifest.images.find((x) => x.id === sp.id);
    if (!e) { e = { id: sp.id, type: 'sprite' }; manifest.images.push(e); }
    const spGrade = alphaGrade(path.join(projectDir, sp.path));
    if (spGrade === 'opaque') demoted.push({ id: sp.id, group: 'sprite' });
    e.path = sp.path; e.delivery = 'runtime'; e.role = sp.role; e.requiresAlpha = true;
    if (!e.provenance?.method) { e.quality = 'draft'; unproven.push({ id: sp.id, group: 'sprite' }); }
    else e.quality = spGrade === 'opaque' ? 'draft' : 'production-demo';
    if (sp.frames) { const c = sp.frameSize || sp.height; e.frames = sp.frames; e.frameWidth = c; e.frameHeight = c; }
  }
  for (const it of [...(plan.ui || []), ...(plan.fx || [])]) {
    if (!fs.existsSync(path.join(projectDir, it.path))) continue;
    let e = manifest.images.find((x) => x.id === it.id);
    if (!e) { e = { id: it.id, type: (plan.ui || []).includes(it) ? 'ui' : 'fx' }; manifest.images.push(e); }
    const itGrade = alphaGrade(path.join(projectDir, it.path));
    if (itGrade === 'opaque') demoted.push({ id: it.id, group: (plan.ui || []).includes(it) ? 'ui' : 'fx' });
    e.path = it.path; e.delivery = 'runtime'; e.role = it.role; e.requiresAlpha = true;
    if (!e.provenance?.method) { e.quality = 'draft'; unproven.push({ id: it.id, group: (plan.ui || []).includes(it) ? 'ui' : 'fx' }); }
    else e.quality = itGrade === 'opaque' ? 'draft' : 'production-demo';
  }
  return { demoted, unproven };
}

// Crop a transparent PNG to its alpha bounding box, then resize to an exact target size.
// Makes AI UI art (arbitrary size + padding) into a predictable button-frame texture.
function autocropResize(file, targetW, targetH, padRatio = 0, { crop = true } = {}) {
  // padRatio > 0: 크롭 후 사방에 투명 여백(비율)을 추가 — image-quality-qa의
  // "touches crop edge" 검사를 만족시키고 씬 합성 시 잘림 여지를 없앤다.
  // (스프라이트 시트는 프레임 격자가 깨지므로 padRatio=0으로 호출할 것)
  // crop:false — 배경 declared resample용. 배경은 불투명 전면 이미지이므로 알파 bbox
  // 크롭 대상이 아니고, RGBA 변환도 하지 않아 원본 모드를 유지한다.
  const py = [
    'import sys',
    'from PIL import Image',
    'crop = sys.argv[5] == "1"',
    'im = Image.open(sys.argv[1])',
    'if crop:',
    '    im = im.convert("RGBA")',
    '    b = im.getbbox()',
    '    if b: im = im.crop(b)',
    'pad = float(sys.argv[4])',
    'if pad > 0:',
    '    if im.mode != "RGBA": im = im.convert("RGBA")',
    '    pw, ph = int(im.width * pad), int(im.height * pad)',
    '    c = Image.new("RGBA", (im.width + pw * 2, im.height + ph * 2), (0, 0, 0, 0))',
    '    c.paste(im, (pw, ph))',
    '    im = c',
    'im = im.resize((int(sys.argv[2]), int(sys.argv[3])), Image.LANCZOS)',
    'im.save(sys.argv[1])',
  ].join('\n');
  const r = spawnSync('python3', ['-c', py, file, String(targetW), String(targetH), String(padRatio), crop ? '1' : '0'], { encoding: 'utf8', timeout: 30000 });
  return r.status === 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }
  const projectDir = path.resolve(args.project);
  const planFile = path.join(projectDir, 'asset-plan.json');
  const manifestFile = path.join(projectDir, 'assets/asset-manifest.json');
  if (!fs.existsSync(planFile)) throw new Error(`asset-plan.json missing — run productionize.mjs first: ${planFile}`);
  if (!fs.existsSync(manifestFile)) throw new Error(`asset-manifest.json missing: ${manifestFile}`);

  const codex = findCodex(args.codex);
  const codexHome = resolveCodexHome();
  const plan = readJson(planFile);
  const manifest = readJson(manifestFile);
  console.log(`codex: ${codex}`);
  console.log(`project: ${projectDir}`);

  const results = { backgrounds: [], sprites: [], ui: [], fx: [] };
  const opaque = [];
  const genFailures = [];
  const matchId = idMatcher(args.id);
  if (args.id) console.log(`id filter: ${args.id}`);
  if (args.skipExisting) console.log('skip-existing: reusing on-disk assets that already validate');

  if (args.only === 'all' || args.only === 'backgrounds') {
    for (const bg of plan.backgrounds || []) {
      if (!matchId(bg.id)) continue;
      const out = path.join(projectDir, bg.path);
      const minW = Math.max(BG_RUNTIME_MIN.width, bg.width || 0), minH = Math.max(BG_RUNTIME_MIN.height, bg.height || 0);
      process.stdout.write(`bg ${bg.id} … `);
      const bgEntry = (manifest.stageBackgrounds || []).find((x) => x.id === bg.id);
      const existing = args.skipExisting ? reusableExisting(out, { minW, minH, entry: bgEntry }) : null;
      if (existing?.reuse) {
        console.log(`↷ skipped (${existing.note})`);
        results.backgrounds.push({ id: bg.id, ok: true, skipped: true });
        continue;
      }
      if (existing) process.stdout.write(`regenerating (${existing.note}) … `);
      const gen = codexGenerate(codex, out, bg.prompt, args.timeoutSec);
      const ok = gen.ok;
      if (!ok) genFailures.push({ id: bg.id, group: 'background', ...gen });
      let size = ok ? pngInfo(out) : null;
      // §2.0.5 Declared Resample — image_gen's native size is not ours to choose, so lift it
      // to the master spec while preserving the raw and recording the true native size.
      let resample = null;
      if (ok && size) {
        resample = declaredResample(projectDir, bg, out, size);
        if (resample) size = pngInfo(out) || size;
      }
      const good = !!size && size.width >= minW && size.height >= minH;
      const note = resample ? ` (declared resample from ${resample.nativeSize}, raw kept)` : '';
      console.log(ok ? `✔ ${size ? size.width + 'x' + size.height : '?'}${note}${good ? '' : ' (TOO SMALL)'}` : '✗ FAILED');
      results.backgrounds.push({ id: bg.id, ok: good });
      if (good && Array.isArray(manifest.stageBackgrounds)) {
        const e = manifest.stageBackgrounds.find((x) => x.id === bg.id);
        if (e) { e.delivery = 'runtime'; e.quality = 'production-demo'; e.provenance = imagegenProvenance(plan.gameId, bg.id, bg.prompt, { ...(resample || {}), outputSha256: sha256File(out) }); }
      }
    }
  }

  if (args.only === 'all' || args.only === 'sprites') {
    for (const sp of plan.sprites || []) {
      if (!matchId(sp.id)) continue;
      const out = path.join(projectDir, sp.path);
      process.stdout.write(`sprite ${sp.id} … `);
      const spEntry = (manifest.images || []).find((x) => x.id === sp.id);
      const existing = args.skipExisting ? reusableExisting(out, { needsAlpha: true, entry: spEntry }) : null;
      if (existing?.reuse) {
        console.log(`↷ skipped (${existing.note})`);
        results.sprites.push({ id: sp.id, ok: true, skipped: true });
        continue;
      }
      if (existing) process.stdout.write(`regenerating (${existing.note}) … `);
      const chromaPrompt = sp.frames
        ? `${sp.prompt} Flat solid pure-magenta (#FF00FF) fills everywhere around and between the cells, hard edges, no glow, for chroma-key removal.`
        : `${sp.prompt} Center the subject on a FLAT SOLID pure-magenta (#FF00FF) background with no gradient and no shadow touching the edges, so the background can be removed by chroma key.`;
      const gen = codexGenerate(codex, out, chromaPrompt, args.timeoutSec);
      const ok = gen.ok;
      if (!ok) genFailures.push({ id: sp.id, group: 'sprite', ...gen });
      let transparent = false;
      if (ok) {
        const rc = removeChroma(codexHome, out);
        transparent = rc.ok;
        if (!rc.ok) opaque.push({ group: 'sprite', id: sp.id, ...rc });
      }
      // sprite sheet: normalize to N equal square cells so Phaser can slice it cleanly
      const cell = sp.frameSize || sp.height;
      if (ok && transparent && sp.frames && cell) autocropResize(out, sp.frames * cell, cell);
      // 단일 스프라이트: 크롭 후 5% 투명 여백 — 잘림 없는 합성 + crop-edge 게이트 충족
      else if (ok && transparent) {
        const sz = pngInfo(out);
        if (sz) autocropResize(out, sz.width, sz.height, 0.05);
      }
      const size = ok ? pngInfo(out) : null;
      console.log(ok ? `✔ ${size ? size.width + 'x' + size.height : '?'}${transparent ? ' (transparent)' : ' (opaque — chroma removal failed)'}` : '✗ FAILED');
      results.sprites.push({ id: sp.id, ok: ok && transparent });
      if (ok && Array.isArray(manifest.images)) {
        let e = manifest.images.find((x) => x.id === sp.id);
        if (!e) { e = { id: sp.id, path: sp.path, type: 'sprite', role: sp.role }; manifest.images.push(e); }
        e.path = sp.path; e.delivery = 'runtime'; e.role = sp.role; e.quality = 'production-demo'; e.requiresAlpha = true;
        if (sp.frames) { const c = sp.frameSize || sp.height; e.frames = sp.frames; e.frameWidth = c; e.frameHeight = c; }
        e.provenance = imagegenProvenance(plan.gameId, sp.id, sp.prompt, { outputSha256: sha256File(out) });
      }
    }
  }

  // UI buttons + FX bursts — transparent AI art (chroma-key removed), same as sprites.
  const extra = [];
  if (args.only === 'all' || args.only === 'ui') extra.push(...(plan.ui || []).map((x) => ({ ...x, _group: 'ui' })));
  if (args.only === 'all' || args.only === 'fx') extra.push(...(plan.fx || []).map((x) => ({ ...x, _group: 'fx' })));
  for (const it of extra) {
    if (!matchId(it.id)) continue;
    const out = path.join(projectDir, it.path);
    process.stdout.write(`${it._group} ${it.id} … `);
    const itEntry = (manifest.images || []).find((x) => x.id === it.id);
    const existing = args.skipExisting ? reusableExisting(out, { needsAlpha: true, entry: itEntry }) : null;
    if (existing?.reuse) {
      console.log(`↷ skipped (${existing.note})`);
      results[it._group].push({ id: it.id, ok: true, skipped: true });
      continue;
    }
    if (existing) process.stdout.write(`regenerating (${existing.note}) … `);
    const chromaPrompt = `${it.prompt} Render the subject centered on a FLAT SOLID pure-magenta (#FF00FF) background, no gradient, no shadow touching the edges, so the background can be removed by chroma key.`;
    const gen = codexGenerate(codex, out, chromaPrompt, args.timeoutSec);
    const ok = gen.ok;
    if (!ok) genFailures.push({ id: it.id, group: it._group, ...gen });
    let transparent = false;
    if (ok) {
      const rc = removeChroma(codexHome, out);
      transparent = rc.ok;
      if (!rc.ok) opaque.push({ group: it._group, id: it.id, ...rc });
    }
    // UI frames/icons: crop away transparent padding + normalize to declared size so the
    // game can scale them predictably (buttons vary in size).
    if (ok && it._group === 'ui' && it.width && it.height) autocropResize(out, it.width, it.height, 0.04);
    const size = ok ? pngInfo(out) : null;
    console.log(ok ? `✔ ${size ? size.width + 'x' + size.height : '?'}${transparent ? ' (transparent)' : ' (opaque — chroma removal failed)'}` : '✗ FAILED');
    // An opaque UI/FX asset is a failure like an opaque sprite is: it keeps a magenta plate
    // in the composite. It used to be recorded as ok and let the run exit 0.
    results[it._group].push({ id: it.id, ok: ok && transparent });
    if (ok && Array.isArray(manifest.images)) {
      let e = manifest.images.find((x) => x.id === it.id);
      if (!e) { e = { id: it.id, type: it._group }; manifest.images.push(e); }
      e.path = it.path; e.delivery = 'runtime'; e.role = it.role; e.requiresAlpha = true;
      e.quality = 'production-demo';
      e.provenance = imagegenProvenance(plan.gameId, it.id, it.prompt, { outputSha256: sha256File(out) });
    }
  }

  // Promote manifest entries for any plan asset that actually exists on disk (covers
  // --only wire, where art was generated in a prior run or restored externally).
  const { demoted, unproven } = promoteExisting(projectDir, plan, manifest);

  // flip qualityTier only when every declared background + core sprite is real art
  const bgAll = (manifest.stageBackgrounds || []).length >= 3 && (manifest.stageBackgrounds || []).every((b) => b.quality === 'production-demo');
  const coreRoles = new Set(['player', 'hazard', 'obstacle', 'enemy', 'boss', 'collectible', 'reward', 'vehicle', 'parcel', 'sort-bin', 'item', 'powerup', 'projectile']);
  const coreImgs = (manifest.images || []).filter((im) => coreRoles.has(String(im.role || '').toLowerCase()));
  const coreAll = coreImgs.length > 0 && coreImgs.every((im) => im.quality === 'production-demo');
  if (bgAll && coreAll) manifest.qualityTier = 'production-demo';
  const hasImagegenEntries = [...(manifest.stageBackgrounds || []), ...(manifest.images || [])]
    .some((e) => e?.provenance?.method === 'codex-gpt-imagegen-skill');
  if (hasImagegenEntries) {
    manifest.imagegen = {
      model: 'openai-builtin-image_gen (version opaque)',
      modelVerified: false,
      method: 'codex-gpt-imagegen-skill',
      sourceSkill: 'imagegen',
      toolMode: 'built-in-image_gen',
      lastRunAt: new Date().toISOString(),
    };
  }

  writeJson(manifestFile, manifest);

  const wired = wireGameToAssets(projectDir, plan);
  if (wired.length) console.log(`wired game to assets: ${wired.join(', ')}`);

  console.log('');
  const all = [...results.backgrounds, ...results.sprites, ...results.ui, ...results.fx];
  const n = (a) => {
    const skipped = a.filter((r) => r.skipped).length;
    return `${a.filter((r) => r.ok).length}/${a.length}${skipped ? ` (${skipped} reused)` : ''}`;
  };
  console.log(`backgrounds: ${n(results.backgrounds)} · sprites: ${n(results.sprites)} · ui: ${n(results.ui)} · fx: ${n(results.fx)}`);
  console.log(`qualityTier: ${manifest.qualityTier}${bgAll && coreAll ? ' (promoted)' : ' (still draft — art incomplete)'}`);

  // Chroma-key removal used to fail silently: the helper returned false, the sprite stayed
  // opaque, and the only symptom appeared much later as a confusing image-quality-qa error.
  if (opaque.length) {
    console.log('');
    console.log(`chroma-key removal failed for ${opaque.length} asset(s) — these are OPAQUE, not production-demo:`);
    for (const o of opaque) {
      if (o.reason === 'no-helper') {
        console.log(`  ${o.group} ${o.id}: imagegen helper not found at ${o.helper}`);
      } else {
        console.log(`  ${o.group} ${o.id}: remove_chroma_key.py failed${o.detail ? ` — ${o.detail}` : ''}`);
      }
    }
    if (opaque.some((o) => o.reason === 'no-helper')) {
      console.log(`  Fix: install the Codex imagegen skill, or point CODEX_HOME at the home that has it (current: ${codexHome}).`);
    }
  }

  if (demoted.length) {
    console.log('');
    console.log(`${demoted.length} asset(s) declare requiresAlpha but have no alpha channel — kept at quality:"draft":`);
    for (const d of demoted) console.log(`  ${d.group} ${d.id}`);
    console.log('  Regenerate them; an opaque asset cannot be a production-demo asset.');
  }

  if (unproven.length) {
    console.log('');
    console.log(`${unproven.length} asset(s) on disk have no imagegen provenance — kept at quality:"draft":`);
    for (const u of unproven) console.log(`  ${u.group} ${u.id}`);
    console.log('  A file existing on disk is not proof of origin. Generate them through this pipeline.');
  }

  if (genFailures.length) {
    console.log('');
    console.log(`${genFailures.length} generation call(s) failed:`);
    for (const g of genFailures) {
      const why = g.reason === 'exec-failed' ? `codex exec exited ${g.status}`
        : g.reason === 'no-output' ? 'codex exec produced no file'
        : 'output identical to the previous artefact (nothing was generated)';
      console.log(`  ${g.group} ${g.id}: ${why}${g.detail ? ` — ${g.detail}` : ''}`);
    }
  }

  const failed = all.filter((r) => !r.ok);
  if (failed.length) {
    console.log(`FAILED: ${failed.map((r) => r.id).join(', ')}`);
    console.log(`Retry just these: --skip-existing${failed.length === 1 ? ` --id "${failed[0].id}"` : ''}`);
    process.exit(1);
  }
}

try { main(); } catch (err) { console.error(err.message || err); process.exit(1); }
