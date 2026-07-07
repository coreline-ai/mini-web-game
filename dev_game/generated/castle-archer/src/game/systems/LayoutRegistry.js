// Publishes visible UI bounds (in CSS/viewport pixels) to window.__GAME_LAYOUT_BOUNDS__
// so visual-layout-qa can detect HUD overlap and safe-area violations.
import { SPEC } from '../data/spec.js';

export function publishLayout(scene, entries) {
  const s = scene.scale;
  const b = s && s.canvasBounds;
  const gw = SPEC.canvas.width;
  const gh = SPEC.canvas.height;
  if (!b || !gw || !gh) return;
  const sx = b.width / gw;
  const sy = b.height / gh;
  const out = [];
  for (const e of entries) {
    const o = e && e.obj;
    if (!o || o.visible === false || typeof o.getBounds !== 'function') continue;
    const r = o.getBounds();
    out.push({ id: e.id, x: b.left + r.x * sx, y: b.top + r.y * sy, width: r.width * sx, height: r.height * sy, visible: true });
  }
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: (scene.scene && scene.scene.key) || '', items: out };
}

export function clearLayout() {
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: '', items: [] };
}
