import { SPEC } from '../data/spec.js';

export const TUNING = {
  playerStartX: SPEC.canvas.width * 0.5,
  playerStartY: SPEC.canvas.height * 0.79,
  combatLeft: 105,
  combatRight: SPEC.canvas.width - 105,
  combatTop: SPEC.canvas.height * 0.64,
  combatBottom: SPEC.canvas.height * 0.89,
  playerDisplay: 272,
  safeTop: 54,
  safeSide: 52,
  // The radio/HUD occupies the upper 386 logical pixels. Large bosses must
  // enter below that protected text area rather than slide behind it.
  bossEntryY: 650,
  maxEnemies: 140,
  maxBullets: 260,
};
