import { SPEC } from '../data/spec.js';

export const BASE_CANVAS = Object.freeze({ width: 1080, height: 1920 });
export const BASE_COMPOSITION_CANVAS = Object.freeze({ width: 390, height: 844 });

export const SCALE_X = SPEC.canvas.width / BASE_CANVAS.width;
export const SCALE_Y = SPEC.canvas.height / BASE_CANVAS.height;
export const SCALE = Math.min(SCALE_X, SCALE_Y);

export const sx = (value) => Math.round(value * SCALE_X);
export const sy = (value) => Math.round(value * SCALE_Y);
export const su = (value) => Math.round(value * SCALE);
export const fontPx = (value) => `${Math.max(1, su(value))}px`;
export const strokePx = (value) => Math.max(1, su(value));
export const worldX = (ratio) => Math.round(SPEC.canvas.width * ratio);

export const TEXT_STYLE = Object.freeze({
  title: {
    fontFamily: '"Arial Black", Arial, sans-serif',
    color: '#f8fbff',
    stroke: '#07111d',
    strokeThickness: strokePx(10),
    align: 'center',
  },
  body: {
    fontFamily: 'Arial, sans-serif',
    color: '#e7f6ff',
    stroke: '#07111d',
    strokeThickness: strokePx(4),
    align: 'center',
  },
  hud: {
    fontFamily: '"Arial Black", Arial, sans-serif',
    color: '#ffffff',
    stroke: '#061016',
    strokeThickness: strokePx(6),
  },
});
