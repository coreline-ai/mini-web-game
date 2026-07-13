import { SPEC } from '../data/spec.js';

export const BASE_CANVAS = { width: 390, height: 844 };
export const SCALE_X = SPEC.canvas.width / BASE_CANVAS.width;
export const SCALE_Y = SPEC.canvas.height / BASE_CANVAS.height;
export const SCALE = SCALE_Y;

export function su(value) {
  return value * SCALE;
}

export function sx(value) {
  return value * SCALE_X;
}

export function worldX(value) {
  return value * SCALE_X;
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
  safeSide: sx(28),
};
