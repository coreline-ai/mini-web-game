import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.FIREBREAK_QA_URL || process.env.GAME_QA_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:error: ${message.text()}`); });

const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
const getState = () => page.evaluate(() => globalThis.__FIREBREAK_DEBUG__?.get());
const clickLogical = async (x, y) => {
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + x * canvas.width / 390, canvas.y + y * canvas.height / 844);
};
const dragLogical = async (x1, y1, x2, y2, steps = 12) => {
  const canvas = await page.locator('canvas').boundingBox();
  const sx = canvas.x + x1 * canvas.width / 390;
  const sy = canvas.y + y1 * canvas.height / 844;
  const ex = canvas.x + x2 * canvas.width / 390;
  const ey = canvas.y + y2 * canvas.height / 844;
  await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(ex, ey, { steps }); await page.mouse.up();
};
const check = (condition, message) => { if (!condition) throw new Error(message); };

await fs.mkdir('qa-captures', { recursive: true });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await waitScene('Home');
await page.screenshot({ path: 'qa-captures/home-graybox.png' });

// The main CTA starts the response immediately; FIELD BRIEFING is the explicit
// tutorial route and is exercised here before entering the live stage.
await clickLogical(195, 744);
await waitScene('Tutorial');
await page.screenshot({ path: 'qa-captures/tutorial-graybox.png' });
await clickLogical(195, 715);
await waitScene('Game');
await page.waitForTimeout(120);
const initial = await getState();
await page.screenshot({ path: 'qa-captures/game-initial-graybox.png' });

await clickLogical(68, 778);
await dragLogical(33, 278, 105, 278);
const afterLine = await getState();
check(afterLine.firebreakCells === 3, `expected 3 firebreak cells, got ${afterLine.firebreakCells}`);
check(afterLine.fuel === initial.fuel - 9, `firebreak fuel mismatch ${initial.fuel} -> ${afterLine.fuel}`);
await page.screenshot({ path: 'qa-captures/firebreak-committed-graybox.png' });

await clickLogical(195, 778);
await clickLogical(141, 206);
const afterHeli = await getState();
check(afterHeli.water === afterLine.water - 20, `helicopter water mismatch ${afterLine.water} -> ${afterHeli.water}`);
check(afterHeli.fuel === afterLine.fuel - 8, `helicopter fuel mismatch ${afterLine.fuel} -> ${afterHeli.fuel}`);

await clickLogical(322, 778);
await clickLogical(33, 530);
const afterEngine = await getState();
check(afterEngine.fuel === afterHeli.fuel - 10, `engine fuel mismatch ${afterHeli.fuel} -> ${afterEngine.fuel}`);
check(afterEngine.engines.length === 1, `expected 1 engine, got ${afterEngine.engines.length}`);
await page.screenshot({ path: 'qa-captures/actions-combined-graybox.png' });

await clickLogical(322, 778);
const invalidBefore = await getState();
await clickLogical(213, 422); // grass, not a road
const invalidAfter = await getState();
check(invalidAfter.fuel === invalidBefore.fuel, 'invalid engine placement consumed fuel');
check(invalidAfter.engines.length === invalidBefore.engines.length, 'invalid engine placement created an engine');

await clickLogical(358, 54);
await waitScene('Pause');
const pausedBefore = await getState();
await page.waitForTimeout(700);
const pausedAfter = await getState();
check(pausedBefore.simTick === pausedAfter.simTick, `simulation advanced while paused ${pausedBefore.simTick} -> ${pausedAfter.simTick}`);
await page.screenshot({ path: 'qa-captures/pause-graybox.png' });
await clickLogical(195, 405);
await waitScene('Game');

await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.forceLose());
await waitScene('GameOver');
await page.screenshot({ path: 'qa-captures/gameover-graybox.png' });
await clickLogical(195, 670);
await waitScene('Game');
const retry = await getState();
check(retry.sceneStackSize === 1, `retry scene stack expected 1, got ${retry.sceneStackSize}`);
check(retry.activeBgmInstances === 1, `retry BGM expected 1, got ${retry.activeBgmInstances}`);

await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.forceWin());
await waitScene('GameOver');
await page.screenshot({ path: 'qa-captures/win-graybox.png' });

const results = {
  ok: errors.length === 0,
  viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  initial, afterLine, afterHeli, afterEngine, invalidBefore, invalidAfter, pausedBefore, pausedAfter, retry, errors,
};
await fs.writeFile('qa-captures/interaction-results-graybox.json', `${JSON.stringify(results, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify({ ok: results.ok, assertions: 11, errors, result: 'qa-captures/interaction-results-graybox.json' }, null, 2));
if (!results.ok) process.exitCode = 1;
