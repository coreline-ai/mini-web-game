export function publishLayout(scene, entries = []) {
  const camera = scene.cameras.main;
  const canvasBounds = scene.scale?.canvasBounds ?? { x: 0, y: 0, width: camera.width, height: camera.height };
  const cssScaleX = canvasBounds.width / camera.width;
  const cssScaleY = canvasBounds.height / camera.height;
  const items = entries.filter((e) => e?.obj?.active !== false).map(({ id, obj, role = 'ui', meta = {}, checkOverlap = true, checkClipping = true, container = null }) => {
    const b = obj.getBounds();
    const screenX = b.x - camera.scrollX * (obj.scrollFactorX ?? 1);
    const screenY = b.y - camera.scrollY * (obj.scrollFactorY ?? 1);
    const item = {
      id,
      role,
      visible: obj.visible !== false && obj.alpha > 0.001,
      depth: obj.depth ?? 0,
      texture: obj.texture?.key ?? null,
      type: obj.type ?? null,
      interactive: Boolean(obj.input?.enabled),
      x: canvasBounds.x + screenX * cssScaleX,
      y: canvasBounds.y + screenY * cssScaleY,
      width: b.width * cssScaleX,
      height: b.height * cssScaleY,
      meta,
      checks: { overlap: checkOverlap, clipping: checkClipping },
    };
    const hitArea = obj.input?.hitArea;
    if (item.interactive && hitArea) {
      const hitWidth = Number(hitArea.width ?? 0) * Math.abs(obj.scaleX ?? 1) * cssScaleX;
      const hitHeight = Number(hitArea.height ?? 0) * Math.abs(obj.scaleY ?? 1) * cssScaleY;
      item.hitArea = { width: hitWidth, height: hitHeight, minCssDimension: Math.min(hitWidth, hitHeight) };
    }
    if ((obj.type === 'Image' || obj.type === 'Sprite') && obj.texture?.getSourceImage) {
      const source = obj.texture.getSourceImage();
      const scaleX = (obj.displayWidth ?? b.width) / Math.max(1, source.width);
      const scaleY = (obj.displayHeight ?? b.height) / Math.max(1, source.height);
      item.renderScale = { x: scaleX, y: scaleY, anisotropy: Math.max(scaleX / Math.max(0.001, scaleY), scaleY / Math.max(0.001, scaleX)) };
    }
    item.clipped = checkClipping && item.visible && (
      item.x < canvasBounds.x - 0.5
      || item.y < canvasBounds.y - 0.5
      || item.x + item.width > canvasBounds.x + canvasBounds.width + 0.5
      || item.y + item.height > canvasBounds.y + canvasBounds.height + 0.5
    );
    if (container?.obj) {
      const containerBounds = container.obj.getBounds();
      const insets = container.insets ?? {};
      const containerScreenX = containerBounds.x - camera.scrollX * (container.obj.scrollFactorX ?? 1);
      const containerScreenY = containerBounds.y - camera.scrollY * (container.obj.scrollFactorY ?? 1);
      const safeBounds = {
        x: canvasBounds.x + (containerScreenX + (insets.left ?? 0)) * cssScaleX,
        y: canvasBounds.y + (containerScreenY + (insets.top ?? 0)) * cssScaleY,
        width: Math.max(0, containerBounds.width - (insets.left ?? 0) - (insets.right ?? 0)) * cssScaleX,
        height: Math.max(0, containerBounds.height - (insets.top ?? 0) - (insets.bottom ?? 0)) * cssScaleY,
      };
      const overflow = {
        left: Math.max(0, safeBounds.x - item.x),
        right: Math.max(0, item.x + item.width - (safeBounds.x + safeBounds.width)),
        top: Math.max(0, safeBounds.y - item.y),
        bottom: Math.max(0, item.y + item.height - (safeBounds.y + safeBounds.height)),
      };
      item.containment = {
        containerId: container.id ?? null,
        safeBounds,
        overflow,
        ok: !item.visible || Object.values(overflow).every((value) => value <= 0.5),
      };
    }
    return item;
  });
  const overlaps = [];
  const visibleItems = items.filter((item) => item.visible);
  for (let i = 0; i < visibleItems.length; i += 1) {
    for (let j = i + 1; j < visibleItems.length; j += 1) {
      const a = visibleItems[i]; const b = visibleItems[j];
      const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (a.checks.overlap && b.checks.overlap && width > 0.5 && height > 0.5) overlaps.push({ a: a.id, b: b.id, width, height, area: width * height });
    }
  }
  window.__GAME_LAYOUT_BOUNDS__ = {
    scene: scene.scene.key,
    canvas: { x: canvasBounds.x, y: canvasBounds.y, width: canvasBounds.width, height: canvasBounds.height },
    orientation: 'landscape',
    items,
    overlaps,
    clipped: items.filter((item) => item.clipped).map((item) => item.id),
    containmentFailures: items.filter((item) => item.containment && !item.containment.ok).map((item) => ({ id: item.id, ...item.containment })),
  };
}
export function clearLayout() { window.__GAME_LAYOUT_BOUNDS__ = { scene: 'none', canvas: { x: 0, y: 0, width: 1280, height: 720 }, items: [], overlaps: [], clipped: [] }; }
