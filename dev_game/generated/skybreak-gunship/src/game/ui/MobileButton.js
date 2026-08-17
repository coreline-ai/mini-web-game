export function makeTextButton(scene, x, y, label, onClick, width = 230, height = 60, accent = 0x43dfff) {
  const key = `tactical_${width}x${height}_${accent}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ add: false });
    const r = Math.min(15, height / 2);
    g.fillStyle(0x061822, 0.98).fillRoundedRect(0, 0, width, height, r);
    g.fillStyle(0x123746, 0.88).fillRoundedRect(3, 3, width - 6, height - 6, r - 2);
    g.fillStyle(accent, 0.18).fillRoundedRect(5, 5, width - 10, height * 0.4, r - 3);
    g.lineStyle(2, accent, 0.92).strokeRoundedRect(1, 1, width - 2, height - 2, r);
    g.generateTexture(key, width, height); g.destroy();
  }
  const bg = scene.add.image(x, y, key);
  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
  let locked = false;
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => {
    if (locked) return;
    locked = true; bg.setScale(0.97); txt.setScale(0.97);
    onClick?.();
    scene.time.delayedCall(250, () => { locked = false; if (bg.active) { bg.setScale(1); txt.setScale(1); } });
  });
  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };
}
