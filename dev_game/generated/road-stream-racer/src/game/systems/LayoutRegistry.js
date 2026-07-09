// Publishes visible UI bounds (in CSS/viewport pixels) to window.__GAME_LAYOUT_BOUNDS__
// so visual-layout-qa can detect HUD overlap and safe-area violations.
export function publishLayout(scene, entries) {
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
    const frame = o.frame;
    const naturalAspect = frame?.realWidth && frame?.realHeight ? frame.realWidth / frame.realHeight : undefined;
    const displayAspect = r.width && r.height ? r.width / r.height : undefined;
    out.push({
      id: e.id,
      x: b.left + r.x * sx,
      y: b.top + r.y * sy,
      width: r.width * sx,
      height: r.height * sy,
      visible: true,
      allowOverlap: e.allowOverlap === true,
      allowOverlapWith: Array.isArray(e.allowOverlapWith) ? e.allowOverlapWith : [],
      textureKey: frame?.texture?.key || '',
      naturalAspect,
      displayAspect,
      aspectDelta: naturalAspect && displayAspect ? Math.abs(naturalAspect - displayAspect) / naturalAspect : 0,
    });
  }
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: (scene.scene && scene.scene.key) || '', items: out };
}

export function clearLayout() {
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: '', items: [] };
}
