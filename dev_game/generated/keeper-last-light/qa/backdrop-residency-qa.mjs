// 배경 상주량과 온디맨드 도착 (회귀 체크리스트 R17).
//
// 왜 기계로 재는가: 배경은 1장이 디코드 17.1MiB다. 5장을 상주시키면 85MiB이고, 메모리 압력이
// 있는 환경에서 뒤따라 뜨는 브라우저가 부팅하지 못한다(실측 2026-08-20: 게이트 인접쌍 3/8,
// 실패 서명 `registry still reports "(none)"`). 상주량은 눈으로 볼 수 없으므로 값으로 잰다.
//
// 함께 재는 것: 선로드를 없앤 대가로 (1) 스테이지 배경이 제때 도착하는지, (2) 종료 화면이
// 배경을 잃지 않는지. 둘은 이 수정의 회귀 지점이다.
import { openGame, BASE_URL, finish, LAYOUT } from './_helpers.mjs';

const { browser, page, browserErrors, rendererWarnings, waitScene, clickLogical } = await openGame();
const assertions = {};
const observed = {};

const residentBg = () => page.evaluate(() => Object.keys(globalThis.__GAME__.textures.list)
  .filter((k) => /^bg_\d+$/.test(k)).sort());
const backdropKey = () => page.evaluate(() => globalThis.__GAME__.scene.getScene('Game')?.backdrop?.texture?.key ?? null);

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitScene('Home');
  observed.homeResident = await residentBg();
  assertions.homeResidentAtMostTwo = observed.homeResident.length <= 2;

  await clickLogical(LAYOUT.play.x, LAYOUT.play.y);
  await waitScene('Game');
  observed.stage1Resident = await residentBg();
  observed.stage1Backdrop = await backdropKey();
  assertions.stage1ResidentAtMostTwo = observed.stage1Resident.length <= 2;
  assertions.stage1UsesFirstBackdrop = observed.stage1Backdrop === 'bg_0';

  // 온디맨드 도착: 스테이지 3의 배경(bg_2)은 선로드돼 있지 않다.
  await page.evaluate(() => globalThis.__KEEPER_DEBUG__.setStage(2));
  await page.waitForTimeout(1200);
  await page.evaluate(() => globalThis.__KEEPER_DEBUG__.setStage(3));
  await page.waitForFunction(
    () => globalThis.__GAME__.scene.getScene('Game')?.backdrop?.texture?.key === 'bg_2',
    null, { timeout: 10000 },
  ).catch(() => {});
  observed.stage3Resident = await residentBg();
  observed.stage3Backdrop = await backdropKey();
  assertions.stage3BackdropArrived = observed.stage3Backdrop === 'bg_2';
  assertions.stage3ResidentBounded = observed.stage3Resident.length <= 4;

  // 종료 화면: 전용 배경(bg_3)이 없으면 올라온 배경으로 대체돼야 한다.
  await page.evaluate(() => globalThis.__KEEPER_DEBUG__.forceLose());
  await waitScene('GameOver');
  observed.gameOverBackdrops = await page.evaluate(() => {
    const scene = globalThis.__GAME__.scene.getScene('GameOver');
    return (scene?.children?.list || [])
      .filter((c) => c.texture && /^bg_\d+$/.test(c.texture.key))
      .map((c) => c.texture.key);
  });
  assertions.gameOverHasBackdrop = observed.gameOverBackdrops.length >= 1;
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}

const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/backdrop-residency-results.json', { ok, assertions, observed, browserErrors, rendererWarnings });
