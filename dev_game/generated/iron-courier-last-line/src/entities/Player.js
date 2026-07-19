import Phaser from 'phaser';
import { attachContactShadow, destroyContactShadow, updateContactShadow } from '../systems/ContactShadowSystem.js';

const DEFAULTS = {
  maxHealth: 6,
  moveSpeed: 265,
  airControl: 0.84,
  jumpSpeed: 510,
  coyoteMs: 80,
  jumpBufferMs: 100,
  invulnerableMs: 900,
  width: 42,
  height: 78,
  acceleration: 3200,
  deceleration: 3600,
};

/** Mobile-friendly run-and-gun player. Input is supplied as an action object. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y, options.texture ?? 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.config = {
      ...DEFAULTS,
      ...options,
      maxHealth: options.maxHealth ?? options.maxHp ?? DEFAULTS.maxHealth,
      moveSpeed: options.moveSpeed ?? DEFAULTS.moveSpeed,
      jumpSpeed: Math.abs(options.jumpSpeed ?? options.jumpVelocity ?? DEFAULTS.jumpSpeed),
      coyoteMs: options.coyoteMs ?? options.coyoteTimeMs ?? DEFAULTS.coyoteMs,
      jumpBufferMs: options.jumpBufferMs ?? options.jumpBufferTimeMs ?? DEFAULTS.jumpBufferMs,
      invulnerableMs: options.invulnerableMs ?? options.hurtInvulnerabilityMs ?? DEFAULTS.invulnerableMs,
      width: options.width ?? options.body?.width ?? DEFAULTS.width,
      height: options.height ?? options.body?.height ?? DEFAULTS.height,
      acceleration: options.acceleration ?? DEFAULTS.acceleration,
      deceleration: options.deceleration ?? options.drag ?? DEFAULTS.deceleration,
    };
    this.maxHealth = this.config.maxHealth;
    this.health = this.maxHealth;
    this.faction = 'player';
    this.facing = 1;
    this.aim = new Phaser.Math.Vector2(1, 0);
    this.state = 'idle';
    this.weaponSystem = options.weaponSystem ?? null;
    this.lastGroundedAt = -Infinity;
    this.jumpQueuedAt = -Infinity;
    this.invulnerableUntil = 0;
    this.inputLocked = false;
    this.lastMotionSampleAt = scene.time.now;
    // Presentation transitions are tracked independently from the physics
    // state so crouching/standing never changes in a single rendered frame.
    this.previousState = 'idle';
    this.stateChangedAt = scene.time.now;
    this.crouchEnterMs = 120;
    this.crouchExitMs = 120;
    this.hurtStateLock = null;
    this.hurtStateLockUntil = 0;
    this.setTint(options.tint ?? 0xf4e3bd).setDisplaySize(this.config.width, this.config.height);
    this.standingBody = {
      width: this.frame.realWidth * 0.54,
      height: this.frame.realHeight * 0.9,
    };
    this.standingBody.bottom = (this.frame.realHeight - this.standingBody.height) / 2 + this.standingBody.height;
    this.crouchingBodyHeight = this.frame.realHeight * (72 / this.config.height);
    this.body.setSize(this.standingBody.width, this.standingBody.height, true);
    this.body.setMaxVelocity(this.config.moveSpeed, options.maxFallVelocity ?? 980);
    this.setCollideWorldBounds(true);
    attachContactShadow(this, 'player');
    this.setData('movementWeightContract', { accelerationMsTo90: 80, decelerationMsToZero: 79, stopPlantMs: 80 });
  }

  setWeaponSystem(system) {
    this.weaponSystem = system;
    return this;
  }

  queueJump(time = this.scene.time.now) {
    this.jumpQueuedAt = time;
  }

  /** actions: moveX, aimX, aimY, jumpPressed, shootDown, grenadePressed, crouch */
  handleActions(actions = {}, time = this.scene.time.now) {
    if (!this.active || this.health <= 0 || this.inputLocked) return;
    let grounded = this.body.blocked.down || this.body.touching.down;
    if (grounded) this.lastGroundedAt = time;
    if (actions.jumpPressed) this.queueJump(time);

    // Ground crouch is an immediate defensive posture, including during hit
    // reaction. Keyboard DOWN+direction must match the mobile stick contract:
    // plant first, then lower the hurtbox on this same simulation tick.
    const crouchRequested = grounded && Boolean(actions.crouch);
    const moveX = crouchRequested ? 0 : Phaser.Math.Clamp(actions.moveX ?? 0, -1, 1);
    const control = grounded ? 1 : this.config.airControl;
    const targetVelocityX = moveX * this.config.moveSpeed * control;
    const dt = Phaser.Math.Clamp((time - this.lastMotionSampleAt) / 1000 || 1 / 60, 0, 0.034);
    this.lastMotionSampleAt = time;
    const rate = Math.abs(moveX) > 0.08 ? this.config.acceleration : this.config.deceleration;
    const deltaV = rate * dt;
    const currentVelocityX = this.body.velocity.x;
    const nextVelocityX = Math.abs(targetVelocityX - currentVelocityX) <= deltaV
      ? targetVelocityX
      : currentVelocityX + Math.sign(targetVelocityX - currentVelocityX) * deltaV;
    // Do not let knockback or a held horizontal key make the crouch sprite
    // slide across the ground. The defensive input must feel immediate.
    this.setVelocityX(crouchRequested ? 0 : nextVelocityX);
    if (Math.abs(moveX) > 0.08) this.facing = Math.sign(moveX);

    const aimX = actions.aimX ?? this.facing;
    const aimY = actions.aimY ?? 0;
    if (Math.abs(aimX) + Math.abs(aimY) > 0.08) {
      this.aim.set(aimX, aimY).normalize();
      if (Math.abs(aimX) > 0.08) this.facing = Math.sign(aimX);
    } else {
      this.aim.set(this.facing, 0);
    }

    if (time - this.jumpQueuedAt <= this.config.jumpBufferMs && time - this.lastGroundedAt <= this.config.coyoteMs) {
      this.setVelocityY(-this.config.jumpSpeed);
      this.jumpQueuedAt = -Infinity;
      this.lastGroundedAt = -Infinity;
      // State selection happens in this same tick. Do not reuse the pre-jump
      // grounded sample or a simultaneous DOWN input can select crouch for the
      // first airborne frame.
      grounded = false;
    }

    // Resolve posture before firing so simultaneous MOVE+FIRE uses the pose
    // and socket selected for this tick, never the stale idle socket.
    this.setFlipX(this.facing < 0);
    this.updateState(actions, grounded, time);
    // Round 3 has one authored crouch firing pose. Keep input aim, projectile,
    // baked animation and muzzle socket all forward while crouched.
    if (this.state === 'crouch' && ['shotgun', 'rocket'].includes(this.weaponSystem?.currentWeapon)) {
      this.aim.set(this.facing || 1, 0);
    }
    this.updateBodyPosture();
    const hurtLocked = time < (this.scene?.hurtPoseUntil ?? 0);
    if (actions.shootDown && !hurtLocked) this.weaponSystem?.tryFire(this, this.aim, time);
    if (actions.grenadePressed && !hurtLocked) this.weaponSystem?.throwGrenade(this, this.aim, time);
    updateContactShadow(this);
  }

  updateState(actions, grounded, time = this.scene.time.now) {
    let nextState;
    if (this.health <= 0) nextState = 'dead';
    else if (!grounded) nextState = this.body.velocity.y < 0 ? 'jump' : 'fall';
    else if (actions.crouch) {
      // Explicit posture input outranks the short hit-reaction posture lock.
      // Once the player has responded, clear the passive lock so releasing
      // DOWN is responsive as well instead of re-entering the pre-hit pose.
      nextState = 'crouch';
      this.hurtStateLock = null;
      this.hurtStateLockUntil = 0;
    }
    else if (time < this.hurtStateLockUntil && this.hurtStateLock) nextState = this.hurtStateLock;
    else if (Math.abs(this.body.velocity.x) > 10) nextState = 'run';
    else nextState = 'idle';
    this.setMotionState(nextState, time);
  }

  setMotionState(nextState, time = this.scene.time.now) {
    if (!nextState || this.state === nextState) return this.state;
    this.previousState = this.state;
    this.state = nextState;
    this.stateChangedAt = time;
    this.setData('motionTransition', {
      from: this.previousState,
      to: nextState,
      at: time,
    });
    return this.state;
  }

  postureTransition(time = this.scene.time.now) {
    const elapsedMs = Math.max(0, time - this.stateChangedAt);
    if (this.state === 'crouch' && this.previousState !== 'crouch' && elapsedMs < this.crouchEnterMs) {
      return { state: 'crouch-enter', from: this.previousState, to: 'crouch', elapsedMs, durationMs: this.crouchEnterMs };
    }
    if (this.previousState === 'crouch' && this.state !== 'crouch' && !['jump', 'fall', 'dead'].includes(this.state) && elapsedMs < this.crouchExitMs) {
      return { state: 'crouch-exit', from: 'crouch', to: this.state, elapsedMs, durationMs: this.crouchExitMs };
    }
    return null;
  }

  usesCrouchMuzzleSocket(time = this.scene.time.now) {
    const transition = this.postureTransition(time);
    if (!transition) return this.state === 'crouch';
    const progress = Phaser.Math.Clamp(transition.elapsedMs / Math.max(1, transition.durationMs), 0, 1);
    // The transition animations contain two discrete authored keyframes. Use
    // the socket belonging to the frame currently visible, rather than the
    // already-updated physics posture, so bullets never leave empty space.
    return transition.state === 'crouch-enter' ? progress >= 0.5 : progress < 0.5;
  }

  updateBodyPosture() {
    const crouching = this.state === 'crouch';
    const targetHeight = crouching ? this.crouchingBodyHeight : this.standingBody.height;
    const currentHeight = this.body.sourceHeight ?? this.body.height / Math.max(0.001, Math.abs(this.scaleY));
    if (Math.abs(currentHeight - targetHeight) < 0.5) return;
    const footY = this.body.bottom;
    this.body.setSize(this.standingBody.width, targetHeight, false);
    const offsetX = (this.frame.realWidth - this.standingBody.width) / 2;
    const offsetY = this.standingBody.bottom - targetHeight;
    // Keep the feet on the same physics baseline while lowering the head/body.
    this.body.setOffset(offsetX, offsetY);
    this.body.updateBounds();
    // setSize keeps the old body top until the next physics step. Move only
    // body.position by the exact height delta so the foot stays on the same
    // world baseline immediately; do not recenter the Sprite/GameObject.
    const baselineDelta = footY - this.body.bottom;
    this.body.position.y += baselineDelta;
    if (Number.isFinite(this.body.prev?.y)) this.body.prev.y += baselineDelta;
    if (Number.isFinite(this.body.prevFrame?.y)) this.body.prevFrame.y += baselineDelta;
    this.body.updateCenter?.();
  }

  specialWeaponAttachment(direction = this.aim, weaponId = this.weaponSystem?.currentWeapon ?? 'rifle') {
    if (!['shotgun', 'rocket'].includes(weaponId)) return null;
    const aim = new Phaser.Math.Vector2(
      Number.isFinite(direction?.x) ? direction.x : this.facing,
      Number.isFinite(direction?.y) ? direction.y : 0,
    );
    if (aim.lengthSq() < 0.001) aim.set(this.facing || 1, 0);
    aim.normalize();
    const facing = Math.abs(aim.x) > 0.08 ? Math.sign(aim.x) : this.facing || 1;
    let bucket = aim.y < -0.86 ? 'up' : aim.y < -0.12 ? 'diagonal' : 'forward';
    const crouchSocket = this.usesCrouchMuzzleSocket();
    const state = this.state === 'fall' ? 'fall' : this.state === 'jump' ? 'jump' : crouchSocket ? 'crouch' : this.state === 'run' ? 'run' : 'idle';
    if (state === 'crouch') { bucket = 'forward'; aim.set(facing, 0); }
    const grips = { forward: [211, 159], diagonal: [217, 108], up: [195, 84], crouch: [218, 251] };
    const muzzles = {
      shotgun: {
        forward: [352.081, 150.542], diagonal: [289.95, 25.769], up: [190.333, 6.405],
        'crouch-forward': [359.081, 242.542], 'crouch-diagonal': [290.95, 168.769], 'crouch-up': [212.021, 152.243],
      },
      rocket: {
        forward: [343.839, 145], diagonal: [282.659, 26.785], up: [187.4, 10.737],
        'crouch-forward': [350.839, 237], 'crouch-diagonal': [283.659, 169.785], 'crouch-up': [208.2, 158.415],
      },
    };
    const gripSource = state === 'crouch' ? grips.crouch : grips[bucket];
    const muzzleSource = muzzles[weaponId][state === 'crouch' ? `crouch-${bucket}` : bucket];
    const scaleX = this.displayWidth / 384;
    const scaleY = this.displayHeight / 384;
    const sourceToWorld = ([x, y]) => ({
      x: this.x + facing * (x - 192) * scaleX,
      y: this.y + (y - 192) * scaleY,
    });
    return {
      contract: 'baked-single-sprite-character-weapon-hand',
      runtimeOverlay: false,
      alphaFade: false,
      weaponId, state, bucket, facing,
      textureNamespace: `player-${weaponId}`,
      gripSourcePx: [...gripSource],
      muzzleSourcePx: [...muzzleSource],
      gripSocket: sourceToWorld(gripSource),
      handSocket: sourceToWorld(gripSource),
      muzzleSocket: sourceToWorld(muzzleSource),
      frameSize: [384, 384],
    };
  }

  muzzlePosition(direction = this.aim) {
    const weaponId = this.weaponSystem?.currentWeapon ?? 'rifle';
    const special = this.specialWeaponAttachment(direction, weaponId);
    if (special) return { ...special.muzzleSocket };
    const aimX = Number.isFinite(direction?.x) ? direction.x : this.facing;
    const aimY = Number.isFinite(direction?.y) ? direction.y : 0;
    const facing = Math.abs(aimX) > 0.08 ? Math.sign(aimX) : this.facing || 1;
    const bucket = aimY < -0.86 ? 'up' : aimY < -0.12 ? 'diagonal' : 'forward';
    const poseSockets = { forward: { x: 29, y: -14 }, diagonal: { x: 27, y: -40 }, up: { x: 0, y: -59 } };
    if (this.usesCrouchMuzzleSocket()) return { x: this.x + facing * 32, y: this.y + 19 };
    const socket = poseSockets[bucket];
    return { x: this.x + facing * socket.x, y: this.y + socket.y };
  }

  takeDamage(amount = 1, source = null) {
    const time = this.scene.time.now;
    if (!this.active || time < this.invulnerableUntil || this.health <= 0) return false;
    const grounded = this.body.blocked.down || this.body.touching.down;
    const stateBefore = this.state;
    const knockbackDirection = source?.x != null ? Math.sign(this.x - source.x || 1) : -this.facing;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableUntil = time + this.config.invulnerableMs;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.active && this.clearTint().setTint(this.config.tint ?? 0xf4e3bd));
    if (grounded && stateBefore !== 'crouch') {
      this.hurtStateLock = stateBefore === 'run' ? 'run' : 'idle';
      this.hurtStateLockUntil = time + 200;
    } else {
      // Crouch is already an explicit defensive response. Do not pin it with
      // passive hit-stun: release must remain responsive, and a held crouch
      // must not receive even one frame of horizontal knockback.
      this.hurtStateLock = null;
      this.hurtStateLockUntil = 0;
    }
    if (source?.x != null) {
      const knockbackSpeed = stateBefore === 'run' ? 175 : 140;
      this.setVelocityX(stateBefore === 'crouch' ? 0 : knockbackDirection * knockbackSpeed);
    }
    this.emit('damaged', { amount, health: this.health, source, stateBefore, grounded, knockbackDirection });
    if (this.health <= 0) this.die(source);
    return true;
  }

  heal(amount = 1) {
    const before = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    if (this.health > before) this.emit('healed', this.health - before);
    return this.health - before;
  }

  preDestroy() { destroyContactShadow(this); super.preDestroy(); }

  die(source = null) {
    this.setMotionState('dead');
    this.inputLocked = true;
    this.setVelocity(0, -180);
    this.emit('died', source);
  }
}

export default Player;
