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
const clickLogical = async (x, y) => {
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + x * canvas.width / 390, canvas.y + y * canvas.height / 844);
};
const shot = async (name) => page.screenshot({ path: `qa-captures/${name}.png` });

await fs.mkdir('qa-captures', { recursive: true });
await page.goto(`${baseUrl}?qaHoldLoading=1`, { waitUntil: 'domcontentloaded' });
await waitScene('Loading');
await shot('loading-final');
await page.evaluate(() => globalThis.__RELEASE_LOADING__());
await waitScene('Home');
await shot('home-final');
await clickLogical(195, 744);
await waitScene('Tutorial');
await shot('tutorial-final');
await clickLogical(195, 715);
await waitScene('Game');

await page.evaluate(() => {
  const api = globalThis.__FIREBREAK_DEBUG__;
  const lines = [
    [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }],
    [{ x: 8, y: 3 }, { x: 9, y: 3 }],
    [{ x: 8, y: 6 }, { x: 9, y: 6 }],
    Array.from({ length: 10 }, (_, x) => ({ x, y: 8 })),
  ];
  for (const line of lines) { api.previewFirebreak(line); api.commitFirebreak(); }
});
await shot('game-phase-1-dry-front');
await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.advanceTicks(121));
await page.waitForTimeout(800);
await shot('game-phase-2-wind-shift');
await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.advanceTicks(120));
await page.waitForTimeout(800);
await shot('game-phase-3-ember-night');
await clickLogical(356, 56);
await waitScene('Pause');
await shot('pause-final');
await clickLogical(195, 405);
await waitScene('Game');
await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.forceWin());
await waitScene('GameOver');
await shot('result-win-final');
await clickLogical(195, 670);
await waitScene('Game');
await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.forceLose());
await waitScene('GameOver');
await shot('result-loss-final');

const report = {
  ok: errors.length === 0,
  captures: [
    'loading-final.png', 'home-final.png', 'tutorial-final.png',
    'game-phase-1-dry-front.png', 'game-phase-2-wind-shift.png', 'game-phase-3-ember-night.png',
    'pause-final.png', 'result-win-final.png', 'result-loss-final.png',
  ],
  errors,
};
await fs.writeFile('qa-captures/capture-suite-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
