export const ASSET_KEYS = {
  player: 'player',
  hazard: 'hazard',
  collectible: 'collectible',
  backgrounds: {
    stage1: 'bg_0',
    stage2: 'bg_1',
    stage3: 'bg_2',
    stage4: 'bg_3',
  },
  ui: {
    loadingShell: 'loading_shell',
    frame: 'ui_frame',
    pause: 'ui_pause',
    menuPanel: 'ui_menu_panel',
    modalPanel: 'ui_modal_panel',
    hudPanel: 'ui_hud_panel',
    newsPanel: 'ui_news_panel',
    goalStrip: 'ui_goal_strip',
    stockCard: 'ui_stock_card',
    stockCardSelected: 'ui_stock_card_selected',
    actionBuy: 'ui_action_buy',
    actionSell: 'ui_action_sell',
    actionHedge: 'ui_action_hedge',
    actionCash: 'ui_action_cash',
  },
  fx: {
    hit: 'fx_hit',
    collect: 'fx_collect',
  },
  sfxStart: 'sfx_start',
  sfxHit: 'sfx_hit',
  sfxCollect: 'sfx_collect',
  sfxGameOver: 'sfx_game_over',
  musicGameplay: 'music_gameplay',
};

export const SPRITESHEET_PATHS = [
  { key: ASSET_KEYS.player, path: 'characters/player.webp', frameWidth: 512, frameHeight: 512 },
];

export const BOOT_IMAGE_PATHS = {
  [ASSET_KEYS.ui.loadingShell]: 'backgrounds/stage-1.webp',
};

export const IMAGE_PATHS = {
  [ASSET_KEYS.hazard]: 'enemies/hazard.webp',
  [ASSET_KEYS.collectible]: 'items/collectible.webp',
  [ASSET_KEYS.ui.frame]: 'ui/btn-frame.png',
  [ASSET_KEYS.ui.pause]: 'ui/btn-pause.png',
  [ASSET_KEYS.ui.menuPanel]: 'ui/menu-panel.png',
  [ASSET_KEYS.ui.modalPanel]: 'ui/modal-panel.png',
  [ASSET_KEYS.ui.hudPanel]: 'ui/hud-panel.png',
  [ASSET_KEYS.ui.newsPanel]: 'ui/news-panel.png',
  [ASSET_KEYS.ui.goalStrip]: 'ui/goal-strip.png',
  [ASSET_KEYS.ui.stockCard]: 'ui/stock-card.png',
  [ASSET_KEYS.ui.stockCardSelected]: 'ui/stock-card-selected.png',
  [ASSET_KEYS.ui.actionBuy]: 'ui/action-buy.png',
  [ASSET_KEYS.ui.actionSell]: 'ui/action-sell.png',
  [ASSET_KEYS.ui.actionHedge]: 'ui/action-hedge.png',
  [ASSET_KEYS.ui.actionCash]: 'ui/action-cash.png',
  [ASSET_KEYS.fx.hit]: 'effects/fx-hit.webp',
  [ASSET_KEYS.fx.collect]: 'effects/fx-collect.webp',
  [ASSET_KEYS.backgrounds.stage1]: 'backgrounds/stage-1.webp',
  [ASSET_KEYS.backgrounds.stage2]: 'backgrounds/stage-2.webp',
  [ASSET_KEYS.backgrounds.stage3]: 'backgrounds/stage-3.webp',
  [ASSET_KEYS.backgrounds.stage4]: 'backgrounds/stage-4.webp',
};

export const AUDIO_PATHS = {
  [ASSET_KEYS.sfxStart]: 'audio/ui_click.wav',
  [ASSET_KEYS.sfxHit]: 'audio/hit.wav',
  [ASSET_KEYS.sfxCollect]: 'audio/collect.wav',
  [ASSET_KEYS.sfxGameOver]: 'audio/game_over.wav',
  [ASSET_KEYS.musicGameplay]: 'audio/game_loop.wav',
};
