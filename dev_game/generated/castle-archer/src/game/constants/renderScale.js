import { SPEC } from '../data/spec.js';

export const RENDER_SCALE = 1;
export const PHYSICAL_WIDTH = SPEC.canvas.width;
export const PHYSICAL_HEIGHT = SPEC.canvas.height;

export function applyLogicalCamera(scene) {
  const camera = scene.cameras?.main;
  if (!camera) return;
  camera.setViewport(0, 0, PHYSICAL_WIDTH, PHYSICAL_HEIGHT);
  camera.setZoom(1);
  camera.centerOn(SPEC.canvas.width / 2, SPEC.canvas.height / 2);
  scene.physics?.world?.setBounds(0, 0, SPEC.canvas.width, SPEC.canvas.height);
}

export function pointerToLogical(scene, pointer) {
  if (!pointer) return pointer;
  return {
    x: pointer.x,
    y: pointer.y,
  };
}
