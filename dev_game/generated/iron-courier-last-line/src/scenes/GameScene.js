import Phaser from 'phaser';
import { ASSETS, COLORS, GROUND_Y, H, SCENES, W } from '../constants.js';
import { GAME_CONFIG, PLAYER_CONFIG } from '../config/gameConfig.js';
import { WEAPON_CONFIG } from '../config/weaponConfig.js';
import { STAGE_CONFIG, getSegmentAtX } from '../config/stageConfig.js';
import { BOSS_CONFIG } from '../config/bossConfig.js';
import { BackgroundLayerSystem, EnvironmentPropSystem, GameplayCore, TerrainArtSystem } from '../systems/index.js';
import MobileControls from '../MobileControls.js';
import { label, panel as panelFrame, resizePanel } from '../ui.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import { Audio } from '../audio.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { animationKey } from '../systems/AnimationRegistry.js';

const WORLD_W = STAGE_CONFIG.world.width;
const DESTRUCTIBLE_XS = Object.freeze([1100, 1180, 2680, 2760, 4860, 6700, 9000, 11500, 11600, 12720, 13600]);

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  init(data = {}) { this.startMode = data.mode === 'continue' ? 'continue' : 'new'; }

  create() {
    this.ended = false; this.elapsedMs = 0; this.score = 0; this.stageName = '해안 진입'; this.lastPlayerState = ''; this.nextMeleeAt = 0; this.recoilUntil = 0; this.recoilVisualState = 'shoot-forward'; this.grenadePoseUntil = 0; this.meleePoseUntil = 0; this.hurtPoseUntil = 0; this.hurtStartedAt = 0; this.hurtDirection = 0; this.hurtStateBefore = 'idle';
    this.deathResumeSaved = false; this.suppressNextCheckpointSave = false;
    this.specialWeaponAim = new Phaser.Math.Vector2(1, 0); this.specialWeaponAimWeapon = null;
    this.hitStopUntil = 0; this.hitStopTimer = null; this.bossDeathPresentationUntil = 0; this.bossDeathSequenceStarted = new WeakSet(); this.bossImpactThrottle = new WeakMap();
    this.transientVfx = new Set(); this.nextTransportDamageVfxAt = 0; this.nextTransportDustAt = 0; this.scenarioTutorialShown = new Set();
    this.physics.world.setBounds(0, 0, WORLD_W, H);
    this.cameras.main.setBounds(0, 0, WORLD_W, H);
    this.createBackdrop();
    this.createTerrain();
    this.createCore();
    this.createWorldContent();
    this.createHud();
    this.createInput();
    this.bindEvents();
    const checkpoint = this.startMode === 'continue' ? SaveSystem.getContinue() : null;
    this.suppressNextCheckpointSave = checkpoint?.resumeKind === 'death';
    if (checkpoint) this.applyCheckpoint(checkpoint);
    Audio.playMusic(this, 'music-stage', 0.2);
    this.core.startEncounters(checkpoint?.encounterIndex ?? 0);
    if (checkpoint?.resumeKind === 'death') this.restoreEncounterProgress(checkpoint);
    if (checkpoint) {
      const resumeLabel = checkpoint.resumeKind === 'death' ? '전투 위치 복귀' : '체크포인트 복귀';
      this.time.delayedCall(260, () => !this.ended && this.callout(`${resumeLabel} · ${checkpoint.segmentName}`, COLORS.cyan, 1200));
    }

    // Phaser subtracts followOffset from the target. A negative offset keeps a
    // right-moving player left of centre and exposes the combat space ahead.
    this.cameraLeadDirection = 1;
    this.cameraFollowOffsetX = -this.cameras.main.width * GAME_CONFIG.camera.forwardLookRatio;
    this.cameras.main.startFollow(this.core.player, true, 0.085, 0.12, this.cameraFollowOffsetX, 35);
    this.cameras.main.setDeadzone(330, 190);
    this.visibilityHandler = () => { if (document.hidden && !this.ended) this.openPause(); };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.applyControlVisibility());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.installDebugHook();
  }

  pickupKey(pickup) { return `${pickup.x}:${pickup.weaponId}`; }

  applyCheckpoint(checkpoint) {
    const encounterIndex = Phaser.Math.Clamp(Math.floor(checkpoint.encounterIndex ?? 0), 0, STAGE_CONFIG.segments.length - 1);
    const segment = STAGE_CONFIG.segments[encounterIndex] ?? STAGE_CONFIG.segments[0];
    const checkpointX = Phaser.Math.Clamp(checkpoint.checkpointX ?? segment.checkpointX, 80, WORLD_W - 80);
    this.elapsedMs = Math.max(0, checkpoint.elapsedMs ?? 0);
    this.score = Math.max(0, checkpoint.score ?? 0);
    this.stageName = segment.name;
    this.resumeCheckpoint = checkpoint;

    const isDeathResume = checkpoint.resumeKind === 'death';
    const playerY = Phaser.Math.Clamp(checkpoint.checkpointY ?? PLAYER_CONFIG.spawn.y, 80, GROUND_Y);
    this.core.player.body?.reset(checkpointX, playerY);
    if (!this.core.player.body?.reset) this.core.player.setPosition(checkpointX, playerY);
    this.core.player.health = isDeathResume
      ? this.core.player.maxHealth
      : Phaser.Math.Clamp(Math.max(35, checkpoint.playerHealth ?? this.core.player.maxHealth), 1, this.core.player.maxHealth);
    this.core.player.inputLocked = false;
    this.core.player.state = 'idle';
    this.core.player.invulnerableUntil = isDeathResume ? this.time.now + 2400 : this.core.player.invulnerableUntil;
    this.core.player.clearTint();

    const savedWeapons = checkpoint.weapons ?? {};
    for (const id of Object.keys(this.core.weapons.ammo)) {
      const savedAmmo = savedWeapons.ammo?.[id];
      if (savedAmmo === null && !Number.isFinite(this.core.weapons.weapons[id]?.ammo)) this.core.weapons.ammo[id] = Infinity;
      else if (Number.isFinite(savedAmmo)) this.core.weapons.ammo[id] = Math.max(0, savedAmmo);
    }
    this.core.weapons.grenades = Math.max(0, savedWeapons.grenades ?? this.core.weapons.grenades);
    const requestedWeapon = savedWeapons.currentWeapon ?? 'rifle';
    this.core.weapons.currentWeapon = requestedWeapon !== 'rifle' && (this.core.weapons.ammo[requestedWeapon] ?? 0) <= 0 ? 'rifle' : requestedWeapon;

    const byType = { technician: 0, medic: 0, artillery: 0, ...(checkpoint.rescues?.byType ?? {}) };
    this.core.rescues.byType = byType;
    this.core.rescues.rescuedCount = Object.values(byType).reduce((sum, count) => sum + Math.max(0, count), 0);
    const rescuedRemaining = { ...byType };
    for (const target of this.core.rescues.group.getChildren()) {
      const type = target.rescueType;
      if ((rescuedRemaining[type] ?? 0) <= 0) continue;
      rescuedRemaining[type] -= 1;
      target.rescued = true;
      target.secondaryTimer?.remove(false);
      target.secondaryTimer = null;
      target.marker?.destroy();
      target.marker = null;
      target.disableBody(true, true);
    }

    const collectedPickups = new Set(checkpoint.collectedPickups ?? []);
    for (const box of this.weaponPickups.getChildren()) {
      if (collectedPickups.has(box.getData('pickupKey'))) box.disableBody(true, true);
    }

    const savedTransport = checkpoint.transport;
    if (savedTransport && this.core.transport) {
      const transportX = Phaser.Math.Clamp(savedTransport.x, STAGE_CONFIG.escort.startX, STAGE_CONFIG.escort.endX);
      this.core.transport.health = Phaser.Math.Clamp(savedTransport.health, 1, this.core.transport.maxHealth);
      this.core.transport.body?.reset(transportX, this.core.transport.y);
      if (!this.core.transport.body?.reset) this.core.transport.setX(transportX);
      this.core.transport.updateVisualState?.();
    }
    if (this.core.escort) {
      const completed = Boolean(checkpoint.escort?.completed || encounterIndex > 4);
      this.core.escort.completed = completed;
      this.core.escort.failed = false;
      this.core.escort.active = !completed && checkpoint.escort?.active !== false;
      this.core.escort.pauseReason = completed ? null : this.core.escort.pauseReason;
      this.core.escort.movementState = completed ? 'completed' : 'moving';
      if (completed) {
        this.core.transport.body?.reset(this.core.escort.endX, this.core.transport.y);
        if (!this.core.transport.body?.reset) this.core.transport.setX(this.core.escort.endX);
        this.core.transport.setVelocityX(0);
      }
    }

    for (const tutorial of STAGE_CONFIG.tutorials) {
      if (tutorial.triggerX < checkpointX) this.scenarioTutorialShown.add(tutorial.id);
    }
  }

  captureEncounterActors() {
    return (this.core.encounters.current?.spawned ?? []).map((actor) => ({
      role: actor.role ?? '',
      kind: actor.role ? 'enemy' : Number.isFinite(actor.phase) ? 'ironMole' : 'crane',
      className: actor.constructor?.name ?? '',
      active: Boolean(actor.active && actor.health > 0),
      health: Math.max(0, actor.health ?? 0),
      x: actor.x,
      y: actor.y,
      phase: actor.phase ?? 1,
      state: actor.state ?? 'idle',
    }));
  }

  saveCheckpoint(index, definition, overrides = {}) {
    if (this.ended) return null;
    const segment = STAGE_CONFIG.segments[index] ?? STAGE_CONFIG.segments[0];
    const weapons = this.core.weapons.snapshot();
    const ammo = Object.fromEntries(Object.entries(weapons.ammo).map(([id, count]) => [id, Number.isFinite(count) ? count : null]));
    const checkpoint = {
      stageId: STAGE_CONFIG.id,
      encounterIndex: index,
      encounterId: definition.id,
      segmentName: segment.name,
      resumeKind: 'checkpoint',
      checkpointX: segment.checkpointX ?? definition.triggerX ?? 120,
      checkpointY: PLAYER_CONFIG.spawn.y,
      failureReason: '',
      encounterActors: [],
      score: Math.round(this.score),
      elapsedMs: Math.round(this.elapsedMs),
      playerHealth: Math.max(35, Math.ceil(this.core.player.health)),
      weapons: { currentWeapon: weapons.currentWeapon, ammo, grenades: weapons.grenades },
      rescues: this.core.rescues.snapshot(),
      transport: this.core.transport ? { x: this.core.transport.x, health: this.core.transport.health } : null,
      escort: this.core.escort?.snapshot() ?? null,
      collectedPickups: this.weaponPickups.getChildren().filter((box) => !box.active).map((box) => box.getData('pickupKey')).filter(Boolean),
      ...overrides,
    };
    this.resumeCheckpoint = SaveSystem.saveContinue(checkpoint);
    return this.resumeCheckpoint;
  }

  saveDeathResume(reason = '특송대원 전투 불능') {
    if (this.deathResumeSaved || this.ended || !this.core?.player) return this.resumeCheckpoint ?? null;
    const index = Phaser.Math.Clamp(this.core.encounters.currentIndex, 0, STAGE_CONFIG.segments.length - 1);
    const definition = this.core.encounters.current?.definition ?? this.core.encounters.definitions[index];
    if (!definition) return null;
    const saved = this.saveCheckpoint(index, definition, {
      resumeKind: 'death',
      checkpointX: this.core.player.x,
      checkpointY: this.core.player.y,
      playerHealth: this.core.player.maxHealth,
      failureReason: reason,
      encounterActors: this.captureEncounterActors(),
    });
    this.deathResumeSaved = Boolean(saved);
    return saved;
  }

  restoreEncounterProgress(checkpoint) {
    const current = this.core.encounters.current;
    const savedActors = checkpoint.encounterActors ?? [];
    if (!current || current.pending || savedActors.length === 0) return;
    let removed = 0;
    current.spawned.forEach((actor, index) => {
      const saved = savedActors[index];
      if (!saved || (saved.role && actor.role && saved.role !== actor.role)) return;
      if (actor.body?.reset) actor.body.reset(saved.x, saved.y);
      else actor.setPosition(saved.x, saved.y);
      const health = Phaser.Math.Clamp(saved.health, 0, actor.maxHealth ?? saved.health);
      actor.health = health;
      if (!saved.active || health <= 0) {
        actor.health = 0;
        actor.state = saved.kind === 'ironMole' ? 'defeated' : 'dead';
        actor.setVelocity?.(0, 0);
        actor.disableBody?.(true, true);
        this.core.encounters.actorMonitors.delete(actor);
        removed += 1;
        return;
      }
      actor.setActive(true).setVisible(true);
      if (actor.body) actor.body.enable = true;
      if (saved.kind === 'ironMole') {
        actor.phase = Phaser.Math.Clamp(saved.phase ?? (health / actor.maxHealth <= 0.33 ? 3 : health / actor.maxHealth <= 0.66 ? 2 : 1), 1, 3);
        actor.state = 'combat';
        actor.visualLockUntil = 0;
        actor.playState?.(`phase-${actor.phase}`, true);
      } else if (saved.kind === 'crane') {
        actor.state = 'combat';
        actor.visualLockUntil = 0;
        actor.playState?.(health / actor.maxHealth <= 0.5 ? 'damaged' : 'idle', true);
      } else {
        actor.state = 'idle';
      }
      actor.emit?.('healthChanged', { health: actor.health, maxHealth: actor.maxHealth, phase: actor.phase });
    });
    current.alive = Math.max(0, current.alive - removed);
  }

  createBackdrop() {
    this.backgroundSystem = new BackgroundLayerSystem(this, {
      farKeys: [ASSETS.bgHarbor, ASSETS.bgContainers, ASSETS.bgBoss],
      midKeys: ['bg-mid-harbor', 'bg-mid-yard', 'bg-mid-arena'],
      nearKeys: ['bg-near-harbor', 'bg-near-yard', 'bg-near-arena'],
      ambienceKeys: ['bg-ambience-harbor', 'bg-ambience-yard', 'bg-ambience-arena'],
      boundaries: [5900, 11000],
      blendWidth: 800,
    });
  }

  createTerrain() {
    this.terrainArt = new TerrainArtSystem(this, { worldWidth: WORLD_W, groundY: GROUND_Y })
      .createGround()
      .createPlatforms(STAGE_CONFIG.traversal.platforms);
    this.terrain = this.terrainArt.getGroup();
  }

  createCore() {
    const encounters = [
      { id: 'shore-entry', triggerX: 0, gateX: 1700, enemies: [{ role: 'basicSoldier', count: 3, x: 840, y: 520, spacing: 150, options: { texture: 'enemy-rifle-actions', width: 104, height: 118, tint: 0xffffff } }] },
      { id: 'container-crossfire', triggerX: 1800, gateX: 4100, enemies: [
        { role: 'basicSoldier', count: 3, x: 2180, y: 520, spacing: 170, options: { texture: 'enemy-rifle-actions', width: 104, height: 118, tint: 0xffffff } },
        { role: 'basicSoldier', count: 1, x: 2880, y: 250, options: { texture: 'enemy-rifle-actions', width: 104, height: 118, moveSpeed: 0, tint: 0xffffff } },
        { role: 'grenadier', count: 1, x: 3200, y: 320, options: { texture: 'enemy-grenadier-actions', width: 109, height: 122, moveSpeed: 0, tint: 0xffffff } }
      ] },
      { id: 'rescue-bay', triggerX: 4200, gateX: 5850, enemies: [
        { role: 'shieldSoldier', count: 2, x: 4500, y: 520, spacing: 260, options: { texture: 'enemy-shield-actions', width: 120, height: 126, tint: 0xffffff } },
        { role: 'sentryDrone', count: 3, x: 5000, y: 320, spacing: 190, options: { texture: 'enemy-drone-actions', width: 133, height: 72, tint: 0xffffff } }
      ] },
      { id: 'warehouse', triggerX: 5900, gateX: 8150, enemies: [
        { role: 'shieldSoldier', count: 2, x: 6300, y: 520, spacing: 230, options: { texture: 'enemy-shield-actions', width: 120, height: 126, tint: 0xffffff } },
        { role: 'grenadier', count: 1, x: 6600, y: 250, options: { texture: 'enemy-grenadier-actions', width: 109, height: 122, moveSpeed: 0, tint: 0xffffff } },
        { role: 'grenadier', count: 1, x: 6930, y: 320, options: { texture: 'enemy-grenadier-actions', width: 109, height: 122, moveSpeed: 0, tint: 0xffffff } },
        { role: 'sentryDrone', count: 2, x: 7520, y: 290, spacing: 220, options: { texture: 'enemy-drone-actions', width: 133, height: 72, tint: 0xffffff } }
      ] },
      { id: 'escort-lane', triggerX: 8150, gateX: 9550, enemies: [
        { role: 'basicSoldier', count: 5, x: 8550, y: 520, spacing: 180, options: { texture: 'enemy-rifle-actions', width: 104, height: 118, tint: 0xffffff } },
        { role: 'sentryDrone', count: 2, x: 8840, y: 280, spacing: 320, options: { texture: 'enemy-drone-actions', width: 133, height: 72, tint: 0xffffff } }
      ], gate: () => this.core?.escort?.completed === true },
      { id: 'crane-sentinel', triggerX: 9550, gateX: 10950, boss: 'crane', x: 10300, y: 476, options: { ...BOSS_CONFIG.craneSentinel, texture: 'boss-crane-actions', width: 300, height: 240, tint: 0xffffff } },
      { id: 'collapse-bridge', triggerX: 10950, gateX: 14000, enemies: [
        { role: 'basicSoldier', count: 5, x: 11350, y: 520, spacing: 230, options: { texture: 'enemy-rifle-actions', width: 104, height: 118, tint: 0xffffff } },
        { role: 'grenadier', count: 1, x: 11860, y: 250, options: { texture: 'enemy-grenadier-actions', width: 109, height: 122, moveSpeed: 0, tint: 0xffffff } },
        { role: 'grenadier', count: 1, x: 12190, y: 320, options: { texture: 'enemy-grenadier-actions', width: 109, height: 122, moveSpeed: 0, tint: 0xffffff } },
        { role: 'grenadier', count: 1, x: 12500, y: 400, options: { texture: 'enemy-grenadier-actions', width: 109, height: 122, moveSpeed: 0, tint: 0xffffff } },
        { role: 'sentryDrone', count: 3, x: 12900, y: 280, spacing: 240, options: { texture: 'enemy-drone-actions', width: 133, height: 72, tint: 0xffffff } }
      ] },
      { id: 'iron-mole', triggerX: 14000, gateX: 16720, boss: 'ironMole', x: 15700, y: 452, options: { ...BOSS_CONFIG.ironMole, texture: 'boss-iron-mole-actions', width: 480, height: 260, tint: 0xffffff } }
    ];
    this.core = new GameplayCore(this, {
      player: { x: PLAYER_CONFIG.spawn.x, y: PLAYER_CONFIG.spawn.y, ...PLAYER_CONFIG, texture: ASSETS.player, width: 118, height: 132, tint: 0xffffff },
      weapons: { weapons: WEAPON_CONFIG }, encounters
    });
    this.core.createTransport(STAGE_CONFIG.escort.startX, GROUND_Y - 96.7, { texture: 'vehicle-actions', width: 426.7, height: 213.35, bodyWidth: 330, bodyHeight: 90, health: STAGE_CONFIG.escort.maxHp, moveSpeed: STAGE_CONFIG.escort.moveSpeed, tint: 0xffffff });
    this.core.bindTerrain(this.terrain);
    this.core.startEscort({ startX: STAGE_CONFIG.escort.startX, endX: STAGE_CONFIG.escort.endX, player: this.core.player, maxLead: 280, maxLag: 360, catchUpMultiplier: 5.5, threatProvider: () => this.countThreatsNear(this.core.transport, 470) > 0 });
    this.core.player.setDepth(40);
    this.playerBaseScaleX = this.core.player.scaleX;
    this.playerBaseScaleY = this.core.player.scaleY;
    this.core.transport.setDepth(32);
    this.core.player.setData('singleSpriteWeaponComposite', { active: false, runtimeOverlay: false, alphaFade: false });
    if (this.anims.exists(animationKey('player', 'idle'))) this.core.player.play(animationKey('player', 'idle'));
  }

  createWorldContent() {
    this.environmentProps = new EnvironmentPropSystem(this, {
      worldWidth: WORLD_W,
      groundY: GROUND_Y,
      exclusionZones: DESTRUCTIBLE_XS.map((x) => ({ x, radius: 104 })),
    }).create();
    const platformById = (id) => this.terrainArt.platformDefinitions.find((platform) => platform.id === id);
    const rescueTexture = (type) => `rescue-${type === 'engineer' ? 'technician' : type}`;
    for (const rescue of STAGE_CONFIG.rescues) {
      const height = 116; const width = Math.round(height * 384 / 512);
      const platform = rescue.platformId ? platformById(rescue.platformId) : null;
      const surfaceY = platform ? platform.surfaceY : GROUND_Y;
      const visualBaselineOffset = (496 - 512 / 2) * height / 512;
      const y = surfaceY - visualBaselineOffset;
      this.core.createRescue(rescue.x, y, rescue.type, { texture: rescueTexture(rescue.type), width, height, effect: rescue.effect, score: rescue.score, tint: 0xffffff })
        .setData('platformId', rescue.platformId ?? null)
        .setDepth(36);
    }
    const destructiblePresets = [
      { texture: 'fuel-intact', damageTextures: ['fuel-intact', 'fuel-damaged', 'fuel-destroyed'], width: 64, height: 86, health: 3, blastRadius: 155, blastDamage: 4 },
      { texture: 'container-lock-intact', damageTextures: ['container-lock-intact', 'container-lock-broken', 'container-lock-broken'], width: 82, height: 74, health: 4, blastRadius: 108, blastDamage: 3 },
      { texture: 'power-cell-intact', damageTextures: ['power-cell-intact', 'power-cell-damaged', 'power-cell-overload'], width: 62, height: 84, health: 3, blastRadius: 132, blastDamage: 4 },
      { texture: 'crane-part-intact', damageTextures: ['crane-part-intact', 'crane-part-damaged', 'crane-part-detached'], width: 76, height: 94, health: 5, blastRadius: 170, blastDamage: 5 },
      { texture: 'bridge-joint-intact', damageTextures: ['bridge-joint-intact', 'bridge-joint-cracked', 'bridge-joint-destroyed'], width: 92, height: 74, health: 4, blastRadius: 150, blastDamage: 4 },
    ];
    DESTRUCTIBLE_XS.forEach((x, i) => {
      const preset = destructiblePresets[i % destructiblePresets.length];
      const prop = this.core.createDestructible(x, GROUND_Y - preset.height / 2, { ...preset, chainDelay: 85 + (i % 3) * 30, tint: 0xffffff });
      prop.setDepth(30);
    });

    // Promote the previously ambiguous warning badges and cable reel into
    // real projectile targets. The plates sit immediately above the barrel and
    // lockbox like bolted armor panels; one accurate shot can start a readable
    // chain reaction through the lower props and the adjacent cable assembly.
    const environmentalTargets = [
      { id: 'warning-panel-drum', kind: 'volatile-warning-relay', roleLabel: '폭발 경고 릴레이', x: 1100, y: GROUND_Y - 94, texture: 'prop-warning-plate', width: 60, height: 60, health: 2, blastRadius: 98, blastDamage: 3, chainDelay: 75 },
      { id: 'warning-panel-lockbox', kind: 'volatile-warning-relay', roleLabel: '폭발 경고 릴레이', x: 1180, y: GROUND_Y - 94, texture: 'prop-warning-plate', width: 60, height: 60, health: 2, blastRadius: 98, blastDamage: 3, chainDelay: 95 },
      { id: 'cable-hook-cache', kind: 'mooring-cable-cache', roleLabel: '파괴 가능 계류 장치', x: 1240, y: GROUND_Y - 45, texture: 'prop-cable-hook', width: 108, height: 86, health: 3, blastRadius: 112, blastDamage: 4, chainDelay: 110 },
      ...this.environmentProps.getInteractiveTargets(),
    ];
    environmentalTargets.forEach((target) => {
      const prop = this.core.createDestructible(target.x, target.y, {
        texture: target.texture,
        damageTextures: [target.texture, target.texture, target.texture],
        width: target.width,
        height: target.height,
        health: target.health,
        blastRadius: target.blastRadius,
        blastDamage: target.blastDamage,
        chainDelay: target.chainDelay,
        tint: 0xffffff,
      })
        .setData('environmentDestructibleId', target.id)
        .setData('environmentDestructibleKind', target.kind)
        .setData('environmentRoleLabel', target.roleLabel ?? '파괴 가능 구조물')
        .setData('blocksMovement', Boolean(target.blocksMovement))
        .setData('interactionRole', target.blocksMovement ? 'projectile-destructible-movement-gate' : 'projectile-destructible-chain-target')
        .setDepth(target.blocksMovement ? 34 : 30);
      if (target.blocksMovement) {
        // Movement gates remain opt-in. The current fence role is shootable
        // cover, so traversal never depends on destroying every prop.
        this.core.colliders.push(this.physics.add.collider(this.core.player, prop));
      }
    });
    this.weaponPickups = this.physics.add.group();
    for (const pickup of STAGE_CONFIG.weaponPickups) {
      const platform = pickup.platformId ? platformById(pickup.platformId) : null;
      const y = platform ? platform.surfaceY - 28 : GROUND_Y - 65;
      const box = this.physics.add.sprite(pickup.x, y, `pickup-${pickup.weaponId}`).setDisplaySize(74, 52).setData('pickup', pickup).setData('pickupKey', this.pickupKey(pickup)).setData('platformId', pickup.platformId ?? null).setDepth(31);
      box.setData('_spawnY', box.y);
      this.weaponPickups.add(box);
      box.body.setAllowGravity(false).setVelocity(0, 0).setImmovable(true);
    }
    this.physics.add.overlap(this.core.player, this.weaponPickups, (_player, box) => {
      const data = box.getData('pickup'); this.core.weapons.grantWeapon(data.weaponId, data.ammo); box.disableBody(true, true); this.score += 250; this.callout(`${data.weaponId.toUpperCase()} 보급`, COLORS.orange); Audio.sfx(this, 'sfx-rescue');
    });
  }

  createHud() {
    const viewW = this.cameras.main.width;
    const panel = panelFrame(this, viewW / 2, 43, viewW - 28, 72, 'ui-hud-top-bar-hd', {
      left: 126, right: 330, top: 78, bottom: 78,
    }).setAlpha(0.96).setDepth(400);
    // Source-space metrics of the generated HD frame's integrated pause
    // recess. layoutViewport converts them with the panel's uniform scale.
    panel.setData('_pauseRecess', { insetFromRight: 202, diameter: 174 });
    this.hudPanel = panel;
    this.hpText = label(this, 34, 42, 'HP 100', 20, '#76d275').setOrigin(0, 0.5).setDepth(410);
    this.weaponIcon = this.add.image(205, 42, 'ui-weapon-rifle').setDisplaySize(48, 48).setDepth(410);
    this.weaponText = label(this, 234, 42, 'ARC-7 ∞', 18, '#ffc857').setOrigin(0, 0.5).setDepth(410);
    this.stageText = label(this, viewW / 2, 42, '불타는 항구 · 해안 진입', 20, '#f7e7bd').setDepth(410);
    this.scoreText = label(this, viewW - 280, 42, 'SCORE 0', 18, '#49d8d1').setOrigin(1, 0.5).setDepth(410);
    this.rescueIcons = ['technician', 'medic', 'artillery'].map((type, index) => this.add.image(viewW - 215 + index * 30, 42, `ui-rescue-${type}`).setDisplaySize(26, 26).setAlpha(0.34).setDepth(410));
    this.rescueText = label(this, viewW - 88, 42, '구조 0/3', 18, '#d7e9e8').setOrigin(1, 0.5).setDepth(410);
    this.escortText = label(this, viewW / 2, 93, 'ATLAS 수송차 100%', 17, '#76d275').setDepth(410).setVisible(false);
    this.bossBarBg = panelFrame(this, viewW / 2, 118, 540, 42).setDepth(410).setVisible(false);
    this.bossBar = this.add.rectangle(viewW / 2 - 254, 118, 508, 12, COLORS.red).setOrigin(0, 0.5).setDepth(411).setVisible(false); // asset-coverage-allow dynamic-boss-health-fill
    this.bossInfoText = label(this, viewW / 2, 118, '', 15, '#fff3d0').setDepth(412).setVisible(false);
    this.calloutPlate = this.add.image(viewW / 2, 190, 'ui-hud-frame').setDisplaySize(520, 82).setDepth(449).setAlpha(0);
    this.calloutPlateBaseScale = { x: this.calloutPlate.scaleX, y: this.calloutPlate.scaleY };
    this.calloutText = label(this, W / 2, 190, '', 28, '#f7e7bd').setDepth(450).setAlpha(0);
    this.gateHintPlate = this.add.image(viewW / 2, 155, 'ui-warning-plate').setDisplaySize(410, 54).setDepth(429).setAlpha(0.48).setVisible(false);
    this.gateHintText = label(this, viewW / 2, 155, '', 17, '#ffc857').setDepth(430).setVisible(false);
    this.fixedUi = [panel, this.hpText, this.weaponIcon, this.weaponText, this.stageText, this.scoreText, ...this.rescueIcons, this.rescueText, this.escortText, this.bossBarBg, this.bossBar, this.bossInfoText, this.gateHintPlate, this.gateHintText, this.calloutPlate, this.calloutText];
    // Screen UI must be camera-fixed at render time. Manually adding scrollX
    // leaves it one camera-follow step behind during fast movement/teleports.
    this.fixedUi.forEach((obj) => obj.setScrollFactor(0).setData('_screenX', obj.x).setData('_screenY', obj.y));
    this.hudObjects = [
      { id: 'hp', obj: this.hpText, role: 'hud-text' },
      { id: 'weapon-icon', obj: this.weaponIcon, role: 'hud-icon' },
      { id: 'weapon', obj: this.weaponText, role: 'hud-text' },
      { id: 'stage', obj: this.stageText, role: 'hud-text' },
      { id: 'score', obj: this.scoreText, role: 'hud-text' },
      ...this.rescueIcons.map((obj, index) => ({ id: `rescue-icon-${index + 1}`, obj, role: 'hud-icon' })),
      { id: 'rescue', obj: this.rescueText, role: 'hud-text' },
    ];
  }

  createInput() {
    this.keys = this.input.keyboard.addKeys({ left: 'A', right: 'D', up: 'W', down: 'S', jump: 'SPACE', shoot: 'J', grenade: 'K', pause: 'ESC' });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.controls = new MobileControls(this, () => this.openPause());
    this.keys.pause.on('down', () => this.openPause());
    this.layoutViewport();
  }

  shouldShowTouchControls() {
    // The on-screen controls are part of the game's primary visual/input
    // language, not a hidden mobile fallback. Keep them present on desktop too
    // so resizing or pointer-capability detection cannot make the controls
    // disappear mid-session. QA may explicitly hide them for clean art shots.
    return !(typeof location !== 'undefined' && /(?:\?|&)hideTouch=1(?:&|$)/.test(location.search));
  }

  shouldUseCompactLayout() {
    return (this.scale.canvasBounds?.width ?? window.innerWidth) < 1100;
  }

  applyControlVisibility() {
    const showTouch = this.shouldShowTouchControls();
    this.controls.setVisible(showTouch);
    if (!showTouch) this.controls.pause.bg.setVisible(true).setInteractive();
  }

  setScreenPosition(obj, x, y = obj.getData('_screenY') ?? obj.y) {
    obj.setData('_screenX', x).setData('_screenY', y);
    obj.setPosition(x, y);
    return obj;
  }

  layoutHudClusters() {
    if (!this.hudPanel) return;
    const viewW = this.cameras.main.width;
    const compact = this.shouldUseCompactLayout();
    const topY = compact ? 34 : 42;
    const bottomY = compact ? 78 : topY;
    const left = 34;
    const right = viewW - (compact ? 155 : 110); // reserve the real 46px mobile Pause hit area

    const hpSize = compact ? 28 : 20;
    const weaponSize = compact ? 28 : 18;
    const stageSize = compact ? 28 : 20;
    const secondarySize = compact ? 28 : 18;
    this.hpText.setFontSize(hpSize);
    this.weaponText.setFontSize(weaponSize);
    this.stageText.setFontSize(stageSize);
    this.scoreText.setFontSize(secondarySize);
    this.rescueText.setFontSize(secondarySize);

    this.setScreenPosition(this.hpText, left, topY);
    const hpRight = left + this.hpText.width;
    const iconSize = compact ? 44 : 48;
    this.weaponIcon.setDisplaySize(iconSize, iconSize);
    this.setScreenPosition(this.weaponIcon, hpRight + 14 + iconSize / 2, topY);
    this.setScreenPosition(this.weaponText, hpRight + 22 + iconSize, topY);

    this.setScreenPosition(this.rescueText, right, bottomY);
    const rescueIconSize = compact ? 28 : 26;
    const rescueGap = compact ? 34 : 30;
    const rescueTextLeft = right - this.rescueText.width;
    const firstIconX = rescueTextLeft - 14 - rescueGap * 2.5;
    this.rescueIcons.forEach((icon, index) => {
      icon.setDisplaySize(rescueIconSize, rescueIconSize);
      this.setScreenPosition(icon, firstIconX + index * rescueGap, bottomY);
    });

    if (compact) {
      this.setScreenPosition(this.scoreText, right, topY);
      this.setScreenPosition(this.stageText, viewW / 2, bottomY);
    } else {
      const iconLeft = firstIconX - rescueIconSize / 2;
      this.setScreenPosition(this.scoreText, iconLeft - 18, topY);
      this.setScreenPosition(this.stageText, viewW / 2, topY);
    }
  }

  layoutViewport() {
    if (!this.hudPanel || !this.controls) return;
    const viewW = this.cameras.main.width;
    const viewH = this.cameras.main.height;
    const compact = this.shouldUseCompactLayout();
    const panelHeight = compact ? 110 : 72;
    const panelY = compact ? 59 : 43;
    resizePanel(this.hudPanel, viewW - 28, panelHeight);
    resizePanel(this.bossBarBg, 540, 42);
    this.setScreenPosition(this.hudPanel, viewW / 2, panelY);
    this.layoutHudClusters();
    const auxiliaryY = compact ? 130 : 93;
    const bossY = compact ? 158 : 118;
    this.gateHintText.setFontSize(compact ? 28 : 17);
    this.setScreenPosition(this.escortText, viewW / 2, auxiliaryY);
    this.setScreenPosition(this.bossBarBg, viewW / 2, bossY);
    this.setScreenPosition(this.bossBar, viewW / 2 - 254, bossY);
    this.setScreenPosition(this.bossInfoText, viewW / 2, bossY);
    this.setScreenPosition(this.gateHintPlate, viewW / 2, compact ? 215 : 172);
    this.setScreenPosition(this.gateHintText, viewW / 2, compact ? 215 : 172);
    this.setScreenPosition(this.calloutPlate, viewW / 2, compact ? 290 : 250);
    this.setScreenPosition(this.calloutText, viewW / 2, compact ? 290 : 250);
    const panelScale = this.hudPanel.getData('_panelUniformScale') ?? 1;
    const panelBounds = this.hudPanel.getBounds();
    const pauseRecess = this.hudPanel.getData('_pauseRecess') ?? { insetFromRight: 202, diameter: 174 };
    const pauseVisualSize = Phaser.Math.Clamp(pauseRecess.diameter * panelScale * 0.82, 34, 58);
    const pauseX = panelBounds.right - pauseRecess.insetFromRight * panelScale;
    this.controls.resize(viewW, viewH, {
      pauseX,
      pauseY: panelY,
      pauseVisualSize,
    });
    this.applyControlVisibility();
  }

  bindEvents() {
    this.core.on('encounterStarted', ({ index, definition, current }) => {
      this.callout(this.encounterTitle(definition.id), index >= 5 ? COLORS.red : COLORS.cyan);
      current.spawned.forEach((actor) => {
        this.physics.add.collider(actor, this.terrain);
        if (!definition.boss) actor.on?.('damaged', () => this.impactVfx(actor.x, actor.y, actor.role === 'shield' ? 'shield' : 'armor'));
        actor.on?.('attackTelegraph', ({ duration = 420 } = {}) => {
          this.worldWarning(this.core.player.x, GROUND_Y - 10, 'fx-warning-boss', duration);
          this.enemyChargeVfx(actor, duration);
        });
      });
      // Ordinary enemies now use production HP (42+), so maxHealth is not a
      // valid boss discriminator. Only boss-authored encounters own the bar.
      const boss = definition.boss ? current.spawned[0] : null;
      if (boss) {
        this.bindBoss(boss);
        // Boss arenas are explicit checkpoints. Refill before the final three-
        // phase fight so damage taken while learning repaired drone patterns
        // does not turn the boss intro into an unavoidable one-hit failure.
        const supply = definition.boss === 'ironMole' ? this.core.player.maxHealth : 35;
        const healed = this.core.player.heal(supply);
        if (healed > 0) {
          this.transientImage('fx-rescue-flash', this.core.player.x, this.core.player.y - 18, 88, 88, 260, { depth: 39, alpha: 0.72, endScale: 1.04 });
          this.time.delayedCall(420, () => !this.ended && this.callout(`보스 체크포인트 보급 +${healed}`, COLORS.green, 900));
        }
      }
      if (this.suppressNextCheckpointSave) this.suppressNextCheckpointSave = false;
      else this.saveCheckpoint(index, definition);
    });
    this.core.encounters.on('actorDefeated', ({ actor }) => { this.score += actor.scoreValue ?? 100; this.hitBurst(actor.x, actor.y, COLORS.orange, 18); });
    this.core.on('allComplete', () => {
      const delay = Math.max(0, this.bossDeathPresentationUntil - this.time.now);
      if (delay > 0) this.time.delayedCall(delay, () => !this.ended && this.finish(true, '아이언 몰 파괴 · 항로 확보'));
      else this.finish(true, '아이언 몰 파괴 · 항로 확보');
    });
    this.core.on('rescued', ({ type, target }) => {
      this.score += type === 'artillery' ? 1000 : 750;
      this.callout(`${type.toUpperCase()} 구조 완료`, COLORS.green);
      // Keep the recovered silhouette readable: the flash belongs behind the
      // rescued NPC, not over the player and not above the character layer.
      this.transientImage('fx-rescue-flash', target.x, target.y - 16, 92, 92, 260, { depth: 35, alpha: 0.78, endScale: 1.04 });
      Audio.sfx(this, 'sfx-rescue');
    });
    this.core.rescues.on('artilleryRequested', ({ duration }) => this.startArtillery(duration));
    this.core.on('blast', ({ x, y, radius, weaponId, cameraShake }) => { this.explosion(x, y, radius, { weaponId, cameraShake }); Audio.sfx(this, weaponId === 'rocket' ? 'sfx-rocket' : 'sfx-grenade', 0.42); });
    this.core.destruction.on('detonated', ({ prop, x, y, radius }) => {
      this.score += 75;
      this.explosion(x, y, radius);
      Audio.sfx(this, 'sfx-grenade', 0.5);
      const kind = prop?.getData?.('environmentDestructibleKind');
      if (kind === 'breakable-fence-cover') this.callout('철망 엄폐물 파괴 · 시야 확보', COLORS.cyan, 820);
      else if (kind === 'volatile-warning-relay') this.callout('경고 릴레이 파괴 · 연쇄 폭발', COLORS.orange, 760);
      else if (kind === 'mooring-cable-cache') this.callout('계류 장치 파괴 · 항로 정리', COLORS.green, 760);
    });
    this.core.on('playerDied', () => {
      this.saveDeathResume('특송대원 전투 불능');
      this.time.delayedCall(900, () => this.finish(false, '특송대원 전투 불능'));
    });
    this.core.on('escortFailed', ({ reason } = {}) => {
      // EscortSystem also mirrors player death so it can stop the vehicle.
      // Let the dedicated playerDied path own that result; otherwise its
      // immediate escort event races the 900ms death presentation and reports
      // a healthy ATLAS as destroyed.
      if (reason !== 'player-died') {
        this.saveDeathResume('ATLAS 수송차 파괴');
        this.finish(false, 'ATLAS 수송차 파괴');
      }
    });
    this.core.on('escortCompleted', () => { this.score += 2500; this.callout('호위 완료 · ATLAS 생존', COLORS.green); });
    this.core.weapons.on('weaponChanged', ({ id }) => {
      this.specialWeaponAimWeapon = ['shotgun', 'rocket'].includes(id) ? id : null;
      this.specialWeaponAim.set(this.core.player.facing || 1, 0);
      this.core.player.setAlpha(1).setData('singleSpriteWeaponComposite', {
        active: ['shotgun', 'rocket'].includes(id), weaponId: id,
        runtimeOverlay: false, alphaFade: false, transitionMs: 0,
      });
    });
    this.core.weapons.on('fired', ({ owner, weaponId, aim, muzzle, spawn }) => {
      const holdMs = weaponId === 'rifle' ? 230 : weaponId === 'shotgun' ? 250 : 280;
      this.recoilUntil = this.time.now + holdMs;
      this.recoilVisualState = this.playerFireState(aim);
      if (['shotgun', 'rocket'].includes(weaponId)) {
        this.specialWeaponAim.set(aim.x, aim.y).normalize();
        this.specialWeaponAimWeapon = weaponId;
      }
      if (owner.state === 'idle') this.restartPlayerFireAnimation(this.recoilVisualState);
      this.muzzleVfx(owner, weaponId, aim, muzzle, spawn);
      Audio.sfx(this, `sfx-${weaponId}`, weaponId === 'rifle' ? 0.22 : 0.42);
    });
    this.core.weapons.on('enemyFired', ({ owner, projectile, direction, muzzle }) => this.enemyMuzzleVfx(owner, projectile, direction, muzzle));
    this.core.pool.on('impact', ({ projectile, target }) => {
      if (projectile?.faction === 'enemy' && target === this.core.player) this.impactVfx(target.x, target.y - 24, 'armor');
    });
    this.core.weapons.on('grenadeThrown', () => { this.grenadePoseUntil = this.time.now + 260; Audio.sfx(this, 'sfx-grenade', 0.22); });
    this.core.player.on('damaged', (event = {}) => {
      const duration = event.grounded === false ? 220 : event.stateBefore === 'crouch' ? 170 : 200;
      this.hurtStartedAt = this.time.now;
      this.hurtPoseUntil = this.time.now + duration;
      this.hurtDirection = event.knockbackDirection || -this.core.player.facing || -1;
      this.hurtStateBefore = event.stateBefore ?? this.core.player.state;
      // A hit cancels stale action presentation. Otherwise an old recoil pose
      // briefly resumes after hurt and looks like the character changes weapon.
      this.recoilUntil = 0;
      this.grenadePoseUntil = 0;
      this.meleePoseUntil = 0;
      this.cameras.main.shake(90, 0.009);
      Audio.sfx(this, 'sfx-hit');
    });
  }

  bindBoss(boss) {
    this.activeBoss = boss; this.bossHudName = Number.isFinite(boss.phase) ? '아이언 몰' : '크레인 센티널'; this.bossHudPhase = boss.phase ?? 1; this.bossHudMaxPhase = Number.isFinite(boss.phase) ? 3 : 1; this.bossBar.width = 508; this.bossBarBg.setVisible(true); this.bossBar.setVisible(true); this.bossInfoText.setVisible(true); this.updateBossInfo(boss.health, boss.maxHealth); Audio.sfx(this, 'sfx-boss_alert', 0.55); Audio.playMusic(this, 'music-boss', 0.23);
    boss.on('damaged', (event) => this.bossImpactVfx(event));
    boss.on('deathStarted', (event) => this.bossDeathSequence(event.boss ?? boss, event));
    boss.on('healthChanged', ({ health, maxHealth }) => { this.bossBar.width = 508 * Phaser.Math.Clamp(health / maxHealth, 0, 1); this.updateBossInfo(health, maxHealth); });
    boss.on('phaseChanged', ({ phase }) => { this.bossHudPhase = phase; this.bossPhaseBreak(boss, phase); this.updateBossInfo(boss.health, boss.maxHealth); this.clearBossWarnings(); this.callout(`아이언 몰 · 페이즈 ${phase}`, COLORS.red); });
    boss.on('telegraph', ({ kind, duration = 520 }) => { this.callout(`경고 · ${this.bossWarningLabel(kind)}`, COLORS.red, 520); this.worldWarning(this.core.player.x, GROUND_Y - 10, 'fx-warning-boss', duration); });
    boss.on('drillCharge', ({ targetX, duration = 700 }) => this.worldWarning(targetX, GROUND_Y - 10, 'fx-warning-boss', Math.min(520, duration)));
    boss.on('hazardPulse', ({ boss: source = boss, radius = 220, damage = 1, delay = 560 }) => {
      this.worldWarning(source.x, GROUND_Y - 10, 'fx-warning-boss', delay, () => {
        if (!source.active || source.health <= 0 || !this.core.player.active) return;
        if (Phaser.Math.Distance.Between(source.x, source.y, this.core.player.x, this.core.player.y) <= radius) this.core.player.takeDamage(damage, source);
        this.explosion(source.x, GROUND_Y - 32, Math.min(radius, 170));
      });
    });
    const done = () => { this.clearBossWarnings(); this.bossBarBg.setVisible(false); this.bossBar.setVisible(false); this.bossInfoText.setVisible(false); this.activeBoss = null; this.cameras.main.shake(280, 0.02); Audio.playMusic(this, 'music-stage', 0.2); };
    boss.once('died', done); boss.once('defeated', done);
  }

  updateBossInfo(health = 0, maxHealth = 1) {
    const percent = Math.round(Phaser.Math.Clamp(health / Math.max(1, maxHealth), 0, 1) * 100);
    this.bossInfoText?.setText(`${this.bossHudName} · HP ${percent}% · 페이즈 ${this.bossHudPhase}/${this.bossHudMaxPhase}`);
  }

  bossWarningLabel(kind = '') {
    return ({ 'cannon-fan': '부채꼴 포격', 'missile-salvo': '미사일 일제사격', 'drill-charge': '굴착 돌진', overdrive: '과부하 폭주', burst: '기관포 연사', hook: '크레인 훅 투척' }[kind] ?? '중화기 공격');
  }

  update(time, delta) {
    if (this.ended || !this.core) return;
    // Arcade physics is paused independently from the Scene clock for hit-stop.
    // A delayed-call can be coalesced/removed when several impacts land on the
    // same render frame, so the frame loop is the authoritative resume guard.
    // (Scene pause does not run update, and finish() returns above.)
    if (this.physics.world.isPaused && time >= this.hitStopUntil - 1) {
      this.hitStopTimer?.remove(false);
      this.hitStopTimer = null;
      this.physics.world.resume();
    }
    this.elapsedMs += delta;
    const moveX = (this.keys.left.isDown || this.cursors.left.isDown ? -1 : 0) + (this.keys.right.isDown || this.cursors.right.isDown ? 1 : 0) || this.controls.moveX;
    const keyboardVertical = this.keys.up.isDown || this.cursors.up.isDown ? -1 : this.keys.down.isDown || this.cursors.down.isDown ? 1 : 0;
    const verticalInput = keyboardVertical || this.controls.moveY;
    // DOWN is posture, not a hidden diagonal-down aim mode. This keeps the
    // crouching body and the forward projectile visually coherent.
    const aimY = Math.min(0, verticalInput);
    const requestedMoveX = Phaser.Math.Clamp(moveX, -1, 1);
    const gateBeforeUpdate = this.getGateState();
    const gateBlocked = gateBeforeUpdate.locked && this.core.player.x >= gateBeforeUpdate.gateX - 1.5 && requestedMoveX > 0;
    if (gateBlocked) this.core.player.setVelocityX(0);
    const actions = {
      moveX: gateBlocked ? 0 : requestedMoveX,
      // Stationary UP is truly vertical. Moving + UP remains diagonal.
      aimX: requestedMoveX || (aimY < -0.08 ? 0 : this.core.player.facing || 1), aimY,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.keys.jump) || Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.controls.consumeJump(),
      shootDown: this.keys.shoot.isDown || this.controls.shootDown,
      grenadePressed: Phaser.Input.Keyboard.JustDown(this.keys.grenade) || this.controls.consumeGrenade(), crouch: verticalInput > 0 || this.controls.crouchDown
    };
    if (actions.shootDown && aimY === 0 && verticalInput <= 0) {
      const assisted = this.nearestEnemy(520, true);
      if (assisted) { const aim = new Phaser.Math.Vector2(assisted.x - this.core.player.x, assisted.y - this.core.player.y).normalize(); actions.aimX = aim.x; actions.aimY = Phaser.Math.Clamp(aim.y, -0.72, 0); }
    }
    if (actions.shootDown && this.tryAutoMelee(time)) actions.shootDown = false;
    this.lastActions = { ...actions, requestedMoveX, gateBlocked };
    this.core.update(time, delta, actions);
    this.enforceEncounterGate(this.getGateState());
    this.updateCameraLead(requestedMoveX);
    this.updateScenarioGuidance();
    this.updatePresentation(time);
    this.updateHud();
    this.updateLayout();
  }

  getGateState() {
    const current = this.core.encounters.current;
    const gateX = current?.definition?.gateX;
    if (!Number.isFinite(gateX) || current?.pending) return { current, gateX: null, locked: false, alive: current?.alive ?? 0, customGatePassed: true };
    const customGatePassed = current?.definition?.gate ? Boolean(current.definition.gate(this.core.encounters, current)) : true;
    const alive = current?.alive ?? 0;
    return { current, gateX, alive, customGatePassed, locked: alive > 0 || !customGatePassed };
  }

  enforceEncounterGate(gateState = this.getGateState()) {
    if (!gateState.locked || this.core.player.x <= gateState.gateX) return;
    this.core.player.setX(gateState.gateX);
    if (this.core.player.body) {
      this.core.player.body.velocity.x = Math.min(0, this.core.player.body.velocity.x);
      this.core.player.body.updateCenter?.();
    }
  }

  updateCameraLead(requestedMoveX) {
    const velocityX = this.core.player.body?.velocity?.x ?? 0;
    const direction = Math.abs(requestedMoveX) > 0.08 ? Math.sign(requestedMoveX) : Math.abs(velocityX) > 8 ? Math.sign(velocityX) : 0;
    if (direction) this.cameraLeadDirection = direction;
    const escortActive = this.core.escort?.active && !this.core.escort.completed && this.core.player.x > 7800 && this.core.player.x < 9800;
    const lookRatio = escortActive ? 0.18 : GAME_CONFIG.camera.forwardLookRatio;
    const targetOffset = -this.cameras.main.width * lookRatio * this.cameraLeadDirection;
    this.cameraFollowOffsetX = Phaser.Math.Linear(this.cameraFollowOffsetX ?? targetOffset, targetOffset, 0.08);
    this.cameras.main.setFollowOffset(this.cameraFollowOffsetX, 35);
  }

  updateScenarioGuidance() {
    for (const tutorial of STAGE_CONFIG.tutorials) {
      if (this.scenarioTutorialShown.has(tutorial.id) || this.core.player.x < tutorial.triggerX) continue;
      this.scenarioTutorialShown.add(tutorial.id);
      this.callout(tutorial.text, COLORS.cyan, tutorial.durationMs);
      break;
    }
  }

  updatePresentation(time) {
    this.backgroundSystem.update(this.cameras.main, this.core.player.x);
    const player = this.core.player;
    const state = player.state;
    const weaponId = this.core.weapons.currentWeapon;
    const specialHeld = ['shotgun', 'rocket'].includes(weaponId) && this.specialWeaponAimWeapon === weaponId;
    const hurtActive = state !== 'dead' && time < this.hurtPoseUntil;
    const postureTransition = player.postureTransition?.(time) ?? null;

    // Crouching has one authored forward firing posture. Clear a stale upward
    // held aim here as well as in Player so standing up never snaps from the
    // crouched weapon to a floating upward pose.
    if (state === 'crouch' || postureTransition?.to === 'crouch') {
      player.aim.set(player.facing || 1, 0);
      if (specialHeld) this.specialWeaponAim.set(player.facing || 1, 0);
    }

    let visualState = state === 'dead' ? 'death' : state;
    if (state === 'dead') visualState = 'death';
    else if (hurtActive) {
      // Keep crouched and special-weapon silhouettes intact. The previous
      // implementation always replaced them with a horizontal rifle frame.
      if (!specialHeld && state !== 'crouch') visualState = ['jump', 'fall'].includes(state) ? 'hurt-air' : 'hurt';
    } else if (time < this.grenadePoseUntil) visualState = 'grenade';
    else if (time < this.meleePoseUntil) visualState = 'melee';
    // Posture transitions outrank held-fire presentation. Previously recoil
    // continuously replaced crouch-enter/exit with run-fire/crouch frames,
    // producing a standing-leg snap while the physics body was already low.
    else if (postureTransition) {
      const firingRifle = weaponId === 'rifle' && time < this.recoilUntil;
      visualState = firingRifle ? `${postureTransition.state}-fire` : postureTransition.state;
    } else if (time < this.recoilUntil) {
      const bucket = this.recoilVisualState.replace('shoot-', '');
      if (state === 'run') visualState = `run-fire-${bucket}`;
      else if (state === 'jump' || state === 'fall') visualState = `${state}-fire-${bucket}`;
      else if (state === 'crouch') visualState = 'crouch-forward';
      else if (state === 'idle') visualState = this.recoilVisualState;
    }

    // A held special weapon uses only its baked character+weapon namespace,
    // including crouch transitions and hit reactions. No rifle frame is
    // allowed to appear while shotgun/rocket is equipped.
    if (specialHeld && ['idle', 'run', 'jump', 'fall', 'crouch'].includes(visualState)) {
      const heldY = this.specialWeaponAim.y;
      const bucket = heldY < -0.86 ? 'up' : heldY < -0.12 ? 'diagonal' : 'forward';
      if (visualState === 'run') visualState = `run-fire-${bucket}`;
      else if (visualState === 'jump' || visualState === 'fall') visualState = `${visualState}-fire-${bucket}`;
      else if (visualState === 'crouch') visualState = 'crouch-forward';
      else if (visualState === 'idle') visualState = `shoot-${bucket}`;
    }

    const singleSpriteComposite = specialHeld
      && !['hurt', 'hurt-air', 'death', 'melee', 'grenade'].includes(visualState);
    const namespace = singleSpriteComposite ? `player-${weaponId}` : 'player';
    const key = animationKey(namespace, visualState);
    if (this.anims.exists(key) && player.anims.currentAnim?.key !== key) {
      const previousKey = player.anims.currentAnim?.key ?? '';
      const preserveRunPhase = /player(?:-(?:shotgun|rocket))?:(run|run-fire-)/.test(previousKey)
        && /player(?:-(?:shotgun|rocket))?:(run|run-fire-)/.test(key);
      const phase = Number(player.frame?.name) % 8;
      player.play(key, true);
      if (preserveRunPhase && Number.isFinite(phase)) player.anims.setProgress(phase / 7);
    }
    player.setScale(this.playerBaseScaleX, this.playerBaseScaleY).setAngle(0).setAlpha(1);
    if (hurtActive) {
      const duration = Math.max(1, this.hurtPoseUntil - this.hurtStartedAt);
      const progress = Phaser.Math.Clamp((time - this.hurtStartedAt) / duration, 0, 1);
      const kick = Math.sin(Math.PI * progress);
      player.setAngle(this.hurtDirection * 4 * kick);
    }
    const attachment = singleSpriteComposite ? player.specialWeaponAttachment(this.specialWeaponAim, weaponId) : null;
    player.setData('singleSpriteWeaponComposite', {
      active: singleSpriteComposite, weaponId: singleSpriteComposite ? weaponId : null,
      textureNamespace: singleSpriteComposite ? namespace : null,
      textureKey: player.texture?.key ?? null, aimBucket: attachment?.bucket ?? null,
      alpha: player.alpha, runtimeOverlay: false, alphaFade: false, attachment,
    });
    player.setData('motionContinuity', {
      visualState, postureTransition, hurtActive,
      hurtStartedAt: this.hurtStartedAt, hurtPoseUntil: this.hurtPoseUntil,
      hurtDirection: this.hurtDirection, stateBeforeHit: this.hurtStateBefore,
      weaponPreserved: !hurtActive || weaponId === 'rifle' || singleSpriteComposite,
    });
    this.lastPlayerState = visualState;
    const gateState = this.getGateState();
    const segmentSampleX = gateState.locked ? Math.min(player.x, gateState.gateX - 0.01) : player.x;
    const segment = getSegmentAtX(segmentSampleX); if (segment) this.stageName = segment.name;
    this.escortText.setVisible(player.x > 7800 && !this.core.escort.completed);
    this.updateTransportVfx(time);
  }

  updateHud() {
    const snap = this.core.snapshot();
    const weaponId = snap.weapons.currentWeapon; const ammo = snap.weapons.ammo[weaponId];
    this.hpText.setText(`HP ${Math.ceil(snap.player.health)}`);
    if (this.textures.exists(`ui-weapon-${weaponId}`)) this.weaponIcon.setTexture(`ui-weapon-${weaponId}`);
    this.weaponText.setText(`${weaponId.toUpperCase()} ${Number.isFinite(ammo) ? ammo : '∞'} · BOMB ${snap.weapons.grenades}`);
    this.stageText.setText(`불타는 항구 · ${this.stageName}`);
    this.scoreText.setText(`SCORE ${Math.round(this.score).toLocaleString('ko-KR')}`);
    this.rescueText.setText(`구조 ${snap.rescues.total}/3`);
    ['technician', 'medic', 'artillery'].forEach((type, index) => this.rescueIcons[index].setAlpha(snap.rescues.byType[type] > 0 ? 1 : 0.34));
    if (snap.escort) {
      const hpPercent = Math.ceil(snap.escort.health / Math.max(1, snap.escort.maxHealth) * 100);
      const progress = snap.escort.progressPercent ?? Math.round((snap.escort.progress ?? 0) * 100);
      const status = snap.escort.threatened ? '위협 정지' : snap.escort.pauseReason === 'player-behind' ? '→ 전진 필요' : snap.escort.movementState === 'catching-up' ? '합류 중' : '이동 중';
      this.escortText.setText(`ATLAS ${hpPercent}% · 진행 ${progress}% · ${Math.ceil(snap.escort.remainingDistance)}m · ${status}`);
    }
    this.updateGateFeedback(snap);
    this.layoutHudClusters();
  }

  updateGateFeedback(snap) {
    const gateState = this.getGateState();
    const nearGate = gateState.locked && gateState.gateX - this.core.player.x <= 330 && gateState.gateX - this.core.player.x >= -8;
    if (!nearGate) {
      this.gateHintPlate.setVisible(false);
      this.gateHintText.setVisible(false);
      return;
    }
    const encounter = this.core.encounters.snapshot();
    const direction = encounter.remainingDirection === 'backward' ? '←' : encounter.remainingDirection === 'forward' ? '→' : '◆';
    const distance = Number.isFinite(encounter.remainingDistance) ? ` · ${Math.ceil(encounter.remainingDistance)}m` : '';
    let message = `진입 잠금 · ${direction} 잔존 적 ${gateState.alive}${distance}`;
    if (gateState.alive === 0 && !gateState.customGatePassed && snap.escort) {
      const escort = snap.escort;
      if (escort.threatened) message = 'ATLAS 정지 · 주변 위협 제거';
      else if (escort.playerLag > escort.maxLag) message = 'ATLAS 대기 · → 수송차 앞으로 이동';
      else if (escort.movementState === 'catching-up') message = `ATLAS 합류 중 · 진행 ${escort.progressPercent}%`;
      else message = `ATLAS 호위 진행 · 목적지까지 ${Math.ceil(escort.remainingDistance)}m`;
    }
    this.gateHintText.setText(message);
    const width = Phaser.Math.Clamp(this.gateHintText.width + 54, 380, 620);
    this.gateHintPlate.setDisplaySize(width, this.shouldShowTouchControls() ? 64 : 54).setVisible(true);
    this.gateHintText.setVisible(true);
  }

  updateLayout() {
    publishLayout(this, [
      { id: 'hud-panel', obj: this.hudPanel, role: 'panel', checkOverlap: false },
      ...this.hudObjects,
      ...this.controls.layoutEntries(),
      ...(this.escortText.visible ? [{ id: 'escort-health', obj: this.escortText, role: 'hud-text' }] : []),
      ...(this.gateHintText.visible ? [
        { id: 'gate-hint-panel', obj: this.gateHintPlate, role: 'panel', checkOverlap: false },
        { id: 'gate-hint', obj: this.gateHintText, role: 'hud-text' },
      ] : []),
      ...(this.calloutText.alpha > 0.001 ? [
        { id: 'encounter-callout-panel', obj: this.calloutPlate, role: 'panel', checkOverlap: false },
        { id: 'encounter-callout', obj: this.calloutText, role: 'hud-text', checkOverlap: false },
      ] : []),
      ...(this.bossBar.visible ? [{ id: 'boss-health', obj: this.bossBarBg, role: 'hud-bar' }, { id: 'boss-info', obj: this.bossInfoText, role: 'hud-text', checkOverlap: false }] : []),
    ]);
  }
  countThreatsNear(target, radius) { return this.core.encounters.enemyGroup.getChildren().filter((enemy) => enemy.active && Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y) <= radius).length; }
  nearestEnemy(range, frontOnly = false) {
    let best = null; let bestDistance = range;
    for (const enemy of this.core.encounters.enemyGroup.getChildren()) {
      if (!enemy.active || enemy.health <= 0) continue;
      const dx = enemy.x - this.core.player.x; const dy = enemy.y - this.core.player.y; const distance = Math.hypot(dx, dy);
      if (distance >= bestDistance || Math.abs(dy) > 230) continue;
      if (frontOnly && dx * this.core.player.facing < -48) continue;
      best = enemy; bestDistance = distance;
    }
    return best;
  }
  tryAutoMelee(time) {
    if (time < this.nextMeleeAt) return false;
    const target = this.nearestEnemy(94, false); if (!target) return false;
    this.nextMeleeAt = time + 430; this.meleePoseUntil = time + 250;
    target.takeDamage?.(34, this.core.player); this.hitBurst(target.x, target.y, COLORS.cream, 12); this.cameras.main.shake(55, 0.006); Audio.sfx(this, 'sfx-hit', 0.42); return true;
  }
  encounterTitle(id) { return ({ 'shore-entry': '해안 진입', 'container-crossfire': '컨테이너 교차 사격', 'rescue-bay': '구조 선착장', warehouse: '다층 창고', 'escort-lane': 'ATLAS 호위 개시', 'crane-sentinel': '미니보스 · 크레인 센티널', 'collapse-bridge': '붕괴 교량', 'iron-mole': '최종 병기 · 아이언 몰' }[id] ?? id); }

  callout(text, color = COLORS.cream, duration = 900) {
    const plateKey = color === COLORS.red ? 'ui-warning-plate' : 'ui-hud-frame';
    this.calloutPlate.setTexture(plateKey).setDisplaySize(520, color === COLORS.red ? 92 : 82).setTint(color).setAlpha(color === COLORS.red ? 0.42 : 0.3);
    this.calloutPlateBaseScale = { x: this.calloutPlate.scaleX, y: this.calloutPlate.scaleY };
    this.calloutPlate.setScale(this.calloutPlateBaseScale.x * 0.9, this.calloutPlateBaseScale.y * 0.9);
    this.calloutText.setText(text).setColor(`#${color.toString(16).padStart(6, '0')}`).setAlpha(1).setScale(0.88);
    this.tweens.killTweensOf(this.calloutText); this.tweens.killTweensOf(this.calloutPlate);
    this.tweens.add({ targets: this.calloutText, alpha: 0, scale: 1.05, delay: duration, duration: 360 });
    this.tweens.add({ targets: this.calloutPlate, alpha: 0, scaleX: this.calloutPlateBaseScale.x, scaleY: this.calloutPlateBaseScale.y, delay: duration, duration: 360 });
  }
  hitBurst(x, y, color, count = 12) {
    const size = Phaser.Math.Clamp(56 + count * 2.4, 72, 132);
    const burst = this.add.sprite(x, y, 'fx-hit-spark-sequence').setDisplaySize(size, size).setDepth(80).setTint(color).setAngle(Phaser.Math.Between(-12, 12));
    burst.play('fx:hit-spark');
    burst.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => burst.destroy());
  }
  transientImage(key, x, y, width, height, duration = 240, options = {}) {
    if (!this.textures.exists(key)) return null;
    const image = this.add.image(x, y, key).setDisplaySize(width, height).setOrigin(options.originX ?? 0.5, options.originY ?? 0.5).setDepth(options.depth ?? 88).setAlpha(options.alpha ?? 0.96).setAngle(options.angle ?? 0);
    if (options.flipX) image.setFlipX(true);
    this.transientVfx.add(image);
    this.tweens.add({ targets: image, alpha: 0, scaleX: image.scaleX * (options.endScale ?? 1.08), scaleY: image.scaleY * (options.endScale ?? 1.08), duration, ease: 'Quad.easeOut', onComplete: () => { this.transientVfx.delete(image); image.destroy(); } });
    return image;
  }
  impactVfx(x, y, material = 'armor') { return this.transientImage(material === 'shield' ? 'fx-shield-impact' : 'fx-armor-spark', x, y, material === 'shield' ? 118 : 92, material === 'shield' ? 118 : 92, 180, { angle: Phaser.Math.Between(-18, 18) }); }
  applyHitStop(durationMs = 0, weaponId = 'unknown') {
    const duration = Math.max(0, Math.round(durationMs));
    if (!duration || this.ended) return;
    const now = this.time.now;
    this.hitStopUntil = Math.max(this.hitStopUntil, now + duration);
    this.physics.world.pause();
    this.hitStopTimer?.remove(false);
    this.hitStopTimer = this.time.delayedCall(Math.max(1, this.hitStopUntil - now), () => {
      this.hitStopTimer = null;
      if (!this.ended && this.time.now >= this.hitStopUntil - 1) this.physics.world.resume();
    });
    this.registry.set('lastHitStop', { weaponId, requestedMs: duration, startedAt: now, endsAt: this.hitStopUntil });
  }
  bossImpactVfx({ boss, source, weaponId = source?.weaponId ?? 'rifle', hitPoint, recoilPx = 0 } = {}) {
    if (!boss?.active) return;
    const now = this.time.now;
    const throttle = this.bossImpactThrottle.get(boss) ?? {};
    const windowMs = weaponId === 'shotgun' ? 58 : weaponId === 'rifle' ? 18 : 70;
    if (now - (throttle[weaponId] ?? Number.NEGATIVE_INFINITY) < windowMs) return;
    throttle[weaponId] = now; this.bossImpactThrottle.set(boss, throttle);
    const cfg = WEAPON_CONFIG[weaponId] ?? WEAPON_CONFIG.rifle;
    const point = hitPoint ?? { x: source?.x ?? boss.x, y: source?.y ?? boss.y };
    const sizes = { rifle: 72, shotgun: 118, rocket: 178, grenade: 192 };
    const duration = { rifle: 190, shotgun: 260, rocket: 520, grenade: 560 }[weaponId] ?? 190;
    const key = this.textures.exists(`fx-impact-${weaponId}`) ? `fx-impact-${weaponId}` : 'fx-armor-spark';
    const impact = this.transientImage(key, point.x, point.y, sizes[weaponId] ?? 72, sizes[weaponId] ?? 72, duration, { depth: 82, angle: Phaser.Math.Between(-22, 22), alpha: 0.94, endScale: 1.12 });
    impact?.setData('bossImpactContract', { weaponId, collisionPoint: { ...point }, hitStopMs: cfg.hitStopMs, recoilPx, textureBacked: true });
    this.applyHitStop(cfg.hitStopMs, weaponId);
    // Explosives receive their configured shake from the subsequent blast
    // event; rifle/shotgun have no blast and shake here exactly once.
    if ((source?.blastRadius ?? 0) <= 0) this.cameras.main.shake(cfg.cameraShake.durationMs, cfg.cameraShake.intensity);
    Audio.sfx(this, 'sfx-armor_hit', weaponId === 'rifle' ? 0.24 : 0.42);
    if (weaponId === 'rocket' || weaponId === 'grenade') {
      this.spawnMetalDebris(point.x, point.y, 7, { lifeMs: 920, spread: 112 });
      this.transientImage('fx-smoke-puff', point.x - 28, point.y - 22, 104, 88, 860, { depth: 36, alpha: 0.44, endScale: 1.25 });
      this.transientImage('fx-boss-ember', point.x + 24, point.y - 8, 108, 108, 720, { depth: 83, alpha: 0.84, endScale: 1.2 });
    }
  }
  spawnMetalDebris(x, y, count = 10, options = {}) {
    const lifeMs = options.lifeMs ?? 1100; const spread = options.spread ?? 170;
    for (let i = 0; i < count; i += 1) {
      const piece = this.add.image(x, y, 'fx-boss-metal-debris')
        .setDisplaySize(Phaser.Math.Between(16, 34), Phaser.Math.Between(12, 28))
        .setDepth(i % 3 === 0 ? 35 : 76).setAngle(Phaser.Math.Between(-180, 180)).setAlpha(0.94)
        .setData('bossMetalDebris', true).setData('assetBacked', true);
      this.transientVfx.add(piece);
      const dx = Phaser.Math.Between(-spread, spread); const rise = Phaser.Math.Between(70, 160); const startY = y; const landY = Math.min(GROUND_Y - 5, y + Phaser.Math.Between(90, 220));
      this.tweens.add({
        targets: piece, x: x + dx, angle: piece.angle + Phaser.Math.Between(300, 820), alpha: 0.12,
        duration: lifeMs, ease: 'Linear',
        onUpdate: (tween) => { const p = tween.progress; piece.y = startY + (landY - startY) * p - rise * 4 * p * (1 - p); },
        onComplete: () => { this.transientVfx.delete(piece); piece.destroy(); },
      });
    }
  }
  bossBlastAt(x, y, size = 150, front = true, tag = 'chain') {
    const depth = front ? 80 : 35;
    const core = this.transientImage(size >= 180 ? 'fx-explosion-large' : 'fx-explosion-medium', x, y, size, size, 460, { depth, alpha: front ? 0.78 : 0.54, angle: Phaser.Math.Between(-14, 14), endScale: 1.16 });
    core?.setData('bossExplosion', tag).setData('depthLayer', front ? 'foreground' : 'background');
    const burst = this.add.sprite(x, y, 'fx-explosion-sequence').setDisplaySize(size * 0.72, size * 0.72).setDepth(depth + 1).setAlpha(front ? 0.82 : 0.5).setAngle(Phaser.Math.Between(-16, 16));
    burst.setData('bossExplosion', tag).setData('depthLayer', front ? 'foreground' : 'background');
    burst.play('fx:explosion'); burst.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => burst.destroy());
    this.transientImage('fx-boss-ember', x + Phaser.Math.Between(-18, 18), y + Phaser.Math.Between(-14, 12), size * 0.7, size * 0.7, 720, { depth: front ? 83 : 36, alpha: 0.68, endScale: 1.18 });
  }
  bossPhaseBreak(boss, phase) {
    if (!boss?.active) return;
    const points = [[-0.34, -0.12], [0.24, -0.28], [-0.06, 0.18], [0.38, 0.08]];
    boss.setData('phaseBreakContract', { phase, explosionCount: points.length, detachedArmorCount: 5, hitStopMs: 94, multiPoint: true });
    this.applyHitStop(94, 'phase-armor-break'); this.cameras.main.shake(170, 0.018);
    points.forEach(([ox, oy], index) => this.time.delayedCall(index * 105, () => {
      if (!boss.active) return;
      const x = boss.x + ox * boss.displayWidth; const y = boss.y + oy * boss.displayHeight;
      this.bossBlastAt(x, y, 112 + index * 10, index % 2 === 0, 'phase-break');
      this.spawnMetalDebris(x, y, index === points.length - 1 ? 3 : 1, { lifeMs: 980, spread: 120 });
    }));
    this.time.delayedCall(410, () => boss.active && this.transientImage('fx-boss-shockwave', boss.x, boss.y + 18, 360, 230, 720, { depth: 34, alpha: 0.44, endScale: 1.3 }));
  }
  bossDeathSequence(boss, event = {}) {
    if (!boss?.active || this.bossDeathSequenceStarted.has(boss)) return;
    this.bossDeathSequenceStarted.add(boss);
    const startedAt = this.time.now;
    this.bossDeathPresentationUntil = Math.max(this.bossDeathPresentationUntil, startedAt + 3800);
    const points = [[-0.41, -0.18], [0.34, -0.24], [-0.12, 0.19], [0.43, 0.14], [-0.34, 0.25], [0.08, -0.34], [0.22, 0.30]];
    boss.setData('deathVfxContract', { startedAt, explosionCount: points.length, distinctPoints: points, debrisCount: 14, smokeFireTailMs: 2900, presentationGateMs: 3800, eventDelayMs: event.eventDelayMs ?? 1650, depthSplit: true });
    this.applyHitStop(105, 'boss-death'); this.cameras.main.shake(260, 0.022);
    points.forEach(([ox, oy], index) => this.time.delayedCall(index * 118, () => {
      if (!boss.active) return;
      const x = boss.x + ox * boss.displayWidth; const y = boss.y + oy * boss.displayHeight;
      this.bossBlastAt(x, y, 126 + (index % 3) * 25, index % 2 === 0, 'death-chain');
      if (index === 2 || index === 5) this.spawnMetalDebris(x, y, 4, { lifeMs: 1250, spread: 190 });
    }));
    this.time.delayedCall(620, () => {
      if (!boss.active) return;
      this.transientImage('fx-boss-shockwave', boss.x, boss.y + boss.displayHeight * 0.18, Math.min(480, boss.displayWidth * 1.12), Math.min(330, boss.displayHeight * 1.2), 1000, { depth: 34, alpha: 0.56, endScale: 1.42 });
      this.spawnMetalDebris(boss.x, boss.y, 6, { lifeMs: 1450, spread: 240 });
      this.cameras.main.shake(330, 0.026);
    });
    const tailPoints = [[-0.28, -0.22], [0.18, -0.30], [0.30, 0.05], [-0.08, 0.12]];
    tailPoints.forEach(([ox, oy], i) => {
      const x = boss.x + ox * boss.displayWidth; const y = boss.y + oy * boss.displayHeight;
      this.time.delayedCall(520 + i * 120, () => {
        if (!boss.active) return;
        this.transientImage('fx-smoke-puff', x, y - 16, 118 + i * 12, 106 + i * 10, 2900, { depth: i % 2 ? 74 : 36, alpha: i % 2 ? 0.34 : 0.5, endScale: 1.36 });
        this.transientImage('fx-fire-burst', x + 12, y + 24, 74 + i * 8, 82 + i * 8, 2900, { depth: i % 2 ? 75 : 37, alpha: 0.66, endScale: 1.08 });
      });
    });
  }
  playerFireState(aim = this.core?.player?.aim) {
    const aimY = Number.isFinite(aim?.y) ? aim.y : 0;
    return aimY < -0.86 ? 'shoot-up' : aimY < -0.12 ? 'shoot-diagonal' : 'shoot-forward';
  }
  restartPlayerFireAnimation(state) {
    const weaponId = this.core?.weapons?.currentWeapon;
    const namespace = ['shotgun', 'rocket'].includes(weaponId) ? `player-${weaponId}` : 'player';
    const key = animationKey(namespace, state);
    if (!this.anims.exists(key) || !this.core?.player?.active) return;
    // ignoreIfPlaying=false is intentional: each accepted weapon shot
    // restarts recoil at frame zero, including held automatic fire.
    this.core.player.play(key, false);
  }
  muzzleVfx(owner, weaponId, firedAim = null, firedMuzzle = null, projectileSpawn = null) {
    if (!owner?.active) return;
    const aimVector = new Phaser.Math.Vector2(firedAim?.x ?? owner.aim?.x ?? owner.facing ?? 1, firedAim?.y ?? owner.aim?.y ?? 0).normalize();
    const muzzle = firedMuzzle ?? owner.muzzlePosition?.(aimVector) ?? { x: owner.x, y: owner.y };
    const profile = weaponId === 'shotgun' ? ['fx-muzzle-shotgun', 66, 42] : weaponId === 'rocket' ? ['fx-muzzle-rocket', 82, 50] : ['fx-muzzle-rifle', 48, 30];
    const angle = Phaser.Math.RadToDeg(Math.atan2(aimVector.y, aimVector.x));
    // Muzzle textures are authored pointing right. Pin their bright left
    // edge to the barrel socket and rotate only once (no angle+flip double turn).
    // A slow render frame must not let two automatic-fire flashes overlap.
    if (this.playerMuzzleFlash?.active) {
      this.tweens.killTweensOf(this.playerMuzzleFlash);
      this.transientVfx.delete(this.playerMuzzleFlash);
      this.playerMuzzleFlash.destroy();
    }
    const flash = this.transientImage(profile[0], muzzle.x, muzzle.y, profile[1], profile[2], 72, { angle, originX: 0.039, originY: 0.5, endScale: 0.82 });
    this.playerMuzzleFlash = flash;
    flash?.setData('playerMuzzleVfx', { weaponId, muzzle: { ...muzzle }, spawn: projectileSpawn ? { ...projectileSpawn } : null, aim: { x: aimVector.x, y: aimVector.y } });
    if (weaponId === 'rocket') this.transientImage('fx-rocket-exhaust', muzzle.x - aimVector.x * 23, muzzle.y - aimVector.y * 23 + 4, 58, 34, 135, { angle, endScale: 0.86 });
    if (weaponId !== 'rocket') {
      const casing = this.transientImage('fx-shell-casing', owner.x - (owner.facing ?? 1) * 8, owner.y - 34, 18, 26, 330, { angle: Phaser.Math.Between(-40, 40), endScale: 0.82, depth: 70 });
      if (casing) this.tweens.add({ targets: casing, x: casing.x - (owner.facing ?? 1) * Phaser.Math.Between(18, 34), y: casing.y + 32, angle: casing.angle + Phaser.Math.Between(120, 240), duration: 300, ease: 'Quad.easeIn' });
    }
  }
  enemyMuzzleVfx(owner, projectile, direction = null, firedMuzzle = null) {
    if (!owner?.active || !projectile) return;
    const aim = new Phaser.Math.Vector2(direction?.x ?? projectile.body?.velocity?.x ?? (owner.flipX ? -1 : 1), direction?.y ?? projectile.body?.velocity?.y ?? 0).normalize();
    const muzzle = firedMuzzle ?? owner.muzzlePosition?.(aim, projectile.weaponId) ?? { x: owner.x, y: owner.y - 8 };
    const angle = Phaser.Math.RadToDeg(Math.atan2(aim.y, aim.x));
    if (projectile.weaponId === 'enemyGrenade') {
      const puff = this.transientImage('fx-smoke-puff', muzzle.x, muzzle.y, 46, 38, 150, { angle, alpha: 0.62, endScale: 1.12, depth: 67 });
      puff?.setTint(0xe2b56d);
      Audio.sfx(this, 'sfx-grenade', 0.12);
      return;
    }
    const size = projectile.weaponId === 'enemy-drone' ? [62, 42] : projectile.weaponId?.startsWith('mole-') || projectile.weaponId?.startsWith('crane-') ? [92, 56] : [72, 44];
    // Texture points right: rotate exactly once and pin its bright edge to the socket.
    const flash = this.transientImage('fx-muzzle-rifle', muzzle.x, muzzle.y, size[0], size[1], 105, { angle, originX: 0.039, originY: 0.5, endScale: 0.82, depth: 67 });
    flash?.setData('enemyMuzzleVfx', { weaponId: projectile.weaponId, muzzle: { ...muzzle }, aim: { x: aim.x, y: aim.y } });
    flash?.setTint(projectile.weaponId === 'enemy-drone' ? 0xff5688 : 0xff5a3d);
    Audio.sfx(this, 'sfx-rifle', 0.16);
  }
  enemyChargeVfx(owner, duration = 480) {
    if (!owner?.active) return;
    const muzzle = owner.muzzlePosition?.() ?? { x: owner.x, y: owner.y - 8 };
    const marker = this.transientImage('fx-warning-boss', muzzle.x, muzzle.y, 64, 44, duration, { alpha: 0.9, endScale: 1.28, depth: 68 });
    marker?.setTint(0xff5a3d);
  }
  worldWarning(x, y, texture = 'fx-warning-boss', duration = 520, callback = null) {
    const marker = this.add.image(x, y, texture).setDisplaySize(156, 92).setDepth(55).setAlpha(0.88);
    marker.setData('bossWarning', texture === 'fx-warning-boss');
    this.transientVfx.add(marker);
    this.tweens.add({ targets: marker, alpha: 0.3, scaleX: marker.scaleX * 1.1, scaleY: marker.scaleY * 1.1, yoyo: true, repeat: Math.max(0, Math.floor(duration / 150) - 1), duration: 75 });
    this.time.delayedCall(duration, () => { if (!marker.active) return; this.transientVfx.delete(marker); marker.destroy(); callback?.(); });
    return marker;
  }
  clearBossWarnings() { this.transientVfx.forEach((item) => { if (item?.getData?.('bossWarning')) { this.tweens.killTweensOf(item); this.transientVfx.delete(item); item.destroy(); } }); }
  updateTransportVfx(time) {
    const transport = this.core.transport;
    if (!transport?.active) return;
    const ratio = transport.health / Math.max(1, transport.maxHealth);
    if (Math.abs(transport.body?.velocity?.x ?? 0) > 2 && time >= this.nextTransportDustAt) {
      this.nextTransportDustAt = time + 520;
      this.transientImage('fx-dust-cloud', transport.x - 145, transport.y + 82, 92, 54, 420, { alpha: 0.55, depth: 29 });
    }
    if (ratio <= 0.5 && time >= this.nextTransportDamageVfxAt) {
      this.nextTransportDamageVfxAt = time + (ratio <= 0.25 ? 330 : 560);
      this.transientImage(ratio <= 0.25 ? 'fx-fire-burst' : 'fx-smoke-puff', transport.x + Phaser.Math.Between(-95, 70), transport.y - 70, ratio <= 0.25 ? 62 : 72, ratio <= 0.25 ? 74 : 70, 520, { alpha: 0.82, depth: 34 });
    }
  }
  explosion(x, y, radius = 120, options = {}) {
    const weaponId = options.weaponId ?? (radius >= 160 ? 'grenade' : radius >= 130 ? 'rocket' : null);
    const cfg = options.cameraShake ?? (weaponId && WEAPON_CONFIG[weaponId]?.cameraShake);
    this.cameras.main.shake(cfg?.durationMs ?? 120, cfg?.intensity ?? 0.012);
    const size = Math.min(radius * 2.2, 360);
    const variant = radius < 105 ? 'fx-explosion-small' : radius < 145 ? 'fx-explosion-medium' : 'fx-explosion-large';
    this.transientImage(variant, x, y, size, size, 300, { depth: 86, alpha: 0.82, angle: Phaser.Math.Between(-8, 8), endScale: 1.12 });
    const burst = this.add.sprite(x, y, 'fx-explosion-sequence').setDisplaySize(size * 0.82, size * 0.82).setDepth(91).setAlpha(0.88).setAngle(Phaser.Math.Between(-8, 8));
    burst.setData('depthLayer', 'foreground-core'); burst.play('fx:explosion'); burst.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => burst.destroy());
    this.time.delayedCall(120, () => !this.ended && this.transientImage('fx-smoke-puff', x - size * 0.12, y - size * 0.18, size * 0.48, size * 0.44, 820, { alpha: 0.48, depth: 37 }));
  }
  startArtillery(duration = 6000) { const end = this.time.now + duration; const timer = this.time.addEvent({ delay: 650, loop: true, callback: () => { if (this.time.now >= end || this.ended) return timer.remove(); const x = this.core.player.x + Phaser.Math.Between(240, 560); const y = GROUND_Y - 10; this.worldWarning(x, y, 'fx-warning-artillery', 420, () => { if (this.ended) return; this.core.pool.damageArea(x, y - 90, 150, 4, 'player', this.core.player); this.explosion(x, y - 90, 150); }); } }); }

  openPause() { if (this.ended || this.scene.isPaused()) return; this.controls.setVisible(false); Audio.pauseMusic(); this.scene.launch(SCENES.PAUSE); this.scene.pause(); }
  finish(cleared, reason) { if (this.ended) return; if (!cleared && !this.deathResumeSaved) this.saveDeathResume(reason); this.ended = true; Audio.stopMusic(); this.physics.pause(); this.controls.setVisible(false); if (cleared) SaveSystem.clearContinue(); const bonus = cleared ? Math.max(0, 540 - this.elapsedMs / 1000) * 20 + this.core.player.health * 25 : 0; this.scene.start(SCENES.RESULT, { score: Math.round(this.score + bonus), rescued: this.core.rescues.rescuedCount, elapsed: this.elapsedMs / 1000, cleared, reason }); }
  installDebugHook() { window.__IRON_COURIER_DEBUG__ = { get: () => ({ ...this.core.snapshot(), x: this.core.player.x, y: this.core.player.y, stage: this.stageName, score: this.score, elapsedMs: this.elapsedMs, over: this.ended, background: this.backgroundSystem.snapshot(), terrain: this.terrainArt.snapshot(), environmentProps: this.environmentProps.snapshot(), playerPresentation: { texture: this.core.player.texture?.key, animation: this.core.player.anims.currentAnim?.key, alpha: this.core.player.alpha, composite: this.core.player.getData('singleSpriteWeaponComposite'), runtimeWeaponOverlayCount: this.children.list.filter((child) => child.getData?.('completeHeldSilhouette')).length } }), advance: () => { const encounters = this.core.encounters; if (encounters.current?.pending) encounters.activateCurrent(true); encounters.current?.spawned.forEach((a) => a.active && a.takeDamage?.(9999, this.core.player)); }, teleport: (x) => { const player = this.core.player; const nextX = Phaser.Math.Clamp(x, 80, WORLD_W - 80); player.setPosition(nextX, player.y); player.body?.reset(nextX, player.y); } }; }
  cleanup() { document.removeEventListener('visibilitychange', this.visibilityHandler); this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutViewport, this); this.transientVfx?.forEach((item) => item?.destroy?.()); this.transientVfx?.clear(); this.controls?.destroy(); this.core?.pool?.removeAllListeners(); this.core?.rescues?.removeAllListeners(); this.core?.encounters?.removeAllListeners(); this.core?.removeAllListeners(); if (window.__GAME_LAYOUT_BOUNDS__?.scene === SCENES.GAME) clearLayout(); delete window.__IRON_COURIER_DEBUG__; }
}
