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
    const isText = o.type === 'Text';
    const naturalWidth = isText ? 0 : o.texture?.source?.[0]?.width || 0;
    const naturalHeight = isText ? 0 : o.texture?.source?.[0]?.height || 0;
    const naturalAspect = !isText && naturalWidth && naturalHeight ? naturalWidth / naturalHeight : 0;
    const displayAspect = !isText && r.width && r.height ? r.width / r.height : 0;
    out.push({
      id: e.id,
      x: b.left + r.x * sx,
      y: b.top + r.y * sy,
      width: r.width * sx,
      height: r.height * sy,
      visible: true,
      allowOverlap: e.allowOverlap === true,
      allowStretch: e.allowStretch === true,
      allowOverlapWith: Array.isArray(e.allowOverlapWith) ? e.allowOverlapWith : [],
      mustBeInside: e.mustBeInside || '',
      innerPadding: Number.isFinite(e.innerPadding) ? e.innerPadding : 0,
      textureKey: isText ? '' : o.texture?.key || '',
      naturalAspect,
      displayAspect,
      aspectDelta: naturalAspect && displayAspect ? Math.abs(displayAspect - naturalAspect) / naturalAspect : 0,
    });
  }
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = {
    scene: (scene.scene && scene.scene.key) || '',
    requiredIds: Array.isArray(options.requiredIds) ? options.requiredIds : [],
    items: out,
  };
}

export function clearLayout() {
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: '', items: [] };
}
