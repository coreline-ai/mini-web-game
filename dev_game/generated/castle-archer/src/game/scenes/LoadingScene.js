import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
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
    this.load.spritesheet(ASSET_KEYS.player, 'characters/player.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet(ASSET_KEYS.enemyBasic, 'enemies/goblin-basic-sheet.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet(ASSET_KEYS.enemyShield, 'enemies/goblin-shield-sheet.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet(ASSET_KEYS.enemyRunner, 'enemies/goblin-runner-sheet.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet(ASSET_KEYS.enemyBrute, 'enemies/orc-brute-sheet.png', { frameWidth: 256, frameHeight: 256 });
    this.load.image(ASSET_KEYS.hazard, 'enemies/hazard.png');
    this.load.image(ASSET_KEYS.collectible, 'items/collectible.png');
    this.load.image('arrow', 'items/arrow.png');
    this.load.image('ui_frame', 'ui/btn-frame.png');
    this.load.image('ui_pause', 'ui/btn-pause.png');
    this.load.image('ui_heart', 'ui/heart.png');
    this.load.image(ASSET_KEYS.iconSoundOn, 'ui/icon-sound-on.png');
    this.load.image(ASSET_KEYS.iconSoundOff, 'ui/icon-sound-off.png');
    this.load.image(ASSET_KEYS.iconSettings, 'ui/icon-settings.png');
    this.load.image(ASSET_KEYS.iconHome, 'ui/icon-home.png');
    this.load.image(ASSET_KEYS.iconRetry, 'ui/icon-retry.png');
    this.load.image(ASSET_KEYS.iconClose, 'ui/icon-close.png');
    this.load.image('fx_hit', 'effects/fx-hit.png');
    this.load.image('fx_collect', 'effects/fx-collect.png');
    this.load.image('fx_sparkle', 'effects/fx-sparkle.png');
    this.load.image('bg_0', 'backgrounds/stage-1.png');
    this.load.image('bg_1', 'backgrounds/stage-2.png');
    this.load.image('bg_2', 'backgrounds/stage-3.png');
    if (SPEC.audio?.enabled) {
      this.load.audio(ASSET_KEYS.sfxStart, SPEC.audio.sfx.start);
      this.load.audio(ASSET_KEYS.sfxHit, SPEC.audio.sfx.hit);
      this.load.audio(ASSET_KEYS.sfxCollect, SPEC.audio.sfx.score);
      this.load.audio(ASSET_KEYS.sfxGameOver, SPEC.audio.sfx.gameOver);
      this.load.audio(ASSET_KEYS.musicGameplay, SPEC.audio.music.gameplay);
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
