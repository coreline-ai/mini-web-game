import { SPEC } from '../data/spec.js';

function round2(value) {
  return Math.round(value * 100) / 100;
}

function objectVisible(object) {
  if (!object) return false;
  let cursor = object;
  while (cursor) {
    if (cursor.visible === false || cursor.alpha === 0) return false;
    cursor = cursor.parentContainer || null;
  }
  return true;
}

function textureMeta(object) {
  if (object?.type === 'Text') return { objectType: 'Text' };
  const source = object?.texture?.source?.[0];
  if (!source || !object.displayWidth || !object.displayHeight) return {};
  const naturalWidth = source.width || source.image?.width;
  const naturalHeight = source.height || source.image?.height;
  if (!naturalWidth || !naturalHeight) return {};
  const naturalAspect = naturalWidth / naturalHeight;
  const displayAspect = object.displayWidth / object.displayHeight;
  return {
    objectType: object.type || object.constructor?.name || '',
    textureKey: object.texture?.key || '',
    naturalWidth,
    naturalHeight,
    displayWidth: Math.round(object.displayWidth * 100) / 100,
    displayHeight: Math.round(object.displayHeight * 100) / 100,
    naturalAspect: Math.round(naturalAspect * 10000) / 10000,
    displayAspect: Math.round(displayAspect * 10000) / 10000,
    aspectDelta: Math.round((Math.abs(displayAspect - naturalAspect) / naturalAspect) * 10000) / 10000,
  };
}

function toCssBounds(scene, object) {
  if (!object || typeof object.getBounds !== 'function') return null;
  const canvas = scene.game?.canvas;
  if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return null;
  const rect = canvas.getBoundingClientRect();
  const bounds = object.getBounds();
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
  const scaleX = rect.width / SPEC.canvas.width;
  const scaleY = rect.height / SPEC.canvas.height;
  return {
    x: round2(rect.x + bounds.x * scaleX),
    y: round2(rect.y + bounds.y * scaleY),
    width: round2(bounds.width * scaleX),
    height: round2(bounds.height * scaleY),
  };
}

export function publishLayoutBounds(scene, items = [], options = {}) {
  if (typeof window === 'undefined') return;
  const visibleItems = [];
  for (const item of items) {
    if (!item?.object || !objectVisible(item.object)) continue;
    const bounds = toCssBounds(scene, item.object);
    if (!bounds) continue;
    visibleItems.push({
      id: item.id,
      scene: scene.scene?.key || scene.constructor.name,
      ...bounds,
      visible: true,
      allowOverlap: item.allowOverlap === true,
      allowStretch: item.allowStretch === true,
      allowOverlapWith: Array.isArray(item.allowOverlapWith) ? item.allowOverlapWith : [],
      mustBeInside: item.mustBeInside || '',
      innerPadding: Number.isFinite(item.innerPadding) ? item.innerPadding : 0,
      ...textureMeta(item.object),
    });
  }
  window.__GAME_LAYOUT_BOUNDS__ = {
    gameId: SPEC.game.id,
    scene: scene.scene?.key || scene.constructor.name,
    canvas: { width: SPEC.canvas.width, height: SPEC.canvas.height },
    updatedAt: Date.now(),
    requiredIds: Array.isArray(options.requiredIds) ? options.requiredIds : [],
    items: visibleItems,
  };
}

export function clearLayoutBounds(sceneName = '') {
  if (typeof window === 'undefined') return;
  window.__GAME_LAYOUT_BOUNDS__ = { scene: sceneName, items: [] };
}
