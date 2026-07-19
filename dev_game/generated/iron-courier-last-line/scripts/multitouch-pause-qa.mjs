#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const phaseIndex = process.argv.indexOf('--phase');
const phase = phaseIndex >= 0 ? process.argv[phaseIndex + 1] : 'after';
const urlIndex = process.argv.indexOf('--url');
const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5195';
const OUT = path.join(ROOT, 'qa-captures', 'polish-05', 'phase3-mobile-pause');
const VIEWPORTS = [
  { width: 844, height: 390 },
  { width: 932, height: 430 },
  { width: 1280, height: 720 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForGame(page) {
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const canvas = await page.locator('canvas').boundingBox();
  const homePlay = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(homePlay.x, homePlay.y);
  await page.waitForFunction(() => window.__IRON_COURIER_DEBUG__?.get && window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game', null, { timeout: 15000 });
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.encounters.enemyGroup.getChildren().forEach((enemy) => enemy.disableBody?.(true, true));
    scene.core.player.invulnerableUntil = Number.POSITIVE_INFINITY;
    window.__PHASE3_QA__ = { jumpsConsumed: 0, playerShots: 0 };
    const originalConsumeJump = scene.controls.consumeJump.bind(scene.controls);
    scene.controls.consumeJump = () => {
      const consumed = originalConsumeJump();
      if (consumed) window.__PHASE3_QA__.jumpsConsumed += 1;
      return consumed;
    };
    scene.core.weapons.on('fired', ({ owner }) => {
      if (owner === scene.core.player) window.__PHASE3_QA__.playerShots += 1;
    });
  });
  await page.waitForTimeout(300);
  return canvas;
}

function point(x, y, id) {
  return { x, y, id, radiusX: 8, radiusY: 8, force: 1 };
}

async function controlsSnapshot(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const action = (entry) => ({
      ownerPointer: entry?.ownerPointer ?? null,
      texture: entry?.bg?.texture?.key ?? null,
      visible: entry?.bg?.visible ?? false,
    });
    return {
      moveX: scene.controls.moveX,
      shootDown: scene.controls.shootDown,
      jumpQueued: scene.controls.jumpQueued,
      grenadeQueued: scene.controls.grenadeQueued,
      joyPointer: scene.controls.joyPointer,
      actions: {
        shoot: action(scene.controls.shoot),
        jump: action(scene.controls.jump),
        grenade: action(scene.controls.grenade),
        pause: action(scene.controls.pause),
      },
      lastActions: scene.lastActions,
      playerX: scene.core.player.x,
      elapsedMs: scene.elapsedMs,
      gravityY: scene.physics.world.gravity.y,
      activePointerCapacity: scene.input.manager.pointers.length - 1,
      pointers: scene.input.manager.pointers.map((p) => ({ id: p.id, identifier: p.identifier, isDown: p.isDown })),
      qa: { ...window.__PHASE3_QA__ },
    };
  });
}

async function runCancelAndOutIsolation(page, cdp, coords) {
  const joy = point(coords.joy.x, coords.joy.y, 201);
  const shoot = point(coords.shoot.x, coords.shoot.y, 202);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [joy] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [shoot] });
  await page.waitForTimeout(120);
  // CDP models the browser-level touchcancel event as cancelling the whole
  // active contact set. Individual release isolation is covered separately by
  // runTouchOrder; this assertion covers global interruption cleanup.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForTimeout(100);
  const afterAllCancel = await controlsSnapshot(page);

  const outShoot = point(coords.shoot.x, coords.shoot.y, 210);
  const movedOutside = point(coords.shoot.x - 180, coords.shoot.y - 160, 210);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [outShoot] });
  await page.waitForTimeout(80);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [movedOutside] });
  await page.waitForTimeout(100);
  const afterPointerOut = await controlsSnapshot(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [movedOutside] });
  await page.waitForTimeout(80);
  return { afterAllCancel, afterPointerOut, released: await controlsSnapshot(page) };
}

async function runTouchOrder(page, cdp, coords, first, second, baseId) {
  const firstPoint = point(coords[first].x, coords[first].y, baseId);
  const secondPoint = point(coords[second].x, coords[second].y, baseId + 1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [firstPoint] });
  await page.waitForTimeout(100);
  const firstOnly = await controlsSnapshot(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [secondPoint] });
  await page.waitForTimeout(260);
  const concurrent = await controlsSnapshot(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [firstPoint] });
  await page.waitForTimeout(100);
  const afterFirstRelease = await controlsSnapshot(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [secondPoint] });
  await page.waitForTimeout(100);
  const afterAllRelease = await controlsSnapshot(page);
  return { order: `${first}->${second}`, firstOnly, concurrent, afterFirstRelease, afterAllRelease };
}

async function runJumpStress(page, cdp, coords) {
  const joy = point(coords.joy.x, coords.joy.y, 101);
  const shoot = point(coords.shoot.x, coords.shoot.y, 102);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [joy] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [shoot] });
  await page.waitForTimeout(160);
  const samples = [];
  for (let i = 0; i < 10; i += 1) {
    const jump = point(coords.jump.x, coords.jump.y, 110 + i);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [jump] });
    await page.waitForTimeout(70);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [jump] });
    await page.waitForTimeout(70);
    samples.push(await controlsSnapshot(page));
  }
  const beforeJoyRelease = await controlsSnapshot(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [joy] });
  await page.waitForTimeout(120);
  const shootAfterJoyRelease = await controlsSnapshot(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [shoot] });
  await page.waitForTimeout(120);
  const released = await controlsSnapshot(page);
  return { samples, beforeJoyRelease, shootAfterJoyRelease, released };
}

async function pauseSnapshot(page) {
  return page.evaluate(() => {
    const pause = window.__GAME__.scene.getScene('Pause');
    const game = window.__GAME__.scene.getScene('Game');
    const objects = pause.children.list;
    const panel = pause.pausePanel ?? objects.find((obj) => obj.type === 'NineSlice');
    const overlay = pause.pauseOverlay ?? objects.find((obj) => obj.type === 'Rectangle' && obj.depth === 200);
    const buttons = [pause.resumeButton, pause.retreatButton].filter(Boolean);
    if (!buttons.length) {
      objects.filter((obj) => obj.texture?.key === 'ui-menu-button-base').sort((a, b) => a.y - b.y).forEach((bg) => {
        const text = objects.find((obj) => obj.type === 'Text' && Math.abs(obj.x - bg.x) < 2 && Math.abs(obj.y - bg.y) < 2);
        buttons.push({ bg, text });
      });
    }
    const pack = (entry) => {
      const bounds = entry.bg.getBounds();
      return {
        label: entry.text?.text ?? null,
        bgDepth: entry.bg.depth,
        textDepth: entry.text?.depth ?? null,
        visible: entry.bg.visible && (entry.text?.visible ?? true),
        interactive: Boolean(entry.bg.input?.enabled),
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        abovePanel: entry.bg.depth > (panel?.depth ?? -Infinity) && (entry.text?.depth ?? entry.bg.depth) > (panel?.depth ?? -Infinity),
        aboveOverlay: entry.bg.depth > (overlay?.depth ?? -Infinity) && (entry.text?.depth ?? entry.bg.depth) > (overlay?.depth ?? -Infinity),
      };
    };
    return {
      sceneActive: pause.scene.isActive(),
      gamePaused: game.scene.isPaused(),
      panelDepth: panel?.depth ?? null,
      overlayDepth: overlay?.depth ?? null,
      overlayInteractive: Boolean(overlay?.input?.enabled),
      buttons: buttons.map(pack),
      activeScenes: window.__GAME__.scene.getScenes(true).map((scene) => scene.sys.settings.key),
      game: {
        elapsedMs: game.elapsedMs,
        playerX: game.core.player.x,
        controls: {
          moveX: game.controls.moveX,
          shootDown: game.controls.shootDown,
          joyPointer: game.controls.joyPointer,
          visible: game.controls.base.visible,
        },
      },
    };
  });
}

async function clickLogical(page, canvas, logical, x, y) {
  await page.mouse.click(canvas.x + canvas.width * (x / logical.width), canvas.y + canvas.height * (y / logical.height));
}

async function testViewport(browser, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];
  const browserDiagnostics = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Chromium's CDP-generated touchcancel is deliberately non-cancelable;
    // Phaser's preventDefault attempt produces this browser diagnostic even
    // though the pointers are correctly cancelled. Keep it in evidence, but
    // do not misclassify it as an application exception.
    if (text.startsWith('Ignored attempt to cancel a touchcancel event with cancelable=false')) browserDiagnostics.push(text);
    else browserErrors.push(`console:error: ${text}`);
  });
  await page.goto(`${baseUrl}/?qaTouch=1`, { waitUntil: 'networkidle' });
  const canvas = await waitForGame(page);
  const logical = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    return { width: scene.cameras.main.width, height: scene.cameras.main.height };
  });
  const toCss = (x, y) => ({
    x: canvas.x + canvas.width * (x / logical.width),
    y: canvas.y + canvas.height * (y / logical.height),
  });
  const coords = {
    joy: toCss(170, logical.height - 105),
    shoot: toCss(logical.width - 128, logical.height - 105),
    jump: toCss(logical.width - 270, logical.height - 80),
    pause: toCss(logical.width - 48, 52),
  };
  const cdp = await context.newCDPSession(page);

  const initial = await controlsSnapshot(page);
  const joystickThenShoot = await runTouchOrder(page, cdp, coords, 'joy', 'shoot', 11);
  const shootThenJoystick = await runTouchOrder(page, cdp, coords, 'shoot', 'joy', 31);
  const jumpStress = await runJumpStress(page, cdp, coords);
  const cancelAndOut = await runCancelAndOutIsolation(page, cdp, coords);

  await clickLogical(page, canvas, logical, logical.width - 48, 52);
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Pause'), null, { timeout: 5000 });
  await page.waitForTimeout(120);
  const pauseInitial = await pauseSnapshot(page);
  const elapsedBeforeBlockedTap = pauseInitial.game.elapsedMs;
  await clickLogical(page, canvas, logical, logical.width - 128, logical.height - 105);
  await page.waitForTimeout(180);
  const pauseAfterBlockedTap = await pauseSnapshot(page);
  const pauseScreenshot = path.join(OUT, `${phase}-${viewport.width}x${viewport.height}-pause.png`);
  await page.screenshot({ path: pauseScreenshot });

  await clickLogical(page, canvas, logical, logical.width / 2, 350);
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Game') && !window.__GAME__.scene.isActive('Pause'), null, { timeout: 5000 });
  await page.waitForTimeout(160);
  const afterResumeClick = await controlsSnapshot(page);

  const escCycles = [];
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__GAME__.scene.isActive('Pause'), null, { timeout: 3000 });
    await page.keyboard.press('Escape');
    let resumedByEsc = true;
    try {
      await page.waitForFunction(() => window.__GAME__.scene.isActive('Game') && !window.__GAME__.scene.isActive('Pause'), null, { timeout: 500 });
    } catch {
      resumedByEsc = false;
      await clickLogical(page, canvas, logical, logical.width / 2, 350);
      await page.waitForFunction(() => window.__GAME__.scene.isActive('Game') && !window.__GAME__.scene.isActive('Pause'), null, { timeout: 3000 });
    }
    await page.waitForTimeout(80);
    escCycles.push({
      cycle: i + 1,
      resumedByEsc,
      state: await controlsSnapshot(page),
      activeScenes: await page.evaluate(() => window.__GAME__.scene.getScenes(true).map((scene) => scene.sys.settings.key)),
    });
  }

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Pause'), null, { timeout: 3000 });
  await clickLogical(page, canvas, logical, logical.width / 2, 438);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home' && window.__GAME__.scene.isActive('Home'), null, { timeout: 5000 });
  const retreatReachedHome = await page.evaluate(() => window.__GAME__.scene.isActive('Home') && !window.__GAME__.scene.isActive('Game') && !window.__GAME__.scene.isActive('Pause'));

  await context.close();
  return {
    viewport: `${viewport.width}x${viewport.height}`,
    initial,
    joystickThenShoot,
    shootThenJoystick,
    jumpStress,
    cancelAndOut,
    pause: {
      initial: pauseInitial,
      afterBlockedTap: pauseAfterBlockedTap,
      elapsedDeltaDuringBlockedTap: pauseAfterBlockedTap.game.elapsedMs - elapsedBeforeBlockedTap,
      screenshot: path.relative(ROOT, pauseScreenshot),
      afterResumeClick,
      escCycles,
      retreatReachedHome,
    },
    browserErrors,
    browserDiagnostics,
  };
}

function evaluateFailures(samples) {
  const failures = [];
  for (const sample of samples) {
    const prefix = sample.viewport;
    if (sample.initial.activePointerCapacity < 4) failures.push(`${prefix}: active pointer capacity ${sample.initial.activePointerCapacity} < 4`);
    if (sample.initial.gravityY !== 1850) failures.push(`${prefix}: runtime gravity ${sample.initial.gravityY} !== GAME_CONFIG 1850`);
    for (const order of [sample.joystickThenShoot, sample.shootThenJoystick]) {
      if (order.concurrent.moveX < 0.9 || !order.concurrent.shootDown) failures.push(`${prefix}: ${order.order} did not preserve move+shoot`);
      const releasedFirst = order.order.startsWith('joy');
      if (releasedFirst && !order.afterFirstRelease.shootDown) failures.push(`${prefix}: releasing joystick cancelled shoot`);
      if (!releasedFirst && order.afterFirstRelease.moveX < 0.9) failures.push(`${prefix}: releasing shoot cancelled joystick`);
      if (order.afterAllRelease.moveX !== 0 || order.afterAllRelease.shootDown) failures.push(`${prefix}: ${order.order} left stuck input`);
    }
    const stress = sample.jumpStress;
    if (stress.beforeJoyRelease.qa.jumpsConsumed !== 10) failures.push(`${prefix}: consumed ${stress.beforeJoyRelease.qa.jumpsConsumed}/10 jump taps`);
    if (stress.beforeJoyRelease.moveX < 0.9 || !stress.beforeJoyRelease.shootDown || stress.beforeJoyRelease.qa.playerShots < 1) failures.push(`${prefix}: move+shoot did not remain active during jump stress`);
    if (!stress.shootAfterJoyRelease.shootDown || stress.shootAfterJoyRelease.moveX !== 0) failures.push(`${prefix}: independent joystick release failed during stress`);
    if (stress.released.moveX !== 0 || stress.released.shootDown) failures.push(`${prefix}: stress release left stuck input`);
    const cancellation = sample.cancelAndOut;
    if (cancellation.afterAllCancel.moveX !== 0 || cancellation.afterAllCancel.shootDown) failures.push(`${prefix}: touchcancel left stuck input`);
    if (cancellation.afterPointerOut.shootDown || cancellation.afterPointerOut.actions.shoot.ownerPointer != null) failures.push(`${prefix}: pointerout did not release shoot`);
    if (cancellation.released.moveX !== 0 || cancellation.released.shootDown) failures.push(`${prefix}: pointerout cleanup left stuck input`);

    const pause = sample.pause;
    if (!pause.initial.gamePaused || !pause.initial.sceneActive) failures.push(`${prefix}: Pause did not pause Game`);
    if (!pause.initial.overlayInteractive) failures.push(`${prefix}: Pause overlay is not interactive`);
    if (pause.initial.buttons.length !== 2) failures.push(`${prefix}: expected two Pause buttons, got ${pause.initial.buttons.length}`);
    pause.initial.buttons.forEach((button) => {
      if (!button.visible || !button.interactive || !button.abovePanel || !button.aboveOverlay) failures.push(`${prefix}: ${button.label ?? 'Pause button'} is hidden or not interactive`);
    });
    if (Math.abs(pause.elapsedDeltaDuringBlockedTap) > 0.01 || pause.afterBlockedTap.game.controls.moveX !== 0 || pause.afterBlockedTap.game.controls.shootDown) failures.push(`${prefix}: Pause overlay leaked input to Game`);
    if (!pause.afterResumeClick.actions.pause.visible || pause.afterResumeClick.moveX !== 0 || pause.afterResumeClick.shootDown) failures.push(`${prefix}: resume did not restore clean controls`);
    if (pause.escCycles.some((cycle) => !cycle.resumedByEsc)) failures.push(`${prefix}: ESC failed to resume in one or more cycles`);
    if (pause.escCycles.some((cycle) => cycle.activeScenes.length !== 1 || cycle.activeScenes[0] !== 'Game' || cycle.state.moveX !== 0 || cycle.state.shootDown)) failures.push(`${prefix}: Pause/Resume cycles duplicated scenes or left stuck input`);
    if (!pause.retreatReachedHome) failures.push(`${prefix}: retreat button did not reach Home`);
    sample.browserErrors.forEach((error) => failures.push(`${prefix}: ${error}`));
  }
  return failures;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const samples = [];
  try {
    for (const viewport of VIEWPORTS) samples.push(await testViewport(browser, viewport));
  } finally {
    await browser.close();
  }
  const failures = evaluateFailures(samples);
  const report = { generatedAt: new Date().toISOString(), phase, baseUrl, samples, failures, ok: failures.length === 0 };
  const reportPath = path.join(OUT, `${phase}-report.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), ok: report.ok, failures }, null, 2));
  if (phase !== 'before' && failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
