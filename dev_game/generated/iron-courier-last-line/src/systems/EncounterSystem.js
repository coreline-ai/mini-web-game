import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy.js';
import { CraneMiniBoss } from '../entities/CraneMiniBoss.js';
import { IronMoleBoss } from '../entities/IronMoleBoss.js';
import { getEnemyConfig } from '../config/enemyConfig.js';

export const DEFAULT_ENCOUNTERS = Object.freeze([
  { id: 'shore', enemies: [{ role: 'basic', count: 3, x: 700, y: 420, spacing: 110 }] },
  { id: 'containers', enemies: [{ role: 'basic', count: 3, x: 900, y: 420 }, { role: 'shield', count: 1, x: 1240, y: 420 }] },
  { id: 'warehouse', enemies: [{ role: 'grenadier', count: 2, x: 1000, y: 330 }, { role: 'drone', count: 2, x: 1160, y: 230 }] },
  { id: 'crane', boss: 'crane', x: 1120, y: 350 },
  { id: 'bridge', enemies: [{ role: 'shield', count: 2, x: 1050, y: 420 }, { role: 'drone', count: 3, x: 1240, y: 220 }] },
  { id: 'iron-mole', boss: 'ironMole', x: 1180, y: 380 },
]);

/** Data-driven encounter progression. Each definition may contain enemies/boss/gate. */
export class EncounterSystem extends Phaser.Events.EventEmitter {
  constructor(scene, options = {}) {
    super();
    this.scene = scene;
    this.player = options.player ?? null;
    this.weaponSystem = options.weaponSystem ?? null;
    this.definitions = options.encounters ?? DEFAULT_ENCOUNTERS;
    this.enemyGroup = options.enemyGroup ?? scene.physics.add.group();
    this.bosses = [];
    this.currentIndex = -1;
    this.current = null;
    this.complete = false;
    this.score = 0;
    this.stuckTimeoutMs = options.stuckTimeoutMs ?? 1100;
    this.stuckMovementPx = options.stuckMovementPx ?? 4;
    this.commandVelocityThreshold = options.commandVelocityThreshold ?? 8;
    this.offscreenRearGraceMs = options.offscreenRearGraceMs ?? 1600;
    this.offscreenRearDistance = options.offscreenRearDistance ?? 760;
    this.gateProximity = options.gateProximity ?? 130;
    this.recoveryDistance = options.recoveryDistance ?? 390;
    this.recoveryCooldownMs = options.recoveryCooldownMs ?? 800;
    this.actorMonitors = new WeakMap();
    this.recoveryHistory = [];
    this.recoveryCount = 0;
  }

  setEncounters(definitions) { this.definitions = definitions; return this; }
  begin(index = 0, options = {}) {
    this.complete = false;
    this.currentIndex = index - 1;
    // Non-zero begin calls are explicit QA/preview jumps and retain their
    // historical immediate-spawn behaviour. Normal runtime progression waits
    // for each encounter's triggerX.
    return this.advance({ force: options.force ?? index > 0 });
  }

  advance({ force = false } = {}) {
    this.currentIndex += 1;
    if (this.currentIndex >= this.definitions.length) {
      this.complete = true; this.current = null; this.emit('allComplete', { score: this.score }); return false;
    }
    const definition = this.definitions[this.currentIndex];
    this.current = { definition, alive: 0, startedAt: null, spawned: [], pending: true };
    if (force || this.hasReachedTrigger(definition)) return this.activateCurrent();
    this.emit('encounterPending', { index: this.currentIndex, definition, current: this.current });
    return true;
  }

  hasReachedTrigger(definition = this.current?.definition) {
    const triggerX = definition?.triggerX;
    return !Number.isFinite(triggerX) || !this.player?.active || this.player.x >= triggerX;
  }

  activateCurrent(force = false) {
    if (!this.current || !this.current.pending) return false;
    const { definition } = this.current;
    if (!force && !this.hasReachedTrigger(definition)) return false;
    this.current.pending = false;
    this.current.startedAt = this.scene.time.now;
    definition.onStart?.(this, definition);
    const spawnEntries = Array.isArray(definition.enemies)
      ? definition.enemies
      : Object.entries(definition.enemies ?? {}).map(([role, count]) => ({ role, count }));
    spawnEntries.forEach((spawn, roleIndex) => {
      const count = spawn.count ?? 1;
      for (let i = 0; i < count; i += 1) {
        const role = spawn.role ?? 'basic';
        const productionConfig = getEnemyConfig(role) ?? {};
        const enemy = new Enemy(this.scene, (spawn.x ?? definition.spawnX ?? (definition.x ?? 80) + 620) + roleIndex * 110 + i * (spawn.spacing ?? 70), spawn.y ?? definition.spawnY ?? 420, role, { ...productionConfig, ...spawn.options, target: this.player, weaponSystem: this.weaponSystem });
        // Player and enemies share one combat plane. Previously enemies kept
        // depth 0 while the player used 40, so pass-through dressing rendered
        // in front of enemies but behind the player.
        enemy.setDepth(40);
        this.track(enemy);
        this.enemyGroup.add(enemy);
        if (enemy.config?.flying && enemy.body) enemy.body.setAllowGravity(false);
      }
    });
    if (definition.boss) this.spawnBoss(definition.boss, definition.x, definition.y, definition.options, true);
    this.emit('encounterStarted', { index: this.currentIndex, definition, current: this.current });
    return true;
  }

  track(actor) {
    this.current.alive += 1;
    this.current.spawned.push(actor);
    this.actorMonitors.set(actor, this.createActorMonitor(actor));
    actor.once('died', (event) => this.onActorDefeated(actor, event));
    return actor;
  }

  trackBoss(boss) {
    this.current.alive += 1; this.current.spawned.push(boss); this.bosses.push(boss);
    this.enemyGroup.add(boss);
    // Physics groups apply their defaults when adding a child and were
    // silently reverting boss bodies to immovable=false. Reassert the machine
    // contract after group insertion so terrain cannot displace the authored
    // track baseline or bury its muzzle/body below the arena.
    if (boss.body) boss.body.setAllowGravity(false).setImmovable(true);
    boss.once(boss instanceof IronMoleBoss ? 'defeated' : 'died', (event) => this.onActorDefeated(boss, event));
    return boss;
  }

  spawnBoss(type, x, y, options = {}, trackCurrent = Boolean(this.current)) {
    const isFinal = type === 'ironMole' || type === 'iron-mole';
    const boss = isFinal
      ? new IronMoleBoss(this.scene, x ?? 980, y ?? 390, { ...options, target: this.player, weaponSystem: this.weaponSystem })
      : new CraneMiniBoss(this.scene, x ?? 920, y ?? 370, { ...options, target: this.player, weaponSystem: this.weaponSystem });
    boss.setDepth(40);
    if (trackCurrent && this.current) return this.trackBoss(boss);
    this.bosses.push(boss);
    this.enemyGroup.add(boss);
    if (boss.body) boss.body.setAllowGravity(false).setImmovable(true);
    const deathEvent = isFinal ? 'defeated' : 'died';
    boss.once(deathEvent, (event = {}) => {
      this.score += event.score ?? boss.scoreValue ?? 0;
      this.emit('actorDefeated', { actor: boss, score: this.score, remaining: this.current?.alive ?? 0 });
    });
    return boss;
  }

  onActorDefeated(actor, event = {}) {
    if (!this.current) return;
    this.actorMonitors.delete(actor);
    this.current.alive = Math.max(0, this.current.alive - 1);
    this.score += event.score ?? actor.scoreValue ?? 0;
    this.emit('actorDefeated', { actor, score: this.score, remaining: this.current.alive });
  }

  update(time, delta) {
    this.enemyGroup.getChildren().forEach((enemy) => {
      if (enemy instanceof Enemy) enemy.update(time, delta);
    });
    this.bosses.forEach((boss) => boss.update(time, delta));
    if (!this.current || this.complete) return;
    if (this.current.pending) {
      this.activateCurrent();
      return;
    }
    this.monitorCurrentEnemies(time);
    const gatePassed = this.current.definition.gate ? this.current.definition.gate(this, this.current) : true;
    const minDurationPassed = time - this.current.startedAt >= (this.current.definition.minDuration ?? 0);
    if (this.current.alive === 0 && gatePassed && minDurationPassed) {
      const finished = this.current;
      finished.definition.onComplete?.(this, finished);
      this.emit('encounterComplete', { index: this.currentIndex, definition: finished.definition });
      this.advance();
    }
  }

  createActorMonitor(actor) {
    return {
      anchorX: actor.x,
      anchorY: actor.y,
      // The Scene clock can jump between create() and the first physics update.
      // Initialize against the first real update time to avoid recovering every
      // freshly spawned actor before it has had a frame in which to move.
      anchorAt: null,
      offscreenRearSince: null,
      lastRecoveryAt: Number.NEGATIVE_INFINITY,
      lastRecoveryReason: null,
      recoveryCount: 0,
      stuckForMs: 0,
      offscreenRearForMs: 0,
    };
  }

  monitorCurrentEnemies(time) {
    for (const actor of this.current.spawned) {
      // Bosses deliberately have arena-specific movement and defeat events.
      // Recovery is restricted to ordinary Enemy actors so boss phase and
      // encounter completion accounting can never be bypassed here.
      if (!(actor instanceof Enemy) || !actor.active || actor.health <= 0) continue;
      const monitor = this.actorMonitors.get(actor) ?? this.createActorMonitor(actor);
      this.actorMonitors.set(actor, monitor);
      const commandedVelocityX = actor.body?.velocity?.x ?? 0;
      const commanded = Math.abs(commandedVelocityX) >= this.commandVelocityThreshold;
      const movedFromAnchor = Math.hypot(actor.x - monitor.anchorX, actor.y - monitor.anchorY);

      if (!Number.isFinite(monitor.anchorAt)) {
        monitor.anchorX = actor.x;
        monitor.anchorY = actor.y;
        monitor.anchorAt = time;
        monitor.stuckForMs = 0;
      }

      if (!commanded || movedFromAnchor >= this.stuckMovementPx) {
        monitor.anchorX = actor.x;
        monitor.anchorY = actor.y;
        monitor.anchorAt = time;
        monitor.stuckForMs = 0;
      } else {
        monitor.stuckForMs = Math.max(0, time - monitor.anchorAt);
      }

      const offscreenRear = this.isOffscreenRearGateBlocker(actor);
      if (offscreenRear) {
        monitor.offscreenRearSince ??= time;
        monitor.offscreenRearForMs = Math.max(0, time - monitor.offscreenRearSince);
      } else {
        monitor.offscreenRearSince = null;
        monitor.offscreenRearForMs = 0;
      }

      const cooldownPassed = time - monitor.lastRecoveryAt >= this.recoveryCooldownMs;
      if (cooldownPassed && commanded && monitor.stuckForMs >= this.stuckTimeoutMs) {
        this.recoverActor(actor, monitor, 'commanded-stuck', time);
      } else if (cooldownPassed && monitor.offscreenRearForMs >= this.offscreenRearGraceMs) {
        this.recoverActor(actor, monitor, 'offscreen-rear', time);
      }
    }
  }

  isOffscreenRearGateBlocker(actor) {
    const gateX = this.current?.definition?.gateX;
    if (!Number.isFinite(gateX) || !this.player?.active) return false;
    if (this.player.x < gateX - this.gateProximity) return false;
    if (actor.x >= this.player.x - this.offscreenRearDistance) return false;
    const camera = this.scene.cameras?.main;
    const cameraLeft = camera?.worldView?.x ?? camera?.scrollX ?? this.player.x - 640;
    const actorRight = actor.getBounds?.().right ?? actor.x;
    return actorRight < cameraLeft - 24;
  }

  recoverActor(actor, monitor, reason, time) {
    if (!(actor instanceof Enemy) || !actor.active || actor.health <= 0 || !this.player?.active) return false;
    const directionFromPlayer = actor.x < this.player.x ? -1 : 1;
    const gateX = this.current?.definition?.gateX;
    const actorIndex = Math.max(0, this.current?.spawned?.indexOf(actor) ?? 0);
    const recoveryGap = this.recoveryDistance + (actorIndex % 3) * 72;
    let recoveryX = this.player.x + directionFromPlayer * recoveryGap;
    // Keep a rear survivor on the combat side of the gate rather than moving it
    // past the progression boundary.
    if (directionFromPlayer < 0 && Number.isFinite(gateX)) recoveryX = Math.min(recoveryX, gateX - 96);
    const bounds = this.scene.physics?.world?.bounds;
    const minX = (bounds?.x ?? 0) + 48;
    const maxX = (bounds?.right ?? ((bounds?.x ?? 0) + (bounds?.width ?? 16800))) - 48;
    recoveryX = Phaser.Math.Clamp(recoveryX, minX, maxX);

    const before = { x: actor.x, y: actor.y, health: actor.health };
    if (actor.body?.reset) actor.body.reset(recoveryX, actor.y);
    else actor.setPosition(recoveryX, actor.y);
    const directionToPlayer = Math.sign(this.player.x - actor.x) || 1;
    actor.setVelocityX(directionToPlayer * actor.config.speed);

    monitor.anchorX = actor.x;
    monitor.anchorY = actor.y;
    monitor.anchorAt = time;
    monitor.offscreenRearSince = null;
    monitor.offscreenRearForMs = 0;
    monitor.stuckForMs = 0;
    monitor.lastRecoveryAt = time;
    monitor.lastRecoveryReason = reason;
    monitor.recoveryCount += 1;
    this.recoveryCount += 1;
    const event = {
      actor,
      role: actor.role,
      reason,
      before,
      after: { x: actor.x, y: actor.y, health: actor.health },
      recoveryCount: monitor.recoveryCount,
      encounterId: this.current?.definition?.id ?? null,
    };
    this.recoveryHistory.push({
      role: event.role,
      reason,
      beforeX: before.x,
      afterX: actor.x,
      healthBefore: before.health,
      healthAfter: actor.health,
      encounterId: event.encounterId,
      at: time,
    });
    if (this.recoveryHistory.length > 20) this.recoveryHistory.shift();
    this.emit('actorRecovered', event);
    return true;
  }

  snapshot() {
    const now = this.scene.time.now;
    const remainingActors = (this.current?.spawned ?? []).filter((actor) => actor.active && actor.health > 0);
    const ordinaryEnemies = remainingActors.filter((actor) => actor instanceof Enemy);
    const actorStates = ordinaryEnemies.map((actor) => {
      const monitor = this.actorMonitors.get(actor);
      const delta = this.player?.active ? actor.x - this.player.x : 0;
      return {
        role: actor.role,
        x: actor.x,
        y: actor.y,
        health: actor.health,
        state: actor.state,
        directionFromPlayer: delta < 0 ? 'backward' : delta > 0 ? 'forward' : 'same',
        distanceFromPlayer: Math.abs(delta),
        commandedVelocityX: actor.body?.velocity?.x ?? 0,
        stuckForMs: monitor?.stuckForMs ?? 0,
        offscreenRearForMs: monitor?.offscreenRearForMs ?? 0,
        recoveryCount: monitor?.recoveryCount ?? 0,
        lastRecoveryReason: monitor?.lastRecoveryReason ?? null,
      };
    });
    const nearest = actorStates.reduce((best, actor) => !best || actor.distanceFromPlayer < best.distanceFromPlayer ? actor : best, null);
    const rear = actorStates.filter((actor) => actor.directionFromPlayer === 'backward');
    const stuck = actorStates.filter((actor) => actor.stuckForMs >= this.stuckTimeoutMs);
    const offscreenRear = actorStates.filter((actor) => actor.offscreenRearForMs > 0);
    const gateX = this.current?.definition?.gateX ?? null;
    const externalGatePassed = this.current?.definition?.gate ? Boolean(this.current.definition.gate(this, this.current)) : true;
    const pending = Boolean(this.current?.pending);
    return {
      index: this.currentIndex,
      id: this.current?.definition?.id ?? null,
      complete: this.complete,
      alive: this.current?.alive ?? 0,
      remainingCount: remainingActors.length,
      pending,
      triggerX: this.current?.definition?.triggerX ?? null,
      gateX,
      gateLocked: Boolean(this.current && !pending && (this.current.alive > 0 || !externalGatePassed)),
      lockReason: !this.current ? null : pending ? 'awaiting-trigger' : this.current.alive > 0 ? 'remaining-enemies' : !externalGatePassed ? 'external-gate' : null,
      remainingDirection: nearest?.directionFromPlayer ?? null,
      remainingDistance: nearest?.distanceFromPlayer ?? null,
      rearSurvivorCount: rear.length,
      stuckActorCount: stuck.length,
      offscreenRearCount: offscreenRear.length,
      recoveryCount: this.recoveryCount,
      actorStates,
      recoveryHistory: this.recoveryHistory.map((entry) => ({ ...entry, ageMs: Math.max(0, now - entry.at) })),
      score: this.score,
    };
  }

  destroy() {
    this.enemyGroup.getChildren().forEach((enemy) => enemy.destroy());
    this.bosses.forEach((boss) => boss.destroy());
    this.recoveryHistory.length = 0;
    this.removeAllListeners();
  }
}

export default EncounterSystem;
