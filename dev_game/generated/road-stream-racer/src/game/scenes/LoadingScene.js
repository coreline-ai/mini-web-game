import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import LoadingUI from '../ui/LoadingUI.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    this.loadingUI = new LoadingUI(this);
    this.load.on('progress', (v) => this.loadingUI.setProgress(v));
    this.load.image(ASSET_KEYS.stage1, 'backgrounds/stage-1.png');
    this.load.image(ASSET_KEYS.stage2, 'backgrounds/stage-2.png');
    this.load.image(ASSET_KEYS.stage3, 'backgrounds/stage-3.png');
    this.load.image(ASSET_KEYS.roadStraight1, 'roads/road-straight-1.png');
    this.load.image(ASSET_KEYS.roadStraight2, 'roads/road-straight-2.png');
    this.load.image(ASSET_KEYS.roadConstruction1, 'roads/road-construction-1.png');
    this.load.image(ASSET_KEYS.roadConstruction2, 'roads/road-construction-2.png');
    this.load.image(ASSET_KEYS.roadCrosswalk1, 'roads/road-crosswalk-1.png');
    this.load.image(ASSET_KEYS.roadFlat, 'roads/road-flat-seamless.png');
    this.load.image(ASSET_KEYS.roadFlatLoop, 'roads/road-flat-loop-1080x1920.png');
    this.load.image(ASSET_KEYS.forestSideOverlay, 'scenery/forest-side-overlay-1080x1920.png');
    this.load.spritesheet(ASSET_KEYS.player, 'characters/player-car.png', { frameWidth: 512, frameHeight: 512 });
    this.load.image(ASSET_KEYS.trafficBlue, 'vehicles/traffic-blue.png');
    this.load.image(ASSET_KEYS.trafficYellow, 'vehicles/traffic-yellow.png');
    this.load.image(ASSET_KEYS.trafficTruck, 'vehicles/traffic-truck.png');
    this.load.image(ASSET_KEYS.cone, 'obstacles/cone.png');
    this.load.image(ASSET_KEYS.barricade, 'obstacles/barricade.png');
    this.load.spritesheet(ASSET_KEYS.coin, 'items/coin.png', { frameWidth: 512, frameHeight: 512 });
    this.load.image(ASSET_KEYS.boostPad, 'items/boost-pad.png');
    this.load.image(ASSET_KEYS.fxHit, 'effects/fx-hit.png');
    this.load.image(ASSET_KEYS.fxCollect, 'effects/fx-collect.png');
    this.load.image(ASSET_KEYS.fxBoost, 'effects/fx-boost.png');
    this.load.image(ASSET_KEYS.uiFrame, 'ui/btn-frame.png');
    this.load.image(ASSET_KEYS.uiPause, 'ui/btn-pause.png');
    this.load.image(ASSET_KEYS.uiBoost, 'ui/btn-boost.png');

    // Premium Neon GUI Assets
    this.load.image('racer_ui_header', 'ui/racer_ui_header.png');
    this.load.image('racer_ui_home', 'ui/racer_ui_home.png');
    this.load.image('racer_ui_pause', 'ui/racer_ui_pause.png');
    this.load.image('racer_icon_coin', 'ui/racer_icon_coin.png');
    this.load.image('racer_icon_speed', 'ui/racer_icon_speed.png');
    this.load.image('racer_icon_level', 'ui/racer_icon_level.png');
    if (SPEC.audio?.enabled) {
      this.load.audio(ASSET_KEYS.sfxStart, SPEC.audio.sfx.start);
      this.load.audio(ASSET_KEYS.sfxHit, SPEC.audio.sfx.hit);
      this.load.audio(ASSET_KEYS.sfxCollect, SPEC.audio.sfx.score);
      this.load.audio(ASSET_KEYS.sfxGameOver, SPEC.audio.sfx.gameOver);
      this.load.audio(ASSET_KEYS.musicGameplay, SPEC.audio.music.gameplay);
    }
  }
  create() {
    if (!this.anims.exists('player_drive')) {
      this.anims.create({
        key: 'player_drive',
        frames: this.anims.generateFrameNumbers(ASSET_KEYS.player, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists('coin_spin')) {
      this.anims.create({
        key: 'coin_spin',
        frames: this.anims.generateFrameNumbers(ASSET_KEYS.coin, { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1,
      });
    }
    const items = (this.loadingUI && this.loadingUI.title) ? [{ id: 'loading', obj: this.loadingUI.title }] : [];
    publishLayout(this, items);
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }
  }
}
