import Phaser from 'phaser';
import { GAME_RULES } from '../config/gameRules.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { isMissileLockReady, shouldRecoverFromOverheat } from '../config/combatMath.js';

export default class WeaponSystem {
  constructor(scene, aim, api) {
    this.scene = scene;
    this.aim = aim;
    this.api = api;
    this.heat = 0;
    this.overheated = false;
    this.ammo = GAME_RULES.missile.ammo;
    this.gunHeld = false;
    this.gunAccumulator = 0;
    this.missileHeld = false;
    this.lockTarget = null;
    this.lockProgress = 0;
    this.lockTickMs = 0;
    this.lockCompleteSignaled = false;
    this.cooldown = 0;
    this.shots = 0;
    this.hits = 0;
    this.missilePool = [];
    this.lockView = scene.add.graphics().setDepth(84);
  }
  setGunHeld(value) {
    this.gunHeld = Boolean(value) && !this.overheated && !this.missileHeld;
    if (this.gunHeld) this.api.setGunAudio?.(true);
    else { this.gunAccumulator = 0; this.api.setGunAudio?.(false); }
  }
  beginMissile() {
    if (this.ammo <= 0 || this.cooldown > 0 || this.missileHeld || this.gunHeld) return;
    this.missileHeld = true;
    this.lockProgress = 0;
    this.lockTickMs = 0;
    this.lockCompleteSignaled = false;
    this.lockTarget = this.api.getTargetAt(this.aim.x, this.aim.y, true);
  }
  endMissile() {
    if (!this.missileHeld) return;
    const ready = isMissileLockReady(this.lockProgress, this.lockTarget?.active, this.ammo, GAME_RULES.missile.lockMs);
    this.missileHeld = false;
    this.lockView.clear();
    if (ready) this.launchMissile(this.lockTarget);
    else this.api.onMissileCancel?.();
    this.lockTarget = null;
    this.lockProgress = 0;
  }
  update(delta) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (!this.gunHeld || this.overheated) {
      this.heat = Math.max(0, this.heat - GAME_RULES.gun.coolPerSecond * delta / 1000);
      if (this.overheated && shouldRecoverFromOverheat(this.heat, GAME_RULES.gun.readyAt)) {
        this.overheated = false;
        this.api.onGunReady?.();
      }
    }
    if (this.gunHeld && !this.overheated) {
      this.gunAccumulator += delta;
      while (this.gunAccumulator >= GAME_RULES.gun.rateMs) {
        this.gunAccumulator -= GAME_RULES.gun.rateMs;
        this.fireGun();
      }
    }
    if (this.missileHeld) this.updateLock(delta);
    this.updateMissiles(delta);
  }
  fireGun() {
    this.shots += 1;
    this.heat = Math.min(100, this.heat + GAME_RULES.gun.heatPerShot);
    this.api.drawTracer(this.aim.x, this.aim.y);
    const target = this.api.getTargetAt(this.aim.x, this.aim.y, false);
    if (target) {
      this.hits += 1;
      this.api.damageTarget(target, GAME_RULES.gun.damage, 'gun');
    } else this.api.registerMiss();
    if (this.heat >= GAME_RULES.gun.overheatAt) {
      this.overheated = true;
      this.gunHeld = false;
      this.api.setGunAudio?.(false);
      this.api.onGunOverheat?.();
      this.api.warn('30MM OVERHEAT', '#ff784f');
    }
  }
  updateLock(delta) {
    const candidate = this.api.getTargetAt(this.aim.x, this.aim.y, true);
    if (!candidate || candidate !== this.lockTarget || !candidate.active) {
      this.lockTarget = candidate;
      this.lockProgress = 0;
      this.lockTickMs = 0;
      this.lockCompleteSignaled = false;
    } else {
      this.lockProgress = Math.min(GAME_RULES.missile.lockMs, this.lockProgress + delta);
      this.lockTickMs += delta;
      if (this.lockTickMs >= 180 && this.lockProgress < GAME_RULES.missile.lockMs) {
        this.lockTickMs %= 180;
        this.api.onMissileLockTick?.();
      }
      if (!this.lockCompleteSignaled && this.lockProgress >= GAME_RULES.missile.lockMs) {
        this.lockCompleteSignaled = true;
        this.api.onMissileLockComplete?.();
      }
    }
    this.lockView.clear();
    if (!this.lockTarget) return;
    const p = this.lockProgress / GAME_RULES.missile.lockMs;
    const color = p >= 1 ? 0x61f6ff : 0xffb43b;
    this.lockView.lineStyle(3, color, 0.95);
    this.lockView.beginPath();
    this.lockView.arc(this.lockTarget.sprite.x, this.lockTarget.sprite.y, this.lockTarget.radius + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p, false);
    this.lockView.strokePath();
  }
  launchMissile(target) {
    this.ammo -= 1;
    this.api.onMissileLaunch?.(target);
    this.cooldown = GAME_RULES.missile.cooldownMs;
    const projectile = this.acquireMissile();
    projectile.active = true;
    projectile.target = target;
    projectile.lastX = target.sprite.x;
    projectile.lastY = target.sprite.y;
    projectile.life = 1800;
    const launchPoint = this.scene.getMissileLaunchPoint?.(target) || { x: 195, y: 690 };
    projectile.image.setPosition(launchPoint.x, launchPoint.y).setVisible(true).setActive(true).setDisplaySize(46, 46);
    projectile.trail.setVisible(true);
  }
  acquireMissile() {
    let projectile = this.missilePool.find((entry) => !entry.active);
    if (projectile) return projectile;
    if (this.missilePool.length >= 4) return this.missilePool[0];
    projectile = {
      active: false,
      image: this.scene.add.image(195, 710, ASSET_KEYS.guidedMissile).setVisible(false).setDepth(55),
      trail: this.scene.add.graphics().setVisible(false).setDepth(54),
      target: null, lastX: 195, lastY: 0, life: 0,
    };
    this.missilePool.push(projectile);
    return projectile;
  }
  updateMissiles(delta) {
    const speed = 760;
    for (const projectile of this.missilePool) {
      if (!projectile.active) continue;
      const { image, target } = projectile;
      if (target?.active) { projectile.lastX = target.sprite.x; projectile.lastY = target.sprite.y; }
      const dx = projectile.lastX - image.x;
      const dy = projectile.lastY - image.y;
      const distance = Math.hypot(dx, dy) || 1;
      const step = Math.min(distance, speed * delta / 1000);
      image.x += dx / distance * step;
      image.y += dy / distance * step;
      image.rotation = Math.atan2(dy, dx) + Math.PI / 2;
      projectile.trail.clear().lineStyle(5, 0x6feaff, 0.58).lineBetween(
        image.x - dx / distance * 34,
        image.y - dy / distance * 34,
        image.x,
        image.y,
      );
      projectile.life -= delta;
      if (distance <= Math.max(16, target?.radius || 16) || projectile.life <= 0) {
        if (target?.active) this.api.damageTarget(target, GAME_RULES.missile.damage, 'missile');
        this.api.explosion(image.x, image.y);
        this.releaseMissile(projectile);
      }
    }
  }
  releaseMissile(projectile) {
    projectile.active = false;
    projectile.target = null;
    projectile.image.setVisible(false).setActive(false);
    projectile.trail.clear().setVisible(false);
  }
  get accuracy() { return this.shots ? Math.round(this.hits / this.shots * 100) : 100; }
  stop() { this.setGunHeld(false); this.endMissile(); }
  destroy(destroyViews = true) {
    this.stop();
    if (!destroyViews) {
      this.missilePool.length = 0;
      return;
    }
    this.lockView.destroy();
    for (const projectile of this.missilePool) { projectile.image.destroy(); projectile.trail.destroy(); }
    this.missilePool.length = 0;
  }
}
