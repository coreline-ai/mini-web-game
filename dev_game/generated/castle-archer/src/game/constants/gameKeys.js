export const ASSET_KEYS = {
  player: 'player',
  hazard: 'hazard',
  enemyBasic: 'enemy_basic',
  enemyShield: 'enemy_shield',
  enemyRunner: 'enemy_runner',
  enemyBrute: 'enemy_brute',
  collectible: 'collectible',
  arrow: 'arrow',
  backgrounds: {
    stage1: 'bg_0',
    stage2: 'bg_1',
    stage3: 'bg_2',
  },
  ui: {
    frame: 'ui_frame',
    pause: 'ui_pause',
    heart: 'ui_heart',
  },
  fx: {
    hit: 'fx_hit',
    collect: 'fx_collect',
    sparkle: 'fx_sparkle',
  },
  iconSoundOn: 'icon_sound_on',
  iconSoundOff: 'icon_sound_off',
  iconSettings: 'icon_settings',
  iconHome: 'icon_home',
  iconRetry: 'icon_retry',
  iconClose: 'icon_close',
  sfxStart: 'sfx_start',
  sfxHit: 'sfx_hit',
  sfxCollect: 'sfx_collect',
  sfxGameOver: 'sfx_game_over',
  musicGameplay: 'music_gameplay',
};

export const SPRITESHEET_PATHS = [
  { key: ASSET_KEYS.player, path: 'characters/player.png', frameWidth: 512, frameHeight: 512 },
  { key: ASSET_KEYS.enemyBasic, path: 'enemies/goblin-basic-sheet.png', frameWidth: 768, frameHeight: 768 },
  { key: ASSET_KEYS.enemyShield, path: 'enemies/goblin-shield-sheet.png', frameWidth: 768, frameHeight: 768 },
  { key: ASSET_KEYS.enemyRunner, path: 'enemies/goblin-runner-sheet.png', frameWidth: 768, frameHeight: 768 },
  { key: ASSET_KEYS.enemyBrute, path: 'enemies/orc-brute-sheet.png', frameWidth: 768, frameHeight: 768 },
];

export const IMAGE_PATHS = {
  [ASSET_KEYS.hazard]: 'enemies/hazard.png',
  [ASSET_KEYS.collectible]: 'items/collectible.png',
  [ASSET_KEYS.arrow]: 'items/arrow.png',
  [ASSET_KEYS.ui.frame]: 'ui/btn-frame.png',
  [ASSET_KEYS.ui.pause]: 'ui/btn-pause.png',
  [ASSET_KEYS.ui.heart]: 'ui/heart.png',
  [ASSET_KEYS.iconSoundOn]: 'ui/icon-sound-on.png',
  [ASSET_KEYS.iconSoundOff]: 'ui/icon-sound-off.png',
  [ASSET_KEYS.iconSettings]: 'ui/icon-settings.png',
  [ASSET_KEYS.iconHome]: 'ui/icon-home.png',
  [ASSET_KEYS.iconRetry]: 'ui/icon-retry.png',
  [ASSET_KEYS.iconClose]: 'ui/icon-close.png',
  [ASSET_KEYS.fx.hit]: 'effects/fx-hit.png',
  [ASSET_KEYS.fx.collect]: 'effects/fx-collect.png',
  [ASSET_KEYS.fx.sparkle]: 'effects/fx-sparkle.png',
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
