// 장시간 안정성 — 반복 플레이에서 트윈/타이머/오브젝트가 누적되지 않는가(결함 클래스 K).
// 공 풀이 고정 크기라 상한이 구조적으로 보장되는지도 함께 본다.
import { openGame, BASE_URL, finish } from './_helpers.mjs';

const { browser, page, browserErrors, rendererWarnings, waitScene, clickId, clickLogical, debug } = await openGame();
const assertions = {};
const samples = [];
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitScene('Home');

  for (let round = 0; round < 5; round += 1) {
    await clickId('play');
    await waitScene('Game');
    await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__);
    for (let i = 0; i < 6; i += 1) {
      // page.evaluate는 별도 컨텍스트에서 실행되므로 바깥 스코프의 i를 볼 수 없다 — 인자로 넘긴다.
      await page.evaluate((dir) => {
        const d = globalThis.__KEEPER_DEBUG__;
        d.forceShot('drive', { fromX: 0.5, toX: 0.5, progress: 0.9 });
        d.forceDive(dir);
      }, i % 2 === 0 ? 1 : -1);
      await page.waitForTimeout(160);
    }
    const d = await debug();
    samples.push({
      round,
      activeTweens: d.activeTweens,
      activeTimers: d.activeTimers,
      ballPool: d.balls.length,
      liveBalls: d.liveBalls,
      bgm: d.audio.instances,
    });
    await page.evaluate(() => globalThis.__KEEPER_DEBUG__.forceLose());
    await waitScene('GameOver');
    // GameOver → Home → PLAY로 한 바퀴를 돈다. 홈을 거쳐야 씬 스택 정리와 BGM 재시작까지
    // 함께 검사된다. (좌표 추정 시절 이 클릭은 "play.y + 85*3"이었고, 무엇을 노린 것인지
    // 코드만 보고는 알 수 없었다 — id로 부르면 의도가 드러난다.)
    await clickId('home');
    await waitScene('Home');
    await page.waitForTimeout(140);
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  assertions.ballPoolStable = samples.every((s) => s.ballPool === first.ballPool);
  assertions.tweensDoNotAccumulate = last.activeTweens <= Math.max(10, first.activeTweens * 2);
  assertions.timersDoNotAccumulate = last.activeTimers <= Math.max(10, first.activeTimers * 2);
  assertions.bgmNeverDuplicates = samples.every((s) => s.bgm <= 1);
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/lifecycle-soak-results.json', { ok, assertions, samples, browserErrors, rendererWarnings });
