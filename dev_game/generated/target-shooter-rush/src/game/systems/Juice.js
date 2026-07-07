// Lightweight game feel: screen shake, color flash, particle burst, floating score pop.
export const Juice = {
  shake(scene, intensity = 0.012, duration = 200) { scene.cameras.main.shake(duration, intensity); },
  flash(scene, color = 0xffffff, duration = 130) { scene.cameras.main.flash(duration, (color >> 16) & 255, (color >> 8) & 255, color & 255); },
  burst(scene, x, y, tint = 0xffffff, texKey) {
    if (texKey && scene.textures.exists(texKey)) {
      const img = scene.add.image(x, y, texKey).setDepth(30);
      const s = 96 / Math.max(img.width, img.height);
      img.setScale(s).setAlpha(0.95);
      scene.tweens.add({ targets: img, scale: s * 1.7, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
      return;
    }
    const ring = scene.add.circle(x, y, 7, tint, 0.9).setDepth(30);
    scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      const p = scene.add.circle(x, y, 3, tint, 1).setDepth(30);
      scene.tweens.add({ targets: p, x: x + Math.cos(a) * 44, y: y + Math.sin(a) * 44, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
  },
  scorePop(scene, x, y, text, color = '#ffe066') {
    const t = scene.add.text(x, y, text, { fontFamily: 'Arial Black, Arial', fontSize: '22px', color, stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(31);
    const canvasWidth = Number(scene.scale?.width || scene.game?.config?.width || 390);
    const canvasHeight = Number(scene.scale?.height || scene.game?.config?.height || 844);
    const marginX = Math.max(32, t.width / 2 + 8);
    const safeX = Math.max(marginX, Math.min(x, canvasWidth - marginX));
    const safeY = Math.max(84, Math.min(y, canvasHeight - 108));
    t.setPosition(safeX, safeY);
    scene.tweens.add({ targets: t, y: safeY - 60, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  },
};
