import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import { Juice } from '../systems/Juice.js';
import { fontPx, strokePx } from '../constants/tuning.js';

// 시나리오 보완 ①: METEOR SHOWER 이벤트.
// elapsed(단조 축) 파생 주기로만 발동 — 보상이 난이도를 되돌리지 않는다(계약 §D 준수).
// 흐름: 경고 배너(1.6s, 발광 텍스트+살짝 흔들림) → 폭풍(spawn 간격 1/3, SHOWER.durMs)
//       → 종료 시 생존 보너스 +50×level.
export const SHOWER = {
  firstAtMs: 18000,
  everyMs: 22000,
  warnMs: 1600,
  durMs: 4200,
  spawnDivisor: 3,
  bonusPerLevel: 50,
};

export default class ShowerEventSystem {
  constructor(scene) {
    this.scene = scene;
    this.state = 'idle'; // idle → warning → active → idle
    this.nextAt = SHOWER.firstAtMs;
    this.stateUntil = 0;
    this.stats = { showers: 0 };
    this.banner = null;
  }

  // Spawner 간격 배수 (active면 1/3)
  intervalScale() { return this.state === 'active' ? 1 / SHOWER.spawnDivisor : 1; }

  update(elapsedMs, level) {
    if (this.scene.isOver) return;
    if (this.state === 'idle' && elapsedMs >= this.nextAt) {
      this.state = 'warning';
      this.stateUntil = elapsedMs + SHOWER.warnMs;
      const w = SPEC.canvas.width;
      this.banner = this.scene.add.text(w / 2, SPEC.canvas.height * 0.3, '⚠ METEOR SHOWER ⚠', {
        fontFamily: 'Arial Black, sans-serif', fontSize: fontPx(26), color: '#ff8866', stroke: '#2a0e0e', strokeThickness: strokePx(6),
      }).setOrigin(0.5).setDepth(30).setAlpha(0);
      this.scene.tweens.add({ targets: this.banner, alpha: 1, duration: 180, yoyo: true, repeat: 4 });
      AudioManager.playSfx(this.scene, ASSET_KEYS.sfxHit, 0.35);
    } else if (this.state === 'warning' && elapsedMs >= this.stateUntil) {
      this.state = 'active';
      this.stateUntil = elapsedMs + SHOWER.durMs;
      this.banner?.destroy(); this.banner = null;
      Juice.flash(this.scene, 0xff8866);
    } else if (this.state === 'active' && elapsedMs >= this.stateUntil) {
      this.state = 'idle';
      this.nextAt = elapsedMs + SHOWER.everyMs;
      this.stats.showers += 1;
      const bonus = SHOWER.bonusPerLevel * Math.max(1, level);
      this.scene.score.score += bonus;
      Juice.scorePop(this.scene, SPEC.canvas.width / 2, SPEC.canvas.height * 0.3, `SURVIVED +${bonus}`);
      AudioManager.playSfx(this.scene, ASSET_KEYS.sfxCollect, 0.6);
    }
  }

  destroy() { this.banner?.destroy(); }
}
