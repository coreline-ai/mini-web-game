#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatorRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(generatorRoot, '..');
const cli = path.join(generatorRoot, 'src/cli.mjs');
const defaultSpec = path.join(generatorRoot, 'examples/poop-dodge.spec.json');
const tmpRoot = path.join(workspaceRoot, '.tmp', 'browser-smoke');

function parseArgs(argv) {
  const args = { spec: defaultSpec, keep: false, startPort: 4175 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--keep') args.keep = true;
    else if (a === '--spec') args.spec = path.resolve(argv[++i]);
    else if (a === '--start-port') args.startPort = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`);
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function waitForHttp(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch (err) {
    throw new Error(`Playwright is required for browser smoke. Run: npm --prefix dev_game install\nOriginal error: ${err.message}`);
  }
}

async function browserCheck(projectDir, port) {
  run(npmCommand(), ['install', '--silent'], { cwd: projectDir });
  run(npmCommand(), ['run', 'build'], { cwd: projectDir });
  run(npmCommand(), ['run', 'qa:dist-runtime'], { cwd: projectDir });
  // detached: 자체 프로세스 그룹으로 분리해 npm→sh→vite→esbuild 트리 전체를 그룹 시그널로 종료할 수 있게 한다.
  // (npm만 kill하면 리눅스 CI에서 손자 프로세스가 살아남아 stdio 파이프를 물고 스크립트가 영원히 종료되지 않는다)
  const server = spawn(npmCommand(), ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: projectDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  let serverLog = '';
  server.stdout.on('data', (d) => { serverLog += d.toString(); });
  server.stderr.on('data', (d) => { serverLog += d.toString(); });
  try {
    const url = `http://127.0.0.1:${port}`;
    await waitForHttp(url);
    const { chromium } = await importPlaywright();
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (err) {
      throw new Error(`Chromium browser binary is required for browser smoke. Run: npx playwright install chromium\nOriginal error: ${err.message}`);
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console:error: ${msg.text()}`); });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(700);
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('canvas missing');
    await page.mouse.click(canvas.x + canvas.width * 0.5, canvas.y + canvas.height * 0.68);
    await page.waitForTimeout(900);
    if (errors.length) throw new Error(errors.join('\n'));
    await browser.close();
    console.log(`Browser smoke OK: ${projectDir}`);
  } catch (err) {
    console.error(serverLog);
    throw err;
  } finally {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
      await wait(500);
      try { process.kill(-server.pid, 'SIGKILL'); } catch {}
    }
  }
}

function generateFixtures(spec) {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(tmpRoot, { recursive: true });
  const normal = path.join(tmpRoot, 'poop-dodge-browser');
  const noSfx = path.join(tmpRoot, 'poop-dodge-browser-no-sfx');
  run(process.execPath, [cli, '--force', '--spec', spec, '--out', normal]);
  run(process.execPath, [cli, '--force', '--no-sfx', '--spec', spec, '--out', noSfx]);
  const dummy = path.join(normal, 'assets', '_source', 'source-only-dummy.txt');
  fs.mkdirSync(path.dirname(dummy), { recursive: true });
  fs.writeFileSync(dummy, 'must never be served or built\n');
  const manifestFile = path.join(normal, 'assets', 'asset-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  manifest.files ||= [];
  manifest.files.push({ id: 'source-only-dummy', type: 'source', path: 'assets/_source/source-only-dummy.txt', delivery: 'source' });
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return [normal, noSfx];
}

const args = parseArgs(process.argv.slice(2));
const projects = generateFixtures(args.spec);
let failed = false;
try {
  for (let i = 0; i < projects.length; i += 1) await browserCheck(projects[i], args.startPort + i);
} catch (err) {
  console.error(err.message || err);
  failed = true;
} finally {
  if (!args.keep) fs.rmSync(tmpRoot, { recursive: true, force: true });
}
// 명시적 종료: 살아남은 서버 파이프/핸들이 이벤트 루프를 붙잡아도 프로세스가 반드시 끝나게 한다 (CI 행 방지 이중 안전장치).
process.exit(failed ? 1 : 0);
