import Phaser from 'phaser';

/** Chain-reaction manager for barrels, cranes, containers and bridge props. */
export class DestructionSystem extends Phaser.Events.EventEmitter {
  constructor(scene, options = {}) {
    super();
    this.scene = scene;
    this.props = scene.physics.add.staticGroup();
    this.damageTargets = options.damageTargets ?? [];
  }

  addDamageTarget(target) { this.damageTargets.push(target); return this; }

  register(prop) {
    this.props.add(prop);
    prop.setData?.('_spawnY', prop.y);
    // A Physics Sprite added to a StaticGroup can retain the dynamic body's
    // gravity/movement flags. Re-assert the runtime contract after ownership
    // transfer so props never fall out of the stage during long sessions.
    if (prop.body) {
      prop.body.setAllowGravity(false);
      prop.body.setVelocity(0, 0);
      prop.body.setImmovable(true);
      prop.body.moves = false;
    }
    prop.once('readyToDestroy', ({ source }) => this.detonate(prop, source));
    return prop;
  }

  detonate(prop, source = null) {
    if (!prop?.active || prop.destroyed) return false;
    prop.destroyed = true;
    const { x, y, blastRadius: radius, blastDamage: damage } = prop;
    this.emit('detonated', { prop, x, y, radius, damage, source });
    prop.showDestroyed?.();
    this.scene.time.delayedCall(180, () => prop.active && prop.disableBody(true, true));

    this.damageTargets.forEach((target) => {
      const actors = target.getChildren ? target.getChildren() : [target];
      actors.forEach((actor) => {
        if (actor?.active && Phaser.Math.Distance.Between(x, y, actor.x, actor.y) <= radius) actor.takeDamage?.(damage, prop);
      });
    });

    this.props.getChildren().forEach((other) => {
      if (!other.active || other.destroyed || other === prop) return;
      if (Phaser.Math.Distance.Between(x, y, other.x, other.y) <= radius) {
        this.scene.time.delayedCall(other.chainDelay ?? 90, () => other.takeDamage(other.health, prop));
      }
    });
    return true;
  }
}

export default DestructionSystem;
