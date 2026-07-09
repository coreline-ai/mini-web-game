import { ASSET_KEYS } from '../constants/gameKeys.js';
import { fontPx, strokePx } from '../utils/scale.js';

export function makeTextButton(scene, x, y, label, onClick, width = 520, height = 140) {
  const _k = 'btnui_' + width + 'x' + height;
    if (!scene.textures.exists(ASSET_KEYS.uiFrame) && !scene.textures.exists(_k)) {
      const g = scene.make.graphics({ add: false });
      const r = Math.min(34, height / 2);
      g.fillStyle(0x0a3d1f, 1); g.fillRoundedRect(0, 0, width, height, r);
      g.fillStyle(0x22b357, 1); g.fillRoundedRect(2, 2, width - 4, height - 6, r);
      g.fillStyle(0x46e07e, 0.85); g.fillRoundedRect(4, 3, width - 8, Math.max(3, height * 0.42), r);
      g.lineStyle(5, 0xffffff, 0.9); g.strokeRoundedRect(1, 1, width - 2, height - 2, r);
      g.generateTexture(_k, width, height); g.destroy();
    }
    const bg = scene.textures.exists(ASSET_KEYS.uiFrame) ? scene.add.image(x, y, ASSET_KEYS.uiFrame).setDisplaySize(width, height) : scene.add.image(x, y, _k);
  const txt = scene.add.text(x, y, label, {
    fontFamily: '"Arial Black", Arial, sans-serif',
    fontSize: fontPx(42),
    color: '#ffffff',
    stroke: '#07111d',
    strokeThickness: strokePx(8),
  }).setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true });
  let pressed = false;
  bg.on('pointerdown', () => {
    if (pressed) return;
    pressed = true;
    bg.setAlpha(0.82);
    txt.setAlpha(0.9);
    onClick?.();
  });
  const release = () => {
    pressed = false;
    bg.setAlpha(1);
    txt.setAlpha(1);
    bg.setDisplaySize(width, height);
    txt.setScale(1);
  };
  bg.on('pointerup', release);
  bg.on('pointerout', release);
  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };
}
