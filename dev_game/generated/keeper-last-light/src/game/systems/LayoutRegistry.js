// LayoutRegistry — 화면 요소의 실제 화면 좌표를 window.__GAME_LAYOUT_BOUNDS__로 공표한다.
// 레이아웃 게이트와 캡처 러너가 읽는 유일한 진실이다.
//
// publishLayout은 캔버스 경계나 카메라 worldView가 아직 0이면 아무것도 하지 않는다.
// 씬 전환 직후(create 시점)에는 그런 상태가 흔하고, create에서 한 번만 부르는 씬은
// 그대로 영원히 미공표로 남는다 — 게이트에는 "registry missing"으로만 보여서 원인을
// 찾기 어렵다. publishLayoutStable은 성공할 때까지 다음 프레임에 다시 시도한다.

function measure(scene, entries, options) {
  const b = scene.scale?.canvasBounds;
  const w = scene.cameras?.main?.worldView;
  if (!b || !b.width || !w?.width || !w?.height) return null;
  const sx = b.width / w.width;
  const sy = b.height / w.height;
  const items = [];
  for (const e of entries) {
    const o = e?.obj;
    if (!o || o.visible === false || typeof o.getBounds !== 'function') continue;
    const r = o.getBounds();
    items.push({
      id: e.id,
      x: b.left + (r.x - w.x) * sx,
      y: b.top + (r.y - w.y) * sy,
      width: r.width * sx,
      height: r.height * sy,
      visible: true,
      allowOverlap: e.allowOverlap === true,
      allowOverlapWith: e.allowOverlapWith || [],
    });
  }
  return { scene: scene.scene?.key || '', items, requiredIds: options.requiredIds || entries.map((e) => e.id) };
}

export function publishLayout(scene, entries, options = {}) {
  const payload = measure(scene, entries, options);
  if (!payload) return false;
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = payload;
  return true;
}

// create()에서 한 번 부르고 끝내는 씬을 위한 안전판. 성공할 때까지 최대 몇 프레임 재시도한다.
export function publishLayoutStable(scene, entries, options = {}, attemptsLeft = 30) {
  if (publishLayout(scene, entries, options)) return;
  if (attemptsLeft <= 0) return;
  scene.time?.delayedCall(16, () => {
    if (scene.scene?.isActive?.()) publishLayoutStable(scene, entries, options, attemptsLeft - 1);
  });
}

export function clearLayout() {
  if (typeof window !== 'undefined') window.__GAME_LAYOUT_BOUNDS__ = { scene: '', items: [], requiredIds: [] };
}
