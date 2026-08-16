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

// 화면 표현 — 원근은 **거리**가 만든다.
//
// 카메라는 골대 뒤에서 필드를 올려다본다(캡처 확인: 키퍼의 등이 보이고 골대가 화면 아래
// 전경에 크게 그려진다). 그러므로 공은 다가올수록 커진다. 이전 구현은 크기를 아크 높이에
// 묶어서 로빙이 중간에 가장 크고 도착할 때 작아졌다 — 원근이 뒤집혀 보였고, 평평한 강슛은
// 비행 내내 크기가 그대로라 다가오는 느낌이 없었다.
//
// 높이는 크기가 아니라 **화면 위로 들어 올리는 양**으로 표현한다. 그래야 "머리 위로 넘어온다"가
// 읽히고, 그림자는 항상 지면에 남아 높이의 기준점이 된다.

// 발사 지점에서의 크기 비율. 슈터가 키퍼의 절반 남짓으로 보이는 것과 같은 원근이다.
const FAR_SCALE = 0.45;

export function perspective(progress) {
  return FAR_SCALE + (1 - FAR_SCALE) * Math.max(0, Math.min(1, progress));
}

export function ballVisuals(ball, unit) {
  const persp = perspective(ball.progress ?? 0);
  return {
    scale: persp,
    // height=1(크로스바)인 공이 도착할 때 골라인에서 크로스바까지 올라간다. 멀리 있을수록
    // 같은 높이가 화면에서 덜 올라가므로 원근 계수를 함께 곱한다.
    lift: ball.height * ball.crossbarLiftPx * persp,
    // 그림자는 높이의 유일한 지면 기준점이다. 높을수록 옅어지되 사라지지는 않아야 한다.
    shadowAlpha: Math.max(0.20, 0.46 - ball.height * 0.22),
    shadowScale: Math.max(0.35, persp * (1 - ball.height * 0.35)),
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
