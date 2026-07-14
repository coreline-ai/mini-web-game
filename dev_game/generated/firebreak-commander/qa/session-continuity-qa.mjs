import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.FIREBREAK_QA_URL || process.env.GAME_QA_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
const clickLogical = async (x, y) => { const canvas = await page.locator('canvas').boundingBox(); await page.mouse.click(canvas.x + x * canvas.width / 390, canvas.y + y * canvas.height / 844); };

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await waitScene('Home');

// Corrupted JSON must recover to defaults without blocking boot.
await page.evaluate(() => {
  localStorage.setItem('firebreak-commander_settings', '{not-json');
  localStorage.setItem('firebreak-commander_best', '12345');
});
await page.reload({ waitUntil: 'domcontentloaded' });
await waitScene('Home');
let home = await page.evaluate(() => { const s = globalThis.__GAME__.scene.getScene('Home'); return { sound: s.soundBtn.txt.text, best: s.bestText.text }; });
assert.equal(home.sound, '소리 켜짐');
assert.ok(home.best.includes('12345'));

// Valid settings and best score must survive reload.
await page.evaluate(() => localStorage.setItem('firebreak-commander_settings', JSON.stringify({ mute: true, tutorialSeen: true, clarityCoachVersion: 1 })));
await page.reload({ waitUntil: 'domcontentloaded' });
await waitScene('Home');
home = await page.evaluate(() => { const s = globalThis.__GAME__.scene.getScene('Home'); return { sound: s.soundBtn.txt.text, best: s.bestText.text }; });
assert.equal(home.sound, '소리 꺼짐');
assert.ok(home.best.includes('12345'));

// Unmute for audio lifecycle sweep.
await page.evaluate(() => localStorage.setItem('firebreak-commander_settings', JSON.stringify({ mute: false, tutorialSeen: true, clarityCoachVersion: 1 })));
await page.reload({ waitUntil: 'domcontentloaded' });
await waitScene('Home');
const audioSamples = [];
for (let cycle = 1; cycle <= 3; cycle += 1) {
  audioSamples.push({ cycle, scene: 'Home', ...(await page.evaluate(() => globalThis.__AUDIO_DEBUG__())) });
  await clickLogical(195, 660);
  await waitScene('Game');
  audioSamples.push({ cycle, scene: 'Game', ...(await page.evaluate(() => globalThis.__AUDIO_DEBUG__())) });
  await clickLogical(356, 50);
  await waitScene('Pause');
  audioSamples.push({ cycle, scene: 'Pause', ...(await page.evaluate(() => globalThis.__AUDIO_DEBUG__())) });
  await clickLogical(195, 498);
  await waitScene('Home');
  audioSamples.push({ cycle, scene: 'HomeReturn', ...(await page.evaluate(() => globalThis.__AUDIO_DEBUG__())) });
}
assert.ok(audioSamples.every((sample) => sample.instances <= 1));
assert.ok(audioSamples.filter((sample) => sample.scene === 'Pause').every((sample) => sample.isPaused && !sample.isPlaying));
assert.ok(audioSamples.filter((sample) => sample.scene === 'Game').every((sample) => sample.key === 'music_gameplay' && sample.isPlaying));
assert.ok(audioSamples.filter((sample) => sample.scene.startsWith('Home')).every((sample) => sample.key === 'music_home' && sample.isPlaying));

// Resize must republish a complete, in-bounds registry.
await page.setViewportSize({ width: 430, height: 932 });
await page.waitForTimeout(120);
const resize = await page.evaluate(() => {
  const layout = globalThis.__GAME_LAYOUT_BOUNDS__;
  const ids = new Set(layout.items.filter((item) => item.visible).map((item) => item.id));
  return { scene: layout.scene, missing: (layout.requiredIds || []).filter((id) => !ids.has(id)), items: layout.items.length };
});
assert.equal(resize.scene, 'Home');
assert.deepEqual(resize.missing, []);
assert.ok(resize.items > 0);
assert.equal(browserErrors.length, 0, browserErrors.join('\n'));

const maxBgmInstances = Math.max(...audioSamples.map((sample) => sample.instances));
const report = { ok: true, assertions: 15, corruptedStorageRecovered: true, persistence: home, audioSamples, maxBgmInstances, resize, browserErrors };
await fs.writeFile('qa-captures/session-continuity-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify({ ok: true, assertions: report.assertions, maxBgmInstances, result: 'qa-captures/session-continuity-results.json' }, null, 2));
