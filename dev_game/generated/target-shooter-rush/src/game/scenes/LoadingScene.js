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
    this.load.image(ASSET_KEYS.player, 'images/production/characters/player_blaster.png');
    this.load.image(ASSET_KEYS.hazard, 'images/production/targets/bullseye_target.png');
    this.load.image(ASSET_KEYS.collectible, 'images/production/effects/hit_burst.png');
    this.load.image(ASSET_KEYS.target, 'images/production/targets/bullseye_target.png');
    this.load.image(ASSET_KEYS.crosshair, 'images/production/ui/crosshair.png');
    this.load.image(ASSET_KEYS.hitBurst, 'images/production/effects/hit_burst.png');
    this.load.image(ASSET_KEYS.missBurst, 'images/production/effects/hit_burst.png');
    this.load.image('ui_pause', 'images/production/ui/button_pause.png');
    this.load.image(ASSET_KEYS.bg0, 'images/production/backgrounds/gallery_day.png');
    this.load.image(ASSET_KEYS.bg1, 'images/production/backgrounds/gallery_night.png');
    this.load.image(ASSET_KEYS.bg2, 'images/production/backgrounds/gallery_rush.png');
    if (SPEC.audio?.enabled) {
      this.load.audio(ASSET_KEYS.sfxStart, SPEC.audio.sfx.start);
      this.load.audio(ASSET_KEYS.sfxHit, SPEC.audio.sfx.hit);
      this.load.audio(ASSET_KEYS.sfxCollect, SPEC.audio.sfx.score);
      this.load.audio(ASSET_KEYS.sfxGameOver, SPEC.audio.sfx.gameOver);
      this.load.audio(ASSET_KEYS.musicGameplay, SPEC.audio.music.gameplay);
    }
  }
  create() {
    if (this.textures.exists(ASSET_KEYS.bg0)) {
      const bg = this.add.image(SPEC.canvas.width / 2, SPEC.canvas.height / 2, ASSET_KEYS.bg0).setDepth(-30);
      bg.setScale(Math.max(SPEC.canvas.width / bg.width, SPEC.canvas.height / bg.height));
    }
    const items = [];
    if (this.textures.exists(ASSET_KEYS.target)) {
      this.loadingEmblem = this.add.image(SPEC.canvas.width / 2, SPEC.canvas.height * 0.23, ASSET_KEYS.target)
        .setDisplaySize(92, 92)
        .setAlpha(0.96)
        .setDepth(4);
      items.push({ id: 'loading-emblem', obj: this.loadingEmblem });
    }
    if (this.loadingUI && this.loadingUI.title) items.push({ id: 'loading-title', obj: this.loadingUI.title });
    publishLayout(this, items, { requiredIds: ['loading-title'] });
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }
  }
}
