import { fontPx, strokePx, su } from '../utils/scale.js';

export function makeTextButton(scene, x, y, label, onClick, width = 190, height = 58) {
  width = su(width);
  height = su(height);
  const _k = 'btnui_' + width + 'x' + height;
    if (!scene.textures.exists('ui_frame') && !scene.textures.exists(_k)) {
      const g = scene.make.graphics({ add: false });
      const r = Math.min(su(22), height / 2);
      g.fillStyle(0x0a3d1f, 1); g.fillRoundedRect(0, 0, width, height, r);
      g.fillStyle(0x22b357, 1); g.fillRoundedRect(su(2), su(2), width - su(4), height - su(6), r);
      g.fillStyle(0x46e07e, 0.85); g.fillRoundedRect(su(4), su(3), width - su(8), Math.max(su(3), height * 0.42), r);
      g.lineStyle(su(2.5), 0xffffff, 0.9); g.strokeRoundedRect(su(1), su(1), width - su(2), height - su(2), r);
      g.generateTexture(_k, width, height); g.destroy();
    }
    const bg = scene.textures.exists('ui_frame') ? scene.add.image(x, y, 'ui_frame').setDisplaySize(width, height) : scene.add.image(x, y, _k);
  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: fontPx(24), color: '#ffffff', stroke: '#000000', strokeThickness: strokePx(4) }).setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => { bg.setDisplaySize(width * 0.96, height * 0.96); txt.setScale(0.96); onClick?.(); });
  bg.on('pointerup', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  bg.on('pointerout', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };
}
