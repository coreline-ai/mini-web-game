#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'polish-08');
const phaseIndex = process.argv.indexOf('--phase');
const phase = phaseIndex >= 0 ? process.argv[phaseIndex + 1] : 'after';
const urlIndex = process.argv.indexOf('--url');
const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5195';

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

function touchPoint(x, y, id = 91) {
  return { x, y, id, radiusX: 8, radiusY: 8, force: 1 };
}

async function enterGame(page) {
  await page.goto(`${baseUrl}/?qaTouchCrouch=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const play = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game', null, { timeout: 15000 });
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.encounters.enemyGroup.getChildren().forEach((enemy) => enemy.disableBody?.(true, true));
    scene.core.player.invulnerableUntil = Number.POSITIVE_INFINITY;
    scene.core.player.setPosition(430, 546.6);
    scene.core.player.body.reset(430, 546.6);
    scene.core.player.setVelocity(0, 0);
  });
  await page.waitForFunction(() => {
    const player = window.__GAME__.scene.getScene('Game').core.player;
    return player.body.blocked.down || player.body.touching.down;
  }, null, { timeout: 3000 });
  await page.waitForTimeout(120);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const controls = scene.controls;
    const player = scene.core.player;
    return {
      controls: {
        moveX: controls.moveX,
        moveY: controls.moveY,
        crouchDown: controls.crouchDown,
        joyPointer: controls.joyPointer,
        baseActive: controls.base.getData('_crouchActive') ?? false,
        knobActive: controls.knob.getData('_crouchActive') ?? false,
        knobOffset: { x: controls.knob.x - controls.joystickX, y: controls.knob.y - controls.joystickY },
      },
      player: {
        state: player.state,
        x: player.x,
        y: player.y,
        velocityX: player.body.velocity.x,
        grounded: player.body.blocked.down || player.body.touching.down,
        bodyHeight: player.body.height,
        bodyTop: player.body.top,
        bodyBottom: player.body.bottom,
      },
      lastActions: scene.lastActions ? { ...scene.lastActions } : null,
    };
  });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  try {
    await enterGame(page);
    const geometry = await page.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      const canvas = window.__GAME_LAYOUT_BOUNDS__.canvas;
      const joystick = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'joystick');
      return {
        center: { x: joystick.x + joystick.width / 2, y: joystick.y + joystick.height / 2 },
        cssScaleX: canvas.width / scene.cameras.main.width,
        cssScaleY: canvas.height / scene.cameras.main.height,
      };
    });
    const cdp = await context.newCDPSession(page);
    const initial = await snapshot(page);

    const start = touchPoint(geometry.center.x, geometry.center.y);
    const down = touchPoint(geometry.center.x + 10 * geometry.cssScaleX, geometry.center.y + 62 * geometry.cssScaleY);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [down] });
    await page.waitForFunction(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      return scene.controls.crouchDown && scene.core.player.state === 'crouch';
    }, null, { timeout: 2500 });
    await page.waitForTimeout(140);
    const crouched = await snapshot(page);
    const screenshot = path.join(OUT, `${phase}-touch-joystick-crouch.png`);
    await page.screenshot({ path: screenshot });

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      return !scene.controls.crouchDown && scene.core.player.state !== 'crouch';
    }, null, { timeout: 2500 });
    await page.waitForTimeout(120);
    const released = await snapshot(page);

    const right = touchPoint(geometry.center.x + 62 * geometry.cssScaleX, geometry.center.y);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [right] });
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').controls.moveX > 0.9, null, { timeout: 2500 });
    await page.waitForTimeout(120);
    const movingRight = await snapshot(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(120);
    const final = await snapshot(page);

    const failures = [];
    if (initial.controls.moveX !== 0 || initial.controls.moveY !== 0 || initial.controls.crouchDown) failures.push('initial joystick state was not neutral');
    if (!crouched.controls.crouchDown || crouched.controls.moveX !== 0 || crouched.controls.moveY < 0.55) failures.push(`down gesture did not publish crouch input: ${JSON.stringify(crouched.controls)}`);
    if (!crouched.lastActions?.crouch || crouched.player.state !== 'crouch') failures.push(`down gesture did not reach Player crouch state: ${JSON.stringify(crouched.player)}`);
    if (Math.abs(crouched.player.bodyHeight - 72) > 0.5) failures.push(`crouch body height was ${crouched.player.bodyHeight}, expected 72`);
    if (crouched.controls.knobOffset.y < 45 || !crouched.controls.baseActive || !crouched.controls.knobActive) failures.push('crouch gesture lacked visible downward/active joystick feedback');
    if (released.controls.moveX !== 0 || released.controls.moveY !== 0 || released.controls.crouchDown || released.player.state === 'crouch') failures.push('touch release left crouch or joystick input stuck');
    if (movingRight.controls.moveX < 0.9 || Math.abs(movingRight.controls.moveY) > 0.16 || movingRight.controls.crouchDown || movingRight.lastActions?.crouch) failures.push('right gesture was misclassified as crouch');
    if (final.controls.moveX !== 0 || final.controls.moveY !== 0 || final.controls.crouchDown) failures.push('final joystick state was not neutral');
    failures.push(...browserErrors);

    const report = {
      generatedAt: new Date().toISOString(), phase, baseUrl, viewport: '844x390', geometry,
      initial, crouched, released, movingRight, final,
      screenshot: path.relative(ROOT, screenshot), browserErrors, failures, ok: failures.length === 0,
    };
    const reportPath = path.join(OUT, `${phase}-touch-crouch.json`);
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), screenshot: report.screenshot, ok: report.ok, crouched: { moveY: crouched.controls.moveY, state: crouched.player.state, bodyHeight: crouched.player.bodyHeight }, released: { moveY: released.controls.moveY, state: released.player.state }, failures }, null, 2));
    if (phase !== 'before' && failures.length) process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
