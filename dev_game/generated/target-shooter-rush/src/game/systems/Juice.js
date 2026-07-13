// Lightweight game feel: screen shake, color flash, particle burst, floating score pop.
import { SPEC } from '../data/spec.js';
import { fontPx, strokePx, su } from '../constants/tuning.js';

function canvasSize(scene) {
  return {
    width: Number(scene.scale?.gameSize?.width || scene.game?.config?.width || SPEC.canvas.width),
    height: Number(scene.scale?.gameSize?.height || scene.game?.config?.height || SPEC.canvas.height),
  };
}

function clampPoint(scene, x, y, radius) {
  const { width, height } = canvasSize(scene);
  return {
    x: Math.max(radius, Math.min(x, width - radius)),
    y: Math.max(radius, Math.min(y, height - radius)),
  };
}

export const Juice = {
  shake(scene, intensity = 0.012, duration = 200) { scene.cameras.main.shake(duration, intensity); },
  flash(scene, color = 0xffffff, duration = 130) { scene.cameras.main.flash(duration, (color >> 16) & 255, (color >> 8) & 255, color & 255); },
  burst(scene, x, y, tint = 0xffffff, texKey) {
    if (texKey && scene.textures.exists(texKey)) {
      const peakRadius = su(84);
      const p = clampPoint(scene, x, y, peakRadius);
      const img = scene.add.image(p.x, p.y, texKey).setDepth(30);
      const s = su(96) / Math.max(img.width, img.height);
      img.setScale(s * 1.08).setAlpha(1).setBlendMode('ADD');
      scene.tweens.add({ targets: img, scale: s * 1.85, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
      return;
    }
    const p = clampPoint(scene, x, y, su(52));
    const ring = scene.add.circle(p.x, p.y, su(7), tint, 0.9).setDepth(30);
    scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      const part = scene.add.circle(p.x, p.y, su(3), tint, 1).setDepth(30);
      scene.tweens.add({ targets: part, x: p.x + Math.cos(a) * su(44), y: p.y + Math.sin(a) * su(44), alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => part.destroy() });
    }
  },
  scorePop(scene, x, y, text, color = '#ffe066') {
    const t = scene.add.text(x, y, text, { fontFamily: 'Arial Black, Arial', fontSize: fontPx(22), color, stroke: '#000000', strokeThickness: strokePx(4) }).setOrigin(0.5).setDepth(31);
    const { width: canvasWidth, height: canvasHeight } = canvasSize(scene);
    const marginX = Math.max(su(32), t.width / 2 + su(8));
    const safeX = Math.max(marginX, Math.min(x, canvasWidth - marginX));
    const safeY = Math.max(su(84), Math.min(y, canvasHeight - su(108)));
    t.setPosition(safeX, safeY);
    scene.tweens.add({ targets: t, y: safeY - su(60), alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  },
};
