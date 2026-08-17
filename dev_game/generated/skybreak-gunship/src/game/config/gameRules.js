import { SPEC } from '../data/spec.js';

export const GAME_RULES = Object.freeze({
  playfield: { top: 116, bottom: 704, aimOffsetY: 42 },
  missionDuration: SPEC.session.durationSeconds,
  civilianStrikeLimit: 3,
  convoyHp: SPEC.convoy.maxHp,
  gun: SPEC.weapon.gun,
  missile: SPEC.weapon.missile,
  targets: {
    rifleman: { hp: 36, score: 100, display: 64, radius: 22, convoyDamage: 10, attackMs: 2500 },
    rocketman: { hp: 52, score: 180, display: 72, radius: 25, convoyDamage: 55, attackMs: 3900 },
    drone: { hp: 44, score: 150, display: 78, radius: 29, convoyDamage: 14, attackMs: 2200 },
    apc: { hp: 420, score: 750, display: 112, radius: 46, convoyDamage: 38, attackMs: 3000 },
    boss: { hp: 1200, score: 4000, display: 176, radius: 70, convoyDamage: 42, attackMs: 2300 },
    civilian: { hp: 1, score: 400, display: 70, radius: 27 },
  },
});

if (typeof window !== 'undefined') window.__GAME_RULES__ = GAME_RULES;
