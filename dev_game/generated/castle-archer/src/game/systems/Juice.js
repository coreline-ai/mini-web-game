// Lightweight game feel: screen shake, color flash, particle burst, floating score pop.
import { SPEC } from '../data/spec.js';

function clampPoint(scene, x, y, pad = 84) {
  const width = SPEC.canvas.width;
  const height = SPEC.canvas.height;
  return {
    x: Math.min(width - pad, Math.max(pad, x)),
    y: Math.min(height - pad, Math.max(pad, y)),
  };
}

export const Juice = {
  shake(scene, intensity = 0.012, duration = 200) { scene.cameras.main.shake(duration, intensity); },
  flash(scene, color = 0xffffff, duration = 180) {
    const overlay = scene.add.rectangle(0, 0, scene.scale.gameSize.width, scene.scale.gameSize.height, color, 0.18)
      .setOrigin(0)
      .setDepth(90);
    scene.tweens.add({ targets: overlay, alpha: 0, duration, ease: 'Cubic.easeOut', onComplete: () => overlay.destroy() });
  },
  burst(scene, x, y, tint = 0xffffff, texKey) {
    const p = clampPoint(scene, x, y);
    if (texKey && scene.textures.exists(texKey)) {
      const img = scene.add.image(p.x, p.y, texKey).setDepth(30);
      const s = 96 / Math.max(img.width, img.height);
      img.setScale(s).setAlpha(0.95);
      scene.tweens.add({ targets: img, scale: s * 1.7, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
      return;
    }
    const ring = scene.add.circle(p.x, p.y, 7, tint, 0.9).setDepth(30);
    scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      const dot = scene.add.circle(p.x, p.y, 3, tint, 1).setDepth(30);
      scene.tweens.add({ targets: dot, x: p.x + Math.cos(a) * 44, y: p.y + Math.sin(a) * 44, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => dot.destroy() });
    }
  },
  scorePop(scene, x, y, text, color = '#ffe066') {
    const t = scene.add.text(x, y, text, { fontFamily: 'Arial Black, Arial', fontSize: '22px', color, stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(31);
    scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  },
};
