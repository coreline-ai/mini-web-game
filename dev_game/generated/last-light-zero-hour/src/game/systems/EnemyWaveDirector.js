import Phaser from 'phaser';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SPEC } from '../data/spec.js';
import { TUNING } from '../constants/tuning.js';

const TYPES = {
  walker: { texture: ASSET_KEYS.walker, anim: 'walker_move', hp: 54, speed: 118, damage: 9, size: 178, body: 130, attackRange: 86, score: 10 },
  runner: { texture: ASSET_KEYS.runner, anim: 'runner_move', hp: 38, speed: 238, damage: 7, size: 142, body: 118, attackRange: 72, score: 15 },
  spitter: { texture: ASSET_KEYS.walker, anim: 'walker_move', hp: 82, speed: 92, damage: 8, size: 174, body: 128, attackRange: 78, score: 22, tint: 0x75d7c4 },
  brute: { texture: ASSET_KEYS.brute, anim: 'brute_move', hp: 340, speed: 76, damage: 22, size: 292, body: 150, attackRange: 132, score: 48, elite: true },
  titan: { texture: ASSET_KEYS.titan, anim: 'titan_move', hp: 2800, speed: 58, damage: 34, size: 470, body: 156, attackRange: 206, score: 500, boss: true, elite: true },
};

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

export default class EnemyWaveDirector {
  constructor(scene, callbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.enemies = scene.physics.add.group({ maxSize: TUNING.maxEnemies, allowGravity: false, runChildUpdate: false });
    this.spawnAccumulator = 0;
    this.spawnedBossDays = new Set();
    this.serial = 0;
    this.totalSpawned = 0;
    this.currentBoss = null;
    this.surgeUntil = 0;
  }

  activeEnemies() {
    return this.enemies.getChildren().filter((e) => e.active && !e.getData('dying'));
  }

  chooseType(elapsed, phaseIndex) {
    const roll = Math.random();
    if (elapsed > 62 && roll < 0.11 + phaseIndex * 0.018) return 'brute';
    if (elapsed > 48 && roll < 0.27 + phaseIndex * 0.02) return 'spitter';
    if (elapsed > 18 && roll < 0.56 + phaseIndex * 0.025) return 'runner';
    return 'walker';
  }

  getSpawnState(elapsed, phaseIndex, day) {
    const phaseRate = [1, 0.84, 0.7, 0.56, 0.34][phaseIndex] || 1;
    const dayRate = Math.max(0.56, 1 - (day - 1) * 0.065);
    const interval = Math.max(92, (920 - Math.min(150, elapsed) * 4.4) * phaseRate * dayRate);
    const groupMin = phaseIndex >= 4 ? 3 : phaseIndex >= 2 ? 2 : 1;
    const groupMax = Math.min(6, groupMin + Math.floor(elapsed / 70));
    return { interval, groupMin, groupMax };
  }

  update(delta, elapsed, phaseIndex, day, player) {
    const state = this.getSpawnState(elapsed, phaseIndex, day);
    this.spawnAccumulator += delta;
    const bossTime = (day - 1) * 180 + 120;
    if (elapsed >= bossTime && !this.spawnedBossDays.has(day)) {
      this.spawnedBossDays.add(day);
      this.spawn('titan', SPEC.canvas.width / 2, -260, day);
      this.surgeUntil = this.scene.time.now + 9500;
    }
    const interval = this.scene.time.now < this.surgeUntil ? state.interval * 0.56 : state.interval;
    if (this.spawnAccumulator >= interval && this.activeEnemies().length < TUNING.maxEnemies) {
      this.spawnAccumulator -= interval;
      const count = Phaser.Math.Between(state.groupMin, state.groupMax);
      for (let i = 0; i < count; i += 1) this.spawn(this.chooseType(elapsed, phaseIndex), undefined, undefined, day);
    }
    this.updateMovement(delta, player, day);
    return { ...state, active: this.activeEnemies().length, boss: this.currentBoss };
  }

  spawn(type = 'walker', x, y, day = 1) {
    const cfg = TYPES[type] || TYPES.walker;
    if (x == null || y == null) {
      // Keep the portrait shooter readable: the horde enters through the
      // northern approach and advances down toward the player's defense line.
      x = Phaser.Math.Between(85, SPEC.canvas.width - 85);
      y = Phaser.Math.Between(-210, -80);
    }
    const enemy = this.enemies.get(x, y, cfg.texture);
    if (!enemy) return null;
    enemy.enableBody(true, x, y, true, true).setTexture(cfg.texture).setFrame(Phaser.Math.Between(0, 3));
    enemy.setDisplaySize(cfg.size, cfg.size).setDepth(type === 'titan' ? 18 : 14).setAlpha(1).setScale(cfg.size / 512).setAngle(0);
    enemy.clearTint(); if (cfg.tint) enemy.setTint(cfg.tint);
    enemy.body.setAllowGravity(false);
    enemy.body.setCircle(cfg.body, 256 - cfg.body, 256 - cfg.body);
    const healthScale = 1 + Math.max(0, day - 1) * (cfg.boss ? 0.24 : 0.11);
    const speedVariance = Phaser.Math.FloatBetween(0.88, 1.12);
    enemy.setDataEnabled();
    enemy.setData({
      id: ++this.serial, type, cfg, hp: cfg.hp * healthScale, maxHp: cfg.hp * healthScale,
      speed: cfg.speed * speedVariance * (1 + (day - 1) * 0.025), damage: cfg.damage,
      phase: Math.random() * Math.PI * 2, nextAttack: 0, nextShot: this.scene.time.now + Phaser.Math.Between(900, 1700),
      nextSpecial: this.scene.time.now + Phaser.Math.Between(3800, 6200), chargeUntil: 0, dying: false,
      baseTint: cfg.tint || 0xffffff,
    });
    enemy.play({ key: cfg.anim, startFrame: Phaser.Math.Between(0, 3) });
    enemy.anims.timeScale = Phaser.Math.FloatBetween(0.84, 1.18);
    this.totalSpawned += 1;
    if (cfg.boss) {
      this.currentBoss = enemy;
      this.callbacks.onBossSpawn?.(enemy);
    }
    return enemy;
  }

  updateMovement(delta, player, day) {
    if (!player?.active) return;
    const now = this.scene.time.now;
    const dt = Math.min(delta, 50) / 1000;
    const list = this.activeEnemies();
    for (const enemy of list) {
      const data = enemy.data.values;
      const cfg = data.cfg;
      const toPlayer = new Phaser.Math.Vector2(player.x - enemy.x, player.y - enemy.y);
      const distance = Math.max(1, toPlayer.length());
      const dir = toPlayer.clone().scale(1 / distance);
      let speed = data.speed;

      if (data.type === 'runner') {
        const wobble = Math.sin(now * 0.006 + data.phase) * 0.62;
        dir.add(new Phaser.Math.Vector2(-dir.y, dir.x).scale(wobble)).normalize();
      } else if (data.type === 'spitter') {
        if (distance < 560) dir.scale(-0.55);
        else if (distance < 850) dir.scale(0.08);
        if (distance < 940 && now >= data.nextShot) {
          data.nextShot = now + Phaser.Math.Between(1700, 2500);
          this.callbacks.onEnemyShoot?.(enemy, toPlayer.normalize(), data.damage);
        }
      } else if (cfg.boss) {
        if (now >= data.nextSpecial) {
          data.nextSpecial = now + Phaser.Math.Between(5000, 7600);
          data.chargeUntil = now + 1150;
          this.callbacks.onBossCharge?.(enemy);
        }
        if (now < data.chargeUntil) speed *= 3.15;
      }

      const separationRadius = cfg.boss ? 260 : data.type === 'brute' ? 175 : 118;
      let sx = 0; let sy = 0;
      for (const other of list) {
        if (other === enemy) continue;
        const dx = enemy.x - other.x; const dy = enemy.y - other.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1 && d2 < separationRadius * separationRadius) {
          const f = (separationRadius * separationRadius - d2) / (separationRadius * separationRadius);
          sx += (dx / Math.sqrt(d2)) * f; sy += (dy / Math.sqrt(d2)) * f;
        }
      }
      dir.x += sx * 0.58; dir.y += sy * 0.58; dir.normalize();
      enemy.setVelocity(dir.x * speed, dir.y * speed);
      const targetAngle = Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x) - Math.PI / 2);
      enemy.angle = Phaser.Math.Angle.RotateTo(Phaser.Math.DegToRad(enemy.angle), Phaser.Math.DegToRad(targetAngle), dt * 2.6) * 180 / Math.PI;

      const bob = Math.sin(now * (data.type === 'runner' ? 0.018 : 0.009) + data.phase);
      enemy.setScale((cfg.size / 512) * (1 + bob * (cfg.boss ? 0.015 : 0.026)));

      if (distance < cfg.attackRange + 62 && now >= data.nextAttack) {
        data.nextAttack = now + (cfg.boss ? 1450 : data.type === 'runner' ? 720 : 980);
        this.callbacks.onPlayerHit?.(data.damage, enemy);
      }
    }
  }

  findNearest(x, y, maxDistance = 1600, exclude = new Set()) {
    let best = null; let bestD = maxDistance * maxDistance;
    for (const enemy of this.activeEnemies()) {
      if (exclude.has(enemy)) continue;
      const dx = enemy.x - x; const dy = enemy.y - y; const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = enemy; }
    }
    return best;
  }

  damage(enemy, amount, hitX = enemy?.x, hitY = enemy?.y, knockback = 0, critical = false) {
    if (!enemy?.active || enemy.getData('dying')) return { killed: false };
    const data = enemy.data.values;
    data.hp -= amount;
    if (knockback > 0 && !data.cfg.boss) {
      const a = Phaser.Math.Angle.Between(hitX, hitY, enemy.x, enemy.y);
      enemy.x += Math.cos(a) * knockback; enemy.y += Math.sin(a) * knockback;
    }
    enemy.setTintFill(0xe8fff8);
    this.scene.time.delayedCall(58, () => { if (enemy.active && !enemy.getData('dying')) { enemy.clearTint(); if (data.cfg.tint) enemy.setTint(data.cfg.tint); } });
    this.callbacks.onEnemyDamaged?.(enemy, amount, critical);
    if (data.cfg.boss) this.callbacks.onBossHealth?.(clamp01(data.hp / data.maxHp), enemy);
    if (data.hp <= 0) {
      data.dying = true;
      enemy.body.enable = false;
      enemy.stop();
      const deathX = enemy.x; const deathY = enemy.y;
      this.callbacks.onEnemyKilled?.({ enemy, type: data.type, elite: !!data.cfg.elite, boss: !!data.cfg.boss, score: data.cfg.score, x: deathX, y: deathY });
      if (data.cfg.boss) { this.currentBoss = null; this.callbacks.onBossHealth?.(0, enemy); }
      this.scene.tweens.add({ targets: enemy, alpha: 0, angle: enemy.angle + Phaser.Math.Between(-38, 38), scaleX: enemy.scaleX * 1.18, scaleY: enemy.scaleY * 0.68, duration: data.cfg.boss ? 760 : 340, ease: 'Quad.easeOut', onComplete: () => enemy.disableBody(true, true) });
      return { killed: true, data };
    }
    return { killed: false, data };
  }

  forceSurge(ms = 10000) { this.surgeUntil = this.scene.time.now + ms; }
  destroy() {
    if (this.enemies?.children) this.enemies.clear(true, true);
    this.enemies = null;
    this.currentBoss = null;
  }
}

export { TYPES as ENEMY_TYPES };
