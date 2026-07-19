#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'assets/qa/asset-coverage/after-phase7');
const outputRoot = path.join(root, 'assets/qa/artboards');
const definitions = [
  ['01-loading', 'loading.png', 'Loading', ['runtime-text', 'ui-hud-frame', 'dynamic-loading-progress']],
  ['02-home', 'home.png', 'Home', ['far-background', 'cinematic-color-grade', 'ui-hud-frame', 'ui-menu-button-base', 'runtime-text']],
  ['03-combat', 'game-start.png', 'Game', ['far/mid/near/ambience', 'terrain', 'environment-props', 'characters', 'HUD', 'mobile-controls']],
  ['04-rescue-escort', 'rescue-ability.png', 'Game', ['rescue-character', 'rescue-marker', 'transport-state', 'HUD', 'callout-plate']],
  ['05-boss', 'iron-mole-phase-3.png', 'Game', ['boss-phase-parts', 'boss-health-frame', 'arena-background', 'terrain', 'mobile-controls']],
  ['06-pause', 'pause.png', 'Pause', ['camera-mask', 'ui-hud-frame', 'ui-menu-button-base', 'runtime-text']],
  ['07-result', 'result.png', 'GameOver', ['cinematic-color-grade', 'ui-hud-frame', 'mission-emblem', 'ui-menu-button-base', 'runtime-text']],
];

fs.mkdirSync(outputRoot, { recursive: true });
const artboards = definitions.map(([id, sourceName, scene, ownership]) => {
  const source = path.join(sourceRoot, sourceName);
  if (!fs.existsSync(source)) throw new Error(`Missing runtime capture for ${id}: ${source}`);
  const destination = path.join(outputRoot, `${id}.png`);
  fs.copyFileSync(source, destination);
  const buffer = fs.readFileSync(destination);
  return {
    id,
    scene,
    path: path.relative(root, destination),
    sourceCapture: path.relative(root, source),
    viewport: { width: 1280, height: 720, dpr: 1 },
    ownership,
    status: 'approved-runtime-composite',
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
});
const report = { schemaVersion: '1.0.0', generatedAt: new Date().toISOString(), count: artboards.length, artboards };
fs.writeFileSync(path.join(outputRoot, 'artboards.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Published ${artboards.length} approved runtime artboards to ${path.relative(root, outputRoot)}`);
