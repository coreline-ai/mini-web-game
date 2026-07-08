import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { TUNING } from '../constants/tuning.js';
import { sx, sy } from '../utils/scale.js';

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

export default class Spawner {
  constructor(scene) {
    this.scene = scene;
    this.acc = 0;
    this.hazards = scene.physics.add.group({ maxSize: SPEC.hazards.poolSize || 60, allowGravity: false });
    this.collectibles = scene.physics.add.group({ maxSize: 40, allowGravity: false });
  }
  getParams(elapsedSec) {
    const maxLevel = SPEC.difficulty.maxLevel || 12;
    const level = Math.min(maxLevel, Math.floor(elapsedSec / (SPEC.difficulty.rampEverySeconds || 15)));
    const t = maxLevel <= 0 ? 0 : level / maxLevel;
    return {
      interval: lerp(SPEC.hazards.spawnRateStart, SPEC.hazards.spawnRateMax, t),
      speed: sy(lerp(SPEC.hazards.fallSpeedStart, SPEC.hazards.fallSpeedMax, t)),
      level: level + 1,
    };
  }
  update(delta, elapsedSec) {
    const p = this.getParams(elapsedSec);
    this.acc += delta;
    if (this.acc >= p.interval) {
      this.acc -= p.interval;
      this.spawnHazard(p.speed);
      if (SPEC.collectibles?.enabled && Math.random() < (SPEC.collectibles.spawnRate || 0.2)) this.spawnCollectible(p.speed * 0.72);
    }
    this.cleanup();
    return p;
  }
  spawnHazard(speed) {
    const x = Phaser.Math.Between(TUNING.safeSide + sx(20), SPEC.canvas.width - TUNING.safeSide - sx(20));
    const h = this.hazards.get(x, -sy(60), ASSET_KEYS.hazard);
    if (!h) return;
    h.enableBody(true, x, -sy(60), true, true);
    h.setDepth(5).setDisplaySize(TUNING.hazardSize, TUNING.hazardSize);
    h.body.setAllowGravity(false);
    h.body.setCircle(Math.min(h.width, h.height) * 0.38, h.width * 0.12, h.height * 0.12);
    h.setVelocity(0, speed);
    h.setAngularVelocity(Phaser.Math.Between(-80, 80));
  }
  spawnCollectible(speed) {
    const x = Phaser.Math.Between(TUNING.safeSide + sx(20), SPEC.canvas.width - TUNING.safeSide - sx(20));
    const c = this.collectibles.get(x, -sy(40), ASSET_KEYS.collectible);
    if (!c) return;
    c.enableBody(true, x, -sy(40), true, true);
    c.setDepth(4).setDisplaySize(TUNING.collectibleSize, TUNING.collectibleSize);
    c.body.setAllowGravity(false);
    c.body.setCircle(Math.min(c.width, c.height) * 0.42, c.width * 0.08, c.height * 0.08);
    c.setVelocity(0, speed);
  }
  cleanup() {
    const off = SPEC.canvas.height + sy(120);
    this.hazards.children.each((o) => { if (o.active && o.y > off) o.disableBody(true, true); });
    this.collectibles.children.each((o) => { if (o.active && o.y > off) o.disableBody(true, true); });
  }
  reset() {
    this.acc = 0;
    this.hazards.children.each((o) => o.disableBody(true, true));
    this.collectibles.children.each((o) => o.disableBody(true, true));
  }
}
