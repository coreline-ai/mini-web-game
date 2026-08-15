import { U, BUTTON } from '../constants/tuning.js';
import { buttonPalette } from '../constants/palette.js';
export function makeTextButton(scene, x, y, label, onClick, size = BUTTON.primary, heightOrOptions, maybeOptions) {
  // 규격 토큰을 받는다. 과거 시그니처(width, height, options)도 계속 동작시킨다.
  let spec = size; let options = heightOrOptions || {};
  if (typeof size === 'number') { spec = { width: size, height: heightOrOptions }; options = maybeOptions || {}; }
  let width = Math.round(spec.width * U); let height = Math.round(spec.height * U);
  const _k = 'btnui_' + width + 'x' + height;
    if (!scene.textures.exists('ui_frame') && !scene.textures.exists(_k)) {
      const g = scene.make.graphics({ add: false });
      const r = Math.min(22, height / 2);
      const pal = buttonPalette();
      g.fillStyle(pal.shadow, 1); g.fillRoundedRect(0, 0, width, height, r);
      g.fillStyle(pal.face, 1); g.fillRoundedRect(2, 2, width - 4, height - 6, r);
      g.fillStyle(pal.highlight, 0.85); g.fillRoundedRect(4, 3, width - 8, Math.max(3, height * 0.42), r);
      g.lineStyle(2.5, 0xffffff, 0.9); g.strokeRoundedRect(1, 1, width - 2, height - 2, r);
      g.generateTexture(_k, width, height); g.destroy();
    }
    const bg = scene.textures.exists('ui_frame') ? scene.add.image(x, y, 'ui_frame').setDisplaySize(width, height) : scene.add.image(x, y, _k);
  const _pal = buttonPalette();
  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: 24 * U + 'px', color: _pal.label, stroke: _pal.stroke, strokeThickness: 4 }).setOrigin(0.5);
  let fired = false; let enabled = options.disabled !== true;
  const resetVisual = () => { bg.setDisplaySize(width, height); txt.setScale(1); };
  const setEnabled = (value) => { enabled = !!value; if (enabled && !fired) bg.setInteractive({ useHandCursor: true }); else bg.disableInteractive(); resetVisual(); };
  if (enabled) bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => { if (!enabled || fired) return; bg.setDisplaySize(width * 0.96, height * 0.96); txt.setScale(0.96); if (options.fireOn === 'pointerdown') { if (options.oneShot) { fired = true; bg.disableInteractive(); } onClick?.(); } });
  bg.on('pointerup', () => { if (!enabled || fired) return; resetVisual(); if (options.fireOn !== 'pointerdown') { if (options.oneShot) { fired = true; bg.disableInteractive(); } onClick?.(); } });
  bg.on('pointerout', resetVisual);
  return { bg, txt, resetVisual, setEnabled, destroy: () => { bg.destroy(); txt.destroy(); } };
}
