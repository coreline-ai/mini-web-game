import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { TUNING, su } from '../constants/tuning.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import { Juice } from '../systems/Juice.js';

// 시나리오 보완 ②: SHIELD 파워업 — 1회 피격 무효.
// 획득: 낙하 아이템(가끔) → 플레이어 주변 링 이펙트. 피격 시 소모+0.8s 무적(깜빡임).
// 계약 §D 준수: 실드는 생존 보조일 뿐 난이도 입력(elapsed)에 관여하지 않는다.
// 계약 §A 준수: 리스폰/소모 시 tween kill + alpha/visible 완전 복원.
export const SHIELD = {
  firstAtMs: 12000,
  everyMs: 16000,
  chance: 0.65,
  fallSpeed: su(150),
  invulnMs: 800,
  size: su(60),
};

export default class ShieldSystem {
  constructor(scene) {
    this.scene = scene;
    this.nextAt = SHIELD.firstAtMs;
    this.hasShield = false;
    this.invulnUntil = 0;
    this.stats = { pickups: 0, blocks: 0 };

    if (!scene.textures.exists(ASSET_KEYS.shield)) {
      const g = scene.add.graphics();
      g.lineStyle(6, 0x58c7f2, 1).strokeCircle(32, 32, 26);
      g.fillStyle(0x58c7f2, 0.35).fillCircle(32, 32, 24);
      g.generateTexture(ASSET_KEYS.shield, 64, 64);
      g.destroy();
    }
    this.items = scene.physics.add.group({ maxSize: 3, allowGravity: false });
    // 장착 링 (플레이어 추종)
    this.ring = scene.add.circle(0, 0, TUNING.playerSize * 0.62, 0x58c7f2, 0.16)
      .setStrokeStyle(su(3.5), 0x58c7f2, 0.9).setDepth(9).setVisible(false);
    scene.physics.add.overlap(scene.player, this.items, (_p, it) => this.pickup(it), undefined, scene);
  }

  pickup(item) {
    if (!item.active) return;
    const _x = item.x, _y = item.y;
    item.disableBody(true, true);
    this.hasShield = true;
    this.stats.pickups += 1;
    this.ring.setVisible(true).setAlpha(1);
    Juice.burst(this.scene, _x, _y, 0x58c7f2, ASSET_KEYS.fx.collect);
    Juice.scorePop(this.scene, _x, _y, 'SHIELD!');
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxCollect, 0.6);
  }

  // 피격 가로채기: true 반환 = 실드가 흡수(게임오버 아님)
  absorbHit() {
    const now = this.scene.score.elapsedMs;
    if (now < this.invulnUntil) return true; // 무적 프레임
    if (!this.hasShield) return false;
    this.hasShield = false;
    this.stats.blocks += 1;
    this.invulnUntil = now + SHIELD.invulnMs;
    // 실드 파열 연출 + 무적 깜빡임 (§A: 종료 시 완전 복원)
    this.ring.setVisible(false);
    Juice.shake(this.scene);
    Juice.burst(this.scene, this.scene.player.x, this.scene.player.y, 0x58c7f2, ASSET_KEYS.fx.hit);
    Juice.scorePop(this.scene, this.scene.player.x, this.scene.player.y - su(40), 'BLOCKED!');
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxHit, 0.55);
    this.scene.tweens.killTweensOf(this.scene.player);
    this.scene.tweens.add({
      targets: this.scene.player, alpha: 0.35, duration: 100, yoyo: true, repeat: 3,
      onComplete: () => { this.scene.player.setAlpha(1); },
    });
    return true;
  }

  update(elapsedMs) {
    if (this.scene.isOver) return;
    if (elapsedMs >= this.nextAt) {
      this.nextAt = elapsedMs + SHIELD.everyMs;
      if (Math.random() < SHIELD.chance && this.items.countActive(true) === 0) {
        const x = Phaser.Math.Between(TUNING.safeSide + su(30), SPEC.canvas.width - TUNING.safeSide - su(30));
        const it = this.items.get(x, -su(50), ASSET_KEYS.shield);
        if (it) {
          it.enableBody(true, x, -su(50), true, true);
          it.setDepth(4).setDisplaySize(SHIELD.size, SHIELD.size).setAlpha(1);
          it.body.setCircle((Math.min(it.width, it.height) / 2) * 0.8, it.width * 0.1, it.height * 0.1);
          it.setVelocity(0, SHIELD.fallSpeed);
        }
      }
    }
    this.items.children.each((it) => { if (it.active && it.y > SPEC.canvas.height + su(80)) it.disableBody(true, true); });
    if (this.ring.visible) this.ring.setPosition(this.scene.player.x, this.scene.player.y);
  }

  destroy() { this.ring.destroy(); }
}
