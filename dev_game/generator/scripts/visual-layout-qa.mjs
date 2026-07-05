#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatorRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(generatorRoot, '..');
const defaultTmpRoot = path.join(workspaceRoot, '.tmp', 'visual-layout-qa');

function usage() {
  console.log(`Usage:
  node generator/scripts/visual-layout-qa.mjs --project <generated-game-dir>
  node generator/scripts/visual-layout-qa.mjs --url <http-url>

Options:
  --project <dir>              Install/build/preview a generated project, then test it
  --url <url>                  Test an already running URL
  --port <n>                   Preview port when --project is used (default: 4185)
  --viewports <list>           Comma list like 390x844,430x932,1080x1920
  --safe-margin <px>           Minimum viewport margin (default: 8)
  --aspect-tolerance <ratio>    Max image aspect distortion before fail (default: 0.08)
  --allow-missing-registry     Do not fail when window.__GAME_LAYOUT_BOUNDS__ is missing
  --keep-server                Keep preview server alive after QA
  --help                       Show this help

The app must expose window.__GAME_LAYOUT_BOUNDS__ with visible UI bounds in CSS pixels
for overlap/safe-area inspection.`);
}

function parseArgs(argv) {
  const args = {
    port: 4185,
    viewports: [
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 1080, height: 1920 },
    ],
    safeMargin: 8,
    aspectTolerance: 0.08,
    allowMissingRegistry: false,
    keepServer: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--project') args.project = argv[++i];
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--port') args.port = Number(argv[++i]);
    else if (a === '--viewports') args.viewports = parseViewports(argv[++i]);
    else if (a === '--safe-margin') args.safeMargin = Number(argv[++i]);
    else if (a === '--aspect-tolerance') args.aspectTolerance = Number(argv[++i]);
    else if (a === '--allow-missing-registry') args.allowMissingRegistry = true;
    else if (a === '--keep-server') args.keepServer = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.project && !args.url) throw new Error('Missing --project <dir> or --url <url>');
  if (args.project && args.url) throw new Error('Use only one of --project or --url');
  if (!Number.isInteger(args.port) || args.port < 1024) throw new Error('--port must be an integer >= 1024');
  if (!Number.isFinite(args.safeMargin) || args.safeMargin < 0) throw new Error('--safe-margin must be >= 0');
  if (!Number.isFinite(args.aspectTolerance) || args.aspectTolerance < 0) throw new Error('--aspect-tolerance must be >= 0');
  return args;
}

function parseViewports(text) {
  const viewports = String(text || '').split(',').filter(Boolean).map((part) => {
    const match = part.trim().match(/^(\d+)x(\d+)$/i);
    if (!match) throw new Error(`Invalid viewport: ${part}`);
    return { width: Number(match[1]), height: Number(match[2]) };
  });
  if (!viewports.length) throw new Error('--viewports must contain at least one viewport');
  return viewports;
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function resolveProject(input) {
  const candidates = [
    path.resolve(process.cwd(), input),
    path.resolve(process.cwd(), '..', input),
    path.resolve(process.cwd(), 'generated', input),
    path.resolve(process.cwd(), '..', 'generated', input),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
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
    throw new Error(`Playwright is required. Run: npm --prefix dev_game install\nOriginal error: ${err.message}`);
  }
}

function startPreview(projectDir, port) {
  run(npmCommand(), ['install', '--silent'], { cwd: projectDir });
  run(npmCommand(), ['run', 'build'], { cwd: projectDir });
  const server = spawn(npmCommand(), ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: projectDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  let log = '';
  server.stdout.on('data', (d) => { log += d.toString(); });
  server.stderr.on('data', (d) => { log += d.toString(); });
  return { server, log: () => log };
}

async function stopPreview(server) {
  if (!server) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
    await wait(400);
    try { process.kill(-server.pid, 'SIGKILL'); } catch {}
  }
}

function viewportLabel(viewport) {
  return `${viewport.width}x${viewport.height}`;
}

function withQaHoldLoading(url) {
  const next = new URL(url);
  next.searchParams.set('qaHoldLoading', '1');
  return next.toString();
}

function normalizeBounds(raw) {
  if (!raw) return null;
  const source = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : Object.values(raw);
  return source
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || item.key || `item-${index}`),
      scene: item.scene ? String(item.scene) : '',
      x: Number(item.x),
      y: Number(item.y),
      width: Number(item.width ?? item.w),
      height: Number(item.height ?? item.h),
      visible: item.visible !== false,
      allowOverlap: item.allowOverlap === true,
      allowStretch: item.allowStretch === true,
      allowOverlapWith: Array.isArray(item.allowOverlapWith) ? item.allowOverlapWith.map(String) : [],
      mustBeInside: item.mustBeInside ? String(item.mustBeInside) : '',
      innerPadding: Number(item.innerPadding || 0),
      textureKey: item.textureKey ? String(item.textureKey) : '',
      naturalAspect: Number(item.naturalAspect),
      displayAspect: Number(item.displayAspect),
      aspectDelta: Number(item.aspectDelta),
    }))
    .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.width) && Number.isFinite(item.height));
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function overlapAllowed(a, b) {
  if (a.allowOverlap === true || b.allowOverlap === true) return true;
  if (a.allowOverlapWith?.includes(b.id) || b.allowOverlapWith?.includes(a.id)) return true;
  return false;
}

function containsWithPadding(container, item, padding = 0) {
  return item.x >= container.x + padding
    && item.y >= container.y + padding
    && item.x + item.width <= container.x + container.width - padding
    && item.y + item.height <= container.y + container.height - padding;
}

async function inspectCurrentPage(page, phase, viewport, args, screenshotDir, errors) {
  await page.waitForTimeout(300);
  const canvas = await page.locator('canvas').boundingBox().catch(() => null);
  if (!canvas) {
    errors.push(`${viewportLabel(viewport)} ${phase}: canvas missing`);
    return;
  }
  const centerDx = Math.abs((canvas.x + canvas.width / 2) - viewport.width / 2);
  const centerDy = Math.abs((canvas.y + canvas.height / 2) - viewport.height / 2);
  if (centerDx > 4) errors.push(`${viewportLabel(viewport)} ${phase}: canvas is not horizontally centered (dx=${centerDx.toFixed(1)}px)`);
  if (centerDy > 4) errors.push(`${viewportLabel(viewport)} ${phase}: canvas is not vertically centered (dy=${centerDy.toFixed(1)}px)`);
  if (canvas.x < -1 || canvas.y < -1 || canvas.x + canvas.width > viewport.width + 1 || canvas.y + canvas.height > viewport.height + 1) {
    errors.push(`${viewportLabel(viewport)} ${phase}: canvas clips outside viewport ${JSON.stringify(canvas)}`);
  }

  const rawBounds = await page.evaluate(() => globalThis.__GAME_LAYOUT_BOUNDS__ ?? null).catch(() => null);
  const registryScene = rawBounds?.scene ? String(rawBounds.scene) : '';
  const expectedScenes = { loading: 'Loading', home: 'Home', game: 'Game', pause: 'Pause', gameover: 'GameOver' };
  if (expectedScenes[phase] && registryScene && registryScene !== expectedScenes[phase]) {
    errors.push(`${viewportLabel(viewport)} ${phase}: expected registry scene ${expectedScenes[phase]}, got ${registryScene}`);
  }
  const bounds = normalizeBounds(rawBounds);
  if (!bounds || bounds.length === 0) {
    if (!args.allowMissingRegistry) errors.push(`${viewportLabel(viewport)} ${phase}: window.__GAME_LAYOUT_BOUNDS__ missing or empty`);
  } else {
    const visible = bounds.filter((item) => item.visible && item.width > 0 && item.height > 0);
    for (const item of visible) {
      if (item.x < args.safeMargin) errors.push(`${viewportLabel(viewport)} ${phase}: ${item.id} too close/outside left (${item.x.toFixed(1)}px)`);
      if (item.y < args.safeMargin) errors.push(`${viewportLabel(viewport)} ${phase}: ${item.id} too close/outside top (${item.y.toFixed(1)}px)`);
      if (item.x + item.width > viewport.width - args.safeMargin) errors.push(`${viewportLabel(viewport)} ${phase}: ${item.id} too close/outside right (${(item.x + item.width).toFixed(1)}px > ${viewport.width - args.safeMargin})`);
      if (item.y + item.height > viewport.height - args.safeMargin) errors.push(`${viewportLabel(viewport)} ${phase}: ${item.id} too close/outside bottom (${(item.y + item.height).toFixed(1)}px > ${viewport.height - args.safeMargin})`);
    }
    for (const item of visible) {
      if (!item.allowStretch && Number.isFinite(item.aspectDelta) && item.aspectDelta > args.aspectTolerance) {
        errors.push(`${viewportLabel(viewport)} ${phase}: ${item.id} texture aspect distorted (${item.textureKey || 'image'} delta=${item.aspectDelta.toFixed(3)} > ${args.aspectTolerance})`);
      }
    }
    const byId = new Map(visible.map((item) => [item.id, item]));
    for (const item of visible) {
      if (item.mustBeInside) {
        const container = byId.get(item.mustBeInside);
        if (!container) {
          errors.push(`${viewportLabel(viewport)} ${phase}: ${item.id} must be inside missing container ${item.mustBeInside}`);
        } else if (!containsWithPadding(container, item, item.innerPadding || 0)) {
          errors.push(`${viewportLabel(viewport)} ${phase}: ${item.id} is not contained inside ${container.id} with padding ${item.innerPadding || 0}`);
        }
      }
    }
    for (let i = 0; i < visible.length; i += 1) {
      for (let j = i + 1; j < visible.length; j += 1) {
        const a = visible[i];
        const b = visible[j];
        if (!overlapAllowed(a, b) && intersects(a, b)) {
          errors.push(`${viewportLabel(viewport)} ${phase}: layout overlap ${a.id} ↔ ${b.id}`);
        }
      }
    }
  }

  if (screenshotDir) {
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, `${viewportLabel(viewport)}-${phase}.png`), fullPage: false }).catch(() => {});
  }
}


async function clickRegistryItem(page, pattern, viewport, phase) {
  const target = await page.evaluate((source) => {
    const re = new RegExp(source, 'i');
    const raw = globalThis.__GAME_LAYOUT_BOUNDS__;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : raw && typeof raw === 'object' ? Object.values(raw) : [];
    const item = items.find((entry) => entry && entry.visible !== false && re.test(String(entry.id || entry.key || '')));
    if (!item) return null;
    const x = Number(item.x) + Number(item.width ?? item.w) / 2;
    const y = Number(item.y) + Number(item.height ?? item.h) / 2;
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y, id: String(item.id || item.key || '') } : null;
  }, pattern.source).catch(() => null);
  if (!target) return false;
  await page.mouse.click(target.x, target.y).catch(() => {});
  return true;
}

async function exerciseFlow(page, viewport, args, screenshotDir, errors) {
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForFunction(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === 'Loading', null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(180);
  await inspectCurrentPage(page, 'loading', viewport, args, screenshotDir, errors);
  await page.evaluate(() => { if (typeof globalThis.__RELEASE_LOADING__ === 'function') globalThis.__RELEASE_LOADING__(); }).catch(() => {});
  await page.waitForFunction(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(700);
  await inspectCurrentPage(page, 'home', viewport, args, screenshotDir, errors);
  const canvas = await page.locator('canvas').boundingBox();
  if (!canvas) return;
  const clickedPlay = await clickRegistryItem(page, /play|start/, viewport, 'home');
  if (!clickedPlay) await page.mouse.click(canvas.x + canvas.width * 0.5, canvas.y + canvas.height * 0.68).catch(() => {});
  await page.waitForTimeout(800);
  await inspectCurrentPage(page, 'game', viewport, args, screenshotDir, errors);
  const clickedPause = await clickRegistryItem(page, /pause/, viewport, 'game');
  if (!clickedPause) await page.mouse.click(canvas.x + canvas.width * 0.93, canvas.y + canvas.height * 0.06).catch(() => {});
  await page.waitForTimeout(500);
  await inspectCurrentPage(page, 'pause', viewport, args, screenshotDir, errors);
  await page.evaluate(() => {
    const game = globalThis.__GAME__;
    if (game?.scene) {
      game.scene.stop('Pause');
      game.scene.stop('Game');
      game.scene.start('GameOver', { score: 12345, sorted: 24, wrong: 1, missed: 2, bestCombo: 14 });
    }
  }).catch(() => {});
  await page.waitForFunction(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === 'GameOver', null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await inspectCurrentPage(page, 'gameover', viewport, args, screenshotDir, errors);
}

async function runBrowserQa(url, args, projectName) {
  const { chromium } = await importPlaywright();
  const errors = [];
  const screenshotDir = path.join(defaultTmpRoot, projectName || 'url');
  fs.rmSync(screenshotDir, { recursive: true, force: true });

  for (const viewport of args.viewports) {
    let lastErr = null;
    let completed = false;
    for (let attempt = 1; attempt <= 2 && !completed; attempt += 1) {
      let browser;
      let page;
      try {
        browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
        page = await browser.newPage({ viewport, isMobile: viewport.width <= 600, deviceScaleFactor: viewport.width >= 1000 ? 1 : 2 });
        page.on('pageerror', (err) => errors.push(`${viewportLabel(viewport)} pageerror: ${err.message}`));
        page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`${viewportLabel(viewport)} console:error: ${msg.text()}`); });
        await page.goto(withQaHoldLoading(url), { waitUntil: 'domcontentloaded' });
        await exerciseFlow(page, viewport, args, screenshotDir, errors);
        completed = true;
      } catch (err) {
        lastErr = err;
        const retryable = /Target page, context or browser has been closed|browser has been closed|Browser closed/i.test(String(err?.message || err));
        if (!retryable || attempt === 2) {
          errors.push(`${viewportLabel(viewport)} browser-flow: ${err.message || err}`);
        } else {
          await wait(500);
        }
      } finally {
        if (page) await page.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
      }
    }
    if (!completed && !lastErr) errors.push(`${viewportLabel(viewport)} browser-flow: unknown browser failure`);
  }
  return { errors, screenshotDir };
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }

  let projectDir = null;
  let preview = null;
  let url = args.url;
  if (args.project) {
    projectDir = resolveProject(args.project);
    preview = startPreview(projectDir, args.port);
    url = `http://127.0.0.1:${args.port}`;
  }

  try {
    await waitForHttp(url);
    const projectName = projectDir ? path.basename(projectDir) : new URL(url).host.replace(/[^a-z0-9._-]+/gi, '-');
    const { errors, screenshotDir } = await runBrowserQa(url, args, projectName);
    if (errors.length) {
      console.error(`Visual layout QA failed: ${url}`);
      for (const err of errors) console.error(`- ${err}`);
      console.error(`Screenshots: ${screenshotDir}`);
      if (preview) console.error(preview.log());
      process.exit(1);
    }
    console.log(`Visual layout QA OK: ${url}`);
    console.log(`Screenshots: ${screenshotDir}`);
  } finally {
    if (!args.keepServer) await stopPreview(preview?.server);
  }
} catch (err) {
  console.error(err.message || err);
  usage();
  process.exit(1);
}
