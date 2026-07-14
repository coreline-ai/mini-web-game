import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.FIREBREAK_QA_URL || process.env.GAME_QA_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
const point = async (x, y) => { const c = await page.locator('canvas').boundingBox(); return { x: c.x + x * c.width / 390, y: c.y + y * c.height / 844 }; };

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded' });
await waitScene('Home');

// pointerout must restore the pressed visual without firing a pointerup transition.
const playPoint = await point(195, 660);
await page.mouse.move(playPoint.x, playPoint.y);
await page.mouse.down();
await page.mouse.move(20, 20);
await page.mouse.up();
const restored = await page.evaluate(() => {
  const scene = globalThis.__GAME__.scene.getScene('Home');
  return { scene: globalThis.__GAME_LAYOUT_BOUNDS__.scene, scaleX: scene.playBtn.bg.scaleX, scaleY: scene.playBtn.bg.scaleY };
});
assert.equal(restored.scene, 'Home');
assert.ok(Math.abs(restored.scaleX - 1) < 0.001 && Math.abs(restored.scaleY - 1) < 0.001);

// Triple click must create exactly one gameplay scene and no leaked command.
await page.mouse.click(playPoint.x, playPoint.y, { clickCount: 3, delay: 15 });
await waitScene('Game');
await page.waitForTimeout(150);
let state = await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.get());
assert.equal(state.sceneStackSize, 1);
assert.equal(state.coachVisible, true);
assert.deepEqual(state.actionCounts, { firebreak: 0, helicopter: 0, engine: 0 });

// Two pointer events on the modal backdrop must not reach the playfield.
await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const opts = { bubbles: true, clientX: 195, clientY: 380, pointerType: 'touch', isPrimary: true };
  canvas.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1 }));
  canvas.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 2, isPrimary: false }));
  canvas.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1 }));
  canvas.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 2, isPrimary: false }));
});
state = await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.get());
assert.deepEqual(state.actionCounts, { firebreak: 0, helicopter: 0, engine: 0 });
assert.equal(state.simTick, 0);

// Close coach, force result, then triple-click Retry.
const coachStart = await point(195, 602);
await page.mouse.click(coachStart.x, coachStart.y);
await page.waitForFunction(() => globalThis.__FIREBREAK_DEBUG__?.get().coachVisible === false);
await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.forceWin());
await waitScene('GameOver');
const retry = await point(195, 670);
await page.mouse.click(retry.x, retry.y, { clickCount: 3, delay: 15 });
await waitScene('Game');
await page.waitForTimeout(150);
state = await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.get());
assert.equal(state.sceneStackSize, 1);
assert.equal(state.activeBgmInstances, 1);
assert.deepEqual(state.actionCounts, { firebreak: 0, helicopter: 0, engine: 0 });
assert.equal(errors.length, 0, errors.join('\n'));

const report = { ok: true, assertions: 12, restored, finalState: state, browserErrors: errors };
await fs.writeFile('qa-captures/input-hostility-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify({ ok: true, assertions: report.assertions, result: 'qa-captures/input-hostility-results.json' }, null, 2));
