function selectButtonTexture(scene, width, height) {
  if (width === 220 && height <= 54 && scene.textures.exists('ui_frame_slim')) return 'ui_frame_slim';
  if (width >= 225 && height <= 64 && scene.textures.exists('ui_frame_dialog')) return 'ui_frame_dialog';
  if (scene.textures.exists('ui_frame')) return 'ui_frame';
  return null;
}

export function makeTextButton(scene, x, y, label, onClick, width = 190, height = 58) {
  const textureKey = selectButtonTexture(scene, width, height);
  const _k = 'btnui_' + width + 'x' + height;
    if (!textureKey && !scene.textures.exists(_k)) {
      const g = scene.make.graphics({ add: false });
      const r = Math.min(22, height / 2);
      g.fillStyle(0x0a3d1f, 1); g.fillRoundedRect(0, 0, width, height, r);
      g.fillStyle(0x22b357, 1); g.fillRoundedRect(2, 2, width - 4, height - 6, r);
      g.fillStyle(0x46e07e, 0.85); g.fillRoundedRect(4, 3, width - 8, Math.max(3, height * 0.42), r);
      g.lineStyle(2.5, 0xffffff, 0.9); g.strokeRoundedRect(1, 1, width - 2, height - 2, r);
      g.generateTexture(_k, width, height); g.destroy();
    }
    const bg = textureKey ? scene.add.image(x, y, textureKey).setDisplaySize(width, height) : scene.add.image(x, y, _k);
  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => { bg.setDisplaySize(width * 0.96, height * 0.96); txt.setScale(0.96); onClick?.(); });
  bg.on('pointerup', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  bg.on('pointerout', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };
}
