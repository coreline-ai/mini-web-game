#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets/qa/dpr');
const index = process.argv.indexOf('--url');
const baseUrl = index >= 0 ? process.argv[index + 1] : 'http://127.0.0.1:5195';

async function playwright() {
  try { return await import('playwright'); } catch {}
  const candidate = path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(candidate).href);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await playwright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3 });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home');
  const canvas = await page.locator('canvas').boundingBox();
  const homePlay = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(homePlay.x, homePlay.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game' && window.__IRON_COURIER_DEBUG__?.get);
  await page.waitForTimeout(500);
  const metrics = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const canvas = document.querySelector('canvas');
    const cssScaleX = canvas.getBoundingClientRect().width / scene.cameras.main.width;
    const cssScaleY = canvas.getBoundingClientRect().height / scene.cameras.main.height;
    const actors = [scene.core.player, scene.core.transport, ...scene.core.encounters.enemyGroup.getChildren().filter((item) => item.active), ...scene.core.rescues.group.getChildren().filter((item) => item.active)];
    return {
      devicePixelRatio: window.devicePixelRatio,
      cssScaleX, cssScaleY,
      logicalViewport: { width: scene.cameras.main.width, height: scene.cameras.main.height },
      placeholderTextures: scene.children.list.filter((item) => item.active && item.visible && item.texture?.key === '__WHITE').length,
      actors: actors.map((actor) => {
        const physicalWidth = actor.displayWidth * cssScaleX * window.devicePixelRatio;
        const physicalHeight = actor.displayHeight * cssScaleY * window.devicePixelRatio;
        return {
          type: actor.constructor.name, texture: actor.texture?.key, animation: actor.anims?.currentAnim?.key ?? null,
          sourceFrame: [actor.frame?.realWidth ?? 0, actor.frame?.realHeight ?? 0],
          physicalDisplay: [Number(physicalWidth.toFixed(1)), Number(physicalHeight.toFixed(1))],
          sourceToPhysicalRatio: Number(Math.min((actor.frame?.realWidth ?? 0) / Math.max(1, physicalWidth), (actor.frame?.realHeight ?? 0) / Math.max(1, physicalHeight)).toFixed(3)),
        };
      }),
    };
  });
  const screenshot = path.join(OUT, '844x390-dpr3-game.png');
  await page.screenshot({ path: screenshot });
  await browser.close();
  const failures = [];
  if (metrics.devicePixelRatio !== 3) failures.push(`devicePixelRatio=${metrics.devicePixelRatio}`);
  if (metrics.placeholderTextures !== 0) failures.push(`placeholderTextures=${metrics.placeholderTextures}`);
  for (const actor of metrics.actors) if (actor.sourceToPhysicalRatio < 0.8) failures.push(`${actor.type}/${actor.texture} source ratio ${actor.sourceToPhysicalRatio} < 0.8`);
  if (browserErrors.length) failures.push(...browserErrors);
  const report = { generatedAt: new Date().toISOString(), baseUrl, viewport: '844x390', deviceScaleFactor: 3, ok: failures.length === 0, failures, browserErrors, metrics, screenshot: path.relative(ROOT, screenshot) };
  await fs.writeFile(path.join(OUT, 'dpr3-asset-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, actors: metrics.actors.length, minimumSourceRatio: Math.min(...metrics.actors.map((actor) => actor.sourceToPhysicalRatio)), failures, screenshot: report.screenshot }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
