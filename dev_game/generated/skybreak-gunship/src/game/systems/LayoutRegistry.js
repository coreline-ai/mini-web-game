export function publishLayout(scene, entries, options = {}) {
  const bounds = scene.scale?.canvasBounds;
  const worldView = scene.cameras?.main?.worldView;
  if (!bounds || !worldView?.width || !worldView?.height) return;
  const sx = bounds.width / worldView.width;
  const sy = bounds.height / worldView.height;
  const items = [];
  for (const entry of entries) {
    const object = entry?.obj;
    if (!object || object.visible === false || typeof object.getBounds !== 'function') continue;
    const rect = object.getBounds();
    items.push({
      id: entry.id,
      x: bounds.left + (rect.x - worldView.x) * sx,
      y: bounds.top + (rect.y - worldView.y) * sy,
      width: rect.width * sx,
      height: rect.height * sy,
      visible: true,
      allowOverlap: entry.allowOverlap === true,
      allowOverlapWith: Array.isArray(entry.allowOverlapWith) ? entry.allowOverlapWith : [],
    });
  }
  const requiredIds = Array.isArray(options.requiredIds)
    ? options.requiredIds.map(String)
    : entries.filter((entry) => entry?.required !== false).map((entry) => String(entry.id));
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: scene.scene?.key || '', items, requiredIds };
}

export function clearLayout() {
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: '', items: [], requiredIds: [] };
}
