#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const value = (flag) => argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : null;
const input = value('--spec');
const output = value('--out');
const mode = value('--mode');
if (!input || !output || mode !== 'custom-loop') {
  console.error('Usage: migrate-spec-v2 --spec <v1.json> --out <v2.json> --mode custom-loop');
  process.exit(1);
}
const source = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const skeleton = {
  schemaVersion: '2.0.0', game: source.game, canvas: source.canvas,
  buildDecision: 'custom-loop', implementationStatus: 'foundation',
  runtimeConfig: 'src/game/config/customGameConfig.js',
  rules: {
    durationSeconds: source.session?.maxDurationSeconds || 180,
    goal: 'TODO: define the actual win goal', progressMetric: 'TODO: define the visible progress metric',
    requiredObjectives: [], failConditions: ['TODO: define at least one failure condition'],
    commands: [{ id: 'primary-command', label: 'TODO', input: 'TODO', costs: {} }],
  },
  requiredAssetRoles: ['stage-background', 'todo-role'], captureMatrix: 'qa/capture-matrix.json',
  audio: source.audio || { enabled: true, sfx: {}, music: {} },
  ui: { showPause: source.ui?.showPause !== false, showProgressMetric: true, helpRequired: true },
  performance: { targetFps: source.performance?.targetFps || 60, pauseWhenHidden: true, maxTargetDpr: 3 },
};
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(path.resolve(output), `${JSON.stringify(skeleton, null, 2)}\n`);
console.log(`Wrote custom-loop v2 skeleton: ${path.resolve(output)}`);
console.log('Review every TODO. Gameplay semantics are intentionally not inferred.');
