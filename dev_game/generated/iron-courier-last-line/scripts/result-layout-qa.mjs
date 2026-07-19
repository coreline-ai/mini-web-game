#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'polish-10', 'result-layout');
const phaseIndex = process.argv.lastIndexOf('--phase');
const phase = phaseIndex >= 0 ? process.argv[phaseIndex + 1] : 'after';
const urlIndex = process.argv.indexOf('--url');
const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5195';
const VIEWPORTS = [
  { width: 568, height: 320 },
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
];

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

async function showResult(page) {
  await page.waitForFunction(() => window.__GAME__?.scene?.getScene('Home')?.scene?.isActive(), null, { timeout: 30000 });
  await page.evaluate(() => {
    window.__GAME__.scene.stop('Home');
    window.__GAME__.scene.start('GameOver', {
      score: 35013,
      rescued: 3,
      elapsed: 185.1,
      cleared: true,
      reason: '아이언 몰 파괴 · 항로 확보',
    });
  });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'GameOver', null, { timeout: 5000 });
  await page.waitForTimeout(180);
}

async function sample(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('GameOver');
    const layout = window.__GAME_LAYOUT_BOUNDS__;
    const liveCanvas = scene.scale?.canvasBounds ?? layout.canvas;
    const canvas = { x: liveCanvas.x, y: liveCanvas.y, width: liveCanvas.width, height: liveCanvas.height };
    const scaleX = canvas.width / scene.cameras.main.width;
    const scaleY = canvas.height / scene.cameras.main.height;
    const item = (id) => layout.items.find((candidate) => candidate.id === id);
    const panelObject = scene.children.list.find((object) => object.type === 'NineSlice' && object.texture?.key === 'ui-hud-frame');
    const panelBounds = panelObject.getBounds();
    const slices = panelObject.getData('_panelSlices') ?? { left: 104, right: 104, top: 72, bottom: 72 };
    const insetPadding = 8;
    const safeLogical = {
      left: panelBounds.left + slices.left * Math.abs(panelObject.scaleX) + insetPadding,
      right: panelBounds.right - slices.right * Math.abs(panelObject.scaleX) - insetPadding,
      top: panelBounds.top + slices.top * Math.abs(panelObject.scaleY) + insetPadding,
      bottom: panelBounds.bottom - slices.bottom * Math.abs(panelObject.scaleY) - insetPadding,
    };
    const safe = {
      x: canvas.x + safeLogical.left * scaleX,
      y: canvas.y + safeLogical.top * scaleY,
      width: (safeLogical.right - safeLogical.left) * scaleX,
      height: (safeLogical.bottom - safeLogical.top) * scaleY,
    };
    const margins = (entry) => ({
      left: entry.x - safe.x,
      right: safe.x + safe.width - (entry.x + entry.width),
      top: entry.y - safe.y,
      bottom: safe.y + safe.height - (entry.y + entry.height),
    });
    const contentIds = ['mission-title', 'mission-reason', 'summary-score', 'rescued-count', 'operation-time', 'retry-action', 'home-action'];
    const content = contentIds.map((id) => ({ id, bounds: item(id), margins: margins(item(id)) }));
    const icon = item('mission-icon');
    const title = item('mission-title');
    const reason = item('mission-reason');
    const background = item('result-background');
    const textObjects = scene.children.list.filter((object) => object.type === 'Text').map((object) => ({
      text: object.text,
      fontCssPx: Number.parseFloat(object.style.fontSize) * scaleY,
    }));
    return {
      canvas,
      logicalViewport: { width: scene.cameras.main.width, height: scene.cameras.main.height },
      panel: item('result-panel'),
      safe,
      content,
      iconTitleGap: title.y - (icon.y + icon.height),
      titleReasonGap: reason.y - (title.y + title.height),
      titleCenterDelta: Math.abs((title.x + title.width / 2) - (canvas.x + canvas.width / 2)),
      panelCenterDelta: Math.abs((item('result-panel').x + item('result-panel').width / 2) - (canvas.x + canvas.width / 2)),
      actionGap: item('home-action').x - (item('retry-action').x + item('retry-action').width),
      backgroundGap: {
        left: Math.max(0, background.x - canvas.x),
        right: Math.max(0, canvas.x + canvas.width - (background.x + background.width)),
        top: Math.max(0, background.y - canvas.y),
        bottom: Math.max(0, canvas.y + canvas.height - (background.y + background.height)),
      },
      targets: [item('retry-action'), item('home-action')].map((entry) => ({ id: entry.id, minCssDimension: entry.hitArea?.minCssDimension ?? Math.min(entry.width, entry.height) })),
      textObjects,
      clipped: layout.clipped,
      overlaps: layout.overlaps,
      containmentFailures: layout.containmentFailures ?? [],
    };
  });
}

function evaluate(metrics, label, browserErrors) {
  const failures = [];
  const warnings = [];
  if (metrics.clipped.length) failures.push(`${label}: clipping ${metrics.clipped.join(', ')}`);
  if (metrics.overlaps.length) failures.push(`${label}: overlap ${JSON.stringify(metrics.overlaps)}`);
  if (metrics.containmentFailures.length) failures.push(`${label}: registry containment ${JSON.stringify(metrics.containmentFailures)}`);
  if (metrics.panelCenterDelta > 1) failures.push(`${label}: panel not centered (${metrics.panelCenterDelta.toFixed(2)}px)`);
  if (metrics.titleCenterDelta > 1) failures.push(`${label}: title not centered (${metrics.titleCenterDelta.toFixed(2)}px)`);
  const backgroundGap = Math.max(...Object.values(metrics.backgroundGap));
  if (backgroundGap > 1) failures.push(`${label}: background gap ${JSON.stringify(metrics.backgroundGap)}`);
  for (const entry of metrics.content) {
    const overflow = Object.entries(entry.margins).filter(([, value]) => value < -0.5);
    if (overflow.length) failures.push(`${label}: ${entry.id} outside panel safe area ${JSON.stringify(entry.margins)}`);
    const near = Math.min(...Object.values(entry.margins));
    if (near >= -0.5 && near < 4) warnings.push(`${label}: ${entry.id} safe margin ${near.toFixed(2)}px`);
  }
  if (metrics.iconTitleGap < 8) failures.push(`${label}: icon/title gap ${metrics.iconTitleGap.toFixed(2)}px`);
  if (metrics.titleReasonGap < 8) failures.push(`${label}: title/reason gap ${metrics.titleReasonGap.toFixed(2)}px`);
  if (metrics.actionGap < 16) failures.push(`${label}: action gap ${metrics.actionGap.toFixed(2)}px`);
  metrics.targets.filter((target) => target.minCssDimension < 44).forEach((target) => failures.push(`${label}: ${target.id} target ${target.minCssDimension.toFixed(2)}px`));
  metrics.textObjects.filter((text) => text.fontCssPx < 12).forEach((text) => failures.push(`${label}: text below 12px ${JSON.stringify(text)}`));
  browserErrors.forEach((error) => failures.push(`${label}: ${error}`));
  return { failures, warnings };
}

async function capture(browser, viewport, mode, page = null) {
  const ownsContext = !page;
  const context = ownsContext ? await browser.newContext({ viewport, deviceScaleFactor: 1 }) : null;
  const target = page ?? await context.newPage();
  const browserErrors = [];
  target.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  target.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  if (ownsContext) {
    await target.goto(`${baseUrl}/?resultLayoutQa=${Date.now()}`, { waitUntil: 'networkidle' });
    await showResult(target);
  } else {
    await target.setViewportSize(viewport);
    await target.waitForFunction(({ width, height }) => {
      const bounds = window.__GAME__?.scene?.getScene('GameOver')?.scale?.canvasBounds;
      return bounds && Math.abs(bounds.width - width) < 2 && Math.abs(bounds.height - height) < 2;
    }, viewport, { timeout: 5000 });
    await target.waitForTimeout(220);
  }
  const metrics = await sample(target);
  const screenshot = path.join(OUT, `${phase}-${mode}-${viewport.width}x${viewport.height}.png`);
  await target.screenshot({ path: screenshot });
  if (ownsContext) await context.close();
  return { mode, viewport, screenshot: path.relative(ROOT, screenshot), metrics, browserErrors };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const samples = [];
  try {
    for (const viewport of VIEWPORTS) samples.push(await capture(browser, viewport, 'cold'));
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/?resultLiveResizeQa=${Date.now()}`, { waitUntil: 'networkidle' });
    await showResult(page);
    for (const viewport of [{ width: 844, height: 390 }, { width: 568, height: 320 }, { width: 1280, height: 720 }]) samples.push(await capture(browser, viewport, 'resize', page));
    await context.close();
  } finally {
    await browser.close();
  }
  const failures = [];
  const warnings = [];
  for (const sample of samples) {
    const result = evaluate(sample.metrics, `${sample.mode}-${sample.viewport.width}x${sample.viewport.height}`, sample.browserErrors);
    failures.push(...result.failures); warnings.push(...result.warnings);
  }
  const report = { generatedAt: new Date().toISOString(), phase, baseUrl, samples, failures, warnings, ok: failures.length === 0 };
  const reportPath = path.join(OUT, `${phase}-report.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), ok: report.ok, samples: samples.length, failures, warnings }, null, 2));
  if (phase !== 'before' && failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
