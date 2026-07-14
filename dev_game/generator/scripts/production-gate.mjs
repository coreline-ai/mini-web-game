#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
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
const customLoopFullQa = path.join(__dirname, 'custom-loop-full-qa.mjs');

function usage() {
  console.log(`Usage:
  npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id>
  npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --port 4325
  npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --mode custom-loop-full

Runs:
  1. factory:qa foundation gate
  2. project build + dist-runtime-qa manifest/file/SHA/budget gate (assetLayout rollout marker only)
  3. production-demo-qa asset/docs/manifest contract gate
  4. image-quality-qa role-aware pixel/alpha gate
  5. visual-layout-qa browser overlap/safe-area gate
  6. scene-composite-qa rendered art-direction gate
  7. schema v2/custom-loop only: captured-state, clarity, hostile-input,
     session/long-run, docs-runtime, HQ and qa-session-report gates

Selected options are routed to the gate that understands them:
  --skip-foundation -> skip factory:qa when CI already ran it as an upstream job
  --require-gpt-imagegen/--require-imagegen-skill -> production-demo-qa only
  --mode compatibility|custom-loop-full -> explicit gate profile (v2 auto-selects custom-loop-full)
  --port/--viewports/--safe-margin/--aspect-tolerance -> browser visual gates`);
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) process.exit(result.status || 1);
}

// Run large viewport matrices one child at a time so high-resolution textures
// do not make parallel Chromium processes compete for the same memory budget.
function splitViewportRuns(gateArgs) {
  const index = gateArgs.indexOf('--viewports');
  if (index < 0) return [gateArgs];
  const values = String(gateArgs[index + 1] || '').split(',').map((value) => value.trim()).filter(Boolean)
    .sort((a, b) => {
      const area = (value) => { const [w, h] = value.toLowerCase().split('x').map(Number); return (w || 0) * (h || 0); };
      return area(b) - area(a);
    });
  if (values.length <= 1) return [gateArgs];
  return values.map((value) => { const next = [...gateArgs]; next[index + 1] = value; return next; });
}

function browserArgsForUrl(gateArgs, url) {
  const next = [];
  for (let i = 0; i < gateArgs.length; i += 1) {
    if (gateArgs[i] === '--project' || gateArgs[i] === '--port') { i += 1; continue; }
    next.push(gateArgs[i]);
  }
  return ['--url', url, ...next];
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function waitForHttp(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await wait(250);
  }
  throw new Error(`Timed out waiting for production preview: ${url}`);
}

async function stopPreview(server) {
  if (!server) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
    await wait(400);
    try { process.kill(-server.pid, 'SIGKILL'); } catch {}
  }
}

function splitArgs(argv) {
  const productionArgs = [];
  const visualArgs = [];
  const sceneArgs = [];
  let skipFoundation = false;
  let mode = 'auto';
  let port = 4325;
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
      port = Number(value);
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
    } else if (a === '--mode') {
      mode = argv[++i];
      if (!['compatibility', 'custom-loop-full'].includes(mode)) throw new Error('--mode must be compatibility|custom-loop-full');
    } else {
      throw new Error(`Unknown production-gate argument: ${a}`);
    }
  }
  return { productionArgs, visualArgs, sceneArgs, skipFoundation, mode, port };
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

// Build once and serve once so every viewport gate observes the same immutable
// preview and does not repeatedly decode the project's high-resolution assets.
run(npmCommand(), ['install', '--silent'], { cwd: projectDir });
run(npmCommand(), ['run', 'build'], { cwd: projectDir });
const previewUrl = `http://127.0.0.1:${split.port}`;
const preview = spawn(npmCommand(), ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(split.port), '--strictPort'], {
  cwd: projectDir, stdio: 'ignore', detached: process.platform !== 'win32',
});
try {
  await waitForHttp(previewUrl);
  const visualRuns = splitViewportRuns(browserArgsForUrl(split.visualArgs, previewUrl));
  const sceneRuns = splitViewportRuns(browserArgsForUrl(split.sceneArgs, previewUrl));
  for (let index = 0; index < Math.max(visualRuns.length, sceneRuns.length); index += 1) {
    if (visualRuns[index]) run(process.execPath, [visualLayoutQa, ...visualRuns[index]], { cwd: workspaceRoot });
    await wait(600);
    if (sceneRuns[index]) run(process.execPath, [sceneCompositeQa, ...sceneRuns[index]], { cwd: workspaceRoot });
    await wait(900);
  }
} finally {
  await stopPreview(preview);
}

const specFile = path.join(projectDir, 'src/game/data/game-spec.json');
const spec = fs.existsSync(specFile) ? JSON.parse(fs.readFileSync(specFile, 'utf8')) : {};
if (spec.schemaVersion !== '2.0.0' && !spec.captureMatrix) {
  console.warn('Compatibility warning: schema v1 project has no captureMatrix; legacy visual gates remain active.');
}
if (split.mode === 'compatibility' && spec.schemaVersion === '2.0.0') {
  console.error('schema v2/custom-loop cannot use compatibility mode; custom-loop-full is required.');
  process.exit(1);
}
const customRequired = split.mode === 'custom-loop-full' || (spec.schemaVersion === '2.0.0' && spec.buildDecision === 'custom-loop');
if (customRequired) run(process.execPath, [customLoopFullQa, '--project', projectDir, '--port', String(split.port + 10)], { cwd: workspaceRoot });
