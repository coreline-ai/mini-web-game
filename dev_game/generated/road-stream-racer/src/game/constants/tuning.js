import { SPEC } from '../data/spec.js';

export const TUNING = {
  playerY: SPEC.canvas.height * (SPEC.racing?.playerZone?.defaultYRatio || 0.82),
  playerDisplaySize: 330,
  playerHitbox: { width: 138, height: 224 },
  trafficDisplaySize: 290,
  collectibleSize: 118,
  safeTop: 150,
  safeSide: 120,
};
