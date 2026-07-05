#!/usr/bin/env node
// productionize.mjs — dev_game "producer" layer.
// Turns a scaffolded Foundation starter into a production-demo BASELINE that the
// game-factory skill then completes with AI-generated art. It writes the mandatory
// planning docs, an AI art-direction package (asset-plan.json + art-prompts.md),
// and real raster (PNG) stage-background placeholders wired into asset-manifest.json.
//
// It deliberately does NOT fake quality: generated backgrounds are marked
// quality:"draft". The skill's AI-art step overwrites them with production art and
// promotes qualityTier -> "production-demo", which is what production-demo-qa enforces.
//
// Scope note: sprite (player/hazard/etc.) format is coupled to the generated game's
// asset-loading code (owned by cli.mjs), so this script plans them in asset-plan.json
// but does not swap sprite files. See docs/03-ASSET-AUDIO-PLAN.md for the full list.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function parseArgs(argv) {
  const args = { stages: 3 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--project') args.project = argv[++i];
    else if (a === '--spec') args.spec = argv[++i];
    else if (a === '--stages') args.stages = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.project) throw new Error('Missing required --project <generated-game-dir>');
  if (!Number.isInteger(args.stages) || args.stages < 3) throw new Error('--stages must be an integer >= 3');
  return args;
}

function usage() {
  console.log(`Usage:
  node generator/scripts/productionize.mjs --project <generated-game-dir> [--spec <file>] [--stages 3]

Writes production-demo scaffolding into an already-generated game:
  - docs/01-GDD.md ... 05-ADVERSARIAL-REVIEW.md   (mandatory planning docs)
  - asset-plan.json + art-prompts.md               (AI art-direction package)
  - assets/backgrounds/stage-*.png                 (raster stage-background placeholders)
  - asset-manifest.json                            (stageBackgrounds[] + qualityTier:"draft")

Next: generate production art per asset-plan.json, overwrite the placeholders and
core sprites, set qualityTier + those entries to "production-demo", then run:
  npm --prefix dev_game run factory:production-gate -- --project <dir>`);
}

// ---------- minimal zlib-based PNG encoder (RGBA, 8-bit) — no external deps ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgbaFn) {
  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = rgbaFn(x, y);
      const o = rowStart + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- helpers ----------
function hexToRgb(hex, fallback = [16, 20, 40]) {
  if (typeof hex !== 'string') return fallback;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mix(a, b, t) { return Math.round(a + (b - a) * t); }

// deterministic LCG so placeholders are reproducible (no Math.random)
function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// ---------- stage theme derivation ----------
function stageThemes(spec, count) {
  const base = hexToRgb(spec?.theme?.colors?.background, [11, 16, 36]);
  const accent = hexToRgb(spec?.theme?.colors?.collectible, [255, 213, 74]);
  const player = hexToRgb(spec?.theme?.colors?.player, [79, 216, 255]);
  const presets = [
    { name: 'Origin', top: base, bottom: [Math.max(0, base[0] - 6), Math.max(0, base[1] - 8), Math.min(255, base[2] + 18)] },
    { name: 'Night Rush', top: [10, 10, 26], bottom: [26, 14, 44] },
    { name: 'Deep Field', top: [6, 12, 30], bottom: [12, 30, 52] },
    { name: 'Ember', top: [30, 12, 16], bottom: [58, 20, 22] },
    { name: 'Glacier', top: [12, 26, 40], bottom: [30, 52, 70] },
  ];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const p = presets[i % presets.length];
    out.push({ index: i + 1, name: p.name, top: p.top, bottom: p.bottom, accent, player });
  }
  return out;
}

function drawStageBackground(width, height, theme) {
  const rng = makeRng(theme.index * 90197 + width * 31 + height);
  // pre-sample a starfield so we don't call rng per-pixel
  const stars = [];
  const starCount = Math.round((width * height) / 6500);
  for (let i = 0; i < starCount; i += 1) {
    stars.push({ x: Math.floor(rng() * width), y: Math.floor(rng() * height), b: 120 + Math.floor(rng() * 135), r: rng() < 0.15 ? 2 : 1 });
  }
  const starMap = new Map();
  for (const s of stars) {
    for (let dy = 0; dy < s.r; dy += 1) for (let dx = 0; dx < s.r; dx += 1) starMap.set((s.y + dy) * width + (s.x + dx), s.b);
  }
  const horizon = Math.floor(height * 0.72);
  return (x, y) => {
    const t = y / height;
    let r = mix(theme.top[0], theme.bottom[0], t);
    let g = mix(theme.top[1], theme.bottom[1], t);
    let b = mix(theme.top[2], theme.bottom[2], t);
    // subtle vignette on sides
    const cx = Math.abs(x - width / 2) / (width / 2);
    const vig = 1 - cx * cx * 0.22;
    r = Math.round(r * vig); g = Math.round(g * vig); b = Math.round(b * vig);
    // ground glow near bottom using accent
    if (y > horizon) {
      const gt = (y - horizon) / (height - horizon);
      r = mix(r, theme.accent[0], gt * 0.18);
      g = mix(g, theme.accent[1], gt * 0.18);
      b = mix(b, theme.accent[2], gt * 0.18);
    }
    const star = starMap.get(y * width + x);
    if (star && y < horizon) { r = Math.min(255, r + star); g = Math.min(255, g + star); b = Math.min(255, b + star); }
    return [r, g, b, 255];
  };
}

// ---------- planning docs ----------
function docGDD(spec) {
  const g = spec.game || {};
  const h = spec.hazards || {};
  const c = spec.collectibles || {};
  return `# 01 · Game Design Document — ${g.title || g.id}

## Concept
${g.description || 'A mobile-portrait arcade game.'}

- **Core fantasy:** one-hand survival under escalating pressure.
- **Control:** ${spec.player?.moveMode || 'drag'} only — the whole game is readable with one thumb.
- **Win/lose:** survive as long as possible; a single hit from a "${h.label || 'hazard'}" ends the run.

## 30-second core loop
1. Move to dodge falling **${h.label || 'hazards'}**.
2. Optionally grab **${c.label || 'collectibles'}** for score (${c.scoreValue || 50} each).
3. Difficulty ramps every ${spec.difficulty?.rampEverySeconds || 15}s (faster spawns, faster fall).
4. Get hit → GAME OVER → see score/best → retry in one tap.

## Progression & stages
The demo presents at least 3 visually distinct stage/theme backgrounds that swap as the
run escalates, so the player *feels* progress, not just a rising number.

## Reward loop
Score is skill; best-score persistence is the long-term hook. Cosmetic stage variety
keeps repeated runs fresh without pay-to-win.

## Differentiation
This is a first production-demo, not a reskin: it must have real art direction, game
feel (juice), audio, and multi-stage presentation. See 05-ADVERSARIAL-REVIEW.md.
`;
}

function docTech(spec) {
  return `# 02 · Technical Design — ${spec.game?.title || spec.game?.id}

## Engine & rendering
- Phaser 3 + Vite, logical canvas ${spec.canvas?.width}×${spec.canvas?.height} (portrait).
- Scale.FIT + CENTER_BOTH; safe-area aware HUD.

## Scenes
Boot → Loading → Home → Game → Pause → GameOver.

## Systems
- **Spawner:** object-pooled falling hazards + collectibles; time-based difficulty curve.
- **StageManager:** swaps stage/theme background as elapsed time crosses thresholds.
- **Juice:** hit-flash, screen shake, particle burst on collect/hit, score pop.
- **LayoutRegistry:** publishes visible UI bounds to \`window.__GAME_LAYOUT_BOUNDS__\`
  so visual-layout-qa can detect HUD overlap / safe-area violations.
- **SaveData:** localStorage best-score + settings, corruption-safe.
- **AudioManager:** unlock on first input, mute persistence, pause on hidden.

## Performance
60fps target, object pooling, frame-rate-independent movement (delta-scaled).

## Asset loading
Backgrounds and core sprites are declared in assets/asset-manifest.json and loaded by key.
`;
}

function docAssetPlan(spec, plan) {
  const bgLines = plan.backgrounds.map((b) => `- \`${b.path}\` (${b.width}×${b.height}) — ${b.theme}: ${b.prompt}`).join('\n');
  const spLines = plan.sprites.map((s) => `- \`${s.path}\` [${s.role}] (${s.width}×${s.height}) — ${s.prompt}`).join('\n');
  return `# 03 · Asset & Audio Plan — ${spec.game?.title || spec.game?.id}

## Art direction / style guide
- Palette: ${plan.styleGuide.palette}
- Outline: ${plan.styleGuide.outline}
- Lighting: ${plan.styleGuide.lighting}
- Camera: ${plan.styleGuide.camera}
- Mood: ${plan.styleGuide.mood}

All assets must share this style. No mismatched rendering, no flat placeholder shapes in
the final demo. Machine-readable prompts live in \`asset-plan.json\`.

## Stage/theme backgrounds (raster PNG/WebP, ≥ canvas size)
${bgLines}

## Core sprites (raster PNG/WebP, transparent)
${spLines}

## Audio
- UI click, collect, hit, game-over SFX + a looping gameplay BGM.
- Web format OGG preferred for release; procedural WAV acceptable for the first demo.

## Production rule
Backgrounds ship as \`quality:"draft"\` placeholders from productionize.mjs and MUST be
replaced with production art before promotion to \`qualityTier:"production-demo"\`.
`;
}

function docQA(spec) {
  return `# 04 · QA Plan — ${spec.game?.title || spec.game?.id}

## Automated gates
- \`factory:smoke\` — structure, required files, no circular imports.
- \`factory:asset-qa\` — manifest, image/audio integrity, black-box/solid/ratio checks.
- \`factory:browser-smoke\` — build + headless boot + PLAY entry, 0 console/page errors.
- \`factory:production-demo-qa\` — planning docs, ≥3 raster stage backgrounds, core-asset
  quality, layout registry, qualityTier.
- \`factory:visual-layout-qa\` — 390×844 / 430×932 / 1080×1920: canvas centering, HUD
  overlap, safe-area (no clipped or overlapping UI).
- \`factory:production-gate\` — all of the above.

## Manual pass
Home → Play → dodge → collect → pause/resume → hit → GameOver → retry, on a phone viewport.

## Acceptance
No overlap, no clipped HUD, ≥3 distinct stage backgrounds, real art (not placeholders),
audio present, 60fps, best-score persists.
`;
}

function docAdversarial(spec) {
  return `# 05 · Adversarial Review — 차별화 / anti-reskin

이 데모가 "프롬프트 한 줄로 만든 게임"이나 단순 **reskin/placeholder**와 무엇이 다른지
스스로 공격적으로 검증한다. 아래 항목 중 하나라도 실패하면 production-demo로 부르지 않는다.

## Challenge checklist
- [ ] 배경이 단색/플레이스홀더가 아니라 스테이지별로 구분되는 **실제 아트**인가? (≥3종)
- [ ] 핵심 스프라이트가 SVG 도형이 아니라 **프로덕션 아트(PNG/WebP)**인가?
- [ ] 피격/획득에 **게임 필(파티클·화면 흔들림·플래시·사운드)**이 있는가?
- [ ] HUD가 겹치거나 잘리지 않고 safe-area를 지키는가? (visual-layout-qa)
- [ ] 스테이지 진행이 **체감**되는가(배경 전환), 숫자만 오르지 않는가?
- [ ] 같은 규칙의 다른 게임과 구별되는 **아트 디렉션/무드**가 있는가?

## Reskin risk
스펙 값만 바꾼 재탕은 여기서 탈락한다. placeholder 아트로 완료 처리하는 것은 금지.
production-demo는 시각 품질 + 게임 필 + 콘텐츠(멀티 스테이지)를 모두 만족해야 한다.
`;
}

// ---------- asset plan ----------
function buildAssetPlan(spec, themes) {
  const w = spec.canvas?.width || 390;
  const h = spec.canvas?.height || 844;
  const title = spec.game?.title || spec.game?.id;
  const mood = spec.theme?.preset || 'retro-arcade';
  const styleGuide = {
    palette: `anchored on ${spec.theme?.colors?.background || '#0b1024'} bg, ${spec.theme?.colors?.player || '#39e98a'} hero, ${spec.theme?.colors?.collectible || '#ffd54a'} reward`,
    outline: 'clean bold silhouettes, high readability at small size',
    lighting: 'soft top light, gentle drop shadow, subtle rim',
    camera: 'flat 2D, portrait, gameplay reads in the bottom 60%',
    mood: `${mood}, punchy, mobile-arcade`,
  };
  const backgrounds = themes.map((t) => ({
    id: `stage-${t.index}`,
    path: `assets/backgrounds/stage-${t.index}.png`,
    width: w,
    height: h,
    theme: t.name,
    prompt: `Vertical mobile game background, ${w}x${h}, theme "${t.name}" for ${title}. ${styleGuide.mood}. Layered parallax depth, empty readable center/bottom for gameplay, no characters, no text, no UI. Cohesive with palette: ${styleGuide.palette}.`,
  }));
  const sprites = [
    { id: 'player', role: 'player', path: 'assets/characters/player.png', width: 256, height: 256, frames: 4, prompt: `A HORIZONTAL SPRITE SHEET: exactly 4 equal-width cells in ONE row, each cell containing THE SAME ${title} hero character in a slightly different run/hover pose (frame1 legs together, frame2 mid-stride, frame3 together, frame4 opposite stride). CRITICAL: identical character design, identical colors, identical scale and vertical position in every cell; cells evenly spaced; character centered within each cell. ${styleGuide.mood}.` },
    { id: 'hazard', role: 'hazard', path: 'assets/enemies/hazard.png', width: 256, height: 256, prompt: `Primary "${spec.hazards?.label || 'hazard'}" obstacle sprite, transparent, clearly dangerous silhouette, readable at 64px, ${styleGuide.mood}.` },
    { id: 'collectible', role: 'collectible', path: 'assets/items/collectible.png', width: 192, height: 192, prompt: `"${spec.collectibles?.label || 'reward'}" pickup sprite, transparent, inviting/positive, distinct from hazard color, ${styleGuide.mood}.` },
  ];
  const ui = [
    { id: 'btn-frame', role: 'ui-icon', path: 'assets/ui/btn-frame.png', width: 360, height: 120, prompt: 'A single WIDE horizontal pill-shaped mobile game button, vibrant green with a smooth gradient and a bright glossy top highlight, HARD CRISP edges. The button is very wide (roughly 3:1) and fills the whole frame edge to edge. NO text, NO icon, NO outer glow, NO drop shadow, NO blur — the area outside the pill must be flat solid pure magenta right up to the crisp button edge.' },
    { id: 'btn-pause', role: 'ui-icon', path: 'assets/ui/btn-pause.png', width: 128, height: 128, prompt: 'A circular glossy green mobile game pause button showing two rounded white vertical bars (pause symbol), glossy top highlight, HARD CRISP circular edge, NO outer glow, NO drop shadow — flat solid pure magenta right up to the circle edge, centered and filling the frame.' },
  ];
  const fx = [
    { id: 'fx-hit', role: 'feedback', path: 'assets/effects/fx-hit.png', width: 256, height: 256, prompt: 'Impact burst spritesheet frame, transparent, energetic.' },
    { id: 'fx-collect', role: 'feedback', path: 'assets/effects/fx-collect.png', width: 192, height: 192, prompt: 'Sparkle/collect burst, transparent, positive.' },
  ];
  const audio = [
    { id: 'ui_click', type: 'ui' }, { id: 'collect', type: 'sfx' }, { id: 'hit', type: 'sfx' },
    { id: 'game_over', type: 'sfx' }, { id: 'game_loop', type: 'bgm' },
  ];
  return { gameId: spec.game?.id, title, canvas: { width: w, height: h }, styleGuide, backgrounds, sprites, ui, fx, audio };
}

function artPromptsMd(plan) {
  const section = (label, items) => `## ${label}\n` + items.map((i) => `### ${i.id}${i.role ? ` (${i.role})` : ''}\n- path: \`${i.path}\`\n- size: ${i.width}×${i.height}\n- prompt: ${i.prompt}\n`).join('\n');
  return `# Art Prompts — ${plan.title}

Generate each asset with your image tool at the listed size and path, matching the style guide.
After generation, set the matching asset-manifest entry \`quality:"production-demo"\`.

## Style guide
- palette: ${plan.styleGuide.palette}
- outline: ${plan.styleGuide.outline}
- lighting: ${plan.styleGuide.lighting}
- camera: ${plan.styleGuide.camera}
- mood: ${plan.styleGuide.mood}

${section('Stage backgrounds', plan.backgrounds.map((b) => ({ ...b, role: b.theme })))}
${section('Core sprites', plan.sprites)}
${section('UI', plan.ui)}
${section('FX', plan.fx)}
`;
}

// ---------- main ----------
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }

  const projectDir = path.resolve(args.project);
  if (!fs.existsSync(projectDir)) throw new Error(`project directory not found: ${projectDir}`);

  const specFile = args.spec ? path.resolve(args.spec) : path.join(projectDir, 'src/game/data/game-spec.json');
  if (!fs.existsSync(specFile)) throw new Error(`spec not found: ${specFile} (pass --spec)`);
  const spec = readJson(specFile);

  const manifestFile = path.join(projectDir, 'assets/asset-manifest.json');
  if (!fs.existsSync(manifestFile)) throw new Error(`asset-manifest.json missing in ${projectDir} (generate the game first)`);
  const manifest = readJson(manifestFile);

  const themes = stageThemes(spec, args.stages);
  const plan = buildAssetPlan(spec, themes);
  const w = plan.canvas.width;
  const h = plan.canvas.height;

  // 1) planning docs
  writeFile(path.join(projectDir, 'docs/01-GDD.md'), docGDD(spec));
  writeFile(path.join(projectDir, 'docs/02-TECH-DESIGN.md'), docTech(spec));
  writeFile(path.join(projectDir, 'docs/03-ASSET-AUDIO-PLAN.md'), docAssetPlan(spec, plan));
  writeFile(path.join(projectDir, 'docs/04-QA-PLAN.md'), docQA(spec));
  writeFile(path.join(projectDir, 'docs/05-ADVERSARIAL-REVIEW.md'), docAdversarial(spec));

  // 2) AI art-direction package
  writeFile(path.join(projectDir, 'asset-plan.json'), JSON.stringify(plan, null, 2) + '\n');
  writeFile(path.join(projectDir, 'art-prompts.md'), artPromptsMd(plan));

  // 3) raster stage-background placeholders (real PNG, canvas size, quality:"draft")
  for (const bg of plan.backgrounds) {
    const theme = themes.find((t) => t.index === Number(bg.id.split('-')[1]));
    const png = encodePng(w, h, drawStageBackground(w, h, theme));
    writeFile(path.join(projectDir, bg.path), png);
  }

  // 4) merge manifest
  manifest.qualityTier = manifest.qualityTier === 'production-demo' ? 'production-demo' : 'draft';
  manifest.stageBackgrounds = plan.backgrounds.map((b) => ({
    id: b.id, path: b.path, quality: 'draft', source: 'placeholder',
    minWidth: b.width, minHeight: b.height,
  }));
  manifest.assetPlan = 'asset-plan.json';

  // Per-game asset isolation + provenance: every asset is generated for THIS game
  // (procedural audio, placeholder/AI images), never a shared/common runtime asset.
  const gid = spec.game.id;
  manifest.assetIsolation = { mode: 'per-game', generatedFor: gid, noSharedRuntimeAssets: true };
  const stampProvenance = (arr) => (Array.isArray(arr) ? arr : []).forEach((e) => {
    if (e && typeof e === 'object') e.provenance = e.provenance || { source: 'generated-for-game', generatedFor: gid };
  });
  stampProvenance(manifest.images);
  stampProvenance(manifest.audio);
  stampProvenance(manifest.stageBackgrounds);

  writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`Productionized baseline: ${projectDir}`);
  console.log(`- planning docs: docs/01..05`);
  console.log(`- art plan: asset-plan.json (${plan.backgrounds.length} backgrounds, ${plan.sprites.length} sprites) + art-prompts.md`);
  console.log(`- stage background placeholders: ${plan.backgrounds.map((b) => b.path).join(', ')}`);
  console.log(`- manifest.stageBackgrounds + qualityTier="${manifest.qualityTier}"`);
  console.log('');
  console.log('NEXT (skill AI-art step): generate production art per asset-plan.json into the listed paths,');
  console.log('overwrite the draft placeholders + core sprites, set those entries and qualityTier to "production-demo",');
  console.log('wire window.__GAME_LAYOUT_BOUNDS__ + juice + StageManager, then run factory:production-gate.');
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
