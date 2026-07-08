import { SPEC } from '../data/spec.js';

export const BASE_CANVAS = { width: 390, height: 844 };
export const SCALE_X = SPEC.canvas.width / BASE_CANVAS.width;
export const SCALE_Y = SPEC.canvas.height / BASE_CANVAS.height;
// Preserve the original 390x844 mobile composition inside the centered crop-safe
// area of the 1080x1920 world.
export const SCALE = SCALE_Y;

export function sx(value) {
  return Math.round(value * SCALE_X);
}

export function sy(value) {
  return Math.round(value * SCALE_Y);
}

export function su(value) {
  return Math.round(value * SCALE);
}

export function fontPx(value) {
  return `${Math.max(1, su(value))}px`;
}

export function strokePx(value) {
  return Math.max(1, su(value));
}

export function worldX(baseX) {
  return Math.round((SPEC.canvas.width / 2) + (baseX - BASE_CANVAS.width / 2) * SCALE);
}

export const TUNING = {
  playerY: SPEC.canvas.height * 0.86,
  playerSize: su(100),
  hazardSize: su(90),
  collectibleSize: su(72),
  safeTop: sy(96),
  safeSide: worldX(28),
  inputTopBlock: sy(130),
};
