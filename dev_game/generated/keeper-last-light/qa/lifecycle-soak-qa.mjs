// 장시간 안정성 — 반복 플레이에서 트윈/타이머/오브젝트가 누적되지 않는가(결함 클래스 K).
import { openGame, LAYOUT, BASE_URL, finish } from './_helpers.mjs';

const { browser, page, browserErrors, rendererWarnings, waitScene, clickLogical, debug } = await openGame();
const assertions = {};
const samples = [];
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitScene('Home');

  // 5회 재시도 + 각 회차마다 배 생성/판정을 반복해 누수 신호를 본다.
  for (let round = 0; round < 5; round += 1) {
    await clickLogical(LAYOUT.play.x, LAYOUT.play.y);
    await waitScene('Game');
    await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__);
    for (let i = 0; i < 6; i += 1) {
      await page.evaluate(() => {
        const d = globalThis.__KEEPER_DEBUG__;
        d.forceShip('port-turn');
        d.typeCode(['s', 's', 'l']);   // 정답 → 항로 진입
      });
      await page.waitForTimeout(120);
    }
    const d = await debug();
    samples.push({
      round,
      activeTweens: d.activeTweens,
      activeTimers: d.activeTimers,
      poolSize: d.routing.poolSize,
      liveShips: d.routing.live,
      bgm: d.audio.instances,
    });
    await page.evaluate(() => globalThis.__KEEPER_DEBUG__.forceLose());
    await waitScene('GameOver');
    await clickLogical(LAYOUT.play.x, LAYOUT.play.y + 85 * 3); // HOME
    await waitScene('Home');
    await page.waitForTimeout(120);
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  // 풀은 고정 크기라 회차가 늘어도 커지지 않아야 한다.
  assertions.poolSizeStable = samples.every((s) => s.poolSize === first.poolSize);
  // 트윈/타이머가 회차마다 단조 증가하면 누수다. 2배 이내면 정상 변동으로 본다.
  assertions.tweensDoNotAccumulate = last.activeTweens <= Math.max(8, first.activeTweens * 2);
  assertions.timersDoNotAccumulate = last.activeTimers <= Math.max(8, first.activeTimers * 2);
  assertions.bgmNeverDuplicates = samples.every((s) => s.bgm <= 1);
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/lifecycle-soak-results.json', { ok, assertions, samples, browserErrors, rendererWarnings });
