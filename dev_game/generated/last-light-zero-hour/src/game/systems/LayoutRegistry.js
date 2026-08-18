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
    out.push({ id: e.id, x: b.left + r.x * sx, y: b.top + r.y * sy, width: r.width * sx, height: r.height * sy, visible: true, allowOverlap: !!e.allowOverlap, allowOutOfBounds: !!e.allowOutOfBounds,
      // visual-layout-qa 는 `allowOverlapWith` 로 **쌍별** 예외를 읽는다. 여기서 실어 보내지
      // 않으면 게임이 선언해도 검사기에 도달하지 않는다 — 진행 바처럼 fill 이 track 안에
      // 있는 것이 설계인 경우 전역 allowOverlap 으로 넓게 여는 수밖에 없게 된다.
      ...(Array.isArray(e.allowOverlapWith) ? { allowOverlapWith: e.allowOverlapWith } : {}) });
  }
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: (scene.scene && scene.scene.key) || '', items: out, requiredIds: options.requiredIds || entries.map((entry) => entry.id) };
}

export function clearLayout() {
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: '', items: [], requiredIds: [] };
}
