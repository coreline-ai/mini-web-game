import { SPEC } from '../data/spec.js';

export const TARGET_DPR = 1;

export const LOGICAL_CANVAS = {
  width: Number(SPEC.canvas.width),
  height: Number(SPEC.canvas.height),
};

export const PHYSICAL_CANVAS = {
  width: LOGICAL_CANVAS.width,
  height: LOGICAL_CANVAS.height,
};

export function applyLogicalCamera(scene) {
  const camera = scene?.cameras?.main;
  if (camera) {
    camera.setZoom(1);
    camera.setScroll(0, 0);
    camera.setBounds(0, 0, LOGICAL_CANVAS.width, LOGICAL_CANVAS.height);
    camera.roundPixels = false;
  }

  const world = scene?.physics?.world;
  if (world?.setBounds) {
    world.setBounds(0, 0, LOGICAL_CANVAS.width, LOGICAL_CANVAS.height);
  }
}

export function logicalPointer(pointer) {
  return {
    x: Number.isFinite(pointer?.worldX) ? pointer.worldX : Number(pointer?.x || 0),
    y: Number.isFinite(pointer?.worldY) ? pointer.worldY : Number(pointer?.y || 0),
  };
}
