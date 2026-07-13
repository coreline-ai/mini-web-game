import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS, AUDIO_PATHS, IMAGE_PATHS, SPRITESHEET_PATHS } from '../constants/gameKeys.js';
import LoadingUI from '../ui/LoadingUI.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    this.loadingUI = new LoadingUI(this);
    this.load.on('progress', (v) => this.loadingUI.setProgress(v));
    SPRITESHEET_PATHS.forEach(({ key, path, frameWidth, frameHeight }) => {
      this.load.spritesheet(key, path, { frameWidth, frameHeight });
    });
    Object.entries(IMAGE_PATHS).forEach(([key, path]) => this.load.image(key, path));
    if (SPEC.audio?.enabled) {
      Object.entries(AUDIO_PATHS).forEach(([key, path]) => this.load.audio(key, path));
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
