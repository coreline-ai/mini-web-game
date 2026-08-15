// Publishes visible UI bounds (in CSS/viewport pixels) to window.__GAME_LAYOUT_BOUNDS__
// so visual-layout-qa can detect HUD overlap and safe-area violations.
export function publishLayout(scene, entries, options = {}) {
  const s = scene.scale;
  const b = s && s.canvasBounds;
  const gw = s && s.gameSize && s.gameSize.width;
  const gh = s && s.gameSize && s.gameSize.height;
  if (!b || !gw || !gh) return;
  const sx = b.width / gw;
  const sy = b.height / gh;
  const out = [];
  for (const e of entries) {
    const o = e && e.obj;
    if (!o || o.visible === false || typeof o.getBounds !== 'function') continue;
    const r = o.getBounds();
    const item = { id: e.id, x: b.left + r.x * sx, y: b.top + r.y * sy, width: r.width * sx, height: r.height * sy, visible: true };
    // Carry the gate's intentional-overlap declarations through. Nested UI (a label drawn on
    // its own panel, a progress fill inside its track) is a real overlap that must be declared
    // rather than silently tolerated — dropping these fields made every such pair a failure.
    if (e.allowOverlap === true) item.allowOverlap = true;
    if (Array.isArray(e.allowOverlapWith)) item.allowOverlapWith = e.allowOverlapWith;
    if (e.allowStretch === true) item.allowStretch = true;
    out.push(item);
  }
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: (scene.scene && scene.scene.key) || '', items: out, requiredIds: options.requiredIds || entries.map((entry) => entry.id) };
}

export function clearLayout() {
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: '', items: [], requiredIds: [] };
}
