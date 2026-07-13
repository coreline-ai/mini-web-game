export const ASSET_KEYS = {
  player: 'player',
  target: 'target',
  star: 'star',
  arrow: 'arrow',
  hazard: 'target',
  collectible: 'star',
  backgrounds: {
    stage1: 'bg_0',
    stage2: 'bg_1',
    stage3: 'bg_2',
  },
  ui: {
    frame: 'ui_frame',
    pause: 'ui_pause',
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

export const SPRITESHEET_PATHS = {
  [ASSET_KEYS.player]: {
    path: 'characters/player.png',
    frameWidth: 336,
    frameHeight: 336,
  },
};

export const IMAGE_PATHS = {
  [ASSET_KEYS.target]: 'enemies/target.png',
  [ASSET_KEYS.star]: 'items/star.png',
  [ASSET_KEYS.arrow]: 'items/arrow.png',
  [ASSET_KEYS.backgrounds.stage1]: 'backgrounds/stage-1.png',
  [ASSET_KEYS.backgrounds.stage2]: 'backgrounds/stage-2.png',
  [ASSET_KEYS.backgrounds.stage3]: 'backgrounds/stage-3.png',
  [ASSET_KEYS.ui.frame]: 'ui/btn-frame.png',
  [ASSET_KEYS.ui.pause]: 'ui/btn-pause.png',
  [ASSET_KEYS.fx.hit]: 'effects/fx-hit.png',
  [ASSET_KEYS.fx.collect]: 'effects/fx-collect.png',
};

export const AUDIO_PATHS = {
  [ASSET_KEYS.sfxStart]: 'audio/ui_click.wav',
  [ASSET_KEYS.sfxHit]: 'audio/hit.wav',
  [ASSET_KEYS.sfxCollect]: 'audio/collect.wav',
  [ASSET_KEYS.sfxGameOver]: 'audio/game_over.wav',
  [ASSET_KEYS.musicGameplay]: 'audio/game_loop.wav',
};
