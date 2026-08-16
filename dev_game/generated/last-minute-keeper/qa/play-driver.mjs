// 봇 드라이버 — 프로파일 하나를 지정된 시간만큼 플레이하고 성적을 돌려준다.
//
// 드라이버는 게임 내부를 직접 조작한다(포인터 이벤트가 아니라 control.targetX). 입력 계층의
// 견고성은 input-hostility-qa가 따로 보고, 여기서는 **전략의 값**만 재기 때문이다. 포인터로
// 흉내 내면 드래그 정확도라는 잡음이 섞여 계층 비교가 흐려진다.
export async function runProfile(page, profileId, ms) {
  await page.waitForFunction(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 20_000 });
  const play = await page.evaluate(() => {
    const i = (globalThis.__GAME_LAYOUT_BOUNDS__.items || []).find((x) => x.id === 'play');
    return i ? { x: i.x + i.width / 2, y: i.y + i.height / 2 } : null;
  });
  if (!play) throw new Error('레지스트리에 play 버튼이 없다');
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__, null, { timeout: 20_000 });

  await page.evaluate((mode) => {
    const sc = globalThis.__GAME__.scene.getScene('Game');
    if (mode === 'idle') return;
    globalThis.__BOT__ = setInterval(() => {
      const ball = sc.balls.filter((b) => b.alive)
        .sort((a, c) => (c.progress || 0) - (a.progress || 0))[0];
      if (!ball) return;
      sc.control.targetX = ball.x;
      if (mode !== 'dive') return;
      // 도착까지 남은 시간으로 다이브 시점을 잡는다. 진행도로 잡으면 느린 슛에서 다이브가
      // 먼저 끝나 RECOVERING 상태로 공을 맞는다 — diving 판정이 아니라 무의미해진다.
      const msLeft = (ball.goalY - ball.y) / Math.max(1, ball.vy) * 1000;
      if (msLeft < sc.rules.control.diveDurationMs * 0.6
          && ball.targetHeight > sc.rules.judge.catchMaxHeight
          && !sc.control.locked
          && Math.abs(ball.x - sc.control.x) < 500) {
        sc.control.startDive(ball.x >= sc.control.x ? 1 : -1);
      }
    }, 16);
  }, profileId);

  await page.waitForTimeout(ms);

  return page.evaluate(() => {
    clearInterval(globalThis.__BOT__);
    const s = globalThis.__KEEPER_DEBUG__.get();
    return { successes: s.saves, failures: s.conceded };
  });
}
