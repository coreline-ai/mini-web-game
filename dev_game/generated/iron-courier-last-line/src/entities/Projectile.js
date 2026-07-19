import Phaser from 'phaser';

const DEFAULTS = {
  speed: 760,
  damage: 1,
  lifespan: 1300,
  gravityY: 0,
  pierce: 0,
  blastRadius: 0,
  knockback: 120,
  tint: 0xffd36a,
  width: 16,
  height: 6,
  hitboxWidth: 12,
  hitboxHeight: 5,
  trail: true,
  trailAlpha: 0.24,
};

// Visual dimensions describe the tightly cropped projectile art. Hitboxes stay
// deliberately smaller so improved readability never turns into an unfairly
// large damage area.
const PROJECTILE_PROFILES = Object.freeze({
  rifle: { width: 34, height: 12, hitboxWidth: 22, hitboxHeight: 7, trailAlpha: 0.24 },
  shotgun: { width: 27, height: 14, hitboxWidth: 17, hitboxHeight: 8, trailAlpha: 0.2 },
  rocket: { width: 48, height: 24, hitboxWidth: 32, hitboxHeight: 15, trailAlpha: 0.2 },
  grenade: { width: 34, height: 34, hitboxWidth: 22, hitboxHeight: 22, trail: false },
  enemyGrenade: { width: 36, height: 36, hitboxWidth: 22, hitboxHeight: 22, trail: false },
  'enemy-basic': { width: 38, height: 16, hitboxWidth: 20, hitboxHeight: 8, trailAlpha: 0.36 },
  'enemy-shield': { width: 38, height: 16, hitboxWidth: 20, hitboxHeight: 8, trailAlpha: 0.36 },
  'enemy-drone': { width: 38, height: 38, hitboxWidth: 22, hitboxHeight: 22, trailAlpha: 0.3 },
  'crane-burst': { width: 42, height: 18, hitboxWidth: 22, hitboxHeight: 9, trailAlpha: 0.34 },
  'crane-hook': { width: 56, height: 30, hitboxWidth: 34, hitboxHeight: 18, trailAlpha: 0.18 },
  'mole-cannon': { width: 52, height: 30, hitboxWidth: 32, hitboxHeight: 18, trailAlpha: 0.24 },
  'mole-missile': { width: 54, height: 31, hitboxWidth: 34, hitboxHeight: 19, trailAlpha: 0.24 },
  'mole-overdrive': { width: 42, height: 42, hitboxWidth: 24, hitboxHeight: 24, trailAlpha: 0.3 },
  artillery: { width: 52, height: 30, hitboxWidth: 32, hitboxHeight: 18, trailAlpha: 0.22 },
});

const PROJECTILE_TEXTURES = Object.freeze({
  rifle: 'projectile-rifle', shotgun: 'projectile-shotgun', rocket: 'projectile-rocket', grenade: 'projectile-grenade',
  enemyGrenade: 'projectile-enemy-grenade', 'enemy-basic': 'projectile-enemy-bolt', 'enemy-shield': 'projectile-shield-pistol',
  'enemy-drone': 'projectile-drone-pulse', 'crane-burst': 'projectile-crane-burst', 'crane-hook': 'projectile-crane-hook',
  'mole-cannon': 'projectile-mole-cannon', 'mole-missile': 'projectile-boss-missile', 'mole-overdrive': 'projectile-mole-overdrive',
  artillery: 'projectile-artillery-shell',
});

/** Reusable projectile owned by ProjectilePool. */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x = -100, y = -100) {
    super(scene, x, y, 'projectile-rifle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.trail = scene.add.image(-100, -100, 'projectile-rifle')
      .setActive(false).setVisible(false).setDepth(63).setBlendMode(Phaser.BlendModes.ADD);
    this.setActive(false).setVisible(false);
    this.body.enable = false;
    this.resetMetadata();
  }

  resetMetadata() {
    this.owner = null;
    this.faction = 'player';
    this.weaponId = 'rifle';
    this.damage = DEFAULTS.damage;
    this.blastRadius = 0;
    this.knockback = DEFAULTS.knockback;
    this.remainingPierce = 0;
    this.expiresAt = 0;
    this.onExpire = null;
    this.onImpact = null;
    this.hitTargets = new WeakSet();
    this.visualWidth = DEFAULTS.width;
    this.visualHeight = DEFAULTS.height;
    this.trailEnabled = false;
    this.trailActive = false;
    this.trailActivationDistance = 0;
    this.launchX = 0;
    this.launchY = 0;
    this.trailAlpha = DEFAULTS.trailAlpha;
    this.dodgeHint = null;
    this.hitStopMs = 0;
    this.cameraShake = null;
    this.impactSfx = null;
    this.impactVfx = null;
    this.detonateOnTerrain = true;
    this.minTravelDistance = 0;
    this.maxTravelDistance = Infinity;
    this.hardExpiresAt = 0;
  }

  fire(x, y, direction = { x: 1, y: 0 }, options = {}) {
    const weaponId = options.weaponId ?? 'rifle';
    const cfg = { ...DEFAULTS, ...(PROJECTILE_PROFILES[weaponId] ?? {}), ...options, weaponId };
    const vector = new Phaser.Math.Vector2(direction.x ?? 1, direction.y ?? 0);
    if (vector.lengthSq() === 0) vector.set(1, 0);
    vector.normalize();

    this.resetMetadata();
    this.owner = cfg.owner ?? null;
    this.faction = cfg.faction ?? 'player';
    this.weaponId = cfg.weaponId ?? 'rifle';
    this.damage = cfg.damage;
    this.blastRadius = cfg.blastRadius;
    this.knockback = cfg.knockback;
    this.remainingPierce = cfg.pierce;
    this.expiresAt = this.scene.time.now + cfg.lifespan;
    this.onExpire = cfg.onExpire ?? null;
    this.onImpact = cfg.onImpact ?? null;
    this.dodgeHint = cfg.dodgeHint ?? null;
    this.hitStopMs = cfg.hitStopMs ?? 0;
    this.cameraShake = cfg.cameraShake ? { ...cfg.cameraShake } : null;
    this.impactSfx = cfg.impactSfx ?? null;
    this.impactVfx = cfg.impactVfx ?? `impact-${this.weaponId}`;
    this.detonateOnTerrain = cfg.detonateOnTerrain !== false;
    this.minTravelDistance = Math.max(0, cfg.minTravelDistance ?? 0);
    this.maxTravelDistance = Math.max(this.minTravelDistance, cfg.maxTravelDistance ?? Infinity);
    this.hardExpiresAt = this.expiresAt + Math.max(0, cfg.maxFuseExtensionMs ?? 0);

    this.enableBody(true, x, y, true, true);
    this.setTexture(cfg.texture ?? PROJECTILE_TEXTURES[this.weaponId] ?? 'projectile-enemy-bolt');
    this.setTint(cfg.tint);
    this.setAlpha(1).setBlendMode(Phaser.BlendModes.NORMAL);
    this.setDisplaySize(cfg.width, cfg.height).setDepth(cfg.depth ?? 64);
    this.setAngle(Phaser.Math.RadToDeg(vector.angle()));
    this.body.setAllowGravity(cfg.gravityY !== 0);
    // Projectile configs express the desired *total* gravity. Arcade adds the
    // world's 1850px/s² gravity to Body.gravity, so assigning cfg.gravityY
    // directly previously doubled gravity and pulled grenades down almost at
    // the player's feet. Offset world gravity to preserve the authored arc.
    const worldGravityY = this.scene.physics.world.gravity?.y ?? 0;
    this.body.setGravityY(cfg.gravityY !== 0 ? cfg.gravityY - worldGravityY : 0);
    // Pooled projectiles must reset their material response every launch so a
    // reused grenade never lends bounce/drag to a rifle round.
    this.body.setBounce(cfg.bounceX ?? 0, cfg.bounceY ?? 0);
    this.body.setDragX(cfg.dragX ?? 0);
    // setDisplaySize changes the Sprite scale immediately, while Arcade Body
    // keeps its previous cached scale until preUpdate. Refresh that cache before
    // collision can run; otherwise a newly acquired 14x7 bolt owns a 512x512
    // body for its first physics step and is destroyed by the ground collider.
    this.body.updateBounds();
    const hitboxWidth = Math.min(cfg.width, cfg.hitboxWidth ?? cfg.width);
    const hitboxHeight = Math.min(cfg.height, cfg.hitboxHeight ?? cfg.height);
    const localHitboxWidth = this.frame.realWidth * hitboxWidth / Math.max(1, cfg.width);
    const localHitboxHeight = this.frame.realHeight * hitboxHeight / Math.max(1, cfg.height);
    this.body.setSize(localHitboxWidth, localHitboxHeight, true);
    this.body.updateBounds();
    this.body.reset(x, y);
    this.body.setVelocity(vector.x * cfg.speed, vector.y * cfg.speed);
    this.visualWidth = cfg.width;
    this.visualHeight = cfg.height;
    this.trailEnabled = cfg.trail !== false;
    this.trailActive = false;
    this.launchX = x; this.launchY = y;
    this.trailActivationDistance = cfg.trailActivationDistance ?? (this.faction === 'player' ? cfg.width * 1.15 : 0);
    this.trailAlpha = cfg.trailAlpha ?? (this.faction === 'enemy' ? 0.34 : 0.24);
    this.trail.setTexture(this.texture.key).setTint(cfg.tint)
      .setDisplaySize(cfg.width * 1.18, cfg.height * 1.12)
      .setDepth((cfg.depth ?? 64) - 1).setActive(false).setVisible(false);
    this.setData('readability', {
      visualWidth: cfg.width, visualHeight: cfg.height,
      hitboxWidth, hitboxHeight, trail: this.trailEnabled,
      dodgeHint: this.dodgeHint, hitStopMs: this.hitStopMs, cameraShake: this.cameraShake, impactVfx: this.impactVfx,
    });
    this.setData('dodgeHint', this.dodgeHint);
    this.syncTrail();
    return this;
  }

  syncTrail() {
    if (!this.trailEnabled || !this.trail) return;
    if (!this.trailActive) {
      const travelled = Math.hypot(this.x - this.launchX, this.y - this.launchY);
      if (travelled < this.trailActivationDistance) {
        this.trail.setActive(false).setVisible(false);
        return;
      }
      this.trailActive = true;
      this.trail.setActive(true).setVisible(true);
    }
    const velocity = this.body?.velocity;
    const speed = Math.hypot(velocity?.x ?? 0, velocity?.y ?? 0) || 1;
    const dx = (velocity?.x ?? 1) / speed;
    const dy = (velocity?.y ?? 0) / speed;
    const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    this.setAngle(angle);
    this.trail.setPosition(this.x - dx * this.visualWidth * 0.52, this.y - dy * this.visualWidth * 0.52)
      .setAngle(angle)
      .setAlpha(this.trailAlpha * (0.86 + Math.sin(this.scene.time.now * 0.018) * 0.14));
  }

  update(time) {
    if (!this.active) return;
    this.syncTrail();
    const bounds = this.scene.physics.world.bounds;
    const outside = this.x < bounds.left - 160 || this.x > bounds.right + 160 || this.y < bounds.top - 160 || this.y > bounds.bottom + 160;
    const horizontalTravel = Math.abs(this.x - this.launchX);
    if (Number.isFinite(this.maxTravelDistance) && horizontalTravel >= this.maxTravelDistance && Math.abs(this.body?.velocity?.x ?? 0) > 0) {
      this.body.setVelocityX(0);
    }
    if (time >= this.expiresAt && horizontalTravel < this.minTravelDistance && time < this.hardExpiresAt) {
      this.expiresAt = Math.min(this.hardExpiresAt, time + 100);
      return;
    }
    if (time >= this.expiresAt || outside) {
      this.expire('timeout');
    }
  }

  registerHit(target) {
    if (!target || this.hitTargets.has(target)) return false;
    this.hitTargets.add(target);
    this.remainingPierce -= 1;
    return true;
  }

  shouldExpireAfterHit() {
    return this.remainingPierce < 0;
  }

  expire(reason = 'impact') {
    if (!this.active) return;
    const callback = this.onExpire;
    this.emit('expired', { reason, weaponId: this.weaponId, faction: this.faction, x: this.x, y: this.y });
    this.disableBody(true, true);
    this.trailEnabled = false;
    this.trail?.setActive(false).setVisible(false).setPosition(-100, -100);
    this.body.setVelocity(0, 0);
    callback?.(this, reason);
    this.resetMetadata();
  }

  destroy(fromScene) {
    this.trail?.destroy();
    this.trail = null;
    super.destroy(fromScene);
  }
}

export default Projectile;
