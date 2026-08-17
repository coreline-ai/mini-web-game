import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { IMAGE_ASSETS, AUDIO_ASSETS } from '../constants/gameKeys.js';
import LoadingUI from '../ui/LoadingUI.js';

import { publishLayout } from '../systems/LayoutRegistry.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    configureLogicalScene(this);
    this.loadingUI = new LoadingUI(this);
    this.load.on('progress', (v) => this.loadingUI.setProgress(v));
    IMAGE_ASSETS.forEach(([key, path]) => this.load.image(key, path));
    if (SPEC.audio?.enabled) AUDIO_ASSETS.forEach(([key, path]) => this.load.audio(key, path));
  }
  create() {
    const items = (this.loadingUI && this.loadingUI.title) ? [{ id: 'loading', obj: this.loadingUI.title }] : [];
    publishLayout(this, items);
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }
  }
}
