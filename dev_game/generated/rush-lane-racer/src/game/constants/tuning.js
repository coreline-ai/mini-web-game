import { SPEC } from '../data/spec.js';

const { width, height } = SPEC.canvas;
const laneCount = SPEC.racing?.lanes || 4;
const roadLeft = Math.floor(width * (SPEC.racing?.road?.leftRatio ?? 0.12));
const roadRight = Math.floor(width * (SPEC.racing?.road?.rightRatio ?? 0.88));
const roadWidth = roadRight - roadLeft;
const laneWidth = roadWidth / laneCount;

export const TUNING = {
  width,
  height,
  roadLeft,
  roadRight,
  roadWidth,
  laneCount,
  laneWidth,
  laneCenters: Array.from({ length: laneCount }, (_, i) => roadLeft + laneWidth * (i + 0.5)),
  playerY: height * (SPEC.racing?.playerZone?.defaultYRatio ?? 0.84),
  playerDisplay: { width: 168, height: 162 },
  safeTop: Math.max(128, height * 0.075),
  safeSide: roadLeft + 42,
  stripeWidth: Math.max(10, width * 0.012),
  stripeHeight: Math.max(120, height * 0.072),
  stripeGap: Math.max(110, height * 0.064),
  roadSpeedMin: SPEC.hazards.fallSpeedStart,
  roadSpeedMax: SPEC.hazards.fallSpeedMax,
};

export function laneX(index) {
  const clamped = Math.max(0, Math.min(laneCount - 1, index));
  return TUNING.laneCenters[clamped];
}

export function xToLane(x) {
  return Math.max(0, Math.min(laneCount - 1, Math.floor((x - roadLeft) / laneWidth)));
}
