export const ASSET_KEYS = {
  player: 'player',
  hazard: 'hazard',
  collectible: 'collectible',
  target: 'target',
  crosshair: 'crosshair',
  hitBurst: 'hit_burst',
  missBurst: 'miss_burst',
  bg0: 'bg_0',
  bg1: 'bg_1',
  bg2: 'bg_2',
  backgrounds: {
    stage1: 'bg_0',
    stage2: 'bg_1',
    stage3: 'bg_2',
  },
  ui: {
    pause: 'ui_pause',
  },
  sfxStart: 'sfx_start',
  sfxHit: 'sfx_hit',
  sfxCollect: 'sfx_collect',
  sfxGameOver: 'sfx_game_over',
  musicGameplay: 'music_gameplay',
};

export const IMAGE_PATHS = [
  { key: ASSET_KEYS.player, path: 'images/production/characters/player_blaster.png' },
  { key: ASSET_KEYS.hazard, path: 'images/production/targets/bullseye_target.png' },
  { key: ASSET_KEYS.collectible, path: 'images/production/effects/hit_burst.png' },
  { key: ASSET_KEYS.target, path: 'images/production/targets/bullseye_target.png' },
  { key: ASSET_KEYS.hitBurst, path: 'images/production/effects/hit_burst.png' },
  { key: ASSET_KEYS.missBurst, path: 'images/production/effects/hit_burst.png' },
  { key: ASSET_KEYS.ui.pause, path: 'images/production/ui/button_pause.png' },
];

export const BACKGROUND_PATHS = [
  { key: ASSET_KEYS.backgrounds.stage1, path: 'images/production/backgrounds/gallery_day.png' },
  { key: ASSET_KEYS.backgrounds.stage2, path: 'images/production/backgrounds/gallery_night.png' },
  { key: ASSET_KEYS.backgrounds.stage3, path: 'images/production/backgrounds/gallery_rush.png' },
];

export const AUDIO_PATHS = [
  { key: ASSET_KEYS.sfxStart, specPath: 'start' },
  { key: ASSET_KEYS.sfxHit, specPath: 'hit' },
  { key: ASSET_KEYS.sfxCollect, specPath: 'score' },
  { key: ASSET_KEYS.sfxGameOver, specPath: 'gameOver' },
];
