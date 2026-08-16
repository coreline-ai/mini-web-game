// capture-driver.mjs — 선언된 각 state를 결정적으로 만든다.
//
// 좌표 클릭 대신 디버그 훅으로 상태를 만드는 것이 원칙이다. 다만 "PLAY를 눌러 들어간다"
// 같은 전이는 실제 입력 경로를 지나야 의미가 있으므로 그것만 클릭한다.
//
// **캡처는 실제 도달 가능한 상태만 담는다.** forceShot이 스테이지 동시 공 상한을 지키므로
// 실제 플레이에 없는 화면이 증거로 남지 않는다.

import { LAYOUT } from './_helpers.mjs';

async function enterGame(page, { clickLogical, waitScene }) {
  if (await page.evaluate(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === 'Game')) return;
  await clickLogical(LAYOUT.play.x, LAYOUT.play.y);
  await waitScene('Game');
  await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__, { timeout: 15_000 });
}

async function freshGame(page, helpers) {
  await page.goto(helpers.baseUrl, { waitUntil: 'domcontentloaded' });
  await helpers.waitScene('Home');
  await enterGame(page, helpers);
}

export async function prepareState(page, state, helpers) {
  const { baseUrl, waitScene, clickLogical } = helpers;

  switch (state.id) {
    case 'home':
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => { try { localStorage.clear(); } catch {} });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitScene('Home');
      return;

    case 'game-flight':
      await freshGame(page, helpers);
      // 공이 **비행 중**인 순간을 잡는다. 정지 화면이 증거로 남으면 이 게임의 요구사항
      // ("정적이지 않을 것")을 검증할 수 없다.
      await page.evaluate(() => globalThis.__KEEPER_DEBUG__.forceShot('drive', { fromX: 0.42, toX: 0.34, progress: 0.55 }));
      await page.waitForFunction(() => globalThis.__KEEPER_DEBUG__.liveBalls() >= 1, { timeout: 5000 });
      return;

    case 'game-dive':
      await page.evaluate(() => {
        const d = globalThis.__KEEPER_DEBUG__;
        d.forceDive(-1);
      });
      await page.waitForTimeout(140);
      return;

    case 'game-rebound':
      await page.evaluate(() => {
        const d = globalThis.__KEEPER_DEBUG__;
        d.forceShot('drive', { fromX: 0.6, toX: 0.55, progress: 0.9 });
        d.forceRebound();
      });
      await page.waitForTimeout(160);
      return;

    case 'game-stage-3':
      await page.evaluate(() => {
        const d = globalThis.__KEEPER_DEBUG__;
        d.setStage(3);
        // 스테이지 3은 동시 공 2개가 정상이다 — 혼잡한 화면이 증거로 남아야 한다.
        d.forceShot('bender', { fromX: 0.32, toX: 0.7, progress: 0.4 });
        d.forceShot('header', { fromX: 0.68, toX: 0.3, progress: 0.65 });
      });
      await page.waitForTimeout(760);
      return;

    case 'help':
      await clickLogical(LAYOUT.help.x, LAYOUT.help.y);
      await waitScene('Pause');
      return;

    case 'pause':
      await page.evaluate(() => {
        const game = globalThis.__GAME__;
        game.scene.getScene('Pause')?.scene.stop();
        game.scene.getScene('Game')?.resumeFromOverlay?.();
        game.scene.resume('Game');
      });
      await waitScene('Game');
      await clickLogical(LAYOUT.pause.x, LAYOUT.pause.y);
      await waitScene('Pause');
      return;

    case 'result-win':
      await freshGame(page, helpers);
      await page.evaluate(() => globalThis.__KEEPER_DEBUG__.forceWin());
      await waitScene('GameOver');
      return;

    case 'result-loss':
      await freshGame(page, helpers);
      await page.evaluate(() => globalThis.__KEEPER_DEBUG__.forceLose());
      await waitScene('GameOver');
      return;

    default:
      throw new Error(`Unknown capture state: ${state.id}`);
  }
}
