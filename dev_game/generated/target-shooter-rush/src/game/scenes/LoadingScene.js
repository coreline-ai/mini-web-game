import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS, AUDIO_PATHS, BACKGROUND_PATHS, IMAGE_PATHS } from '../constants/gameKeys.js';
import { strokePx, su } from '../constants/tuning.js';
import LoadingUI from '../ui/LoadingUI.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    this.loadingUI = new LoadingUI(this);
    this.load.on('progress', (v) => this.loadingUI.setProgress(v));
    IMAGE_PATHS.forEach(({ key, path }) => this.load.image(key, path));
    BACKGROUND_PATHS.forEach(({ key, path }) => this.load.image(key, path));
    if (SPEC.audio?.enabled) {
      AUDIO_PATHS.forEach(({ key, specPath }) => this.load.audio(key, SPEC.audio.sfx[specPath]));
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
      this.loadingEmblemPlate = this.add.ellipse(SPEC.canvas.width / 2, SPEC.canvas.height * 0.23, su(124), su(124), 0x07121d, 0.72)
        .setStrokeStyle(strokePx(3), 0x57d8ff, 0.82)
        .setDepth(3);
      this.loadingEmblem = this.add.image(SPEC.canvas.width / 2, SPEC.canvas.height * 0.23, ASSET_KEYS.target)
        .setDisplaySize(su(92), su(92))
        .setAlpha(0.96)
        .setDepth(4);
      items.push({ id: 'loading-emblem-plate', obj: this.loadingEmblemPlate, allowOverlap: true });
      items.push({ id: 'loading-emblem', obj: this.loadingEmblem });
    }
    if (this.loadingUI && this.loadingUI.title) items.push({ id: 'loading-title', obj: this.loadingUI.title });
    publishLayout(this, items, { requiredIds: ['loading-title'] });
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }
  }
}
