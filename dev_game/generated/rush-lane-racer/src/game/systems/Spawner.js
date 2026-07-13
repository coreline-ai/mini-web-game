import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { TUNING, laneX } from '../constants/tuning.js';
import { setBodySizeInDisplayPixels } from './PhysicsBounds.js';

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function lerp(a, b, t) { return a + (b - a) * clamp01(t); }
function stageFromElapsed(elapsedSec) { return Math.min(10, Math.max(1, Math.floor(elapsedSec / (SPEC.difficulty.rampEverySeconds || 12)) + 1)); }

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight || 1), 0) || 1;
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight || 1);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function unlockedCatalog(catalog, stage) {
  return (catalog || []).filter((item) => (item.unlockStage || 1) <= stage);
}

export default class Spawner {
  constructor(scene) {
    this.scene = scene;
    this.acc = 0;
    this.comboPatternCooldown = 0;
    this.hazards = scene.physics.add.group({ maxSize: SPEC.hazards.poolSize || 128, allowGravity: false });
    this.collectibles = scene.physics.add.group({ maxSize: 72, allowGravity: false });
  }

  getParams(elapsedSec) {
    const level = Math.min(SPEC.difficulty.maxLevel || 18, Math.floor(elapsedSec / (SPEC.difficulty.rampEverySeconds || 12)));
    const stage = stageFromElapsed(elapsedSec);
    const t = level / Math.max(1, SPEC.difficulty.maxLevel || 18);
    const cycle = elapsedSec % (SPEC.racing?.warningEverySeconds || 30);
    const warningActive = elapsedSec >= (SPEC.racing?.warningEverySeconds || 30) && cycle <= (SPEC.racing?.warningDurationSeconds || 6);
    const warningText = elapsedSec >= (SPEC.racing?.warningEverySeconds || 30) && cycle <= 2.2;
    const endlessBoost = elapsedSec > 120 ? Math.min(0.35, (elapsedSec - 120) / 240) : 0;
    return {
      interval: Math.max(80, lerp(SPEC.hazards.spawnRateStart, SPEC.hazards.spawnRateMax, t) * (warningActive ? 0.62 : 1) * (1 - endlessBoost)),
      speed: lerp(SPEC.hazards.fallSpeedStart, SPEC.hazards.fallSpeedMax, t) * (warningActive ? 1.16 : 1) * (1 + endlessBoost),
      level: level + 1,
      stage,
      warningActive,
      warningText,
    };
  }

  update(delta, elapsedSec, player, modifiers = {}) {
    const params = this.getParams(elapsedSec);
    const spawnBoost = modifiers.nitroActive ? 1.08 : 1;
    this.acc += delta * spawnBoost;
    let spawned = 0;
    while (this.acc >= params.interval && spawned < 4) {
      this.acc -= params.interval;
      this.spawnHazard(params.speed, params.stage, params.warningActive);
      if (SPEC.collectibles?.enabled && Math.random() < (SPEC.collectibles.spawnRate || 0.34)) this.spawnCollectible(params.speed * 0.78, params.stage);
      if (params.stage >= 7 && Math.random() < 0.22) this.spawnHazard(params.speed * 1.04, params.stage, params.warningActive);
      spawned += 1;
    }
    const events = this.updateActiveObjects(delta, player, modifiers);
    this.cleanup();
    return { ...params, ...events };
  }

  laneCenterWithJitter(lane, width) {
    const margin = Math.max(0, (TUNING.laneWidth - width) * 0.28);
    return laneX(lane) + Phaser.Math.Between(-margin, margin);
  }

  chooseLane(stage) {
    if (stage >= 8 && Math.random() < 0.26) return Phaser.Math.Between(1, TUNING.laneCount - 2);
    return Phaser.Math.Between(0, TUNING.laneCount - 1);
  }

  spawnHazard(baseSpeed, stage, warningActive = false) {
    const catalog = unlockedCatalog(SPEC.hazardCatalog, stage);
    if (!catalog.length) return;
    let variant = weightedPick(catalog);
    if (warningActive && stage >= 10 && Math.random() < 0.22) variant = catalog.find((v) => v.boss) || variant;
    const lane = this.chooseLane(stage);
    const x = this.laneCenterWithJitter(lane, variant.width || 96);
    const y = -(variant.height || 160) - Phaser.Math.Between(0, 80);
    const h = this.hazards.get(x, y, ASSET_KEYS[variant.assetKey] || ASSET_KEYS.trafficCar);
    if (!h) return;
    h.enableBody(true, x, y, true, true);
    h.variant = variant;
    h.baseSpeed = baseSpeed * (variant.speedMultiplier || 1);
    h.scored = false;
    h.nearMissed = false;
    h.lane = lane;
    h.phase = Math.random() * Math.PI * 2;
    h.setDepth(8 + (variant.boss ? 2 : 0)).setDisplaySize(variant.width || 96, variant.height || 160);
    h.body.setAllowGravity(false);
    setBodySizeInDisplayPixels(h, (variant.width || 96) * 0.72, (variant.height || 160) * 0.76);
    h.setVelocity(0, h.baseSpeed);
    h.setAngularVelocity(variant.id === 'oil' || variant.id === 'roadblock' ? 0 : Phaser.Math.Between(-8, 8));
    h.setTint(variant.siren && Math.random() < 0.5 ? 0xd7f3ff : 0xffffff);
  }

  spawnCollectible(baseSpeed, stage) {
    const catalog = unlockedCatalog(SPEC.collectibleCatalog, stage);
    if (!catalog.length) return;
    const item = weightedPick(catalog);
    const lane = Phaser.Math.Between(0, TUNING.laneCount - 1);
    const x = this.laneCenterWithJitter(lane, item.width || 64);
    const y = -(item.height || 64) - 40;
    const c = this.collectibles.get(x, y, ASSET_KEYS[item.assetKey] || ASSET_KEYS.coin);
    if (!c) return;
    c.enableBody(true, x, y, true, true);
    c.item = item;
    c.baseSpeed = baseSpeed;
    c.setDepth(7).setDisplaySize(item.width || 64, item.height || 64);
    c.body.setAllowGravity(false);
    setBodySizeInDisplayPixels(c, item.width || 64, item.height || 64);
    c.setVelocity(0, baseSpeed);
    c.setAngularVelocity(item.id === 'coin' ? 120 : 0);
  }

  updateActiveObjects(delta, player, modifiers) {
    const passed = [];
    const nearMisses = [];
    const speedScale = modifiers.slowActive ? 0.58 : 1;
    this.hazards.children.each((o) => {
      if (!o.active) return;
      const variant = o.variant || {};
      o.setVelocity(0, (o.baseSpeed || 500) * speedScale);
      if (variant.siren || variant.id === 'motorcycle') {
        o.x += Math.sin(this.scene.time.now / 260 + o.phase) * (variant.siren ? 1.9 : 1.2) * (delta / 16.67);
        o.x = Phaser.Math.Clamp(o.x, TUNING.roadLeft + 52, TUNING.roadRight - 52);
      }
      const closeY = Math.abs(o.y - player.y) < Math.max(88, o.displayHeight * 0.42);
      const closeX = Math.abs(o.x - player.x) < ((SPEC.racing?.nearMissDistance || 92) + o.displayWidth * 0.34);
      if (!o.nearMissed && closeY && closeX) {
        o.nearMissed = true;
        nearMisses.push(o);
      }
      if (!o.scored && o.y > player.y + Math.max(52, o.displayHeight * 0.38)) {
        o.scored = true;
        passed.push(o);
      }
    });
    this.collectibles.children.each((o) => {
      if (!o.active) return;
      o.setVelocity(0, (o.baseSpeed || 420) * speedScale);
      if (modifiers.magnetActive && o.item?.id === 'coin') {
        const dx = player.x - o.x;
        const dy = player.y - o.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 360 && dist > 6) {
          o.x += (dx / dist) * delta * 0.72;
          o.y += (dy / dist) * delta * 0.72;
        }
      }
    });
    return { passed, nearMisses };
  }

  cleanup() {
    const off = SPEC.canvas.height + 360;
    this.hazards.children.each((o) => { if (o.active && o.y > off) o.disableBody(true, true); });
    this.collectibles.children.each((o) => { if (o.active && o.y > off) o.disableBody(true, true); });
  }

  reset() {
    this.acc = 0;
    this.hazards.children.each((o) => o.disableBody(true, true));
    this.collectibles.children.each((o) => o.disableBody(true, true));
  }
}
