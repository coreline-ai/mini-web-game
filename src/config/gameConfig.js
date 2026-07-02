// 게임 전역 설정 — 모든 에셋 키/밸런스 상수 집중.
// (근거: docs/design-spec-supplement.md, docs/scenario-full.md)

export const GC = {
  WIDTH: 1080,
  HEIGHT: 1920,
  BG_COLOR: '#0b0d1a',

  MASTER_VOLUME: 0.4, // 전역 사운드 볼륨(모든 SFX에 곱해짐)

  PLAYER: {
    Y: 1740,
    SIZE: 150,
    HIT_RADIUS: 42,
    HIT_OFFSET_Y: 12,
    LERP: 0.35,
    SPEED_LERP: 0.55, // 슬리퍼 파워업 시 추종 가속
    MAX_TILT: 13,
    BOB_PX: 4,
  },

  POOP: { SPAWN_Y: -120, DESPAWN_Y: 2100, POOL_MAX: 80, EDGE_PAD: 12 },

  // 똥 종류. anim=회전 애니 시트 키, harmless=무해, golden=황금, diagonal=대각선, poison=바닥 잔류
  POOP_TYPES: {
    basic: { size: 104, hit: 0.65, speedMul: 1.0, dodge: 2, weight: 6,
      variants: [{ key: 'poop_basic_01' }, { key: 'poop_basic_02' }, { key: 'poop_basic_03' }] },
    large: { size: 150, hit: 0.70, speedMul: 0.82, dodge: 3, weight: 4,
      variants: [{ key: 'poop_large_01' }, { key: 'poop_large_02' }, { key: 'poop_large_03' }] },
    small: { size: 70, hit: 0.60, speedMul: 1.3, dodge: 2, weight: 5,
      variants: [{ key: 'poop_small_01' }, { key: 'poop_small_02' }, { key: 'poop_small_03' }] },
    spin: { size: 104, hit: 0.60, speedMul: 1.05, dodge: 4, weight: 3, anim: 'poop_spin',
      variants: [{ key: 'poop_spin' }] },
    golden: { size: 108, hit: 0.60, speedMul: 1.15, dodge: 500, weight: 1, golden: true, rotate: true,
      variants: [{ key: 'poop_gold_01' }, { key: 'poop_gold_02' }, { key: 'poop_gold_03' }] },
    bird: { size: 96, hit: 0.60, speedMul: 1.1, dodge: 5, weight: 2, diagonal: true,
      variants: [{ key: 'poop_bird' }] },
    poison: { size: 104, hit: 0.62, speedMul: 1.0, dodge: 5, weight: 3, poison: true,
      variants: [{ key: 'poop_poison_01' }, { key: 'poop_poison_02' }, { key: 'poop_poison_03' }] },
    fake: { size: 104, hit: 0.60, speedMul: 0.95, dodge: 0, weight: 3, harmless: true, rotate: true,
      variants: [{ key: 'poop_fake' }] },
  },

  STAGES: [
    { t: 0, bg: 'bg_city', intro: '기본 똥', pool: ['basic'] },
    { t: 25, bg: 'bg_park', intro: '큰 똥', pool: ['basic', 'large'] },
    { t: 50, bg: 'bg_school', intro: '작은 똥', pool: ['basic', 'large', 'small'] },
    { t: 80, bg: 'bg_subway', intro: '회전 똥', pool: ['basic', 'large', 'small', 'spin'] },
    { t: 112, bg: 'bg_space', intro: '황금 똥', pool: ['basic', 'small', 'spin', 'golden'] },
    { t: 146, bg: 'bg_desert', intro: '새 똥', pool: ['basic', 'large', 'small', 'golden', 'bird'] },
    { t: 182, bg: 'bg_iceberg', intro: '독 똥', pool: ['basic', 'small', 'golden', 'bird', 'poison'] },
    { t: 220, bg: 'bg_lava', intro: '가짜 똥', pool: ['basic', 'large', 'small', 'golden', 'bird', 'poison', 'fake'] },
  ],

  DIFF: {
    BASE_SPEED: 380, MAX_SPEED: 1500, SPEED_RAMP: 9,
    BASE_INTERVAL: 900, MIN_INTERVAL: 180, INT_RAMP: 7,
    CONCURRENT_EVERY: 20, CONCURRENT_MAX_CAP: 40,
  },

  // 폭우(WARNING) 특수 이벤트
  RAIN: { everySec: 30, jitterSec: 3, durationMs: 4000, intervalMul: 0.35, safeLaneWidth: 200, bonus: 300 },

  SCORE: {
    SURVIVAL_PER_SEC: 10, NEAR_MISS: 20, NEAR_MISS_GAP: 44,
    BEST_KEY: 'dgp_best', MUTE_KEY: 'dgp_mute', SAVE_KEY: 'dgp_save',
  },

  COMBO: { fantastic: 100, master: 200, legend: 500, maxMultiplyAt: 500 },

  COIN: { dropChance: 0.1, goldenBonus: 3, size: 72, magnetRadius: 420, magnetSpeed: 900 },

  HEART: { size: 92, freeContinues: 1, costCoins: 50, reviveInvincMs: 2000 },

  POWERUPS: [
    { id: 'umbrella', key: 'pu_umbrella', path: 'items/umbrella_shield.svg', effect: 'shield', durationMs: 10000, weight: 20, size: 104 },
    { id: 'slipper', key: 'pu_slipper', path: 'items/slipper_speed.svg', effect: 'speed', durationMs: 8000, weight: 25, size: 104 },
    { id: 'magnet', key: 'pu_magnet', path: 'items/magnet_coin.svg', effect: 'magnet', durationMs: 8000, weight: 25, size: 104 },
    { id: 'clock', key: 'pu_clock', path: 'items/clock_slow.svg', effect: 'slow', durationMs: 5000, weight: 20, size: 104 },
    { id: 'lightning', key: 'pu_lightning', path: 'items/lightning_clear.svg', effect: 'clear', durationMs: 0, weight: 10, size: 104 },
  ],
  POWERUP: { dropChance: 0.014, size: 104, fallSpeed: 420, slowFactor: 0.5 },

  BOSS: {
    enterAtSec: 258, hp: 100, hpDrainPerSec: 4.2, moveSpeed: 220, y: 340, size: 300,
    projSize: 92, projSpeed: 560, fireIntervalMs: 1300, rageBelowHp: 40, defeatCoins: 20, defeatScore: 2000,
    anim: 'boss_attack',
  },

  ANIM: {
    playerWalk: { key: 'player_walk', path: 'animations/player_walk_8frames.svg', frames: 8, frameW: 150, frameH: 150, renderW: 1200, renderH: 150, frameRate: 14 },
    poopSpin: { key: 'poop_spin', path: 'animations/poop_spin_8frames.svg', frames: 8, frameW: 104, frameH: 104, renderW: 832, renderH: 104, frameRate: 16 },
    bossAttack: { key: 'boss_attack', path: 'animations/toilet_boss_attack_12frames.svg', frames: 12, frameW: 260, frameH: 260, renderW: 3120, renderH: 260, frameRate: 14 },
    // 다중 텍스처 프레임 애니(키 배열)
    coinSpin: { key: 'coin_spin', frameKeys: ['coin_01', 'coin_02'], frameRate: 8 },
    heartPulse: { key: 'heart_pulse', frameKeys: ['heart_01', 'heart_02'], frameRate: 3 },
    poisonFloor: { key: 'poison_floor', frameKeys: ['poison_floor_01', 'poison_floor_02', 'poison_floor_03'], frameRate: 6 },
  },

  ASSETS: {
    bg: { w: 1080, h: 1920 },
    backgrounds: [
      { key: 'bg_city' }, { key: 'bg_park' }, { key: 'bg_school' }, { key: 'bg_subway' },
      { key: 'bg_space' }, { key: 'bg_desert' }, { key: 'bg_iceberg' }, { key: 'bg_lava' },
    ],
    // 캐릭터: tex=정지 텍스처, walk=걷기 애니 키(있으면 인게임에서 사용)
    characters: [
      { id: 'boy', tex: 'char_boy', path: 'characters/players/player_boy.svg', walk: 'player_walk', name: '소년', price: 0 },
      { id: 'girl', tex: 'char_girl', path: 'characters/players/player_girl.svg', name: '소녀', price: 150 },
      { id: 'office', tex: 'char_office', path: 'characters/players/player_office_worker.svg', name: '직장인', price: 150 },
      { id: 'rabbit', tex: 'char_rabbit', path: 'characters/players/player_rabbit.svg', name: '토끼', price: 300 },
      { id: 'cat', tex: 'char_cat', path: 'characters/players/player_cat.svg', name: '고양이', price: 300 },
      { id: 'duck', tex: 'char_duck', path: 'characters/players/player_duck.svg', name: '오리', price: 300 },
      { id: 'ninja', tex: 'char_ninja', path: 'characters/players/player_ninja.svg', name: '닌자', price: 800 },
      { id: 'astronaut', tex: 'char_astro', path: 'characters/players/player_astronaut.svg', name: '우주인', price: 800 },
    ],
    shopBackgrounds: [
      { key: 'bg_city', card: 'card_city', cardPath: 'backgrounds/cards/bg_city_card.svg', name: '도시', price: 0 },
      { key: 'bg_park', card: 'card_park', cardPath: 'backgrounds/cards/bg_park_card.svg', name: '공원', price: 200 },
      { key: 'bg_school', card: 'card_school', cardPath: 'backgrounds/cards/bg_school_card.svg', name: '학교', price: 200 },
      { key: 'bg_subway', card: 'card_subway', cardPath: 'backgrounds/cards/bg_subway_card.svg', name: '지하철', price: 200 },
      { key: 'bg_desert', card: 'card_desert', cardPath: 'backgrounds/cards/bg_desert_card.svg', name: '사막', price: 400 },
      { key: 'bg_iceberg', card: 'card_iceberg', cardPath: 'backgrounds/cards/bg_iceberg_card.svg', name: '빙하', price: 400 },
      { key: 'bg_space', card: 'card_space', cardPath: 'backgrounds/cards/bg_space_card.svg', name: '우주', price: 700 },
      { key: 'bg_lava', card: 'card_lava', cardPath: 'backgrounds/cards/bg_lava_card.svg', name: '용암', price: 700 },
    ],
    boss: {
      front: { key: 'boss_front', path: 'enemies/boss/toilet_boss_front.svg' },
      open: { key: 'boss_open', path: 'enemies/boss/toilet_boss_open.svg' },
      attack: { key: 'boss_attack_img', path: 'enemies/boss/toilet_boss_attack.svg' },
      hit: { key: 'boss_hit', path: 'enemies/boss/toilet_boss_hit.svg' },
      projectile: { key: 'boss_proj', path: 'enemies/boss/toilet_projectile_poop.svg', size: 92 },
      size: 160,
    },
    effects: [
      { key: 'fx_explosion', path: 'effects/common/explosion.svg' },
      { key: 'fx_smoke', path: 'effects/common/smoke_puff.svg' },
      { key: 'fx_sparkle', path: 'effects/common/sparkle_trail.svg' },
      { key: 'fx_star_ring', path: 'effects/common/star_ring.svg' },
    ],
    messages: [
      { key: 'msg_warning', path: 'messages/warning.svg', w: 540, h: 162 },
      { key: 'msg_fantastic', path: 'messages/fantastic.svg', w: 560, h: 157 },
      { key: 'msg_gameover', path: 'messages/game_over.svg', w: 640, h: 205 },
    ],
    ui: {
      buttons: [
        { key: 'btn_home', path: 'ui/button_home.svg' },
        { key: 'btn_pause', path: 'ui/button_pause.svg' },
        { key: 'btn_ranking', path: 'ui/button_ranking.svg' },
        { key: 'btn_restart', path: 'ui/button_restart.svg' },
        { key: 'btn_settings', path: 'ui/button_settings.svg' },
        { key: 'btn_shop', path: 'ui/button_shop.svg' },
        { key: 'btn_sound', path: 'ui/button_sound.svg' },
        { key: 'btn_trophy', path: 'ui/button_trophy.svg' },
      ],
      hudPanel: { key: 'hud_panel', path: 'ui/hud_panel.svg', w: 420, h: 128 },
      btnSize: 118,
    },
    // 단일 프레임 애니에 쓰이는 개별 텍스처(경로/크기)
    frameTex: [
      { key: 'coin_01', path: 'items/coin_poop_01.svg', size: 72 },
      { key: 'coin_02', path: 'items/coin_poop_02.svg', size: 72 },
      { key: 'heart_01', path: 'items/heart_continue_01.svg', size: 92 },
      { key: 'heart_02', path: 'items/heart_continue_02.svg', size: 92 },
      { key: 'poison_floor_01', path: 'effects/hazard/poison_floor_01.svg', size: 150 },
      { key: 'poison_floor_02', path: 'effects/hazard/poison_floor_02.svg', size: 150 },
      { key: 'poison_floor_03', path: 'effects/hazard/poison_floor_03.svg', size: 150 },
    ],
  },

  AUDIO: {
    ui: { buttonClick: { key: 'button_click', path: 'audio/ui/button_click.ogg' } },
    sfx: {
      dodgeTicks: [
        { key: 'dodge_tick_01', path: 'audio/sfx/dodge_tick_01.ogg' },
        { key: 'dodge_tick_02', path: 'audio/sfx/dodge_tick_02.ogg' },
        { key: 'dodge_tick_03', path: 'audio/sfx/dodge_tick_03.ogg' },
      ],
      nearMiss: { key: 'near_miss_whoosh_tick', path: 'audio/sfx/near_miss_whoosh_tick.ogg' },
      coin: { key: 'coin_ding', path: 'audio/sfx/coin_ding.ogg' },
      warning: { key: 'warning_beep', path: 'audio/sfx/warning_beep.ogg' },
      hit: { key: 'hit_splat', path: 'audio/sfx/hit_splat.ogg' },
      gameOver: { key: 'game_over_jingle', path: 'audio/sfx/game_over_jingle.ogg' },
      shield: { key: 'powerup_shield', path: 'audio/sfx/powerup_shield.ogg' },
    },
  },
};

export const SCENES = {
  BOOT: 'Boot', HOME: 'Home', SHOP: 'Shop', RANKING: 'Ranking', SETTINGS: 'Settings',
  GAME: 'Game', PAUSE: 'Pause', GAMEOVER: 'GameOver',
};
