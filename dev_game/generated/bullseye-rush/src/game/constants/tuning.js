import { SPEC } from '../data/spec.js';
import { su, sy } from '../utils/scale.js';

// 버튼 규격 — 호출부가 크기를 지어내지 못하게 역할별 토큰으로 고정한다.
// (production-demo-quality-contract §2.0.25)
export const BUTTON = {
  primary: { width: 230, height: 64 },
  secondary: { width: 230, height: 54 },
  icon: { width: 56, height: 56 },
};

export const TUNING = {
  playerY: SPEC.canvas.height * 0.86,
  playerSize: su(100),
  hazardSize: su(90),
  collectibleSize: su(72),
  safeTop: sy(96),
  safeSide: su(28),
};
