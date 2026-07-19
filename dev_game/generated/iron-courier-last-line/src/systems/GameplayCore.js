import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { RescueTarget, ArmoredTransport, DestructibleProp } from '../entities/WorldActors.js';
import { ProjectilePool } from './ProjectilePool.js';
import { WeaponSystem } from './WeaponSystem.js';
import { RescueSystem } from './RescueSystem.js';
import { EscortSystem } from './EscortSystem.js';
import { DestructionSystem } from './DestructionSystem.js';
import { EncounterSystem } from './EncounterSystem.js';

/**
 * Optional scene facade wiring all core systems together.
 * Scenes may use the lower-level systems directly when more control is needed.
 */
export class GameplayCore extends Phaser.Events.EventEmitter {
  constructor(scene, options = {}) {
    super();
    this.scene = scene;
    this.pool = new ProjectilePool(scene, options.projectiles);
    this.weapons = new WeaponSystem(scene, this.pool, options.weapons);
    const playerConfig = options.player ?? {};
    this.player = options.playerEntity ?? new Player(scene, playerConfig.x ?? 160, playerConfig.y ?? 360, { ...playerConfig, weaponSystem: this.weapons });
    this.player.setWeaponSystem(this.weapons);
    this.encounters = new EncounterSystem(scene, { player: this.player, weaponSystem: this.weapons, encounters: options.encounters, enemyGroup: options.enemyGroup });
    this.rescues = new RescueSystem(scene, { player: this.player, weaponSystem: this.weapons });
    this.destruction = new DestructionSystem(scene, { damageTargets: [this.encounters.enemyGroup, this.player] });
    this.transport = null;
    this.escort = null;
    this.colliders = [];
    this.terrains = [];
    this.contactCooldown = new WeakMap();

    this.pool.registerTarget(this.encounters.enemyGroup, 'enemy');
    this.pool.registerTarget(this.player, 'player');
    // Destructibles are created after GameplayCore construction. Registering
    // the still-empty StaticGroup here leaves Arcade overlap routing blind to
    // late-added props on some Phaser builds. Each prop is therefore wired to
    // the projectile pool at creation time (see createDestructible()).
    this.colliders.push(this.scene.physics.add.overlap(this.player, this.encounters.enemyGroup, (_player, enemy) => {
      const now = this.scene.time.now;
      if (!enemy.active || now < (this.contactCooldown.get(enemy) ?? 0)) return;
      this.contactCooldown.set(enemy, now + 700);
      this.player.takeDamage(enemy.contactDamage ?? enemy.config?.contactDamage ?? 1, enemy);
    }));
    this.forwardEvents();
  }

  forwardEvents() {
    this.encounters.on('encounterStarted', (e) => this.emit('encounterStarted', e));
    this.encounters.on('encounterComplete', (e) => this.emit('encounterComplete', e));
    this.encounters.on('allComplete', (e) => this.emit('allComplete', e));
    this.rescues.on('rescued', (e) => this.emit('rescued', e));
    this.rescues.on('artilleryRequested', (e) => this.emit('artilleryRequested', e));
    this.pool.on('blast', (e) => this.emit('blast', e));
    this.player.on('died', (source) => this.emit('playerDied', source));
  }

  bindTerrain(terrain) {
    const collisionLayers = terrain?.terrainLayers ?? terrain?.getCollisionLayers?.() ?? null;
    const ground = collisionLayers?.ground ?? terrain;
    const elevated = collisionLayers?.elevated ?? null;
    const elevatedProcess = collisionLayers?.elevatedProcess ?? null;
    const elevatedProjectileProcess = collisionLayers?.elevatedProjectileProcess ?? null;

    this.terrains.push({ source: terrain, ground, elevated, elevatedProcess, elevatedProjectileProcess });
    this.colliders.push(this.scene.physics.add.collider(this.player, ground));
    this.colliders.push(this.scene.physics.add.collider(this.encounters.enemyGroup, ground));
    if (this.transport) this.colliders.push(this.scene.physics.add.collider(this.transport, ground));
    this.pool.collideWithTerrain(ground);

    if (elevated) {
      this.colliders.push(this.scene.physics.add.collider(this.player, elevated, null, elevatedProcess));
      this.colliders.push(this.scene.physics.add.collider(this.encounters.enemyGroup, elevated, null, elevatedProcess));
      this.pool.collideWithTerrain(elevated, { processCallback: elevatedProjectileProcess });
    }
    return this;
  }

  createRescue(x, y, type = 'medic', options = {}) {
    return this.rescues.add(new RescueTarget(this.scene, x, y, type, options));
  }

  createTransport(x, y, options = {}) {
    this.transport = new ArmoredTransport(this.scene, x, y, options);
    this.rescues.setTransport(this.transport);
    this.pool.registerTarget(this.transport, 'player');
    this.destruction.addDamageTarget(this.transport);
    this.terrains.forEach(({ ground }) => this.colliders.push(this.scene.physics.add.collider(this.transport, ground)));
    return this.transport;
  }

  startEscort(options = {}) {
    if (!this.transport) throw new Error('GameplayCore.startEscort requires createTransport() first.');
    this.escort = new EscortSystem(this.scene, this.transport, { player: this.player, ...options });
    this.escort.on('completed', (e) => this.emit('escortCompleted', e));
    this.escort.on('failed', (e) => this.emit('escortFailed', e));
    this.escort.start();
    return this.escort;
  }

  createDestructible(x, y, options = {}) {
    const prop = this.destruction.register(new DestructibleProp(this.scene, x, y, options));
    this.pool.registerTarget(prop, 'neutral');
    return prop;
  }

  startEncounters(index = 0) { return this.encounters.begin(index); }
  spawnBoss(type, x, y, options = {}) { return this.encounters.spawnBoss(type, x, y, options); }

  update(time, delta, actions = null) {
    if (actions) this.player.handleActions(actions, time);
    this.pool.update(time);
    this.encounters.update(time, delta);
    this.escort?.update(time, delta);
    this.transport?.updateVisualState?.();
  }

  snapshot() {
    return {
      player: { health: this.player.health, maxHealth: this.player.maxHealth, state: this.player.state },
      weapons: this.weapons.snapshot(),
      rescues: this.rescues.snapshot(),
      escort: this.escort?.snapshot() ?? null,
      encounter: { index: this.encounters.currentIndex, complete: this.encounters.complete, score: this.encounters.score },
    };
  }

  destroy() {
    this.colliders.forEach((collider) => collider.destroy());
    this.pool.destroy();
    this.rescues.destroy();
    this.encounters.destroy();
    this.removeAllListeners();
  }
}

export default GameplayCore;
