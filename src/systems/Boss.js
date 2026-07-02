import { GC } from '../config/gameConfig.js';

// 변기 보스: 화면 상단에서 왕복하며 발사체를 쏘고, 생존(회피)으로 HP가 자동 감소해 처치된다.
export default class Boss {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.hp = GC.BOSS.hp;
    this.onDefeat = null;
    this.sprite = null;
    this.projGroup = scene.physics.add.group({ maxSize: 40, allowGravity: false });
    this.fireEvent = null;
    this.moveTween = null;
    this.hpBar = null;
  }

  start() {
    const B = GC.BOSS;
    this.active = true;
    this.hp = B.hp;

    this.sprite = this.scene.add.sprite(GC.WIDTH / 2, -B.size, GC.ASSETS.boss.front.key)
      .setDepth(12)
      .setDisplaySize(B.size, B.size);
    this.scene.tweens.add({ targets: this.sprite, y: B.y, duration: 900, ease: 'Bounce.Out' });

    // 좌우 왕복
    this.moveTween = this.scene.tweens.add({
      targets: this.sprite,
      x: { from: B.size * 0.6, to: GC.WIDTH - B.size * 0.6 },
      duration: (GC.WIDTH / B.moveSpeed) * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.fireEvent = this.scene.time.addEvent({
      delay: B.fireIntervalMs,
      loop: true,
      callback: () => this.fire(),
    });

    // HP 바
    this.hpBar = this.scene.add.graphics().setDepth(21);

    this.sprite.on('animationcomplete', () => {
      if (this.active && this.sprite) this.sprite.setTexture(GC.ASSETS.boss.front.key).setDisplaySize(B.size, B.size);
    });
  }

  fire() {
    if (!this.active || !this.sprite) return;
    const B = GC.BOSS;
    const rage = this.hp < B.rageBelowHp;

    if (this.scene.anims.exists(B.anim)) {
      this.sprite.play(B.anim, true);
      this.sprite.setDisplaySize(B.size, B.size);
    } else {
      this.sprite.setTexture(GC.ASSETS.boss.attack.key).setDisplaySize(B.size, B.size);
    }

    const px = this.scene.player ? this.scene.player.x : GC.WIDTH / 2;
    const shots = rage ? [-0.35, 0, 0.35] : [0];
    shots.forEach((spread) => this.launch(px, spread));
  }

  launch(targetX, spread) {
    const B = GC.BOSS;
    const p = this.projGroup.get(this.sprite.x, this.sprite.y + B.size * 0.3, GC.ASSETS.boss.projectile.key);
    if (!p) return;
    p.enableBody(true, this.sprite.x, this.sprite.y + B.size * 0.3, true, true);
    p.setDepth(11).setDisplaySize(B.projSize, B.projSize);
    p.body.setCircle(p.width / 2 * 0.7, p.width * 0.15, p.width * 0.15);
    p.body.setAllowGravity(false);
    const ang = Phaser.Math.Angle.Between(p.x, p.y, targetX, GC.PLAYER.Y) + spread;
    p.setVelocity(Math.cos(ang) * B.projSpeed, Math.abs(Math.sin(ang) * B.projSpeed) + B.projSpeed * 0.5);
    p.setAngularVelocity(200);
  }

  update(deltaMs) {
    if (!this.active) return;
    this.hp -= GC.BOSS.hpDrainPerSec * (deltaMs / 1000);
    this.drawHpBar();
    this.projGroup.children.each((p) => {
      if (p.active && (p.y > GC.POOP.DESPAWN_Y || p.x < -200 || p.x > GC.WIDTH + 200)) {
        p.disableBody(true, true);
      }
    });
    if (this.hp <= 0) this.defeat();
  }

  drawHpBar() {
    const w = GC.WIDTH * 0.7;
    const x = (GC.WIDTH - w) / 2;
    const y = 150;
    const ratio = Phaser.Math.Clamp(this.hp / GC.BOSS.hp, 0, 1);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.5).fillRoundedRect(x - 4, y - 4, w + 8, 34, 8);
    this.hpBar.fillStyle(0x333333, 1).fillRoundedRect(x, y, w, 26, 6);
    this.hpBar.fillStyle(ratio < 0.4 ? 0xff4444 : 0xffcc33, 1).fillRoundedRect(x, y, w * ratio, 26, 6);
  }

  defeat() {
    this.active = false;
    if (this.fireEvent) this.fireEvent.remove();
    if (this.moveTween) this.moveTween.stop();
    if (this.hpBar) this.hpBar.clear();
    const bx = this.sprite ? this.sprite.x : GC.WIDTH / 2;
    const by = this.sprite ? this.sprite.y : GC.BOSS.y;
    if (this.sprite) { this.sprite.destroy(); this.sprite = null; }
    this.projGroup?.children?.each((p) => p.disableBody(true, true));
    if (this.onDefeat) this.onDefeat(bx, by);
  }

  reset() {
    this.active = false;
    if (this.fireEvent) this.fireEvent.remove();
    if (this.moveTween) this.moveTween.stop();
    if (this.hpBar) { this.hpBar.destroy(); this.hpBar = null; }
    if (this.sprite) { this.sprite.destroy(); this.sprite = null; }
    this.projGroup?.children?.each((p) => p.disableBody(true, true));
  }
}
