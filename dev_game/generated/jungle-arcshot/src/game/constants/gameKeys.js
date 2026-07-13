export const ASSET_KEYS = {
  player: 'player',
  hazard: 'hazard',
  collectible: 'collectible',
  fruit: 'fruit',
  balloon: 'balloon',
  arrow: 'arrow',
  backgrounds: {
    stage1: 'bg_0',
    stage2: 'bg_1',
    stage3: 'bg_2',
  },
  ui: {
    frame: 'ui_frame',
    pause: 'ui_pause',
    soundOn: 'ui_sound_on',
    soundOff: 'ui_sound_off',
    home: 'ui_home',
    retry: 'ui_retry',
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
  { key: ASSET_KEYS.player, path: 'characters/player.png', frameWidth: 736, frameHeight: 736 },
];

export const IMAGE_PATHS = {
  [ASSET_KEYS.hazard]: 'enemies/fruit.png',
  [ASSET_KEYS.collectible]: 'items/balloon.png',
  [ASSET_KEYS.fruit]: 'enemies/fruit.png',
  [ASSET_KEYS.balloon]: 'items/balloon.png',
  [ASSET_KEYS.arrow]: 'items/arrow.png',
  [ASSET_KEYS.ui.frame]: 'ui/btn-frame.png',
  [ASSET_KEYS.ui.pause]: 'ui/btn-pause.png',
  [ASSET_KEYS.ui.soundOn]: 'ui/icon-sound-on.png',
  [ASSET_KEYS.ui.soundOff]: 'ui/icon-sound-off.png',
  [ASSET_KEYS.ui.home]: 'ui/icon-home.png',
  [ASSET_KEYS.ui.retry]: 'ui/icon-retry.png',
  [ASSET_KEYS.fx.hit]: 'effects/fx-hit.png',
  [ASSET_KEYS.fx.collect]: 'effects/fx-collect.png',
  [ASSET_KEYS.backgrounds.stage1]: 'backgrounds/stage-1.png',
  [ASSET_KEYS.backgrounds.stage2]: 'backgrounds/stage-2.png',
  [ASSET_KEYS.backgrounds.stage3]: 'backgrounds/stage-3.png',
};

export const AUDIO_PATHS = {
  [ASSET_KEYS.sfxStart]: 'audio/ui_click.wav',
  [ASSET_KEYS.sfxHit]: 'audio/hit.wav',
  [ASSET_KEYS.sfxCollect]: 'audio/collect.wav',
  [ASSET_KEYS.sfxGameOver]: 'audio/game_over.wav',
  [ASSET_KEYS.musicGameplay]: 'audio/game_loop.wav',
};
