// 지속성/세션 — 저장 복구, 손상된 저장소, visibility 전환(결함 클래스 J).
import { openGame, LAYOUT, BASE_URL, finish } from './_helpers.mjs';

const { browser, page, browserErrors, rendererWarnings, waitScene, clickLogical, debug } = await openGame();
const assertions = {};
let maxBgmInstances = 0;
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitScene('Home');

  await page.evaluate(() => localStorage.setItem('last-minute-keeper_settings', '{not json'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitScene('Home');
  assertions.corruptedStorageBoots = true;

  await clickLogical(LAYOUT.sound.x, LAYOUT.sound.y);
  await page.waitForTimeout(150);
  const muted = await page.evaluate(() => JSON.parse(localStorage.getItem('last-minute-keeper_settings') || '{}').mute);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitScene('Home');
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('last-minute-keeper_settings') || '{}').mute);
  assertions.settingsPersistAcrossReload = muted === persisted;

  for (let i = 0; i < 3; i += 1) {
    await clickLogical(LAYOUT.play.x, LAYOUT.play.y);
    await waitScene('Game');
    await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__);
    maxBgmInstances = Math.max(maxBgmInstances, (await debug()).audio.instances);
    await clickLogical(LAYOUT.pause.x, LAYOUT.pause.y);
    await page.waitForTimeout(150);
    await clickLogical(LAYOUT.homeFromPause.x, LAYOUT.homeFromPause.y);
    await waitScene('Home');
    await page.waitForTimeout(150);
  }
  assertions.bgmNeverDuplicates = maxBgmInstances <= 1;

  await clickLogical(LAYOUT.play.x, LAYOUT.play.y);
  await waitScene('Game');
  await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__);
  const before = (await debug()).director.stageElapsedMs;
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200);
  const after = (await debug()).director.stageElapsedMs;
  assertions.visibilityDeltaClamped = (after - before) < 3000;
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/session-continuity-results.json', { ok, assertions, maxBgmInstances, browserErrors, rendererWarnings });
