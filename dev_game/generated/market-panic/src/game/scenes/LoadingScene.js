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
    this.load.spritesheet(ASSET_KEYS.player, 'characters/player.webp', { frameWidth: 512, frameHeight: 512 });
    this.load.image(ASSET_KEYS.hazard, 'enemies/hazard.webp');
    this.load.image(ASSET_KEYS.collectible, 'items/collectible.webp');
    this.load.image('ui_frame', 'ui/btn-frame.png');
    this.load.image('ui_pause', 'ui/btn-pause.png');
    this.load.image('ui_menu_panel', 'ui/menu-panel.png');
    this.load.image('ui_modal_panel', 'ui/modal-panel.png');
    this.load.image('ui_hud_panel', 'ui/hud-panel.png');
    this.load.image('ui_news_panel', 'ui/news-panel.png');
    this.load.image('ui_goal_strip', 'ui/goal-strip.png');
    this.load.image('ui_stock_card', 'ui/stock-card.png');
    this.load.image('ui_stock_card_selected', 'ui/stock-card-selected.png');
    this.load.image('ui_action_buy', 'ui/action-buy.png');
    this.load.image('ui_action_sell', 'ui/action-sell.png');
    this.load.image('ui_action_hedge', 'ui/action-hedge.png');
    this.load.image('ui_action_cash', 'ui/action-cash.png');
    this.load.image('fx_hit', 'effects/fx-hit.webp');
    this.load.image('fx_collect', 'effects/fx-collect.webp');
    this.load.image('bg_0', 'backgrounds/stage-1.webp');
    this.load.image('bg_1', 'backgrounds/stage-2.webp');
    this.load.image('bg_2', 'backgrounds/stage-3.webp');
    this.load.image('bg_3', 'backgrounds/stage-4.webp');
    if (SPEC.audio?.enabled) {
      this.load.audio(ASSET_KEYS.sfxStart, SPEC.audio.sfx.start);
      this.load.audio(ASSET_KEYS.sfxHit, SPEC.audio.sfx.hit);
      this.load.audio(ASSET_KEYS.sfxCollect, SPEC.audio.sfx.score);
      this.load.audio(ASSET_KEYS.sfxGameOver, SPEC.audio.sfx.gameOver);
      this.load.audio(ASSET_KEYS.musicGameplay, SPEC.audio.music.gameplay);
    }
  }
  create() {
    const items = (this.loadingUI && this.loadingUI.title) ? [{ id: 'loading', obj: this.loadingUI.title }] : [];
    publishLayout(this, items);
    const hold = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
    if (hold) { if (typeof window !== 'undefined') window.__RELEASE_LOADING__ = () => this.scene.start(SCENES.HOME); } else { this.time.delayedCall(250, () => this.scene.start(SCENES.HOME)); }
  }
}
