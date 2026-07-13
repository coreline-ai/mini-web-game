import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { SCALE, TUNING, su, sy } from '../constants/tuning.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';

// Jungle Arc Shot 고유 시스템 ①: 슬링샷 드래그 → 포물선 화살.
// - pointerdown: 앵커. 드래그 벡터의 "반대 방향"으로 발사(당길수록 파워↑) — 새총 문법.
// - 드래그 중: 중력+바람이 반영된 점선 궤적 미리보기 + 고무줄 표시.
// - release: 화살 발사 — arcade 중력(GRAV) + 라운드 바람(가속 X)을 실제로 받는다.
// - 화살은 표적을 관통(멈추지 않음) — 관통 콤보는 JungleRoundSystem이 계산.
export const SLING = {
  gravity: sy(950),
  powerScale: 4.6,       // 드래그 px → 발사 속도 배율
  maxSpeed: sy(1250),
  minSpeed: sy(300),
  fireCooldownMs: 200,
  previewSteps: 22,
  previewDt: 0.055,
};

export default class SlingshotAimSystem {
  constructor(scene) {
    this.scene = scene;
    this.wind = 0;                 // JungleRoundSystem이 라운드마다 설정 (px/s^2)
    this.cooldown = 0;
    this.dragging = false;
    this.anchor = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.stats = { fired: 0 };

    if (!scene.textures.exists(ASSET_KEYS.arrow)) {
      const g = scene.add.graphics();
      g.fillStyle(0xf2e6d8, 1).fillRect(11, 0, 4, 40);
      g.fillStyle(0x6f8f3c, 1).fillRect(10, 40, 6, 14);
      g.fillTriangle(13, 0, 4, 14, 22, 14);
      g.generateTexture(ASSET_KEYS.arrow, 26, 56);
      g.destroy();
    }
    this.arrows = scene.physics.add.group({ maxSize: 14 });

    this.band = scene.add.graphics().setDepth(9);      // 고무줄
    this.preview = scene.add.graphics().setDepth(9);   // 궤적 점선

    this.onDown = (p) => {
      if (scene.isOver || this.locked) return;
      if (p.y < TUNING.inputTopBlock) return;
      this.dragging = true;
      this.anchor = { x: p.x, y: p.y };
    };
    this.onMove = (p) => { if (this.dragging) this.updateDrag(p); };
    this.onUp = (p) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.updateDrag(p);
      this.fire();
      this.band.clear(); this.preview.clear();
    };
    scene.input.on('pointerdown', this.onDown);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
  }

  // 드래그 벡터 → 발사 속도 (반대 방향, 위쪽 반구 강제)
  updateDrag(p) {
    const dx = this.anchor.x - p.x, dy = this.anchor.y - p.y;
    let vx = dx * SLING.powerScale, vy = dy * SLING.powerScale;
    if (vy > -SLING.minSpeed) vy = -SLING.minSpeed; // 항상 위로
    const sp = Math.hypot(vx, vy);
    if (sp > SLING.maxSpeed) { vx *= SLING.maxSpeed / sp; vy *= SLING.maxSpeed / sp; }
    this.vel = { x: vx, y: vy };
    this.renderPreview();
  }

  renderPreview() {
    const px = this.scene.player.x, py = this.scene.player.y - su(26);
    this.band.clear();
    this.band.lineStyle(su(3), 0x8a5a2b, 0.8);
    this.band.beginPath();
    this.band.moveTo(px, py);
    this.band.lineTo(px - this.vel.x * 0.06, py - this.vel.y * 0.06);
    this.band.strokePath();
    // 탄도 미리보기: x(t)=vx t + ½·wind·t², y(t)=vy t + ½·g·t²
    this.preview.clear();
    this.preview.fillStyle(0xffe066, 0.9);
    for (let i = 1; i <= SLING.previewSteps; i += 1) {
      const t = i * SLING.previewDt;
      const x = px + this.vel.x * t + 0.5 * this.wind * t * t;
      const y = py + this.vel.y * t + 0.5 * SLING.gravity * t * t;
      if (y > TUNING.playerY || x < -su(20) || x > SPEC.canvas.width + su(20)) break;
      this.preview.fillCircle(x, y, Math.max(su(2.2), su(4.6) - i * (0.12 * SCALE)));
    }
  }

  fire() {
    if (this.cooldown > 0 || this.locked || this.scene.isOver) return;
    if (this.scene.rounds && this.scene.rounds.arrowsLeft <= 0) return;
    this.cooldown = SLING.fireCooldownMs;
    const px = this.scene.player.x, py = this.scene.player.y - su(26);
    const a = this.arrows.get(px, py, ASSET_KEYS.arrow);
    if (!a) return;
    a.enableBody(true, px, py, true, true);
    a._pierce = 0;
    a.setDepth(8).setDisplaySize(su(24), su(52));
    a.body.setAllowGravity(true);
    a.body.setGravityY(SLING.gravity - this.scene.physics.world.gravity.y);
    a.body.setAcceleration(this.wind, 0);
    a.body.setSize(a.width * 0.3, a.height * 0.8, true);
    a.setVelocity(this.vel.x, this.vel.y);
    this.stats.fired += 1;
    this.scene.rounds?.onArrowFired();
    const pl = this.scene.player;
    if (this.scene.anims.exists('player_run')) pl.anims.play({ key: 'player_run', repeat: 0 }, true);
    this.scene.tweens.add({ targets: pl, y: pl.y + su(5), duration: 55, yoyo: true });
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxStart, 0.35);
  }

  update(delta) {
    if (this.cooldown > 0) this.cooldown -= delta;
    this.arrows.children.each((a) => {
      if (!a.active) return;
      // 화살촉이 속도 방향을 향하도록 회전 (스프라이트는 위를 향해 그려짐)
      a.setRotation(Math.atan2(a.body.velocity.y, a.body.velocity.x) + Math.PI / 2);
      if (a.y > SPEC.canvas.height + sy(60) || a.x < -su(80) || a.x > SPEC.canvas.width + su(80)) {
        a.disableBody(true, true);
        this.scene.rounds?.onArrowDone(a._pierce);
      }
    });
  }

  clearArrows() { this.arrows.children.each((a) => a.disableBody(true, true)); }

  destroy() {
    this.scene.input.off('pointerdown', this.onDown);
    this.scene.input.off('pointermove', this.onMove);
    this.scene.input.off('pointerup', this.onUp);
  }
}
