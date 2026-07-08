import { SPEC } from '../data/spec.js';
import { su, sy } from '../utils/scale.js';

export const TUNING = {
  playerY: SPEC.canvas.height * 0.86,
  playerSize: su(100),
  hazardSize: su(90),
  collectibleSize: su(72),
  safeTop: sy(96),
  safeSide: su(28),
};
