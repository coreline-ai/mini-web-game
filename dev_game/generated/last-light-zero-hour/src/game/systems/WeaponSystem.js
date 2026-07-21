import Phaser from 'phaser';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from './SaveData.js';
import { WEAPON_ORDER, upgradedWeapon } from '../data/weaponConfig.js';
import { AudioManager } from './AudioManager.js';

export default class WeaponSystem {
  constructor(scene, player, director, feedback, callbacks = {}) {
    this.scene = scene;
    this.player = player;
    this.director = director;
    this.feedback = feedback;
    this.callbacks = callbacks;
    this.selected = 'gatling';
    this.heat = 0;
    this.overheated = false;
    // The gatling is an always-on fire lane.  Specials are independent
    // one-shot lanes, so spending a charged card can never delay the next
    // automatic gatling round (or another already-ready special).
    this.nextFire = Object.fromEntries(WEAPON_ORDER.map((id) => [id, 0]));
    this.lastSpecial = null;
    this.specialFlashUntil = 0;
    this.shots = 0;
    this.energy = { gatling: 100, scatter: 48, arc: 52, rocket: 44, rail: 24 };
    this.config = Object.fromEntries(WEAPON_ORDER.map((id) => [id, upgradedWeapon(id, SaveData.weaponLevel(id))]));
    this.createTextures();
    this.bullets = scene.physics.add.group({ maxSize: 260, allowGravity: false });
    scene.physics.add.overlap(this.bullets, director.enemies, this.onBulletOverlap, undefined, this);
  }

  createTextures() {
    if (!this.scene.textures.exists(ASSET_KEYS.bullet)) {
      const g = this.scene.make.graphics({ add: false });
      g.fillStyle(0xfff1ad, 1); g.fillRoundedRect(6, 0, 14, 54, 7);
      g.fillStyle(0xffffff, 0.95); g.fillRoundedRect(10, 2, 6, 38, 3);
      g.generateTexture(ASSET_KEYS.bullet, 26, 56); g.destroy();
    }
  }

  update(delta, aimVector, shouldFire) {
    const dt = Math.min(delta, 60) / 1000;
    for (const id of WEAPON_ORDER) {
      if (id === 'gatling') continue;
      const cfg = this.config[id];
      this.energy[id] = Math.min(100, this.energy[id] + cfg.chargePerSecond * dt);
    }
    const gatling = this.config.gatling;
    this.heat = Math.max(0, this.heat - gatling.coolPerSecond * dt);
    if (this.overheated && this.heat <= 31) {
      this.overheated = false;
      this.callbacks.onCooled?.();
    }
    this.cleanupBullets();
    if (!shouldFire || !aimVector) return;
    this.fireGatlingChannel(aimVector);
  }

  normalizeAim(aimVector) {
    const aim = aimVector?.clone?.() || new Phaser.Math.Vector2(0, -1);
    return aim.lengthSq() > 0.001 ? aim.normalize() : aim.set(0, -1);
  }

  fireGatlingChannel(aimVector) {
    const now = this.scene.time.now;
    if (this.overheated || now < this.nextFire.gatling) return false;
    const cfg = this.config.gatling;
    const aim = this.normalizeAim(aimVector);
    this.heat = Math.min(100, this.heat + cfg.heatPerShot);
    if (this.heat >= 99.5) {
      this.overheated = true;
      AudioManager.playSfx(this.scene, ASSET_KEYS.sfxOverheat, 0.5, 1, 500);
      this.callbacks.onOverheat?.();
    }
    const angle = Math.atan2(aim.y, aim.x);
    this.nextFire.gatling = now + cfg.fireMs;
    this.shots += 1;
    this.fireGatling(cfg, aim, angle);
    this.callbacks.onFired?.('gatling', aim);
    return true;
  }

  activateSpecial(id, aimVector) {
    if (id === 'gatling' || !this.config[id]) return false;
    const cfg = this.config[id];
    const now = this.scene.time.now;
    const cooldown = Math.max(0, this.nextFire[id] - now);
    if (cooldown > 0) {
      this.callbacks.onCooldown?.(id, cooldown / 1000);
      return false;
    }
    if (this.energy[id] + 0.001 < cfg.energyCost) {
      this.callbacks.onUnavailable?.(id, cfg.energyCost - this.energy[id]);
      return false;
    }

    const aim = this.normalizeAim(aimVector);
    const arcTarget = id === 'arc' ? this.resolveArcTarget(aim, cfg) : null;
    if (id === 'arc' && !arcTarget) {
      this.callbacks.onNoTarget?.(id);
      return false;
    }

    this.energy[id] = Math.max(0, this.energy[id] - cfg.energyCost);
    this.nextFire[id] = now + cfg.fireMs;
    this.lastSpecial = id;
    this.specialFlashUntil = now + 260;
    this.shots += 1;
    const angle = Math.atan2(aim.y, aim.x);
    if (id === 'scatter') this.fireScatter(cfg, aim, angle);
    else if (id === 'arc') this.fireArc(cfg, aim, arcTarget);
    else if (id === 'rocket') this.fireRocket(cfg, aim, angle);
    else if (id === 'rail') this.fireRail(cfg, aim);
    this.callbacks.onSpecialActivated?.(id);
    this.callbacks.onFired?.(id, aim);
    return true;
  }

  muzzlePoint(aim, distance = 112) {
    return { x: this.player.x + aim.x * distance, y: this.player.y + aim.y * distance };
  }

  fireGatling(cfg, aim, angle) {
    const jitter = Phaser.Math.FloatBetween(-0.026, 0.026);
    const a = angle + jitter;
    const dir = new Phaser.Math.Vector2(Math.cos(a), Math.sin(a));
    this.spawnBullet(dir, 1380, cfg.damage, { type: 'gatling', pierce: 0, life: 1300 });
    const p = this.muzzlePoint(dir);
    this.feedback.muzzle(p.x, p.y, a, 0xffe09a, 0.76);
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxGatling, 0.18, Phaser.Math.FloatBetween(0.96, 1.04), 72);
  }

  fireScatter(cfg, aim, angle) {
    for (let i = 0; i < cfg.pellets; i += 1) {
      const t = cfg.pellets === 1 ? 0 : i / (cfg.pellets - 1) - 0.5;
      const a = angle + t * cfg.spread;
      this.spawnBullet(new Phaser.Math.Vector2(Math.cos(a), Math.sin(a)), 1120, cfg.damage, {
        type: 'scatter', pierce: 0, life: 2400, knockback: 34, executeNonBoss: cfg.executeNonBoss,
      });
    }
    const p = this.muzzlePoint(aim, 120); this.feedback.muzzle(p.x, p.y, angle, 0xffb56d, 1.5);
    this.scene.cameras.main.shake(110, 0.006);
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxShotgun, 0.46, 1, 250);
  }

  resolveArcTarget(aim, cfg) {
    const range = cfg.range || 1500;
    return this.raycastTarget(aim, range) || this.director.findNearest(this.player.x, this.player.y, range);
  }

  fireArc(cfg, aim, firstTarget = null) {
    const first = firstTarget || this.resolveArcTarget(aim, cfg);
    if (!first) return false;
    const hit = new Set(); let current = first; let fromX = this.player.x; let fromY = this.player.y;
    for (let i = 0; i < cfg.chains && current; i += 1) {
      this.feedback.arcBolt(fromX, fromY, current.x, current.y, cfg.color, i === 0 ? 1.18 : 0.9);
      // The coil is an execution charge: each of its ten links clears one
      // non-boss infected regardless of wave health scaling. Titans still
      // absorb normal falling damage so a charged weapon cannot skip a boss.
      const isBoss = !!current.getData('cfg')?.boss;
      const damage = cfg.executeNonBoss && !isBoss
        ? Math.max(cfg.damage, current.getData('hp') || cfg.damage)
        : cfg.damage * Math.pow(0.9, i);
      this.director.damage(current, damage, fromX, fromY, 12, i === 0);
      this.feedback.impact(current.x, current.y, cfg.color);
      hit.add(current); fromX = current.x; fromY = current.y;
      current = this.director.findNearest(fromX, fromY, cfg.chainRange || 480, hit);
    }
    this.feedback.arcPulse(this.player.x, this.player.y, cfg.color);
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxArc, 0.4, 1, 300);
    return true;
  }

  fireRocket(cfg, aim, angle) {
    const bullet = this.spawnBullet(aim, 690, cfg.damage, {
      // Auto hunt can acquire threats near the upper combat field, so the
      // rocket must travel far enough to reach the same visible lane.
      type: 'rocket', radius: cfg.radius, life: 2600, pierce: 0, executeNonBoss: cfg.executeNonBoss,
    });
    if (bullet) bullet.setTint(0xff8661).setScale(1.65);
    const p = this.muzzlePoint(aim); this.feedback.muzzle(p.x, p.y, angle, 0xff7048, 1.35);
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxRocket, 0.42, 1, 350);
  }

  fireRail(cfg, aim) {
    const start = this.muzzlePoint(aim, 80);
    const length = 2600; const end = { x: start.x + aim.x * length, y: start.y + aim.y * length };
    const g = this.scene.add.graphics().setDepth(38);
    g.lineStyle(48, 0x87eaff, 0.15).lineBetween(start.x, start.y, end.x, end.y);
    g.lineStyle(15, 0xd9ffff, 0.92).lineBetween(start.x, start.y, end.x, end.y);
    for (const enemy of this.director.activeEnemies()) {
      const relX = enemy.x - start.x; const relY = enemy.y - start.y;
      const along = relX * aim.x + relY * aim.y;
      const perpendicular = Math.abs(relX * aim.y - relY * aim.x);
      if (along > 0 && along < length && perpendicular < 105 + enemy.displayWidth * 0.12) {
        this.director.damage(enemy, cfg.damage, start.x, start.y, 65, true);
        this.feedback.infectedBurst(enemy.x, enemy.y, 1.45);
      }
    }
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 310, onComplete: () => g.destroy() });
    this.scene.cameras.main.shake(280, 0.013);
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxRail, 0.46, 1, 600);
  }

  raycastTarget(aim, maxDistance) {
    let best = null; let bestAlong = Infinity;
    for (const enemy of this.director.activeEnemies()) {
      const dx = enemy.x - this.player.x; const dy = enemy.y - this.player.y;
      const along = dx * aim.x + dy * aim.y;
      if (along <= 0 || along > maxDistance) continue;
      const perpendicular = Math.abs(dx * aim.y - dy * aim.x);
      if (perpendicular < 180 && along < bestAlong) { best = enemy; bestAlong = along; }
    }
    return best;
  }

  spawnBullet(dir, speed, damage, data) {
    const p = this.muzzlePoint(dir, 96);
    const bullet = this.bullets.get(p.x, p.y, ASSET_KEYS.bullet);
    if (!bullet) return null;
    bullet.enableBody(true, p.x, p.y, true, true).setTexture(ASSET_KEYS.bullet).setDepth(31).setAlpha(1).clearTint().setScale(1);
    bullet.body.setAllowGravity(false); bullet.body.setSize(20, 44, true);
    bullet.setVelocity(dir.x * speed, dir.y * speed);
    bullet.setRotation(Math.atan2(dir.y, dir.x) + Math.PI / 2);
    bullet.setData({ ...data, damage, created: this.scene.time.now, hit: new Set() });
    return bullet;
  }

  onBulletOverlap(bullet, enemy) {
    if (!bullet.active || !enemy.active || enemy.getData('dying')) return;
    const data = bullet.data.values;
    if (data.hit?.has(enemy)) return;
    data.hit?.add(enemy);
    if (data.type === 'rocket') {
      this.explode(bullet.x, bullet.y, data.radius, data.damage, data.executeNonBoss);
      bullet.disableBody(true, true);
      return;
    }
    const isBoss = !!enemy.getData('cfg')?.boss;
    const damage = data.executeNonBoss && !isBoss
      ? Math.max(data.damage, enemy.getData('hp') || data.damage)
      : data.damage;
    const result = this.director.damage(enemy, damage, bullet.x, bullet.y, data.knockback || 0, false);
    this.feedback.impact(bullet.x, bullet.y, data.type === 'scatter' ? 0xffb16b : 0xffe7a0);
    if (result.killed) this.feedback.infectedBurst(enemy.x, enemy.y, data.type === 'scatter' ? 1.2 : 0.8);
    if ((data.pierce || 0) <= 0) bullet.disableBody(true, true); else data.pierce -= 1;
  }

  explode(x, y, radius, damage, executeNonBoss = false) {
    this.feedback.explosion(x, y, radius);
    for (const enemy of this.director.activeEnemies()) {
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance > radius) continue;
      const scaled = damage * (1 - distance / radius * 0.48);
      const isBoss = !!enemy.getData('cfg')?.boss;
      const appliedDamage = executeNonBoss && !isBoss
        ? Math.max(scaled, enemy.getData('hp') || scaled)
        : scaled;
      this.director.damage(enemy, appliedDamage, x, y, 78, distance < radius * 0.32);
      this.feedback.infectedBurst(enemy.x, enemy.y, 1.1);
    }
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxExplosion, 0.46, 1, 280);
  }

  cleanupBullets() {
    const now = this.scene.time.now;
    for (const bullet of this.bullets.getChildren()) {
      if (!bullet.active) continue;
      const data = bullet.data.values;
      if (data.type === 'rocket' && now >= (data.nextTrail || 0)) {
        data.nextTrail = now + 46;
        this.feedback.rocketTrail(bullet.x, bullet.y);
      }
      if (now - data.created > data.life || bullet.x < -180 || bullet.x > 1620 || bullet.y < -220 || bullet.y > 2780) {
        if (data.type === 'rocket') this.explode(bullet.x, bullet.y, data.radius, data.damage * 0.82, data.executeNonBoss);
        bullet.disableBody(true, true);
      }
    }
  }

  onKill(info) {
    const bonus = info.elite ? 1.8 : 1;
    for (const id of WEAPON_ORDER) {
      if (id === 'gatling') continue;
      this.energy[id] = Math.min(100, this.energy[id] + this.config[id].chargePerKill * bonus);
    }
  }

  state() {
    const now = this.scene.time.now;
    const cooldown = Object.fromEntries(WEAPON_ORDER.map((id) => [id, Math.max(0, (this.nextFire[id] - now) / 1000)]));
    return {
      selected: this.selected,
      activeSpecial: now < this.specialFlashUntil ? this.lastSpecial : null,
      heat: this.heat,
      overheated: this.overheated,
      energy: { ...this.energy },
      cooldown,
      shots: this.shots,
    };
  }
  destroy() {
    // Phaser destroys physics groups as part of the scene shutdown sequence.
    // Depending on listener order the group's internal children Set may already
    // be gone, so cleanup must be idempotent.
    if (this.bullets?.children) this.bullets.clear(true, true);
    this.bullets = null;
  }
}
