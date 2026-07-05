#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT_ROOT = path.resolve(ROOT, '..', 'generated');
const SCHEMA_PATH = path.join(ROOT, 'schemas', 'game-spec.schema.json');
const GENERATED_MARKER = '.dev-game-generated.json';

function parseArgs(argv) {
  const args = { template: 'arcade-vertical', difficulty: 'normal', controls: 'drag', theme: 'retro-arcade', withSfx: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--validate-only') args.validateOnly = true;
    else if (a === '--force') args.force = true;
    else if (a === '--install') args.install = true;
    else if (a === '--with-pwa') args.withPwa = true;
    else if (a === '--with-sfx') args.withSfx = true;
    else if (a === '--no-sfx') args.withSfx = false;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`${a} requires a value`);
      args[key] = value;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function help() {
  return `dev-game — scaffold a mobile portrait Phaser/Vite arcade game\n\nUsage:\n  node src/cli.mjs --spec examples/poop-dodge.spec.json --out ../generated/poop-dodge-demo\n  node src/cli.mjs --name "Poop Rush" --title "Poop Rush" --out ../generated/poop-rush\n\nOptions:\n  --name <name>             Project/package name when --spec is omitted\n  --title <text>            Display title override\n  --spec <file>             Game spec JSON\n  --out <dir>               Output directory, default ../generated/<game-id>\n  --template <name>         Only arcade-vertical is supported\n  --width <number>          Canvas width override\n  --height <number>         Canvas height override\n  --controls <drag|tap-lane|swipe>\n  --theme <preset>\n  --difficulty <easy|normal|hard>\n  --with-pwa                Add web manifest/icons placeholder\n  --with-sfx / --no-sfx     Generate procedural WAV placeholders, default on\n  --dry-run                 Print file list without writing\n  --validate-only           Validate spec only\n  --force                   Overwrite output directory\n`;
}

function slugify(input) {
  const s = String(input || 'new-game').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'new-game';
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (['__proto__', 'prototype', 'constructor'].includes(k)) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && base?.[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}


function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function loadGameSpecSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

function describeType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function validateSchemaNode(schema, value, pathName, errors) {
  if (!schema || typeof schema !== 'object') return;
  if (schema.anyOf) {
    const variants = schema.anyOf.map((child) => {
      const local = [];
      validateSchemaNode(child, value, pathName, local);
      return local;
    });
    if (variants.every((local) => local.length > 0)) errors.push(`${pathName}: must match one allowed shape`);
    return;
  }
  if (schema.const !== undefined && value !== schema.const) errors.push(`${pathName}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${pathName}: must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const ok = types.some((t) => {
      if (t === 'array') return Array.isArray(value);
      if (t === 'object') return isPlainObject(value);
      if (t === 'integer') return Number.isInteger(value);
      if (t === 'number') return typeof value === 'number' && Number.isFinite(value);
      if (t === 'null') return value === null;
      return typeof value === t;
    });
    if (!ok) { errors.push(`${pathName}: must be ${types.join(' or ')}, got ${describeType(value)}`); return; }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${pathName}: must not be empty`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) errors.push(`${pathName}: must match ${schema.pattern}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${pathName}: must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${pathName}: must be <= ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) errors.push(`${pathName}: must be > ${schema.exclusiveMinimum}`);
  }
  if (isPlainObject(value) && schema.properties) {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${pathName}.${key}: required`);
    }
    for (const [key, child] of Object.entries(schema.properties)) {
      if (key in value) validateSchemaNode(child, value[key], `${pathName}.${key}`, errors);
    }
  }
}

function validateBySchema(spec) {
  const errors = [];
  validateSchemaNode(loadGameSpecSchema(), spec, 'spec', errors);
  return errors.map((e) => e.replace(/^spec\./, ''));
}

function isHexColor(value) {
  return typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function safeHexColor(value, fallback) {
  return isHexColor(value) ? value : fallback;
}

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function isEmptyDirectory(dir) {
  try { return fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length === 0; } catch { return false; }
}

function hasGeneratedMarker(dir) {
  try {
    const marker = JSON.parse(fs.readFileSync(path.join(dir, GENERATED_MARKER), 'utf8'));
    return marker?.generator === 'dev_game' && marker?.schemaVersion === '1.0.0';
  } catch {
    return false;
  }
}

function assertSafeForceTarget(outDir) {
  const resolved = path.resolve(outDir);
  if (!fs.existsSync(resolved)) return;
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) throw new Error(`Output exists but is not a directory: ${resolved}`);
  if (isPathInside(DEFAULT_OUT_ROOT, resolved) || isEmptyDirectory(resolved) || hasGeneratedMarker(resolved)) return;
  throw new Error(`Refusing to overwrite unsafe output directory: ${resolved}. Use a path under ${DEFAULT_OUT_ROOT}, an empty directory, or a dev_game generated directory with ${GENERATED_MARKER}.`);
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function defaultSpec(opts = {}) {
  const id = slugify(opts.name || opts.title || 'new-game');
  const title = opts.title || opts.name || 'New Arcade Game';
  const width = Number(opts.width || 390);
  const height = Number(opts.height || 844);
  const controls = opts.controls || 'drag';
  const ramp = opts.difficulty === 'hard' ? 12 : opts.difficulty === 'easy' ? 20 : 15;
  return {
    schemaVersion: '1.0.0',
    game: { id, title, description: 'A mobile portrait arcade game generated by dev_game.', orientation: 'portrait', target: 'mobile-web' },
    canvas: { width, height, backgroundColor: '#0b1024', scaleMode: 'fit' },
    player: { moveMode: controls, speed: 760, hitbox: { width: 42, height: 42 } },
    hazards: { type: 'falling', label: 'Hazard', spawnRateStart: 900, spawnRateMax: 240, fallSpeedStart: 260, fallSpeedMax: 760, damage: 1, poolSize: 60 },
    collectibles: { enabled: true, label: 'Coin', spawnRate: 0.25, scoreValue: 50 },
    scoring: { survivalPointsPerSecond: 10, collectiblePoints: 50, highScoreLocalStorageKey: `${id}_best` },
    difficulty: { curve: 'linear', rampEverySeconds: ramp, maxLevel: 12 },
    lives: { start: 1, max: 1 },
    session: { countdownSeconds: 0, maxDurationSeconds: null },
    theme: { preset: opts.theme || 'retro-arcade', colors: { background: '#0b1024', player: '#39e98a', hazard: '#ff5b5b', collectible: '#ffd54a', ui: '#ffffff' } },
    audio: { enabled: true, sfx: { start: 'audio/ui_click.wav', hit: 'audio/hit.wav', score: 'audio/collect.wav', gameOver: 'audio/game_over.wav' }, music: { gameplay: 'audio/game_loop.wav' } },
    ui: { showScore: true, showLives: false, showPause: true, showRestart: true },
    performance: { targetFps: 60, objectPooling: true, pauseWhenHidden: true },
  };
}

function readSpec(opts) {
  let spec = defaultSpec(opts);
  if (opts.spec) {
    const raw = fs.readFileSync(path.resolve(opts.spec), 'utf8');
    const patch = JSON.parse(raw);
    if (!isPlainObject(patch)) throw new Error('Spec root must be an object');
    spec = deepMerge(spec, patch);
  }
  if (opts.name && isPlainObject(spec.game)) spec.game.id = slugify(opts.name);
  if (opts.title && isPlainObject(spec.game)) spec.game.title = opts.title;
  if (opts.width && isPlainObject(spec.canvas)) spec.canvas.width = Number(opts.width);
  if (opts.height && isPlainObject(spec.canvas)) spec.canvas.height = Number(opts.height);
  if (opts.controls && isPlainObject(spec.player)) spec.player.moveMode = opts.controls;
  if (opts.theme && isPlainObject(spec.theme)) spec.theme.preset = opts.theme;
  if (opts.withSfx === false && isPlainObject(spec.audio)) spec.audio.enabled = false;
  if (isPlainObject(spec.game)) spec.game.id = slugify(spec.game.id || spec.game.title);
  if (isPlainObject(spec.scoring) && isPlainObject(spec.game)) spec.scoring.highScoreLocalStorageKey ||= `${spec.game.id}_best`;
  return spec;
}

function validateSpec(spec) {
  const errors = validateBySchema(spec);
  const req = (cond, pathName, msg) => { if (!cond) errors.push(`${pathName}: ${msg}`); };
  if (isPlainObject(spec.canvas)) {
    req(spec.canvas.height > spec.canvas.width, 'canvas.height', 'must be portrait and greater than width');
  }
  if (isPlainObject(spec.hazards)) {
    req(spec.hazards.spawnRateStart >= spec.hazards.spawnRateMax, 'hazards.spawnRateStart', 'must be >= spawnRateMax so difficulty ramps faster over time');
    req(spec.hazards.fallSpeedMax >= spec.hazards.fallSpeedStart, 'hazards.fallSpeedMax', 'must be >= fallSpeedStart');
  }
  if (isPlainObject(spec.lives)) {
    req(spec.lives.start === 1 && spec.lives.max === 1, 'lives', 'current arcade starter supports one-hit survival only');
  }
  if (isPlainObject(spec.session)) {
    req(spec.session.countdownSeconds === 0, 'session.countdownSeconds', 'countdown is not implemented in this starter');
    req(spec.session.maxDurationSeconds === null, 'session.maxDurationSeconds', 'time limit is not implemented in this starter');
  }
  if (isPlainObject(spec.ui)) {
    req(spec.ui.showScore === true, 'ui.showScore', 'score HUD is required in this starter');
    req(spec.ui.showLives === false, 'ui.showLives', 'lives HUD is not implemented in this one-hit starter');
    req(spec.ui.showPause === true, 'ui.showPause', 'pause button is required in this starter');
    req(spec.ui.showRestart === true, 'ui.showRestart', 'retry flow is required in this starter');
  }
  return [...new Set(errors)];
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function jsString(s) { return JSON.stringify(String(s)); }

function buildFiles(spec, opts) {
  const files = new Map();
  const title = spec.game.title;
  const id = spec.game.id;
  const colors = spec.theme.colors || {};
  const backgroundColor = safeHexColor(colors.background || spec.canvas.backgroundColor, '#0b1024');
  const withPwa = !!opts.withPwa;
  const withSfx = opts.withSfx !== false && spec.audio?.enabled !== false;

  files.set('package.json', JSON.stringify({
    name: id,
    version: '0.1.0',
    private: true,
    type: 'module',
    engines: { node: '>=18' },
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: { phaser: '^3.90.0' },
    devDependencies: { vite: '^6.3.5' },
  }, null, 2) + '\n');

  files.set('index.html', `<!doctype html>\n<html lang="ko">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />\n    <meta name="theme-color" content="${escapeHtml(backgroundColor)}" />\n    ${withPwa ? '<link rel="manifest" href="/manifest.webmanifest" />' : ''}\n    <title>${escapeHtml(title)}</title>\n  </head>\n  <body>\n    <div id="game"></div>\n    <script type="module" src="/src/main.js"></script>\n  </body>\n</html>\n`);

  files.set('vite.config.js', `import { defineConfig } from 'vite';\n\nexport default defineConfig({\n  publicDir: 'assets',\n  server: { host: '0.0.0.0' },\n  build: { chunkSizeWarningLimit: 2048 },\n});\n`);

  files.set('src/main.js', `import Phaser from 'phaser';\nimport './styles/mobile.css';\nimport config from './game/config.js';\n\nwindow.addEventListener('load', () => {\n  const game = new Phaser.Game(config);\n  window.__GAME__ = game;\n});\n`);

  files.set('src/styles/mobile.css', `:root {
  color-scheme: dark;
  background: ${backgroundColor};
  font-family: Arial, sans-serif;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html, body, #game {
  margin: 0;
  width: 100%;
  min-width: 100%;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
  background: ${backgroundColor};
  touch-action: none;
  user-select: none;
}

body {
  position: fixed;
  inset: 0;
}

#game {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: #101923;
  /* Phaser Scale.CENTER_BOTH가 캔버스 중앙정렬을 담당한다. CSS flex와 중복하면 desktop에서 오른쪽/아래로 밀린다. */
}

canvas {
  display: block;
  touch-action: none;
}
`);

  files.set('src/game/config.js', `import Phaser from 'phaser';\nimport { SPEC, SCENES } from './data/spec.js';\nimport BootScene from './scenes/BootScene.js';\nimport LoadingScene from './scenes/LoadingScene.js';\nimport HomeScene from './scenes/HomeScene.js';\nimport GameScene from './scenes/GameScene.js';\nimport PauseScene from './scenes/PauseScene.js';\nimport GameOverScene from './scenes/GameOverScene.js';\n\nexport { SPEC, SCENES } from './data/spec.js';\n\nexport default {\n  type: Phaser.AUTO,\n  parent: 'game',\n  width: SPEC.canvas.width,\n  height: SPEC.canvas.height,\n  backgroundColor: SPEC.canvas.backgroundColor,\n  scale: {\n    mode: SPEC.canvas.scaleMode === 'cover' ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT,\n    autoCenter: Phaser.Scale.CENTER_BOTH,\n  },\n  physics: { default: 'arcade', arcade: { debug: false } },\n  fps: { target: SPEC.performance.targetFps || 60, forceSetTimeOut: false },\n  scene: [BootScene, LoadingScene, HomeScene, GameScene, PauseScene, GameOverScene],\n};\n`);

  files.set('src/game/data/game-spec.json', JSON.stringify(spec, null, 2) + '\n');
  files.set('src/game/data/spec.js', `import gameSpec from './game-spec.json';\n\nexport const SPEC = gameSpec;\nexport const SCENES = { BOOT: 'Boot', LOADING: 'Loading', HOME: 'Home', GAME: 'Game', PAUSE: 'Pause', GAMEOVER: 'GameOver' };\n`);

  files.set('src/game/constants/gameKeys.js', `export const ASSET_KEYS = {\n  player: 'player',\n  hazard: 'hazard',\n  collectible: 'collectible',\n  sfxStart: 'sfx_start',\n  sfxHit: 'sfx_hit',\n  sfxCollect: 'sfx_collect',\n  sfxGameOver: 'sfx_game_over',\n  musicGameplay: 'music_gameplay',\n};\n`);

  files.set('src/game/constants/tuning.js', `import { SPEC } from '../data/spec.js';\n\nexport const TUNING = {\n  playerY: SPEC.canvas.height * 0.86,\n  playerSize: 100,\n  hazardSize: 74,\n  collectibleSize: 56,\n  safeTop: 96,\n  safeSide: 28,\n};\n`);

  files.set('src/game/systems/SaveData.js', `import { SPEC } from '../data/spec.js';\n\nconst SETTINGS_KEY = SPEC.game.id + '_settings';\nconst BEST_KEY = SPEC.scoring.highScoreLocalStorageKey || SPEC.game.id + '_best';\n\nexport const SaveData = {\n  getBest() {\n    try { return Number(localStorage.getItem(BEST_KEY) || '0') || 0; } catch { return 0; }\n  },\n  setBest(score) {\n    try { localStorage.setItem(BEST_KEY, String(Math.max(0, Math.floor(score)))); } catch {}\n  },\n  record(score) {\n    const best = this.getBest();\n    if (score > best) { this.setBest(score); return true; }\n    return false;\n  },\n  getSettings() {\n    try { return { mute: false, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) }; } catch { return { mute: false }; }\n  },\n  setSettings(next) {\n    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...this.getSettings(), ...next })); } catch {}\n  },\n};\n`);

  files.set('src/game/systems/AudioManager.js', `import { ASSET_KEYS } from '../constants/gameKeys.js';\nimport { SaveData } from './SaveData.js';\n\nexport const AudioManager = {\n  currentMusic: null,\n  unlocked: false,\n  mute: SaveData.getSettings().mute,\n  unlock(scene) {\n    if (this.unlocked) return;\n    this.unlocked = true;\n    if (scene.sound?.context?.state === 'suspended') scene.sound.context.resume();\n  },\n  setMute(scene, mute) {\n    this.mute = !!mute;\n    SaveData.setSettings({ mute: this.mute });\n    if (scene?.sound) scene.sound.mute = this.mute;\n  },\n  playSfx(scene, key, volume = 0.65) {\n    if (this.mute || !scene.cache.audio.exists(key)) return;\n    scene.sound.play(key, { volume });\n  },\n  playGameplayMusic(scene) {\n    if (this.mute || !scene.cache.audio.exists(ASSET_KEYS.musicGameplay)) return;\n    if (this.currentMusic?.isPlaying) return;\n    this.currentMusic = scene.sound.add(ASSET_KEYS.musicGameplay, { loop: true, volume: 0.22 });\n    this.currentMusic.play();\n  },\n  stopMusic() { if (this.currentMusic) { this.currentMusic.stop(); this.currentMusic.destroy(); this.currentMusic = null; } },\n  pauseMusic() { if (this.currentMusic?.isPlaying) this.currentMusic.pause(); },\n  resumeMusic() { if (!this.mute && this.currentMusic?.isPaused) this.currentMusic.resume(); },\n};\n`);

  files.set('src/game/systems/ScoreManager.js', `import { SPEC } from '../data/spec.js';\n\nexport default class ScoreManager {\n  constructor() { this.score = 0; this.elapsedMs = 0; this.coins = 0; }\n  update(delta) {\n    this.elapsedMs += delta;\n    this.score += (SPEC.scoring.survivalPointsPerSecond || 10) * (delta / 1000);\n  }\n  addCollectible() {\n    this.coins += 1;\n    this.score += SPEC.scoring.collectiblePoints || SPEC.collectibles?.scoreValue || 50;\n  }\n  getScore() { return Math.floor(this.score); }\n}\n`);

  files.set('src/game/systems/SafeArea.js', `export function cssInset(name) {\n  if (typeof window === 'undefined') return 0;\n  const probe = document.createElement('div');\n  probe.style.cssText = 'position:fixed;visibility:hidden;padding:' + name + ';';\n  document.body.appendChild(probe);\n  const value = parseFloat(getComputedStyle(probe).paddingTop) || 0;\n  probe.remove();\n  return value;\n}\n\nexport function safeTop(defaultPad = 24) { return Math.max(defaultPad, cssInset('env(safe-area-inset-top)')); }\nexport function safeBottom(defaultPad = 24) { return Math.max(defaultPad, cssInset('env(safe-area-inset-bottom)')); }\n`);

  files.set('src/game/systems/Spawner.js', `import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';\nimport { ASSET_KEYS } from '../constants/gameKeys.js';\nimport { TUNING } from '../constants/tuning.js';\n\nfunction lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }\n\nexport default class Spawner {\n  constructor(scene) {\n    this.scene = scene;\n    this.acc = 0;\n    this.hazards = scene.physics.add.group({ maxSize: SPEC.hazards.poolSize || 60, allowGravity: false });\n    this.collectibles = scene.physics.add.group({ maxSize: 40, allowGravity: false });\n  }\n  getParams(elapsedSec) {\n    const maxLevel = SPEC.difficulty.maxLevel || 12;\n    const level = Math.min(maxLevel, Math.floor(elapsedSec / (SPEC.difficulty.rampEverySeconds || 15)));\n    const t = maxLevel <= 0 ? 0 : level / maxLevel;\n    return {\n      interval: lerp(SPEC.hazards.spawnRateStart, SPEC.hazards.spawnRateMax, t),\n      speed: lerp(SPEC.hazards.fallSpeedStart, SPEC.hazards.fallSpeedMax, t),\n      level: level + 1,\n    };\n  }\n  update(delta, elapsedSec) {\n    const p = this.getParams(elapsedSec);\n    this.acc += delta;\n    if (this.acc >= p.interval) {\n      this.acc -= p.interval;\n      this.spawnHazard(p.speed);\n      if (SPEC.collectibles?.enabled && Math.random() < (SPEC.collectibles.spawnRate || 0.2)) this.spawnCollectible(p.speed * 0.72);\n    }\n    this.cleanup();\n    return p;\n  }\n  spawnHazard(speed) {\n    const x = Phaser.Math.Between(TUNING.safeSide + 20, SPEC.canvas.width - TUNING.safeSide - 20);\n    const h = this.hazards.get(x, -60, ASSET_KEYS.hazard);\n    if (!h) return;\n    h.enableBody(true, x, -60, true, true);\n    h.setDepth(5).setDisplaySize(TUNING.hazardSize, TUNING.hazardSize);\n    h.body.setAllowGravity(false);\n    h.body.setCircle(Math.min(h.width, h.height) * 0.38, h.width * 0.12, h.height * 0.12);\n    h.setVelocity(0, speed);\n    h.setAngularVelocity(Phaser.Math.Between(-80, 80));\n  }\n  spawnCollectible(speed) {\n    const x = Phaser.Math.Between(TUNING.safeSide + 20, SPEC.canvas.width - TUNING.safeSide - 20);\n    const c = this.collectibles.get(x, -40, ASSET_KEYS.collectible);\n    if (!c) return;\n    c.enableBody(true, x, -40, true, true);\n    c.setDepth(4).setDisplaySize(TUNING.collectibleSize, TUNING.collectibleSize);\n    c.body.setAllowGravity(false);\n    c.body.setCircle(Math.min(c.width, c.height) * 0.42, c.width * 0.08, c.height * 0.08);\n    c.setVelocity(0, speed);\n  }\n  cleanup() {\n    const off = SPEC.canvas.height + 120;\n    this.hazards.children.each((o) => { if (o.active && o.y > off) o.disableBody(true, true); });\n    this.collectibles.children.each((o) => { if (o.active && o.y > off) o.disableBody(true, true); });\n  }\n  reset() {\n    this.acc = 0;\n    this.hazards.children.each((o) => o.disableBody(true, true));\n    this.collectibles.children.each((o) => o.disableBody(true, true));\n  }\n}\n`);

  files.set('src/game/ui/LoadingUI.js', `import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';\n\nexport default class LoadingUI {\n  constructor(scene) {\n    this.scene = scene;\n    const { width, height } = SPEC.canvas;\n    scene.add.rectangle(0, 0, width, height, 0x0b1024).setOrigin(0);\n    this.title = scene.add.text(width / 2, height * 0.34, SPEC.game.title, { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5);\n    this.tip = scene.add.text(width / 2, height * 0.47, 'Loading assets...', { fontFamily: 'Arial', fontSize: '16px', color: '#b9d7ff', align: 'center' }).setOrigin(0.5);\n    this.barBack = scene.add.rectangle(width / 2, height * 0.58, width * 0.72, 18, 0xffffff, 0.18).setOrigin(0.5);\n    this.bar = scene.add.rectangle(width * 0.14, height * 0.58, 4, 18, 0x39e98a, 1).setOrigin(0, 0.5);\n    this.percent = scene.add.text(width / 2, height * 0.63, '0%', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);\n  }\n  setProgress(v) {\n    const { width } = SPEC.canvas;\n    const p = Phaser.Math.Clamp(v, 0, 1);\n    this.bar.width = Math.max(4, width * 0.72 * p);\n    this.percent.setText(Math.round(p * 100) + '%');\n  }\n}\n`);

  files.set('src/game/ui/MobileButton.js', `export function makeTextButton(scene, x, y, label, onClick, width = 190, height = 58) {\n  const _k = 'btnui_' + width + 'x' + height;
    if (!scene.textures.exists('ui_frame') && !scene.textures.exists(_k)) {
      const g = scene.make.graphics({ add: false });
      const r = Math.min(22, height / 2);
      g.fillStyle(0x0a3d1f, 1); g.fillRoundedRect(0, 0, width, height, r);
      g.fillStyle(0x22b357, 1); g.fillRoundedRect(2, 2, width - 4, height - 6, r);
      g.fillStyle(0x46e07e, 0.85); g.fillRoundedRect(4, 3, width - 8, Math.max(3, height * 0.42), r);
      g.lineStyle(2.5, 0xffffff, 0.9); g.strokeRoundedRect(1, 1, width - 2, height - 2, r);
      g.generateTexture(_k, width, height); g.destroy();
    }
    const bg = scene.textures.exists('ui_frame') ? scene.add.image(x, y, 'ui_frame').setDisplaySize(width, height) : scene.add.image(x, y, _k);\n  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);\n  bg.setInteractive({ useHandCursor: true });\n  bg.on('pointerdown', () => { bg.setDisplaySize(width * 0.96, height * 0.96); txt.setScale(0.96); onClick?.(); });\n  bg.on('pointerup', () => { bg.setDisplaySize(width, height); txt.setScale(1); });\n  bg.on('pointerout', () => { bg.setDisplaySize(width, height); txt.setScale(1); });\n  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };\n}\n`);

  files.set('src/game/systems/LayoutRegistry.js', `// Publishes visible UI bounds (in CSS/viewport pixels) to window.__GAME_LAYOUT_BOUNDS__
// so visual-layout-qa can detect HUD overlap and safe-area violations.
export function publishLayout(scene, entries) {
  const s = scene.scale;
  const b = s && s.canvasBounds;
  const gw = s && s.gameSize && s.gameSize.width;
  const gh = s && s.gameSize && s.gameSize.height;
  if (!b || !gw || !gh) return;
  const sx = b.width / gw;
  const sy = b.height / gh;
  const out = [];
  for (const e of entries) {
    const o = e && e.obj;
    if (!o || o.visible === false || typeof o.getBounds !== 'function') continue;
    const r = o.getBounds();
    out.push({ id: e.id, x: b.left + r.x * sx, y: b.top + r.y * sy, width: r.width * sx, height: r.height * sy, visible: true });
  }
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: (scene.scene && scene.scene.key) || '', items: out };
}

export function clearLayout() {
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: '', items: [] };
}
`);

  files.set('src/game/systems/StageManager.js', `import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';

// Full-canvas stage background that swaps as the difficulty level rises. Uses textures
// keyed bg_0, bg_1, ... (present when production art exists); falls back to a solid color.
export default class StageManager {
  constructor(scene) {
    this.scene = scene;
    this.keys = [];
    for (let i = 0; i < 8; i += 1) { if (scene.textures.exists('bg_' + i)) this.keys.push('bg_' + i); }
    this.current = -1;
    if (this.keys.length) {
      this.image = scene.add.image(0, 0, this.keys[0]).setOrigin(0).setDisplaySize(SPEC.canvas.width, SPEC.canvas.height).setDepth(-10);
      this.current = 0;
    } else {
      const c = Phaser.Display.Color.HexStringToColor(SPEC.theme.colors?.background || SPEC.canvas.backgroundColor).color;
      scene.add.rectangle(0, 0, SPEC.canvas.width, SPEC.canvas.height, c).setOrigin(0).setDepth(-10);
    }
  }
  setLevel(level) {
    if (this.keys.length < 2) return;
    const idx = Math.min(this.keys.length - 1, Math.max(0, Math.floor((level - 1) / 3)));
    if (idx === this.current) return;
    this.current = idx;
    const next = this.scene.add.image(0, 0, this.keys[idx]).setOrigin(0).setDisplaySize(SPEC.canvas.width, SPEC.canvas.height).setDepth(-10).setAlpha(0);
    const prev = this.image;
    this.image = next;
    this.scene.tweens.add({ targets: next, alpha: 1, duration: 500, onComplete: () => { if (prev) prev.destroy(); } });
  }
}
`);

  files.set('src/game/systems/Juice.js', `// Lightweight game feel: screen shake, color flash, particle burst, floating score pop.
export const Juice = {
  shake(scene, intensity = 0.012, duration = 200) { scene.cameras.main.shake(duration, intensity); },
  flash(scene, color = 0xffffff, duration = 130) { scene.cameras.main.flash(duration, (color >> 16) & 255, (color >> 8) & 255, color & 255); },
  burst(scene, x, y, tint = 0xffffff, texKey) {
    if (texKey && scene.textures.exists(texKey)) {
      const img = scene.add.image(x, y, texKey).setDepth(30);
      const s = 96 / Math.max(img.width, img.height);
      img.setScale(s).setAlpha(0.95);
      scene.tweens.add({ targets: img, scale: s * 1.7, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
      return;
    }
    const ring = scene.add.circle(x, y, 7, tint, 0.9).setDepth(30);
    scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      const p = scene.add.circle(x, y, 3, tint, 1).setDepth(30);
      scene.tweens.add({ targets: p, x: x + Math.cos(a) * 44, y: y + Math.sin(a) * 44, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
  },
  scorePop(scene, x, y, text, color = '#ffe066') {
    const t = scene.add.text(x, y, text, { fontFamily: 'Arial Black, Arial', fontSize: '22px', color, stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(31);
    scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  },
};
`);

  files.set('src/game/ui/HudUI.js',`import { SPEC } from '../data/spec.js';\nimport { makeTextButton } from './MobileButton.js';\n\nexport default class HudUI {\n  constructor(scene, onPause) {\n    const { width } = SPEC.canvas;\n    this.scoreText = scene.add.text(18, 18, 'SCORE 0', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setDepth(20);\n    this.levelText = scene.add.text(18, 44, 'LV 1', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#b9d7ff', stroke: '#000000', strokeThickness: 3 }).setDepth(20);\n    if (scene.textures.exists('ui_pause')) {\n      const img = scene.add.image(width - 46, 42, 'ui_pause').setDisplaySize(56, 56).setInteractive({ useHandCursor: true });\n      img.on('pointerdown', () => { img.setScale(img.scaleX * 0.92, img.scaleY * 0.92); onPause && onPause(); });\n      img.on('pointerup', () => img.setDisplaySize(56, 56));\n      img.on('pointerout', () => img.setDisplaySize(56, 56));\n      this.pause = { bg: img, txt: img, destroy: () => img.destroy() };\n    } else {\n      this.pause = makeTextButton(scene, width - 54, 38, 'Ⅱ', onPause, 58, 48);\n    }\n    this.pause.bg.setDepth(20); this.pause.txt.setDepth(21);\n  }\n  update(score, level) {\n    this.scoreText.setText('SCORE ' + score);\n    this.levelText.setText('LV ' + level);\n  }\n  setVisible(v) {\n    this.scoreText.setVisible(v); this.levelText.setVisible(v); this.pause.bg.setVisible(v); this.pause.txt.setVisible(v);\n  }\n}\n`);

  files.set('src/game/scenes/BootScene.js', `import Phaser from 'phaser';\nimport { SCENES } from '../data/spec.js';\nimport { SaveData } from '../systems/SaveData.js';\n\nexport default class BootScene extends Phaser.Scene {\n  constructor() { super(SCENES.BOOT); }\n  create() {\n    SaveData.getSettings();\n    this.scene.start(SCENES.LOADING);\n  }\n}\n`);

  files.set('src/game/scenes/LoadingScene.js', `import Phaser from 'phaser';\nimport { SCENES, SPEC } from '../data/spec.js';\nimport { ASSET_KEYS } from '../constants/gameKeys.js';\nimport LoadingUI from '../ui/LoadingUI.js';\n\nimport { publishLayout } from '../systems/LayoutRegistry.js';\n\nexport default class LoadingScene extends Phaser.Scene {\n  constructor() { super(SCENES.LOADING); }\n  preload() {\n    this.loadingUI = new LoadingUI(this);\n    this.load.on('progress', (v) => this.loadingUI.setProgress(v));\n    this.load.image(ASSET_KEYS.player, 'images/player.svg');\n    this.load.image(ASSET_KEYS.hazard, 'images/hazard.svg');\n    this.load.image(ASSET_KEYS.collectible, 'images/collectible.svg');\n    if (SPEC.audio?.enabled) {\n      this.load.audio(ASSET_KEYS.sfxStart, SPEC.audio.sfx.start);\n      this.load.audio(ASSET_KEYS.sfxHit, SPEC.audio.sfx.hit);\n      this.load.audio(ASSET_KEYS.sfxCollect, SPEC.audio.sfx.score);\n      this.load.audio(ASSET_KEYS.sfxGameOver, SPEC.audio.sfx.gameOver);\n      this.load.audio(ASSET_KEYS.musicGameplay, SPEC.audio.music.gameplay);\n    }\n  }\n  create() {\n    const items = (this.loadingUI && this.loadingUI.title) ? [{ id: 'loading', obj: this.loadingUI.title }] : [];\n    publishLayout(this, items);\n    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');\n    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }\n  }\n}\n`);

  files.set('src/game/scenes/HomeScene.js', `import Phaser from 'phaser';\nimport { SCENES, SPEC } from '../data/spec.js';\nimport { ASSET_KEYS } from '../constants/gameKeys.js';\nimport { SaveData } from '../systems/SaveData.js';\nimport { AudioManager } from '../systems/AudioManager.js';\nimport { makeTextButton } from '../ui/MobileButton.js';\n\nimport { publishLayout } from '../systems/LayoutRegistry.js';

export default class HomeScene extends Phaser.Scene {\n  constructor() { super(SCENES.HOME); }\n  create() {\n    AudioManager.stopMusic();\n    const { width, height } = SPEC.canvas;\n    this.add.rectangle(0, 0, width, height, 0x0b1024).setOrigin(0);\n    this.add.image(width / 2, height * 0.38, ASSET_KEYS.player).setDisplaySize(130, 130);\n    this.titleText = this.add.text(width / 2, height * 0.18, SPEC.game.title, { fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);\n    this.bestText = this.add.text(width / 2, height * 0.55, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffd54a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);\n    this.playBtn = makeTextButton(this, width / 2, height * 0.68, 'PLAY', () => { AudioManager.unlock(this); AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.55); this.scene.start(SCENES.GAME); }, 220, 64);\n    this.soundBtn = makeTextButton(this, width / 2, height * 0.78, AudioManager.mute ? 'SOUND OFF' : 'SOUND ON', () => { AudioManager.setMute(this, !AudioManager.mute); this.scene.restart(); }, 220, 52);
    this._homeLayout = [{ id: 'title', obj: this.titleText }, { id: 'best', obj: this.bestText }, { id: 'play', obj: this.playBtn.bg }, { id: 'sound', obj: this.soundBtn.bg }];
    const pub = () => publishLayout(this, this._homeLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));\n  }\n}\n`);

  files.set('src/game/scenes/GameScene.js', `import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';\nimport { ASSET_KEYS } from '../constants/gameKeys.js';\nimport { TUNING } from '../constants/tuning.js';\nimport { AudioManager } from '../systems/AudioManager.js';\nimport ScoreManager from '../systems/ScoreManager.js';\nimport Spawner from '../systems/Spawner.js';\nimport HudUI from '../ui/HudUI.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';\nimport StageManager from '../systems/StageManager.js';\nimport { Juice } from '../systems/Juice.js';\n\nexport default class GameScene extends Phaser.Scene {\n  constructor() { super(SCENES.GAME); }\n  create() {\n    this.isOver = false;\n    this.targetX = SPEC.canvas.width / 2;\n    this.score = new ScoreManager();\n    this.spawner = new Spawner(this);\n    this.stage = new StageManager(this);\n    this.player = this.physics.add.sprite(this.targetX, TUNING.playerY, ASSET_KEYS.player).setDepth(10);\n    this.player.body.setAllowGravity(false);
    { const a = (this.player.width / this.player.height) || 1; this.player.setDisplaySize(TUNING.playerSize * a, TUNING.playerSize); }
    if (this.textures.exists(ASSET_KEYS.player) && this.textures.get(ASSET_KEYS.player).frameTotal > 1) {
      if (!this.anims.exists('player_run')) this.anims.create({ key: 'player_run', frames: this.anims.generateFrameNumbers(ASSET_KEYS.player), frameRate: 12, repeat: -1 });
    }\n    const playerHitbox = SPEC.player.hitbox || { width: 42, height: 42 };
    const playerRadius = Math.max(4, (Math.min(playerHitbox.width, playerHitbox.height) / 2) * (this.player.height / TUNING.playerSize));
    this.player.body.setCircle(playerRadius, Math.max(0, (this.player.width - playerRadius * 2) / 2), Math.max(0, (this.player.height - playerRadius * 2) / 2));\n    this.hud = new HudUI(this, () => this.openPause());
    this.hudLayout = [{ id: 'score', obj: this.hud.scoreText }, { id: 'level', obj: this.hud.levelText }, { id: 'pause', obj: this.hud.pause.bg }];\n    this.physics.add.overlap(this.player, this.spawner.hazards, this.onHit, undefined, this);\n    this.physics.add.overlap(this.player, this.spawner.collectibles, this.onCollect, undefined, this);\n    this.input.on('pointerdown', this.onPointer, this);\n    this.input.on('pointermove', this.onPointer, this);\n    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };\n    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);\n    AudioManager.playGameplayMusic(this);\n    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);\n    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);\n  }\n  onPointer(pointer) {\n    if (this.isOver || pointer.y < 82) return;\n    if (SPEC.player.moveMode === 'tap-lane') {\n      const lane = Math.floor(pointer.x / (SPEC.canvas.width / 3));\n      this.targetX = (lane + 0.5) * (SPEC.canvas.width / 3);\n    } else {\n      this.targetX = Phaser.Math.Clamp(pointer.x, TUNING.safeSide, SPEC.canvas.width - TUNING.safeSide);\n    }\n  }\n  update(time, delta) {\n    if (this.isOver) return;\n    this.score.update(delta);\n    const elapsedSec = this.score.elapsedMs / 1000;\n    const params = this.spawner.update(delta, elapsedSec);
    this.stage.setLevel(params.level);\n    const dx = this.targetX - this.player.x;
    const maxStep = (SPEC.player.speed || 760) * (delta / 1000);
    const vx = Phaser.Math.Clamp(dx, -maxStep, maxStep);
    this.player.x += vx;
    // 이동 피드백: 진행 방향으로 기울기 + 부드러운 부양 바운스(정지 시 원위치)
    this.player.angle = Phaser.Math.Linear(this.player.angle, Phaser.Math.Clamp(vx * 1.6, -16, 16), 0.18);
    this.player.y = TUNING.playerY + Math.sin(time * 0.006) * 3;
    if (this.anims.exists('player_run')) {
      if (Math.abs(vx) > 0.4) { if (!this.player.anims.isPlaying) this.player.play('player_run'); }
      else if (this.player.anims.isPlaying) { this.player.stop(); this.player.setFrame(0); }
    }
    this.hud.update(this.score.getScore(), params.level);
    publishLayout(this, this.hudLayout);\n  }\n  onCollect(player, coin) {\n    const _cx = coin.x, _cy = coin.y;
    coin.disableBody(true, true);\n    this.score.addCollectible();
    Juice.burst(this, _cx, _cy, 0xffe066, 'fx_collect'); Juice.scorePop(this, _cx, _cy, '+' + (SPEC.collectibles?.scoreValue || SPEC.scoring.collectiblePoints || 50));\n    AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.55);\n  }\n  onHit() {\n    if (this.isOver) return;\n    this.isOver = true;
    Juice.shake(this); Juice.flash(this, 0xff5555); Juice.burst(this, this.player.x, this.player.y, 0xff5555, 'fx_hit');\n    AudioManager.playSfx(this, ASSET_KEYS.sfxHit, 0.65);\n    AudioManager.playSfx(this, ASSET_KEYS.sfxGameOver, 0.55);\n    AudioManager.stopMusic();\n    this.physics.pause();\n    this.scene.start(SCENES.GAMEOVER, { score: this.score.getScore(), coins: this.score.coins });\n  }\n  openPause() {\n    if (this.isOver || this.scene.isPaused()) return;\n    AudioManager.pauseMusic();\n    this.hud.setVisible(false);\n    this.scene.launch(SCENES.PAUSE);\n    this.scene.pause();\n  }\n  onResume() {\n    if (!this.isOver) this.hud.setVisible(true);\n  }\n  cleanup() {\n    this.input.off('pointerdown', this.onPointer, this);\n    this.input.off('pointermove', this.onPointer, this);\n    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);\n    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    clearLayout();\n  }\n}\n`);

  files.set('src/game/scenes/PauseScene.js', `import Phaser from 'phaser';\nimport { SCENES, SPEC } from '../data/spec.js';\nimport { AudioManager } from '../systems/AudioManager.js';\nimport { makeTextButton } from '../ui/MobileButton.js';\n\nimport { publishLayout } from '../systems/LayoutRegistry.js';\n\nexport default class PauseScene extends Phaser.Scene {\n  constructor() { super(SCENES.PAUSE); }\n  create() {\n    const { width, height } = SPEC.canvas;\n    this.add.rectangle(0, 0, width, height, 0x000000, 0.62).setOrigin(0);\n    this.pausedText = this.add.text(width / 2, height * 0.3, 'PAUSED', { fontFamily: 'Arial Black, Arial', fontSize: '46px', color: '#fff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);\n    this.resumeBtn = makeTextButton(this, width / 2, height * 0.48, 'RESUME', () => { this.scene.stop(); this.scene.resume(SCENES.GAME); AudioManager.resumeMusic(); }, 230, 62);\n    this.pHomeBtn = makeTextButton(this, width / 2, height * 0.59, 'HOME', () => { AudioManager.stopMusic(); this.scene.stop(SCENES.GAME); this.scene.start(SCENES.HOME); }, 230, 62);
    this._pauseLayout = [{ id: 'paused', obj: this.pausedText }, { id: 'resume', obj: this.resumeBtn.bg }, { id: 'home', obj: this.pHomeBtn.bg }];
    const pub = () => publishLayout(this, this._pauseLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));\n  }\n}\n`);

  files.set('src/game/scenes/GameOverScene.js', `import Phaser from 'phaser';\nimport { SCENES, SPEC } from '../data/spec.js';\nimport { SaveData } from '../systems/SaveData.js';\nimport { makeTextButton } from '../ui/MobileButton.js';\n\nimport { publishLayout } from '../systems/LayoutRegistry.js';\n\nexport default class GameOverScene extends Phaser.Scene {\n  constructor() { super(SCENES.GAMEOVER); }\n  create(data = {}) {\n    const { width, height } = SPEC.canvas;\n    const score = data.score || 0;\n    const isBest = SaveData.record(score);\n    this.add.rectangle(0, 0, width, height, 0x070814).setOrigin(0);\n    this.goText = this.add.text(width / 2, height * 0.22, 'GAME OVER', { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ff6666', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);\n    this.goScoreText = this.add.text(width / 2, height * 0.38, 'SCORE ' + score, { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);\n    this.add.text(width / 2, height * 0.45, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffd54a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);\n    if (isBest) this.add.text(width / 2, height * 0.52, 'NEW BEST!', { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#39e98a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);\n    this.retryBtn = makeTextButton(this, width / 2, height * 0.66, 'RETRY', () => this.scene.start(SCENES.GAME), 230, 62);\n    this.homeBtn = makeTextButton(this, width / 2, height * 0.76, 'HOME', () => this.scene.start(SCENES.HOME), 230, 62);
    this._goLayout = [{ id: 'gameover', obj: this.goText }, { id: 'score', obj: this.goScoreText }, { id: 'retry', obj: this.retryBtn.bg }, { id: 'home', obj: this.homeBtn.bg }];
    const pub = () => publishLayout(this, this._goLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));\n  }\n}\n`);

  files.set('assets/images/player.svg', svgPlayer(safeHexColor(colors.player, '#39e98a')));
  files.set('assets/images/hazard.svg', svgHazard(safeHexColor(colors.hazard, '#9a5b27')));
  files.set('assets/images/collectible.svg', svgCollectible(safeHexColor(colors.collectible, '#ffd54a')));

  const assetManifest = {
    assetsVersion: '1.0.0',
    imagePolicy: { allowedFormats: ['svg', 'png', 'webp'], maxSpriteKB: 512, requireAlphaForSprites: true, minTouchUiSize: 44 },
    audioPolicy: { allowedFormats: ['wav', 'ogg', 'mp3'], maxSfxKB: 300, maxBgmKB: 3072, maxPeakDb: -1, maxTrimSilenceMs: 300 },
    images: [
      { id: 'player', path: 'assets/images/player.svg', type: 'sprite', role: 'player', minWidth: 64, minHeight: 64, requiresAlpha: true },
      { id: 'hazard', path: 'assets/images/hazard.svg', type: 'sprite', role: 'hazard', minWidth: 64, minHeight: 64, requiresAlpha: true },
      { id: 'collectible', path: 'assets/images/collectible.svg', type: 'sprite', role: 'collectible', minWidth: 44, minHeight: 44, requiresAlpha: true },
    ],
    audio: withSfx ? [
      { id: 'ui_click', path: 'assets/audio/ui_click.wav', type: 'ui', required: true, maxDurationMs: 1000 },
      { id: 'collect', path: 'assets/audio/collect.wav', type: 'sfx', required: true, maxDurationMs: 3000 },
      { id: 'hit', path: 'assets/audio/hit.wav', type: 'sfx', required: true, maxDurationMs: 3000 },
      { id: 'game_over', path: 'assets/audio/game_over.wav', type: 'sfx', required: true, maxDurationMs: 3000 },
      { id: 'game_loop', path: 'assets/audio/game_loop.wav', type: 'bgm', required: true, loopable: true },
    ] : [],
  };
  files.set('assets/asset-manifest.json', JSON.stringify(assetManifest, null, 2) + '\n');

  files.set('assets/audio/README.md', withSfx
    ? `# Audio placeholders\n\nGenerated procedural WAV placeholders for immediate gameplay feedback. For release, replace or convert to OGG/MP3 and rerun asset QA.\n`
    : `# Audio disabled\n\nThis project was generated with audio disabled, so no WAV placeholders were written. Enable audio in the spec or regenerate with --with-sfx before release.\n`);

  files.set(GENERATED_MARKER, JSON.stringify({ generator: 'dev_game', schemaVersion: '1.0.0', gameId: id }, null, 2) + '\n');

  files.set('README.md', `# ${title}\n\nGenerated by \`dev_game/generator\` from the \`${spec.game.id}\` spec.\n\n## Run\n\n\`\`\`bash\nnpm install\nnpm run dev\nnpm run build\n\`\`\`\n\n## Scope\n\nThis starter intentionally targets a small mobile portrait arcade game:\n\n- Boot/Loading/Home/Game/Pause/GameOver scenes\n- One-hand ${spec.player.moveMode} control\n- Falling hazards and collectibles\n- Score, best score, pause, audio, localStorage\n- Placeholder images and procedural audio\n\nExcluded by design: backend, ads, payments, multiplayer, heavy liveops, native packaging.\n`);

  if (withPwa) {
    files.set('assets/manifest.webmanifest', JSON.stringify({
      name: title,
      short_name: title.slice(0, 12),
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: backgroundColor,
      theme_color: backgroundColor,
      icons: [],
    }, null, 2) + '\n');
  }
  return { files, withSfx };
}

function svgPlayer(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-opacity=".35"/></filter></defs><g filter="url(#s)"><circle cx="64" cy="36" r="24" fill="#ffe1bd" stroke="#111" stroke-width="5"/><rect x="36" y="56" width="56" height="48" rx="18" fill="${color}" stroke="#111" stroke-width="5"/><circle cx="55" cy="34" r="4"/><circle cx="73" cy="34" r="4"/><path d="M54 45q10 8 20 0" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/><path d="M42 104h18M68 104h18" stroke="#111" stroke-width="8" stroke-linecap="round"/></g></svg>\n`;
}

function svgHazard(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d58a3a"/><stop offset="1" stop-color="${color}"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-opacity=".35"/></filter></defs><g filter="url(#s)" stroke="#1b0d06" stroke-width="5" stroke-linejoin="round"><path d="M28 92c4-24 23-28 28-39 6-13-1-22-1-22 20 8 32 28 21 43 14 1 25 8 25 20 0 17-18 24-38 24s-39-7-35-26z" fill="url(#g)"/><circle cx="52" cy="83" r="4"/><circle cx="77" cy="83" r="4"/><path d="M54 99q11 7 23 0" fill="none" stroke-linecap="round"/></g></svg>\n`;
}

function svgCollectible(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><radialGradient id="g" cx="35%" cy="30%"><stop stop-color="#fff6a8"/><stop offset=".55" stop-color="${color}"/><stop offset="1" stop-color="#d88900"/></radialGradient><filter id="s"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity=".35"/></filter></defs><g filter="url(#s)"><circle cx="64" cy="64" r="44" fill="url(#g)" stroke="#8a5100" stroke-width="6"/><circle cx="64" cy="64" r="30" fill="none" stroke="#fff1a0" stroke-width="5" opacity=".8"/><text x="64" y="77" text-anchor="middle" font-size="42" font-family="Arial Black, Arial" fill="#8a5100">★</text></g></svg>\n`;
}

function wavBuffer(duration, fn, sampleRate = 22050) {
  const samples = Math.floor(duration * sampleRate);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const v = Math.max(-1, Math.min(1, fn(t, i, duration)));
    buffer.writeInt16LE(Math.floor(v * 32767), 44 + i * 2);
  }
  return buffer;
}

function tone(freq, t) { return Math.sin(2 * Math.PI * freq * t); }
function env(t, dur) { return Math.max(0, 1 - t / dur); }

function audioFiles() {
  return new Map([
    ['assets/audio/ui_click.wav', wavBuffer(0.11, (t) => tone(920, t) * env(t, 0.11) * 0.35)],
    ['assets/audio/collect.wav', wavBuffer(0.35, (t) => (tone(880, t) + tone(1320, Math.max(0, t - 0.08)) * 0.55) * env(t, 0.35) * 0.32)],
    ['assets/audio/hit.wav', wavBuffer(0.42, (t, i) => (tone(150 - 90 * t, t) * 0.7 + (((i * 1103515245) & 255) / 128 - 1) * 0.24) * env(t, 0.42) * 0.45)],
    ['assets/audio/game_over.wav', wavBuffer(0.9, (t) => { const notes = [392, 330, 262, 196]; const idx = Math.min(3, Math.floor(t / 0.22)); const local = t - idx * 0.22; return tone(notes[idx], local) * env(local, 0.24) * 0.35; })],
    ['assets/audio/game_loop.wav', wavBuffer(8, (t) => { const beat = Math.floor(t * 4) % 8; const bass = [130, 130, 164, 130, 196, 164, 146, 164][beat]; const lead = [523, 659, 784, 659][Math.floor(t * 2) % 4]; return (tone(bass, t) * 0.16 + tone(lead, t) * 0.06) * 0.6; })],
  ]);
}

function writeGenerated(spec, outDir, opts) {
  const { files, withSfx } = buildFiles(spec, opts);
  const all = new Map(files);
  if (withSfx) for (const [k, v] of audioFiles()) all.set(k, v);
  if (opts.dryRun) {
    console.log(`[dry-run] Would generate ${all.size} files in ${outDir}`);
    for (const f of [...all.keys()].sort()) console.log(`- ${f}`);
    return;
  }
  if (fs.existsSync(outDir)) {
    if (!opts.force) throw new Error(`Output exists: ${outDir}. Use --force to overwrite.`);
    assertSafeForceTarget(outDir);
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  for (const [rel, content] of all) {
    const file = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  console.log(`Generated ${spec.game.title} at ${outDir}`);
}

function main() {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) { console.log(help()); return; }
    if (opts.template !== 'arcade-vertical') throw new Error('Only --template arcade-vertical is supported in this scoped factory.');
    const spec = readSpec(opts);
    const errors = validateSpec(spec);
    if (errors.length) {
      console.error('Spec validation failed:');
      for (const e of errors) console.error(`- ${e}`);
      process.exit(1);
    }
    if (opts.validateOnly) { console.log(`Spec OK: ${spec.game.id}`); return; }
    const outDir = path.resolve(opts.out || path.join(DEFAULT_OUT_ROOT, spec.game.id));
    writeGenerated(spec, outDir, opts);
    if (opts.install && !opts.dryRun) {
      const result = spawnSync(npmCommand(), ['install'], { cwd: outDir, stdio: 'inherit' });
      if (result.status !== 0) process.exit(result.status || 1);
    }
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
