import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import LoadingUI from '../ui/LoadingUI.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    this.loadingUI = new LoadingUI(this);
    this.loadingUI.tip.setText('전초 기지 연결 중');
    this.load.on('progress', (v) => this.loadingUI.setProgress(v));
    // Keep the first external visit small. Combat media is deferred until the
    // player starts a run, so the public Quick Tunnel reaches the home screen
    // instead of waiting for the entire 20 MB battle pack.
    this.load.image('bg_0', 'backgrounds/bg-dawn.jpg');
    this.load.image(ASSET_KEYS.playerPreview, 'sprites/player/player-gunner-preview.png');
    this.load.spritesheet(ASSET_KEYS.weapons, 'sprites/player/weapon-models.png', { frameWidth: 256, frameHeight: 384 });
    if (SPEC.audio?.enabled) this.load.audio(ASSET_KEYS.sfxStart, 'audio/ui-start.wav');
  }
  create() {
    const items = this.loadingUI ? [{ id: 'loading-title', obj: this.loadingUI.title }, { id: 'loading-status', obj: this.loadingUI.tip }, { id: 'loading-bar-back', obj: this.loadingUI.barBack }, { id: 'loading-bar-fill', obj: this.loadingUI.bar }, { id: 'loading-percent', obj: this.loadingUI.percent }] : [];
    publishLayout(this, items, { requiredIds: items.map((item) => item.id) });
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }
  }
}
