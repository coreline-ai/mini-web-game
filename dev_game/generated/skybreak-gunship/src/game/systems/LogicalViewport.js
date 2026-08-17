import { SPEC } from '../data/spec.js';

const viewportWidth = Number(globalThis.innerWidth || SPEC.canvas.width);
const viewportHeight = Number(globalThis.innerHeight || SPEC.canvas.height);
const displayScale = Math.min(viewportWidth / SPEC.canvas.width, viewportHeight / SPEC.canvas.height);
const targetDpr = Math.min(Number(globalThis.devicePixelRatio || 1), SPEC.canvas.maxDpr || 3);

export const RENDER_SCALE = Math.max(1, Math.min(4, displayScale * targetDpr));
export const PHYSICAL_WIDTH = Math.round(SPEC.canvas.width * RENDER_SCALE);
export const PHYSICAL_HEIGHT = Math.round(SPEC.canvas.height * RENDER_SCALE);

export function configureLogicalScene(scene) {
  const camera = scene.cameras.main;
  camera.setZoom(RENDER_SCALE);
  camera.centerOn(SPEC.canvas.width / 2, SPEC.canvas.height / 2);
  camera.preRender();
  if (!scene.add.__highDpiTextFactory) {
    const addText = scene.add.text.bind(scene.add);
    scene.add.text = (x, y, text, style = {}) => addText(x, y, text, { ...style, resolution: RENDER_SCALE });
    scene.add.__highDpiTextFactory = true;
  }
}

export function pointerToLogical(scene, pointer) {
  return scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
}
