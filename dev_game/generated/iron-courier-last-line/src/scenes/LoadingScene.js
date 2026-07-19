import Phaser from 'phaser';
import { ASSETS, COLORS, H, SCENES, W } from '../constants.js';
import { label, panel } from '../ui.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { animationKey } from '../systems/AnimationRegistry.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    this.qaReleaseRequested = false;
    if (hold) window.__RELEASE_LOADING__ = () => { this.qaReleaseRequested = true; };
    const centerX = this.cameras.main.width / 2;
    const title = label(this, centerX, H * 0.37, 'LAST LINE // DEPLOYMENT', 35);
    const frame = panel(this, centerX, H * 0.52, 560, 56, 'ui-loading-frame');
    const bar = this.add.rectangle(centerX - 250, H * 0.52, 0, 12, COLORS.orange).setOrigin(0, 0.5); // asset-coverage-allow dynamic-loading-progress
    const status = label(this, centerX, H * 0.6, '전술 에셋 전개 중 0%', 19, '#8fe3df');
    publishLayout(this, [{ id: 'loading-title', obj: title }, { id: 'loading-progress', obj: frame }, { id: 'loading-status', obj: status }]);
    this.load.on('progress', (p) => { bar.width = 500 * p; status.setText(`전술 에셋 전개 중 ${Math.round(p * 100)}%`); });
    this.load.image(ASSETS.bgHarbor, '/assets/runtime/backgrounds/harbor-infiltration.webp');
    this.load.image(ASSETS.bgContainers, '/assets/runtime/backgrounds/container-escort.webp');
    this.load.image(ASSETS.bgBoss, '/assets/runtime/backgrounds/iron-mole-arena-aligned-r3.webp');
    for (const key of ['mid-harbor', 'mid-yard', 'mid-arena', 'near-harbor', 'near-yard', 'near-arena', 'ambience-harbor', 'ambience-yard', 'ambience-arena']) {
      this.load.image(`bg-${key}`, `/assets/runtime/backgrounds/zones/${key}.png`);
    }
    for (const key of ['ground-left', 'ground-center-a', 'ground-center-b', 'ground-right', 'ground-damaged', 'platform-catwalk', 'platform-support', 'ground-heavy']) {
      this.load.image(`terrain-${key}`, `/assets/runtime/environment/terrain/${key}.png`);
    }
    this.load.spritesheet(ASSETS.player, '/assets/runtime/characters/player/player-run.png', { frameWidth: 384, frameHeight: 384 });
    this.load.spritesheet('player-movement-actions', '/assets/runtime/characters/player/player-movement-actions.png', { frameWidth: 384, frameHeight: 384 });
    this.load.spritesheet('player-combat-actions', '/assets/runtime/characters/player/player-combat-actions.png', { frameWidth: 384, frameHeight: 384 });
    this.load.spritesheet('player-shoot-polished', '/assets/runtime/characters/player/player-shoot-polished.png', { frameWidth: 384, frameHeight: 384 });
    this.load.spritesheet('player-run-fire-actions', '/assets/runtime/characters/player/player-run-fire-actions.png', { frameWidth: 384, frameHeight: 384 });
    this.load.spritesheet('player-air-fire-actions', '/assets/runtime/characters/player/player-air-fire-actions.png', { frameWidth: 384, frameHeight: 384 });
    // Round 3 special weapons are complete single-sprite character+weapon
    // sheets. No independently positioned held-weapon overlay is loaded.
    for (const weapon of ['shotgun', 'rocket']) {
      for (const key of ['shoot-polished', 'run-fire-actions', 'air-fire-actions', 'crouch-actions']) {
        this.load.spritesheet(`player-${weapon}-${key}`, `/assets/runtime/characters/player/player-${weapon}-${key}.png`, { frameWidth: 384, frameHeight: 384 });
      }
    }
    for (const key of ['player-extension-a', 'player-extension-b', 'player-extension-c']) {
      this.load.spritesheet(key, `/assets/runtime/characters/player/${key}.png`, { frameWidth: 384, frameHeight: 384 });
    }
    for (const type of ['technician', 'medic', 'artillery']) {
      this.load.spritesheet(`rescue-${type}`, `/assets/runtime/characters/rescue/${type}-actions.png`, { frameWidth: 384, frameHeight: 512 });
    }
    for (const type of ['rifle', 'shield', 'grenadier', 'drone']) {
      this.load.spritesheet(`enemy-${type}-actions`, `/assets/runtime/characters/enemies/${type}-actions.png`, { frameWidth: 384, frameHeight: 384 });
    }
    for (const key of ['rifle-extension-a', 'rifle-extension-b', 'shield-extension-a', 'shield-extension-b', 'grenadier-extension-a', 'drone-extension-a']) {
      this.load.spritesheet(key, `/assets/runtime/characters/enemies/${key}.png`, { frameWidth: 384, frameHeight: 384 });
    }
    // ATLAS is packed into a trimmed 2:1 cell. Width and height therefore use
    // one uniform scale in runtime instead of crushing a square cell vertically.
    this.load.spritesheet('vehicle-actions', '/assets/runtime/characters/vehicle/transport-actions.png', { frameWidth: 512, frameHeight: 256 });
    for (const key of ['transport-extension-a', 'transport-extension-b', 'transport-extension-c']) {
      this.load.spritesheet(key, `/assets/runtime/characters/vehicle/${key}.webp`, { frameWidth: 512, frameHeight: 256 });
    }
    this.load.spritesheet('boss-crane-actions', '/assets/runtime/characters/bosses/crane-actions.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('boss-iron-mole-actions', '/assets/runtime/characters/bosses/iron-mole-actions.png', { frameWidth: 512, frameHeight: 512 });
    for (const key of ['fuel-intact', 'fuel-damaged', 'fuel-destroyed', 'container-lock-intact', 'container-lock-broken', 'bridge-joint-intact', 'bridge-joint-cracked', 'bridge-joint-destroyed', 'power-cell-intact', 'power-cell-damaged', 'power-cell-overload', 'crane-part-intact', 'crane-part-damaged', 'crane-part-detached', 'pickup-shotgun', 'pickup-rocket']) {
      this.load.image(key, `/assets/runtime/environment/destructibles/${key}.png`);
    }
    for (const key of ['projectile-rifle', 'projectile-shotgun', 'projectile-rocket', 'projectile-grenade', 'projectile-enemy-bolt', 'projectile-drone-pulse', 'projectile-boss-missile', 'projectile-crane-hook', 'projectile-shield-pistol', 'projectile-enemy-grenade', 'projectile-crane-burst', 'projectile-mole-cannon', 'projectile-mole-overdrive', 'projectile-artillery-shell']) {
      this.load.image(key, `/assets/runtime/weapons/projectiles/${key}.png`);
    }
    for (const key of ['joystick-base', 'joystick-knob', 'action-fire', 'action-jump', 'action-grenade', 'action-pause', 'hud-frame', 'menu-button-base', 'action-fire-pressed', 'action-fire-disabled', 'action-jump-pressed', 'action-jump-disabled', 'action-grenade-pressed', 'action-grenade-disabled']) {
      this.load.image(`ui-${key}`, `/assets/runtime/ui/${key}.png`);
    }
    this.load.image('ui-hud-top-bar-hd', '/assets/runtime/ui/hud-top-bar-hd.png');
    for (const key of ['weapon-rifle', 'weapon-shotgun', 'weapon-rocket', 'rescue-technician', 'rescue-medic', 'rescue-artillery', 'warning-plate', 'mission-complete', 'mission-failed']) {
      this.load.image(`ui-${key}`, `/assets/runtime/ui/icons/${key}.png`);
    }
    for (const key of ['shipping-crate', 'barricade', 'chain-fence', 'flood-lamp', 'pipe-cluster', 'warning-plate', 'cable-hook', 'debris']) {
      this.load.image(`prop-${key}`, `/assets/runtime/environment/props/prop-${key}.png`);
    }
    this.load.image('ui-pause', '/assets/runtime/ui/pause-button.png');
    this.load.image('fx-explosion', '/assets/runtime/vfx/fx-explosion.png');
    for (const type of ['player', 'enemy', 'atlas', 'crane', 'iron-mole']) this.load.image(`fx-contact-shadow-${type}`, `/assets/runtime/vfx/contact-shadow-${type}.png`);
    for (const key of ['impact-rifle', 'impact-shotgun', 'impact-rocket', 'impact-grenade', 'boss-shockwave', 'boss-metal-debris', 'boss-ember']) this.load.image(`fx-${key}`, `/assets/runtime/vfx/${key}.png`);
    for (const key of ['muzzle-rifle', 'muzzle-shotgun', 'muzzle-rocket', 'armor-spark', 'explosion-small', 'explosion-medium', 'explosion-large', 'smoke-puff', 'fire-burst', 'dust-cloud', 'shell-casing', 'rocket-exhaust', 'warning-artillery', 'warning-boss', 'rescue-flash', 'shield-impact']) {
      this.load.image(`fx-${key}`, `/assets/runtime/vfx/${key}.png`);
    }
    this.load.spritesheet('fx-explosion-sequence', '/assets/runtime/vfx/explosion-sequence.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('fx-hit-spark-sequence', '/assets/runtime/vfx/hit-spark-sequence.png', { frameWidth: 512, frameHeight: 512 });
    this.load.audio('music-home', '/assets/audio/home_loop.wav');
    this.load.audio('music-stage', '/assets/audio/stage_loop.wav');
    this.load.audio('music-boss', '/assets/audio/boss_loop.wav');
    for (const key of ['rifle', 'shotgun', 'rocket', 'grenade', 'hit', 'armor_hit', 'rescue', 'ui', 'boss_alert', 'victory']) {
      this.load.audio(`sfx-${key}`, `/assets/audio/${key}.wav`);
    }
  }
  create() {
    if (this.textures.exists(ASSETS.player) && !this.anims.exists('courier-run')) {
      const frameCount = this.textures.get(ASSETS.player).getFrameNames().filter((name) => name !== '__BASE').length;
      this.anims.create({ key: 'courier-run', frames: this.anims.generateFrameNumbers(ASSETS.player, { start: 0, end: Math.max(0, frameCount - 1) }), frameRate: 11, repeat: -1 });
      this.anims.create({ key: animationKey('player', 'run'), frames: this.anims.generateFrameNumbers(ASSETS.player, { start: 0, end: Math.max(0, frameCount - 1) }), frameRate: 11, repeat: -1 });
    }
    const playerStates = {
      // Only identity-locked canonical sheets are allowed in player states.
      // The legacy extensions remain loadable for audit, but never crossfade
      // into gameplay because their face/equipment palettes do not match.
      idle: { segments: [['player-movement-actions', 0, 1], ['player-movement-actions', 0, 1], ['player-movement-actions', 0, 1]], frameRate: 5, repeat: -1 },
      jump: { segments: [['player-movement-actions', 2, 2], ['player-movement-actions', 2, 2], ['player-movement-actions', 2, 2]], frameRate: 9, repeat: 0 },
      fall: { segments: [['player-movement-actions', 3, 3], ['player-movement-actions', 3, 3]], frameRate: 8, repeat: -1 },
      crouch: { segments: [['player-movement-actions', 4, 4], ['player-movement-actions', 4, 4]], frameRate: 5, repeat: -1 },
      // Held rifle fire while crouched uses the same identity-locked authored
      // silhouette, but needs its own animation key so presentation does not
      // remain stuck on the last run-fire or transition animation.
      'crouch-forward': { segments: [['player-movement-actions', 4, 4], ['player-movement-actions', 4, 4]], frameRate: 5, repeat: -1 },
      // A low running keyframe bridges the authored standing and kneeling
      // silhouettes. This removes the one-frame posture snap without using a
      // translucent duplicate character.
      'crouch-enter': { segments: [[ASSETS.player, 6, 6], ['player-movement-actions', 4, 4]], frameRate: 18, repeat: 0 },
      // Exit must begin from the crouched silhouette. The old order began on
      // a standing run frame and caused a visible one-frame teleport upward.
      'crouch-exit': { segments: [['player-movement-actions', 4, 4], [ASSETS.player, 6, 6]], frameRate: 18, repeat: 0 },
      // Dedicated rifle transitions preserve the forward gun/hand silhouette
      // while automatic fire is held through the posture change.
      'crouch-enter-fire': { segments: [['player-run-fire-actions', 6, 6], ['player-movement-actions', 4, 4]], frameRate: 18, repeat: 0 },
      'crouch-exit-fire': { segments: [['player-movement-actions', 4, 4], ['player-run-fire-actions', 6, 6]], frameRate: 18, repeat: 0 },
      grenade: { segments: Array.from({ length: 6 }, () => ['player-movement-actions', 5, 5]), frameRate: 12, repeat: 0 },
      melee: { segments: Array.from({ length: 6 }, () => ['player-movement-actions', 6, 6]), frameRate: 15, repeat: 0 },
      // Ground hits stay upright and recover into the canonical identity.
      // The old frame 7 was a horizontal airborne knockback pose and made the
      // grounded collider appear to drag a floating body.
      hurt: { segments: [['player-combat-actions', 0, 0], ['player-movement-actions', 1, 1], ['player-movement-actions', 0, 0]], frameRate: 16, repeat: 0 },
      'hurt-air': { segments: [['player-combat-actions', 6, 6], ['player-combat-actions', 6, 6]], frameRate: 10, repeat: 0 },
      'shoot-forward': { segments: [['player-shoot-polished', 0, 3]], frameRate: 18, repeat: 0 },
      'shoot-diagonal': { segments: [['player-shoot-polished', 4, 7]], frameRate: 18, repeat: 0 },
      'shoot-up': { segments: [['player-shoot-polished', 8, 11]], frameRate: 18, repeat: 0 },
      'run-fire-forward': { segments: [['player-run-fire-actions', 0, 7]], frameRate: 11, repeat: -1 },
      'run-fire-diagonal': { segments: [['player-run-fire-actions', 8, 15]], frameRate: 11, repeat: -1 },
      'run-fire-up': { segments: [['player-run-fire-actions', 16, 23]], frameRate: 11, repeat: -1 },
      'jump-fire-forward': { segments: [['player-air-fire-actions', 0, 0]], frameRate: 1, repeat: -1 },
      'fall-fire-forward': { segments: [['player-air-fire-actions', 1, 1]], frameRate: 1, repeat: -1 },
      'jump-fire-diagonal': { segments: [['player-air-fire-actions', 2, 2]], frameRate: 1, repeat: -1 },
      'fall-fire-diagonal': { segments: [['player-air-fire-actions', 3, 3]], frameRate: 1, repeat: -1 },
      'jump-fire-up': { segments: [['player-air-fire-actions', 4, 4]], frameRate: 1, repeat: -1 },
      'fall-fire-up': { segments: [['player-air-fire-actions', 5, 5]], frameRate: 1, repeat: -1 },
      death: { segments: [['player-combat-actions', 6, 7], ...Array.from({ length: 8 }, () => ['player-combat-actions', 7, 7])], frameRate: 7, repeat: 0 },
    };
    Object.entries(playerStates).forEach(([state, { segments, frameRate, repeat }]) => {
      const key = animationKey('player', state);
      const frames = segments.flatMap(([texture, start, end]) => this.anims.generateFrameNumbers(texture, { start, end }));
      if (!this.anims.exists(key)) this.anims.create({ key, frames, frameRate, repeat });
    });
    const specialStates = {
      'shoot-forward': ['shoot-polished', 0, 3, 18, 0],
      'shoot-diagonal': ['shoot-polished', 4, 7, 18, 0],
      'shoot-up': ['shoot-polished', 8, 11, 18, 0],
      'run-fire-forward': ['run-fire-actions', 0, 7, 11, -1],
      'run-fire-diagonal': ['run-fire-actions', 8, 15, 11, -1],
      'run-fire-up': ['run-fire-actions', 16, 23, 11, -1],
      'jump-fire-forward': ['air-fire-actions', 0, 0, 1, -1],
      'fall-fire-forward': ['air-fire-actions', 1, 1, 1, -1],
      'jump-fire-diagonal': ['air-fire-actions', 2, 2, 1, -1],
      'fall-fire-diagonal': ['air-fire-actions', 3, 3, 1, -1],
      'jump-fire-up': ['air-fire-actions', 4, 4, 1, -1],
      'fall-fire-up': ['air-fire-actions', 5, 5, 1, -1],
      'crouch-forward': ['crouch-actions', 0, 0, 1, -1],
      'crouch-diagonal': ['crouch-actions', 1, 1, 1, -1],
      'crouch-up': ['crouch-actions', 2, 2, 1, -1],
    };
    for (const weapon of ['shotgun', 'rocket']) {
      for (const [stateName, [sheet, start, end, frameRate, repeat]] of Object.entries(specialStates)) {
        const key = animationKey(`player-${weapon}`, stateName);
        const texture = `player-${weapon}-${sheet}`;
        const frames = this.anims.generateFrameNumbers(texture, { start, end });
        if (!this.anims.exists(key)) this.anims.create({ key, frames, frameRate, repeat });
      }
      const transitionFrames = {
        'crouch-enter': [
          { key: `player-${weapon}-run-fire-actions`, frame: 6 },
          { key: `player-${weapon}-crouch-actions`, frame: 0 },
        ],
        'crouch-exit': [
          { key: `player-${weapon}-crouch-actions`, frame: 0 },
          { key: `player-${weapon}-run-fire-actions`, frame: 6 },
        ],
      };
      for (const [stateName, frames] of Object.entries(transitionFrames)) {
        const key = animationKey(`player-${weapon}`, stateName);
        if (!this.anims.exists(key)) this.anims.create({ key, frames, frameRate: 18, repeat: 0 });
      }
    }
    const rescueStates = {
      technician: { 'bound-idle': [0, 1, 3, -1], struggle: [2, 3, 7, -1], freed: [4, 4, 6, 0], ability: [5, 5, 6, 0], exit: [6, 7, 9, -1] },
      medic: { 'bound-idle': [0, 1, 3, -1], signal: [2, 3, 7, -1], freed: [4, 4, 6, 0], ability: [5, 5, 6, 0], exit: [6, 7, 9, -1] },
      artillery: { 'bound-idle': [0, 1, 3, -1], radio: [2, 3, 7, -1], freed: [4, 4, 6, 0], ability: [5, 5, 6, 0], exit: [6, 7, 9, -1] },
    };
    Object.entries(rescueStates).forEach(([type, states]) => {
      Object.entries(states).forEach(([state, [start, end, frameRate, repeat]]) => {
        const key = animationKey(`rescue-${type}`, state);
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(`rescue-${type}`, { start, end }), frameRate, repeat });
      });
    });
    const state = (segments, frameRate, repeat = 0) => ({ segments, frameRate, repeat });
    const enemyStates = {
      rifle: {
        idle: state([['enemy-rifle-actions', 0, 1], ['rifle-extension-a', 0, 1], ['rifle-extension-b', 0, 1]], 6, -1),
        run: state([['enemy-rifle-actions', 2, 3], ['rifle-extension-a', 2, 5]], 11, -1),
        aim: state([['enemy-rifle-actions', 4, 4], ['rifle-extension-a', 6, 7], ['rifle-extension-b', 2, 3]], 10),
        fire: state([['enemy-rifle-actions', 5, 5], ['rifle-extension-a', 8, 8], ['rifle-extension-b', 4, 4]], 16),
        recoil: state([['rifle-extension-a', 9, 9], ['rifle-extension-b', 5, 5]], 13),
        hurt: state([['enemy-rifle-actions', 6, 6], ['rifle-extension-a', 10, 10], ['rifle-extension-b', 6, 7]], 12),
        death: state([['enemy-rifle-actions', 7, 7], ['rifle-extension-a', 11, 11], ['rifle-extension-b', 8, 11]], 9),
      },
      shield: {
        idle: state([['enemy-shield-actions', 0, 0], ['shield-extension-a', 0, 1]], 5, -1),
        march: state([['enemy-shield-actions', 1, 2], ['shield-extension-a', 2, 4], ['shield-extension-b', 0, 2]], 9, -1),
        guard: state([['enemy-shield-actions', 3, 3], ['shield-extension-a', 5, 6], ['shield-extension-b', 3, 4]], 7, -1),
        bash: state([['enemy-shield-actions', 4, 4], ['shield-extension-a', 7, 8], ['shield-extension-b', 5, 7]], 13),
        stagger: state([['enemy-shield-actions', 5, 5], ['shield-extension-a', 9, 9]], 9),
        'shield-break': state([['enemy-shield-actions', 6, 6], ['shield-extension-a', 10, 10], ['shield-extension-b', 8, 9]], 10),
        death: state([['enemy-shield-actions', 7, 7], ['shield-extension-a', 11, 11], ['shield-extension-b', 10, 11]], 8),
      },
      grenadier: {
        idle: state([['enemy-grenadier-actions', 0, 0], ['grenadier-extension-a', 0, 1]], 5, -1),
        run: state([['enemy-grenadier-actions', 1, 2], ['grenadier-extension-a', 2, 4]], 10, -1),
        windup: state([['enemy-grenadier-actions', 3, 3], ['grenadier-extension-a', 5, 6]], 9),
        throw: state([['enemy-grenadier-actions', 4, 4], ['grenadier-extension-a', 7, 8]], 13),
        recover: state([['enemy-grenadier-actions', 5, 5], ['grenadier-extension-a', 9, 9]], 8),
        hurt: state([['enemy-grenadier-actions', 6, 6], ['grenadier-extension-a', 10, 10]], 10),
        death: state([['enemy-grenadier-actions', 7, 7], ['grenadier-extension-a', 11, 11]], 8),
      },
      drone: {
        hover: state([['enemy-drone-actions', 0, 1], ['drone-extension-a', 0, 2]], 8, -1),
        'bank-left': state([['enemy-drone-actions', 2, 2], ['drone-extension-a', 3, 4]], 10),
        'bank-right': state([['enemy-drone-actions', 3, 3], ['drone-extension-a', 5, 6]], 10),
        charge: state([['enemy-drone-actions', 4, 4], ['drone-extension-a', 7, 8]], 11),
        fire: state([['enemy-drone-actions', 5, 5], ['drone-extension-a', 9, 9]], 14),
        hit: state([['enemy-drone-actions', 6, 6], ['drone-extension-a', 10, 10]], 11),
        explode: state([['enemy-drone-actions', 7, 7], ['drone-extension-a', 11, 11]], 9),
      },
    };
    Object.entries(enemyStates).forEach(([type, states]) => {
      Object.entries(states).forEach(([stateName, { segments, frameRate, repeat }]) => {
        const key = animationKey(`enemy-${type}`, stateName);
        const frames = segments.flatMap(([texture, start, end]) => this.anims.generateFrameNumbers(texture, { start, end }));
        if (!this.anims.exists(key)) this.anims.create({ key, frames, frameRate, repeat });
      });
    });
    if (!this.anims.exists('fx:explosion')) this.anims.create({ key: 'fx:explosion', frames: this.anims.generateFrameNumbers('fx-explosion-sequence', { start: 0, end: 7 }), frameRate: 18, repeat: 0 });
    if (!this.anims.exists('fx:hit-spark')) this.anims.create({ key: 'fx:hit-spark', frames: this.anims.generateFrameNumbers('fx-hit-spark-sequence', { start: 0, end: 7 }), frameRate: 22, repeat: 0 });
    const transportStates = {
      idle: state([['vehicle-actions', 0, 0], ['transport-extension-a', 0, 2]], 5, -1),
      drive: state([['vehicle-actions', 1, 2], ['transport-extension-a', 3, 8]], 10, -1),
      hit: state([['vehicle-actions', 3, 3], ['transport-extension-a', 9, 9]], 12),
      damaged: state([['vehicle-actions', 4, 4], ['transport-extension-a', 10, 15], ['transport-extension-b', 0, 0]], 7, -1),
      critical: state([['vehicle-actions', 5, 5], ['transport-extension-b', 1, 9]], 7, -1),
      repair: state([['vehicle-actions', 6, 6], ['transport-extension-b', 10, 14]], 9),
      destroyed: state([['transport-extension-c', 0, 9], ['transport-extension-b', 15, 15], ['vehicle-actions', 7, 7]], 8),
    };
    Object.entries(transportStates).forEach(([stateName, { segments, frameRate, repeat }]) => {
      const key = animationKey('transport', stateName);
      const frames = segments.flatMap(([texture, start, end]) => this.anims.generateFrameNumbers(texture, { start, end }));
      if (!this.anims.exists(key)) this.anims.create({ key, frames, frameRate, repeat });
    });
    const machineStates = {
      'boss-crane': { idle: ['boss-crane-actions', 0, 0, 4, -1], burst: ['boss-crane-actions', 1, 1, 9, 0], 'hook-launch': ['boss-crane-actions', 2, 2, 8, 0], 'hook-return': ['boss-crane-actions', 3, 3, 8, 0], stagger: ['boss-crane-actions', 4, 4, 8, 0], damaged: ['boss-crane-actions', 5, 5, 5, -1], death: ['boss-crane-actions', 7, 7, 5, 0] },
      'boss-iron-mole': { 'phase-1': ['boss-iron-mole-actions', 0, 1, 5, -1], 'phase-2': ['boss-iron-mole-actions', 2, 3, 5, -1], 'phase-3': ['boss-iron-mole-actions', 4, 4, 6, -1], 'armor-break': ['boss-iron-mole-actions', 5, 5, 8, 0], 'core-exposed': ['boss-iron-mole-actions', 4, 4, 6, -1], hit: ['boss-iron-mole-actions', 6, 6, 9, 0], destroyed: ['boss-iron-mole-actions', 7, 7, 5, 0] },
    };
    Object.entries(machineStates).forEach(([family, states]) => Object.entries(states).forEach(([state, [texture, start, end, frameRate, repeat]]) => {
      const key = animationKey(family, state);
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(texture, { start, end }), frameRate, repeat });
    }));
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold && this.qaReleaseRequested) { delete window.__RELEASE_LOADING__; this.scene.start(SCENES.HOME); }
    else if (hold) window.__RELEASE_LOADING__ = () => { delete window.__RELEASE_LOADING__; this.scene.start(SCENES.HOME); };
    else this.time.delayedCall(350, () => this.scene.start(SCENES.HOME));
  }
}
