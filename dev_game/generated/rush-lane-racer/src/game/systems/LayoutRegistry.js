import { SPEC } from '../data/spec.js';

function canvasMetrics(scene) {
  const canvas = scene?.game?.canvas;
  const rect = canvas?.getBoundingClientRect?.();
  if (!rect) return { left: 0, top: 0, sx: 1, sy: 1 };
  return {
    left: rect.left || 0,
    top: rect.top || 0,
    sx: (rect.width || SPEC.canvas.width) / SPEC.canvas.width,
    sy: (rect.height || SPEC.canvas.height) / SPEC.canvas.height,
  };
}

function textureAspect(obj) {
  const key = obj?.texture?.key;
  const source = obj?.texture?.getSourceImage?.();
  if (!key || !source?.width || !source?.height) return {};
  const naturalAspect = source.width / source.height;
  const displayAspect = Math.abs((obj.displayWidth || obj.width || 1) / (obj.displayHeight || obj.height || 1));
  return { textureKey: key, naturalAspect, displayAspect, aspectDelta: Math.abs(naturalAspect - displayAspect) / naturalAspect };
}

export function cssBounds(scene, logical) {
  const m = canvasMetrics(scene);
  return {
    x: m.left + logical.x * m.sx,
    y: m.top + logical.y * m.sy,
    width: logical.width * m.sx,
    height: logical.height * m.sy,
  };
}

export function objectBounds(scene, obj, id, options = {}) {
  const b = obj?.getBounds?.();
  if (!b) return null;
  return {
    id,
    ...cssBounds(scene, { x: b.x, y: b.y, width: b.width, height: b.height }),
    visible: obj.visible !== false,
    ...textureAspect(obj),
    ...options,
  };
}

export function manualBounds(scene, id, x, y, width, height, options = {}) {
  return { id, ...cssBounds(scene, { x, y, width, height }), visible: true, ...options };
}

export function publishLayout(scene, sceneName, items, requiredIds = []) {
  const normalized = items.filter(Boolean).map((item) => ({ scene: sceneName, ...item }));
  if (typeof window !== 'undefined') {
    window.__GAME_LAYOUT_BOUNDS__ = { scene: sceneName, requiredIds, items: normalized };
  }
}
