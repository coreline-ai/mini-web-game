import { SPEC } from '../data/spec.js';

const shooting = SPEC.shooting || {};
const defaultStages = [
  { name: 'DAY', goalHits: 4, rewardSeconds: 4, rewardScore: 250, levelBonus: 0 },
  { name: 'NIGHT', goalHits: 6, rewardSeconds: 3, rewardScore: 400, levelBonus: 3 },
  { name: 'RUSH', goalHits: 8, rewardSeconds: 0, rewardScore: 650, levelBonus: 6 },
];

export const SHOOTING = {
  sessionSeconds: shooting.sessionSeconds || 45,
  missPenaltySeconds: shooting.missPenaltySeconds || 3,
  hitBonusSeconds: shooting.hitBonusSeconds || 1.2,
  perfectRadiusRatio: shooting.perfectRadiusRatio || 0.32,
  targetRows: shooting.targetRows || [0.26, 0.38, 0.5, 0.62],
  targetSpeedStart: shooting.targetSpeedStart || 120,
  targetSpeedMax: shooting.targetSpeedMax || 310,
  targetSizeStart: shooting.targetSizeStart || 92,
  targetSizeMin: shooting.targetSizeMin || 58,
  targetEdgeMargin: shooting.targetEdgeMargin || 88,
  hitBurstPeakRadius: shooting.hitBurstPeakRadius || 84,
  comboWindowMs: shooting.comboWindowMs || 1400,
  perfectScore: shooting.perfectScore || 180,
  hitScore: shooting.hitScore || 100,
  missScorePenalty: shooting.missScorePenalty || 30,
  targetHitVanishMs: 180,
  stageRewardToastMs: 900,
  stages: Array.isArray(shooting.stages) && shooting.stages.length ? shooting.stages : defaultStages,
  galleryTop: 120,
  galleryBottom: 610,
  shooterSize: 240,
  shooterY: SPEC.canvas.height - 162,
  muzzleY: SPEC.canvas.height - 266,
};
