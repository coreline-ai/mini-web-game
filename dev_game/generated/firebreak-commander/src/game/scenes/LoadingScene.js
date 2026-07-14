import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import LoadingUI from '../ui/LoadingUI.js';

import { publishLayout } from '../systems/LayoutRegistry.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    configureLogicalScene(this);
    this.loadingUI = new LoadingUI(this);
    this.load.on('progress', (v) => this.loadingUI.setProgress(v));
    this.load.image('bg_0', 'backgrounds/stage-1-dry-front.webp');
    this.load.image('bg_1', 'backgrounds/stage-2-wind-shift.webp');
    this.load.image('bg_2', 'backgrounds/stage-3-ember-night.webp');
    this.load.image(ASSET_KEYS.helicopter, 'images/production/response-helicopter.png');
    this.load.image(ASSET_KEYS.engine, 'images/production/fire-engine.png');
    this.load.image(ASSET_KEYS.dozer, 'images/production/firebreak-dozer.png');
    this.load.image(ASSET_KEYS.village, 'images/production/pine-ridge-village.png');
    this.load.image(ASSET_KEYS.substation, 'images/production/power-substation.png');
    this.load.image(ASSET_KEYS.refuge, 'images/production/wildlife-refuge.png');
    this.load.image(ASSET_KEYS.fxFire, 'images/production/fx-fire.png');
    this.load.image(ASSET_KEYS.fxWater, 'images/production/fx-water.png');
    this.load.image(ASSET_KEYS.fxSmoke, 'images/production/fx-smoke.png');
    this.load.image(ASSET_KEYS.uiWind, 'images/production/ui-wind.png');
    this.load.image(ASSET_KEYS.uiPause, 'images/production/ui-pause.png');
    this.load.image(ASSET_KEYS.uiContainment, 'images/production/ui-containment.png');
    if (SPEC.audio?.enabled) {
      this.load.audio(ASSET_KEYS.sfxStart, SPEC.audio.sfx.start);
      this.load.audio(ASSET_KEYS.sfxFirebreak, SPEC.audio.sfx.firebreak || SPEC.audio.sfx.score);
      this.load.audio(ASSET_KEYS.sfxWater, SPEC.audio.sfx.water || SPEC.audio.sfx.score);
      this.load.audio(ASSET_KEYS.sfxEngine, SPEC.audio.sfx.engine || SPEC.audio.sfx.start);
      this.load.audio(ASSET_KEYS.sfxWarning, SPEC.audio.sfx.warning || SPEC.audio.sfx.hit);
      this.load.audio(ASSET_KEYS.sfxIgnite, SPEC.audio.sfx.hit);
      this.load.audio(ASSET_KEYS.sfxWindShift, SPEC.audio.sfx.windShift || SPEC.audio.sfx.warning || SPEC.audio.sfx.hit);
      this.load.audio(ASSET_KEYS.sfxExtinguish, SPEC.audio.sfx.extinguish || SPEC.audio.sfx.score);
      this.load.audio(ASSET_KEYS.sfxStageClear, SPEC.audio.sfx.stageClear || SPEC.audio.sfx.extinguish || SPEC.audio.sfx.score);
      this.load.audio(ASSET_KEYS.sfxGameOver, SPEC.audio.sfx.gameOver);
      this.load.audio(ASSET_KEYS.musicHome, SPEC.audio.music.home);
      this.load.audio(ASSET_KEYS.musicGameplay, SPEC.audio.music.gameplay);
    }
  }
  create() {
    const items = this.loadingUI ? [
      { id: 'loading-title', obj: this.loadingUI.title },
      { id: 'loading-status', obj: this.loadingUI.tip },
      { id: 'loading-bar-back', obj: this.loadingUI.barBack, allowOverlap: true },
      { id: 'loading-bar-fill', obj: this.loadingUI.bar, allowOverlap: true },
      { id: 'loading-percent', obj: this.loadingUI.percent },
    ] : [];
    publishLayout(this, items);
    this.time.delayedCall(60, () => publishLayout(this, items));
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }
  }
}
