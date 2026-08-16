// BallPhysics — 공의 비행. 이 게임이 "정적이지 않다"는 것의 물리적 근거다.
//
// 세로 2D에는 원근이 없으므로 높이를 따로 들고 다닌다. 화면 y는 골라인까지의 진행도이고,
// height는 지면에서 얼마나 떠 있는가다. 둘을 분리해야 로빙(높이 큼)과 강슛(높이 작음)이
// 같은 y에 있어도 다르게 읽힌다.

// 마그누스 곡률은 x축 가속으로 넣는다. 초반 방향만 보고 다이브하면 속게 만드는 장치라,
// 궤적이 직선이면 이 게임의 예측 재미가 사라진다.
export function stepBall(ball, dtSec) {
  ball.vx += ball.curve * dtSec;
  ball.x += ball.vx * dtSec;
  ball.y += ball.vy * dtSec;

  // 높이는 발사 시점부터 도착 지점까지 포물선을 그린다. progress 0=발사, 1=골라인.
  const progress = Math.max(0, Math.min(1, (ball.y - ball.startY) / Math.max(1, ball.goalY - ball.startY)));
  ball.progress = progress;
  // 로빙은 중간에 가장 높고 도착 시 targetHeight로 내려온다. 강슛은 거의 평평하다.
  const arc = Math.sin(Math.PI * progress) * ball.arcPeak;
  ball.height = arc + ball.targetHeight * progress;
  return progress;
}

// 화면 표현: 높을수록 크게 그리고(가까워 보이는 착시) 그림자를 아래로 떨어뜨린다.
// 이 두 신호가 없으면 세로 화면에서 "머리 위로 넘어온다"를 읽을 수 없다.
export function ballVisuals(ball, unit) {
  return {
    scale: 1 + ball.height * 0.55,
    shadowOffset: ball.height * 140 * unit,
    shadowAlpha: Math.max(0.12, 0.42 - ball.height * 0.3),
    shadowScale: Math.max(0.45, 1 - ball.height * 0.45),
  };
}

// 좌우 벽(골포스트 바깥)에서 튕긴다. 리바운드가 화면 밖으로 곧장 사라지지 않게 한다.
export function reflectWalls(ball, minX, maxX) {
  if (ball.x < minX) { ball.x = minX; ball.vx = Math.abs(ball.vx) * 0.72; return true; }
  if (ball.x > maxX) { ball.x = maxX; ball.vx = -Math.abs(ball.vx) * 0.72; return true; }
  return false;
}

// 수비수 굴절 — 완벽한 예측을 무효화하는 장치. 방향과 곡률을 함께 흔든다.
export function deflect(ball, rng) {
  const kick = (rng.frac() * 2 - 1);
  ball.vx += kick * 620;
  ball.curve = kick * 900;
  ball.deflected = true;
}
