#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionGateProfile } from './lib/production-gate-profile.mjs';
import { writePassReceipt, invalidatePassReceipt, beginGateSnapshot, assertSnapshotUnchanged }
  from './lib/production-pass-receipt.mjs';
import { assertArgv, isMainModule } from './lib/cli-contract.mjs';
import { assertPreviewServesProject } from './lib/preview-identity.mjs';

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
  7. every schema v2 buildDecision: captured-state, clarity, hostile-input,
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

// `exited()`는 프리뷰 자식이 준비 전에 죽었는지 알려준다. 이 인자가 없던 판은 자식이 즉시
// 죽어도 20초를 기다린 뒤, **남의 서버가 응답하면 그대로 통과**했다(실측 2026-08-19).
async function waitForHttp(url, timeoutMs = 20000, exited = () => null) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const dead = exited();
    if (dead) {
      throw new Error(`preview server exited before it was ready (code ${dead.code}, signal ${dead.signal})\n`
        + `${dead.stderr ? `  ${dead.stderr.trim().split('\n').slice(-6).join('\n  ')}\n` : ''}`
        + '  포트가 이미 점유돼 있으면 --strictPort가 여기서 실패한다. 점유 프로세스를 끝낼 것.');
    }
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

export const CLI_CONTRACT_ID = 'factory:production-gate';

/**
 * 부팅 경로와 parity harness가 같은 함수를 쓴다. 공용 계약을 자기 파싱보다 먼저 부르므로
 * `--mode turbo` 같은 값은 여기서 막힌다. 부작용 없음 — 게이트를 실행하지 않는다.
 */
export function parseCliArgs(argv) {
  assertArgv(CLI_CONTRACT_ID, argv);
  return splitArgs(argv);
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
    if (a === '--help' || a === '-h') {
      // 부팅 경로는 splitArgs 전에 help를 처리하지만, parseCliArgs는 parity harness도 부른다.
      // 여기서 받지 않으면 계약은 `-h`를 허용하는데 leaf가 거부해 둘이 어긋난다(실측).
      continue;
    } else if (a === '--skip-foundation') {
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

// import만으로 게이트가 돌면 안 된다. parity harness는 이 모듈에서 parseCliArgs만 가져간다.
const isMain = isMainModule(import.meta.url);
if (isMain) {
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
    split = parseCliArgs(args);
  } catch (err) {
    console.error(err.message || err);
    usage();
    process.exit(1);
  }

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

  // ── 게이트 진입: 이전 판정을 지우고 "미검증" 상태로 내려놓는다 ──────────────
  // 순서가 중요하다. 이 블록은 **첫 게이트(factory:qa)보다 앞**이어야 한다. 뒤에 두었더니
  // foundation gate가 실패했을 때 지난 영수증이 그대로 남아 status가 pass를 보고했다.
  //
  // 그리고 영수증을 지우기만 하면 부족하다. 지우기만 하면 실패한 실행이 게임을 `unknown`으로
  // 되돌려 "게이트를 통과하지 못했다"는 사실이 "모른다"로 희석된다(legacy-pass가 있던 시절에는
  // 그보다 나빴다 — 영수증 없음이 allowlist 조회로 exit 0을 받았다).
  // 그래서 표식을 함께 남긴다. 성공한 실행만 마지막에 이 표식을 지우고 영수증을 쓴다.
  const notVerifiedMarker = path.join(projectDir, 'PRODUCTION-DEMO-NOT-VERIFIED.json');
  const invalidated = invalidatePassReceipt(projectDir);
  if (invalidated.removed) console.log(`Production-demo PASS receipt invalidated for this run: ${invalidated.file}`);
  fs.writeFileSync(notVerifiedMarker, `${JSON.stringify({
    reason: 'production gate is running; this marker is removed only when every gate passes',
    startedAt: new Date().toISOString(),
  }, null, 2)}\n`);

  if (split.skipFoundation) console.log('Foundation gate skipped: verified by an upstream CI job');
  else run(npmCommand(), ['run', 'factory:qa'], { cwd: workspaceRoot });

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
  // 의존성 설치·빌드 같은 허용된 준비가 끝난 뒤에 QA 시작 digest를 고정한다. 그보다 앞에서
  // 재면 node_modules 설치가 곧바로 drift로 잡힌다(제외 목록에 있지만 dist는 빌드가 만든다).
  const gateSnapshot = beginGateSnapshot(projectDir);
  const previewUrl = `http://127.0.0.1:${split.port}`;
  // stderr를 버리지 않는다. `stdio:'ignore'`였던 판은 --strictPort 바인딩 실패를 통째로 잃고,
  // 그 포트에 남아 있던 **다른 게임의 프리뷰**로 브라우저 게이트를 통과시켰다(실측 2026-08-19:
  // castle-archer·road-stream-racer가 last-light-zero-hour의 dist를 검사한 뒤 영수증을 받았다).
  let previewDead = null;
  let previewStderr = '';
  const preview = spawn(npmCommand(), ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(split.port), '--strictPort'], {
    cwd: projectDir, stdio: ['ignore', 'ignore', 'pipe'], detached: process.platform !== 'win32',
  });
  preview.stderr?.on('data', (chunk) => { previewStderr += String(chunk); });
  preview.on('exit', (code, signal) => { previewDead = { code, signal, stderr: previewStderr }; });
  // ── 왜 exit 훅인가 ────────────────────────────────────────────────────────
  // 위 `run()`은 실패 시 `process.exit()`을 부른다. 그 경로는 아래 try/finally를 **건너뛴다** —
  // 즉 브라우저 게이트가 하나라도 실패하면 이 프리뷰가 고아로 남는다. 실측(2026-08-19):
  // `--viewports 1x1`로 실패시킨 게이트가 4325에 vite를 남겼고, 그 유령이 다음 실행의 신원
  // 검증을 실패시켰다. 오염의 근원이 이것이다 — 검사가 아니라 **정리**가 빠져 있었다.
  //
  // 종료 경로가 몇 개든(정상 종료·process.exit·미포착 예외) 한 곳에서 정리한다.
  // 'exit' 핸들러에서는 비동기 작업이 실행되지 않으므로 동기 kill만 쓴다.
  const killPreviewGroup = () => {
    if (!preview || preview.exitCode !== null || previewDead) return;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
    else { try { process.kill(-preview.pid, 'SIGKILL'); } catch { try { preview.kill('SIGKILL'); } catch {} } }
  };
  process.on('exit', killPreviewGroup);
  try {
    await waitForHttp(previewUrl, 20000, () => previewDead);
    // 200이 돌아온다고 내 서버라는 뜻은 아니다. 서빙되는 dist가 이 프로젝트의 것인지 확인한다.
    await assertPreviewServesProject(previewUrl, projectDir);
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
  let gateProfile;
  try { gateProfile = productionGateProfile(spec, split.mode); }
  catch (error) { console.error(error.message); process.exit(1); }
  const customRequired = gateProfile === 'custom-loop-full';
  if (customRequired) run(process.execPath, [customLoopFullQa, '--project', projectDir, '--port', String(split.port + 10)], { cwd: workspaceRoot });

  // 여기까지 왔다는 것은 모든 게이트가 통과했다는 뜻이다. 다만 **QA가 본 것과 같은 상태인지**
  // 먼저 확인한다. QA 도중에 소스나 자산이 바뀌었다면 영수증을 쓰지 않는다.
  assertSnapshotUnchanged(gateSnapshot, 'production-gate 종료');
  fs.rmSync(notVerifiedMarker, { force: true });
  const pass = writePassReceipt(projectDir, { gateProfile, spec, verified: gateSnapshot });
  console.log(`Production-demo PASS receipt: ${pass.output}`);
}
