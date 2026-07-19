import Phaser from 'phaser';
import { animationKey } from '../systems/AnimationRegistry.js';
import { attachContactShadow, destroyContactShadow, updateContactShadow } from '../systems/ContactShadowSystem.js';

export class CraneMiniBoss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y, options.texture ?? 'boss-crane-actions');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.maxHealth = options.health ?? options.maxHp ?? 38;
    this.health = this.maxHealth;
    this.faction = 'enemy';
    this.weaponSystem = options.weaponSystem ?? null;
    this.target = options.target ?? null;
    this.state = 'intro';
    this.nextAttackAt = scene.time.now + 1000;
    this.attackIndex = 0;
    this.scoreValue = options.score ?? 1200;
    this.contactDamage = options.contactDamage ?? 2;
    this.baseTint = options.tint ?? 0xd89632;
    this.nextStaggerVisualAt = 0; this.nextRecoilAt = 0;
    this.baseX = x; this.baseY = y; this.deathEventSent = false;
    this.setTint(this.baseTint).setDisplaySize(options.width ?? 178, options.height ?? 138);
    const bodyWidth = this.frame.realWidth * 0.78;
    const bodyHeight = this.frame.realHeight * 0.64;
    // Machine art is packed to an explicit 496px track baseline. Keep both
    // the visible track and solid body on that baseline.
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
    this.visualState = '';
    this.visualLockUntil = 0;
    this.playState('idle');
    this.machineBobBaseOrigin = { x: this.displayOriginX, y: this.displayOriginY };
    this.machineBobBaseBodyOffset = { x: this.body.offset.x, y: this.body.offset.y };
    attachContactShadow(this, 'crane');
    this.setData('weightMotionContract', { idleBobRangePx: [1, 3], attackSettlePx: [2, 4] });
  }

  setTarget(target) { this.target = target; return this; }
  setWeaponSystem(system) { this.weaponSystem = system; return this; }
  muzzlePosition(direction = null, weaponId = '') {
    const facing = Math.sign(direction?.x ?? (this.flipX ? -1 : 1)) || 1;
    const socket = weaponId === 'crane-hook' ? { x: 0.37, y: 0.12 } : { x: 0.31, y: -0.14 };
    return { x: this.x + facing * this.displayWidth * socket.x, y: this.y + this.displayHeight * socket.y };
  }
  playState(state, force = false) { if (!force && this.scene.time.now < this.visualLockUntil) return; const key = animationKey('boss-crane', state); if (!this.scene.anims.exists(key) || (!force && this.visualState === state)) return; this.visualState = state; this.play(key, !force); }

  updateMachineWeight(time) {
    const attacking = ['burst', 'hook-launch', 'hook-return'].includes(this.visualState);
    const bob = Math.sin(time * (attacking ? 0.020 : 0.0065)) * (attacking ? 1.8 : 0.75);
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
    if (time >= this.visualLockUntil && !['idle', 'damaged'].includes(this.visualState)) this.playState(this.health / this.maxHealth <= 0.5 ? 'damaged' : 'idle', true);
    if (time < this.nextAttackAt) return;
    const direction = new Phaser.Math.Vector2(this.target.x - this.x, this.target.y - this.y).normalize();
    const burst = this.attackIndex++ % 2 === 0;
    const duration = burst ? 520 : 620;
    const commitMarginMs = 140;
    this.nextAttackAt = time + duration + commitMarginMs + (burst ? 1350 : 1900);
    this.emit('attackTelegraph', { kind: burst ? 'burst' : 'hook', duration });
    // Keep a short commit margin after the visible warning. Under heavy WebGL
    // frames Phaser timers can commit about 100ms ahead of scene-time probes;
    // the projectile must still never precede the authored warning window.
    this.scene.time.delayedCall(duration + commitMarginMs, () => {
      if (!this.active || this.health <= 0 || this.state !== 'combat') return;
      if (burst) {
        this.visualLockUntil = this.scene.time.now + 240; this.playState('burst', true);
        for (let i = -1; i <= 1; i += 1) {
          const spread = direction.clone().rotate(i * 0.17);
          this.weaponSystem?.fireEnemyProjectile(this, spread, { weaponId: 'crane-burst', speed: 350, damage: 1, tint: 0xff8b45 });
        }
      } else {
        this.visualLockUntil = this.scene.time.now + 320; this.playState('hook-launch', true);
        this.weaponSystem?.fireEnemyProjectile(this, direction, { weaponId: 'crane-hook', speed: 240, damage: 2, lifespan: 2500, tint: 0xe9b759 });
        this.scene.time.delayedCall(260, () => { if (!this.active || this.health <= 0 || this.state !== 'combat') return; this.visualLockUntil = this.scene.time.now + 260; this.playState('hook-return', true); });
      }
    });
  }

  takeDamage(amount = 1, source = null) {
    if (!this.active || this.health <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    const now = this.scene.time.now;
    // Preserve panel detail under automatic fire; a warm material pulse reads
    // as impact without replacing the boss with a full-white silhouette.
    this.setTint(0xffd3a1);
    this.scene.time.delayedCall(42, () => this.active && this.health > 0 && this.setTint(this.baseTint));
    const weaponId = source?.weaponId ?? 'rifle';
    const recoilPx = weaponId === 'shotgun' ? 8 : weaponId === 'rocket' ? 18 : weaponId === 'grenade' ? 20 : 3;
    this.emit('damaged', { boss: this, amount, health: this.health, source, weaponId, hitPoint: { x: source?.x ?? this.x, y: source?.y ?? this.y }, recoilPx });
    this.emit('healthChanged', { health: this.health, maxHealth: this.maxHealth, source });
    if (this.health <= 0) { this.die(source); return true; }
    if (now >= this.nextRecoilAt) {
      this.nextRecoilAt = now + (weaponId === 'shotgun' ? 90 : 55);
      const direction = Math.sign(this.x - (source?.x ?? this.x - 1)) || 1;
      this.scene.tweens.add({ targets: this, x: this.x + direction * recoilPx, duration: 58, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { if (this.active && this.health > 0) this.baseX = this.x; } });
    }
    if (this.health / this.maxHealth <= 0.5) {
      if (this.visualState !== 'damaged') { this.visualLockUntil = now + 180; this.playState('damaged', true); }
    } else if (now >= this.nextStaggerVisualAt) {
      const heavy = (source?.blastRadius ?? 0) > 0 || ['shotgun', 'rocket', 'grenade'].includes(source?.weaponId);
      this.nextStaggerVisualAt = now + (heavy ? 420 : 850);
      this.visualLockUntil = now + 180;
      this.playState('stagger', true);
    }
    return true;
  }

  die(source) {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.scene.tweens.killTweensOf(this);
    this.setVelocity(0, 0); if (this.body) this.body.enable = false; this.playState('death', true);
    this.emit('deathStarted', { boss: this, score: this.scoreValue, source, eventDelayMs: 1650, hideDelayMs: 3200 });
    this.scene.time.delayedCall(1650, () => {
      if (!this.active || this.deathEventSent) return;
      this.deathEventSent = true;
      this.emit('died', { boss: this, score: this.scoreValue, source });
    });
    this.scene.time.delayedCall(3200, () => this.active && this.disableBody(true, true));
  }

  preDestroy() { destroyContactShadow(this); super.preDestroy(); }

}

export default CraneMiniBoss;
