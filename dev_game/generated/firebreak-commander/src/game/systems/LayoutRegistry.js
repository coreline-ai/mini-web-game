// Publishes visible UI bounds (in CSS/viewport pixels) to window.__GAME_LAYOUT_BOUNDS__
// so visual-layout-qa can detect HUD overlap and safe-area violations.
export function publishLayout(scene, entries, options = {}) {
  const s = scene.scale;
  const b = s && s.canvasBounds;
  const worldView = scene.cameras?.main?.worldView;
  if (!b || !worldView?.width || !worldView?.height) return;
  const sx = b.width / worldView.width;
  const sy = b.height / worldView.height;
  const out = [];
  for (const e of entries) {
    const o = e && e.obj;
    if (!o || o.visible === false || typeof o.getBounds !== 'function') continue;
    const r = o.getBounds();
    out.push({
      id: e.id,
      x: b.left + (r.x - worldView.x) * sx,
      y: b.top + (r.y - worldView.y) * sy,
      width: r.width * sx,
      height: r.height * sy,
      visible: true,
      allowOverlap: e.allowOverlap === true,
      allowOverlapWith: Array.isArray(e.allowOverlapWith) ? e.allowOverlapWith : [],
      mustBeInside: e.mustBeInside || '',
      innerPadding: Number(e.innerPadding || 0),
    });
  }
  const requiredIds = Array.isArray(options.requiredIds)
    ? options.requiredIds.map(String)
    : entries.filter((entry) => entry?.required !== false).map((entry) => String(entry.id));
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: (scene.scene && scene.scene.key) || '', items: out, requiredIds };
}

export function clearLayout() {
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: '', items: [], requiredIds: [] };
}
