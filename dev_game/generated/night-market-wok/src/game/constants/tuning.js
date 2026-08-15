import { SPEC } from '../data/spec.js';

// 이 게임의 레이아웃은 390x844 "디자인 단위"로 설계되어 있고, 실제 논리 캔버스는 그것의
// 정수배다. 논리 캔버스를 키우는 이유는 화면을 바꾸기 위해서가 아니라 canvas backing store가
// 기기 DPR을 충족하게 만들기 위해서다 — 390x844로 렌더하면 DPR2 기기에서 브라우저가 2배로
// 늘려 전체가 흐려진다 (post-production-qa-contract Class L, backing-store-too-small).
// 절대 픽셀값은 전부 U를 곱해 쓴다.
export const U = SPEC.canvas.width / 390;

// 버튼 규격 — 호출부가 크기를 지어내지 못하게 역할별 토큰으로 고정한다.
// (production-demo-quality-contract §2.0.25)
export const BUTTON = {
  primary: { width: 230, height: 64 },
  secondary: { width: 230, height: 54 },
  icon: { width: 56, height: 56 },
};

export const TUNING = {
  playerY: SPEC.canvas.height * 0.86,
  playerSize: 100 * U,
  hazardSize: 90 * U,
  collectibleSize: 72 * U,
  safeTop: 96 * U,
  safeSide: 28 * U,
};
