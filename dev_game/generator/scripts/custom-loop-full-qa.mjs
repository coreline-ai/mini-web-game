#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { assertPreviewServesProject } from './lib/preview-identity.mjs';

const argv = process.argv.slice(2);
const projectArg = argv.includes('--project') ? argv[argv.indexOf('--project') + 1] : null;
const port = Number(argv.includes('--port') ? argv[argv.indexOf('--port') + 1] : 4395);
if (!projectArg) throw new Error('Required: --project <dir> [--port <n>]');
const candidates = [path.resolve(process.cwd(), projectArg), path.resolve(process.cwd(), '..', projectArg), path.resolve(process.cwd(), 'generated', projectArg)];
const projectDir = candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const startedAt = Date.now();

function run(cmd, args, options = {}) {
  console.log(`\n▶ ${path.basename(cmd)} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) throw new Error(`gate failed (${result.status}): ${cmd} ${args.join(' ')}`);
}

async function waitForServer(url, exited = () => null) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const dead = exited();
    if (dead) {
      throw new Error(`preview server exited before it was ready (code ${dead.code}, signal ${dead.signal})\n`
        + `${dead.stderr ? `  ${dead.stderr.trim().split('\n').slice(-6).join('\n  ')}\n` : ''}`
        + '  포트가 점유돼 있으면 --strictPort가 여기서 실패한다.');
    }
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`preview server did not become ready: ${url}`);
}

run(npm, ['run', 'build'], { cwd: projectDir });
const url = `http://127.0.0.1:${port}`;
// --strictPort가 없던 판은 포트가 점유되면 Vite가 **다음 포트로 물러나고**, QA는 원래 포트를
// 그대로 봤다 — 즉 남의 서버를 검사했다. 물러남을 허용하지 않고, 실패를 stderr로 관찰한다.
let serverDead = null;
let serverStderr = '';
const server = spawn(npm, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: projectDir, stdio: ['ignore', 'inherit', 'pipe'], detached: process.platform !== 'win32' });
server.stderr?.on('data', (chunk) => { serverStderr += String(chunk); process.stderr.write(chunk); });
server.on('exit', (code, signal) => { serverDead = { code, signal, stderr: serverStderr }; });
try {
  await waitForServer(url, () => serverDead);
  await assertPreviewServesProject(url, projectDir);
  const common = ['--project', projectDir, '--url', url];
  run(process.execPath, [path.join(scriptsDir, 'captured-state-qa.mjs'), ...common]);
  run(process.execPath, [path.join(scriptsDir, 'first-play-clarity-qa.mjs'), ...common]);
  run(process.execPath, [path.join(scriptsDir, 'input-hostility-qa.mjs'), ...common]);
  run(process.execPath, [path.join(scriptsDir, 'session-continuity-qa.mjs'), ...common]);

  // play-profile-qa는 **완료 게이트에 들어가지 않는다.** 자기 양성 대조에 실패했고(만들게 한
  // 결함을 되돌려 넣어도 RED가 되지 않았다) 아직 아무것도 잡은 적이 없는데, 매 실행마다
  // 2분(3프로파일 × 40초)을 쓴다. 잡은 적 없는 검사를 완료 판정에 넣으면 게이트가 아니라
  // 비용이다. 필요할 때 `factory:play-profile-qa`로 따로 돌린다 — 계약 클래스 O 참조.
  run(npm, ['run', 'test:rules'], { cwd: projectDir, env: { ...process.env, FIREBREAK_QA_URL: url, GAME_QA_URL: url } });
  run(npm, ['run', 'test:lifecycle'], { cwd: projectDir, env: { ...process.env, FIREBREAK_QA_URL: url, GAME_QA_URL: url } });
  run(process.execPath, [path.join(scriptsDir, 'docs-runtime-sync-qa.mjs'), '--project', projectDir]);
  run(process.execPath, [path.join(scriptsDir, 'image-quality-qa.mjs'), '--project', projectDir]);
  run(process.execPath, [path.join(scriptsDir, 'hq-screen-quality-qa.mjs'), '--project', projectDir]);
  run(process.execPath, [path.join(scriptsDir, 'qa-session-report.mjs'), '--project', projectDir, '--since', String(startedAt)]);
  console.log(`\nCustom-loop full QA OK: ${projectDir}`);
} catch (error) {
  const output = path.join(projectDir, 'qa-captures', 'gate-failure.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify({ ok: false, failedAt: new Date().toISOString(), startedAt: new Date(startedAt).toISOString(), error: error.message }, null, 2)}\n`);
  throw error;
} finally {
  // npm 래퍼만 죽이면 vite 자식이 살아남아 포트를 계속 잡는다 — 그 유령이 다음 게이트를
  // 오염시켰다(실측: 4325·4173에 전날 세션의 프리뷰가 남아 있었다). 프로세스 그룹을 끝낸다.
  if (!server.killed) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    else {
      try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
      await new Promise((resolve) => setTimeout(resolve, 400));
      try { process.kill(-server.pid, 'SIGKILL'); } catch {}
    }
  }
}
