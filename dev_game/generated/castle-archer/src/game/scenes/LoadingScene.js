import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { AUDIO_PATHS, IMAGE_PATHS, SPRITESHEET_PATHS } from '../constants/gameKeys.js';
import LoadingUI from '../ui/LoadingUI.js';
import { applyLogicalCamera } from '../constants/renderScale.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    applyLogicalCamera(this);
    this.loadingUI = new LoadingUI(this);
    this.load.on('progress', (v) => this.loadingUI.setProgress(v));
    this.load.on('loaderror', (file) => {
      const key = file?.key || file?.src || 'unknown';
      this.loadingUI?.setError?.(`Asset retry needed: ${key}`);
      console.warn('[Castle Archer] asset load failed', key);
    });
    SPRITESHEET_PATHS.forEach(({ key, path, frameWidth, frameHeight }) => {
      this.load.spritesheet(key, path, { frameWidth, frameHeight });
    });
    Object.entries(IMAGE_PATHS).forEach(([key, path]) => this.load.image(key, path));
    if (SPEC.audio?.enabled) {
      Object.entries(AUDIO_PATHS).forEach(([key, path]) => this.load.audio(key, path));
    }
  }
  create() {
    applyLogicalCamera(this);
    const items = (this.loadingUI && this.loadingUI.title) ? [{ id: 'loading', obj: this.loadingUI.title }] : [];
    publishLayout(this, items);
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }
  }
}
