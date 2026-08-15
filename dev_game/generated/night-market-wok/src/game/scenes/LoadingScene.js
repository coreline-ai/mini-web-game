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
    this.load.image(ASSET_KEYS.player, 'characters/player.webp');
    this.load.image(ASSET_KEYS.hazard, 'enemies/hazard.webp');
    this.load.image(ASSET_KEYS.collectible, 'items/collectible.webp');
    this.load.image('ui_frame', 'ui/btn-frame.webp');
    this.load.image('ui_pause', 'ui/btn-pause.webp');
    this.load.image('ui_order_ticket', 'ui/order-ticket.webp');
    this.load.image('fx_hit', 'effects/fx-hit.webp');
    this.load.image('fx_collect', 'effects/fx-collect.webp');
    this.load.image('fx_combo', 'effects/fx-combo.webp');
    this.load.image('bg_0', 'backgrounds/stage-1.webp');
    this.load.image('bg_1', 'backgrounds/stage-2.webp');
    this.load.image('bg_2', 'backgrounds/stage-3.webp');
    // Cooking-specific art. Loaded by explicit key because the generic asset wiring only
    // knows the arcade roles (player/hazard/collectible) and cannot infer ingredients.
    for (const id of ['noodle', 'broth', 'scallion', 'pork', 'egg']) {
      this.load.image(`ing_${id}`, `items/ing-${id}.webp`);
    }
    for (const id of ['regular', 'hurried', 'grumpy']) {
      this.load.image(`cust_${id}`, `characters/cust-${id}.webp`);
    }
    if (SPEC.audio?.enabled) {
      this.load.audio(ASSET_KEYS.sfxStart, SPEC.audio.sfx.start);
      this.load.audio(ASSET_KEYS.sfxHit, SPEC.audio.sfx.hit);
      this.load.audio(ASSET_KEYS.sfxCollect, SPEC.audio.sfx.score);
      this.load.audio(ASSET_KEYS.sfxGameOver, SPEC.audio.sfx.gameOver);
      this.load.audio(ASSET_KEYS.musicGameplay, SPEC.audio.music.gameplay);
    }
  }
  create() {
    // The fill sits inside its own track — a declared nesting, not an overlap defect.
    const items = this.loadingUI ? [{ id: 'loading-title', obj: this.loadingUI.title }, { id: 'loading-status', obj: this.loadingUI.tip }, { id: 'loading-bar-back', obj: this.loadingUI.barBack, allowOverlapWith: ['loading-bar-fill', 'loading-percent'] }, { id: 'loading-bar-fill', obj: this.loadingUI.bar, allowOverlapWith: ['loading-bar-back', 'loading-percent'] }, { id: 'loading-percent', obj: this.loadingUI.percent, allowOverlapWith: ['loading-bar-back', 'loading-bar-fill'] }] : [];
    publishLayout(this, items, { requiredIds: items.map((item) => item.id) });
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }
  }
}
