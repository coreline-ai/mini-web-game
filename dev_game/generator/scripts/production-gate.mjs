#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..', '..');
const productionDemoQa = path.join(__dirname, 'production-demo-qa.mjs');
const visualLayoutQa = path.join(__dirname, 'visual-layout-qa.mjs');
const imageQualityQa = path.join(__dirname, 'image-quality-qa.mjs');
const sceneCompositeQa = path.join(__dirname, 'scene-composite-qa.mjs');
const distRuntimeQa = path.join(__dirname, 'dist-runtime-qa.mjs');

function usage() {
  console.log(`Usage:
  npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id>
  npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --port 4325

Runs:
  1. factory:qa foundation gate
  2. project build + dist-runtime-qa manifest/file/SHA/budget gate (assetLayout rollout marker only)
  3. production-demo-qa asset/docs/manifest contract gate
  4. image-quality-qa role-aware pixel/alpha gate
  5. visual-layout-qa browser overlap/safe-area gate
  6. scene-composite-qa rendered art-direction gate

Selected options are routed to the gate that understands them:
  --skip-foundation -> skip factory:qa when CI already ran it as an upstream job
  --require-gpt-imagegen/--require-imagegen-skill -> production-demo-qa only
  --port/--viewports/--safe-margin/--aspect-tolerance -> browser visual gates`);
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) process.exit(result.status || 1);
}

function splitArgs(argv) {
  const productionArgs = [];
  const visualArgs = [];
  const sceneArgs = [];
  let skipFoundation = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--skip-foundation') {
      skipFoundation = true;
    } else if (a === '--project') {
      const value = argv[++i];
      productionArgs.push(a, value);
      visualArgs.push(a, value);
      sceneArgs.push(a, value);
    } else if (a === '--min-stage-backgrounds') {
      productionArgs.push(a, argv[++i]);
    } else if (a === '--allow-svg-backgrounds') {
      productionArgs.push(a);
    } else if (a === '--require-gpt-imagegen' || a === '--require-imagegen-skill') {
      productionArgs.push(a);
    } else if (a === '--port') {
      const value = argv[++i];
      visualArgs.push(a, value);
      // Keep scene-composite on a neighboring port so both gates can be run independently.
      const n = Number(value);
      sceneArgs.push(a, Number.isFinite(n) ? String(n + 1) : value);
    } else if (a === '--viewports') {
      const value = argv[++i];
      visualArgs.push(a, value);
      sceneArgs.push(a, value);
    } else if (['--safe-margin', '--aspect-tolerance'].includes(a)) {
      visualArgs.push(a, argv[++i]);
    } else if (a === '--allow-missing-registry' || a === '--keep-server') {
      visualArgs.push(a);
    } else {
      throw new Error(`Unknown production-gate argument: ${a}`);
    }
  }
  return { productionArgs, visualArgs, sceneArgs, skipFoundation };
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(0);
}
if (!args.includes('--project')) {
  console.error('Missing required --project <generated-game-dir>');
  usage();
  process.exit(1);
}

let split;
try {
  split = splitArgs(args);
} catch (err) {
  console.error(err.message || err);
  usage();
  process.exit(1);
}

if (split.skipFoundation) console.log('Foundation gate skipped: verified by an upstream CI job');
else run(npmCommand(), ['run', 'factory:qa'], { cwd: workspaceRoot });
const projectArg = split.productionArgs[split.productionArgs.indexOf('--project') + 1];
const projectCandidates = [
  path.resolve(process.cwd(), projectArg),
  path.resolve(workspaceRoot, projectArg),
  path.resolve(workspaceRoot, '..', projectArg),
];
const projectDir = projectCandidates.find((candidate) => {
  try { return fs.statSync(candidate).isDirectory(); } catch { return false; }
});
if (!projectDir) throw new Error(`Project directory not found: ${projectArg}`);
const projectManifest = path.join(projectDir, 'assets', 'asset-manifest.json');
const runtimeDeliveryEnabled = fs.existsSync(projectManifest)
  && Boolean(JSON.parse(fs.readFileSync(projectManifest, 'utf8')).assetLayout);
if (runtimeDeliveryEnabled) {
  run(npmCommand(), ['run', 'build'], { cwd: projectDir });
  run(process.execPath, [distRuntimeQa, '--project', projectDir], { cwd: workspaceRoot });
} else {
  console.log('Runtime delivery gate skipped: legacy manifest has no assetLayout rollout marker');
}
// imagegen 스킬 provenance는 상시 강제 (임의/API/절차적 생성 금지 정책)
const prodArgs = split.productionArgs.includes('--require-gpt-imagegen')
  ? split.productionArgs
  : [...split.productionArgs, '--require-gpt-imagegen'];
run(process.execPath, [productionDemoQa, ...prodArgs], { cwd: workspaceRoot });
// 본 게임(똥 피하기) 기준 픽셀 레벨 품질 게이트 (해상도/색수/디테일/placeholder 차단)
const projIdx = split.productionArgs.indexOf('--project');
run(process.execPath, [imageQualityQa, '--project', split.productionArgs[projIdx + 1]], { cwd: workspaceRoot });
run(process.execPath, [visualLayoutQa, ...split.visualArgs], { cwd: workspaceRoot });
run(process.execPath, [sceneCompositeQa, ...split.sceneArgs], { cwd: workspaceRoot });
