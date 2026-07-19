import Phaser from 'phaser';
import { animationKey } from '../systems/AnimationRegistry.js';
import { attachContactShadow, destroyContactShadow, updateContactShadow } from '../systems/ContactShadowSystem.js';

const PHASE_THRESHOLDS = [1, 0.66, 0.33];

/** Three-phase final boss. Scene listens to phaseChanged/telegraph/defeated. */
export class IronMoleBoss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, options = {}) {
    // The authored track baseline is 480/512. The encounter previously spawned
    // the 260px render at y=470, leaving a measured 14.125px visual air gap.
    // Move the raster anchor down by that authored gap while keeping the body
    // contract on the same track baseline.
    const groundedY = y + (options.visualGroundOffset ?? 14.125);
    super(scene, x, groundedY, options.texture ?? 'boss-iron-mole-actions');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.maxHealth = options.health ?? options.maxHp ?? 120;
    this.health = this.maxHealth;
    this.phase = 1;
    this.faction = 'enemy';
    this.target = options.target ?? null;
    this.weaponSystem = options.weaponSystem ?? null;
    this.state = 'intro';
    this.nextAttackAt = scene.time.now + 1400;
    this.attackIndex = 0;
    this.scoreValue = options.score ?? 5000;
    this.contactDamage = options.contactDamage ?? 3;
    this.baseContactDamage = this.contactDamage;
    this.baseY = groundedY;
    this.baseX = x;
    this.setTint(options.tint ?? 0x8d4f3c).setDisplaySize(options.width ?? 260, options.height ?? 145);
    const bodyWidth = this.frame.realWidth * 0.86;
    const bodyHeight = this.frame.realHeight * 0.42;
    this.body.setSize(bodyWidth, bodyHeight, false).setOffset((this.frame.realWidth - bodyWidth) / 2, 496 - bodyHeight);
    this.body.updateBounds();
    this.body.updateFromGameObject();
    // Bosses are commonly spawned during Scene.update, after Arcade preUpdate.
    // Synchronize integration anchors or the same frame's postUpdate replays
    // the constructor's body-layout delta onto the sprite position.
    this.body.prev.copy(this.body.position);
    this.body.prevFrame.copy(this.body.position);
    this.body.autoFrame.copy(this.body.position);
    this.body.setImmovable(true).setAllowGravity(false);
    this.phaseTimer = null;
    this.attackTimer = null;
    this.visualState = '';
    this.visualLockUntil = 0;
    this.nextRecoilAt = 0; this.nextHitVisualAt = 0; this.deathEventSent = false;
    this.playState('phase-1');
    this.machineBobBaseOrigin = { x: this.displayOriginX, y: this.displayOriginY };
    this.machineBobBaseBodyOffset = { x: this.body.offset.x, y: this.body.offset.y };
    attachContactShadow(this, 'ironMole');
    this.setData('weightMotionContract', { idleBobRangePx: [1, 3], attackSettlePx: [2, 4], authoredGroundOffsetPx: options.visualGroundOffset ?? 14.125 });
  }

  setTarget(target) { this.target = target; return this; }
  setWeaponSystem(system) { this.weaponSystem = system; return this; }
  muzzlePosition(direction = null, weaponId = '') {
    const facing = Math.sign(direction?.x ?? (this.flipX ? -1 : 1)) || 1;
    const socket = weaponId === 'mole-missile' ? { x: 0.36, y: -0.27 }
      : weaponId === 'mole-overdrive' ? { x: 0.25, y: -0.08 }
        : { x: 0.30, y: -0.18 };
    return { x: this.x + facing * this.displayWidth * socket.x, y: this.y + this.displayHeight * socket.y };
  }
  playState(state, force = false) { if (!force && this.scene.time.now < this.visualLockUntil) return; const key = animationKey('boss-iron-mole', state); if (!this.scene.anims.exists(key) || (!force && this.visualState === state)) return; this.visualState = state; this.play(key, !force); }

  updateMachineWeight(time) {
    const attacking = this.state === 'charging' || this.scene.time.now < this.visualLockUntil;
    const amplitude = attacking ? 1.65 : 0.72;
    const bob = Math.sin(time * (attacking ? 0.018 : 0.0055) + this.phase * 0.7) * amplitude;
    const scaleY = Math.max(0.001, Math.abs(this.scaleY));
    this.setDisplayOrigin(this.machineBobBaseOrigin.x, this.machineBobBaseOrigin.y - bob / scaleY);
    this.body.setOffset(this.machineBobBaseBodyOffset.x, this.machineBobBaseBodyOffset.y - bob / scaleY);
    this.body.updateBounds(); this.setData('visualBobPx', bob); updateContactShadow(this);
  }

  update(time) {
    this.updateMachineWeight(time);
    if (!this.active || this.health <= 0 || !this.target?.active) return;
    if (this.state === 'intro') this.state = 'combat';
    this.setFlipX(this.target.x < this.x);
    if (this.state !== 'combat') return;
    if (time >= this.visualLockUntil && this.visualState !== `phase-${this.phase}`) this.playState(`phase-${this.phase}`, true);
    if (time < this.nextAttackAt) return;
    if (this.phase === 1) this.phaseOne(time);
    else if (this.phase === 2) this.phaseTwo(time);
    else this.phaseThree(time);
  }

  phaseOne(time) {
    this.playState('phase-1');
    const aim = this.aimAtTarget();
    this.scheduleTelegraphedAttack(time, 'cannon-fan', 480, 1100, () => {
      for (let i = -1; i <= 1; i += 1) this.weaponSystem?.fireEnemyProjectile(this, aim.clone().rotate(i * 0.14), { weaponId: 'mole-cannon', speed: 400, damage: 1, dodgeHint: 'jump-or-move' });
    });
  }

  phaseTwo(time) {
    this.playState('phase-2');
    const aim = this.aimAtTarget();
    if (this.attackIndex++ % 2 === 0) {
      this.scheduleTelegraphedAttack(time, 'missile-salvo', 560, 900, () => {
        [-0.28, -0.1, 0.1, 0.28].forEach((r) => this.weaponSystem?.fireEnemyProjectile(this, aim.clone().rotate(r), { weaponId: 'mole-missile', speed: 320, gravityY: 220, damage: 1, blastRadius: 78, lifespan: 2800, tint: 0xf47a44, dodgeHint: 'move-out' }));
      });
    } else {
      const targetX = this.target.x;
      this.scheduleTelegraphedAttack(time, 'drill-charge', 650, 850, () => this.executeDrillCharge(targetX, 2, 700));
    }
  }

  phaseThree(time) {
    this.playState('phase-3');
    const aim = this.aimAtTarget();
    this.scheduleTelegraphedAttack(time, 'overdrive', 500, 650, () => {
      for (let i = 0; i < 7; i += 1) {
        const angle = -0.62 + i * 0.205;
        this.weaponSystem?.fireEnemyProjectile(this, aim.clone().rotate(angle), { weaponId: 'mole-overdrive', speed: 440, damage: i % 3 === 0 ? 2 : 1, tint: 0xff4a32, dodgeHint: 'strafe' });
      }
      this.emit('hazardPulse', { boss: this, radius: 220, damage: 1, delay: 560 });
    });
  }

  scheduleTelegraphedAttack(time, kind, duration, cooldown, callback) {
    const phase = this.phase;
    const commitMarginMs = 140;
    this.nextAttackAt = time + duration + commitMarginMs + cooldown;
    this.telegraph(kind, duration);
    this.attackTimer?.remove(false);
    // Preserve the entire warning even when renderer load makes timer commits
    // appear up to ~100ms early relative to the scene clock.
    this.attackTimer = this.scene.time.delayedCall(duration + commitMarginMs, () => {
      this.attackTimer = null;
      if (!this.active || this.health <= 0 || this.state !== 'combat' || this.phase !== phase) return;
      callback();
    });
  }

  executeDrillCharge(targetX, damage, duration) {
    if (!this.active || this.health <= 0 || this.state !== 'combat') return;
    this.state = 'charging';
    // The global actor-overlap contract otherwise applies the boss's 30-point
    // stationary contact damage every 700ms while the drill crosses the player,
    // defeating the telegraphed attack in three unavoidable ticks. The charge
    // owns its authored damage value for the duration of the motion.
    this.contactDamage = damage;
    const startX = this.x;
    const destination = Phaser.Math.Clamp(targetX + (targetX < startX ? 76 : -76), this.baseX - 430, this.baseX + 430);
    let hit = false;
    this.emit('drillCharge', { boss: this, targetX: destination, damage, duration });
    this.scene.tweens.add({
      targets: this, x: destination, duration: Math.round(duration * 0.58), yoyo: true, hold: 80, ease: 'Quad.easeIn',
      onUpdate: () => {
        if (!hit && this.target?.active && Math.abs(this.target.x - this.x) < 118 && Math.abs(this.target.y - this.y) < 105) {
          hit = true;
          this.target.takeDamage?.(damage, this);
        }
      },
      onComplete: () => {
        if (!this.active || this.health <= 0 || this.state === 'defeated') return;
        this.contactDamage = this.baseContactDamage;
        this.state = 'combat';
        this.playState(`phase-${this.phase}`, true);
      },
    });
  }

  aimAtTarget() {
    return new Phaser.Math.Vector2(this.target.x - this.x, this.target.y - this.y).normalize();
  }

  telegraph(kind, duration) { this.emit('telegraph', { kind, duration, phase: this.phase }); }

  takeDamage(amount = 1, source = null) {
    if (!this.active || this.health <= 0 || this.state === 'transition') return false;
    this.health = Math.max(0, this.health - amount);
    const now = this.scene.time.now;
    const weaponId = source?.weaponId ?? 'rifle';
    const recoilPx = weaponId === 'shotgun' ? 9 : weaponId === 'rocket' ? 19 : weaponId === 'grenade' ? 21 : 4;
    // Automatic fire must not continuously restart the one-shot hit pose.
    // Per-hit material VFX still fires from `damaged`; the authored sprite
    // reaction is rate-limited so phase/attack silhouettes remain readable.
    if (now >= this.nextHitVisualAt && this.state === 'combat') {
      this.nextHitVisualAt = now + 480;
      this.visualLockUntil = now + 120;
      this.playState('hit', true);
    }
    this.emit('damaged', { boss: this, amount, health: this.health, source, weaponId, phase: this.phase, hitPoint: { x: source?.x ?? this.x, y: source?.y ?? this.y }, recoilPx });
    if (this.health > 0 && now >= this.nextRecoilAt && this.state !== 'charging') {
      this.nextRecoilAt = now + (weaponId === 'shotgun' ? 95 : 58);
      const direction = Math.sign(this.x - (source?.x ?? this.x - 1)) || 1;
      this.scene.tweens.add({ targets: this, x: this.x + direction * recoilPx, duration: 62, yoyo: true, ease: 'Quad.easeOut' });
    }
    if (this.health <= 0) {
      this.emit('healthChanged', { health: this.health, maxHealth: this.maxHealth, phase: this.phase });
      this.die(source);
      return true;
    }
    const ratio = this.health / this.maxHealth;
    const nextPhase = ratio <= PHASE_THRESHOLDS[2] ? 3 : ratio <= PHASE_THRESHOLDS[1] ? 2 : 1;
    if (nextPhase !== this.phase) this.changePhase(nextPhase);
    this.emit('healthChanged', { health: this.health, maxHealth: this.maxHealth, phase: this.phase });
    return true;
  }

  changePhase(phase) {
    this.scene.tweens.killTweensOf(this);
    this.weaponSystem?.pool?.group?.getChildren?.().forEach((projectile) => {
      if (projectile.active && projectile.owner === this) projectile.expire('phase-change');
    });
    this.phase = phase;
    this.state = 'transition';
    this.clearTint();
    this.visualLockUntil = this.scene.time.now + 650;
    this.playState(phase === 3 ? 'core-exposed' : 'armor-break', true);
    this.emit('phaseChanged', { phase, boss: this });
    this.phaseTimer?.remove(false);
    this.phaseTimer = this.scene.time.delayedCall(650, () => {
      this.phaseTimer = null;
      if (!this.active || this.health <= 0 || this.state !== 'transition' || this.phase !== phase) return;
      this.state = 'combat';
      this.playState(`phase-${phase}`, true);
      this.nextAttackAt = this.scene.time.now + 350;
    });
  }

  die(source = null) {
    if (this.state === 'defeated') return;
    this.state = 'defeated';
    this.contactDamage = this.baseContactDamage;
    this.phaseTimer?.remove(false); this.phaseTimer = null;
    this.attackTimer?.remove(false); this.attackTimer = null;
    this.scene.tweens.killTweensOf(this);
    this.setVelocity(0, 0); if (this.body) this.body.enable = false; this.playState('destroyed', true);
    this.emit('deathStarted', { boss: this, score: this.scoreValue, source, eventDelayMs: 1650, hideDelayMs: 3400 });
    this.scene.time.delayedCall(1650, () => {
      if (!this.active || this.deathEventSent) return;
      this.deathEventSent = true;
      this.emit('defeated', { boss: this, score: this.scoreValue, source });
    });
    this.scene.time.delayedCall(3400, () => this.active && this.disableBody(true, true));
  }

  preDestroy() {
    this.phaseTimer?.remove(false); this.attackTimer?.remove(false);
    destroyContactShadow(this); super.preDestroy();
  }

}

export default IronMoleBoss;
