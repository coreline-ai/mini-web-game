import Phaser from 'phaser';

export const DEFAULT_WEAPONS = Object.freeze({
  rifle: { cooldown: 120, speed: 820, damage: 1, spread: 0.025, pellets: 1, ammo: Infinity, tint: 0xfff0a3, width: 34, height: 12, hitboxWidth: 22, hitboxHeight: 7 },
  shotgun: { cooldown: 520, speed: 660, damage: 1.35, spread: 0.26, pellets: 6, ammo: 18, tint: 0xffc45d, width: 27, height: 14, hitboxWidth: 17, hitboxHeight: 8, lifespan: 720 },
  rocket: { cooldown: 720, speed: 470, damage: 4, spread: 0.01, pellets: 1, ammo: 8, tint: 0xff7654, width: 48, height: 24, hitboxWidth: 32, hitboxHeight: 15, blastRadius: 125, lifespan: 1700 },
  grenade: { cooldown: 620, speed: 480, throwVelocityX: 480, throwVelocityY: -420, damage: 4, spread: 0, pellets: 1, ammo: 5, tint: 0x9ed470, width: 34, height: 34, hitboxWidth: 22, hitboxHeight: 22, trail: false, blastRadius: 145, gravityY: 1100, lifespan: 1300, bounceX: 0.28, bounceY: 0.24, dragX: 300, detonateOnTerrain: false, minTravelDistance: 340, maxTravelDistance: 460, maxFuseExtensionMs: 700 },
});

export class WeaponSystem extends Phaser.Events.EventEmitter {
  constructor(scene, projectilePool, options = {}) {
    super();
    this.scene = scene;
    this.pool = projectilePool;
    this.weapons = Object.fromEntries(Object.entries(DEFAULT_WEAPONS).map(([id, cfg]) => {
      const external = options.weapons?.[id] ?? {};
      return [id, {
        ...cfg,
        ...external,
        cooldown: external.cooldown ?? external.fireRateMs ?? external.cooldownMs ?? cfg.cooldown,
        speed: external.speed ?? external.projectileSpeed ?? external.throwVelocityX ?? cfg.speed,
        lifespan: external.lifespan ?? external.projectileLifeMs ?? external.fuseMs ?? cfg.lifespan,
        spread: external.spread ?? (external.spreadDeg != null ? Phaser.Math.DegToRad(external.spreadDeg) : cfg.spread),
        blastRadius: external.blastRadius ?? external.splashRadius ?? cfg.blastRadius,
        gravityY: external.gravityY ?? (id === 'grenade' ? cfg.gravityY : 0),
        ammo: external.ammo ?? external.startingAmmo ?? cfg.ammo,
      }];
    }));
    this.currentWeapon = 'rifle';
    // Special weapons are acquired from authored route pickups. Keeping their
    // config ammo preloaded doubled the first reward (24 stored + 24 pickup)
    // and made a newly found shotgun show 48 rounds. Rifle/grenade retain
    // their own starting contracts; pickup weapons begin at zero.
    this.ammo = Object.fromEntries(Object.entries(this.weapons).map(([id, cfg]) => [id, id === 'rifle' || id === 'grenade' ? cfg.ammo : 0]));
    this.grenades = options.grenades ?? this.weapons.grenade.ammo;
    this.nextFireByOwner = new WeakMap();
    this.nextGrenadeByOwner = new WeakMap();
  }

  selectWeapon(id, ammo = null) {
    if (!this.weapons[id] || id === 'grenade') return false;
    this.currentWeapon = id;
    if (ammo != null) this.ammo[id] = Math.max(this.ammo[id] ?? 0, ammo);
    this.emit('weaponChanged', { id, ammo: this.ammo[id] });
    return true;
  }

  grantWeapon(id, ammo = null) {
    if (!this.weapons[id]) return false;
    const grant = ammo ?? this.weapons[id].ammo;
    this.ammo[id] = Number.isFinite(grant) ? (Number.isFinite(this.ammo[id]) ? this.ammo[id] + grant : grant) : Infinity;
    if (id !== 'grenade') this.selectWeapon(id);
    return true;
  }

  tryFire(owner, direction, time = this.scene.time.now, weaponId = this.currentWeapon) {
    const cfg = this.weapons[weaponId];
    if (!cfg || (this.ammo[weaponId] ?? 0) <= 0 || time < (this.nextFireByOwner.get(owner) ?? 0)) return false;
    this.nextFireByOwner.set(owner, time + cfg.cooldown);
    const aim = new Phaser.Math.Vector2(direction.x ?? 1, direction.y ?? 0).normalize();
    const muzzle = owner.muzzlePosition?.(aim) ?? { x: owner.x, y: owner.y };
    const spawnLead = Math.max(10, cfg.width * 0.55 + 5);
    const spawn = { x: muzzle.x + aim.x * spawnLead, y: muzzle.y + aim.y * spawnLead };
    const projectiles = [];
    for (let i = 0; i < cfg.pellets; i += 1) {
      const spread = cfg.pellets === 1 ? Phaser.Math.FloatBetween(-cfg.spread, cfg.spread) : Phaser.Math.Linear(-cfg.spread, cfg.spread, i / Math.max(1, cfg.pellets - 1));
      const projectile = this.pool.fire(spawn.x, spawn.y, aim.clone().rotate(spread), { ...cfg, owner, faction: owner.faction ?? 'player', weaponId });
      if (projectile) projectiles.push(projectile);
    }
    if (Number.isFinite(this.ammo[weaponId])) {
      this.ammo[weaponId] -= 1;
      if (this.ammo[weaponId] <= 0 && weaponId !== 'rifle') this.selectWeapon('rifle');
    }
    this.emit('fired', { owner, weaponId, ammo: this.ammo[weaponId], aim: { x: aim.x, y: aim.y }, muzzle, spawn, projectiles });
    return true;
  }

  throwGrenade(owner, direction, time = this.scene.time.now) {
    const cfg = this.weapons.grenade;
    if (this.grenades <= 0 || time < (this.nextGrenadeByOwner.get(owner) ?? 0)) return false;
    this.nextGrenadeByOwner.set(owner, time + cfg.cooldown);
    const requestedX = Number.isFinite(direction?.x) ? direction.x : owner.facing;
    const facing = Math.sign(Math.abs(requestedX) > 0.08 ? requestedX : owner.facing || 1) || 1;
    const highArc = (direction?.y ?? 0) < -0.45;
    const baseVelocityX = Math.abs(cfg.throwVelocityX ?? cfg.speed ?? 480);
    const baseVelocityY = cfg.throwVelocityY ?? -420;
    // A small run-speed contribution keeps the throw connected to the pose
    // without letting a sprint carry the grenade beyond the visible combat
    // window.
    const inheritedVelocityX = (owner.body?.velocity?.x ?? 0) * 0.14;
    const launchVelocity = new Phaser.Math.Vector2(
      facing * baseVelocityX * (highArc ? 0.78 : 1) + inheritedVelocityX,
      highArc ? Math.min(baseVelocityY * 1.24, -520) : baseVelocityY,
    );
    const aim = launchVelocity.clone().normalize();
    const muzzle = owner.muzzlePosition?.({ x: facing, y: highArc ? -0.55 : -0.2 }) ?? { x: owner.x, y: owner.y };
    const spawn = { x: muzzle.x + facing * 18, y: muzzle.y - 8 };
    const projectile = this.pool.fire(spawn.x, spawn.y, aim, {
      ...cfg,
      speed: launchVelocity.length(),
      owner,
      faction: owner.faction ?? 'player',
      weaponId: 'grenade',
      onExpire: (projectile, reason) => {
        if (reason === 'timeout') this.pool.damageArea(projectile.x, projectile.y, projectile.blastRadius, projectile.damage, projectile.faction, projectile);
      },
    });
    this.grenades -= 1;
    this.emit('grenadeThrown', {
      owner,
      projectile,
      grenades: this.grenades,
      muzzle,
      spawn,
      velocity: { x: launchVelocity.x, y: launchVelocity.y },
      highArc,
    });
    return true;
  }

  fireEnemyProjectile(owner, direction, overrides = {}) {
    const config = { speed: 330, damage: 1, lifespan: 2200, tint: 0xff7459, ...overrides, owner, faction: 'enemy' };
    const muzzle = owner.muzzlePosition?.(direction, config.weaponId) ?? { x: owner.x, y: owner.y - 8 };
    if (config.blastRadius > 0 && !config.onExpire) {
      config.onExpire = (projectile, reason) => {
        if (reason === 'timeout') this.pool.damageArea(projectile.x, projectile.y, projectile.blastRadius, projectile.damage, projectile.faction, projectile);
      };
    }
    const projectile = this.pool.fire(muzzle.x, muzzle.y, direction, config);
    if (projectile) this.emit('enemyFired', { owner, weaponId: config.weaponId, projectile, direction, muzzle });
    return projectile;
  }

  snapshot() { return { currentWeapon: this.currentWeapon, ammo: { ...this.ammo }, grenades: this.grenades }; }
}

export default WeaponSystem;
