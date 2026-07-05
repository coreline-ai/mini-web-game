#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..', '..');
const productionDemoQa = path.join(__dirname, 'production-demo-qa.mjs');
const visualLayoutQa = path.join(__dirname, 'visual-layout-qa.mjs');
const imageQualityQa = path.join(__dirname, 'image-quality-qa.mjs');

function usage() {
  console.log(`Usage:
  npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id>
  npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --port 4325

Runs:
  1. factory:qa foundation gate
  2. production-demo-qa asset/docs/manifest contract gate
  3. visual-layout-qa browser overlap/safe-area gate

Selected options are routed to the gate that understands them:
  --require-gpt-imagegen/--require-imagegen-skill -> production-demo-qa only
  --port/--viewports/--safe-margin/--aspect-tolerance -> visual-layout-qa only`);
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
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project') {
      const value = argv[++i];
      productionArgs.push(a, value);
      visualArgs.push(a, value);
    } else if (a === '--min-stage-backgrounds') {
      productionArgs.push(a, argv[++i]);
    } else if (a === '--allow-svg-backgrounds') {
      productionArgs.push(a);
    } else if (a === '--require-gpt-imagegen' || a === '--require-imagegen-skill' || a === '--require-gpt-image2-skill' || a === '--require-gpt-image2') {
      productionArgs.push(a);
    } else if (['--port', '--viewports', '--safe-margin', '--aspect-tolerance'].includes(a)) {
      visualArgs.push(a, argv[++i]);
    } else if (a === '--allow-missing-registry' || a === '--keep-server') {
      visualArgs.push(a);
    } else {
      throw new Error(`Unknown production-gate argument: ${a}`);
    }
  }
  return { productionArgs, visualArgs };
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

run(npmCommand(), ['run', 'factory:qa'], { cwd: workspaceRoot });
// imagegen 스킬 provenance는 상시 강제 (임의/API/절차적 생성 금지 정책)
const prodArgs = split.productionArgs.includes('--require-gpt-imagegen')
  ? split.productionArgs
  : [...split.productionArgs, '--require-gpt-imagegen'];
run(process.execPath, [productionDemoQa, ...prodArgs], { cwd: workspaceRoot });
// 본 게임(똥 피하기) 기준 픽셀 레벨 품질 게이트 (해상도/색수/디테일/placeholder 차단)
const projIdx = split.productionArgs.indexOf('--project');
run(process.execPath, [imageQualityQa, '--project', split.productionArgs[projIdx + 1]], { cwd: workspaceRoot });
run(process.execPath, [visualLayoutQa, ...split.visualArgs], { cwd: workspaceRoot });
