import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { TUNING } from '../constants/tuning.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import { pointerToLogical } from '../constants/renderScale.js';

// Castle Archer 고유 시스템 ①: 드래그 조준 → 놓으면 발사 (수동 저격).
// - pointerdown/move: 궁수 위치에서 손가락 방향으로 점선 조준선 + 레티클 표시
// - pointerup: 조준 방향으로 화살 1발 발사 (쿨다운 CASTLE.fireCooldownMs)
// - 화살 풀 재사용, 텍스처 없으면 폴백 텍스처 생성(아트 전에도 항상 동작)
export const CASTLE = {
  arrowSpeed: 1080,
  fireCooldownMs: 170,
  aimMinAngleDeg: -168, // 위쪽 반구로 클램프 (수평선 아래로는 못 쏨)
  aimMaxAngleDeg: -12,
  aimGuideLength: 560,
  aimGuideMargin: 22,
};

function rayLengthToSafeBounds(px, py, ang, maxLen) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const bounds = {
    left: CASTLE.aimGuideMargin,
    right: SPEC.canvas.width - CASTLE.aimGuideMargin,
    top: TUNING.safeTop + CASTLE.aimGuideMargin,
    bottom: TUNING.playerY - 44,
  };
  let len = maxLen;
  if (dx < -0.001) len = Math.min(len, (bounds.left - px) / dx);
  if (dx > 0.001) len = Math.min(len, (bounds.right - px) / dx);
  if (dy < -0.001) len = Math.min(len, (bounds.top - py) / dy);
  if (dy > 0.001) len = Math.min(len, (bounds.bottom - py) / dy);
  return Phaser.Math.Clamp(len, 72, maxLen);
}

export default class AimShotSystem {
  constructor(scene) {
    this.scene = scene;
    this.cooldown = 0;
    this.aiming = false;
    this.aimAngle = -Math.PI / 2;
    this.stats = { fired: 0 };

    if (!scene.textures.exists(ASSET_KEYS.arrow || 'arrow') && !scene.textures.exists('arrow')) {
      const g = scene.add.graphics();
      g.fillStyle(0xdfe8f2, 1).fillRect(11, 0, 4, 40);
      g.fillStyle(0x8a5a2b, 1).fillRect(10, 40, 6, 14);
      g.fillTriangle(13, 0, 4, 14, 22, 14);
      g.generateTexture('arrow', 26, 56);
      g.destroy();
    }
    this.arrows = scene.physics.add.group({ maxSize: 24, allowGravity: false });

    this.aimLine = scene.add.graphics().setDepth(9);
    this.reticle = scene.add.circle(0, 0, 13, 0xffffff, 0).setStrokeStyle(3, 0xffe066, 0.95).setDepth(9).setVisible(false);

    this.onDown = (p) => { const lp = pointerToLogical(scene, p); if (scene.isOver || lp.y < 82) return; this.aiming = true; this.updateAim(p); };
    this.onMove = (p) => { if (this.aiming) this.updateAim(p); };
    this.onUp = (p) => {
      if (!this.aiming || scene.isOver) { this.aiming = false; this.clearAim(); return; }
      this.aiming = false;
      this.updateAim(p);
      this.fire();
      this.clearAim();
    };
    scene.input.on('pointerdown', this.onDown);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
  }

  updateAim(pointer) {
    pointer = pointerToLogical(this.scene, pointer);
    const px = this.scene.player.x, py = this.scene.player.y - 14;
    let ang = Math.atan2(pointer.y - py, pointer.x - px);
    const min = Phaser.Math.DegToRad(CASTLE.aimMinAngleDeg);
    const max = Phaser.Math.DegToRad(CASTLE.aimMaxAngleDeg);
    // 위쪽 반구로 클램프: 아래를 가리키면 가까운 경계로
    if (ang > 0) ang = ang > Math.PI / 2 ? min : max;
    ang = Phaser.Math.Clamp(ang, min, max);
    this.aimAngle = ang;
    // 점선 조준선
    this.aimLine.clear();
    this.aimLine.lineStyle(3, 0xffe066, 0.85);
    const len = rayLengthToSafeBounds(px, py, ang, CASTLE.aimGuideLength);
    const steps = 14;
    for (let i = 0; i < steps; i += 1) {
      const t0 = i / steps, t1 = (i + 0.55) / steps;
      this.aimLine.beginPath();
      this.aimLine.moveTo(px + Math.cos(ang) * len * t0, py + Math.sin(ang) * len * t0);
      this.aimLine.lineTo(px + Math.cos(ang) * len * t1, py + Math.sin(ang) * len * t1);
      this.aimLine.strokePath();
    }
    this.reticle.setVisible(true).setPosition(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
    // 궁수가 조준 방향으로 살짝 기울기
    this.scene.player.angle = Phaser.Math.RadToDeg(ang + Math.PI / 2) * 0.35;
    if (this.scene.anims.exists('archer_aim') && this.scene.player.anims.currentAnim?.key !== 'archer_aim') {
      this.scene.player.play('archer_aim', true);
    }
  }

  clearAim() {
    this.aimLine.clear();
    this.reticle.setVisible(false);
    if (!this.scene.isOver && this.cooldown <= 0 && this.scene.anims.exists('archer_idle')) {
      this.scene.player.play('archer_idle', true);
    }
  }

  fire() {
    if (this.cooldown > 0 || this.scene.isOver) return;
    const px = this.scene.player.x, py = this.scene.player.y - 20;
    const a = this.arrows.get(px, py, 'arrow');
    if (!a) return;
    this.cooldown = CASTLE.fireCooldownMs;
    a.enableBody(true, px, py, true, true);
    a.setDepth(8).setDisplaySize(26, 56);
    a.body.setAllowGravity(false);
    a.body.setSize(a.width * 0.34, a.height * 0.85, true);
    a.setRotation(this.aimAngle + Math.PI / 2);
    a.setVelocity(Math.cos(this.aimAngle) * CASTLE.arrowSpeed, Math.sin(this.aimAngle) * CASTLE.arrowSpeed);
    this.stats.fired += 1;
    // 발사 피드백: 사격 사이클 애니 1회 + 반동
    const pl = this.scene.player;
    if (this.scene.anims.exists('archer_shoot')) pl.anims.play({ key: 'archer_shoot', repeat: 0 }, true);
    this.scene.recoilOffset = 0;
    this.scene.tweens.add({ targets: this.scene, recoilOffset: 8, duration: 55, yoyo: true, ease: 'Quad.easeOut' });
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxStart, 0.35);
  }

  update(delta) {
    if (this.cooldown > 0) this.cooldown -= delta;
    this.arrows.children.each((a) => {
      if (a.active && (a.y < -70 || a.y > SPEC.canvas.height + 70 || a.x < -70 || a.x > SPEC.canvas.width + 70)) a.disableBody(true, true);
    });
  }

  destroy() {
    this.scene.input.off('pointerdown', this.onDown);
    this.scene.input.off('pointermove', this.onMove);
    this.scene.input.off('pointerup', this.onUp);
  }
}
