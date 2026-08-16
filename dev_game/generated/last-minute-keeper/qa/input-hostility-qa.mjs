// 입력 견고성 — 적대적 입력으로도 상태가 깨지지 않는가(결함 클래스 I).
// 이 게임에서는 조작 두 층(드래그/플릭)의 구분이 무너지지 않는지도 함께 본다.
import { openGame, LAYOUT, CANVAS, BASE_URL, finish } from './_helpers.mjs';

const { browser, page, browserErrors, rendererWarnings, waitScene, clickLogical, dragLogical, debug } = await openGame();
const assertions = {};
let finalState = {};
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitScene('Home');

  // ① PLAY 연타 — one-shot 버튼이 씬을 두 번 시작하면 안 된다
  for (let i = 0; i < 5; i += 1) await clickLogical(LAYOUT.play.x, LAYOUT.play.y);
  await waitScene('Game');
  await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__);
  const stack = await page.evaluate(() => globalThis.__GAME__.scene.scenes.filter((s) => s.scene.isActive()).length);
  assertions.playSpamDoesNotStackScenes = stack === 1;

  // ② 느린 드래그는 다이브가 아니라 이동이어야 한다 (두 층 구분의 핵심)
  const before = (await debug()).keeper.x;
  await dragLogical(CANVAS.width * 0.5, LAYOUT.playfield.y, CANVAS.width * 0.28, LAYOUT.playfield.y, 30);
  await page.waitForTimeout(320);
  const slow = await debug();
  assertions.slowDragMovesWithoutDiving = slow.keeper.pose === 'ready' && Math.abs(slow.keeper.x - before) > 40;

  // ③ 빠른 플릭은 다이브여야 한다
  await page.waitForTimeout(700); // 이전 상태 정리
  await dragLogical(CANVAS.width * 0.4, LAYOUT.playfield.y, CANVAS.width * 0.75, LAYOUT.playfield.y, 1);
  await page.waitForTimeout(80);
  const flick = await debug();
  assertions.fastFlickTriggersDive = flick.control.locked === true;

  // ④ 다이브 회복 중에는 드래그가 무시되어야 한다 — 커밋의 대가가 실질적이어야 한다
  const lockedX = (await debug()).keeper.x;
  await dragLogical(CANVAS.width * 0.75, LAYOUT.playfield.y, CANVAS.width * 0.2, LAYOUT.playfield.y, 30);
  await page.waitForTimeout(120);
  const during = await debug();
  assertions.recoveryIgnoresDrag = during.control.locked
    ? Math.abs(during.keeper.x - lockedX) < 260 : true;

  // ⑤ 일시정지 ↔ 재개 연타
  await page.waitForTimeout(800);
  for (let i = 0; i < 5; i += 1) {
    await clickLogical(LAYOUT.pause.x, LAYOUT.pause.y);
    await page.waitForTimeout(120);
    await clickLogical(LAYOUT.resume.x, LAYOUT.resume.y);
    await page.waitForTimeout(120);
  }
  await waitScene('Game');
  const stack2 = await page.evaluate(() => globalThis.__GAME__.scene.scenes.filter((s) => s.scene.isActive()).length);
  assertions.pauseResumeSpamKeepsSingleScene = stack2 === 1;

  const d = await debug();
  finalState = {
    sceneStackSize: stack2,
    activeBgmInstances: d.audio.instances,
    activeTweens: d.activeTweens,
  };
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/input-hostility-results.json', { ok, assertions, finalState, browserErrors, rendererWarnings });
