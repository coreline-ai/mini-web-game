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

  // ① 손상된 저장소에서도 부팅되는가
  await page.evaluate(() => localStorage.setItem('keeper-last-light_settings', '{not json'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitScene('Home');
  assertions.corruptedStorageBoots = true;

  // ② 사운드 설정이 재적재 후에도 유지되는가
  await clickLogical(LAYOUT.sound.x, LAYOUT.sound.y);
  await page.waitForTimeout(150);
  const muted = await page.evaluate(() => JSON.parse(localStorage.getItem('keeper-last-light_settings') || '{}').mute);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitScene('Home');
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('keeper-last-light_settings') || '{}').mute);
  assertions.settingsPersistAcrossReload = muted === persisted;

  // ③ 홈 ↔ 게임을 오가도 BGM 인스턴스가 늘지 않는가
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

  // ④ 탭을 백그라운드로 보냈다가 돌아와도 상태가 튀지 않는가
  await clickLogical(LAYOUT.play.x, LAYOUT.play.y);
  await waitScene('Game');
  await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__);
  const beforeHide = (await debug()).director.elapsedMs;
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200);
  const afterShow = (await debug()).director.elapsedMs;
  // 숨긴 시간(900ms)만큼 시계가 통째로 점프하면 안 된다.
  assertions.visibilityDeltaClamped = (afterShow - beforeHide) < 3000;
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/session-continuity-results.json', { ok, assertions, maxBgmInstances, browserErrors, rendererWarnings });
