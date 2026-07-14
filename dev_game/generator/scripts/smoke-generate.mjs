#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tmpRoot = path.resolve(root, '..', '.tmp');
const out = path.join(tmpRoot, 'poop-dodge-smoke');
const outNoSfx = path.join(tmpRoot, 'poop-dodge-smoke-no-sfx');
const cli = path.join(root, 'src/cli.mjs');
const spec = path.join(root, 'examples/poop-dodge.spec.json');
const canonicalRuntimeHelper = path.join(root, 'templates/runtime-asset-delivery.mjs');
const customSpec = path.join(root, 'examples/custom-loop-shell.spec.json');
const customOut = path.join(tmpRoot, 'custom-loop-shell');

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

function runExpectFail(args, expectedText) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  if (result.status === 0) throw new Error(`Expected failure but command passed: ${args.join(' ')}`);
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (expectedText && !output.includes(expectedText)) {
    throw new Error(`Failure output did not include ${expectedText}: ${output}`);
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function assertFile(base, rel) {
  if (!fs.existsSync(path.join(base, rel))) throw new Error(`Missing generated file: ${rel}`);
}

function assertNoFile(base, rel) {
  if (fs.existsSync(path.join(base, rel))) throw new Error(`Unexpected generated file: ${rel}`);
}

function readText(base, rel) {
  return fs.readFileSync(path.join(base, rel), 'utf8');
}

function readJson(base, rel) {
  return JSON.parse(readText(base, rel));
}

fs.rmSync(out, { recursive: true, force: true });
fs.rmSync(outNoSfx, { recursive: true, force: true });
fs.rmSync(customOut, { recursive: true, force: true });
run(['--force', '--spec', spec, '--out', out]);

const required = [
  '.dev-game-generated.json',
  'package.json',
  'index.html',
  'vite.config.js',
  'scripts/runtime-asset-delivery.mjs',
  'src/main.js',
  'src/styles/mobile.css',
  'src/game/config.js',
  'src/game/data/game-spec.json',
  'src/game/data/spec.js',
  'src/game/scenes/BootScene.js',
  'src/game/scenes/LoadingScene.js',
  'src/game/scenes/GameScene.js',
  'assets/images/player.svg',
  'assets/images/hazard.svg',
  'assets/images/collectible.svg',
  'assets/audio/ui_click.wav',
  'assets/audio/collect.wav',
  'assets/audio/hit.wav',
  'assets/audio/game_over.wav',
  'assets/audio/game_loop.wav',
  'assets/asset-manifest.json',
];

for (const rel of required) assertFile(out, rel);
if (readText(out, 'scripts/runtime-asset-delivery.mjs') !== fs.readFileSync(canonicalRuntimeHelper, 'utf8')) {
  throw new Error('generated runtime helper diverges from the canonical generator template');
}

const generatedPackage = readJson(out, 'package.json');
if (generatedPackage.engines?.node !== '>=18') {
  throw new Error('generated package.json must declare node >=18');
}
if (generatedPackage.scripts?.['qa:dist-runtime'] !== 'node scripts/runtime-asset-delivery.mjs qa') {
  throw new Error('generated package.json must expose package-local dist runtime QA');
}
const viteConfig = readText(out, 'vite.config.js');
if (!viteConfig.includes('publicDir: false') || !viteConfig.includes('createRuntimeAssetDeliveryPlugin')) {
  throw new Error('generated Vite config must use the runtime allowlist plugin with publicDir:false');
}
const generatedManifest = readJson(out, 'assets/asset-manifest.json');
for (const group of ['stageBackgrounds', 'images', 'audio', 'hqScreenAssets', 'files']) {
  for (const entry of generatedManifest[group] || []) {
    if (!['runtime', 'source'].includes(entry.delivery)) throw new Error(`${group} entry is missing explicit delivery metadata`);
  }
}

if (!readText(out, 'src/main.js').includes("import './styles/mobile.css';")) {
  throw new Error('src/main.js does not import mobile CSS');
}
for (const rel of fs.readdirSync(path.join(out, 'src/game/scenes')).map((name) => `src/game/scenes/${name}`)) {
  const body = readText(out, rel);
  if (body.includes('extends Phaser.Scene') && !body.startsWith("import Phaser from 'phaser';")) {
    throw new Error(`${rel} extends Phaser.Scene without importing Phaser`);
  }
}
if (!readText(out, 'src/game/scenes/GameScene.js').includes('onResume()')) {
  throw new Error('GameScene does not restore HUD on resume');
}
for (const rel of [
  ...fs.readdirSync(path.join(out, 'src/game/scenes')).map((name) => `src/game/scenes/${name}`),
  ...fs.readdirSync(path.join(out, 'src/game/systems')).map((name) => `src/game/systems/${name}`),
  ...fs.readdirSync(path.join(out, 'src/game/ui')).map((name) => `src/game/ui/${name}`),
  'src/game/constants/tuning.js',
]) {
  if (readText(out, rel).includes("from '../config.js'")) {
    throw new Error(`${rel} imports ../config.js and can reintroduce a config/scene cycle`);
  }
}

run(['--force', '--no-sfx', '--spec', spec, '--out', outNoSfx]);
const noSfxSpec = readJson(outNoSfx, 'src/game/data/game-spec.json');
const noSfxManifest = readJson(outNoSfx, 'assets/asset-manifest.json');
if (noSfxSpec.audio?.enabled !== false) {
  throw new Error('--no-sfx must write audio.enabled=false to generated spec');
}
if (noSfxManifest.audio.length !== 0) {
  throw new Error('--no-sfx must write an empty audio manifest');
}
assertFile(outNoSfx, 'scripts/runtime-asset-delivery.mjs');
assertNoFile(outNoSfx, 'assets/audio/ui_click.wav');

run(['--force', '--spec', customSpec, '--template', 'custom-shell', '--out', customOut]);
for (const rel of ['src/game/systems/SaveData.js', 'src/game/systems/AudioManager.js', 'src/game/systems/LayoutRegistry.js', 'src/game/ui/MobileButton.js', 'qa/capture-matrix.json']) assertFile(customOut, rel);
for (const forbidden of ['src/game/systems/Spawner.js', 'assets/images/player.svg', 'assets/images/hazard.svg', 'assets/images/collectible.svg']) assertNoFile(customOut, forbidden);
const customSource = fs.readdirSync(path.join(customOut, 'src/game/scenes')).map((name) => readText(customOut, `src/game/scenes/${name}`)).join('\n');
if (/falling|coin|one-hit/i.test(customSource)) throw new Error('custom-shell leaked arcade Foundation gameplay');

const protectedOut = path.join(tmpRoot, 'protected-victim');
fs.rmSync(protectedOut, { recursive: true, force: true });
fs.mkdirSync(protectedOut, { recursive: true });
fs.writeFileSync(path.join(protectedOut, 'keep.txt'), 'do not delete');
runExpectFail(['--force', '--spec', spec, '--out', protectedOut], 'Refusing to overwrite unsafe output directory');
if (!fs.existsSync(path.join(protectedOut, 'keep.txt'))) throw new Error('unsafe --force deleted protected output');

const badNegative = path.join(tmpRoot, 'bad-negative.spec.json');
writeJson(badNegative, { hazards: { fallSpeedStart: -260 } });
runExpectFail(['--validate-only', '--spec', badNegative], 'hazards.fallSpeedStart');

const badTheme = path.join(tmpRoot, 'bad-theme.spec.json');
writeJson(badTheme, { theme: { colors: null } });
runExpectFail(['--validate-only', '--spec', badTheme], 'theme.colors');

const badGame = path.join(tmpRoot, 'bad-game.spec.json');
writeJson(badGame, { game: null });
runExpectFail(['--validate-only', '--spec', badGame], 'game: must be object');

const badRoot = path.join(tmpRoot, 'bad-root.spec.json');
fs.writeFileSync(badRoot, 'null\n');
runExpectFail(['--validate-only', '--spec', badRoot], 'Spec root must be an object');

console.log(`Smoke generation OK: ${out}`);
console.log(`Smoke no-sfx OK: ${outNoSfx}`);
console.log(`Smoke custom-loop shell OK: ${customOut}`);
fs.rmSync(tmpRoot, { recursive: true, force: true });
