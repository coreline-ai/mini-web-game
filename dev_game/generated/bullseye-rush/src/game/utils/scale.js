import { SPEC } from '../data/spec.js';

export const BASE_CANVAS = { width: 390, height: 844 };
export const SCALE_X = SPEC.canvas.width / BASE_CANVAS.width;
export const SCALE_Y = SPEC.canvas.height / BASE_CANVAS.height;
export const SCALE = SCALE_X;

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

export function worldX(value) {
  return sx(value);
}
