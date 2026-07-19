#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const phaseArg = process.argv.indexOf('--phase');
const phase = phaseArg >= 0 ? process.argv[phaseArg + 1] : 'after';
const urlArg = process.argv.indexOf('--url');
const baseUrl = urlArg >= 0 ? process.argv[urlArg + 1] : 'http://127.0.0.1:5195';
const OUT = path.join(ROOT, 'qa-captures', 'polish-04', 'input-hud-root');
const VIEWPORTS = [
  { width: 844, height: 390, name: 'mobile-844x390' },
  { width: 932, height: 430, name: 'mobile-932x430' },
  { width: 1280, height: 720, name: 'desktop-1280x720' },
];

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const candidates = [
    process.env.CODEX_WORKSPACE_NODE_MODULES && path.join(process.env.CODEX_WORKSPACE_NODE_MODULES, 'playwright/index.mjs'),
    path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { return await import(pathToFileURL(candidate).href); } catch {}
  }
  throw new Error('Playwright not found.');
}

async function waitForGame(page) {
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const canvas = await page.locator('canvas').boundingBox();
  const homePlay = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(homePlay.x, homePlay.y);
  await page.waitForFunction(() => window.__IRON_COURIER_DEBUG__?.get && window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game', null, { timeout: 15000 });
  await page.waitForTimeout(350);
  return canvas;
}

async function testViewport(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const canvas = await waitForGame(page);

  const logicalViewport = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.encounters.enemyGroup.getChildren().forEach((enemy) => enemy.disableBody?.(true, true));
    scene.core.player.invulnerableUntil = Number.POSITIVE_INFINITY;
    return { width: scene.cameras.main.width, height: scene.cameras.main.height };
  });
  await page.evaluate(() => window.__IRON_COURIER_DEBUG__.teleport(500));
  await page.waitForTimeout(250);
  const keyboardStart = await page.evaluate(() => window.__IRON_COURIER_DEBUG__.get().x);
  const forwardStartedAt = await page.evaluate(() => window.__IRON_COURIER_DEBUG__.get().elapsedMs);
  await page.keyboard.down('KeyD');
  await page.waitForFunction((startedAt) => window.__IRON_COURIER_DEBUG__.get().elapsedMs >= startedAt + 700, forwardStartedAt);
  const keyboardForward = await page.evaluate(() => window.__IRON_COURIER_DEBUG__.get().x);
  await page.keyboard.up('KeyD');
  const backwardStartedAt = await page.evaluate(() => window.__IRON_COURIER_DEBUG__.get().elapsedMs);
  await page.keyboard.down('KeyA');
  await page.waitForFunction((startedAt) => window.__IRON_COURIER_DEBUG__.get().elapsedMs >= startedAt + 700, backwardStartedAt);
  const keyboardAction = await page.evaluate(() => window.__GAME__.scene.getScene('Game').lastActions?.moveX);
  await page.keyboard.up('KeyA');
  const keyboardEnd = await page.evaluate(() => window.__IRON_COURIER_DEBUG__.get().x);

  await page.evaluate(() => window.__IRON_COURIER_DEBUG__.teleport(1500));
  await page.waitForTimeout(250);
  const touchStart = await page.evaluate(() => window.__IRON_COURIER_DEBUG__.get().x);
  const joyCenter = {
    x: canvas.x + canvas.width * (120 / logicalViewport.width),
    y: canvas.y + canvas.height * ((logicalViewport.height - 105) / logicalViewport.height),
  };
  let touchAction = 0;
  let touchEnd = touchStart;
  if (viewport.width < 1100) {
    await page.mouse.move(joyCenter.x, joyCenter.y);
    await page.mouse.down();
    await page.mouse.move(joyCenter.x - canvas.width * (80 / logicalViewport.width), joyCenter.y, { steps: 4 });
    const touchStartedAt = await page.evaluate(() => window.__IRON_COURIER_DEBUG__.get().elapsedMs);
    await page.waitForFunction((startedAt) => window.__IRON_COURIER_DEBUG__.get().elapsedMs >= startedAt + 700, touchStartedAt);
    touchAction = await page.evaluate(() => window.__GAME__.scene.getScene('Game').lastActions?.moveX);
    touchEnd = await page.evaluate(() => window.__IRON_COURIER_DEBUG__.get().x);
    await page.mouse.up();
  }

  await page.evaluate(() => window.__IRON_COURIER_DEBUG__.teleport(1699));
  await page.waitForTimeout(120);
  await page.keyboard.down('KeyD');
  const gateStability = await page.evaluate(async () => {
    const scene = window.__GAME__.scene.getScene('Game');
    const samples = [];
    const startedAt = performance.now();
    while (performance.now() - startedAt < 1200) {
      samples.push({ x: scene.core.player.x, vx: scene.core.player.body?.velocity?.x ?? 0, gateBlocked: scene.lastActions?.gateBlocked === true });
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    const xs = samples.map((sample) => sample.x);
    return {
      sampleCount: samples.length,
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      rangeX: Math.max(...xs) - Math.min(...xs),
      positiveVelocitySamples: samples.filter((sample) => sample.vx > 0.5).length,
      gateBlockedSamples: samples.filter((sample) => sample.gateBlocked).length,
    };
  });
  await page.keyboard.up('KeyD');

  const metrics = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    // Exercise the longest production strings instead of validating only the
    // short new-game defaults that previously hid score/weapon/icon overlaps.
    scene.score = 999999999;
    scene.core.weapons.currentWeapon = 'shotgun';
    scene.core.weapons.ammo.shotgun = 999;
    scene.core.weapons.grenades = 99;
    scene.updateHud();
    scene.updateLayout();
    const panel = scene.fixedUi[0];
    const source = panel.frame?.source;
    const bounds = panel.getBounds();
    return {
      scene: window.__GAME_LAYOUT_BOUNDS__?.scene,
      canvasCss: { width: scene.scale.canvasBounds.width, height: scene.scale.canvasBounds.height },
      logicalViewport: { width: scene.cameras.main.width, height: scene.cameras.main.height },
      hudType: panel.type,
      hudTexture: panel.texture?.key,
      hudBounds: { x: bounds.x - scene.cameras.main.scrollX, y: bounds.y - scene.cameras.main.scrollY, width: bounds.width, height: bounds.height },
      hudSource: { width: source?.width ?? null, height: source?.height ?? null },
      hudScale: { x: panel.scaleX, y: panel.scaleY, anisotropy: Math.max(panel.scaleX / panel.scaleY, panel.scaleY / panel.scaleX) },
      layout: window.__GAME_LAYOUT_BOUNDS__,
      hudFontCssPx: Object.fromEntries([
        ['hp', scene.hpText], ['weapon', scene.weaponText], ['stage', scene.stageText], ['score', scene.scoreText], ['rescue', scene.rescueText],
      ].map(([id, obj]) => [id, Number.parseFloat(obj.style.fontSize) * scene.scale.canvasBounds.height / scene.cameras.main.height])),
      lastActions: scene.lastActions,
      touchControlsVisible: scene.controls.base.visible,
      cameraLookAhead: {
        direction: scene.cameraLeadDirection,
        followOffsetX: scene.cameras.main.followOffset.x,
        playerScreenX: scene.core.player.x - scene.cameras.main.scrollX,
        playerScreenRatio: (scene.core.player.x - scene.cameras.main.scrollX) / scene.cameras.main.width,
      },
      staticWorldDrift: {
        destructibles: Math.max(0, ...scene.core.destruction.props.getChildren().map((item) => Math.abs(item.y - (item.getData('_spawnY') ?? item.y)))),
        pickups: Math.max(0, ...scene.weaponPickups.getChildren().map((item) => Math.abs(item.y - (item.getData('_spawnY') ?? item.y)))),
      },
    };
  });

  const screenshot = path.join(OUT, `${phase}-${viewport.name}.png`);
  await page.screenshot({ path: screenshot });
  await context.close();
  return {
    viewport: `${viewport.width}x${viewport.height}`,
    screenshot: path.relative(ROOT, screenshot),
    backward: {
      keyboard: { startX: keyboardStart, forwardX: keyboardForward, forwardDeltaX: keyboardForward - keyboardStart, endX: keyboardEnd, deltaX: keyboardEnd - keyboardForward, sampledAction: keyboardAction },
      touch: { startX: touchStart, endX: touchEnd, deltaX: touchEnd - touchStart, sampledAction: touchAction },
    },
    gateStability,
    metrics,
    browserErrors,
  };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const samples = [];
  for (const viewport of VIEWPORTS) samples.push(await testViewport(browser, viewport));
  await browser.close();
  const failures = [];
  for (const sample of samples) {
    if (sample.backward.keyboard.forwardDeltaX < 140 || sample.backward.keyboard.deltaX > -140 || sample.backward.keyboard.sampledAction !== -1) failures.push(`${sample.viewport}: keyboard forward/back deltas ${sample.backward.keyboard.forwardDeltaX.toFixed(1)}/${sample.backward.keyboard.deltaX.toFixed(1)}, action ${sample.backward.keyboard.sampledAction}`);
    const [vw, vh] = sample.viewport.split('x').map(Number);
    if (vw < 1100 && (sample.backward.touch.deltaX > -140 || sample.backward.touch.sampledAction > -0.9)) failures.push(`${sample.viewport}: touch backward delta ${sample.backward.touch.deltaX.toFixed(1)}, action ${sample.backward.touch.sampledAction}`);
    // On-screen controls are now an always-visible primary control surface on
    // both mouse and touch devices. Pointer-capability detection must not make
    // them disappear after resize, death, or scene resume.
    if (!sample.metrics.touchControlsVisible) failures.push(`${sample.viewport}: on-screen controls should remain visible`);
    if (sample.gateStability.rangeX > 1 || sample.gateStability.positiveVelocitySamples > 1 || sample.gateStability.gateBlockedSamples < sample.gateStability.sampleCount * 0.8) failures.push(`${sample.viewport}: gate jitter ${JSON.stringify(sample.gateStability)}`);
    if (sample.metrics.staticWorldDrift.destructibles > 1 || sample.metrics.staticWorldDrift.pickups > 1) failures.push(`${sample.viewport}: static world drift ${JSON.stringify(sample.metrics.staticWorldDrift)}`);
    if (sample.metrics.hudScale.anisotropy > 1.35) failures.push(`${sample.viewport}: HUD anisotropic scale ${sample.metrics.hudScale.anisotropy.toFixed(2)}`);
    // This sample intentionally holds the player at the first encounter gate.
    // Expanded mobile cameras can reach a scroll constraint there, so validate
    // lead direction/offset and a broad visible-safe ratio rather than the
    // unconstrained 0.40 target used in open world space.
    if (sample.metrics.cameraLookAhead.direction !== 1 || sample.metrics.cameraLookAhead.followOffsetX >= 0 || sample.metrics.cameraLookAhead.playerScreenRatio < 0.3 || sample.metrics.cameraLookAhead.playerScreenRatio > 0.8) failures.push(`${sample.viewport}: forward camera look-ahead ${JSON.stringify(sample.metrics.cameraLookAhead)}`);
    if ((sample.metrics.layout?.overlaps?.length ?? 0) > 0) failures.push(`${sample.viewport}: UI overlaps ${JSON.stringify(sample.metrics.layout.overlaps)}`);
    if ((sample.metrics.layout?.clipped?.length ?? 0) > 0) failures.push(`${sample.viewport}: clipped UI ${sample.metrics.layout.clipped.join(', ')}`);
    if (vw < 1100) {
      const tooSmall = Object.entries(sample.metrics.hudFontCssPx).filter(([, px]) => px < 15);
      if (tooSmall.length) failures.push(`${sample.viewport}: HUD text below 15 CSS px ${JSON.stringify(tooSmall)}`);
    }
    if (sample.metrics.canvasCss.width < vw - 2 || sample.metrics.canvasCss.height < vh - 2) failures.push(`${sample.viewport}: canvas does not cover viewport (${sample.metrics.canvasCss.width}x${sample.metrics.canvasCss.height})`);
    failures.push(...sample.browserErrors.map((error) => `${sample.viewport}: ${error}`));
  }
  const report = { generatedAt: new Date().toISOString(), phase, baseUrl, samples, failures, ok: failures.length === 0 };
  const reportPath = path.join(OUT, `${phase}-samples.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), ok: report.ok, failures }, null, 2));
  if (phase !== 'before' && failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
