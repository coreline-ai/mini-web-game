import { ASSET_KEYS } from '../constants/gameKeys.js';

export default class AttackHelicopterBoss {
  constructor(scene, target) {
    this.scene = scene;
    this.target = target;
    this.phase = 1;
    this.attackMs = 2200;
    this.attackClock = 1100;
    this.stunMs = 0;
    this.missileSide = 1;
  }

  update(delta, time) {
    const target = this.target;
    if (!target.active) return null;
    const ratio = target.hp / target.maxHp;
    const nextPhase = ratio > 0.67 ? 1 : ratio > 0.34 ? 2 : 3;
    if (nextPhase !== this.phase) this.setPhase(nextPhase);
    if (this.stunMs > 0) {
      this.stunMs = Math.max(0, this.stunMs - delta);
      target.sprite.angle = Math.sin(time * 0.035) * 5;
      return null;
    }
    const speed = this.phase === 1 ? 0.0018 : this.phase === 2 ? 0.0024 : 0.0032;
    const range = this.phase === 1 ? 92 : this.phase === 2 ? 112 : 135;
    target.sprite.x = 195 + Math.sin(time * speed) * range;
    target.sprite.y = 225 + Math.sin(time * speed * 1.7) * (this.phase * 8);
    target.sprite.angle = Math.cos(time * speed) * (this.phase === 3 ? 7 : 4);
    this.attackClock -= delta;
    if (this.attackClock > 0) return null;
    this.attackClock += this.attackMs;
    const podAlive = target.parts?.pod > 0;
    if (this.phase >= 2 && podAlive) {
      this.missileSide *= -1;
      return { damage: target.cfg.convoyDamage + (this.phase === 3 ? 18 : 8), missile: true, side: this.missileSide };
    }
    return { damage: target.cfg.convoyDamage, missile: false };
  }

  setPhase(phase) {
    this.phase = phase;
    this.attackMs = phase === 1 ? 2200 : phase === 2 ? 1800 : 1350;
    if (phase >= 2) this.target.sprite.setTexture(ASSET_KEYS.bossDamaged);
    this.scene.warn(`BOSS PHASE ${phase}`, phase === 3 ? '#ff554f' : '#ffb43b');
    this.scene.onBossPhase?.(phase);
  }

  stun(duration = 1200) {
    this.stunMs = Math.max(this.stunMs, duration);
    this.target.sprite.setTint(0x7eefff);
    this.scene.time.delayedCall(duration, () => this.target.sprite?.active && this.target.sprite.clearTint());
  }

  destroy() {}
}
