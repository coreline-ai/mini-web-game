// SaveJudge — 공과 키퍼의 판정, 세이브 등급, 리바운드 벡터.
//
// 등급을 나누는 이유는 점수 차등만이 아니다. 캐치는 공을 죽이고(안전), 펀칭·다리막기는
// 공을 살려 둔다(위험). 그래서 "잘 막을수록 다음이 편해진다"가 성립하고, 이것이 리바운드를
// 벌이 아니라 실력의 결과로 만든다.

export const SAVE = Object.freeze({
  CATCH: 'catch',
  PUNCH: 'punch',
  BLOCK: 'block',
  MISS: 'miss',
});

// 공이 골라인을 넘는 순간의 판정. keeper의 도달 범위는 자세(다이브 여부)가 결정한다.
// MISS 사유. 실패에서 배울 게 없으면 재미가 아니라 짜증이다 — 화면이 이유를 말해야 한다.
export const MISS_REASON = Object.freeze({
  OUT_OF_REACH: 'out-of-reach',
  TOO_HIGH: 'too-high',
});

export function judgeSave(ball, keeperX, reachHalf, opts) {
  const dx = Math.abs(ball.x - keeperX);
  if (dx > reachHalf) return SAVE.MISS;

  // 높은 공은 몸으로 막을 수 없다 — 손이 닿아야 한다. 로빙이 위험한 이유.
  if (ball.height > opts.catchMaxHeight && !opts.diving) return SAVE.MISS;

  // 중심에 가깝고 느릴수록 잡을 수 있다. 빠르거나 끝자락이면 쳐내는 게 최선이다.
  const centered = dx < reachHalf * 0.45;
  const slow = ball.speed < opts.catchMaxSpeed;
  if (centered && slow && ball.height < opts.catchMaxHeight) return SAVE.CATCH;
  if (opts.diving || ball.height > opts.blockMaxHeight) return SAVE.PUNCH;
  return SAVE.BLOCK;
}

// 세이브 결과로 공이 어떻게 튀는지. 캐치는 공을 죽이고, 나머지는 살려 둔다.
export function reboundVector(grade, ball, keeperX, rebound) {
  if (grade === SAVE.CATCH) return null;
  const away = Math.sign(ball.x - keeperX) || (ball.vx >= 0 ? 1 : -1);
  if (grade === SAVE.PUNCH) {
    // 펀칭은 옆으로 크게 밀어낸다 — 골문 앞을 비우는 것이 목적이다.
    return { vx: away * rebound.punchSpeed, vy: -Math.abs(ball.vy) * 0.55 };
  }
  // 다리막기는 힘없이 앞으로 튄다 — 가장 위험한 리바운드.
  return { vx: away * rebound.punchSpeed * 0.45, vy: -Math.abs(ball.vy) * rebound.parrySpeedRatio };
}

// 판정과 같은 순서로 사유를 되짚는다. judgeSave의 수식을 복제하지 않고 조건만 다시 읽는다.
export function missReason(ball, keeperX, reachHalf, opts) {
  if (Math.abs(ball.x - keeperX) > reachHalf) return MISS_REASON.OUT_OF_REACH;
  if (ball.height > opts.catchMaxHeight && !opts.diving) return MISS_REASON.TOO_HIGH;
  return MISS_REASON.OUT_OF_REACH;
}

export function scoreFor(grade, rules) {
  if (grade === SAVE.CATCH) return rules.scoreCatch;
  if (grade === SAVE.PUNCH) return rules.scorePunch;
  if (grade === SAVE.BLOCK) return rules.scoreBlock;
  return 0;
}
