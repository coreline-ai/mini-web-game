import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { AUDIO_PATHS, IMAGE_PATHS, SPRITESHEET_PATHS } from '../constants/gameKeys.js';
import LoadingUI from '../ui/LoadingUI.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    this.loadingUI = new LoadingUI(this);
    this.load.on('progress', (v) => this.loadingUI.setProgress(v));
    for (const [key, cfg] of Object.entries(SPRITESHEET_PATHS)) {
      this.load.spritesheet(key, cfg.path, { frameWidth: cfg.frameWidth, frameHeight: cfg.frameHeight });
    }
    for (const [key, path] of Object.entries(IMAGE_PATHS)) this.load.image(key, path);
    if (SPEC.audio?.enabled) {
      for (const [key, path] of Object.entries(AUDIO_PATHS)) this.load.audio(key, path);
    }
  }
  create() {
    const items = (this.loadingUI && this.loadingUI.title) ? [{ id: 'loading', obj: this.loadingUI.title }] : [];
    publishLayout(this, items);
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }
  }
}
