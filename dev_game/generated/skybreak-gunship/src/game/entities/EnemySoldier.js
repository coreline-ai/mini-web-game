const STATE = Object.freeze({ EXPOSE: 'expose', AIM: 'aim', FIRE: 'fire', COVER: 'cover' });

export default class EnemySoldier {
  constructor(scene, target) {
    this.scene = scene;
    this.target = target;
    this.state = STATE.EXPOSE;
    this.stateMs = 0;
    this.cycle = target.type === 'rocketman'
      ? { expose: 900, aim: 1250, fire: 90, cover: 1350 }
      : { expose: 1050, aim: 850, fire: 80, cover: 1100 };
    this.coverView = scene.add.graphics().setDepth(target.sprite.depth + 1);
    this.aimView = scene.add.graphics().setDepth(76);
    this.applyState();
  }

  update(delta) {
    if (!this.target.active) return null;
    this.stateMs += delta;
    const limit = this.cycle[this.state];
    if (this.stateMs < limit) {
      this.updateViews();
      return null;
    }
    this.stateMs -= limit;
    if (this.state === STATE.EXPOSE) this.state = STATE.AIM;
    else if (this.state === STATE.AIM) this.state = STATE.FIRE;
    else if (this.state === STATE.FIRE) this.state = STATE.COVER;
    else this.state = STATE.EXPOSE;
    this.applyState();
    return this.state === STATE.FIRE ? {
      damage: this.target.cfg.convoyDamage,
      rocket: this.target.type === 'rocketman',
    } : null;
  }

  applyState() {
    const target = this.target;
    target.exposed = this.state !== STATE.COVER;
    target.aiming = this.state === STATE.AIM;
    // Keep the soldier readable while using a low barricade silhouette. The
    // previous full rounded rectangle made the enemy appear to turn into an
    // unexplained energy square during the cover state.
    target.sprite.setAlpha(this.state === STATE.COVER ? 0.84 : 1);
    target.marker.setVisible(this.state !== STATE.COVER);
    if (this.state === STATE.AIM && target.type === 'rocketman') {
      this.scene.warn('ROCKET LOCK · TAKE COVER', '#ffb43b');
    }
    this.updateViews();
  }

  updateViews() {
    const { sprite, radius } = this.target;
    this.coverView.clear();
    this.aimView.clear();
    if (this.state === STATE.COVER) {
      const left = sprite.x - radius - 7;
      const top = sprite.y + radius * 0.28;
      const width = radius * 2 + 14;
      const height = radius * 0.82 + 12;
      this.coverView.fillStyle(0x263a44, 0.94).fillRoundedRect(left, top, width, height, 5);
      this.coverView.lineStyle(2, 0x91a6ad, 0.9).strokeRoundedRect(left, top, width, height, 5);
      this.coverView.lineStyle(3, 0xffb43b, 0.82).lineBetween(left + 4, top + 5, left + width - 4, top + 5);
      this.coverView.lineStyle(2, 0x51656c, 0.9).lineBetween(left + width * 0.33, top + 8, left + width * 0.33, top + height - 4);
      this.coverView.lineBetween(left + width * 0.66, top + 8, left + width * 0.66, top + height - 4);
    } else if (this.state === STATE.AIM) {
      const progress = Math.min(1, this.stateMs / this.cycle.aim);
      this.aimView.lineStyle(2, this.target.type === 'rocketman' ? 0xffb43b : 0xff4b45, 0.5 + progress * 0.45);
      this.aimView.lineBetween(sprite.x, sprite.y, this.scene.convoy.x, this.scene.convoy.y);
      this.aimView.strokeCircle(sprite.x, sprite.y, radius + 6 + progress * 5);
    }
  }

  destroy() {
    this.coverView.destroy();
    this.aimView.destroy();
  }
}
