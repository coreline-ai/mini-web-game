import { fontPx, strokePx, su } from '../constants/tuning.js';

export function makeTextButton(scene, x, y, label, onClick, width = 190, height = 58) {
  const texWidth = Math.round(width);
  const texHeight = Math.round(height);
  const _k = 'btnui_' + texWidth + 'x' + texHeight;
    if (!scene.textures.exists('ui_frame') && !scene.textures.exists(_k)) {
      const g = scene.make.graphics({ add: false });
      const r = Math.min(su(22), texHeight / 2);
      g.fillStyle(0x0a3d1f, 1); g.fillRoundedRect(0, 0, texWidth, texHeight, r);
      g.fillStyle(0x22b357, 1); g.fillRoundedRect(su(2), su(2), texWidth - su(4), texHeight - su(6), r);
      g.fillStyle(0x46e07e, 0.85); g.fillRoundedRect(su(4), su(3), texWidth - su(8), Math.max(su(3), texHeight * 0.42), r);
      g.lineStyle(su(2.5), 0xffffff, 0.9); g.strokeRoundedRect(su(1), su(1), texWidth - su(2), texHeight - su(2), r);
      g.generateTexture(_k, texWidth, texHeight); g.destroy();
    }
    const bg = scene.textures.exists('ui_frame') ? scene.add.image(x, y, 'ui_frame').setDisplaySize(width, height) : scene.add.image(x, y, _k);
  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: fontPx(24), color: '#ffffff', stroke: '#000000', strokeThickness: strokePx(4) }).setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => { bg.setDisplaySize(width * 0.96, height * 0.96); txt.setScale(0.96); onClick?.(); });
  bg.on('pointerup', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  bg.on('pointerout', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };
}
