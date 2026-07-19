import Phaser from 'phaser';
import { animationKey } from '../systems/AnimationRegistry.js';
import { attachContactShadow, destroyContactShadow, updateContactShadow } from '../systems/ContactShadowSystem.js';

export class RescueTarget extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'medic', options = {}) {
    const normalizedType = type === 'engineer' ? 'technician' : type;
    super(scene, x, y, options.texture ?? `rescue-${normalizedType}`);
    scene.add.existing(this); scene.physics.add.existing(this);
    this.rescueType = normalizedType;
    this.rescueEffect = options.effect ?? {};
    this.scoreValue = options.score ?? 750;
    this.rescued = false;
    this.setTint(options.tint ?? 0xffffff);
    this.setDisplaySize(options.width ?? 34, options.height ?? 62);
    this.body.setAllowGravity(false).setImmovable(true);
    this.marker = scene.add.image(x, y - (options.height ?? 62) * 0.72, `ui-rescue-${this.rescueType}`).setDisplaySize(42, 42).setDepth(37);
    const idleKey = animationKey(`rescue-${this.rescueType}`, 'bound-idle');
    this.secondaryKey = animationKey(`rescue-${this.rescueType}`, this.rescueType === 'technician' ? 'struggle' : this.rescueType === 'medic' ? 'signal' : 'radio');
    if (scene.anims.exists(idleKey)) this.play(idleKey);
    const seed = Math.abs(Math.round(x) + [...this.rescueType].reduce((sum, char) => sum + char.charCodeAt(0), 0));
    this.secondaryTimer = scene.time.addEvent({
      delay: 1900 + (seed % 700), loop: true,
      callback: () => {
        if (!this.active || this.rescued || !scene.anims.exists(this.secondaryKey)) return;
        this.play(this.secondaryKey, true);
        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (animation) => {
          if (this.active && !this.rescued && animation?.key === this.secondaryKey && scene.anims.exists(idleKey)) this.play(idleKey, true);
        });
      },
    });
  }

  beginRescueSequence() {
    if (!this.active) return;
    this.secondaryTimer?.remove(false); this.secondaryTimer = null;
    if (this.body) { this.body.enable = false; this.setVelocity(0, 0); }
    if (this.marker?.active) this.scene.tweens.add({ targets: this.marker, alpha: 0, scaleX: this.marker.scaleX * 1.18, scaleY: this.marker.scaleY * 1.18, duration: 240, onComplete: () => this.marker?.destroy() });
    const family = `rescue-${this.rescueType}`;
    const freed = animationKey(family, 'freed');
    const ability = animationKey(family, 'ability');
    const exit = animationKey(family, 'exit');
    if (this.scene.anims.exists(freed)) this.play(freed, true);
    this.scene.time.delayedCall(260, () => {
      if (!this.active) return;
      if (this.scene.anims.exists(ability)) this.play(ability, true);
    });
    this.scene.time.delayedCall(760, () => {
      if (!this.active) return;
      if (this.scene.anims.exists(exit)) this.play(exit, true);
      this.scene.tweens.add({
        targets: this,
        x: this.x + 180,
        alpha: 0,
        duration: 900,
        ease: 'Sine.in',
        onComplete: () => this.disableBody(true, true),
      });
    });
  }

  preDestroy() { this.secondaryTimer?.remove(false); this.secondaryTimer = null; this.marker?.destroy(); this.marker = null; super.preDestroy(); }
}

export class ArmoredTransport extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y, options.texture ?? 'vehicle-actions');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.maxHealth = options.health ?? options.maxHp ?? 40;
    this.health = this.maxHealth;
    this.moveSpeed = options.moveSpeed ?? 62;
    this.faction = 'player';
    this.visualLockUntil = 0;
    this.visualState = '';
    // Trimmed 512x256 frame rendered with one uniform 0.801 scale. The
    // resulting opaque vehicle is ~360x175px and reads as a real APC beside
    // the 109px-tall courier instead of a vertically crushed toy.
    this.setTint(options.tint ?? 0x52735d).setDisplaySize(options.width ?? 426.7, options.height ?? 213.35);
    const scale = this.displayWidth / this.frame.realWidth;
    const bodyWidth = (options.bodyWidth ?? 330) / scale;
    const bodyHeight = (options.bodyHeight ?? 90) / scale;
    const visualBaseline = 244;
    this.body.setSize(bodyWidth, bodyHeight, false).setOffset((this.frame.realWidth - bodyWidth) / 2, visualBaseline - bodyHeight);
    this.body.updateBounds();
    this.body.updateFromGameObject();
    this.setData('atlasScaleContract', { mode: 'uniform-trimmed', frameWidth: 512, frameHeight: 256, displayWidth: this.displayWidth, displayHeight: this.displayHeight, bodyWidth: options.bodyWidth ?? 330, bodyHeight: options.bodyHeight ?? 90, baseline: visualBaseline });
    this.setCollideWorldBounds(true);
    this.playVisual('idle');
    this.visualBobBaseOrigin = { x: this.displayOriginX, y: this.displayOriginY };
    this.visualBobBaseBodyOffset = { x: this.body.offset.x, y: this.body.offset.y };
    this.wasDriving = false; this.settleStartedAt = 0; this.settleUntil = 0;
    attachContactShadow(this, 'atlas');
    this.setData('weightMotionContract', { driveBobRangePx: [1, 3], settleRangePx: [2, 4], settleDurationMs: 150 });
  }
  playVisual(state, force = false) { if (!force && this.scene.time.now < this.visualLockUntil) return; const key = animationKey('transport', state); if (!this.scene.anims.exists(key) || (!force && this.visualState === state)) return; this.visualState = state; this.play(key, !force); }
  applyVisualBob(bobPx = 0) {
    const scaleY = Math.max(0.001, Math.abs(this.scaleY));
    this.setDisplayOrigin(this.visualBobBaseOrigin.x, this.visualBobBaseOrigin.y - bobPx / scaleY);
    this.body.setOffset(this.visualBobBaseBodyOffset.x, this.visualBobBaseBodyOffset.y - bobPx / scaleY);
    // Moving Arcade bodies are integrated before Scene.update. Calling
    // updateFromGameObject() here would copy the previous sprite X back into
    // the body every frame and cancel EscortSystem velocity. Origin and offset
    // are compensated as a pair, so updateBounds() is sufficient while moving.
    this.body.updateBounds();
    this.setData('visualBobPx', bobPx);
  }
  updateVisualState(time = this.scene.time.now) {
    if (!this.active || this.health <= 0) { updateContactShadow(this); return; }
    const ratio = this.health / this.maxHealth;
    const driving = Math.abs(this.body?.velocity.x ?? 0) > 2;
    const state = ratio <= 0.25 ? 'critical' : ratio <= 0.55 ? 'damaged' : driving ? 'drive' : 'idle';
    this.playVisual(state);
    if (this.wasDriving && !driving) { this.settleStartedAt = time; this.settleUntil = time + 150; }
    this.wasDriving = driving;
    let bob = driving ? Math.sin(time * 0.012) * 1.25 : 0;
    if (!driving && time < this.settleUntil) {
      const p = Phaser.Math.Clamp((time - this.settleStartedAt) / 150, 0, 1);
      bob = Math.sin(p * Math.PI) * 3 * (1 - p * 0.35);
    }
    this.applyVisualBob(bob);
    updateContactShadow(this);
  }
  repair(amount) {
    const before = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.visualLockUntil = this.scene.time.now + 690;
    this.playVisual('repair', true);
    const repairKey = animationKey('transport', 'repair');
    const finish = (animation) => {
      if (animation?.key !== repairKey) return;
      this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
      if (!this.active || this.health <= 0) return;
      this.visualLockUntil = 0;
      this.updateVisualState();
    };
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
    return this.health - before;
  }
  takeDamage(amount, source) {
    this.health = Math.max(0, this.health - amount);
    const destroyed = this.health <= 0;
    this.visualLockUntil = this.scene.time.now + (destroyed ? 1580 : 180);
    this.playVisual(destroyed ? 'destroyed' : 'hit', true);
    if (destroyed) this.setVelocity(0, 0);
    this.emit('healthChanged', { health: this.health, maxHealth: this.maxHealth, source });
    if (destroyed) this.emit('destroyed', source);
    return true;
  }
  preDestroy() { destroyContactShadow(this); super.preDestroy(); }
}

export class DestructibleProp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y, options.texture ?? 'fuel-intact');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.maxHealth = options.health ?? options.hp ?? 3;
    this.health = this.maxHealth;
    this.blastRadius = options.blastRadius ?? options.radius ?? 120;
    this.blastDamage = options.blastDamage ?? options.damage ?? 3;
    this.chainDelay = options.chainDelay ?? 90;
    this.destroyed = false;
    this.damageTextures = options.damageTextures ?? [options.texture];
    this.setTint(options.tint ?? 0xa44f35).setDisplaySize(options.width ?? 40, options.height ?? 54);
    this.body.setImmovable(true);
    // The authored barrel/lock/power-cell silhouettes communicate that they
    // are shootable. Floating warning badges looked like unexplained pickups
    // and were easily hidden behind adjacent props, so no world-space marker
    // is attached to destructibles.
    this.interactionMarker = null;
    this.setData('interactionRole', 'pass-through-destructible-hazard');
    this.setData('interactionMarkerMode', 'none-authored-silhouette');
  }
  takeDamage(amount, source) {
    if (this.destroyed) return false;
    this.health -= amount;
    const ratio = Math.max(0, this.health / this.maxHealth);
    const index = ratio <= 0 ? Math.min(2, this.damageTextures.length - 1) : ratio <= 0.55 ? Math.min(1, this.damageTextures.length - 1) : 0;
    if (this.damageTextures[index]) this.setTexture(this.damageTextures[index]);
    if (this.health <= 0) this.emit('readyToDestroy', { prop: this, source });
    return true;
  }
  showDestroyed() { const key = this.damageTextures.at(-1); if (key) this.setTexture(key); if (this.body) this.body.enable = false; if (this.interactionMarker?.active) { this.scene.tweens.killTweensOf(this.interactionMarker); this.interactionMarker.destroy(); this.interactionMarker = null; } return this; }
  preDestroy() { if (this.interactionMarker) { this.scene.tweens.killTweensOf(this.interactionMarker); this.interactionMarker.destroy(); this.interactionMarker = null; } super.preDestroy(); }
}

export default { RescueTarget, ArmoredTransport, DestructibleProp };
