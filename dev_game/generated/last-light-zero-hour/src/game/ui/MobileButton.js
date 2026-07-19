export function makeTextButton(scene, x, y, label, onClick, width = 190, height = 58, options = {}) {
  const _k = 'btnui_' + width + 'x' + height;
    if (!scene.textures.exists('ui_frame') && !scene.textures.exists(_k)) {
      const g = scene.make.graphics({ add: false });
      const r = Math.min(22, height / 2);
      g.fillStyle(0x061014, 1); g.fillRoundedRect(0, 0, width, height, r);
      g.fillStyle(0x173239, 1); g.fillRoundedRect(3, 3, width - 6, height - 8, r);
      g.fillStyle(0x2e5559, 0.82); g.fillRoundedRect(6, 5, width - 12, Math.max(5, height * 0.4), r);
      g.lineStyle(Math.max(3, height * 0.035), 0xe5b966, 0.92); g.strokeRoundedRect(2, 2, width - 4, height - 4, r);
      g.generateTexture(_k, width, height); g.destroy();
    }
    const bg = scene.textures.exists('ui_frame') ? scene.add.image(x, y, 'ui_frame').setDisplaySize(width, height) : scene.add.image(x, y, _k);
  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: `${Math.max(24, Math.round(height * 0.37))}px`, color: '#ffffff', stroke: '#000000', strokeThickness: Math.max(4, Math.round(height * 0.055)) }).setOrigin(0.5);
  let fired = false; let enabled = options.disabled !== true;
  const resetVisual = () => { bg.setDisplaySize(width, height); txt.setScale(1); };
  const setEnabled = (value) => { enabled = !!value; if (enabled && !fired) bg.setInteractive({ useHandCursor: true }); else bg.disableInteractive(); resetVisual(); };
  if (enabled) bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => { if (!enabled || fired) return; bg.setDisplaySize(width * 0.96, height * 0.96); txt.setScale(0.96); if (options.fireOn === 'pointerdown') { if (options.oneShot) { fired = true; bg.disableInteractive(); } onClick?.(); } });
  bg.on('pointerup', () => { if (!enabled || fired) return; resetVisual(); if (options.fireOn !== 'pointerdown') { if (options.oneShot) { fired = true; bg.disableInteractive(); } onClick?.(); } });
  bg.on('pointerout', resetVisual);
  return { bg, txt, resetVisual, setEnabled, destroy: () => { bg.destroy(); txt.destroy(); } };
}
