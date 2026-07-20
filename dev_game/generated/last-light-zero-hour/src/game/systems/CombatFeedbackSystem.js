import { ASSET_KEYS } from '../constants/gameKeys.js';

export default class CombatFeedbackSystem {
  constructor(scene) { this.scene = scene; }

  muzzle(x, y, angle, color = 0xffdf8a, scale = 1) {
    const flash = this.scene.add.triangle(x, y, 0, 0, 18 * scale, 54 * scale, -18 * scale, 54 * scale, color, 0.95).setOrigin(0.5, 1).setDepth(35).setRotation(angle + Math.PI / 2);
    this.scene.tweens.add({ targets: flash, alpha: 0, scale: 1.8, duration: 75, onComplete: () => flash.destroy() });
  }

  infectedBurst(x, y, power = 1) {
    if (this.scene.textures.exists(ASSET_KEYS.fxInfectedBurst)) {
      const fx = this.scene.add.image(x, y, ASSET_KEYS.fxInfectedBurst).setDepth(24).setDisplaySize(112 * power, 112 * power).setAlpha(0.9).setRotation(Math.random() * Math.PI * 2);
      this.scene.tweens.add({ targets: fx, scaleX: fx.scaleX * 1.75, scaleY: fx.scaleY * 1.75, alpha: 0, duration: 360, ease: 'Cubic.easeOut', onComplete: () => fx.destroy() });
    }
    const count = Math.min(14, Math.round(5 + power * 4));
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const d = 26 + Math.random() * 68 * power;
      const p = this.scene.add.circle(x, y, 5 + Math.random() * 8 * power, i % 3 === 0 ? 0x2f7771 : 0x05090a, 0.88).setDepth(22);
      this.scene.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.35, duration: 260 + Math.random() * 240, ease: 'Quad.easeOut', onComplete: () => p.destroy() });
    }
  }

  impact(x, y, color = 0xffe7a0) {
    const ring = this.scene.add.circle(x, y, 18, color, 0).setStrokeStyle(7, color, 0.86).setDepth(33);
    this.scene.tweens.add({ targets: ring, scale: 2.7, alpha: 0, duration: 170, onComplete: () => ring.destroy() });
  }

  arcBolt(fromX, fromY, toX, toY, color = 0x71e7ff, power = 1) {
    const dx = toX - fromX; const dy = toY - fromY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / distance; const ny = dx / distance;
    const segments = Math.max(6, Math.min(18, Math.ceil(distance / 70)));
    const points = [{ x: fromX, y: fromY }];
    for (let i = 1; i < segments; i += 1) {
      const t = i / segments;
      const jitter = (Math.random() * 2 - 1) * 34 * power * Math.sin(Math.PI * t);
      points.push({ x: fromX + dx * t + nx * jitter, y: fromY + dy * t + ny * jitter });
    }
    points.push({ x: toX, y: toY });
    const drawPath = (graphics, width, alpha) => {
      graphics.lineStyle(width, color, alpha);
      for (let i = 1; i < points.length; i += 1) graphics.lineBetween(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    };
    const glow = this.scene.add.graphics().setDepth(36);
    const core = this.scene.add.graphics().setDepth(37);
    drawPath(glow, 30 * power, 0.2); drawPath(core, 9 * power, 0.98);
    const strike = this.scene.add.circle(toX, toY, 22, 0xc9fbff, 0.75).setDepth(38);
    this.scene.tweens.add({ targets: [glow, core, strike], alpha: 0, duration: 760, ease: 'Quad.easeOut', onComplete: () => { glow.destroy(); core.destroy(); strike.destroy(); } });
  }

  arcPulse(x, y, color = 0x71e7ff) {
    const ring = this.scene.add.circle(x, y, 34, color, 0.1).setStrokeStyle(10, color, 0.84).setDepth(35);
    this.scene.cameras.main.flash(70, 70, 210, 255, false);
    this.scene.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 620, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  rocketTrail(x, y) {
    const ember = this.scene.add.circle(x, y, 15, 0xffa04f, 0.82).setDepth(29);
    const smoke = this.scene.add.circle(x, y + 8, 22, 0x2b2523, 0.42).setDepth(28);
    this.scene.tweens.add({ targets: ember, scale: 0.25, alpha: 0, duration: 250, onComplete: () => ember.destroy() });
    this.scene.tweens.add({ targets: smoke, y: y + 34, scale: 1.8, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => smoke.destroy() });
  }

  damageText(x, y, value, critical = false) {
    if (Math.random() > 0.36 && !critical) return;
    const t = this.scene.add.text(x, y, `${Math.round(value)}`, { fontFamily: 'Arial Black, Arial', fontSize: critical ? '42px' : '30px', color: critical ? '#fff0aa' : '#d8f6ef', stroke: '#03090a', strokeThickness: 7 }).setOrigin(0.5).setDepth(70);
    this.scene.tweens.add({ targets: t, y: y - 82, alpha: 0, duration: 620, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  explosion(x, y, radius, color = 0xff7a45) {
    // High-resolution alpha FX supplies the fire/smoke silhouette while the
    // vector rings below communicate the exact gameplay damage radius.
    const rocketExplosion = this.scene.textures.exists(ASSET_KEYS.fxRocketExplosion)
      ? this.scene.add.image(x, y, ASSET_KEYS.fxRocketExplosion)
        .setDepth(35)
        .setDisplaySize(radius * 2.7, radius * 2.7)
        .setRotation(Math.random() * Math.PI * 2)
        .setAlpha(0.96)
      : null;
    const core = this.scene.add.circle(x, y, 34, 0xfff6cf, 1).setDepth(36);
    const fireball = this.scene.add.circle(x, y, 70, color, 0.72).setDepth(35);
    const shockwave = this.scene.add.circle(x, y, 42, color, 0.08).setStrokeStyle(22, 0xffb169, 0.96).setDepth(34);
    const blastArea = this.scene.add.circle(x, y, radius, color, 0.045).setStrokeStyle(8, color, 0.38).setDepth(32).setScale(0.15);
    this.scene.tweens.add({ targets: core, scale: 4.8, alpha: 0, duration: 450, ease: 'Cubic.easeOut', onComplete: () => core.destroy() });
    if (rocketExplosion) {
      this.scene.tweens.add({
        targets: rocketExplosion,
        scaleX: rocketExplosion.scaleX * 1.17,
        scaleY: rocketExplosion.scaleY * 1.17,
        alpha: 0,
        duration: 760,
        ease: 'Cubic.easeOut',
        onComplete: () => rocketExplosion.destroy(),
      });
    }
    this.scene.tweens.add({ targets: fireball, scale: Math.max(2.2, radius / 105), alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => fireball.destroy() });
    this.scene.tweens.add({ targets: shockwave, scale: radius / 42, alpha: 0, duration: 850, ease: 'Cubic.easeOut', onComplete: () => shockwave.destroy() });
    this.scene.tweens.add({ targets: blastArea, scale: 1, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => blastArea.destroy() });
    for (let i = 0; i < 18; i += 1) {
      const angle = Math.random() * Math.PI * 2; const travel = radius * (0.45 + Math.random() * 0.62);
      const spark = this.scene.add.rectangle(x, y, 10 + Math.random() * 12, 28 + Math.random() * 34, i % 3 === 0 ? 0xfff0a8 : color, 0.96).setDepth(37).setRotation(angle);
      this.scene.tweens.add({ targets: spark, x: x + Math.cos(angle) * travel, y: y + Math.sin(angle) * travel, angle: spark.angle + 2.5, scale: 0.15, alpha: 0, duration: 540 + Math.random() * 330, ease: 'Cubic.easeOut', onComplete: () => spark.destroy() });
    }
    this.scene.cameras.main.flash(90, 255, 132, 70, false);
    this.scene.cameras.main.shake(320, Math.min(0.024, radius / 15000));
  }
}
