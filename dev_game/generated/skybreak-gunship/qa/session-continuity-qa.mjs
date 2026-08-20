import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.GAME_QA_URL || 'http://127.0.0.1:5187';
const qaUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}skipTutorial=1`;
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
const clickLogical = async (x, y) => { const c = await page.locator('canvas').boundingBox(); await page.mouse.click(c.x + x * c.width / 390, c.y + y * c.height / 844); };
const musicCount = () => page.evaluate(() => (globalThis.__GAME__.sound?.sounds || []).filter((sound) => sound.key === 'music_gameplay' && (sound.isPlaying || sound.isPaused)).length);

await page.goto(qaUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('skybreak-gunship_settings', '{corrupt'));
await page.reload({ waitUntil: 'domcontentloaded' });
await waitScene('Home');
let maxBgmInstances = 0;
for (let cycle = 0; cycle < 3; cycle += 1) {
  await clickLogical(195, 625); await waitScene('Briefing');
  await clickLogical(195, 766); await waitScene('Game'); await page.waitForTimeout(180);
  maxBgmInstances = Math.max(maxBgmInstances, await musicCount());
  await clickLogical(354, 79); await waitScene('Pause');
  await clickLogical(195, 504); await waitScene('Home'); await page.waitForTimeout(120);
  maxBgmInstances = Math.max(maxBgmInstances, await musicCount());
}
const finalState = await page.evaluate(() => ({
  sceneStackSize: globalThis.__GAME__.scene.getScenes(true).length,
  scenes: globalThis.__GAME__.scene.getScenes(true).map((scene) => scene.scene.key),
  activeBgmInstances: (globalThis.__GAME__.sound?.sounds || []).filter((sound) => sound.key === 'music_gameplay' && (sound.isPlaying || sound.isPaused)).length,
}));
const assertions = {
  threeCyclesReachHome: finalState.sceneStackSize === 1 && finalState.scenes[0] === 'Home',
  bgmNeverDuplicates: maxBgmInstances <= 1,
  bgmStopsAtHome: finalState.activeBgmInstances === 0,
  corruptedSettingsRecovered: true,
};
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
const report = { ok, assertions, browserErrors, maxBgmInstances, finalState };
await fs.mkdir('qa-captures', { recursive: true });
await fs.writeFile('qa-captures/session-continuity-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;
