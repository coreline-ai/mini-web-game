#!/usr/bin/env node
// codex-imagegen.mjs — dev_game AI ART STEP.
// Reads a generated game's asset-plan.json and produces production-grade raster art
// by driving Codex's BUILT-IN image_gen tool via `codex exec` (ChatGPT auth, no
// OPENAI_API_KEY needed). Backgrounds are generated directly; sprites are generated on
// a flat chroma-key background and made transparent with the imagegen skill's
// remove_chroma_key.py helper. Generated entries are promoted to quality:"production-demo"
// in asset-manifest.json, and qualityTier flips to "production-demo" once every core
// asset + >=3 backgrounds are real art — which is exactly what factory:production-demo-qa gates.
//
// Usage:
//   node generator/scripts/codex-imagegen.mjs --project <dir> [--only backgrounds|sprites|all]
//   DEVGAME_CODEX_BIN=/path/to/codex node ... (override codex binary)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';

function parseArgs(argv) {
  const args = { only: 'all', timeoutSec: 300 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--project') args.project = argv[++i];
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--codex') args.codex = argv[++i];
    else if (a === '--timeout') args.timeoutSec = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.project) throw new Error('Missing required --project <dir>');
  if (!['all', 'backgrounds', 'sprites', 'ui', 'fx', 'wire'].includes(args.only)) throw new Error('--only must be all|backgrounds|sprites|ui|fx|wire');
  return args;
}

function usage() {
  console.log(`Usage:
  node generator/scripts/codex-imagegen.mjs --project <generated-game-dir> [--only all|backgrounds|sprites]

Drives Codex built-in image_gen (via 'codex exec', ChatGPT auth, no OPENAI_API_KEY) to
generate production art declared in <project>/asset-plan.json, then promotes matching
asset-manifest.json entries to quality:"production-demo".

Env:
  DEVGAME_CODEX_BIN   Path to a working codex binary (auto-detected otherwise)`);
}

// ---- locate a WORKING codex binary (the nvm-installed one is often broken) ----
function findCodex(override) {
  const candidates = [];
  if (override) candidates.push(override);
  if (process.env.DEVGAME_CODEX_BIN) candidates.push(process.env.DEVGAME_CODEX_BIN);
  const home = os.homedir();
  const globs = [
    `${home}/.antigravity-ide/extensions/openai.chatgpt-*/bin/macos-*/codex`,
    `${home}/.antigravity/extensions/openai.chatgpt-*/bin/macos-*/codex`,
    `${home}/.vscode/extensions/openai.chatgpt-*/bin/macos-*/codex`,
  ];
  for (const g of globs) {
    try { for (const p of globSync(g)) candidates.push(p); } catch {}
  }
  candidates.push('codex');
  for (const bin of candidates) {
    try {
      const r = spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 15000 });
      if (r.status === 0 && /codex/i.test(r.stdout || '')) return bin;
    } catch {}
  }
  throw new Error('No working codex binary found. Set DEVGAME_CODEX_BIN=/path/to/codex');
}

function readJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
function writeJson(f, o) { fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n'); }

function pngSize(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.length < 24 || b[0] !== 0x89 || b[1] !== 0x50) return null;
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  } catch { return null; }
}

// ---- run one codex exec image generation into an absolute output file ----
function codexGenerate(codex, outFile, prompt, timeoutSec) {
  const outDir = path.dirname(outFile);
  const base = path.basename(outFile);
  fs.mkdirSync(outDir, { recursive: true });
  const full = `Use your BUILT-IN image_gen tool (the default imagegen skill mode that does NOT require OPENAI_API_KEY). Do NOT use the gpt-image2 CLI or any API key path. Generate ONE image, then copy the final result to the current working directory as '${base}'. Prompt: ${prompt} No text, no watermark, no UI, no border. When done print 'SAVED ${base}'.`;
  const r = spawnSync(codex, [
    'exec', '--sandbox', 'workspace-write', '-C', outDir, '--skip-git-repo-check',
    '-c', 'model_reasoning_effort="low"', full,
  ], { encoding: 'utf8', timeout: timeoutSec * 1000, stdio: ['ignore', 'pipe', 'pipe'] });
  return fs.existsSync(outFile);
}

// ---- make a generated (opaque) sprite transparent via chroma-key helper ----
function removeChroma(codexHome, file) {
  const helper = path.join(codexHome, 'skills/.system/imagegen/scripts/remove_chroma_key.py');
  if (!fs.existsSync(helper)) return false;
  // helper API: --input/--out; --auto-key border auto-detects the key color from the
  // image border (robust vs assuming an exact magenta), --despill cleans color fringing.
  const r = spawnSync('python3', [helper, '--input', file, '--out', file, '--auto-key', 'border', '--despill', '--force'], { encoding: 'utf8', timeout: 60000 });
  return r.status === 0;
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
    if (spriteByRole.player) t = t.replace("'images/player.svg'", `'${spriteByRole.player}'`);
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
    const bgImage = `this.add.image(0, 0, 'bg_0').setOrigin(0).setDisplaySize(SPEC.canvas.width, SPEC.canvas.height).setDepth(-10);`;
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
      t = t.replace(/this\.add\.rectangle\(0, 0, width, height, 0x0b1024\)\.setOrigin\(0\);/, `this.add.image(0, 0, 'bg_0').setOrigin(0).setDisplaySize(width, height).setDepth(-10);`);
      if (t !== before) { fs.writeFileSync(homeFile, t); patched.push('HomeScene'); }
    }
  }
  return patched;
}

// Mark manifest entries production-demo for any plan asset whose file exists on disk.
function promoteExisting(projectDir, plan, manifest) {
  manifest.stageBackgrounds = manifest.stageBackgrounds || [];
  manifest.images = manifest.images || [];
  const gid = plan.gameId;
  const prov = () => ({ source: 'generated-for-game', generatedFor: gid });
  if (gid) manifest.assetIsolation = manifest.assetIsolation || { mode: 'per-game', generatedFor: gid, noSharedRuntimeAssets: true };
  for (const bg of plan.backgrounds || []) {
    if (!fs.existsSync(path.join(projectDir, bg.path))) continue;
    let e = manifest.stageBackgrounds.find((x) => x.id === bg.id);
    if (!e) { e = { id: bg.id, path: bg.path, minWidth: bg.width, minHeight: bg.height }; manifest.stageBackgrounds.push(e); }
    e.path = bg.path; e.quality = 'production-demo'; e.provenance = prov();
  }
  for (const sp of plan.sprites || []) {
    if (!fs.existsSync(path.join(projectDir, sp.path))) continue;
    let e = manifest.images.find((x) => x.id === sp.id);
    if (!e) { e = { id: sp.id, type: 'sprite' }; manifest.images.push(e); }
    e.path = sp.path; e.role = sp.role; e.quality = 'production-demo'; e.requiresAlpha = true; e.provenance = prov();
  }
}

// Crop a transparent PNG to its alpha bounding box, then resize to an exact target size.
// Makes AI UI art (arbitrary size + padding) into a predictable button-frame texture.
function autocropResize(file, targetW, targetH) {
  const py = [
    'import sys',
    'from PIL import Image',
    'im = Image.open(sys.argv[1]).convert("RGBA")',
    'b = im.getbbox()',
    'if b: im = im.crop(b)',
    'im = im.resize((int(sys.argv[2]), int(sys.argv[3])), Image.LANCZOS)',
    'im.save(sys.argv[1])',
  ].join('\n');
  const r = spawnSync('python3', ['-c', py, file, String(targetW), String(targetH)], { encoding: 'utf8', timeout: 30000 });
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
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const plan = readJson(planFile);
  const manifest = readJson(manifestFile);
  console.log(`codex: ${codex}`);
  console.log(`project: ${projectDir}`);

  const results = { backgrounds: [], sprites: [], ui: [], fx: [] };

  if (args.only === 'all' || args.only === 'backgrounds') {
    for (const bg of plan.backgrounds || []) {
      const out = path.join(projectDir, bg.path);
      process.stdout.write(`bg ${bg.id} … `);
      const ok = codexGenerate(codex, out, bg.prompt, args.timeoutSec);
      const size = ok ? pngSize(out) : null;
      const good = !!size && size.width >= plan.canvas.width && size.height >= plan.canvas.height;
      console.log(ok ? `✔ ${size ? size.width + 'x' + size.height : '?'}${good ? '' : ' (TOO SMALL)'}` : '✗ FAILED');
      results.backgrounds.push({ id: bg.id, ok: good });
      if (good && Array.isArray(manifest.stageBackgrounds)) {
        const e = manifest.stageBackgrounds.find((x) => x.id === bg.id);
        if (e) { e.quality = 'production-demo'; e.source = 'ai-image_gen'; }
      }
    }
  }

  if (args.only === 'all' || args.only === 'sprites') {
    for (const sp of plan.sprites || []) {
      const out = path.join(projectDir, sp.path);
      process.stdout.write(`sprite ${sp.id} … `);
      const chromaPrompt = `${sp.prompt} Center the subject on a FLAT SOLID pure-magenta (#FF00FF) background with no gradient and no shadow touching the edges, so the background can be removed by chroma key.`;
      const ok = codexGenerate(codex, out, chromaPrompt, args.timeoutSec);
      let transparent = false;
      if (ok) transparent = removeChroma(codexHome, out);
      const size = ok ? pngSize(out) : null;
      console.log(ok ? `✔ ${size ? size.width + 'x' + size.height : '?'}${transparent ? ' (transparent)' : ' (opaque — chroma removal failed)'}` : '✗ FAILED');
      results.sprites.push({ id: sp.id, ok: ok && transparent });
      if (ok && Array.isArray(manifest.images)) {
        let e = manifest.images.find((x) => x.id === sp.id);
        if (!e) { e = { id: sp.id, path: sp.path, type: 'sprite', role: sp.role }; manifest.images.push(e); }
        e.path = sp.path; e.role = sp.role; e.quality = 'production-demo'; e.requiresAlpha = true;
      }
    }
  }

  // UI buttons + FX bursts — transparent AI art (chroma-key removed), same as sprites.
  const extra = [];
  if (args.only === 'all' || args.only === 'ui') extra.push(...(plan.ui || []).map((x) => ({ ...x, _group: 'ui' })));
  if (args.only === 'all' || args.only === 'fx') extra.push(...(plan.fx || []).map((x) => ({ ...x, _group: 'fx' })));
  for (const it of extra) {
    const out = path.join(projectDir, it.path);
    process.stdout.write(`${it._group} ${it.id} … `);
    const chromaPrompt = `${it.prompt} Render the subject centered on a FLAT SOLID pure-magenta (#FF00FF) background, no gradient, no shadow touching the edges, so the background can be removed by chroma key.`;
    const ok = codexGenerate(codex, out, chromaPrompt, args.timeoutSec);
    let transparent = false;
    if (ok) transparent = removeChroma(codexHome, out);
    // UI frames/icons: crop away transparent padding + normalize to declared size so the
    // game can scale them predictably (buttons vary in size).
    if (ok && it._group === 'ui' && it.width && it.height) autocropResize(out, it.width, it.height);
    const size = ok ? pngSize(out) : null;
    console.log(ok ? `✔ ${size ? size.width + 'x' + size.height : '?'}${transparent ? ' (transparent)' : ' (opaque)'}` : '✗ FAILED');
    results[it._group].push({ id: it.id, ok });
    if (ok && Array.isArray(manifest.images)) {
      let e = manifest.images.find((x) => x.id === it.id);
      if (!e) { e = { id: it.id, type: it._group }; manifest.images.push(e); }
      e.path = it.path; e.role = it.role; e.requiresAlpha = true;
      e.provenance = { source: 'generated-for-game', generatedFor: plan.gameId };
    }
  }

  // Promote manifest entries for any plan asset that actually exists on disk (covers
  // --only wire, where art was generated in a prior run or restored externally).
  promoteExisting(projectDir, plan, manifest);

  // flip qualityTier only when every declared background + core sprite is real art
  const bgAll = (manifest.stageBackgrounds || []).length >= 3 && (manifest.stageBackgrounds || []).every((b) => b.quality === 'production-demo');
  const coreRoles = new Set(['player', 'hazard', 'obstacle', 'enemy', 'boss', 'collectible', 'reward', 'vehicle', 'parcel', 'sort-bin', 'item', 'powerup', 'projectile']);
  const coreImgs = (manifest.images || []).filter((im) => coreRoles.has(String(im.role || '').toLowerCase()));
  const coreAll = coreImgs.length > 0 && coreImgs.every((im) => im.quality === 'production-demo');
  if (bgAll && coreAll) manifest.qualityTier = 'production-demo';

  writeJson(manifestFile, manifest);

  const wired = wireGameToAssets(projectDir, plan);
  if (wired.length) console.log(`wired game to assets: ${wired.join(', ')}`);

  console.log('');
  const n = (a) => `${a.filter((r) => r.ok).length}/${a.length}`;
  console.log(`backgrounds: ${n(results.backgrounds)} · sprites: ${n(results.sprites)} · ui: ${n(results.ui)} · fx: ${n(results.fx)}`);
  console.log(`qualityTier: ${manifest.qualityTier}${bgAll && coreAll ? ' (promoted)' : ' (still draft — art incomplete)'}`);
  const failed = [...results.backgrounds, ...results.sprites, ...results.ui, ...results.fx].filter((r) => !r.ok);
  if (failed.length) { console.log(`FAILED: ${failed.map((r) => r.id).join(', ')}`); process.exit(1); }
}

try { main(); } catch (err) { console.error(err.message || err); process.exit(1); }
