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
  { key: ASSET_KEYS.player, path: 'images/production/characters/player.webp', frameWidth: 512, frameHeight: 512 },
];

export const BOOT_IMAGE_PATHS = {
  [ASSET_KEYS.ui.loadingShell]: 'images/production/backgrounds/stage-1.webp',
};

export const IMAGE_PATHS = {
  [ASSET_KEYS.hazard]: 'images/production/enemies/hazard.webp',
  [ASSET_KEYS.collectible]: 'images/production/items/collectible.webp',
  [ASSET_KEYS.ui.frame]: 'images/production/ui/btn-frame.png',
  [ASSET_KEYS.ui.pause]: 'images/production/ui/btn-pause.png',
  [ASSET_KEYS.ui.menuPanel]: 'images/production/ui/menu-panel.png',
  [ASSET_KEYS.ui.modalPanel]: 'images/production/ui/modal-panel.png',
  [ASSET_KEYS.ui.hudPanel]: 'images/production/ui/hud-panel.png',
  [ASSET_KEYS.ui.newsPanel]: 'images/production/ui/news-panel.png',
  [ASSET_KEYS.ui.goalStrip]: 'images/production/ui/goal-strip.png',
  [ASSET_KEYS.ui.stockCard]: 'images/production/ui/stock-card.png',
  [ASSET_KEYS.ui.stockCardSelected]: 'images/production/ui/stock-card-selected.png',
  [ASSET_KEYS.ui.actionBuy]: 'images/production/ui/action-buy.png',
  [ASSET_KEYS.ui.actionSell]: 'images/production/ui/action-sell.png',
  [ASSET_KEYS.ui.actionHedge]: 'images/production/ui/action-hedge.png',
  [ASSET_KEYS.ui.actionCash]: 'images/production/ui/action-cash.png',
  [ASSET_KEYS.fx.hit]: 'images/production/effects/fx-hit.webp',
  [ASSET_KEYS.fx.collect]: 'images/production/effects/fx-collect.webp',
  [ASSET_KEYS.backgrounds.stage1]: 'images/production/backgrounds/stage-1.webp',
  [ASSET_KEYS.backgrounds.stage2]: 'images/production/backgrounds/stage-2.webp',
  [ASSET_KEYS.backgrounds.stage3]: 'images/production/backgrounds/stage-3.webp',
  [ASSET_KEYS.backgrounds.stage4]: 'images/production/backgrounds/stage-4.webp',
};

export const AUDIO_PATHS = {
  [ASSET_KEYS.sfxStart]: 'audio/ui_click.wav',
  [ASSET_KEYS.sfxHit]: 'audio/hit.wav',
  [ASSET_KEYS.sfxCollect]: 'audio/collect.wav',
  [ASSET_KEYS.sfxGameOver]: 'audio/game_over.wav',
  [ASSET_KEYS.musicGameplay]: 'audio/game_loop.wav',
};
