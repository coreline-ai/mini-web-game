import Phaser from 'phaser';

/** Applies rescue bonuses and owns overlap lifecycle. */
export class RescueSystem extends Phaser.Events.EventEmitter {
  constructor(scene, options = {}) {
    super();
    this.scene = scene;
    this.player = options.player ?? null;
    this.transport = options.transport ?? null;
    this.weaponSystem = options.weaponSystem ?? null;
    this.group = scene.physics.add.group();
    this.rescuedCount = 0;
    this.byType = { technician: 0, medic: 0, artillery: 0 };
    this.overlap = null;
    if (this.player) this.bindPlayer(this.player);
  }

  bindPlayer(player) {
    this.player = player;
    this.overlap?.destroy();
    this.overlap = this.scene.physics.add.overlap(player, this.group, (_player, target) => this.rescue(target));
    return this;
  }

  setTransport(transport) { this.transport = transport; return this; }
  add(target) { this.group.add(target); target.body?.setAllowGravity(false); target.setVelocity?.(0, 0); return target; }

  rescue(target) {
    if (!target?.active || target.rescued) return false;
    target.rescued = true;
    const type = target.rescueType ?? 'medic';
    this.rescuedCount += 1;
    this.byType[type] = (this.byType[type] ?? 0) + 1;
    const result = this.applyBonus(type, target);
    if (target.beginRescueSequence) target.beginRescueSequence();
    else target.disableBody(true, true);
    this.emit('rescued', { type, target, count: this.rescuedCount, result });
    return true;
  }

  applyBonus(type, target) {
    if (type === 'technician') {
      const repaired = this.transport?.repair?.(target.rescueEffect?.repairHp ?? 12) ?? 0;
      return { repaired };
    }
    if (type === 'medic') {
      const healed = this.player?.heal?.(target.rescueEffect?.healHp ?? 3) ?? 0;
      return { healed };
    }
    if (type === 'artillery') {
      const duration = target.rescueEffect?.durationMs ?? 6000;
      const interval = target.rescueEffect?.salvoEveryMs ?? 650;
      this.emit('artilleryRequested', { x: target.x, y: target.y, duration, interval, damage: target.rescueEffect?.damage ?? 3 });
      return { artilleryDuration: duration };
    }
    return {};
  }

  snapshot() { return { total: this.rescuedCount, byType: { ...this.byType } }; }
  destroy() { this.overlap?.destroy(); this.group.destroy(false); this.removeAllListeners(); }
}

export default RescueSystem;
