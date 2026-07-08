import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from './AudioManager.js';
import { Juice } from './Juice.js';

// Sky Archer 전용 사격 시스템: 궁수 위치에서 화살을 자동 발사해
// 낙하하는 풍선 표적을 파열시킨다. (dodge 역전 — 피하지 않고 맞혀 없앤다)
export const ARCHERY = {
  fireIntervalMs: 420,
  arrowSpeed: 980,
  targetPoints: 40,
  bonusPoints: SPEC.collectibles?.scoreValue || SPEC.scoring?.collectiblePoints || 80,
};

export default class ArrowSystem {
  constructor(scene) {
    this.scene = scene;
    this.acc = 0;
    this.hits = 0;
    // 화살 텍스처가 없으면(아트 생성 전) 간단한 폴백 텍스처를 만들어 게임플레이는 항상 동작
    if (!scene.textures.exists('arrow')) {
      const g = scene.make.graphics({ add: false });
      g.fillStyle(0xf5e6c8, 1); g.fillRect(3, 0, 4, 34);
      g.fillStyle(0xcfd8dc, 1); g.fillTriangle(5, 0, 0, 10, 10, 10);
      g.fillStyle(0xff6b6b, 1); g.fillRect(2, 30, 6, 8);
      g.generateTexture('arrow', 10, 40); g.destroy();
    }
    this.arrows = scene.physics.add.group({ maxSize: 24, allowGravity: false });
    scene.physics.add.overlap(this.arrows, scene.spawner.hazards, (arrow, target) => this.popTarget(arrow, target));
    scene.physics.add.overlap(this.arrows, scene.spawner.collectibles, (arrow, star) => this.hitBonus(arrow, star));
  }

  update(delta) {
    if (this.scene.isOver) return;
    this.acc += delta;
    if (this.acc >= ARCHERY.fireIntervalMs) { this.acc -= ARCHERY.fireIntervalMs; this.fire(); }
    this.arrows.children.each((a) => { if (a.active && a.y < -80) a.disableBody(true, true); });
  }

  fire() {
    const s = this.scene;
    const a = this.arrows.get(s.player.x, s.player.y - 46, 'arrow');
    if (!a) return;
    a.enableBody(true, s.player.x, s.player.y - 46, true, true);
    a.setDepth(8);
    const asp = (a.width / a.height) || 0.25;
    a.setDisplaySize(Math.max(10, 56 * asp), 56);
    a.body.setSize(a.width * 0.34, a.height * 0.85, true);
    a.setVelocity(0, -ARCHERY.arrowSpeed);
    AudioManager.playSfx(s, ASSET_KEYS.sfxStart, 0.14);
  }

  popTarget(arrow, target) {
    if (!arrow.active || !target.active || this.scene.isOver) return;
    const tx = target.x, ty = target.y;
    arrow.disableBody(true, true);
    target.disableBody(true, true);
    this.hits += 1;
    this.scene.score.score += ARCHERY.targetPoints;
    Juice.burst(this.scene, tx, ty, 0xff6b6b, 'fx_hit');
    Juice.scorePop(this.scene, tx, ty, '+' + ARCHERY.targetPoints);
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxCollect, 0.5);
  }

  hitBonus(arrow, star) {
    if (!arrow.active || !star.active || this.scene.isOver) return;
    const sx = star.x, sy = star.y;
    arrow.disableBody(true, true);
    star.disableBody(true, true);
    this.scene.score.addCollectible();
    Juice.burst(this.scene, sx, sy, 0xffe066, 'fx_collect');
    Juice.scorePop(this.scene, sx, sy, 'BULLSEYE +' + ARCHERY.bonusPoints, '#ffe066');
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxCollect, 0.6);
  }
}
