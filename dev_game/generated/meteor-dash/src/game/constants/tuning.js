import { SPEC } from '../data/spec.js';

export const BASE_CANVAS = { width: 390, height: 844 };
export const SCALE = SPEC.canvas.height / BASE_CANVAS.height;
export const OFFSET_X = (SPEC.canvas.width - BASE_CANVAS.width * SCALE) / 2;

export function su(value) {
  return value * SCALE;
}

export function worldX(value) {
  return OFFSET_X + value * SCALE;
}

export function fontPx(value) {
  return `${Math.round(su(value))}px`;
}

export function strokePx(value) {
  return Math.max(1, Math.round(su(value)));
}

export const TUNING = {
  playerY: SPEC.canvas.height * 0.86,
  playerSize: su(100),
  hazardSize: su(90),
  collectibleSize: su(72),
  safeTop: su(96),
  safeSide: worldX(28),
};
