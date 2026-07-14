#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

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

async function waitForServer(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`preview server did not become ready: ${url}`);
}

run(npm, ['run', 'build'], { cwd: projectDir });
const url = `http://127.0.0.1:${port}`;
const server = spawn(npm, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], { cwd: projectDir, stdio: 'inherit', detached: false });
try {
  await waitForServer(url);
  const common = ['--project', projectDir, '--url', url];
  run(process.execPath, [path.join(scriptsDir, 'captured-state-qa.mjs'), ...common]);
  run(process.execPath, [path.join(scriptsDir, 'first-play-clarity-qa.mjs'), ...common]);
  run(process.execPath, [path.join(scriptsDir, 'input-hostility-qa.mjs'), ...common]);
  run(process.execPath, [path.join(scriptsDir, 'session-continuity-qa.mjs'), ...common]);
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
  if (!server.killed) server.kill('SIGTERM');
}
