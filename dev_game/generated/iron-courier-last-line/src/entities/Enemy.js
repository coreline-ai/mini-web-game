import Phaser from 'phaser';
import { animationKey } from '../systems/AnimationRegistry.js';
import { attachContactShadow, destroyContactShadow, updateContactShadow } from '../systems/ContactShadowSystem.js';

export const ENEMY_ROLES = Object.freeze({
  basic: { health: 3, speed: 72, range: 470, fireDelay: 1150, damage: 1, tint: 0xc84b42, score: 100, width: 42, height: 70 },
  shield: { health: 8, speed: 42, range: 310, fireDelay: 1500, damage: 1, tint: 0x4c6a86, score: 180, width: 50, height: 76, frontalReduction: 0.72 },
  grenadier: { health: 4, speed: 54, range: 590, fireDelay: 2100, damage: 2, tint: 0xd78d35, score: 160, width: 44, height: 72, projectile: 'grenade' },
  drone: { health: 3, speed: 105, range: 520, fireDelay: 900, damage: 1, tint: 0x7e56a8, score: 140, width: 58, height: 34, flying: true },
});

export const ENEMY_ROLE_ALIASES = Object.freeze({
  basicSoldier: 'basic',
  shieldSoldier: 'shield',
  sentryDrone: 'drone',
});

const ROLE_FAMILY = Object.freeze({ basic: 'enemy-rifle', shield: 'enemy-shield', grenadier: 'enemy-grenadier', drone: 'enemy-drone' });
const ROLE_TEXTURE = Object.freeze({ basic: 'enemy-rifle-actions', shield: 'enemy-shield-actions', grenadier: 'enemy-grenadier-actions', drone: 'enemy-drone-actions' });

function deterministicVisualSeed(x, y, role) {
  const roleHash = [...role].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261);
  return (Math.imul(Math.round(x), 73856093) ^ Math.imul(Math.round(y), 19349663) ^ roleHash) >>> 0;
}

/** Four-role enemy actor with simple autonomous seek/attack AI. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, role = 'basic', options = {}) {
    const normalizedRole = ENEMY_ROLES[role] ? role : (ENEMY_ROLE_ALIASES[role] ?? 'basic');
    super(scene, x, y, options.texture ?? ROLE_TEXTURE[normalizedRole]);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.role = normalizedRole;
    const base = ENEMY_ROLES[this.role];
    this.config = {
      ...base,
      ...options,
      health: options.health ?? options.maxHp ?? base.health,
      speed: options.speed ?? options.moveSpeed ?? base.speed,
      range: options.range ?? options.attackRange ?? base.range,
      fireDelay: options.fireDelay ?? options.attackCooldownMs ?? base.fireDelay,
      damage: options.damage ?? options.projectileDamage ?? options.grenadeDamage ?? options.meleeDamage ?? base.damage,
      contactDamage: options.contactDamage ?? options.touchDamage ?? 1,
      frontalReduction: options.frontalReduction ?? (options.frontalDamageMultiplier != null ? 1 - options.frontalDamageMultiplier : base.frontalReduction),
      width: options.width ?? options.body?.width ?? base.width,
      height: options.height ?? options.body?.height ?? base.height,
    };
    this.maxHealth = this.config.health;
    this.health = this.maxHealth;
    this.faction = 'enemy';
    this.state = 'idle';
    this.target = options.target ?? null;
    this.weaponSystem = options.weaponSystem ?? null;
    this.nextAttackAt = scene.time.now + Phaser.Math.Between(250, 800);
    this.pendingAttackAt = null;
    this.spawnX = x;
    this.scoreValue = this.config.score;
    this.setTint(this.config.tint).setDisplaySize(this.config.width, this.config.height);
    this.body.setSize(this.frame.realWidth * 0.54, this.frame.realHeight * 0.86, true);
    this.body.setAllowGravity(!this.config.flying);
    this.setCollideWorldBounds(true);
    this.patrolPhase = Math.random() * Math.PI * 2;
    this.animationFamily = ROLE_FAMILY[this.role];
    const visualSeed = deterministicVisualSeed(x, y, this.role);
    // Eight phase buckets keep common 150/170px formations visibly separated
    // even on short 6-frame locomotion loops. Derive time scale from the same
    // stable bucket so repeat captures remain deterministic.
    const visualBucket = visualSeed % 8;
    this.visualPhaseOffset = (visualBucket + 0.5) / 8;
    this.visualTimeScale = 0.96 + (visualBucket % 5) * 0.02;
    this.setData('visualPhaseOffset', this.visualPhaseOffset);
    this.setData('visualTimeScale', this.visualTimeScale);
    this.visualState = '';
    this.visualLockUntil = 0;
    this.nextHitVisualAt = 0;
    this.playState(this.role === 'drone' ? 'hover' : 'idle');
    if (!this.config.flying) attachContactShadow(this, 'enemy');
  }

  setTarget(target) { this.target = target; return this; }
  setWeaponSystem(system) { this.weaponSystem = system; return this; }
  muzzlePosition(direction = null, weaponId = null) {
    const facing = Math.sign(direction?.x ?? (this.flipX ? -1 : 1)) || 1;
    const socket = this.role === 'drone'
      ? { x: 0.39, y: 0.02 }
      : this.role === 'grenadier' || weaponId === 'enemyGrenade'
        ? { x: 0.24, y: -0.34 }
        : { x: 0.34, y: -0.22 };
    return { x: this.x + facing * this.displayWidth * socket.x, y: this.y + this.displayHeight * socket.y };
  }

  stateDurationMs(state, minimum = 0) {
    const animation = this.scene.anims.get(animationKey(this.animationFamily, state));
    const duration = animation?.frameRate > 0 ? ((animation.frames?.length ?? 1) / animation.frameRate) * 1000 : 0;
    return Math.max(minimum, Math.ceil(duration + 24));
  }

  playActionState(state, recoveryState = null, recoveryMinimum = 0) {
    if (this.actionCompleteHandler) this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.actionCompleteHandler);
    const key = animationKey(this.animationFamily, state);
    this.visualLockUntil = this.scene.time.now + this.stateDurationMs(state);
    this.playState(state, true);
    if (!recoveryState) return;
    this.actionCompleteHandler = (animation) => {
      if (animation?.key !== key || !this.active || this.health <= 0) return;
      this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.actionCompleteHandler);
      this.actionCompleteHandler = null;
      this.visualLockUntil = this.scene.time.now + this.stateDurationMs(recoveryState, recoveryMinimum);
      this.playState(recoveryState, true);
    };
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.actionCompleteHandler);
  }

  update(time, delta) {
    updateContactShadow(this);
    if (!this.active || this.health <= 0 || !this.target?.active) return;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.setFlipX(dx < 0);

    if (Number.isFinite(this.pendingAttackAt)) {
      this.state = 'telegraph';
      this.setVelocityX(0);
      if (time >= this.pendingAttackAt) {
        this.pendingAttackAt = null;
        this.attack(time, dx, dy);
      }
      return;
    }

    if (this.config.flying) {
      const desiredY = this.target.y - 120 + Math.sin(time * 0.002 + this.patrolPhase) * 45;
      this.setVelocityY(Phaser.Math.Clamp((desiredY - this.y) * 2.2, -this.config.speed, this.config.speed));
    }

    const engagementDistance = this.role === 'shield' ? 145 : this.config.range;
    const retreatDistance = this.role === 'grenadier' ? (this.config.minAttackRange ?? 220) : 130;
    if (distance > engagementDistance) {
      this.state = 'advance';
      this.setVelocityX(Math.sign(dx) * this.config.speed);
      this.playState(this.role === 'shield' ? 'march' : this.role === 'drone' ? (dx < 0 ? 'bank-left' : 'bank-right') : 'run');
    } else if (distance < retreatDistance && this.role !== 'shield') {
      this.state = 'retreat';
      this.setVelocityX(-Math.sign(dx) * this.config.speed * 0.7);
      this.playState(this.role === 'drone' ? (dx < 0 ? 'bank-right' : 'bank-left') : 'run');
    } else {
      this.state = 'attack';
      this.setVelocityX(0);
      this.playState(this.role === 'shield' ? 'guard' : this.role === 'grenadier' ? 'windup' : this.role === 'drone' ? 'charge' : 'aim');
      if (time >= this.nextAttackAt) this.beginAttackTelegraph(time);
    }
  }

  beginAttackTelegraph(time) {
    const duration = Math.max(160, this.config.telegraphMs ?? 280);
    // Preserve the full authored warning through coarse/slow render frames.
    // The extra commit margin keeps observed lead >= duration - 50ms.
    this.pendingAttackAt = time + duration + 48;
    // Cooldown begins after the committed shot, so the authored telegraph is
    // readable time rather than hidden inside the attack interval.
    this.nextAttackAt = this.pendingAttackAt + this.config.fireDelay;
    this.emit('attackTelegraph', { role: this.role, duration });
  }

  playState(state, force = false) {
    if (!force && this.scene.time.now < this.visualLockUntil) return;
    const key = animationKey(this.animationFamily, state);
    if (!this.scene.anims.exists(key) || (!force && this.visualState === state)) return;
    const stateChanged = this.visualState !== state;
    this.visualState = state;
    this.play(key, !force);
    // Desynchronize only indefinite ambient/locomotion loops. One-shot attack,
    // hit and death timing stays at 1x so gameplay and lifecycle timing remain
    // unchanged.
    const looping = this.anims.currentAnim?.repeat === -1;
    this.anims.timeScale = looping ? this.visualTimeScale : 1;
    if (looping && stateChanged && (this.anims.currentAnim?.frames?.length ?? 0) > 1) {
      this.anims.setProgress(this.visualPhaseOffset);
    }
  }

  attack(time, dx, dy) {
    this.nextAttackAt = time + this.config.fireDelay;
    const aimedDirection = new Phaser.Math.Vector2(dx, dy).normalize();
    if (this.role === 'grenadier') {
      this.playActionState('throw', 'recover', 180);
      this.weaponSystem?.fireEnemyProjectile(this, aimedDirection, { weaponId: 'enemyGrenade', speed: 260, gravityY: 620, damage: this.config.damage, blastRadius: 105, lifespan: 2800, trail: false, dodgeHint: 'move-out' });
    } else if (this.role === 'shield') {
      // The shield animation is a close-range bash, not a hidden rifle shot.
      // Telegraphing and closing to 145px makes the counter-play visually true.
      this.playActionState('bash', 'guard', 180);
      if (Math.abs(dx) <= 165 && Math.abs(dy) <= 96) this.target?.takeDamage?.(this.config.damage, this);
    } else {
      this.playActionState('fire', this.role === 'basic' ? 'recoil' : 'hover', 130);
      const speed = this.role === 'drone' ? 360 : 320;
      const crouchDodgeable = this.role === 'basic';
      const direction = crouchDodgeable ? new Phaser.Math.Vector2(Math.sign(dx || 1), 0) : aimedDirection;
      // Straight crouch-dodge shots must survive a full combat viewport.
      // A short 2.2s scene-clock lifetime could expire during first-frame
      // shader warm-up before the slower 320px/s bolt reached the player.
      const lifespan = crouchDodgeable ? 3400 : 2800;
      this.weaponSystem?.fireEnemyProjectile(this, direction, { weaponId: `enemy-${this.role}`, speed, lifespan, damage: this.config.damage, dodgeHint: crouchDodgeable ? 'crouch' : 'jump-or-move' });
    }
    this.emit('attacked', { role: this.role, dodgeHint: this.role === 'basic' ? 'crouch' : this.role === 'shield' ? 'back-step-or-jump' : this.role === 'grenadier' ? 'move-out' : 'jump-or-move' });
  }

  takeDamage(amount = 1, source = null) {
    if (!this.active || this.health <= 0) return false;
    let applied = amount;
    let shieldBlocked = false;
    let armorBreaker = false;
    if (this.role === 'shield' && source?.x != null) {
      const sourceInFront = (this.flipX && source.x < this.x) || (!this.flipX && source.x > this.x);
      armorBreaker = source?.blastRadius > 0 || ['shotgun', 'rocket', 'grenade'].includes(source?.weaponId);
      // A frontal rifle hit is visually a guard impact, not a successful body
      // stagger. Rear attacks, shotgun blasts and explosives still break guard.
      if (sourceInFront && !armorBreaker) {
        applied *= 1 - this.config.frontalReduction;
        shieldBlocked = true;
      }
    }

    this.health = Math.max(0, this.health - applied);
    const now = this.scene.time.now;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(55, () => this.active && this.clearTint().setTint(this.config.tint));
    this.emit('damaged', { amount: applied, health: this.health, source, blocked: shieldBlocked });

    // Death must win over a fresh hit reaction; otherwise the last bullet can
    // briefly restart hurt/stagger before the death animation begins.
    if (this.health <= 0) {
      this.die(source);
      return true;
    }

    // Rapid-fire pellets must not restart the same one-shot every frame. A
    // blocked shield shot keeps the guard/bash visual while impact VFX and tint
    // still communicate that armor absorbed the round.
    if (!shieldBlocked && now >= this.nextHitVisualAt) {
      const hitState = this.role === 'shield' ? 'stagger' : this.role === 'drone' ? 'hit' : 'hurt';
      const hitDuration = this.stateDurationMs(hitState, 190);
      if (this.actionCompleteHandler) {
        this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.actionCompleteHandler);
        this.actionCompleteHandler = null;
      }
      this.visualLockUntil = now + hitDuration;
      this.nextHitVisualAt = now + (this.role === 'shield' ? Math.max(360, hitDuration) : Math.max(220, hitDuration * 0.8));
      this.playState(hitState, true);
    }
    return true;
  }

  preDestroy() { destroyContactShadow(this); super.preDestroy(); }

  die(source = null) {
    if (!this.active || this.health > 0) return;
    this.state = 'dead';
    this.pendingAttackAt = null;
    if (this.actionCompleteHandler) { this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.actionCompleteHandler); this.actionCompleteHandler = null; }
    this.setVelocity(0, 0);
    if (this.body) this.body.enable = false;
    this.playState(this.role === 'drone' ? 'explode' : 'death', true);
    this.emit('died', { enemy: this, score: this.scoreValue, source });
    const finish = () => this.active && this.disableBody(true, true);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
    this.scene.time.delayedCall(1100, finish);
  }
}

export const createEnemy = (scene, x, y, role, options) => new Enemy(scene, x, y, role, options);
export default Enemy;
