import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import LoadingUI from '../ui/LoadingUI.js';
import { publishLayout } from '../systems/LayoutRegistry.js';

const ANIMATIONS = [
  ['player_move', ASSET_KEYS.player, 12],
  ['walker_move', ASSET_KEYS.walker, 8],
  ['runner_move', ASSET_KEYS.runner, 13],
  ['brute_move', ASSET_KEYS.brute, 6],
  ['titan_move', ASSET_KEYS.titan, 5],
];

export default class BattleLoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.BATTLE_LOADING); }

  init(data = {}) { this.destination = data.destination || SCENES.GAME; }

  queueImage(key, url) { if (!this.textures.exists(key)) this.load.image(key, url); }
  queueSheet(key, url, config) { if (!this.textures.exists(key)) this.load.spritesheet(key, url, config); }
  queueAudio(key, url) { if (!this.cache.audio.exists(key)) this.load.audio(key, url); }

  preload() {
    this.loadingUI = new LoadingUI(this);
    this.loadingUI.tip.setText(this.destination === SCENES.ARSENAL ? '무기고 데이터 동기화' : '전투 구역 전개 중');
    this.load.on('progress', (value) => this.loadingUI.setProgress(value));

    this.queueSheet(ASSET_KEYS.player, 'sprites/player/player-gunner-motion.png', { frameWidth: 512, frameHeight: 512 });
    this.queueImage(ASSET_KEYS.playerPreview, 'sprites/player/player-gunner-preview.png');
    this.queueSheet(ASSET_KEYS.weapons, 'sprites/player/weapon-models.png', { frameWidth: 256, frameHeight: 384 });
    this.queueSheet(ASSET_KEYS.walker, 'sprites/enemies/zombie-walker-motion.png', { frameWidth: 512, frameHeight: 512 });
    this.queueSheet(ASSET_KEYS.runner, 'sprites/enemies/zombie-runner-motion.png', { frameWidth: 512, frameHeight: 512 });
    this.queueSheet(ASSET_KEYS.brute, 'sprites/enemies/zombie-brute-motion.png', { frameWidth: 512, frameHeight: 512 });
    this.queueSheet(ASSET_KEYS.titan, 'sprites/boss/titan-motion.png', { frameWidth: 512, frameHeight: 512 });
    this.queueImage(ASSET_KEYS.uiPause, 'ui/ui-pause.png');
    this.queueImage(ASSET_KEYS.uiWeaponCard, 'ui/ui-weapon-card.png');
    this.queueImage(ASSET_KEYS.fxInfectedBurst, 'fx/fx-infected-burst.png');
    ['dawn', 'day', 'dusk', 'night', 'bloodmoon'].forEach((name, index) => this.queueImage(`bg_${index}`, `backgrounds/bg-${name}.jpg`));

    if (SPEC.audio?.enabled) {
      this.queueAudio(ASSET_KEYS.sfxStart, 'audio/ui-start.wav');
      this.queueAudio(ASSET_KEYS.sfxGatling, 'audio/gatling.wav');
      this.queueAudio(ASSET_KEYS.sfxShotgun, 'audio/scatter.wav');
      this.queueAudio(ASSET_KEYS.sfxArc, 'audio/arc.wav');
      this.queueAudio(ASSET_KEYS.sfxRocket, 'audio/rocket.wav');
      this.queueAudio(ASSET_KEYS.sfxRail, 'audio/rail.wav');
      this.queueAudio(ASSET_KEYS.sfxHit, 'audio/impact.wav');
      this.queueAudio(ASSET_KEYS.sfxExplosion, 'audio/explosion.wav');
      this.queueAudio(ASSET_KEYS.sfxCollect, 'audio/core-pickup.wav');
      this.queueAudio(ASSET_KEYS.sfxOverheat, 'audio/overheat.wav');
      this.queueAudio(ASSET_KEYS.sfxZombie, 'audio/zombie.wav');
      this.queueAudio(ASSET_KEYS.sfxGameOver, 'audio/last-stand.wav');
      this.queueAudio(ASSET_KEYS.musicGameplay, 'audio/survival-loop.wav');
    }
  }

  create() {
    ANIMATIONS.forEach(([key, texture, frameRate]) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(texture, { start: 0, end: 3 }), frameRate, repeat: -1 });
    });
    const items = [{ id: 'loading-title', obj: this.loadingUI.title }, { id: 'loading-status', obj: this.loadingUI.tip }, { id: 'loading-bar-back', obj: this.loadingUI.barBack }, { id: 'loading-bar-fill', obj: this.loadingUI.bar }, { id: 'loading-percent', obj: this.loadingUI.percent }];
    publishLayout(this, items, { requiredIds: items.map((item) => item.id) });
    this.time.delayedCall(120, () => this.scene.start(this.destination));
  }
}
