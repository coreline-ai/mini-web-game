#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'polish-09', 'home-layout');
const phaseIndex = process.argv.indexOf('--phase');
const phase = phaseIndex >= 0 ? process.argv[phaseIndex + 1] : 'after';
const urlIndex = process.argv.indexOf('--url');
const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5195';
const VIEWPORTS = [
  { width: 568, height: 320 },
  { width: 667, height: 375 },
  { width: 780, height: 360 },
  { width: 844, height: 390 },
  { width: 932, height: 430 },
  { width: 1024, height: 600 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
];

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

async function waitForHome(page) {
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  await page.waitForTimeout(180);
}

async function sample(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Home');
    const layout = window.__GAME_LAYOUT_BOUNDS__;
    const canvas = layout.canvas;
    const panel = layout.items.find((item) => item.id === 'home-panel');
    const background = layout.items.find((item) => item.id === 'home-background');
    const play = layout.items.find((item) => item.id === 'home-play');
    const textObjects = scene.children.list.filter((object) => object.type === 'Text').map((object) => {
      const bounds = object.getBounds();
      const scaleY = canvas.height / scene.cameras.main.height;
      return { text: object.text, fontCssPx: Number.parseFloat(object.style.fontSize) * scaleY, lines: object.getWrappedText?.(object.text)?.length ?? 1, logicalBounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } };
    });
    const contained = layout.items.filter((item) => item.containment).map((item) => {
      const safe = item.containment.safeBounds;
      const margins = {
        left: item.x - safe.x,
        right: safe.x + safe.width - (item.x + item.width),
        top: item.y - safe.y,
        bottom: safe.y + safe.height - (item.y + item.height),
      };
      return { id: item.id, containment: item.containment, margins, minMargin: Math.min(...Object.values(margins)) };
    });
    const backgroundGap = {
      left: Math.max(0, background.x - canvas.x),
      right: Math.max(0, canvas.x + canvas.width - (background.x + background.width)),
      top: Math.max(0, background.y - canvas.y),
      bottom: Math.max(0, canvas.y + canvas.height - (background.y + background.height)),
    };
    return {
      canvas,
      logicalViewport: { width: scene.cameras.main.width, height: scene.cameras.main.height },
      panel,
      background,
      play,
      panelCenterDeltaCss: Math.abs((panel.x + panel.width / 2) - (canvas.x + canvas.width / 2)),
      backgroundGap,
      contained,
      textObjects,
      layoutClipped: layout.clipped,
      layoutOverlaps: layout.overlaps,
      containmentFailures: layout.containmentFailures ?? [],
    };
  });
}

function evaluate(metrics, label, browserErrors) {
  const failures = [];
  const warnings = [];
  if (metrics.layoutClipped.length) failures.push(`${label}: canvas clipping ${metrics.layoutClipped.join(', ')}`);
  if (metrics.layoutOverlaps.length) failures.push(`${label}: overlap ${JSON.stringify(metrics.layoutOverlaps)}`);
  if (metrics.containmentFailures.length) failures.push(`${label}: panel containment ${JSON.stringify(metrics.containmentFailures)}`);
  if (metrics.panelCenterDeltaCss > 1) failures.push(`${label}: panel center delta ${metrics.panelCenterDeltaCss.toFixed(2)} CSS px`);
  const maxBackgroundGap = Math.max(...Object.values(metrics.backgroundGap));
  if (maxBackgroundGap > 1) failures.push(`${label}: background gap ${JSON.stringify(metrics.backgroundGap)}`);
  if ((metrics.play.hitArea?.minCssDimension ?? Math.min(metrics.play.width, metrics.play.height)) < 44) failures.push(`${label}: play target below 44 CSS px`);
  const tooSmall = metrics.textObjects.filter((item) => item.fontCssPx < 12);
  if (tooSmall.length) failures.push(`${label}: text below 12 CSS px ${JSON.stringify(tooSmall)}`);
  metrics.contained.filter((item) => item.minMargin < 8 && item.minMargin >= -0.5).forEach((item) => warnings.push(`${label}: ${item.id} safe margin ${item.minMargin.toFixed(2)} CSS px`));
  browserErrors.forEach((error) => failures.push(`${label}: ${error}`));
  return { failures, warnings };
}

async function captureCold(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  await page.goto(`${baseUrl}/?homeLayoutQa=${Date.now()}`, { waitUntil: 'networkidle' });
  await waitForHome(page);
  const metrics = await sample(page);
  const screenshot = path.join(OUT, `${phase}-cold-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: screenshot });
  await context.close();
  return { mode: 'cold', viewport, screenshot: path.relative(ROOT, screenshot), metrics, browserErrors };
}

async function captureLiveResize(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  await page.goto(`${baseUrl}/?homeLiveResizeQa=${Date.now()}`, { waitUntil: 'networkidle' });
  await waitForHome(page);
  const samples = [];
  for (const viewport of [{ width: 844, height: 390 }, { width: 932, height: 430 }, { width: 568, height: 320 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(({ width, height }) => {
      const canvas = window.__GAME_LAYOUT_BOUNDS__?.canvas;
      return window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home' && Math.abs(canvas.width - width) < 2 && Math.abs(canvas.height - height) < 2;
    }, viewport, { timeout: 5000 });
    await page.waitForTimeout(180);
    const metrics = await sample(page);
    const screenshot = path.join(OUT, `${phase}-resize-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: screenshot });
    samples.push({ mode: 'resize', viewport, screenshot: path.relative(ROOT, screenshot), metrics, browserErrors: [...browserErrors] });
  }
  await context.close();
  return samples;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const samples = [];
  try {
    for (const viewport of VIEWPORTS) samples.push(await captureCold(browser, viewport));
    samples.push(...await captureLiveResize(browser));
  } finally {
    await browser.close();
  }
  const failures = [];
  const warnings = [];
  for (const sample of samples) {
    const label = `${sample.mode}-${sample.viewport.width}x${sample.viewport.height}`;
    const evaluated = evaluate(sample.metrics, label, sample.browserErrors);
    failures.push(...evaluated.failures); warnings.push(...evaluated.warnings);
  }
  const report = { generatedAt: new Date().toISOString(), phase, baseUrl, samples, failures, warnings, ok: failures.length === 0 };
  const reportPath = path.join(OUT, `${phase}-report.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), ok: report.ok, cold: VIEWPORTS.length, liveResize: samples.length - VIEWPORTS.length, failures, warnings }, null, 2));
  if (phase !== 'before' && failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
