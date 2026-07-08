import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { TUNING } from '../constants/tuning.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import { su, sx, sy } from '../utils/scale.js';

// Bullseye Rush 고유 시스템 ①: 자동 왕복 조준 + 탭 발사.
// 조준 마커가 스스로 좌우로 스윕한다 — 플레이어의 유일한 입력은 "탭 타이밍".
// 탭 순간의 aimX에서 화살이 수직으로 발사된다.
export const AIM = {
  baseSpeed: sx(240),       // px/s, 라운드마다 RoundManager가 가속
  arrowSpeed: sy(1500),
  fireCooldownMs: 240,
  margin: sx(74),           // 좌우 반환 여백: 플레이어 스프라이트가 화면 밖으로 잘리지 않게 확보
};

export default class OscillatingAimSystem {
  constructor(scene) {
    this.scene = scene;
    this.speed = AIM.baseSpeed;
    this.dir = 1;
    this.aimX = SPEC.canvas.width / 2;
    this.cooldown = 0;
    this.stats = { fired: 0 };
    this.locked = false; // 라운드 전환 중 발사 잠금

    if (!scene.textures.exists('arrow')) {
      const g = scene.add.graphics();
      g.fillStyle(0xf2e6d8, 1).fillRect(su(11), 0, su(4), sy(40));
      g.fillStyle(0x8a5a2b, 1).fillRect(su(10), sy(40), su(6), sy(14));
      g.fillTriangle(su(13), 0, su(4), sy(14), su(22), sy(14));
      g.generateTexture('arrow', su(26), sy(56));
      g.destroy();
    }
    this.arrows = scene.physics.add.group({ maxSize: 12, allowGravity: false });

    // 조준 가이드: 세로 점선 + 하단 마커(다이아)
    this.guide = scene.add.graphics().setDepth(9);
    this.marker = scene.add.polygon(this.aimX, TUNING.playerY - sy(64), [su(8), 0, su(16), sy(10), su(8), sy(20), 0, sy(10)], 0xffe066, 0.95)
      .setOrigin(0.5).setDepth(9).setStrokeStyle(su(2), 0xb8860b, 1);

    this.onDown = () => { if (!scene.isOver) this.fire(); };
    scene.input.on('pointerdown', this.onDown);
  }

  setSweepSpeed(px) { this.speed = px; }

  fire() {
    if (this.cooldown > 0 || this.locked || this.scene.isOver) return;
    if (this.scene.rounds && this.scene.rounds.arrowsLeft <= 0) return; // 화살 없음
    this.cooldown = AIM.fireCooldownMs;
    const px = this.aimX, py = this.scene.player.y - sy(26);
    const a = this.arrows.get(px, py, 'arrow');
    if (!a) return;
    a.enableBody(true, px, py, true, true);
    a._missed = false;
    a.setDepth(8).setDisplaySize(su(24), sy(52)).setRotation(0);
    a.body.setAllowGravity(false);
    a.body.setSize(a.width * 0.3, a.height * 0.8, true);
    a.setVelocity(0, -AIM.arrowSpeed);
    this.stats.fired += 1;
    this.scene.rounds?.onArrowFired();
    const pl = this.scene.player;
    if (this.scene.anims.exists('player_run')) pl.anims.play({ key: 'player_run', repeat: 0 }, true);
    this.scene.tweens.add({ targets: pl, y: pl.y + sy(5), duration: 55, yoyo: true });
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxStart, 0.35);
  }

  update(delta) {
    if (this.cooldown > 0) this.cooldown -= delta;
    // 마커 왕복 스윕
    this.aimX += this.dir * this.speed * (delta / 1000);
    const min = AIM.margin, max = SPEC.canvas.width - AIM.margin;
    if (this.aimX > max) { this.aimX = max; this.dir = -1; }
    if (this.aimX < min) { this.aimX = min; this.dir = 1; }
    // 궁수가 마커를 따라 좌우 이동(시각 피드백) + 가이드 점선
    this.scene.player.x = Phaser.Math.Linear(this.scene.player.x, this.aimX, 0.35);
    this.marker.setX(this.aimX);
    this.guide.clear();
    this.guide.lineStyle(su(2), 0xffe066, 0.5);
    const top = TUNING.safeTop + sy(40), bottom = TUNING.playerY - sy(78);
    for (let y = bottom; y > top; y -= sy(26)) {
      this.guide.beginPath();
      this.guide.moveTo(this.aimX, y);
      this.guide.lineTo(this.aimX, Math.max(top, y - sy(13)));
      this.guide.strokePath();
    }
    // 화면 위로 벗어난 화살 = 미스
    this.arrows.children.each((a) => {
      if (a.active && a.y < TUNING.safeTop - sy(20) && !a._missed) {
        a._missed = true;
        a.disableBody(true, true);
        this.scene.rounds.onArrowMiss(a.x);
      }
    });
  }

  clearArrows() {
    this.arrows.children.each((a) => a.disableBody(true, true));
  }

  destroy() {
    this.scene.input.off('pointerdown', this.onDown);
  }
}
