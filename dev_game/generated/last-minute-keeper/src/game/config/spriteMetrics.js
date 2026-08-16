// spriteMetrics.js — 텍스처별 **실측** 여백과 배경의 골라인 위치.
//
// 생성 이미지는 위·아래 투명 여백이 자산마다 크게 다르다. 스프라이트 경계로 위치를 잡으면
// 자산마다 다른 높이에 뜨고, 배경의 지평선을 확인하지 않으면 오브젝트가 공중부양한다.
// 둘 다 직전 게임에서 실제로 겪은 결함이라, 이 게임은 처음부터 실측값을 상수로 둔다.
//
// 값은 `scripts/measure-sprites.mjs`가 알파>64 bbox로 재서 채운다.

// 배경 아트에서 골라인(골포스트가 잔디에 닿는 지점)이 놓인 세로 위치. 캔버스 높이 대비다.
//
// **배경마다 다르다.** 같은 프롬프트로 생성해도 골대 위치가 20%p까지 벌어지므로(실측),
// 단일 값을 쓰면 어떤 스테이지에서는 키퍼가 골대 위 잔디에, 어떤 스테이지에서는 골문
// 아래에 서게 된다. 배경별로 재서 넣는 것이 유일한 방법이다.
// stage-4는 어두워 자동 검출이 실패해 캡처를 눈으로 보고 넣었다.
export const GOAL_LINE_BY_STAGE = Object.freeze([0.913, 0.906, 0.912, 0.878, 0.860]);
export const GOAL_LINE_Y = GOAL_LINE_BY_STAGE[0];

// 골문 좌우 끝(캔버스 폭 대비). 키퍼 이동 범위의 근거다.
export const GOAL_MOUTH = Object.freeze({ left: 0.10, right: 0.90 });

// 스코어보드 9-slice 파라미터. setDisplaySize로 비율을 깨뜨리지 않기 위한 것이다.
export const PANEL_SLICE = Object.freeze({ left: 38, right: 39, top: 19, bottom: 20, scale: 1.0 });

// 텍스처별 보이는 몸통 정보.
//   bottom    : 이미지 하단에서 보이는 발끝까지의 비율 (발을 지면에 세울 때 쓴다)
//   widthFrac : 이미지 폭 대비 실제 몸통 폭 비율 (판정 body의 근거)
export const HULL = Object.freeze({
  'keeper-ready': Object.freeze({ bottom: 0.143, widthFrac: 0.688 }),
  'keeper-dive': Object.freeze({ bottom: 0.243, widthFrac: 0.803 }),
  'keeper-catch': Object.freeze({ bottom: 0.164, widthFrac: 0.211 }),
  'match-ball': Object.freeze({ bottom: 0.207, widthFrac: 0.607 }),
  striker: Object.freeze({ bottom: 0.104, widthFrac: 0.674 }),
  defender: Object.freeze({ bottom: 0.25, widthFrac: 0.688 }),
});
