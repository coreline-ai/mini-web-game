#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets/qa/background-continuity');
const urlIndex = process.argv.indexOf('--url');
const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5195';

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const configured = process.env.CODEX_WORKSPACE_NODE_MODULES;
  const candidates = [
    configured && path.join(configured, 'playwright/index.mjs'),
    path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { return await import(pathToFileURL(candidate).href); } catch {}
  }
  throw new Error('Playwright not found.');
}

async function traverse(page, start, end, durationMs) {
  return page.evaluate(async ({ start, end, durationMs }) => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.enforceEncounterGate = () => {};
    scene.physics.pause();
    scene.cameras.main.stopFollow();
    const samples = [];
    let nextSample = 0;
    await new Promise((resolve) => {
      const started = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - started) / durationMs);
        const x = start + (end - start) * t;
        scene.core.player.x = x;
        scene.cameras.main.scrollX = Math.max(0, x - 440);
        scene.updatePresentation(scene.time.now + t * durationMs);
        if (t >= nextSample || t === 1) {
          const background = scene.backgroundSystem.snapshot();
          samples.push({ t: Number(t.toFixed(3)), x: Math.round(x), blend: [...background.blend], compositionMode: background.compositionMode, structuralTileSprites: background.structuralTileSprites });
          nextSample += 0.05;
        }
        if (t < 1) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
    return samples;
  }, { start, end, durationMs });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const videoDir = path.join(OUT, '.video');
  await fs.mkdir(videoDir, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:error: ${message.text()}`); });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home');
  const canvas = await page.locator('canvas').boundingBox();
  const homePlay = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(homePlay.x, homePlay.y);
  await page.waitForFunction(() => window.__IRON_COURIER_DEBUG__?.get && window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game');
  const samples = {
    harborToYard: await traverse(page, 5700, 6100, 5000),
    yardToArena: await traverse(page, 10800, 11200, 5000),
  };
  const video = page.video();
  await page.close();
  await context.close();
  const sourceVideo = await video.path();
  const targetVideo = path.join(OUT, 'background-continuity-after.webm');
  await fs.copyFile(sourceVideo, targetVideo);
  await browser.close();

  const failures = [];
  for (const [name, series] of Object.entries(samples)) {
    for (const sample of series) {
      const sum = sample.blend.reduce((total, value) => total + value, 0);
      if (Math.abs(sum - 1) > 0.01) failures.push(`${name} x=${sample.x}: weights sum ${sum}`);
      if (sample.compositionMode !== 'sharp-far-only' || sample.structuralTileSprites !== 0) failures.push(`${name} x=${sample.x}: invalid background composition ${sample.compositionMode}/${sample.structuralTileSprites}`);
    }
    const maxDelta = series.slice(1).reduce((max, sample, index) => Math.max(max, ...sample.blend.map((value, layer) => Math.abs(value - series[index].blend[layer]))), 0);
    if (maxDelta > 0.12) failures.push(`${name}: blend delta ${maxDelta} exceeds 0.12`);
  }
  if (errors.length) failures.push(...errors);
  const report = { generatedAt: new Date().toISOString(), baseUrl, viewport: '1280x720', durationPerBoundaryMs: 5000, samples, errors, failures, video: path.relative(ROOT, targetVideo), ok: failures.length === 0 };
  await fs.writeFile(path.join(OUT, 'background-continuity.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, video: report.video, samples: Object.values(samples).reduce((sum, list) => sum + list.length, 0), failures }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
