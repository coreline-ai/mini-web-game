import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS, AUDIO_PATHS, BACKGROUND_PATHS, IMAGE_PATHS } from '../constants/gameKeys.js';
import LoadingUI from '../ui/LoadingUI.js';

function qaHoldLoadingEnabled() {
  try { return new URLSearchParams(window.location.search).has('qaHoldLoading'); } catch { return false; }
}

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    const ui = new LoadingUI(this);
    this.load.on('progress', (v) => ui.setProgress(v));
    for (const [name, path] of Object.entries(IMAGE_PATHS)) {
      this.load.image(ASSET_KEYS[name], path);
    }
    for (const [name, path] of Object.entries(BACKGROUND_PATHS)) {
      this.load.image(ASSET_KEYS[name], path);
    }
    if (SPEC.audio?.enabled) {
      for (const [name, path] of Object.entries(AUDIO_PATHS)) {
        this.load.audio(ASSET_KEYS[name], path);
      }
    }
  }
  create() {
    const startHome = () => {
      if (typeof window !== 'undefined') delete window.__RELEASE_LOADING__;
      this.scene.start(SCENES.HOME);
    };
    if (qaHoldLoadingEnabled()) {
      window.__RELEASE_LOADING__ = startHome;
      return;
    }
    this.time.delayedCall(320, startHome);
  }
}
