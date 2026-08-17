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
import { fileURLToPath } from 'node:url';
import { assertArgv, isMainModule } from './lib/cli-contract.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { findCodex, resolveCodexHome, chromaHelperPath, codexGenerate, preserveOriginal } from './lib/codex-host.mjs';
import { BACKGROUND_EDGE_MIN, FILL_FLOOR, UI_HUE_MAX_DISTANCE, HF_MAX, BG_COLORS_MIN } from './lib/quality-thresholds.mjs';

export const CLI_CONTRACT_ID = 'factory:imagegen';

/** 부팅 경로와 parity harness가 같은 함수를 쓴다. 부작용 없음. */
export function parseCliArgs(argv) {
  assertArgv(CLI_CONTRACT_ID, argv);
  return parseArgs(argv);
}

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
    else if (a === '--no-runtime-export') args.noRuntimeExport = true;
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
  --no-runtime-export Keep generated PNGs as-is instead of exporting runtime WebP
                      (for games with a custom asset-layout contract)
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


// ---- generation-time verification -------------------------------------------------------
// The babysitting loop this session kept repeating was: generate → gate finds the defect
// minutes later → a human re-prompts. These helpers move the same measurements to the moment
// of generation so the retry can happen inside the run, with the failure reason written into
// the next prompt. Thresholds come from lib/quality-thresholds.mjs — the very numbers the
// gates use — so "passes at generation" and "passes the gate" cannot drift apart.

const RETRY_LIMIT = 2; // per asset, in addition to the first attempt

const MEASURE_PY = [
  'import sys, json, math, colorsys',
  'from PIL import Image, ImageFilter, ImageStat',
  'req = json.loads(sys.stdin.read())',
  "im = Image.open(req['file'])",
  'out = {}',
  "if req['kind'] == 'background':",
  "    rgb = im.convert('RGB')",
  '    if rgb.width > 1440:',
  '        rgb = rgb.resize((1440, round(rgb.height * 1440 / rgb.width)))',
  "    out['edge'] = round(ImageStat.Stat(rgb.convert('L').filter(ImageFilter.FIND_EDGES)).var[0], 1)",
  "    out['colors'] = len(rgb.getcolors(maxcolors=300000) or [])",
  '    mr = rgb',
  '    if rgb.height > 1920:',
  '        mr = rgb.resize((max(1, round(rgb.width * 1920.0 / rgb.height)), 1920))',
  "    lap = mr.convert('L').filter(ImageFilter.Kernel((3,3),[0,-1,0,-1,4,-1,0,-1,0],1,0))",
  "    out['hf'] = round(ImageStat.Stat(lap).mean[0], 2)",
  'else:',
  "    rgbf = im.convert('RGB')",
  '    mrf = rgbf',
  '    if rgbf.height > 1920:',
  '        mrf = rgbf.resize((max(1, round(rgbf.width * 1920.0 / rgbf.height)), 1920))',
  "    lapf = mrf.convert('L').filter(ImageFilter.Kernel((3,3),[0,-1,0,-1,4,-1,0,-1,0],1,0))",
  "    out['hf'] = round(ImageStat.Stat(lapf).mean[0], 2)",
  "    rgba = im.convert('RGBA'); a = rgba.getchannel('A')",
  '    mn, mx = a.getextrema()',
  "    out['hasAlpha'] = mn < 250",
  '    bb = a.getbbox()',
  '    if bb:',
  '        region = a.crop(bb)',
  '        hist = region.point(lambda v: 255 if v > 200 else 0).histogram()',
  "        out['fill'] = round(hist[255] / max(1, region.width * region.height), 3)",
  "    frames = req.get('frames')",
  '    if frames and frames > 1:',
  '        w = rgba.width // frames; pads = []',
  '        for i in range(frames):',
  '            cb = a.crop((i * w, 0, (i + 1) * w, rgba.height)).getbbox()',
  '            pads.append(None if not cb else [cb[0], cb[1], w - cb[2], rgba.height - cb[3]])',
  "        out['pads'] = pads",
  "    acc = req.get('accent')",
  '    if acc:',
  '        small = rgba.copy(); small.thumbnail((128, 128))',
  '        hs = []',
  '        for r3, g3, b3, al in small.getdata():',
  '            if al < 200: continue',
  '            h2, s2, v2 = colorsys.rgb_to_hsv(r3 / 255, g3 / 255, b3 / 255)',
  '            if s2 > 0.3 and v2 > 0.25: hs.append(h2 * 360)',
  '        if len(hs) >= 30:',
  '            x = sum(math.cos(math.radians(h)) for h in hs); y = sum(math.sin(math.radians(h)) for h in hs)',
  '            dom = math.degrees(math.atan2(y, x)) % 360',
  "            av = acc.lstrip('#')",
  '            ah = colorsys.rgb_to_hsv(int(av[0:2], 16) / 255, int(av[2:4], 16) / 255, int(av[4:6], 16) / 255)[0] * 360',
  '            d = abs(dom - ah)',
  "            out['hueDist'] = round(min(d, 360 - d), 1); out['domHue'] = round(dom, 1)",
  'print(json.dumps(out))',
].join('\n');

function measureQuality(file, spec) {
  const r = spawnSync('python3', ['-c', MEASURE_PY], { input: JSON.stringify({ file, ...spec }), encoding: 'utf8', timeout: 60000 });
  if (r.status !== 0) return null;
  try { return JSON.parse(String(r.stdout).trim().split('\n').pop()); } catch { return null; }
}

// The accent used for the hue check. New plans record themeColors; old plans fall back to
// the hex values embedded in the styleGuide palette prose.
function accentHexOf(plan) {
  const c = plan.themeColors;
  if (c && (c.collectible || c.player || c.ui)) return c.collectible || c.player || c.ui;
  const hexes = String(plan.styleGuide?.palette || '').match(/#[0-9a-fA-F]{6}/g) || [];
  return hexes[2] || hexes[1] || null;
}

// Verdict + the sentence that goes into the retry prompt. The hint names the exact defect —
// re-sending an identical prompt just reproduces the identical failure.
function verifyGenerated(kind, file, ctx = {}) {
  if (kind === 'background') {
    const m = measureQuality(file, { kind: 'background' });
    if (!m) return { ok: true, note: 'unmeasurable' };
    // 색수 하한. 게이트(image-quality-qa / hq-screen-quality-qa)와 같은 숫자를 쓴다.
    if (m.colors !== undefined && m.colors > 0 && m.colors < BG_COLORS_MIN) {
      return { ok: false, short: `flat palette ${m.colors}`, hint: `the image came out with too few distinct colours (${m.colors}, minimum ${BG_COLORS_MIN}) — paint a rich tonal range with many subtle value steps in the sky, water and rocks instead of large uniform blocks of one colour` };
    }
    if (m.hf !== undefined && m.hf > HF_MAX.background) {
      return { ok: false, short: `noisy hf ${m.hf}`, hint: `the background came out too noisy and over-detailed (high-frequency energy ${m.hf}, ceiling ${HF_MAX.background}) — paint broad smooth areas with soft gradients; remove grain, speckle and busy fine texture` };
    }
    if (m.edge < BACKGROUND_EDGE_MIN) {
      return { ok: false, short: `soft edge ${m.edge}`, hint: `the image came out too soft and blurry (edge variance ${m.edge}, minimum ${BACKGROUND_EDGE_MIN}) — render crisp, well-defined edges with clear separation between foreground shapes, mid-ground and skyline; avoid atmospheric haze and soft focus` };
    }
    return { ok: true, note: `edge ${m.edge}` };
  }
  const m = measureQuality(file, { kind: 'sprite', frames: ctx.frames, accent: ctx.accent });
  if (!m) return { ok: true, note: 'unmeasurable' };
  if (ctx.frames > 1 && Array.isArray(m.pads)) {
    const touching = m.pads.map((p2, i) => (!p2 || p2.some((v) => v <= 0)) ? i + 1 : null).filter((v) => v !== null);
    if (touching.length) {
      return { ok: false, short: `cell clip f${touching.join(',')}`, hint: `frame(s) ${touching.join(', ')} touched or crossed the cell boundary — every cell must keep clearly visible empty margin on all four sides; no limb, prop, glow or shadow may reach a cell edge` };
    }
  }
  const floor = FILL_FLOOR[String(ctx.role || '').toLowerCase()];
  if (floor !== undefined && m.fill !== undefined && m.fill < floor) {
    return { ok: false, short: `hollow fill ${m.fill}`, hint: `the subject came out hollow/over-transparent (opaque fill ${m.fill}, minimum ${floor}) — draw solid interior surfaces, not an outline` };
  }
  // 고주파(노이즈/과선명) 상한. 게이트가 몇 분 뒤에 잡던 것을 생성 즉시 잡아 재시도로 흡수한다.
  const hfCap = HF_MAX[String(ctx.group || '').toLowerCase()];
  if (hfCap !== undefined && m.hf !== undefined && m.hf > hfCap) {
    return { ok: false, short: `noisy hf ${m.hf}`, hint: `the image came out too noisy and over-detailed (high-frequency energy ${m.hf}, ceiling ${hfCap}) — render smooth clean surfaces with a few bold shapes; remove fine speckle, grain, tiny rivets, sparkles and scattered debris` };
  }
  if (ctx.accent && m.hueDist !== undefined && m.hueDist > UI_HUE_MAX_DISTANCE) {
    return { ok: false, short: `wrong hue ${m.hueDist}°`, hint: `the dominant colour came out ${Math.round(m.domHue)}° away from the required accent — the asset MUST use the accent colour ${ctx.accent}; absolutely no blue, no green, no unrelated colour family` };
  }
  return { ok: true };
}

function retryPrompt(basePrompt, hint) {
  return `${basePrompt} PREVIOUS ATTEMPT REJECTED: ${hint}. Fix exactly this problem while keeping every other requirement unchanged.`;
}

// Deterministic edge decontamination — the manual polish step, now standard. remove_chroma's
// 2px feather is structurally too small at ~1254px sources, leaving a magenta-tinted
// semi-transparent band that reads as a dirty dark outline on bright backgrounds.
const DECONTAM_PY = [
  'import sys, json',
  'from PIL import Image, ImageFilter',
  'f = sys.argv[1]',
  "im = Image.open(f).convert('RGBA')",
  "a = im.getchannel('A')",
  'er = a.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(1.0))',
  'px = im.load(); epx = er.load(); apx = a.load()',
  'w, h = im.size',
  'for y in range(h):',
  '    for x in range(w):',
  '        r, g, b, al = px[x, y]',
  '        na = min(apx[x, y], epx[x, y])',
  '        if na > 60 and r > 140 and b > 140 and g < 100:',
  '            r = g; b = g',
  '        px[x, y] = (r, g, b, na)',
  'im.save(f)',
].join('\n');

function decontaminateEdges(file) {
  const r = spawnSync('python3', ['-c', DECONTAM_PY, file], { encoding: 'utf8', timeout: 120000 });
  return r.status === 0;
}


// ---- runtime export ----------------------------------------------------------------------
// Masters ship nothing: a 2160x3840 PNG background is regeneration source material, not a
// runtime asset, and shipping masters is exactly how night-market-wok blew the 16MB budget
// (26.6MB) before this step existed as a manual procedure. Masters move to
// assets/_source/masters/, runtime gets §2.0.5-sized WebP, and the generation receipt is
// re-hashed against the runtime file so --skip-existing keeps working.
const RUNTIME_BG = { width: 1440, height: 3120 }; // §2.2 여유 규격 — 430x932 DPR3까지 커버
const RUNTIME_MAX_SIDE = { sprite: 512, fx: 384 };

const EXPORT_PY = [
  'import sys',
  'from PIL import Image',
  'src, dst, mode, a, b, q = sys.argv[1:7]',
  'im = Image.open(src)',
  "if mode == 'bg':",
  "    im = im.convert('RGB').resize((int(a), int(b)), Image.LANCZOS)",
  "elif mode == 'max' and int(a) > 0 and max(im.size) > int(a):",
  '    r = int(a) / max(im.size)',
  '    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)',
  "im.save(dst, 'WEBP', quality=int(q), method=6)",
].join('\n');

function runtimeExportAll(projectDir, plan, manifest) {
  const mastersDir = path.join(projectDir, 'assets/_source/masters');
  const exported = [];
  const convertOne = (item, kind, manifestList) => {
    const relPath = item.path;
    if (!relPath || !relPath.endsWith('.png')) return;
    const abs = path.join(projectDir, relPath);
    if (!fs.existsSync(abs) || !pngInfo(abs)) return;
    const entry = (manifestList || []).find((x) => x.id === item.id);
    // 영수증 없는 파일은 이 파이프라인의 산출물이 아니다 — 손대지 않는다.
    if (!entry?.provenance?.outputSha256) return;
    const webpRel = relPath.replace(/\.png$/, '.webp');
    const webpAbs = path.join(projectDir, webpRel);
    let argsPy;
    if (kind === 'bg') {
      const rawAbs = path.join(projectDir, 'assets/_source', `${item.id}-raw.png`);
      const src = fs.existsSync(rawAbs) ? rawAbs : abs; // raw에서 1회 리샘플 — 2단 리샘플은 엣지를 두 번 뭉갠다
      argsPy = [src, webpAbs, 'bg', String(RUNTIME_BG.width), String(RUNTIME_BG.height), '94'];
    } else if (item.frames > 1) {
      argsPy = [abs, webpAbs, 'none', '0', '0', '90']; // 시트는 셀 격자가 깨지므로 리사이즈 없이 변환만
    } else {
      const maxSide = RUNTIME_MAX_SIDE[kind] || 0;
      argsPy = [abs, webpAbs, 'max', String(maxSide), '0', kind === 'ui' ? '90' : '88'];
    }
    const r = spawnSync('python3', ['-c', EXPORT_PY, ...argsPy], { encoding: 'utf8', timeout: 120000 });
    if (r.status !== 0 || !fs.existsSync(webpAbs)) return;
    fs.mkdirSync(mastersDir, { recursive: true });
    const masterRel = 'assets/_source/masters/' + path.basename(relPath);
    fs.renameSync(abs, path.join(projectDir, masterRel));
    item.path = webpRel;
    entry.path = webpRel;
    entry.provenance.outputSha256 = sha256File(webpAbs);
    entry.provenance.runtimeExport = { master: masterRel, quality: kind === 'bg' ? 94 : (kind === 'ui' ? 90 : 88) };
    exported.push(`${item.id} → ${path.basename(webpRel)}`);
  };
  for (const bg of plan.backgrounds || []) convertOne(bg, 'bg', manifest.stageBackgrounds);
  for (const sp of plan.sprites || []) convertOne(sp, 'sprite', manifest.images);
  for (const u of plan.ui || []) convertOne(u, 'ui', manifest.images);
  for (const f of plan.fx || []) convertOne(f, 'fx', manifest.images);
  return exported;
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


// Promotion is proof-based. A provenance block with just a method string is a claim anyone
// can type; what promotes an asset is either a verified generation receipt (outputSha256
// matching the file on disk, plus runId/generatedAt) or an explicit legacy marker
// (provenanceVersion "legacy-1") stamped on assets that predate receipts. The marker states
// "this cannot be proven" out loud instead of letting the gap pass as proof.
// v2 custom-loop spec이 선언한 자산 역할. 선언이 없으면 null을 반환해 호출부가
// 아케이드 기본 목록으로 되돌아가게 한다.
function specRequiredRoles(projectDir) {
  try {
    const spec = JSON.parse(fs.readFileSync(path.join(projectDir, 'src/game/data/game-spec.json'), 'utf8'));
    const roles = spec?.requiredAssetRoles;
    if (!Array.isArray(roles) || !roles.length) return null;
    return new Set(roles.map((r) => String(r).toLowerCase()));
  } catch { return null; }
}

function provenanceProven(projectDir, entry) {
  const pr = entry?.provenance;
  if (!pr?.method) return { proven: false, why: 'no-provenance' };
  if (pr.provenanceVersion === 'legacy-1') return { proven: true, legacy: true };
  if (!pr.outputSha256 || !pr.runId || !pr.generatedAt) return { proven: false, why: 'no-receipt' };
  if (sha256File(path.join(projectDir, entry.path)) !== pr.outputSha256) return { proven: false, why: 'sha-mismatch' };
  return { proven: true };
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
    const bgProof = provenanceProven(projectDir, e);
    if (bgProof.proven) e.quality = 'production-demo';
    else { e.quality = 'draft'; unproven.push({ id: bg.id, group: 'background', why: bgProof.why }); }
  }
  for (const sp of plan.sprites || []) {
    if (!fs.existsSync(path.join(projectDir, sp.path))) continue;
    let e = manifest.images.find((x) => x.id === sp.id);
    if (!e) { e = { id: sp.id, type: 'sprite' }; manifest.images.push(e); }
    const spGrade = alphaGrade(path.join(projectDir, sp.path));
    if (spGrade === 'opaque') demoted.push({ id: sp.id, group: 'sprite' });
    e.path = sp.path; e.delivery = 'runtime'; e.role = sp.role; e.requiresAlpha = true;
    const spProof = provenanceProven(projectDir, e);
    if (!spProof.proven) { e.quality = 'draft'; unproven.push({ id: sp.id, group: 'sprite', why: spProof.why }); }
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
    const itProof = provenanceProven(projectDir, e);
    if (!itProof.proven) { e.quality = 'draft'; unproven.push({ id: it.id, group: (plan.ui || []).includes(it) ? 'ui' : 'fx', why: itProof.why }); }
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

/**
 * 생성 대상 항목에 프롬프트가 없으면 멈춘다.
 *
 * 프롬프트는 문자열 연결로 쓰인다 — `${sp.prompt} Flat solid pure-magenta ...`. 빈 값이면
 * 크로마키 보일러플레이트만으로 이미지를 만들고, 그 결과를 production provenance로 기록한다.
 * 복원된 계획은 프롬프트가 비어 있을 수 있으므로(원문이 소실된 세대) 여기서 반드시 막는다.
 */
function assertPlanPrompts(plan) {
  const missing = [];
  for (const bucket of ['backgrounds', 'sprites', 'ui', 'fx']) {
    for (const entry of plan[bucket] || []) {
      if (typeof entry.prompt !== 'string' || !entry.prompt.trim()) missing.push(`${bucket}/${entry.id}`);
    }
  }
  if (missing.length) {
    throw new Error(`asset-plan에 프롬프트가 없는 항목이 있다: ${missing.join(', ')}\n`
      + '  빈 프롬프트로 생성하면 보일러플레이트만으로 만든 이미지가 production 자산으로 기록된다.\n'
      + '  해당 항목의 prompt를 작성한 뒤 다시 실행할 것.');
  }
}

/**
 * 생성 묶음을 쪼개는 재생성을 막는다.
 *
 * Path B에서는 프롬프트 하나가 시트 한 장을 만들고 여러 자산을 거기서 잘라냈다. 그 자산들은
 * `provenance.promptHash`를 공유한다(실측 firebreak-commander: 자산 12개, 해시 2개).
 * 그중 하나만 다시 만들면 **그 항목만** 새 provenance로 교체되고 나머지는 옛 해시를 계속
 * 주장한다 — "한 번의 생성에서 나왔다"는 관계가 거짓이 되는데 아무 검사도 그걸 보지 않았다.
 *
 * 묶음 전체를 다시 만들 수 없다면(각자의 프롬프트가 필요하다) 아예 시작하지 않는 것이 옳다.
 * 자산 하나를 고치겠다고 manifest가 거짓을 말하게 두지 않는다.
 */
function assertGroupNotSplit(manifest, targets) {
  if (!targets.length) return;
  const all = [...(manifest.stageBackgrounds || []), ...(manifest.images || [])];
  const groups = new Map();
  for (const entry of all) {
    const hash = entry?.provenance?.promptHash;
    if (!hash || !entry.id) continue;
    if (!groups.has(hash)) groups.set(hash, []);
    groups.get(hash).push(entry.id);
  }
  const selected = new Set(targets);
  const split = [];
  for (const [hash, members] of groups) {
    if (members.length < 2) continue;
    const inside = members.filter((id) => selected.has(id));
    if (inside.length && inside.length < members.length) {
      split.push(`${hash}: 선택 ${inside.join(', ')} / 나머지 ${members.filter((id) => !selected.has(id)).join(', ')}`);
    }
  }
  if (split.length) {
    throw new Error('생성 묶음을 쪼개는 재생성이다 — 이 자산들은 한 번의 생성에서 나왔다:\n'
      + split.map((line) => `  ${line}`).join('\n')
      + '\n  하나만 다시 만들면 나머지가 옛 promptHash를 계속 주장해 manifest가 거짓 관계를 남긴다.'
      + '\n  묶음 전체를 대상으로 하거나(--id를 모두 지정), 재생성을 하지 말 것.');
  }
}

function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }
  const projectDir = path.resolve(args.project);
  const planFile = path.join(projectDir, 'asset-plan.json');
  const manifestFile = path.join(projectDir, 'assets/asset-manifest.json');
  if (!fs.existsSync(planFile)) {
    // 이전 문구는 "run productionize.mjs first"였다. 이미 출시된 게임에는 **틀린 조언**이다 —
    // productionize는 기획 문서(docs/01~05)를 다시 쓰므로 손으로 고친 내용이 사라진다
    // (make-game이 그 경고를 직접 출력한다). 자산 하나를 다시 만들려다 문서를 잃는 것은
    // 고치는 것이 아니다. 계획만 복원하는 경로를 가리킨다.
    throw new Error(`asset-plan.json missing: ${planFile}\n`
      + '  이 게임은 asset-plan 규약 이전 세대다. manifest에서 계획을 복원할 것:\n'
      + `    npm --prefix dev_game run factory:asset-plan-recover -- --project ${args.project}\n`
      + '  productionize.mjs는 실행하지 말 것 — 기획 문서를 덮어쓴다.');
  }
  if (!fs.existsSync(manifestFile)) throw new Error(`asset-manifest.json missing: ${manifestFile}`);

  const codex = findCodex(args.codex);
  const codexHome = resolveCodexHome();
  const plan = readJson(planFile);
  assertPlanPrompts(plan);
  const manifest = readJson(manifestFile);
  console.log(`codex: ${codex}`);
  console.log(`project: ${projectDir}`);

  const results = { backgrounds: [], sprites: [], ui: [], fx: [] };
  const opaque = [];
  const genFailures = [];
  const retryStats = [];
  const planAccent = accentHexOf(plan);
  const matchId = idMatcher(args.id);
  // `--id`가 생성 묶음의 일부만 고르면 여기서 멈춘다. 계획의 모든 id를 대상으로 판정하므로
  // glob(`fx-*`)로 고른 경우에도 성립한다.
  if (args.id) {
    const planned = ['backgrounds', 'sprites', 'ui', 'fx']
      .flatMap((bucket) => (plan[bucket] || []).map((entry) => entry.id));
    assertGroupNotSplit(manifest, planned.filter((id) => matchId(id)));
  }
  if (args.id) console.log(`id filter: ${args.id}`);
  if (args.skipExisting) console.log('skip-existing: reusing on-disk assets that already validate');

  if (args.only === 'all' || args.only === 'backgrounds') {
    for (const bg of plan.backgrounds || []) {
      if (!matchId(bg.id)) continue;
      const relGen = bg.path.replace(/\.webp$/, '.png');
      const out = path.join(projectDir, relGen);
      const outCurrent = path.join(projectDir, bg.path);
      const minW = Math.max(BG_RUNTIME_MIN.width, bg.width || 0), minH = Math.max(BG_RUNTIME_MIN.height, bg.height || 0);
      process.stdout.write(`bg ${bg.id} … `);
      const bgEntry = (manifest.stageBackgrounds || []).find((x) => x.id === bg.id);
      const existing = args.skipExisting ? reusableExisting(outCurrent, { minW, minH, entry: bgEntry }) : null;
      if (existing?.reuse) {
        console.log(`↷ skipped (${existing.note})`);
        results.backgrounds.push({ id: bg.id, ok: true, skipped: true });
        continue;
      }
      if (existing) process.stdout.write(`regenerating (${existing.note}) … `);
      // 생성 → 즉시 검증 → 사유 주입 재생성(≤RETRY_LIMIT). 게이트에서 몇 분 뒤 발각되던
      // 결함을 실행 내부에서 흡수한다.
      let final = null; let hint = ''; let lastFail = null;
      const preserved = preserveOriginal(out);
      for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
        const prompt = attempt === 0 ? bg.prompt : retryPrompt(bg.prompt, hint);
        const gen = codexGenerate(codex, out, prompt, args.timeoutSec);
        if (!gen.ok) { hint = 'the generation call itself failed — produce the image again'; lastFail = { id: bg.id, group: 'background', ...gen }; }
        else {
          let size = pngInfo(out);
          let resample = null;
          if (size) { resample = declaredResample(projectDir, bg, out, size); if (resample) size = pngInfo(out) || size; }
          if (!size || size.width < minW || size.height < minH) {
            hint = 'the output was smaller than the required canvas — render at the largest available resolution';
            lastFail = { id: bg.id, group: 'background', reason: 'too-small' };
          } else {
            const v = verifyGenerated('background', out);
            if (v.ok) { final = { size, resample }; break; }
            hint = v.hint; lastFail = { id: bg.id, group: 'background', reason: 'verify', detail: v.short };
          }
        }
        if (attempt < RETRY_LIMIT) {
          retryStats.push({ id: bg.id, group: 'background', attempt: attempt + 1, why: lastFail.detail || lastFail.reason });
          process.stdout.write(`retry ${attempt + 1} (${lastFail.detail || lastFail.reason}) … `);
        }
      }
      const good = !!final;
      if (good) preserved.discard(); else preserved.restore();
      if (!good && lastFail) genFailures.push(lastFail);
      const note = final?.resample ? ` (declared resample from ${final.resample.nativeSize}, raw kept)` : '';
      console.log(good ? `✔ ${final.size.width + 'x' + final.size.height}${note}` : '✗ FAILED (retries exhausted)');
      results.backgrounds.push({ id: bg.id, ok: good });
      if (good && Array.isArray(manifest.stageBackgrounds)) {
        bg.path = relGen;
        const e = manifest.stageBackgrounds.find((x) => x.id === bg.id);
        if (e) { e.path = relGen; e.delivery = 'runtime'; e.quality = 'production-demo'; e.provenance = imagegenProvenance(plan.gameId, bg.id, bg.prompt, { ...(final.resample || {}), outputSha256: sha256File(out) }); }
      }
    }
  }

  if (args.only === 'all' || args.only === 'sprites') {
    for (const sp of plan.sprites || []) {
      if (!matchId(sp.id)) continue;
      const spRelGen = sp.path.replace(/\.webp$/, '.png');
      const out = path.join(projectDir, spRelGen);
      process.stdout.write(`sprite ${sp.id} … `);
      const spEntry = (manifest.images || []).find((x) => x.id === sp.id);
      const existing = args.skipExisting ? reusableExisting(path.join(projectDir, sp.path), { needsAlpha: true, entry: spEntry }) : null;
      if (existing?.reuse) {
        console.log(`↷ skipped (${existing.note})`);
        results.sprites.push({ id: sp.id, ok: true, skipped: true });
        continue;
      }
      if (existing) process.stdout.write(`regenerating (${existing.note}) … `);
      const chromaPrompt = sp.frames
        ? `${sp.prompt} Flat solid pure-magenta (#FF00FF) fills everywhere around and between the cells, hard edges, no glow, for chroma-key removal.`
        : `${sp.prompt} Center the subject on a FLAT SOLID pure-magenta (#FF00FF) background with no gradient and no shadow touching the edges, so the background can be removed by chroma key.`;
      let final = null; let hint = ''; let lastFail = null; let helperMissing = false;
      const preserved = preserveOriginal(out);
      for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
        const prompt = attempt === 0 ? chromaPrompt : retryPrompt(chromaPrompt, hint);
        const gen = codexGenerate(codex, out, prompt, args.timeoutSec);
        if (!gen.ok) { hint = 'the generation call itself failed — produce the image again'; lastFail = { id: sp.id, group: 'sprite', ...gen }; }
        else {
          const rc = removeChroma(codexHome, out);
          if (!rc.ok && rc.reason === 'no-helper') { opaque.push({ group: 'sprite', id: sp.id, ...rc }); helperMissing = true; break; }
          if (!rc.ok) { hint = 'chroma-key removal failed — the background must be perfectly flat pure magenta #FF00FF with hard edges, no gradient, nothing touching the frame'; lastFail = { id: sp.id, group: 'sprite', reason: 'chroma', detail: rc.detail }; }
          else {
            decontaminateEdges(out);
            const cell = sp.frameSize || sp.height;
            if (sp.frames && cell) autocropResize(out, sp.frames * cell, cell);
            else { const sz = pngInfo(out); if (sz) autocropResize(out, sz.width, sz.height, 0.05); }
            const v = verifyGenerated('sprite', out, { frames: sp.frames, role: sp.role, group: 'core' });
            if (v.ok) { final = { size: pngInfo(out) }; break; }
            hint = v.hint; lastFail = { id: sp.id, group: 'sprite', reason: 'verify', detail: v.short };
          }
        }
        if (attempt < RETRY_LIMIT) {
          retryStats.push({ id: sp.id, group: 'sprite', attempt: attempt + 1, why: lastFail.detail || lastFail.reason });
          process.stdout.write(`retry ${attempt + 1} (${lastFail.detail || lastFail.reason}) … `);
        }
      }
      const ok = !!final;
      if (ok) preserved.discard(); else preserved.restore();
      if (!ok && !helperMissing && lastFail) genFailures.push(lastFail);
      console.log(ok ? `✔ ${final.size ? final.size.width + 'x' + final.size.height : '?'} (transparent)` : helperMissing ? '✗ opaque (chroma helper missing)' : '✗ FAILED (retries exhausted)');
      results.sprites.push({ id: sp.id, ok });
      if (ok && Array.isArray(manifest.images)) {
        sp.path = spRelGen;
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
  // `_src`는 plan 원본 참조다. 이 배열은 사본이라 여기에만 경로를 쓰면 runtimeExportAll이
  // 원본의 옛 경로를 보고 수출을 건너뛴다(실측: 재생성한 FX가 낡은 .webp를 가리켜 강등).
  if (args.only === 'all' || args.only === 'ui') extra.push(...(plan.ui || []).map((x) => ({ ...x, _group: 'ui', _src: x })));
  if (args.only === 'all' || args.only === 'fx') extra.push(...(plan.fx || []).map((x) => ({ ...x, _group: 'fx', _src: x })));
  for (const it of extra) {
    if (!matchId(it.id)) continue;
    const itRelGen = it.path.replace(/\.webp$/, '.png');
    const out = path.join(projectDir, itRelGen);
    process.stdout.write(`${it._group} ${it.id} … `);
    const itEntry = (manifest.images || []).find((x) => x.id === it.id);
    const existing = args.skipExisting ? reusableExisting(path.join(projectDir, it.path), { needsAlpha: true, entry: itEntry }) : null;
    if (existing?.reuse) {
      console.log(`↷ skipped (${existing.note})`);
      results[it._group].push({ id: it.id, ok: true, skipped: true });
      continue;
    }
    if (existing) process.stdout.write(`regenerating (${existing.note}) … `);
    const chromaPrompt = `${it.prompt} Render the subject centered on a FLAT SOLID pure-magenta (#FF00FF) background, no gradient, no shadow touching the edges, so the background can be removed by chroma key.`;
    // 버튼류만 hue를 검증한다 — order-ticket 같은 패널은 액센트와 다른 색이 정당하다.
    const accent = it._group === 'ui' && /^btn/.test(String(it.id)) ? planAccent : null;
    let final = null; let hint = ''; let lastFail = null; let helperMissing = false;
    const preserved = preserveOriginal(out);
    for (let attempt = 0; attempt <= RETRY_LIMIT; attempt += 1) {
      const prompt = attempt === 0 ? chromaPrompt : retryPrompt(chromaPrompt, hint);
      const gen = codexGenerate(codex, out, prompt, args.timeoutSec);
      if (!gen.ok) { hint = 'the generation call itself failed — produce the image again'; lastFail = { id: it.id, group: it._group, ...gen }; }
      else {
        const rc = removeChroma(codexHome, out);
        if (!rc.ok && rc.reason === 'no-helper') { opaque.push({ group: it._group, id: it.id, ...rc }); helperMissing = true; break; }
        if (!rc.ok) { hint = 'chroma-key removal failed — the background must be perfectly flat pure magenta #FF00FF with hard edges'; lastFail = { id: it.id, group: it._group, reason: 'chroma', detail: rc.detail }; }
        else {
          decontaminateEdges(out);
          if (it._group === 'ui' && it.width && it.height) autocropResize(out, it.width, it.height, 0.04);
          const v = verifyGenerated('sprite', out, { role: it.role, accent, group: it._group });
          if (v.ok) { final = { size: pngInfo(out) }; break; }
          hint = v.hint; lastFail = { id: it.id, group: it._group, reason: 'verify', detail: v.short };
        }
      }
      if (attempt < RETRY_LIMIT) {
        retryStats.push({ id: it.id, group: it._group, attempt: attempt + 1, why: lastFail.detail || lastFail.reason });
        process.stdout.write(`retry ${attempt + 1} (${lastFail.detail || lastFail.reason}) … `);
      }
    }
    const ok = !!final;
    if (ok) preserved.discard(); else preserved.restore();
    if (!ok && !helperMissing && lastFail) genFailures.push(lastFail);
    console.log(ok ? `✔ ${final.size ? final.size.width + 'x' + final.size.height : '?'} (transparent)` : helperMissing ? '✗ opaque (chroma helper missing)' : '✗ FAILED (retries exhausted)');
    results[it._group].push({ id: it.id, ok });
    if (ok) { it.path = itRelGen; if (it._src) it._src.path = itRelGen; }
    if (ok && Array.isArray(manifest.images)) {
      let e = manifest.images.find((x) => x.id === it.id);
      if (!e) { e = { id: it.id, type: it._group }; manifest.images.push(e); }
      e.path = it.path; e.delivery = 'runtime'; e.role = it.role; e.requiresAlpha = true;
      e.quality = 'production-demo';
      e.provenance = imagegenProvenance(plan.gameId, it.id, it.prompt, { outputSha256: sha256File(out) });
    }
  }

  // 런타임 출력 — 마스터 보존 + WebP 배포 + 영수증 재계산. plan 경로가 바뀌므로
  // 이후의 승격·배선이 전부 런타임 파일을 보게 된다.
  if (!args.noRuntimeExport) {
    const exported = runtimeExportAll(projectDir, plan, manifest);
    if (exported.length) {
      console.log(`runtime export: ${exported.length} asset(s) → WebP (masters kept in assets/_source/masters/)`);
      fs.writeFileSync(planFile, JSON.stringify(plan, null, 2) + '\n');
    }
  }

  // Promote manifest entries for any plan asset that actually exists on disk (covers
  // --only wire, where art was generated in a prior run or restored externally).
  const { demoted, unproven } = promoteExisting(projectDir, plan, manifest);

  // flip qualityTier only when every declared background + core sprite is real art
  const bgAll = (manifest.stageBackgrounds || []).length >= 3 && (manifest.stageBackgrounds || []).every((b) => b.quality === 'production-demo');
  // 코어 자산 판정. v2 custom-loop 게임은 장르 고유 role을 쓰므로(예: 'cargo-ship'),
  // 아케이드 어휘 목록으로는 코어가 0개가 되어 tier가 영원히 draft에 묶인다. 계약이 정한
  // 대로 spec의 requiredAssetRoles가 있으면 그것이 권위다.
  const coreRoles = specRequiredRoles(projectDir)
    || new Set(['player', 'hazard', 'obstacle', 'enemy', 'boss', 'collectible', 'reward', 'vehicle', 'parcel', 'sort-bin', 'item', 'powerup', 'projectile']);
  const coreImgs = (manifest.images || []).filter((im) => coreRoles.has(String(im.role || '').toLowerCase()));
  const coreAll = coreImgs.length > 0 && coreImgs.every((im) => im.quality === 'production-demo');
  // 이번 실행에 생성 실패가 하나라도 있으면 tier를 올리지 않는다 — 실패 위에서 완성 선언 금지.
  // 올리지 않는 것만으로는 부족하다: 이전 실행이 이미 올려 둔 tier가 그대로 남으면 실패가
  // 조용해진다. 실패한 실행은 tier를 draft로 되돌려, 다시 성공할 때까지 시끄럽게 만든다.
  if (bgAll && coreAll && genFailures.length === 0) manifest.qualityTier = 'production-demo';
  else if (genFailures.length) manifest.qualityTier = 'draft';
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
    for (const u of unproven) console.log(`  ${u.group} ${u.id} (${u.why})`);
    console.log('  A file existing on disk is not proof of origin. Generate them through this pipeline.');
  }

  if (genFailures.length) {
    console.log('');
    console.log(`${genFailures.length} generation call(s) failed:`);
    for (const g of genFailures) {
      const why = g.reason === 'exec-failed' ? `codex exec exited ${g.status}`
        : g.reason === 'no-output' ? 'codex exec produced no file'
        : g.reason === 'unchanged-output' ? 'output identical to the previous artefact (nothing was generated)'
        : g.reason === 'verify' ? 'failed generation-time verification after all retries'
        : g.reason === 'chroma' ? 'chroma-key removal kept failing'
        : g.reason === 'too-small' ? 'output stayed below the required canvas size'
        : String(g.reason);
      console.log(`  ${g.group} ${g.id}: ${why}${g.detail ? ` — ${g.detail}` : ''}`);
    }
  }

  if (retryStats.length) {
    console.log('');
    console.log(`retries: ${retryStats.length} — ` + retryStats.map((r) => `${r.group} ${r.id} ×${r.attempt} (${r.why})`).join(', '));
  }

  const failed = all.filter((r) => !r.ok);
  if (failed.length) {
    console.log(`FAILED: ${failed.map((r) => r.id).join(', ')}`);
    console.log(`Retry just these: --skip-existing${failed.length === 1 ? ` --id "${failed[0].id}"` : ''}`);
    process.exit(1);
  }
}

const isMain = isMainModule(import.meta.url);
if (isMain) {
  try { main(); } catch (err) { console.error(err.message || err); process.exit(1); }
}
