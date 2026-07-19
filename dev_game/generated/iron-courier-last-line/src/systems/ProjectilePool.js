import Phaser from 'phaser';
import { Projectile } from '../entities/Projectile.js';

/** Pooled player/enemy ordnance plus collision routing. */
export class ProjectilePool extends Phaser.Events.EventEmitter {
  constructor(scene, options = {}) {
    super();
    this.scene = scene;
    this.maxSize = options.maxSize ?? 140;
    this.group = scene.physics.add.group({ maxSize: this.maxSize, runChildUpdate: false });
    this.targets = [];
    this.colliders = [];
  }

  acquire() {
    let projectile = this.group.getFirstDead(false);
    if (!projectile && this.group.getLength() < this.maxSize) {
      projectile = new Projectile(this.scene);
      this.group.add(projectile);
    }
    return projectile ?? null;
  }

  fire(x, y, direction, options = {}) {
    const projectile = this.acquire();
    if (!projectile) return null;
    projectile.fire(x, y, direction, options);
    this.emit('fired', projectile);
    return projectile;
  }

  explodeProjectile(projectile, reason = 'detonate') {
    if (!projectile?.active) return false;
    const { x, y, blastRadius, damage, faction } = projectile;
    if (blastRadius > 0) this.damageArea(x, y, blastRadius, damage, faction, projectile);
    projectile.expire(reason);
    return true;
  }

  /** Make projectiles detonate/expire when touching terrain or a physics layer. */
  collideWithTerrain(terrain, options = {}) {
    const collider = this.scene.physics.add.collider(this.group, terrain, (projectile) => {
      if (!projectile.active) return;
      // Timed grenades use Arcade's collision response to bounce/roll on the
      // deck and detonate when their fuse expires. Rockets and other explosive
      // ordnance retain immediate impact detonation.
      if (projectile.detonateOnTerrain === false) return;
      if (projectile.blastRadius > 0) this.explodeProjectile(projectile, 'terrain');
      else if (options.expire !== false) projectile.expire('terrain');
    }, options.processCallback ?? null, options.callbackContext ?? this);
    this.colliders.push(collider);
    return collider;
  }

  /** Register an Arcade group/entity as a damage target. faction is target faction. */
  registerTarget(target, faction, options = {}) {
    const entry = { target, faction, damageMethod: options.damageMethod ?? 'takeDamage', predicate: options.predicate ?? null };
    this.targets.push(entry);
    // Arcade reverses callback arguments for Group-vs-Sprite by internally
    // dispatching Sprite-vs-Group. Resolve by type so player/transport targets
    // receive enemy projectiles just as groups receive player projectiles.
    const collider = this.scene.physics.add.overlap(this.group, target, (first, second) => {
      const projectile = first instanceof Projectile ? first : second instanceof Projectile ? second : null;
      if (!projectile) return;
      const actor = projectile === first ? second : first;
      this.handleImpact(projectile, actor, entry);
    });
    this.colliders.push(collider);
    return entry;
  }

  handleImpact(projectile, actor, entry) {
    if (!projectile.active || !actor?.active || projectile.faction === entry.faction || actor === projectile.owner) return;
    if (entry.predicate && !entry.predicate(projectile, actor)) return;
    if (!projectile.registerHit(actor)) return;
    const method = actor[entry.damageMethod];
    if (typeof method === 'function') method.call(actor, projectile.damage, projectile);
    projectile.onImpact?.(projectile, actor);
    this.emit('impact', { projectile, target: actor, x: projectile.x, y: projectile.y, weaponId: projectile.weaponId, hitStopMs: projectile.hitStopMs, cameraShake: projectile.cameraShake });
    if (projectile.blastRadius > 0) this.damageArea(projectile.x, projectile.y, projectile.blastRadius, projectile.damage, projectile.faction, projectile, new Set([actor]));
    if (projectile.shouldExpireAfterHit()) projectile.expire('impact');
  }

  damageArea(x, y, radius, damage, sourceFaction, source = null, excluded = null) {
    // Explosive direct hits own their configured damage exactly once. The
    // direct actor is pre-seeded into `seen`, so splash can still reach nearby
    // actors without applying the same 58/72 points twice to the impact target.
    const seen = excluded instanceof Set ? new Set(excluded) : new Set(excluded ? [excluded] : []);
    this.targets.forEach(({ target, faction, damageMethod, predicate }) => {
      if (faction === sourceFaction) return;
      const actors = target.getChildren ? target.getChildren() : [target];
      actors.forEach((actor) => {
        if (!actor?.active || seen.has(actor) || Phaser.Math.Distance.Between(x, y, actor.x, actor.y) > radius) return;
        if (predicate && !predicate(source, actor)) return;
        seen.add(actor);
        actor[damageMethod]?.call(actor, damage, source);
      });
    });
    this.emit('blast', { x, y, radius, damage, sourceFaction, source, weaponId: source?.weaponId ?? null, hitStopMs: source?.hitStopMs ?? 0, cameraShake: source?.cameraShake ?? null });
  }

  update(time) {
    this.group.getChildren().forEach((projectile) => projectile.update(time));
  }

  clear() {
    this.group.getChildren().forEach((projectile) => projectile.expire('clear'));
  }

  destroy() {
    this.colliders.forEach((collider) => collider.destroy());
    this.clear();
    this.group.destroy(true);
    this.removeAllListeners();
  }
}

export default ProjectilePool;
