// capture-driver.mjs — 선언된 각 state를 결정적으로 만든다.
//
// 좌표 클릭 대신 디버그 훅으로 상태를 만드는 것이 원칙이다. 좌표는 레이아웃이 조금만
// 바뀌어도 깨지고, 타이밍 의존 캡처는 산발적으로 실패해 증거로서 신뢰할 수 없다.
// 다만 "PLAY를 눌러 게임에 들어간다" 같은 전이는 실제 입력 경로를 지나야 의미가 있으므로
// 그것만 클릭한다.

// clickLogical은 **논리 캔버스 좌표**(1170x2532)를 받는다. 디자인 단위(390x844)로 적으면
// 화면 좌상단만 계속 누르게 되어 아무 일도 일어나지 않는다 — 실제로 겪은 함정이다.
const U = 3; // 1170 / 390
const CANVAS = { width: 390 * U, height: 844 * U };
const PLAY = { x: CANVAS.width / 2, y: CANVAS.height * 0.665 };
const HELP_BTN = { x: CANVAS.width - 38 * U, y: (52 + 66) * U };
const PAUSE_BTN = { x: CANVAS.width - 38 * U, y: 52 * U };

async function enterGame(page, { clickLogical, waitScene }) {
  if (await page.evaluate(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === 'Game')) return;
  await clickLogical(PLAY.x, PLAY.y);
  await waitScene('Game');
  await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__, { timeout: 10_000 });
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

    case 'game-stage-1':
      await freshGame(page, helpers);
      // 스테이지 1은 동시 대기 1척이 정상이다. 자연 등장을 기다린다 — 강제로 더 세우면
      // 실제 플레이에 없는 화면이 증거로 남는다.
      await page.waitForFunction(() => globalThis.__KEEPER_DEBUG__?.waitingCount() >= 1, { timeout: 15_000 });
      return;

    case 'game-typing':
      // 판정 대상 배의 정답 코드 앞 2펄스를 친 상태. 임의 펄스를 넣으면 오답 처리로
      // 버퍼가 비워져 "입력 중"이 아니라 빈 패널이 찍힌다.
      await page.waitForFunction(() => globalThis.__KEEPER_DEBUG__?.waitingCount() >= 1, { timeout: 15_000 });
      await page.evaluate(() => globalThis.__KEEPER_DEBUG__.typePrefix(2));
      await page.waitForFunction(() => {
        const g = globalThis.__GAME__.scene.getScene('Game');
        return (g?.bufferText?.text || '').length > 0;
      }, { timeout: 5_000 });
      return;

    case 'game-stage-3':
      await page.evaluate(() => {
        const d = globalThis.__KEEPER_DEBUG__;
        d.setStage(3);
        // 스테이지 3은 동시 대기 3척이 정상 상태다 — 혼잡한 화면이 캡처에 남아야
        // 항로 겹침 같은 구도 결함을 다음 세션이 눈으로 잡을 수 있다.
        d.forceShip('enter-harbour');
        d.forceShip('rock-warning');
        d.forceShip('starboard-turn');
        d.typePrefix(1);
      });
      await page.waitForTimeout(760); // 배경 크로스페이드 완료
      return;

    case 'help':
      await clickLogical(HELP_BTN.x, HELP_BTN.y);
      await waitScene('Pause');
      return;

    case 'pause':
      // 도움말에서 복귀한 뒤 일시정지를 연다 — 오버레이 복귀 경로도 함께 지난다.
      await page.evaluate(() => {
        const game = globalThis.__GAME__;
        const pause = game.scene.getScene('Pause');
        pause?.scene.stop();
        game.scene.getScene('Game')?.resumeFromOverlay?.();
        game.scene.resume('Game');
      });
      await waitScene('Game');
      await clickLogical(PAUSE_BTN.x, PAUSE_BTN.y);
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
