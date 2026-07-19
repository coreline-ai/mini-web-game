import { COLORS } from './constants.js';

export function cssScale(scene) {
  const camera = scene.cameras.main;
  const bounds = scene.scale?.canvasBounds;
  return {
    x: (bounds?.width ?? camera.width) / camera.width,
    y: (bounds?.height ?? camera.height) / camera.height,
  };
}

export function responsiveFontSize(scene, baseLogicalPx, minimumCssPx = 12) {
  const scale = cssScale(scene);
  return Math.max(baseLogicalPx, minimumCssPx / Math.max(0.001, scale.y));
}

export function coverImage(scene, image, width, height) {
  const source = scene.textures.get(image.texture.key).getSourceImage();
  const scale = Math.max(width / source.width, height / source.height);
  image.setDisplaySize(source.width * scale, source.height * scale);
  image.setData('_scaleMode', 'aspect-cover');
  return image;
}

export function label(scene, x, y, text, size = 28, color = '#f7e7bd') {
  return scene.add.text(x, y, text, { fontFamily: 'Arial Black, Pretendard, sans-serif', fontSize: `${size}px`, color, stroke: '#07131d', strokeThickness: Math.max(3, size * 0.12), align: 'center' }).setOrigin(0.5).setDepth(100);
}

/**
 * Resize the production HUD frame without stretching its metal corners.
 * The NineSlice is authored at an internal size and then uniformly scaled,
 * so the source art keeps the same X/Y pixel ratio at every viewport.
 */
export function resizePanel(panel, width, height) {
  const source = panel.scene.textures.get(panel.texture.key).getSourceImage();
  const uniformScale = Math.min(width / source.width, height / source.height);
  const internalWidth = width / uniformScale;
  const internalHeight = height / uniformScale;
  const slices = panel.getData('_panelSlices') ?? { left: 104, right: 104, top: 72, bottom: 72 };
  panel.setSlices(internalWidth, internalHeight, slices.left, slices.right, slices.top, slices.bottom, true);
  panel.setScale(uniformScale);
  panel.setData('_panelDisplayWidth', width).setData('_panelDisplayHeight', height).setData('_panelUniformScale', uniformScale);
  return panel;
}

export function panel(scene, x, y, width, height, texture = 'ui-hud-frame', sliceOverrides = null) {
  const source = scene.textures.get(texture).getSourceImage();
  const slices = sliceOverrides ?? { left: 104, right: 104, top: 72, bottom: 72 };
  const object = scene.add.nineslice(x, y, texture, undefined, source.width, source.height, slices.left, slices.right, slices.top, slices.bottom);
  object.setData('_panelSlices', slices);
  return resizePanel(object, width, height);
}

export function panelContentInsets(panel, padding = 0) {
  const slices = panel.getData('_panelSlices') ?? { left: 0, right: 0, top: 0, bottom: 0 };
  return {
    left: slices.left * Math.abs(panel.scaleX) + padding,
    right: slices.right * Math.abs(panel.scaleX) + padding,
    top: slices.top * Math.abs(panel.scaleY) + padding,
    bottom: slices.bottom * Math.abs(panel.scaleY) + padding,
  };
}

export function panelContentBounds(panel, padding = 0) {
  const bounds = panel.getBounds();
  const insets = panelContentInsets(panel, padding);
  const left = bounds.left + insets.left;
  const right = bounds.right - insets.right;
  const top = bounds.top + insets.top;
  const bottom = bounds.bottom - insets.bottom;
  return { x: left, y: top, left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top), insets };
}

export function button(scene, x, y, text, onClick, width = 230, height = 68, color = COLORS.orange) {
  const scale = cssScale(scene);
  const compact = (scene.scale?.canvasBounds?.width ?? window.innerWidth) < 1100;
  // Keep both the visible control and its real interactive image bounds above
  // the mobile touch floor; a larger invisible target alone would not make the
  // action discoverable.
  const resolvedHeight = compact ? Math.max(height, 46 / Math.max(0.001, scale.y)) : height;
  const buttonFontSize = compact ? Math.max(24, 16 / Math.max(0.001, scale.y)) : 24;
  const bg = scene.add.image(x, y, 'ui-menu-button-base').setDisplaySize(width, resolvedHeight).setInteractive({ useHandCursor: true }).setDepth(100);
  if (color !== COLORS.orange) bg.setTint(color);
  const txt = label(scene, x, y, text, buttonFontSize, '#07131d');
  txt.setStroke('#f7e7bd', 0).setDepth(101);
  let baseScaleX = bg.scaleX; let baseScaleY = bg.scaleY;
  const press = () => {
    scene.tweens.add({ targets: bg, scaleX: baseScaleX * 0.94, scaleY: baseScaleY * 0.94, duration: 70, yoyo: true });
    scene.tweens.add({ targets: txt, scaleX: 0.94, scaleY: 0.94, duration: 70, yoyo: true, onComplete: onClick });
  };
  bg.on('pointerdown', press);
  const api = {
    bg,
    text: txt,
    setVisible(v) { bg.setVisible(v); txt?.setVisible(v); return api; },
    setPosition(nextX, nextY) { bg.setPosition(nextX, nextY); txt.setPosition(nextX, nextY); return api; },
    setDisplaySize(nextWidth, nextHeight) {
      bg.setDisplaySize(nextWidth, nextHeight);
      baseScaleX = bg.scaleX; baseScaleY = bg.scaleY;
      return api;
    },
    setFontSize(nextSize) { txt.setFontSize(nextSize); return api; },
  };
  return api;
}
