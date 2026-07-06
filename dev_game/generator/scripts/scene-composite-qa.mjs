#!/usr/bin/env node
// scene-composite-qa.mjs — rendered-scene art-direction gate.
//
// This catches issues that file-level image QA and bounds QA cannot see:
// - dark external link/tool-tip overlays captured on top of the game
// - button top highlight bars that look like broken gray slots
// - missing/too-small result stamp icons in GameOver
//
// It intentionally works on final browser screenshots after assets are loaded and
// re-composed, because production-demo quality is a scene-level property.

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatorRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(generatorRoot, '..');
const defaultTmpRoot = path.join(workspaceRoot, '.tmp', 'scene-composite-qa');

function usage() {
  console.log(`Usage:
  node generator/scripts/scene-composite-qa.mjs --project <generated-game-dir>
  node generator/scripts/scene-composite-qa.mjs --url <http-url>

Options:
  --project <dir>       Install/build/preview a generated project, then test it
  --url <url>           Test an already running URL
  --port <n>            Preview port when --project is used (default: 4195)
  --viewports <list>    Comma list like 390x844,430x932,1080x1920
  --keep-server         Keep preview server alive after QA
  --help                Show this help

This is not a layout-bounds gate. It inspects final screenshots for visual artifacts
that indicate bad image slicing/recomposition or browser/system overlays.`);
}

function parseArgs(argv) {
  const args = {
    port: 4195,
    viewports: [
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 1080, height: 1920 },
    ],
    keepServer: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--project') args.project = argv[++i];
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--port') args.port = Number(argv[++i]);
    else if (a === '--viewports') args.viewports = parseViewports(argv[++i]);
    else if (a === '--keep-server') args.keepServer = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.project && !args.url) throw new Error('Missing --project <dir> or --url <url>');
  if (args.project && args.url) throw new Error('Use only one of --project or --url');
  if (!Number.isInteger(args.port) || args.port < 1024) throw new Error('--port must be an integer >= 1024');
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

function npmCommand() { return process.platform === 'win32' ? 'npm.cmd' : 'npm'; }

function resolveProject(input) {
  const candidates = [
    path.resolve(process.cwd(), input),
    path.resolve(process.cwd(), '..', input),
    path.resolve(process.cwd(), 'generated', input),
    path.resolve(process.cwd(), '..', 'generated', input),
  ];
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
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
  try { return await import('playwright'); }
  catch (err) { throw new Error(`Playwright is required. Run: npm --prefix dev_game install\nOriginal error: ${err.message}`); }
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
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
    await wait(400);
    try { process.kill(-server.pid, 'SIGKILL'); } catch {}
  }
}

function viewportLabel(v) { return `${v.width}x${v.height}`; }

function withQaHoldLoading(url) {
  const next = new URL(url);
  next.searchParams.set('qaHoldLoading', '1');
  next.searchParams.set('sceneCompositeQa', String(Date.now()));
  return next.toString();
}

function normalizeBounds(raw) {
  if (!raw) return [];
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
    }))
    .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.width) && Number.isFinite(item.height));
}

async function clickRegistryItem(page, pattern) {
  const target = await page.evaluate((source) => {
    const re = new RegExp(source, 'i');
    const raw = globalThis.__GAME_LAYOUT_BOUNDS__;
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : raw && typeof raw === 'object' ? Object.values(raw) : [];
    const item = items.find((entry) => entry && entry.visible !== false && re.test(String(entry.id || entry.key || '')));
    if (!item) return null;
    const x = Number(item.x) + Number(item.width ?? item.w) / 2;
    const y = Number(item.y) + Number(item.height ?? item.h) / 2;
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }, pattern.source).catch(() => null);
  if (!target) return false;
  await page.mouse.click(target.x, target.y).catch(() => {});
  return true;
}

async function capture(page, phase, viewport, dir, records) {
  await page.waitForTimeout(220);
  const file = path.join(dir, `${viewportLabel(viewport)}-${phase}.png`);
  const layoutFile = path.join(dir, `${viewportLabel(viewport)}-${phase}.layout.json`);
  const raw = await page.evaluate(() => globalThis.__GAME_LAYOUT_BOUNDS__ ?? null).catch(() => null);
  const items = normalizeBounds(raw);
  await page.screenshot({ path: file, fullPage: false });
  fs.writeFileSync(layoutFile, JSON.stringify({ phase, viewport, scene: raw?.scene || '', items }, null, 2));
  records.push({ phase, viewport: viewportLabel(viewport), screenshot: file, layout: layoutFile });
}

async function exercise(page, viewport, url, dir, records) {
  await page.goto(withQaHoldLoading(url), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForFunction(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === 'Loading', null, { timeout: 10000 }).catch(() => {});
  await capture(page, 'loading', viewport, dir, records);
  await page.evaluate(() => { if (typeof globalThis.__RELEASE_LOADING__ === 'function') globalThis.__RELEASE_LOADING__(); }).catch(() => {});
  await page.waitForFunction(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(650);
  await capture(page, 'home', viewport, dir, records);
  const canvas = await page.locator('canvas').boundingBox();
  const clickedPlay = await clickRegistryItem(page, /play|start/);
  if (!clickedPlay && canvas) await page.mouse.click(canvas.x + canvas.width * 0.5, canvas.y + canvas.height * 0.68).catch(() => {});
  await page.waitForTimeout(1000);
  await capture(page, 'game', viewport, dir, records);
  const clickedPause = await clickRegistryItem(page, /pause/);
  if (!clickedPause && canvas) await page.mouse.click(canvas.x + canvas.width * 0.93, canvas.y + canvas.height * 0.08).catch(() => {});
  await page.waitForTimeout(500);
  await capture(page, 'pause', viewport, dir, records);
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
  await capture(page, 'gameover', viewport, dir, records);
}

function runPixelInspection(records) {
  const py = String.raw`
import sys, json, math
from pathlib import Path
from PIL import Image

records=json.load(sys.stdin)
errors=[]

def sat_luma(rgb):
    r,g,b=rgb[:3]
    mx=max(r,g,b); mn=min(r,g,b)
    sat=0 if mx==0 else (mx-mn)/mx
    luma=0.2126*r+0.7152*g+0.0722*b
    return sat,luma

def clamp_box(box, w, h):
    x=int(max(0, min(w-1, box.get('x',0))))
    y=int(max(0, min(h-1, box.get('y',0))))
    ww=int(max(1, min(w-x, box.get('width',0))))
    hh=int(max(1, min(h-y, box.get('height',0))))
    return x,y,ww,hh

def longest_run(mask_row):
    best=cur=0
    for v in mask_row:
        if v:
            cur+=1; best=max(best,cur)
        else:
            cur=0
    return best

for rec in records:
    img=Image.open(rec['screenshot']).convert('RGB')
    W,H=img.size
    layout=json.load(open(rec['layout']))
    items=[i for i in layout.get('items',[]) if i.get('visible', True)]
    phase=rec['phase']; vp=rec['viewport']

    # External/browser tooltip overlay: dark rectangular label with bright text at upper-left.
    if phase in ('home','game','pause','gameover'):
        crop=img.crop((0,0,W,min(H,int(H*0.18))))
        pix=crop.load(); cw,ch=crop.size
        # search only upper-left half to avoid normal title art.
        for y0 in range(0, max(1,ch-24), 4):
            for x0 in range(0, max(1,min(cw//2, cw-80)), 4):
                x1=min(cw, x0+260); y1=min(ch, y0+54)
                if x1-x0 < 90 or y1-y0 < 24: continue
                total=(x1-x0)*(y1-y0)
                dark=bright=0
                for yy in range(y0,y1,2):
                    for xx in range(x0,x1,2):
                        r,g,b=pix[xx,yy]
                        if 18 <= r <= 90 and 18 <= g <= 90 and 18 <= b <= 90 and max(r,g,b)-min(r,g,b) < 24:
                            dark+=4
                        if r>205 and g>205 and b>205:
                            bright+=4
                if dark/total > 0.55 and bright/total > 0.015:
                    errors.append(f"{vp} {phase}: external dark tooltip/link overlay detected near top-left; close browser/system overlay before capture")
                    y0=ch; break
            else:
                continue
            break

    # Button surface hygiene: fail long gray/dark slot-like top bars.
    for it in items:
        iid=str(it.get('id','')).lower()
        if 'button' not in iid: continue
        x,y,w,h=clamp_box(it,W,H)
        if w < 70 or h < 28: continue
        top_h=max(6, int(h*0.38))
        inner_x0=x+int(w*0.08); inner_x1=x+w-int(w*0.08)
        if inner_x1 <= inner_x0: continue
        bad_rows=0
        for yy in range(y, min(y+top_h,H)):
            row=[]
            for xx in range(inner_x0, inner_x1):
                sat,luma=sat_luma(img.getpixel((xx,yy)))
                # gray slot: low saturation but not pure black/white, usually an imported highlight artifact.
                row.append(sat < 0.24 and 48 < luma < 205)
            if longest_run(row) > 0.58*(inner_x1-inner_x0):
                bad_rows += 1
        if bad_rows >= max(4, int(h*0.07)):
            errors.append(f"{vp} {phase}: {it.get('id')} has a long low-saturation top bar that reads as a broken button highlight")

    # Result stamp must be visibly present and not tiny in GameOver.
    if phase == 'gameover':
        stamps=[i for i in items if any(tok in str(i.get('id','')).lower() for tok in ('stamp','result','icon'))]
        for st in stamps:
            x,y,w,h=clamp_box(st,W,H)
            if min(w,h) < max(28, min(W,H)*0.055):
                errors.append(f"{vp} gameover: {st.get('id')} is too small to read as a result icon ({w}x{h}px)")

if errors:
    print('\n'.join(errors))
    sys.exit(1)
print('scene-composite pixel inspection OK')
`;
  const r = spawnSync('python3', ['-c', py], { input: JSON.stringify(records), encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) {
    const msg = (r.stdout || r.stderr || '').trim();
    if (/scene-composite pixel inspection OK/i.test(msg)) return msg;
    throw new Error(msg || 'scene-composite pixel inspection failed');
  }
  return r.stdout.trim();
}

async function runBrowser(url, args, projectName) {
  const { chromium } = await importPlaywright();
  const screenshotDir = path.join(defaultTmpRoot, projectName || 'url');
  fs.rmSync(screenshotDir, { recursive: true, force: true });
  fs.mkdirSync(screenshotDir, { recursive: true });
  const records = [];
  const browserErrors = [];

  for (const viewport of args.viewports) {
    let browser;
    try {
      browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
      const page = await browser.newPage({ viewport, isMobile: viewport.width <= 600, deviceScaleFactor: viewport.width >= 1000 ? 1 : 2 });
      page.on('pageerror', (err) => browserErrors.push(`${viewportLabel(viewport)} pageerror: ${err.message}`));
      page.on('console', (msg) => { if (msg.type() === 'error') browserErrors.push(`${viewportLabel(viewport)} console:error: ${msg.text()}`); });
      await exercise(page, viewport, url, screenshotDir, records);
      await page.close().catch(() => {});
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }

  if (browserErrors.length) throw new Error(browserErrors.join('\n'));
  const pixelResult = runPixelInspection(records);
  return { screenshotDir, pixelResult };
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
    const { screenshotDir, pixelResult } = await runBrowser(url, args, projectName);
    console.log(`Scene composite QA OK: ${url}`);
    console.log(pixelResult);
    console.log(`Screenshots: ${screenshotDir}`);
  } finally {
    if (!args.keepServer) await stopPreview(preview?.server);
  }
} catch (err) {
  console.error(`Scene composite QA failed: ${err.message || err}`);
  usage();
  process.exit(1);
}
