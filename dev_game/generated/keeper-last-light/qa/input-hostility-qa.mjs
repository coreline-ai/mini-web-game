// 입력 견고성 — 적대적 입력으로도 상태가 깨지지 않는가(결함 클래스 I).
import { openGame, LAYOUT, BASE_URL, finish } from './_helpers.mjs';

const { browser, page, browserErrors, rendererWarnings, waitScene, clickLogical, pressLogical, debug } = await openGame();
const assertions = {};
let finalState = {};
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitScene('Home');

  // ① PLAY 연타 — one-shot 버튼이 씬을 두 번 시작하면 안 된다
  const box = await page.locator('canvas').boundingBox();
  const toX = (x) => box.x + x * box.width / (390 * 3);
  const toY = (y) => box.y + y * box.height / (844 * 3);
  for (let i = 0; i < 5; i += 1) await page.mouse.click(toX(LAYOUT.play.x), toY(LAYOUT.play.y), { delay: 5 });
  await waitScene('Game');
  await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__);
  const stack = await page.evaluate(() => globalThis.__GAME__.scene.scenes.filter((s) => s.scene.isActive()).length);
  assertions.playSpamDoesNotStackScenes = stack === 1;

  // ② 멀티터치 — 두 손가락으로 램프를 동시에 눌러도 펄스는 하나만 들어가야 한다
  await page.evaluate(() => globalThis.__KEEPER_DEBUG__.forceShip('port-turn'));
  const before = (await debug()).input.buffer.length;
  await page.touchscreen?.tap?.(toX(LAYOUT.lamp.x), toY(LAYOUT.lamp.y)).catch(() => {});
  await page.mouse.move(toX(LAYOUT.lamp.x), toY(LAYOUT.lamp.y));
  await page.mouse.down();
  await page.mouse.down(); // 두 번째 포인터 흉내 — 무시되어야 한다
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(60);
  const afterMulti = (await debug()).input.buffer.length;
  assertions.multiPointerAddsAtMostOnePulse = afterMulti - before <= 1;

  // ③ 일시정지 ↔ 재개 연타 — 씬 스택이 늘거나 입력이 새면 안 된다
  for (let i = 0; i < 6; i += 1) {
    await clickLogical(LAYOUT.pause.x, LAYOUT.pause.y);
    await page.waitForTimeout(120);
    await clickLogical(LAYOUT.resume.x, LAYOUT.resume.y);
    await page.waitForTimeout(120);
  }
  await waitScene('Game');
  const stack2 = await page.evaluate(() => globalThis.__GAME__.scene.scenes.filter((s) => s.scene.isActive()).length);
  assertions.pauseResumeSpamKeepsSingleScene = stack2 === 1;

  // ④ 일시정지 중 램프 입력이 새지 않는가
  await clickLogical(LAYOUT.pause.x, LAYOUT.pause.y);
  await page.waitForTimeout(150);
  const bufBefore = (await debug()).input.buffer.length;
  await pressLogical(LAYOUT.lamp.x, LAYOUT.lamp.y, 60);
  await page.waitForTimeout(120);
  const bufAfter = (await debug()).input.buffer.length;
  assertions.overlayBlocksGameplayInput = bufAfter === bufBefore;
  await clickLogical(LAYOUT.resume.x, LAYOUT.resume.y);
  await waitScene('Game');

  const d = await debug();
  finalState = {
    sceneStackSize: await page.evaluate(() => globalThis.__GAME__.scene.scenes.filter((s) => s.scene.isActive()).length),
    activeBgmInstances: d.audio.instances,
    activeTweens: d.activeTweens,
  };
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/input-hostility-results.json', { ok, assertions, finalState, browserErrors, rendererWarnings });
