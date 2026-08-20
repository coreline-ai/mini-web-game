import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { browserLaunchArgs } from './_browser-args.mjs';

const baseUrl = process.env.GAME_QA_URL || 'http://127.0.0.1:5187';
const qaUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}skipTutorial=1`;
const browser = await chromium.launch({ headless: true, args: browserLaunchArgs() });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await context.newPage();
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
const clickLogical = async (x, y) => { const c = await page.locator('canvas').boundingBox(); await page.mouse.click(c.x + x * c.width / 390, c.y + y * c.height / 844); };
const pointerLogical = async (x, y, hold = 35) => {
  const c = await page.locator('canvas').boundingBox();
  await page.mouse.move(c.x + x * c.width / 390, c.y + y * c.height / 844);
  await page.mouse.down(); await page.waitForTimeout(hold); await page.mouse.up();
};

await page.goto(qaUrl, { waitUntil: 'domcontentloaded' });
await waitScene('Home'); await clickLogical(195, 625); await waitScene('Briefing');
await clickLogical(195, 766); await waitScene('Game'); await page.waitForTimeout(200);
const cdp = await context.newCDPSession(page);
const canvasBox = await page.locator('canvas').boundingBox();
const touchPoint = (id, x, y) => ({ id, x: canvasBox.x + x * canvasBox.width / 390, y: canvasBox.y + y * canvasBox.height / 844, radiusX: 2, radiusY: 2, force: 1 });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(1, 195, 472), touchPoint(2, 104, 782)] });
await page.waitForTimeout(420);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touchPoint(1, 250, 442), touchPoint(2, 104, 782)] });
await page.waitForTimeout(140);
const dualPointerState = await page.evaluate(() => {
  const scene = globalThis.__GAME__.scene.getScene('Game');
  return { aimX: scene.aim.x, aimY: scene.aim.y, aimPointerOwned: scene.aim.pointerId !== null, shots: scene.weapon.shots, gunHeld: scene.weapon.gunHeld };
});
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(100);
await clickLogical(195, 430);
for (let i = 0; i < 12; i += 1) await pointerLogical(104, 782, 28);
for (let i = 0; i < 10; i += 1) await pointerLogical(286, 782, 45);
for (let i = 0; i < 10; i += 1) {
  await clickLogical(354, 79); await waitScene('Pause');
  await clickLogical(195, 414); await waitScene('Game');
}
const visibilityState = await page.evaluate(() => {
  const scene = globalThis.__GAME__.scene.getScene('Game');
  const before = scene.elapsed;
  scene.update(scene.time.now + 5000, 5000);
  const deltaClamped = scene.elapsed - before <= 0.051;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  return { deltaClamped };
});
await waitScene('Pause');
await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }));
await clickLogical(195, 414); await waitScene('Game');
await page.waitForTimeout(350);
const finalState = await page.evaluate(() => {
  const game = globalThis.__GAME__; const scene = game.scene.getScene('Game');
  return {
    sceneStackSize: game.scene.getScenes(true).length,
    activeScenes: game.scene.getScenes(true).map((entry) => entry.scene.key),
    activeBgmInstances: (game.sound?.sounds || []).filter((sound) => sound.key === 'music_gameplay' && (sound.isPlaying || sound.isPaused)).length,
    ammo: scene.weapon.ammo, gunHeld: scene.weapon.gunHeld, missileHeld: scene.weapon.missileHeld,
    rotorInstances: (game.sound?.sounds || []).filter((sound) => sound.key === 'rotor_loop' && (sound.isPlaying || sound.isPaused)).length,
  };
});
const assertions = {
  rapidGunReleaseStops: finalState.gunHeld === false,
  dualPointerAimAndGun: dualPointerState.aimPointerOwned && dualPointerState.shots > 0 && dualPointerState.gunHeld && dualPointerState.aimX > 230,
  incompleteMissilesDoNotConsumeAmmo: finalState.ammo === 4,
  missileReleaseStops: finalState.missileHeld === false,
  sceneStackStable: finalState.sceneStackSize === 1 && finalState.activeScenes[0] === 'Game',
  singleBgm: finalState.activeBgmInstances <= 1,
  tenPauseResumeCyclesStable: finalState.activeBgmInstances <= 1 && finalState.rotorInstances <= 1,
  visibilityAutoPauseAndDeltaClamp: visibilityState.deltaClamped === true,
};
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
const report = { ok, assertions, browserErrors, dualPointerState, visibilityState, finalState };
await fs.mkdir('qa-captures', { recursive: true });
await fs.writeFile('qa-captures/input-hostility-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;
