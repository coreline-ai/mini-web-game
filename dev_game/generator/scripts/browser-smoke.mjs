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
  const server = spawn(npmCommand(), ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: projectDir,
    stdio: ['ignore', 'pipe', 'pipe'],
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
    server.kill('SIGTERM');
  }
}

function generateFixtures(spec) {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(tmpRoot, { recursive: true });
  const normal = path.join(tmpRoot, 'poop-dodge-browser');
  const noSfx = path.join(tmpRoot, 'poop-dodge-browser-no-sfx');
  run(process.execPath, [cli, '--force', '--spec', spec, '--out', normal]);
  run(process.execPath, [cli, '--force', '--no-sfx', '--spec', spec, '--out', noSfx]);
  return [normal, noSfx];
}

const args = parseArgs(process.argv.slice(2));
const projects = generateFixtures(args.spec);
try {
  for (let i = 0; i < projects.length; i += 1) await browserCheck(projects[i], args.startPort + i);
} finally {
  if (!args.keep) fs.rmSync(tmpRoot, { recursive: true, force: true });
}
