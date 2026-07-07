import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { TUNING } from '../constants/tuning.js';

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

const ENEMY_TYPES = [
  { id: 'basic', texture: ASSET_KEYS.enemyBasic, hp: 1, speed: 1.0, size: 0.98, points: 30, weight: (level) => (level >= 1 ? 60 : 0) },
  { id: 'runner', texture: ASSET_KEYS.enemyRunner, hp: 1, speed: 1.38, size: 0.86, points: 42, weight: (level) => (level >= 2 ? 20 + level * 2 : 0), sway: 120 },
  { id: 'shield', texture: ASSET_KEYS.enemyShield, hp: 2, speed: 0.86, size: 1.05, points: 55, weight: (level) => (level >= 3 ? 18 + level : 0), shielded: true },
  { id: 'brute', texture: ASSET_KEYS.enemyBrute, hp: 3, speed: 0.68, size: 1.22, points: 90, weight: (level) => (level >= 5 ? 10 + level : 0), heavy: true },
];

function activeCount(group) {
  return group.children.entries.reduce((n, o) => n + (o.active ? 1 : 0), 0);
}

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
      speed: lerp(SPEC.hazards.fallSpeedStart, SPEC.hazards.fallSpeedMax, t),
      level: level + 1,
    };
  }
  update(delta, elapsedSec) {
    const p = this.getParams(elapsedSec);
    this.acc += delta;
    if (this.acc >= p.interval) {
      this.acc -= p.interval;
      this.spawnHazard(p.speed, p.level);
      if (SPEC.collectibles?.enabled && Math.random() < (SPEC.collectibles.spawnRate || 0.2)) this.spawnCollectible(p.speed * 0.72);
    }
    this.animateActive(delta);
    this.cleanup();
    return p;
  }
  chooseEnemyType(level) {
    const weighted = ENEMY_TYPES.map((t) => ({ ...t, w: Math.max(0, t.weight(level)) })).filter((t) => t.w > 0);
    const total = weighted.reduce((sum, t) => sum + t.w, 0);
    let r = Math.random() * total;
    for (const t of weighted) { r -= t.w; if (r <= 0) return t; }
    return weighted[0] || ENEMY_TYPES[0];
  }
  spawnHazard(speed, level = 1) {
    const maxConcurrent = SPEC.hazards.maxConcurrent || 7;
    if (activeCount(this.hazards) >= maxConcurrent) return;
    const type = this.chooseEnemyType(level);
    const x = Phaser.Math.Between(TUNING.safeSide + 20, SPEC.canvas.width - TUNING.safeSide - 20);
    const h = this.hazards.get(x, -120, type.texture);
    if (!h) return;
    h.enableBody(true, x, -120, true, true);
    h.setTexture(type.texture, 0);
    h._enemyType = type.id;
    h._hp = type.hp;
    h._maxHp = type.hp;
    h._points = type.points;
    h._sway = type.sway || 0;
    h._homeX = x;
    h._phase = Math.random() * Math.PI * 2;
    h._cfg = true;
    h.setVisible(false);
    h.setDepth(type.heavy ? 6 : 5).setDisplaySize(TUNING.hazardSize * type.size, TUNING.hazardSize * type.size);
    h.body.setAllowGravity(false);
    h.body.setCircle(Math.min(h.width, h.height) * 0.38, h.width * 0.12, h.height * 0.12);
    h.setVelocity(0, speed * type.speed);
    h.setAngularVelocity(0);
    h.clearTint();
    const animKey = `${type.texture}_walk`;
    if (this.scene.anims.exists(animKey)) h.play(animKey, true);
  }
  spawnCollectible(speed) {
    const x = Phaser.Math.Between(TUNING.safeSide + 20, SPEC.canvas.width - TUNING.safeSide - 20);
    const c = this.collectibles.get(x, -100, ASSET_KEYS.collectible);
    if (!c) return;
    c.enableBody(true, x, -100, true, true);
    c.setDepth(4).setDisplaySize(TUNING.collectibleSize, TUNING.collectibleSize);
    c.body.setAllowGravity(false);
    c.body.setCircle(Math.min(c.width, c.height) * 0.42, c.width * 0.08, c.height * 0.08);
    c.setVelocity(0, speed);
    c.setVisible(false);
  }
  animateActive(delta) {
    const revealY = TUNING.safeTop + 34;
    const t = this.scene.time.now / 1000;
    this.hazards.children.each((o) => {
      if (!o.active) return;
      o.setVisible(o.y > revealY);
      if (o._sway) {
        o.x = Phaser.Math.Clamp(o._homeX + Math.sin(t * 2.8 + o._phase) * o._sway, TUNING.safeSide + 18, SPEC.canvas.width - TUNING.safeSide - 18);
      }
      o.setAngle(Math.sin(t * 7 + o._phase) * (o._enemyType === 'runner' ? 5 : 2));
    });
    this.collectibles.children.each((o) => {
      if (!o.active) return;
      o.setVisible(o.y > revealY);
      o.setAngle(Math.sin(t * 4 + o.x) * 4);
    });
  }
  cleanup() {
    const off = SPEC.canvas.height + 120;
    this.hazards.children.each((o) => { if (o.active && o.y > off) { o._cfg = false; o.disableBody(true, true); } });
    this.collectibles.children.each((o) => { if (o.active && o.y > off) o.disableBody(true, true); });
  }
  setVisibleAll(visible) {
    this.hazards.children.each((o) => { if (o.active) o.setVisible(visible); });
    this.collectibles.children.each((o) => { if (o.active) o.setVisible(visible); });
  }
  reset() {
    this.acc = 0;
    this.hazards.children.each((o) => { o._cfg = false; o.disableBody(true, true); });
    this.collectibles.children.each((o) => o.disableBody(true, true));
  }
}
